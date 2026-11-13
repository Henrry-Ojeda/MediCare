using System.Security.Claims;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class AssistantsController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly AuditService _audit;

    public AssistantsController(DbConnectionFactory db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public sealed record AssignAssistantRequest(
        Guid AsistenteUserId,
        List<Guid> MedicoUserIds,
        string TipoAsignacion,
        bool PuedeAgendar = true,
        bool PuedeRegistrarInfo = true,
        bool PuedeCobrar = true,
        bool PuedePosponerCancelar = true
    );

    [HttpGet("assignments")]
    public async Task<IActionResult> ListAssignments(
        [FromQuery] Guid? assistantUserId,
        [FromQuery] Guid? doctorUserId,
        CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var rows = await conn.QueryAsync(
            """
            SELECT am.Id, am.AsistenteUserId, am.MedicoUserId, am.TipoAsignacion,
                   am.PuedeAgendar, am.PuedeRegistrarInfo, am.PuedeCobrar, am.PuedePosponerCancelar,
                   am.Activo, am.CreatedAt,
                   a.NombreCompleto AS AsistenteNombre, a.Username AS AsistenteUsername, a.Email AS AsistenteEmail,
                   m.NombreCompleto AS MedicoNombre, m.Username AS MedicoUsername
            FROM dbo.TB_ASISTENTE_MEDICOS am
            INNER JOIN dbo.TB_USUARIOS a ON a.Id = am.AsistenteUserId
            INNER JOIN dbo.TB_USUARIOS m ON m.Id = am.MedicoUserId
            WHERE am.Activo = 1
              AND (@AssistantUserId IS NULL OR am.AsistenteUserId = @AssistantUserId)
              AND (@DoctorUserId IS NULL OR am.MedicoUserId = @DoctorUserId)
            ORDER BY a.NombreCompleto, m.NombreCompleto
            """,
            new { AssistantUserId = assistantUserId, DoctorUserId = doctorUserId }
        );
        return Ok(rows);
    }

    [HttpGet("my-doctors")]
    public async Task<IActionResult> GetMyAssignedDoctors(CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim, out var currentUserId))
            return Unauthorized();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var rows = await conn.QueryAsync(
            """
            SELECT am.Id, am.MedicoUserId, am.TipoAsignacion,
                   am.PuedeAgendar, am.PuedeRegistrarInfo, am.PuedeCobrar, am.PuedePosponerCancelar,
                   m.NombreCompleto AS MedicoNombre, m.Email AS MedicoEmail
            FROM dbo.TB_ASISTENTE_MEDICOS am
            INNER JOIN dbo.TB_USUARIOS m ON m.Id = am.MedicoUserId
            WHERE am.AsistenteUserId = @CurrentUserId AND am.Activo = 1 AND m.Activo = 1
            ORDER BY m.NombreCompleto
            """,
            new { CurrentUserId = currentUserId }
        );
        return Ok(rows);
    }

    [HttpPost("assign")]
    public async Task<IActionResult> Assign([FromBody] AssignAssistantRequest req, CancellationToken ct)
    {
        if (req.MedicoUserIds is null || req.MedicoUserIds.Count == 0)
            return BadRequest(new { message = "Debe seleccionar al menos un médico para asignar." });

        var tipo = string.Equals(req.TipoAsignacion, "COMPARTIDA_CLINICA", StringComparison.OrdinalIgnoreCase)
            ? "COMPARTIDA_CLINICA"
            : "PERSONAL";

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        foreach (var medicoId in req.MedicoUserIds.Distinct())
        {
            await conn.ExecuteAsync(
                """
                MERGE dbo.TB_ASISTENTE_MEDICOS AS target
                USING (SELECT @AsistenteUserId AS AsistenteUserId, @MedicoUserId AS MedicoUserId) AS src
                ON target.AsistenteUserId = src.AsistenteUserId AND target.MedicoUserId = src.MedicoUserId
                WHEN MATCHED THEN
                    UPDATE SET
                        TipoAsignacion = @TipoAsignacion,
                        PuedeAgendar = @PuedeAgendar,
                        PuedeRegistrarInfo = @PuedeRegistrarInfo,
                        PuedeCobrar = @PuedeCobrar,
                        PuedePosponerCancelar = @PuedePosponerCancelar,
                        Activo = 1,
                        UpdatedAt = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (AsistenteUserId, MedicoUserId, TipoAsignacion, PuedeAgendar, PuedeRegistrarInfo, PuedeCobrar, PuedePosponerCancelar)
                    VALUES (@AsistenteUserId, @MedicoUserId, @TipoAsignacion, @PuedeAgendar, @PuedeRegistrarInfo, @PuedeCobrar, @PuedePosponerCancelar);
                """,
                new
                {
                    req.AsistenteUserId,
                    MedicoUserId = medicoId,
                    TipoAsignacion = tipo,
                    req.PuedeAgendar,
                    req.PuedeRegistrarInfo,
                    req.PuedeCobrar,
                    req.PuedePosponerCancelar
                }
            );
        }

        await _audit.RecordAsync(
            conn, null, HttpContext, "Asignación de Asistente",
            "TB_ASISTENTE_MEDICOS", req.AsistenteUserId.ToString(),
            newValue: new { req.AsistenteUserId, req.MedicoUserIds, TipoAsignacion = tipo }
        );

        return Ok(new { message = "Asignación de asistente guardada correctamente.", count = req.MedicoUserIds.Distinct().Count(), tipo });
    }

    [HttpDelete("assignments/{id:guid}")]
    public async Task<IActionResult> RemoveAssignment(Guid id, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var affected = await conn.ExecuteAsync(
            "UPDATE dbo.TB_ASISTENTE_MEDICOS SET Activo = 0, UpdatedAt = GETDATE() WHERE Id = @Id",
            new { Id = id }
        );
        return affected == 0 ? NotFound(new { message = "Asignación no encontrada." }) : Ok(new { message = "Asignación desactivada." });
    }
}

