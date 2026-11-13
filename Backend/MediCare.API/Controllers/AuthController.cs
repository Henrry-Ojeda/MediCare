using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly IConfiguration _config;
    private readonly AuditService _audit;

    public AuthController(DbConnectionFactory db, IConfiguration config, AuditService audit)
    {
        _db = db;
        _config = config;
        _audit = audit;
    }

    public sealed record LoginRequest(string? Username, string? Email, string Password);

    public sealed record SetupClinicRequest(
        string? Username,
        string AdminName,
        string Email,
        string Password,
        string? NumeroColegiado,
        string? Telefono,
        string BusinessName,
        string Subdomain,
        string Rif,
        string ClinicPhone,
        string ClinicAddress
    );

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var identifier = (req.Username ?? req.Email ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Usuario/correo y contraseña requeridos." });

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var user = await conn.QueryFirstOrDefaultAsync<dynamic>(
            """
            SELECT u.Id, u.Username, u.NombreCompleto, u.Email, u.PasswordHash, u.Activo,
                   r.Codigo AS RoleCodigo, r.Nombre AS RoleNombre
            FROM dbo.TB_USUARIOS u
            INNER JOIN dbo.TB_ROLES r ON r.Id = u.RoleId
            WHERE LOWER(u.Username) = @Identifier OR LOWER(ISNULL(u.Email, '')) = @Identifier
            """,
            new { Identifier = identifier }
        );

        bool validPassword = false;
        if (user is not null && (bool)user.Activo)
        {
            string hash = (string)user.PasswordHash;
            try
            {
                validPassword = BCrypt.Net.BCrypt.Verify(req.Password, hash);
            }
            catch
            {
                validPassword = false;
            }
        }

        if (user is null || !(bool)user.Activo || !validPassword)
            return Unauthorized(new { message = "Credenciales inválidas o usuario inactivo." });

        await conn.ExecuteAsync(
            "UPDATE dbo.TB_USUARIOS SET UltimoAcceso = GETDATE() WHERE Id = @Id",
            new { Id = (Guid)user.Id }
        );

        string roleCode = (string)user.RoleCodigo;
        bool esSuperAdmin = roleCode.Equals("SUPERADMIN", StringComparison.OrdinalIgnoreCase);
        var token = GenerateJwt((Guid)user.Id, (string)user.NombreCompleto, (string?)user.Email ?? (string)user.Username, roleCode);

        await _audit.RecordAsync(
            conn, null, HttpContext, "Inicio de Sesión",
            "TB_USUARIOS", user.Id.ToString(),
            fallbackUserName: (string)user.NombreCompleto,
            fallbackUserRole: (string)user.RoleNombre
        );

        return Ok(new
        {
            token,
            esSuperAdmin,
            user = new
            {
                id = (Guid)user.Id,
                username = (string)user.Username,
                name = (string)user.NombreCompleto,
                email = (string?)user.Email ?? string.Empty,
                roleCode,
                roleName = (string)user.RoleNombre,
                esSuperAdmin,
            }
        });
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        return Ok(new
        {
            id = User.FindFirstValue(ClaimTypes.NameIdentifier),
            name = User.FindFirstValue(ClaimTypes.Name),
            email = User.FindFirstValue(ClaimTypes.Email),
            role = User.FindFirstValue(ClaimTypes.Role),
        });
    }

    /// <summary>
    /// Onboarding inicial: solo se permite cuando TB_USUARIOS está vacía.
    /// </summary>
    [HttpPost("setup-clinic")]
    [AllowAnonymous]
    public async Task<IActionResult> SetupClinic([FromBody] SetupClinicRequest req, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var existingUsers = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.TB_USUARIOS");
        if (existingUsers > 0)
            return Conflict(new { message = "La clínica ya fue inicializada. Inicia sesión con tu usuario administrador." });

        await using var tx = await conn.BeginTransactionAsync(ct);
        try
        {
            var adminRoleId = await conn.ExecuteScalarAsync<int>(
                "SELECT Id FROM dbo.TB_ROLES WHERE Codigo = 'ADMIN'",
                transaction: tx
            );

            var username = string.IsNullOrWhiteSpace(req.Username)
                ? req.Email.Trim().ToLowerInvariant()
                : req.Username.Trim().ToLowerInvariant();
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
            var userId = await conn.ExecuteScalarAsync<Guid>(
                """
                INSERT INTO dbo.TB_USUARIOS (RoleId, Username, NombreCompleto, Email, PasswordHash, NumeroColegiado, Telefono)
                OUTPUT INSERTED.Id
                VALUES (@RoleId, @Username, @NombreCompleto, @Email, @PasswordHash, @NumeroColegiado, @Telefono)
                """,
                new
                {
                    RoleId = adminRoleId,
                    Username = username,
                    NombreCompleto = req.AdminName,
                    Email = req.Email.Trim().ToLowerInvariant(),
                    PasswordHash = passwordHash,
                    req.NumeroColegiado,
                    req.Telefono
                },
                transaction: tx
            );

            await conn.ExecuteAsync(
                """
                INSERT INTO dbo.TB_CONFIG_TENANT (
                    BusinessName, Subdomain, Rif, Phone, Email, Address,
                    ScheduleWeekdays, ScheduleSaturdays, BillingCurrency, AutoSyncBcv, BcvRate
                )
                VALUES (
                    @BusinessName, @Subdomain, @Rif, @Phone, @Email, @Address,
                    'Lun-Vie 8:00 AM - 5:00 PM', 'Sáb 8:00 AM - 1:00 PM', 'USD', 1, 50.00
                )
                """,
                new
                {
                    req.BusinessName,
                    Subdomain = req.Subdomain.Trim().ToLowerInvariant(),
                    req.Rif,
                    Phone = req.ClinicPhone,
                    Email = req.Email.Trim().ToLowerInvariant(),
                    Address = req.ClinicAddress
                },
                transaction: tx
            );

            await _audit.RecordAsync(
                conn, tx, HttpContext, "Onboarding Inicial de Clínica",
                "TB_USUARIOS", userId.ToString(),
                fallbackUserName: req.AdminName,
                fallbackUserRole: "Administrador Tenant"
            );

            await tx.CommitAsync(ct);
            var token = GenerateJwt(userId, req.AdminName, req.Email.Trim().ToLowerInvariant(), "ADMIN");
            return StatusCode(201, new { token, userId, message = "Clínica inicializada correctamente." });
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    private string GenerateJwt(Guid userId, string fullName, string email, string roleCode)
    {
        var jwtKey = _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key no configurada.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddMinutes(int.TryParse(_config["Jwt:ExpireMinutes"], out var mins) ? mins : 480);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, fullName),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, roleCode),
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

