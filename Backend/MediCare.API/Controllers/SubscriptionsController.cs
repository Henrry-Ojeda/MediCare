using System.Security.Claims;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class SubscriptionsController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly AuditService _audit;

    public SubscriptionsController(DbConnectionFactory db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public sealed record AssignSubscriptionRequest(
        string OwnerType,
        Guid OwnerId,
        int PlanId,
        int DurationDays = 30,
        string Status = "ACTIVE",
        bool? DictationOverride = null
    );

    [HttpGet("plans")]
    public async Task<IActionResult> ListPlans(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var plans = await conn.QueryAsync(
            "SELECT Id, Code, Name, PlanType, MaxDoctors, MaxAssistants, AllowDictationAi, AllowFinanceBcv, AllowedSpecialtiesJson, PriceUsdMonthly FROM dbo.TB_PLANES WHERE Activo = 1 ORDER BY PriceUsdMonthly ASC"
        );
        return Ok(plans);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMySubscription(CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var user = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT ClinicId, ISNULL(HasPersonalPlan, 0) AS HasPersonalPlan, ISNULL(DictationEnabled, 0) AS DictationEnabled FROM dbo.TB_USUARIOS WHERE Id = @Id",
            new { Id = userId }
        );

        Guid? clinicId = user?.ClinicId as Guid?;
        var sub = await conn.QueryFirstOrDefaultAsync<dynamic>(
            """
            SELECT TOP 1 s.Id, s.OwnerType, s.OwnerId, s.Status, s.StartsAt, s.ExpiresAt, s.DictationOverride,
                   p.Code AS PlanCode, p.Name AS PlanName, p.PlanType, p.MaxDoctors, p.MaxAssistants,
                   p.AllowDictationAi, p.AllowFinanceBcv, p.AllowedSpecialtiesJson, p.PriceUsdMonthly
            FROM dbo.TB_SUSCRIPCIONES s
            INNER JOIN dbo.TB_PLANES p ON p.Id = s.PlanId
            WHERE (s.OwnerType = 'USER' AND s.OwnerId = @UserId)
               OR (@ClinicId IS NOT NULL AND s.OwnerType = 'CLINIC' AND s.OwnerId = @ClinicId)
            ORDER BY CASE WHEN s.OwnerType = 'USER' THEN 0 ELSE 1 END, s.CreatedAt DESC
            """,
            new { UserId = userId, ClinicId = clinicId }
        );

        if (sub is null)
        {
            return Ok(new
            {
                hasSubscription = false,
                status = "TRIAL",
                planCode = clinicId.HasValue ? "CLINIC_STD" : "PERSONAL_BASIC",
                planName = clinicId.HasValue ? "Clínica Estándar (Base)" : "Médico Personal Básico",
                allowDictationAi = (bool)(user?.DictationEnabled ?? false),
                allowFinanceBcv = clinicId.HasValue,
                maxDoctors = clinicId.HasValue ? 5 : 1,
                maxAssistants = clinicId.HasValue ? 3 : 0,
            });
        }

        return Ok(new
        {
            hasSubscription = true,
            id = ((Guid)sub.Id).ToString(),
            ownerType = (string)sub.OwnerType,
            ownerId = ((Guid)sub.OwnerId).ToString(),
            status = (string)sub.Status,
            startsAt = ((DateTime)sub.StartsAt).ToString("yyyy-MM-dd"),
            expiresAt = ((DateTime)sub.ExpiresAt).ToString("yyyy-MM-dd"),
            planCode = (string)sub.PlanCode,
            planName = (string)sub.PlanName,
            planType = (string)sub.PlanType,
            maxDoctors = (int)sub.MaxDoctors,
            maxAssistants = (int)sub.MaxAssistants,
            allowDictationAi = (bool?)sub.DictationOverride ?? (bool)sub.AllowDictationAi,
            allowFinanceBcv = (bool)sub.AllowFinanceBcv,
            allowedSpecialtiesJson = (string)sub.AllowedSpecialtiesJson,
        });
    }

    [HttpGet]
    [Authorize(Roles = "SUPERADMIN")]
    public async Task<IActionResult> ListAll(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var rows = await conn.QueryAsync(
            """
            SELECT s.Id, s.OwnerType, s.OwnerId, s.Status, s.StartsAt, s.ExpiresAt, s.DictationOverride,
                   p.Code AS PlanCode, p.Name AS PlanName, p.PlanType, p.PriceUsdMonthly
            FROM dbo.TB_SUSCRIPCIONES s
            INNER JOIN dbo.TB_PLANES p ON p.Id = s.PlanId
            ORDER BY s.CreatedAt DESC
            """
        );
        return Ok(rows);
    }

    [HttpPost("assign")]
    [Authorize(Roles = "SUPERADMIN")]
    public async Task<IActionResult> Assign([FromBody] AssignSubscriptionRequest req, CancellationToken ct)
    {
        var ownerType = string.Equals(req.OwnerType, "CLINIC", StringComparison.OrdinalIgnoreCase)
            ? "CLINIC"
            : "USER";

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var newId = Guid.NewGuid();
        var expiresAt = DateTime.UtcNow.AddDays(Math.Max(1, req.DurationDays));

        await conn.ExecuteAsync(
            """
            INSERT INTO dbo.TB_SUSCRIPCIONES
                (Id, OwnerType, OwnerId, PlanId, Status, StartsAt, ExpiresAt, DictationOverride)
            VALUES
                (@Id, @OwnerType, @OwnerId, @PlanId, @Status, GETUTCDATE(), @ExpiresAt, @DictationOverride);

            IF @OwnerType = 'USER'
                UPDATE dbo.TB_USUARIOS SET HasPersonalPlan = 1 WHERE Id = @OwnerId;
            """,
            new
            {
                Id = newId,
                OwnerType = ownerType,
                req.OwnerId,
                req.PlanId,
                Status = string.IsNullOrWhiteSpace(req.Status) ? "ACTIVE" : req.Status.Trim().ToUpperInvariant(),
                ExpiresAt = expiresAt,
                req.DictationOverride
            }
        );

        await _audit.RecordAsync(
            conn, null, HttpContext, "Asignación de Suscripción SaaS",
            "TB_SUSCRIPCIONES", newId.ToString()
        );

        return StatusCode(201, new { id = newId.ToString(), expiresAt });
    }

    [HttpPost("upgrade-personal")]
    [Authorize(Roles = "MEDICO,PEDIATRA")]
    public async Task<IActionResult> UpgradeToPersonalPlan(CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await conn.ExecuteAsync(
            "UPDATE dbo.TB_USUARIOS SET HasPersonalPlan = 1, UpdatedAt = GETDATE() WHERE Id = @Id",
            new { Id = userId }
        );

        var basicPlanId = await conn.QueryFirstOrDefaultAsync<int?>(
            "SELECT TOP 1 Id FROM dbo.TB_PLANES WHERE Code = 'PERSONAL_BASIC'"
        ) ?? 1;

        var existing = await conn.QueryFirstOrDefaultAsync<Guid?>(
            "SELECT TOP 1 Id FROM dbo.TB_SUSCRIPCIONES WHERE OwnerType = 'USER' AND OwnerId = @Id AND Status IN ('ACTIVE','TRIAL')",
            new { Id = userId }
        );
        if (!existing.HasValue)
        {
            await conn.ExecuteAsync(
                """
                INSERT INTO dbo.TB_SUSCRIPCIONES (Id, OwnerType, OwnerId, PlanId, Status, StartsAt, ExpiresAt)
                VALUES (NEWID(), 'USER', @UserId, @PlanId, 'TRIAL', GETUTCDATE(), DATEADD(DAY, 14, GETUTCDATE()))
                """,
                new { UserId = userId, PlanId = basicPlanId }
            );
        }

        await _audit.RecordAsync(
            conn, null, HttpContext, "Activación de Plan Personal",
            "TB_USUARIOS", userId.ToString()
        );

        return Ok(new { ok = true, hasPersonalPlan = true });
    }
}
