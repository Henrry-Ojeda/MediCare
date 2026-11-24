using System.Security.Claims;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/clinic-invitations")]
[Authorize]
public sealed class ClinicInvitationsController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly AuditService _audit;

    public ClinicInvitationsController(DbConnectionFactory db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public sealed record CreateInvitationRequest(Guid ClinicId, Guid? DoctorUserId, string? DoctorEmail);
    public sealed record DoctorRespondRequest(bool Accept);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
            return Unauthorized();

        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var isSuperAdmin = role.Equals("SUPERADMIN", StringComparison.OrdinalIgnoreCase);
        var isDoctor = role.Equals("MEDICO", StringComparison.OrdinalIgnoreCase)
            || role.Equals("PEDIATRA", StringComparison.OrdinalIgnoreCase);

        await using var conn = await _db.CreateOpenConnectionAsync(ct);

        await conn.ExecuteAsync(
            """
            UPDATE dbo.TB_CLINICA_INVITACIONES
            SET Status = 'EXPIRED'
            WHERE Status IN ('PENDING_DOCTOR', 'PENDING_CLINIC_CONFIRM')
              AND ExpiresAt < GETUTCDATE()
            """
        );

        Guid? userClinicId = await conn.QueryFirstOrDefaultAsync<Guid?>(
            "SELECT ClinicId FROM dbo.TB_USUARIOS WHERE Id = @Id",
            new { Id = currentUserId }
        );

        var rows = (await conn.QueryAsync<dynamic>(
            """
            SELECT i.Id, i.ClinicId, i.DoctorUserId, i.InvitedByUserId, i.Status,
                   i.ExpiresAt, i.DoctorAcceptedAt, i.ClinicConfirmedAt, i.CreatedAt,
                   c.Nombre AS ClinicName,
                   d.NombreCompleto AS DoctorName, d.Email AS DoctorEmail,
                   inv.NombreCompleto AS InvitedByName
            FROM dbo.TB_CLINICA_INVITACIONES i
            INNER JOIN dbo.TB_CLINICAS c ON c.Id = i.ClinicId
            INNER JOIN dbo.TB_USUARIOS d ON d.Id = i.DoctorUserId
            INNER JOIN dbo.TB_USUARIOS inv ON inv.Id = i.InvitedByUserId
            WHERE @IsSuperAdmin = 1
               OR (@IsDoctor = 1 AND i.DoctorUserId = @CurrentUserId)
               OR (@IsDoctor = 0 AND (@UserClinicId IS NULL OR i.ClinicId = @UserClinicId))
            ORDER BY i.CreatedAt DESC
            """,
            new
            {
                IsSuperAdmin = isSuperAdmin ? 1 : 0,
                IsDoctor = isDoctor ? 1 : 0,
                CurrentUserId = currentUserId,
                UserClinicId = userClinicId
            }
        )).Select(r => new
        {
            id = ((Guid)r.Id).ToString(),
            clinicId = ((Guid)r.ClinicId).ToString(),
            clinicName = (string)r.ClinicName,
            doctorUserId = ((Guid)r.DoctorUserId).ToString(),
            doctorName = (string)r.DoctorName,
            doctorEmail = (string?)r.DoctorEmail ?? string.Empty,
            invitedByName = (string)r.InvitedByName,
            status = (string)r.Status,
            expiresAt = ((DateTime)r.ExpiresAt).ToString("o"),
            doctorAcceptedAt = r.DoctorAcceptedAt is null ? null : ((DateTime)r.DoctorAcceptedAt).ToString("o"),
            clinicConfirmedAt = r.ClinicConfirmedAt is null ? null : ((DateTime)r.ClinicConfirmedAt).ToString("o"),
            createdAt = ((DateTime)r.CreatedAt).ToString("o"),
        });

        return Ok(rows);
    }

    [HttpPost]
    [Authorize(Roles = "SUPERADMIN,ADMIN,GERENTE")]
    public async Task<IActionResult> Create([FromBody] CreateInvitationRequest req, CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var invitedByUserId))
            return Unauthorized();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);

        var targetDoctorId = req.DoctorUserId;
        if ((!targetDoctorId.HasValue || targetDoctorId == Guid.Empty) && !string.IsNullOrWhiteSpace(req.DoctorEmail))
        {
            targetDoctorId = await conn.QueryFirstOrDefaultAsync<Guid?>(
                """
                SELECT TOP 1 u.Id FROM dbo.TB_USUARIOS u
                INNER JOIN dbo.TB_ROLES r ON r.Id = u.RoleId
                WHERE r.Codigo = 'MEDICO' AND u.Activo = 1
                  AND (LOWER(ISNULL(u.Email, '')) = LOWER(@Email) OR LOWER(u.Username) = LOWER(@Email))
                """,
                new { Email = req.DoctorEmail.Trim() }
            );
        }

        if (!targetDoctorId.HasValue || targetDoctorId == Guid.Empty)
            return NotFound(new { message = "No se encontró el médico a invitar." });

        var newId = Guid.NewGuid();
        var expiresAt = DateTime.UtcNow.AddHours(24);
        await conn.ExecuteAsync(
            """
            INSERT INTO dbo.TB_CLINICA_INVITACIONES
                (Id, ClinicId, DoctorUserId, InvitedByUserId, Status, ExpiresAt)
            VALUES
                (@Id, @ClinicId, @DoctorUserId, @InvitedByUserId, 'PENDING_DOCTOR', @ExpiresAt)
            """,
            new
            {
                Id = newId,
                req.ClinicId,
                DoctorUserId = targetDoctorId.Value,
                InvitedByUserId = invitedByUserId,
                ExpiresAt = expiresAt
            }
        );

        await _audit.RecordAsync(
            conn, null, HttpContext, "Invitación de Clínica Enviada (24h)",
            "TB_CLINICA_INVITACIONES", newId.ToString()
        );

        return StatusCode(201, new { id = newId.ToString(), status = "PENDING_DOCTOR", expiresAt });
    }

    [HttpPost("{id:guid}/doctor-respond")]
    [Authorize(Roles = "MEDICO,PEDIATRA,SUPERADMIN")]
    public async Task<IActionResult> DoctorRespond(Guid id, [FromBody] DoctorRespondRequest req, CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
            return Unauthorized();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var inv = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT * FROM dbo.TB_CLINICA_INVITACIONES WHERE Id = @Id",
            new { Id = id }
        );
        if (inv is null) return NotFound(new { message = "Invitación no encontrada." });
        if ((Guid)inv.DoctorUserId != currentUserId) return Forbid();
        if ((string)inv.Status != "PENDING_DOCTOR")
            return BadRequest(new { message = "La invitación ya fue respondida o no está pendiente." });

        if ((DateTime)inv.ExpiresAt < DateTime.UtcNow)
        {
            await conn.ExecuteAsync(
                "UPDATE dbo.TB_CLINICA_INVITACIONES SET Status = 'EXPIRED' WHERE Id = @Id",
                new { Id = id }
            );
            return StatusCode(410, new { message = "La invitación expiró (24h). La clínica debe enviar una nueva." });
        }

        if (!req.Accept)
        {
            await conn.ExecuteAsync(
                "UPDATE dbo.TB_CLINICA_INVITACIONES SET Status = 'REJECTED' WHERE Id = @Id",
                new { Id = id }
            );
            return Ok(new { ok = true, status = "REJECTED" });
        }

        var nextExpiry = DateTime.UtcNow.AddHours(24);
        await conn.ExecuteAsync(
            """
            UPDATE dbo.TB_CLINICA_INVITACIONES
            SET Status = 'PENDING_CLINIC_CONFIRM',
                DoctorAcceptedAt = GETUTCDATE(),
                ExpiresAt = @NextExpiry
            WHERE Id = @Id
            """,
            new { Id = id, NextExpiry = nextExpiry }
        );

        return Ok(new { ok = true, status = "PENDING_CLINIC_CONFIRM", expiresAt = nextExpiry });
    }

    [HttpPost("{id:guid}/clinic-confirm")]
    [Authorize(Roles = "SUPERADMIN,ADMIN,GERENTE")]
    public async Task<IActionResult> ClinicConfirm(Guid id, CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
            return Unauthorized();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var inv = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT * FROM dbo.TB_CLINICA_INVITACIONES WHERE Id = @Id",
            new { Id = id }
        );
        if (inv is null) return NotFound(new { message = "Invitación no encontrada." });
        if ((string)inv.Status != "PENDING_CLINIC_CONFIRM")
            return BadRequest(new { message = "El médico aún no acepta la invitación o ya fue procesada." });

        if ((DateTime)inv.ExpiresAt < DateTime.UtcNow)
        {
            await conn.ExecuteAsync(
                "UPDATE dbo.TB_CLINICA_INVITACIONES SET Status = 'EXPIRED' WHERE Id = @Id",
                new { Id = id }
            );
            return StatusCode(410, new { message = "La confirmación final expiró (24h). Debe enviar una nueva invitación." });
        }

        await conn.ExecuteAsync(
            """
            UPDATE dbo.TB_CLINICA_INVITACIONES
            SET Status = 'ACTIVE',
                ClinicConfirmedAt = GETUTCDATE(),
                ClinicConfirmedByUserId = @ConfirmedBy
            WHERE Id = @Id;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.TB_CLINICA_ASIGNACIONES
                WHERE ClinicaId = @ClinicId AND MedicoUserId = @DoctorUserId AND Activo = 1
            )
            BEGIN
                INSERT INTO dbo.TB_CLINICA_ASIGNACIONES (Id, ClinicaId, MedicoUserId, AsistenteUserId, Activo)
                VALUES (NEWID(), @ClinicId, @DoctorUserId, NULL, 1);
            END
            """,
            new
            {
                Id = id,
                ConfirmedBy = currentUserId,
                ClinicId = (Guid)inv.ClinicId,
                DoctorUserId = (Guid)inv.DoctorUserId
            }
        );

        await _audit.RecordAsync(
            conn, null, HttpContext, "Asociación Clínica-Médico Confirmada (Doble Aprobación)",
            "TB_CLINICA_INVITACIONES", id.ToString()
        );

        return Ok(new { ok = true, status = "ACTIVE" });
    }
}
