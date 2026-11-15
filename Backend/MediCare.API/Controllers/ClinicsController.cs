using System.Security.Claims;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class ClinicsController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly AuditService _audit;

    public ClinicsController(DbConnectionFactory db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public sealed record ClinicAssignmentInput(Guid MedicoUserId, Guid? AsistenteUserId);

    public sealed record ClinicUpsertRequest(
        string Name,
        string? Rif,
        string? Phone,
        string? Email,
        string? Address,
        List<ClinicAssignmentInput>? Assignments
    );

    private bool IsAdminOrSuperAdmin()
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        return role.Equals("ADMIN", StringComparison.OrdinalIgnoreCase)
            || role.Equals("SUPERADMIN", StringComparison.OrdinalIgnoreCase);
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);

        var clinics = (await conn.QueryAsync<dynamic>(
            """
            SELECT Id, Nombre, Rif, Telefono, Email, Direccion, Activa
            FROM dbo.TB_CLINICAS
            WHERE Activa = 1
            ORDER BY Nombre ASC
            """
        )).ToList();

        var links = (await conn.QueryAsync<dynamic>(
            """
            SELECT ca.Id, ca.ClinicaId, ca.MedicoUserId, ca.AsistenteUserId,
                   m.NombreCompleto AS MedicoNombre,
                   a.NombreCompleto AS AsistenteNombre
            FROM dbo.TB_CLINICA_ASIGNACIONES ca
            INNER JOIN dbo.TB_USUARIOS m ON m.Id = ca.MedicoUserId
            LEFT JOIN dbo.TB_USUARIOS a ON a.Id = ca.AsistenteUserId
            WHERE ca.Activo = 1 AND m.Activo = 1
            ORDER BY m.NombreCompleto, a.NombreCompleto
            """
        )).ToList();

        var result = clinics.Select(c =>
        {
            Guid clinicId = (Guid)c.Id;
            var clinicLinks = links
                .Where(l => (Guid)l.ClinicaId == clinicId)
                .Select(l => new
                {
                    id = ((Guid)l.Id).ToString(),
                    doctorId = ((Guid)l.MedicoUserId).ToString(),
                    doctorName = (string)l.MedicoNombre,
                    assistantId = l.AsistenteUserId is null ? null : ((Guid)l.AsistenteUserId).ToString(),
                    assistantName = (string?)l.AsistenteNombre
                })
                .ToList();

            return new
            {
                id = clinicId.ToString(),
                name = (string)c.Nombre,
                rif = (string?)c.Rif,
                phone = (string?)c.Telefono,
                email = (string?)c.Email,
                address = (string?)c.Direccion,
                active = (bool)c.Activa,
                assignments = clinicLinks
            };
        });

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ClinicUpsertRequest req, CancellationToken ct)
    {
        if (!IsAdminOrSuperAdmin())
            return Forbid();

        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "El nombre de la clínica es obligatorio." });

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var newId = Guid.NewGuid();

        await conn.ExecuteAsync(
            """
            INSERT INTO dbo.TB_CLINICAS (Id, Nombre, Rif, Telefono, Email, Direccion, Activa)
            VALUES (@Id, @Nombre, @Rif, @Telefono, @Email, @Direccion, 1)
            """,
            new
            {
                Id = newId,
                Nombre = req.Name.Trim(),
                Rif = string.IsNullOrWhiteSpace(req.Rif) ? null : req.Rif.Trim(),
                Telefono = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
                Email = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim(),
                Direccion = string.IsNullOrWhiteSpace(req.Address) ? null : req.Address.Trim(),
            }
        );

        await SyncAssignmentsAsync(conn, newId, req.Assignments);
        await _audit.RecordAsync(conn, null, HttpContext, "Crear Clínica", "TB_CLINICAS", newId.ToString());

        return Ok(new { id = newId.ToString(), name = req.Name.Trim() });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ClinicUpsertRequest req, CancellationToken ct)
    {
        if (!IsAdminOrSuperAdmin())
            return Forbid();

        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "El nombre de la clínica es obligatorio." });

        await using var conn = await _db.CreateOpenConnectionAsync(ct);

        var affected = await conn.ExecuteAsync(
            """
            UPDATE dbo.TB_CLINICAS
            SET Nombre = @Nombre,
                Rif = @Rif,
                Telefono = @Telefono,
                Email = @Email,
                Direccion = @Direccion,
                UpdatedAt = GETDATE()
            WHERE Id = @Id AND Activa = 1
            """,
            new
            {
                Id = id,
                Nombre = req.Name.Trim(),
                Rif = string.IsNullOrWhiteSpace(req.Rif) ? null : req.Rif.Trim(),
                Telefono = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
                Email = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim(),
                Direccion = string.IsNullOrWhiteSpace(req.Address) ? null : req.Address.Trim(),
            }
        );

        if (affected == 0)
            return NotFound(new { message = "Clínica no encontrada." });

        await SyncAssignmentsAsync(conn, id, req.Assignments);
        await _audit.RecordAsync(conn, null, HttpContext, "Actualizar Clínica", "TB_CLINICAS", id.ToString());

        return Ok(new { ok = true, id = id.ToString() });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (!IsAdminOrSuperAdmin())
            return Forbid();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await conn.ExecuteAsync(
            "UPDATE dbo.TB_CLINICA_ASIGNACIONES SET Activo = 0, UpdatedAt = GETDATE() WHERE ClinicaId = @Id",
            new { Id = id }
        );
        var affected = await conn.ExecuteAsync(
            "UPDATE dbo.TB_CLINICAS SET Activa = 0, UpdatedAt = GETDATE() WHERE Id = @Id",
            new { Id = id }
        );

        if (affected == 0)
            return NotFound(new { message = "Clínica no encontrada." });

        await _audit.RecordAsync(conn, null, HttpContext, "Desactivar Clínica", "TB_CLINICAS", id.ToString());
        return Ok(new { ok = true });
    }

    private static async Task SyncAssignmentsAsync(
        System.Data.Common.DbConnection conn,
        Guid clinicId,
        List<ClinicAssignmentInput>? assignments)
    {
        await conn.ExecuteAsync(
            "UPDATE dbo.TB_CLINICA_ASIGNACIONES SET Activo = 0, UpdatedAt = GETDATE() WHERE ClinicaId = @ClinicaId",
            new { ClinicaId = clinicId }
        );

        if (assignments is null || assignments.Count == 0)
            return;

        var uniquePairs = assignments
            .GroupBy(a => new { a.MedicoUserId, a.AsistenteUserId })
            .Select(g => g.First());

        foreach (var item in uniquePairs)
        {
            await conn.ExecuteAsync(
                """
                INSERT INTO dbo.TB_CLINICA_ASIGNACIONES (Id, ClinicaId, MedicoUserId, AsistenteUserId, Activo)
                VALUES (NEWID(), @ClinicaId, @MedicoUserId, @AsistenteUserId, 1)
                """,
                new
                {
                    ClinicaId = clinicId,
                    item.MedicoUserId,
                    item.AsistenteUserId
                }
            );
        }
    }
}
