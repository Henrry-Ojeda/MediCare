using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class ReportsController : ControllerBase
{
    private readonly DbConnectionFactory _db;

    public ReportsController(DbConnectionFactory db) => _db = db;

    [HttpGet("epidemiology")]
    public async Task<IActionResult> Epidemiology(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var rows = await conn.QueryAsync(
            """
            SELECT c.Cie10Code, c.Cie10Name, e.Nombre AS SpecialtyName, COUNT(*) AS CasesCount
            FROM dbo.TB_CONSULTAS c
            INNER JOIN dbo.TB_ESPECIALIDADES e ON e.Id = c.SpecialtyId
            GROUP BY c.Cie10Code, c.Cie10Name, e.Nombre
            ORDER BY CasesCount DESC
            """
        );
        return Ok(rows);
    }

    [HttpGet("audit-logs")]
    [Authorize(Roles = "SUPERADMIN,ADMIN")]
    public async Task<IActionResult> AuditLogs(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var rows = await conn.QueryAsync("SELECT TOP 200 * FROM dbo.TB_AUDITORIA ORDER BY EventTimestamp DESC");
        return Ok(rows);
    }
}

