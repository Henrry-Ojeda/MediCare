using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class HealthController : ControllerBase
{
    private readonly DbConnectionFactory _db;

    public HealthController(DbConnectionFactory db) => _db = db;

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        try
        {
            await using var conn = await _db.CreateOpenConnectionAsync(ct);
            var dbName = await conn.ExecuteScalarAsync<string>("SELECT DB_NAME()");
            return Ok(new { service = "MediCare.API", db = new { connected = true, database = dbName } });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { service = "MediCare.API", db = new { connected = false, error = ex.Message } });
        }
    }
}

