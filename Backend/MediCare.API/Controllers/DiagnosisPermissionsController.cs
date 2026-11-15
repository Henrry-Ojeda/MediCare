using System.Security.Claims;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/diagnosis-permissions")]
[Authorize]
public sealed class DiagnosisPermissionsController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly AuditService _audit;

    public DiagnosisPermissionsController(DbConnectionFactory db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public sealed record GrantPermissionRequest(
        Guid PatientId,
        Guid? ConsultationId,
        Guid TargetDoctorUserId,
        string? Reason
    );

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? patientId, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var rows = (await conn.QueryAsync<dynamic>(
            """
            SELECT p.Id, p.PatientId, p.ConsultationId, p.GrantedByUserId,
                   p.TargetDoctorUserId, p.Reason, p.Activo, p.CreatedAt,
                   g.NombreCompleto AS GrantedByName,
                   t.NombreCompleto AS TargetDoctorName
            FROM dbo.TB_PERMISOS_DIAGNOSTICO p
            INNER JOIN dbo.TB_USUARIOS g ON g.Id = p.GrantedByUserId
            LEFT JOIN dbo.TB_USUARIOS t ON t.Id = p.TargetDoctorUserId
            WHERE p.Activo = 1
              AND (@PatientId IS NULL OR p.PatientId = @PatientId)
            ORDER BY p.CreatedAt DESC
            """,
            new { PatientId = patientId }
        )).Select(r => new
        {
            id = ((Guid)r.Id).ToString(),
            patientId = ((Guid)r.PatientId).ToString(),
            consultationId = r.ConsultationId is null ? null : ((Guid)r.ConsultationId).ToString(),
            grantedByUserId = ((Guid)r.GrantedByUserId).ToString(),
            grantedByName = (string)r.GrantedByName,
            targetDoctorUserId = r.TargetDoctorUserId is null ? string.Empty : ((Guid)r.TargetDoctorUserId).ToString(),
            targetDoctorName = (string?)r.TargetDoctorName ?? string.Empty,
            reason = (string?)r.Reason ?? string.Empty,
            active = (bool)r.Activo,
            createdAt = ((DateTime)r.CreatedAt).ToString("yyyy-MM-dd"),
        });

        return Ok(rows);
    }

    [HttpPost]
    [Authorize(Roles = "SUPERADMIN,MEDICO")]
    public async Task<IActionResult> Grant([FromBody] GrantPermissionRequest req, CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var grantedByUserId))
            return Unauthorized();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var pediatriaId = await conn.QueryFirstOrDefaultAsync<int?>(
            "SELECT TOP 1 Id FROM dbo.TB_ESPECIALIDADES WHERE LOWER(Nombre) LIKE '%pediatr%'"
        ) ?? 1;

        var newId = Guid.NewGuid();
        await conn.ExecuteAsync(
            """
            INSERT INTO dbo.TB_PERMISOS_DIAGNOSTICO
                (Id, PatientId, ConsultationId, GrantedByUserId, GrantedBySpecialtyId,
                 TargetSpecialtyId, TargetDoctorUserId, Reason, Activo)
            VALUES
                (@Id, @PatientId, @ConsultationId, @GrantedByUserId, @SpecId,
                 @SpecId, @TargetDoctorUserId, @Reason, 1)
            """,
            new
            {
                Id = newId,
                req.PatientId,
                req.ConsultationId,
                GrantedByUserId = grantedByUserId,
                SpecId = pediatriaId,
                req.TargetDoctorUserId,
                Reason = string.IsNullOrWhiteSpace(req.Reason)
                    ? "Autorización de lectura de diagnóstico entre médicos"
                    : req.Reason.Trim(),
            }
        );

        await _audit.RecordAsync(
            conn, null, HttpContext, "Permiso de Diagnóstico Concedido",
            "TB_PERMISOS_DIAGNOSTICO", newId.ToString(), req.PatientId
        );

        return Ok(new { id = newId.ToString() });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SUPERADMIN,MEDICO")]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
            return Unauthorized();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var isSuperAdmin = (User.FindFirstValue(ClaimTypes.Role) ?? string.Empty)
            .Equals("SUPERADMIN", StringComparison.OrdinalIgnoreCase);

        var affected = await conn.ExecuteAsync(
            """
            UPDATE dbo.TB_PERMISOS_DIAGNOSTICO
            SET Activo = 0
            WHERE Id = @Id AND (@IsSuperAdmin = 1 OR GrantedByUserId = @CurrentUserId)
            """,
            new { Id = id, IsSuperAdmin = isSuperAdmin ? 1 : 0, CurrentUserId = currentUserId }
        );

        if (affected == 0)
            return NotFound(new { message = "Permiso no encontrado o solo el médico autor puede revocarlo." });

        await _audit.RecordAsync(
            conn, null, HttpContext, "Permiso de Diagnóstico Revocado",
            "TB_PERMISOS_DIAGNOSTICO", id.ToString()
        );
        return Ok(new { ok = true });
    }
}
