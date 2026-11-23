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
        bool ShowQrCode,
        bool ShowDigitalSignature,
        bool ShowWetStamp,
        string? FooterNote
    );

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);

        var tenant = await conn.QueryFirstOrDefaultAsync("SELECT TOP 1 * FROM dbo.TB_CONFIG_TENANT ORDER BY Id ASC");
        var template = await conn.QueryFirstOrDefaultAsync("SELECT TOP 1 * FROM dbo.TB_PLANTILLAS_RECETA ORDER BY Id ASC");
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
        var tenantId = await conn.ExecuteScalarAsync<int?>("SELECT TOP 1 Id FROM dbo.TB_CONFIG_TENANT ORDER BY Id ASC") ?? 1;

        if (!string.IsNullOrWhiteSpace(req.ClinicName))
        {
            await conn.ExecuteAsync(
                """
                UPDATE dbo.TB_CONFIG_TENANT
                SET NombreComercial = @ClinicName,
                    Rif = COALESCE(@Rif, Rif),
                    Direccion = COALESCE(@Address, Direccion),
                    Telefono = COALESCE(@Phone, Telefono),
                    UpdatedAt = GETDATE()
                WHERE Id = @TenantId
                """,
                new
                {
                    TenantId = tenantId,
                    req.ClinicName,
                    req.Rif,
                    req.Address,
                    req.Phone
                }
            );
        }

        var existingId = await conn.ExecuteScalarAsync<int?>("SELECT TOP 1 Id FROM dbo.TB_PLANTILLAS_RECETA ORDER BY Id ASC");
        if (existingId.HasValue)
        {
            var updated = await conn.QuerySingleAsync(
                """
                UPDATE dbo.TB_PLANTILLAS_RECETA
                SET ClinicSubtitle = @ClinicSubtitle,
                    LogoPosition = @LogoPosition,
                    FontFamily = @FontFamily,
                    BorderColor = @BorderColor,
                    ShowQrCode = @ShowQrCode,
                    ShowDigitalSignature = @ShowDigitalSignature,
                    ShowWetStamp = @ShowWetStamp,
                    FooterNote = @FooterNote,
                    UpdatedAt = GETDATE()
                OUTPUT INSERTED.*
                WHERE Id = @Id
                """,
                new
                {
                    Id = existingId.Value,
                    ClinicSubtitle = req.ClinicSubtitle ?? "Pediatría",
                    LogoPosition = req.LogoPosition ?? "left",
                    FontFamily = req.FontFamily ?? "Plus Jakarta Sans",
                    BorderColor = req.BorderColor ?? "#0284C7",
                    req.ShowQrCode,
                    req.ShowDigitalSignature,
                    req.ShowWetStamp,
                    FooterNote = req.FooterNote ?? string.Empty
                }
            );
            return Ok(updated);
        }

        var inserted = await conn.QuerySingleAsync(
            """
            INSERT INTO dbo.TB_PLANTILLAS_RECETA (
                TenantId, ClinicSubtitle, LogoPosition, FontFamily, BorderColor,
                ShowQrCode, ShowDigitalSignature, ShowWetStamp, FooterNote
            )
            OUTPUT INSERTED.*
            VALUES (
                @TenantId, @ClinicSubtitle, @LogoPosition, @FontFamily, @BorderColor,
                @ShowQrCode, @ShowDigitalSignature, @ShowWetStamp, @FooterNote
            )
            """,
            new
            {
                TenantId = tenantId,
                ClinicSubtitle = req.ClinicSubtitle ?? "Pediatría",
                LogoPosition = req.LogoPosition ?? "left",
                FontFamily = req.FontFamily ?? "Plus Jakarta Sans",
                BorderColor = req.BorderColor ?? "#0284C7",
                req.ShowQrCode,
                req.ShowDigitalSignature,
                req.ShowWetStamp,
                FooterNote = req.FooterNote ?? string.Empty
            }
        );
        return Ok(inserted);
    }
}
