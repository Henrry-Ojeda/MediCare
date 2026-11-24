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

    private static Task EnsureStatusColumnAsync(System.Data.IDbConnection conn) =>
        conn.ExecuteAsync(
            """
            IF COL_LENGTH('dbo.TB_PERMISOS_DIAGNOSTICO', 'Status') IS NULL
                ALTER TABLE dbo.TB_PERMISOS_DIAGNOSTICO
                    ADD Status NVARCHAR(20) NOT NULL CONSTRAINT DF_TB_PERMISOS_DIAG_STATUS DEFAULT 'APPROVED';
            """
        );

    public sealed record GrantPermissionRequest(
        Guid PatientId,
        Guid? ConsultationId,
        Guid TargetDoctorUserId,
        string? Reason
    );

    public sealed record RequestPermissionInput(
        Guid PatientId,
        Guid? ConsultationId,
        Guid? AuthorDoctorUserId,
        string? Reason
    );

    public sealed record HandoverPermissionRequest(
        Guid ClinicId,
        Guid? FromDoctorUserId,
        Guid TargetDoctorUserId,
        DateTime CutoffDate,
        string? Reason,
        bool IsEmergencyContinuity = false
    );

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? patientId, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureStatusColumnAsync(conn);

        var rows = (await conn.QueryAsync<dynamic>(
            """
            SELECT p.Id, p.PatientId, p.ConsultationId, p.GrantedByUserId,
                   p.TargetDoctorUserId, p.Reason, p.Activo, p.CreatedAt,
                   ISNULL(p.Status, CASE WHEN p.Activo = 1 THEN 'APPROVED' ELSE 'REVOKED' END) AS Status,
                   g.NombreCompleto AS GrantedByName,
                   t.NombreCompleto AS TargetDoctorName
            FROM dbo.TB_PERMISOS_DIAGNOSTICO p
            INNER JOIN dbo.TB_USUARIOS g ON g.Id = p.GrantedByUserId
            LEFT JOIN dbo.TB_USUARIOS t ON t.Id = p.TargetDoctorUserId
            WHERE (p.Activo = 1 OR ISNULL(p.Status, 'APPROVED') = 'PENDING')
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
            status = (string)r.Status,
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
        await EnsureStatusColumnAsync(conn);
        var pediatriaId = await conn.QueryFirstOrDefaultAsync<int?>(
            "SELECT TOP 1 Id FROM dbo.TB_ESPECIALIDADES WHERE LOWER(Nombre) LIKE '%pediatr%'"
        ) ?? 1;

        var newId = Guid.NewGuid();
        await conn.ExecuteAsync(
            """
            INSERT INTO dbo.TB_PERMISOS_DIAGNOSTICO
                (Id, PatientId, ConsultationId, GrantedByUserId, GrantedBySpecialtyId,
                 TargetSpecialtyId, TargetDoctorUserId, Reason, Activo, Status)
            VALUES
                (@Id, @PatientId, @ConsultationId, @GrantedByUserId, @SpecId,
                 @SpecId, @TargetDoctorUserId, @Reason, 1, 'APPROVED')
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

        return Ok(new { id = newId.ToString(), status = "APPROVED" });
    }

    [HttpPost("request")]
    [Authorize(Roles = "SUPERADMIN,MEDICO")]
    public async Task<IActionResult> RequestAccess([FromBody] RequestPermissionInput req, CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var requesterUserId))
            return Unauthorized();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureStatusColumnAsync(conn);

        Guid? authorDoctorUserId = req.AuthorDoctorUserId;
        if (req.ConsultationId.HasValue)
        {
            authorDoctorUserId = await conn.QueryFirstOrDefaultAsync<Guid?>(
                "SELECT DoctorUserId FROM dbo.TB_CONSULTAS WHERE Id = @ConsultationId AND PatientId = @PatientId",
                new { req.ConsultationId, req.PatientId }
            );
        }

        if (!authorDoctorUserId.HasValue || authorDoctorUserId.Value == Guid.Empty)
            return BadRequest(new { message = "No se encontró el médico autor de la consulta." });

        if (authorDoctorUserId.Value == requesterUserId)
            return BadRequest(new { message = "No necesitas solicitar permiso para tu propia consulta." });

        var existing = await conn.QueryFirstOrDefaultAsync<dynamic>(
            """
            SELECT TOP 1 Id, Activo, ISNULL(Status, 'APPROVED') AS Status
            FROM dbo.TB_PERMISOS_DIAGNOSTICO
            WHERE PatientId = @PatientId
              AND TargetDoctorUserId = @RequesterUserId
              AND ((@ConsultationId IS NULL AND ConsultationId IS NULL) OR ConsultationId = @ConsultationId)
              AND (Activo = 1 OR ISNULL(Status, 'APPROVED') = 'PENDING')
            ORDER BY CreatedAt DESC
            """,
            new { req.PatientId, RequesterUserId = requesterUserId, req.ConsultationId }
        );

        if (existing is not null)
        {
            return Ok(new
            {
                id = ((Guid)existing.Id).ToString(),
                status = (string)existing.Status,
                alreadyExists = true,
            });
        }

        var pediatriaId = await conn.QueryFirstOrDefaultAsync<int?>(
            "SELECT TOP 1 Id FROM dbo.TB_ESPECIALIDADES WHERE LOWER(Nombre) LIKE '%pediatr%'"
        ) ?? 1;

        var newId = Guid.NewGuid();
        await conn.ExecuteAsync(
            """
            INSERT INTO dbo.TB_PERMISOS_DIAGNOSTICO
                (Id, PatientId, ConsultationId, GrantedByUserId, GrantedBySpecialtyId,
                 TargetSpecialtyId, TargetDoctorUserId, Reason, Activo, Status)
            VALUES
                (@Id, @PatientId, @ConsultationId, @GrantedByUserId, @SpecId,
                 @SpecId, @TargetDoctorUserId, @Reason, 0, 'PENDING')
            """,
            new
            {
                Id = newId,
                req.PatientId,
                req.ConsultationId,
                GrantedByUserId = authorDoctorUserId.Value,
                SpecId = pediatriaId,
                TargetDoctorUserId = requesterUserId,
                Reason = string.IsNullOrWhiteSpace(req.Reason)
                    ? "Solicitud de acceso al diagnóstico clínico para continuidad asistencial"
                    : req.Reason.Trim(),
            }
        );

        await _audit.RecordAsync(
            conn, null, HttpContext, "Solicitud de Permiso de Diagnóstico",
            "TB_PERMISOS_DIAGNOSTICO", newId.ToString(), req.PatientId
        );

        try
        {
            var requesterName = User.FindFirstValue(ClaimTypes.Name) ?? "Un médico";
            var patientName = await conn.QueryFirstOrDefaultAsync<string?>(
                "SELECT FirstName + ' ' + LastName FROM dbo.TB_PACIENTES WHERE Id = @PatientId",
                new { req.PatientId }
            ) ?? "un paciente";

            await conn.ExecuteAsync(
                """
                IF COL_LENGTH('dbo.TB_NOTIFICACIONES', 'TargetUserId') IS NULL
                    ALTER TABLE dbo.TB_NOTIFICACIONES ADD TargetUserId NVARCHAR(100) NULL;
                INSERT INTO dbo.TB_NOTIFICACIONES
                    (Id, Title, Message, Category, Priority, TargetRoles, CreatedAtLabel, IsRead, PatientId, TargetUserId)
                VALUES
                    (@NotifId, @Title, @Message, 'diagnostico', 'alta', 'MEDICO,PEDIATRA', 'Ahora', 0, @PatientIdStr, @TargetUserId)
                """,
                new
                {
                    NotifId = $"diag-req-{newId:N}",
                    Title = "Solicitud de acceso a diagnóstico",
                    Message = $"{requesterName} solicita permiso para ver el diagnóstico de {patientName}.",
                    PatientIdStr = req.PatientId.ToString(),
                    TargetUserId = authorDoctorUserId.Value.ToString(),
                }
            );
        }
        catch
        {
            // No bloquear la solicitud si TB_NOTIFICACIONES no está disponible
        }

        return StatusCode(201, new { id = newId.ToString(), status = "PENDING" });
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = "SUPERADMIN,MEDICO")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
            return Unauthorized();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureStatusColumnAsync(conn);
        var isSuperAdmin = (User.FindFirstValue(ClaimTypes.Role) ?? string.Empty)
            .Equals("SUPERADMIN", StringComparison.OrdinalIgnoreCase);

        var affected = await conn.ExecuteAsync(
            """
            UPDATE dbo.TB_PERMISOS_DIAGNOSTICO
            SET Activo = 1, Status = 'APPROVED'
            WHERE Id = @Id AND (@IsSuperAdmin = 1 OR GrantedByUserId = @CurrentUserId)
            """,
            new { Id = id, IsSuperAdmin = isSuperAdmin ? 1 : 0, CurrentUserId = currentUserId }
        );

        if (affected == 0)
            return NotFound(new { message = "Solicitud no encontrada o solo el médico autor puede aprobarla." });

        await _audit.RecordAsync(
            conn, null, HttpContext, "Permiso de Diagnóstico Aprobado",
            "TB_PERMISOS_DIAGNOSTICO", id.ToString()
        );
        return Ok(new { ok = true, status = "APPROVED" });
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = "SUPERADMIN,MEDICO")]
    public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
            return Unauthorized();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureStatusColumnAsync(conn);
        var isSuperAdmin = (User.FindFirstValue(ClaimTypes.Role) ?? string.Empty)
            .Equals("SUPERADMIN", StringComparison.OrdinalIgnoreCase);

        var affected = await conn.ExecuteAsync(
            """
            UPDATE dbo.TB_PERMISOS_DIAGNOSTICO
            SET Activo = 0, Status = 'REJECTED'
            WHERE Id = @Id AND (@IsSuperAdmin = 1 OR GrantedByUserId = @CurrentUserId)
            """,
            new { Id = id, IsSuperAdmin = isSuperAdmin ? 1 : 0, CurrentUserId = currentUserId }
        );

        if (affected == 0)
            return NotFound(new { message = "Solicitud no encontrada o solo el médico autor puede rechazarla." });

        await _audit.RecordAsync(
            conn, null, HttpContext, "Solicitud de Permiso Rechazada",
            "TB_PERMISOS_DIAGNOSTICO", id.ToString()
        );
        return Ok(new { ok = true, status = "REJECTED" });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SUPERADMIN,MEDICO")]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
            return Unauthorized();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureStatusColumnAsync(conn);
        var isSuperAdmin = (User.FindFirstValue(ClaimTypes.Role) ?? string.Empty)
            .Equals("SUPERADMIN", StringComparison.OrdinalIgnoreCase);

        var affected = await conn.ExecuteAsync(
            """
            UPDATE dbo.TB_PERMISOS_DIAGNOSTICO
            SET Activo = 0, Status = 'REVOKED'
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

    /// <summary>
    /// S-06 / S-07: Traspaso de cartera al retirarse un médico de una clínica con fecha de corte (CutoffDate)
    /// o continuidad excepcional auditada (GERENTE + SUPERADMIN).
    /// </summary>
    [HttpPost("handover")]
    [Authorize(Roles = "SUPERADMIN,GERENTE,MEDICO,PEDIATRA")]
    public async Task<IActionResult> HandoverWithCutoff([FromBody] HandoverPermissionRequest req, CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var currentUserId))
            return Unauthorized();

        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var isSuperAdmin = role.Equals("SUPERADMIN", StringComparison.OrdinalIgnoreCase);

        if (req.IsEmergencyContinuity && !isSuperAdmin)
            return StatusCode(403, new { message = "El acceso excepcional de continuidad/emergencia requiere aprobación de SUPERADMIN." });

        var fromDoctorId = req.FromDoctorUserId ?? currentUserId;

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var pediatriaId = await conn.QueryFirstOrDefaultAsync<int?>(
            "SELECT TOP 1 Id FROM dbo.TB_ESPECIALIDADES WHERE LOWER(Nombre) LIKE '%pediatr%'"
        ) ?? 1;

        var patientIds = (await conn.QueryAsync<Guid>(
            """
            SELECT DISTINCT PatientId
            FROM dbo.TB_CONSULTAS
            WHERE DoctorUserId = @FromDoctorId
              AND (ClinicId = @ClinicId OR ClinicId IS NULL)
              AND ConsultationDate <= @CutoffDate
            """,
            new { FromDoctorId = fromDoctorId, req.ClinicId, req.CutoffDate }
        )).ToList();

        foreach (var pid in patientIds)
        {
            await conn.ExecuteAsync(
                """
                INSERT INTO dbo.TB_PERMISOS_DIAGNOSTICO
                    (Id, PatientId, ConsultationId, GrantedByUserId, GrantedBySpecialtyId,
                     TargetSpecialtyId, TargetDoctorUserId, Reason, Activo, Status,
                     ScopeClinicId, MaxConsultationDate, IsEmergencyContinuity)
                VALUES
                    (NEWID(), @PatientId, NULL, @GrantedByUserId, @SpecId,
                     @SpecId, @TargetDoctorUserId, @Reason, 1, 'APPROVED',
                     @ScopeClinicId, @CutoffDate, @IsEmergency)
                """,
                new
                {
                    PatientId = pid,
                    GrantedByUserId = fromDoctorId,
                    SpecId = pediatriaId,
                    req.TargetDoctorUserId,
                    Reason = string.IsNullOrWhiteSpace(req.Reason)
                        ? $"Traspaso clínico con fecha de corte {req.CutoffDate:yyyy-MM-dd}"
                        : req.Reason.Trim(),
                    ScopeClinicId = req.ClinicId,
                    req.CutoffDate,
                    IsEmergency = req.IsEmergencyContinuity ? 1 : 0,
                }
            );
        }

        await _audit.RecordAsync(
            conn, null, HttpContext,
            req.IsEmergencyContinuity ? "Traspaso Excepcional de Continuidad" : "Traspaso de Cartera con CutoffDate",
            "TB_PERMISOS_DIAGNOSTICO", req.ClinicId.ToString(),
            newValue: new { fromDoctorId, req.TargetDoctorUserId, req.CutoffDate, patientsCount = patientIds.Count }
        );

        return Ok(new { ok = true, patientsTransferred = patientIds.Count, cutoffDate = req.CutoffDate });
    }
}
