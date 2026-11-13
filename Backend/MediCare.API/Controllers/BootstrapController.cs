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
}

