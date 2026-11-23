using System.Security.Claims;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class BootstrapController : ControllerBase
{
    private readonly DbConnectionFactory _db;

    public BootstrapController(DbConnectionFactory db) => _db = db;

    public sealed record SaveRecipeTemplateRequest(
        string? ClinicName,
        string? ClinicSubtitle,
        string? Rif,
        string? Address,
        string? Phone,
        string? LogoPosition,
        string? FontFamily,
        string? BorderColor,
        string? Orientation,
        bool ShowQrCode,
        bool ShowDigitalSignature,
        bool ShowWetStamp,
        string? FooterNote,
        string? BackgroundTemplateDataUrl,
        bool? HideDefaultHeaderOnBg,
        int? ContentTopPaddingPx,
        int? ContentBottomPaddingPx,
        double? BackgroundOpacity
    );

    private static async Task EnsureTemplateSchemaAsync(System.Data.IDbConnection conn)
    {
        await conn.ExecuteAsync(
            """
            IF COL_LENGTH('dbo.TB_PLANTILLAS_RECETA', 'DoctorUserId') IS NULL
                ALTER TABLE dbo.TB_PLANTILLAS_RECETA ADD
                    DoctorUserId UNIQUEIDENTIFIER NULL,
                    ClinicName NVARCHAR(200) NULL,
                    Rif NVARCHAR(80) NULL,
                    Address NVARCHAR(300) NULL,
                    Phone NVARCHAR(80) NULL,
                    Orientation NVARCHAR(30) NULL,
                    BackgroundTemplateDataUrl NVARCHAR(MAX) NULL,
                    HideDefaultHeaderOnBg BIT NULL,
                    ContentTopPaddingPx INT NULL,
                    ContentBottomPaddingPx INT NULL,
                    BackgroundOpacity FLOAT NULL;
            """
        );
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureTemplateSchemaAsync(conn);

        Guid? currentUserId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;

        var tenant = await conn.QueryFirstOrDefaultAsync("SELECT TOP 1 * FROM dbo.TB_CONFIG_TENANT ORDER BY Id ASC");
        var template = currentUserId.HasValue
            ? await conn.QueryFirstOrDefaultAsync(
                "SELECT TOP 1 * FROM dbo.TB_PLANTILLAS_RECETA WHERE DoctorUserId = @DoctorUserId ORDER BY Id DESC",
                new { DoctorUserId = currentUserId.Value }
            )
            : null;
        template ??= await conn.QueryFirstOrDefaultAsync(
            "SELECT TOP 1 * FROM dbo.TB_PLANTILLAS_RECETA WHERE DoctorUserId IS NULL ORDER BY Id ASC"
        );
        var specialties = await conn.QueryAsync("SELECT * FROM dbo.TB_ESPECIALIDADES WHERE Activa = 1 ORDER BY Id ASC");
        var vaccines = await conn.QueryAsync("SELECT * FROM dbo.TB_VACUNAS_MAESTRO ORDER BY CommercialName ASC");
        var usage = await conn.QueryFirstOrDefaultAsync("SELECT TOP 1 * FROM dbo.TB_USO_SAAS ORDER BY PeriodoMes DESC");

        return Ok(new
        {
            tenant,
            template,
            specialties,
            masterVaccines = vaccines,
            usage = usage ?? new { AiMinutesUsed = 0, WhatsappMessagesSent = 0 }
        });
    }

    [HttpPut("recipe-template")]
    public async Task<IActionResult> SaveRecipeTemplate([FromBody] SaveRecipeTemplateRequest req, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await EnsureTemplateSchemaAsync(conn);

        var tenantId = await conn.ExecuteScalarAsync<int?>("SELECT TOP 1 Id FROM dbo.TB_CONFIG_TENANT ORDER BY Id ASC") ?? 1;
        Guid? currentUserId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;

        var existingId = currentUserId.HasValue
            ? await conn.ExecuteScalarAsync<int?>(
                "SELECT TOP 1 Id FROM dbo.TB_PLANTILLAS_RECETA WHERE DoctorUserId = @DoctorUserId ORDER BY Id DESC",
                new { DoctorUserId = currentUserId.Value }
            )
            : await conn.ExecuteScalarAsync<int?>(
                "SELECT TOP 1 Id FROM dbo.TB_PLANTILLAS_RECETA WHERE DoctorUserId IS NULL ORDER BY Id ASC"
            );

        if (existingId.HasValue)
        {
            var updated = await conn.QuerySingleAsync(
                """
                UPDATE dbo.TB_PLANTILLAS_RECETA
                SET ClinicName = @ClinicName,
                    ClinicSubtitle = @ClinicSubtitle,
                    Rif = @Rif,
                    Address = @Address,
                    Phone = @Phone,
                    LogoPosition = @LogoPosition,
                    FontFamily = @FontFamily,
                    BorderColor = @BorderColor,
                    Orientation = @Orientation,
                    ShowQrCode = @ShowQrCode,
                    ShowDigitalSignature = @ShowDigitalSignature,
                    ShowWetStamp = @ShowWetStamp,
                    FooterNote = @FooterNote,
                    BackgroundTemplateDataUrl = @BackgroundTemplateDataUrl,
                    HideDefaultHeaderOnBg = @HideDefaultHeaderOnBg,
                    ContentTopPaddingPx = @ContentTopPaddingPx,
                    ContentBottomPaddingPx = @ContentBottomPaddingPx,
                    BackgroundOpacity = @BackgroundOpacity,
                    UpdatedAt = GETDATE()
                OUTPUT INSERTED.*
                WHERE Id = @Id
                """,
                new
                {
                    Id = existingId.Value,
                    req.ClinicName,
                    ClinicSubtitle = req.ClinicSubtitle ?? "Pediatría",
                    req.Rif,
                    req.Address,
                    req.Phone,
                    LogoPosition = req.LogoPosition ?? "left",
                    FontFamily = req.FontFamily ?? "Plus Jakarta Sans",
                    BorderColor = req.BorderColor ?? "#0284C7",
                    Orientation = req.Orientation ?? "vertical",
                    req.ShowQrCode,
                    req.ShowDigitalSignature,
                    req.ShowWetStamp,
                    FooterNote = req.FooterNote ?? string.Empty,
                    req.BackgroundTemplateDataUrl,
                    req.HideDefaultHeaderOnBg,
                    req.ContentTopPaddingPx,
                    req.ContentBottomPaddingPx,
                    req.BackgroundOpacity
                }
            );
            return Ok(updated);
        }

        var inserted = await conn.QuerySingleAsync(
            """
            INSERT INTO dbo.TB_PLANTILLAS_RECETA (
                TenantId, DoctorUserId, ClinicName, ClinicSubtitle, Rif, Address, Phone,
                LogoPosition, FontFamily, BorderColor, Orientation,
                ShowQrCode, ShowDigitalSignature, ShowWetStamp, FooterNote,
                BackgroundTemplateDataUrl, HideDefaultHeaderOnBg, ContentTopPaddingPx,
                ContentBottomPaddingPx, BackgroundOpacity
            )
            OUTPUT INSERTED.*
            VALUES (
                @TenantId, @DoctorUserId, @ClinicName, @ClinicSubtitle, @Rif, @Address, @Phone,
                @LogoPosition, @FontFamily, @BorderColor, @Orientation,
                @ShowQrCode, @ShowDigitalSignature, @ShowWetStamp, @FooterNote,
                @BackgroundTemplateDataUrl, @HideDefaultHeaderOnBg, @ContentTopPaddingPx,
                @ContentBottomPaddingPx, @BackgroundOpacity
            )
            """,
            new
            {
                TenantId = tenantId,
                DoctorUserId = currentUserId,
                req.ClinicName,
                ClinicSubtitle = req.ClinicSubtitle ?? "Pediatría",
                req.Rif,
                req.Address,
                req.Phone,
                LogoPosition = req.LogoPosition ?? "left",
                FontFamily = req.FontFamily ?? "Plus Jakarta Sans",
                BorderColor = req.BorderColor ?? "#0284C7",
                Orientation = req.Orientation ?? "vertical",
                req.ShowQrCode,
                req.ShowDigitalSignature,
                req.ShowWetStamp,
                FooterNote = req.FooterNote ?? string.Empty,
                req.BackgroundTemplateDataUrl,
                req.HideDefaultHeaderOnBg,
                req.ContentTopPaddingPx,
                req.ContentBottomPaddingPx,
                req.BackgroundOpacity
            }
        );
        return Ok(inserted);
    }
}
