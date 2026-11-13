using System.Security.Claims;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class PaymentsController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly AuditService _audit;

    public PaymentsController(DbConnectionFactory db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public sealed record CreatePaymentRequest(
        Guid PatientId,
        Guid? ConsultationId,
        Guid DoctorUserId,
        int SpecialtyId,
        string Concept,
        string? Cie10Code,
        decimal AmountUsd,
        decimal BcvRate,
        decimal AmountVes,
        string Method,
        string Reference,
        string? InsuranceCompany
    );

    public sealed record UpdateBcvRequest(decimal BcvRate);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var rows = await conn.QueryAsync(
            """
            SELECT pg.*, p.FirstName + ' ' + p.LastName AS PatientName,
                   p.GuardianName, p.GuardianIdDocument,
                   u.NombreCompleto AS DoctorName, e.Nombre AS SpecialtyName
            FROM dbo.TB_PAGOS pg
            INNER JOIN dbo.TB_PACIENTES p ON p.Id = pg.PatientId
            INNER JOIN dbo.TB_USUARIOS u ON u.Id = pg.DoctorUserId
            INNER JOIN dbo.TB_ESPECIALIDADES e ON e.Id = pg.SpecialtyId
            ORDER BY pg.PaymentDateTime DESC
            """
        );
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePaymentRequest req, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var total = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.TB_PAGOS");
        var receiptNumber = $"REC-{DateTime.UtcNow.Year}-{(841 + total):D4}";
        Guid? userId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;

        var created = await conn.QuerySingleAsync(
            """
            INSERT INTO dbo.TB_PAGOS (
                ReceiptNumber, PatientId, ConsultationId, DoctorUserId, SpecialtyId,
                Concept, Cie10Code, AmountUsd, BcvRate, AmountVes, Method, Reference,
                InsuranceCompany, RecordedByUserId
            )
            OUTPUT INSERTED.*
            VALUES (
                @ReceiptNumber, @PatientId, @ConsultationId, @DoctorUserId, @SpecialtyId,
                @Concept, @Cie10Code, @AmountUsd, @BcvRate, @AmountVes, @Method, @Reference,
                @InsuranceCompany, @RecordedByUserId
            )
            """,
            new
            {
                ReceiptNumber = receiptNumber,
                req.PatientId,
                req.ConsultationId,
                req.DoctorUserId,
                req.SpecialtyId,
                req.Concept,
                req.Cie10Code,
                req.AmountUsd,
                req.BcvRate,
                req.AmountVes,
                req.Method,
                req.Reference,
                req.InsuranceCompany,
                RecordedByUserId = userId
            }
        );

        return StatusCode(201, created);
    }

    [HttpPatch("bcv-rate")]
    [Authorize(Roles = "SUPERADMIN,ADMIN,RECEPCION")]
    public async Task<IActionResult> UpdateBcvRate([FromBody] UpdateBcvRequest req, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            var current = await conn.QueryFirstOrDefaultAsync<dynamic>(
                "SELECT TOP 1 Id, BcvRate FROM dbo.TB_CONFIG_TENANT ORDER BY Id ASC",
                transaction: tx
            );

            if (current is not null)
            {
                await conn.ExecuteAsync(
                    "UPDATE dbo.TB_CONFIG_TENANT SET BcvRate = @BcvRate, UpdatedAt = GETDATE() WHERE Id = @Id",
                    new { Id = (int)current.Id, req.BcvRate },
                    transaction: tx
                );
            }

            Guid? userId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;

            await conn.ExecuteAsync(
                "INSERT INTO dbo.TB_HISTORIAL_BCV (Tasa, Origen, UpdatedByUserId) VALUES (@Tasa, 'Manual', @UpdatedByUserId)",
                new { Tasa = req.BcvRate, UpdatedByUserId = userId },
                transaction: tx
            );

            await _audit.RecordAsync(
                conn, tx, HttpContext, "Actualización de Tasa BCV",
                "TB_CONFIG_TENANT", current?.Id.ToString() ?? "1",
                previousValue: new { bcvRate = current?.BcvRate ?? 0m },
                newValue: new { bcvRate = req.BcvRate }
            );

            await tx.CommitAsync(ct);
            return Ok(new { ok = true, bcvRate = req.BcvRate });
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }
}

