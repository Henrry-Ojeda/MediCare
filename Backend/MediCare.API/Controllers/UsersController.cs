using System.Security.Claims;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class UsersController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly AuditService _audit;

    public UsersController(DbConnectionFactory db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public sealed record DoctorUpsertRequest(
        string FirstName,
        string LastName,
        string Email,
        string? Username,
        string? Password,
        string? Phone,
        string? LicenseNumber,
        string? AvatarUrl,
        bool DictationEnabled = false
    );

    private static Task EnsureDictationColumnAsync(System.Data.IDbConnection conn) =>
        conn.ExecuteAsync(
            """
            IF COL_LENGTH('dbo.TB_USUARIOS', 'DictationEnabled') IS NULL
                ALTER TABLE dbo.TB_USUARIOS
                    ADD DictationEnabled BIT NOT NULL CONSTRAINT DF_TB_USUARIOS_DICTATION DEFAULT 0;
            """
        );

    public sealed record AssistantPermissionsDto(
        bool CanSchedule = true,
        bool CanRegisterPatientInfo = true,
        bool CanCollectPayments = true,
        bool CanRescheduleOrCancel = true
    );

    public sealed record AssistantUpsertRequest(
        string FirstName,
        string LastName,
        string Email,
        string? Username,
        string? Password,
        string? Phone,
        List<Guid>? AssignedDoctorIds,
        AssistantPermissionsDto? Permissions
    );

    private bool IsAdminOrSuperAdmin()
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        return role.Equals("ADMIN", StringComparison.OrdinalIgnoreCase)
            || role.Equals("SUPERADMIN", StringComparison.OrdinalIgnoreCase);
    }

    private bool IsDoctor()
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        return role.Equals("MEDICO", StringComparison.OrdinalIgnoreCase)
            || role.Equals("PEDIATRA", StringComparison.OrdinalIgnoreCase);
    }

    [HttpGet("doctors")]
    public async Task<IActionResult> ListDoctors(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureDictationColumnAsync(conn);
        var rows = (await conn.QueryAsync<dynamic>(
            """
            SELECT u.Id, u.NombreCompleto, u.Username, u.Email, u.Telefono, u.NumeroColegiado, u.AvatarUrl, u.Activo,
                   ISNULL(u.DictationEnabled, 0) AS DictationEnabled
            FROM dbo.TB_USUARIOS u
            INNER JOIN dbo.TB_ROLES r ON r.Id = u.RoleId
            WHERE r.Codigo = 'MEDICO' AND u.Activo = 1
            ORDER BY u.NombreCompleto ASC
            """
        )).Select(u => new
        {
            id = ((Guid)u.Id).ToString(),
            nombreCompleto = (string)u.NombreCompleto,
            username = (string)u.Username,
            email = (string?)u.Email ?? string.Empty,
            telefono = (string?)u.Telefono,
            numeroColegiado = (string?)u.NumeroColegiado ?? "MPPS Pendiente",
            avatarUrl = (string?)u.AvatarUrl,
            activo = (bool)u.Activo,
            dictationEnabled = (bool)u.DictationEnabled,
        });
        return Ok(rows);
    }

    [HttpPost("doctors")]
    public async Task<IActionResult> CreateDoctor([FromBody] DoctorUpsertRequest req, CancellationToken ct)
    {
        if (!IsAdminOrSuperAdmin())
            return Forbid();

        if (string.IsNullOrWhiteSpace(req.FirstName) || string.IsNullOrWhiteSpace(req.LastName) ||
            string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        {
            return BadRequest(new { message = "Nombre, apellido, correo y contraseña son obligatorios." });
        }

        var fullName = $"{req.FirstName.Trim()} {req.LastName.Trim()}";
        var email = req.Email.Trim();
        var username = string.IsNullOrWhiteSpace(req.Username)
            ? email.Split('@')[0].ToLowerInvariant()
            : req.Username.Trim().ToLowerInvariant();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureDictationColumnAsync(conn);

        var exists = await conn.QueryFirstOrDefaultAsync<int>(
            """
            SELECT COUNT(1) FROM dbo.TB_USUARIOS
            WHERE LOWER(Username) = LOWER(@Username) OR LOWER(ISNULL(Email, '')) = LOWER(@Email)
            """,
            new { Username = username, Email = email }
        );
        if (exists > 0)
            return Conflict(new { message = "Ya existe un usuario con ese nombre de usuario o correo." });

        var roleId = await conn.QueryFirstOrDefaultAsync<int?>(
            "SELECT TOP 1 Id FROM dbo.TB_ROLES WHERE Codigo = 'MEDICO'"
        );
        if (roleId is null)
            return StatusCode(500, new { message = "Rol MEDICO no encontrado en TB_ROLES." });

        var newId = Guid.NewGuid();
        var hash = BCrypt.Net.BCrypt.HashPassword(req.Password.Trim());

        await conn.ExecuteAsync(
            """
            INSERT INTO dbo.TB_USUARIOS (Id, RoleId, Username, NombreCompleto, Email, PasswordHash, NumeroColegiado, Telefono, AvatarUrl, DictationEnabled, Activo)
            VALUES (@Id, @RoleId, @Username, @NombreCompleto, @Email, @PasswordHash, @NumeroColegiado, @Telefono, @AvatarUrl, @DictationEnabled, 1)
            """,
            new
            {
                Id = newId,
                RoleId = roleId.Value,
                Username = username,
                NombreCompleto = fullName,
                Email = email,
                PasswordHash = hash,
                NumeroColegiado = string.IsNullOrWhiteSpace(req.LicenseNumber) ? "MPPS Pendiente" : req.LicenseNumber.Trim(),
                Telefono = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
                AvatarUrl = string.IsNullOrWhiteSpace(req.AvatarUrl) ? null : req.AvatarUrl,
                req.DictationEnabled,
            }
        );

        await _audit.RecordAsync(conn, null, HttpContext, "Crear Médico", "TB_USUARIOS", newId.ToString());

        return Ok(new
        {
            id = newId,
            nombreCompleto = fullName,
            username,
            email,
            telefono = req.Phone?.Trim(),
            numeroColegiado = string.IsNullOrWhiteSpace(req.LicenseNumber) ? "MPPS Pendiente" : req.LicenseNumber.Trim(),
            avatarUrl = string.IsNullOrWhiteSpace(req.AvatarUrl) ? null : req.AvatarUrl,
            dictationEnabled = req.DictationEnabled,
            activo = true
        });
    }

    [HttpPut("doctors/{id:guid}")]
    public async Task<IActionResult> UpdateDoctor(Guid id, [FromBody] DoctorUpsertRequest req, CancellationToken ct)
    {
        if (!IsAdminOrSuperAdmin())
            return Forbid();

        var fullName = $"{req.FirstName.Trim()} {req.LastName.Trim()}";
        var email = req.Email.Trim();
        var username = string.IsNullOrWhiteSpace(req.Username)
            ? email.Split('@')[0].ToLowerInvariant()
            : req.Username.Trim().ToLowerInvariant();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureDictationColumnAsync(conn);

        var conflict = await conn.QueryFirstOrDefaultAsync<int>(
            """
            SELECT COUNT(1) FROM dbo.TB_USUARIOS
            WHERE Id <> @Id AND (LOWER(Username) = LOWER(@Username) OR LOWER(ISNULL(Email, '')) = LOWER(@Email))
            """,
            new { Id = id, Username = username, Email = email }
        );
        if (conflict > 0)
            return Conflict(new { message = "Ya existe otro usuario con ese nombre de usuario o correo." });

        var newHash = !string.IsNullOrWhiteSpace(req.Password)
            ? BCrypt.Net.BCrypt.HashPassword(req.Password.Trim())
            : null;

        var affected = await conn.ExecuteAsync(
            """
            UPDATE dbo.TB_USUARIOS
            SET Username = @Username,
                NombreCompleto = @NombreCompleto,
                Email = @Email,
                Telefono = @Telefono,
                NumeroColegiado = @NumeroColegiado,
                AvatarUrl = @AvatarUrl,
                DictationEnabled = @DictationEnabled,
                PasswordHash = COALESCE(@PasswordHash, PasswordHash),
                UpdatedAt = GETDATE()
            WHERE Id = @Id
            """,
            new
            {
                Id = id,
                Username = username,
                NombreCompleto = fullName,
                Email = email,
                Telefono = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
                NumeroColegiado = string.IsNullOrWhiteSpace(req.LicenseNumber) ? "MPPS Pendiente" : req.LicenseNumber.Trim(),
                AvatarUrl = string.IsNullOrWhiteSpace(req.AvatarUrl) ? null : req.AvatarUrl,
                req.DictationEnabled,
                PasswordHash = newHash,
            }
        );

        if (affected == 0)
            return NotFound(new { message = "Médico no encontrado." });

        await _audit.RecordAsync(conn, null, HttpContext, "Actualizar Médico", "TB_USUARIOS", id.ToString());
        return Ok(new { ok = true, id });
    }

    [HttpDelete("doctors/{id:guid}")]
    public async Task<IActionResult> DeleteDoctor(Guid id, CancellationToken ct)
    {
        if (!IsAdminOrSuperAdmin())
            return Forbid();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await conn.ExecuteAsync(
            "UPDATE dbo.TB_ASISTENTE_MEDICOS SET Activo = 0, UpdatedAt = GETDATE() WHERE MedicoUserId = @Id",
            new { Id = id }
        );
        var affected = await conn.ExecuteAsync(
            "UPDATE dbo.TB_USUARIOS SET Activo = 0, UpdatedAt = GETDATE() WHERE Id = @Id",
            new { Id = id }
        );
        if (affected == 0)
            return NotFound(new { message = "Médico no encontrado." });

        await _audit.RecordAsync(conn, null, HttpContext, "Desactivar Médico", "TB_USUARIOS", id.ToString());
        return Ok(new { ok = true });
    }

    [HttpGet("assistants")]
    public async Task<IActionResult> ListAssistants(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var users = (await conn.QueryAsync<dynamic>(
            """
            SELECT u.Id, u.NombreCompleto, u.Username, u.Email, u.Telefono, u.Activo
            FROM dbo.TB_USUARIOS u
            INNER JOIN dbo.TB_ROLES r ON r.Id = u.RoleId
            WHERE r.Codigo = 'ASISTENTE' AND u.Activo = 1
            ORDER BY u.NombreCompleto ASC
            """
        )).ToList();

        var links = (await conn.QueryAsync<dynamic>(
            """
            SELECT AsistenteUserId, MedicoUserId, TipoAsignacion,
                   PuedeAgendar, PuedeRegistrarInfo, PuedeCobrar, PuedePosponerCancelar
            FROM dbo.TB_ASISTENTE_MEDICOS
            WHERE Activo = 1
            """
        )).ToList();

        var result = users.Select(u =>
        {
            Guid userId = (Guid)u.Id;
            var userLinks = links.Where(l => (Guid)l.AsistenteUserId == userId).ToList();
            var first = userLinks.FirstOrDefault();
            return new
            {
                id = userId,
                nombreCompleto = (string)u.NombreCompleto,
                username = (string)u.Username,
                email = (string?)u.Email ?? string.Empty,
                telefono = (string?)u.Telefono,
                activo = (bool)u.Activo,
                assignedDoctorIds = userLinks.Select(l => (Guid)l.MedicoUserId).Distinct().ToList(),
                permissions = new
                {
                    canSchedule = first is null || (bool)first.PuedeAgendar,
                    canRegisterPatientInfo = first is null || (bool)first.PuedeRegistrarInfo,
                    canCollectPayments = first is null || (bool)first.PuedeCobrar,
                    canRescheduleOrCancel = first is null || (bool)first.PuedePosponerCancelar,
                }
            };
        });

        return Ok(result);
    }

    [HttpPost("assistants")]
    public async Task<IActionResult> CreateAssistant([FromBody] AssistantUpsertRequest req, CancellationToken ct)
    {
        var isAdmin = IsAdminOrSuperAdmin();
        var isDoctor = IsDoctor();
        if (!isAdmin && !isDoctor)
            return Forbid();

        List<Guid>? effectiveDoctorIds = req.AssignedDoctorIds;
        if (!isAdmin)
        {
            var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdRaw, out var selfDoctorId))
                return Unauthorized();
            // En Plan Personal, el médico solo puede crear un asistente PERSONAL vinculado exclusivamente a sí mismo
            effectiveDoctorIds = new List<Guid> { selfDoctorId };
        }

        if (string.IsNullOrWhiteSpace(req.FirstName) || string.IsNullOrWhiteSpace(req.LastName) ||
            string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        {
            return BadRequest(new { message = "Nombre, apellido, correo y contraseña son obligatorios." });
        }

        var fullName = $"{req.FirstName.Trim()} {req.LastName.Trim()}";
        var email = req.Email.Trim();
        var username = string.IsNullOrWhiteSpace(req.Username)
            ? email.Split('@')[0].ToLowerInvariant()
            : req.Username.Trim().ToLowerInvariant();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureDictationColumnAsync(conn);

        var exists = await conn.QueryFirstOrDefaultAsync<int>(
            """
            SELECT COUNT(1) FROM dbo.TB_USUARIOS
            WHERE LOWER(Username) = LOWER(@Username) OR LOWER(ISNULL(Email, '')) = LOWER(@Email)
            """,
            new { Username = username, Email = email }
        );
        if (exists > 0)
            return Conflict(new { message = "Ya existe un usuario con ese nombre de usuario o correo." });

        var roleId = await conn.QueryFirstOrDefaultAsync<int?>(
            "SELECT TOP 1 Id FROM dbo.TB_ROLES WHERE Codigo = 'ASISTENTE'"
        );
        if (roleId is null)
            return StatusCode(500, new { message = "Rol ASISTENTE no encontrado en TB_ROLES." });

        var newId = Guid.NewGuid();
        var hash = BCrypt.Net.BCrypt.HashPassword(req.Password.Trim());

        await conn.ExecuteAsync(
            """
            INSERT INTO dbo.TB_USUARIOS (Id, RoleId, Username, NombreCompleto, Email, PasswordHash, Telefono, Activo)
            VALUES (@Id, @RoleId, @Username, @NombreCompleto, @Email, @PasswordHash, @Telefono, 1)
            """,
            new
            {
                Id = newId,
                RoleId = roleId.Value,
                Username = username,
                NombreCompleto = fullName,
                Email = email,
                PasswordHash = hash,
                Telefono = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
            }
        );

        await SyncAssistantDoctorsAsync(conn, newId, effectiveDoctorIds, req.Permissions);
        await _audit.RecordAsync(conn, null, HttpContext, "Crear Asistente", "TB_USUARIOS", newId.ToString());

        return Ok(new
        {
            id = newId,
            nombreCompleto = fullName,
            username,
            email,
            telefono = req.Phone?.Trim(),
            assignedDoctorIds = effectiveDoctorIds ?? new List<Guid>(),
        });
    }

    [HttpPut("assistants/{id:guid}")]
    public async Task<IActionResult> UpdateAssistant(Guid id, [FromBody] AssistantUpsertRequest req, CancellationToken ct)
    {
        if (!IsAdminOrSuperAdmin())
            return Forbid();

        var fullName = $"{req.FirstName.Trim()} {req.LastName.Trim()}";
        var email = req.Email.Trim();
        var username = string.IsNullOrWhiteSpace(req.Username)
            ? email.Split('@')[0].ToLowerInvariant()
            : req.Username.Trim().ToLowerInvariant();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureDictationColumnAsync(conn);

        var conflict = await conn.QueryFirstOrDefaultAsync<int>(
            """
            SELECT COUNT(1) FROM dbo.TB_USUARIOS
            WHERE Id <> @Id AND (LOWER(Username) = LOWER(@Username) OR LOWER(ISNULL(Email, '')) = LOWER(@Email))
            """,
            new { Id = id, Username = username, Email = email }
        );
        if (conflict > 0)
            return Conflict(new { message = "Ya existe otro usuario con ese nombre de usuario o correo." });

        var newHash = !string.IsNullOrWhiteSpace(req.Password)
            ? BCrypt.Net.BCrypt.HashPassword(req.Password.Trim())
            : null;

        var affected = await conn.ExecuteAsync(
            """
            UPDATE dbo.TB_USUARIOS
            SET Username = @Username,
                NombreCompleto = @NombreCompleto,
                Email = @Email,
                Telefono = @Telefono,
                PasswordHash = COALESCE(@PasswordHash, PasswordHash),
                UpdatedAt = GETDATE()
            WHERE Id = @Id
            """,
            new
            {
                Id = id,
                Username = username,
                NombreCompleto = fullName,
                Email = email,
                Telefono = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
                PasswordHash = newHash,
            }
        );

        if (affected == 0)
            return NotFound(new { message = "Asistente no encontrada." });

        await SyncAssistantDoctorsAsync(conn, id, req.AssignedDoctorIds, req.Permissions);
        await _audit.RecordAsync(conn, null, HttpContext, "Actualizar Asistente", "TB_USUARIOS", id.ToString());
        return Ok(new { ok = true, id });
    }

    [HttpDelete("assistants/{id:guid}")]
    public async Task<IActionResult> DeleteAssistant(Guid id, CancellationToken ct)
    {
        if (!IsAdminOrSuperAdmin())
            return Forbid();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await conn.ExecuteAsync(
            "UPDATE dbo.TB_ASISTENTE_MEDICOS SET Activo = 0, UpdatedAt = GETDATE() WHERE AsistenteUserId = @Id",
            new { Id = id }
        );
        var affected = await conn.ExecuteAsync(
            "UPDATE dbo.TB_USUARIOS SET Activo = 0, UpdatedAt = GETDATE() WHERE Id = @Id",
            new { Id = id }
        );
        if (affected == 0)
            return NotFound(new { message = "Asistente no encontrada." });

        await _audit.RecordAsync(conn, null, HttpContext, "Desactivar Asistente", "TB_USUARIOS", id.ToString());
        return Ok(new { ok = true });
    }

    private static async Task SyncAssistantDoctorsAsync(
        System.Data.Common.DbConnection conn,
        Guid assistantId,
        List<Guid>? doctorIds,
        AssistantPermissionsDto? perms)
    {
        await conn.ExecuteAsync(
            "UPDATE dbo.TB_ASISTENTE_MEDICOS SET Activo = 0, UpdatedAt = GETDATE() WHERE AsistenteUserId = @AsistenteUserId",
            new { AsistenteUserId = assistantId }
        );

        if (doctorIds is null || doctorIds.Count == 0)
            return;

        var p = perms ?? new AssistantPermissionsDto();
        var tipo = doctorIds.Distinct().Count() > 1 ? "COMPARTIDA_CLINICA" : "PERSONAL";

        foreach (var medicoId in doctorIds.Distinct())
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
                    AsistenteUserId = assistantId,
                    MedicoUserId = medicoId,
                    TipoAsignacion = tipo,
                    PuedeAgendar = p.CanSchedule,
                    PuedeRegistrarInfo = p.CanRegisterPatientInfo,
                    PuedeCobrar = p.CanCollectPayments,
                    PuedePosponerCancelar = p.CanRescheduleOrCancel,
                }
            );
        }
    }

    [HttpDelete("assistants/{assistantId:guid}/unlink-me")]
    public async Task<IActionResult> UnlinkMyAssistant(Guid assistantId, CancellationToken ct)
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdRaw, out var doctorId))
            return Unauthorized();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var affected = await conn.ExecuteAsync(
            """
            UPDATE dbo.TB_ASISTENTE_MEDICOS
            SET Activo = 0,
                UpdatedAt = GETDATE()
            WHERE AsistenteUserId = @AssistantId
              AND MedicoUserId = @DoctorId
              AND Activo = 1
            """,
            new { AssistantId = assistantId, DoctorId = doctorId }
        );

        await _audit.RecordAsync(
            conn,
            null,
            HttpContext,
            "Desvincular Asistente",
            "TB_ASISTENTE_MEDICOS",
            $"{assistantId}:{doctorId}"
        );

        return Ok(new { ok = true, affected });
    }
}
