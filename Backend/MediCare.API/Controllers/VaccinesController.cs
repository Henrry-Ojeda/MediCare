using System.Security.Claims;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class VaccinesController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly AuditService _audit;

    public VaccinesController(DbConnectionFactory db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public sealed record CreateMasterVaccineRequest(
        string CommercialName,
        string GenericName,
        int DosesRequired,
        string RecommendedAges,
        string Route
    );

    public sealed record ApplyDoseRequest(
        DateTime AppliedDate,
        string BatchNumber,
        string Manufacturer,
        string? Observations
    );

    public sealed record AddPatientDoseRequest(
        Guid? VaccineId,
        string? VaccineName,
        string MilestoneLabel,
        int MilestoneMonths,
        string DoseNumber,
        string Status,
        DateTime? AppliedDate,
        string? BatchNumber,
        string? Manufacturer,
        string? Observations
    );

    [HttpGet("master")]
    public async Task<IActionResult> ListMaster(CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var rows = await conn.QueryAsync("SELECT * FROM dbo.TB_VACUNAS_MAESTRO ORDER BY CommercialName ASC");
        return Ok(rows);
    }

    [HttpPost("master")]
    [Authorize(Roles = "SUPERADMIN,ADMIN,MEDICO")]
    public async Task<IActionResult> CreateMaster([FromBody] CreateMasterVaccineRequest req, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var created = await conn.QuerySingleAsync(
            """
            INSERT INTO dbo.TB_VACUNAS_MAESTRO (CommercialName, GenericName, DosesRequired, RecommendedAges, Route)
            OUTPUT INSERTED.*
            VALUES (@CommercialName, @GenericName, @DosesRequired, @RecommendedAges, @Route)
            """,
            req
        );
        return StatusCode(201, created);
    }

    [HttpPatch("master/{id:guid}/toggle")]
    [Authorize(Roles = "SUPERADMIN,ADMIN,MEDICO")]
    public async Task<IActionResult> ToggleMaster(Guid id, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var updated = await conn.QueryFirstOrDefaultAsync(
            """
            UPDATE dbo.TB_VACUNAS_MAESTRO
            SET Active = CASE WHEN Active = 1 THEN 0 ELSE 1 END,
                UpdatedAt = GETDATE()
            OUTPUT INSERTED.*
            WHERE Id = @Id
            """,
            new { Id = id }
        );
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPatch("patients/{patientId:guid}/doses/{doseId:guid}")]
    [Authorize(Roles = "SUPERADMIN,ADMIN,MEDICO,ENFERMERIA")]
    public async Task<IActionResult> ApplyDose(Guid patientId, Guid doseId, [FromBody] ApplyDoseRequest req, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            Guid? userId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;

            var updated = await conn.QueryFirstOrDefaultAsync(
                """
                UPDATE dbo.TB_VACUNAS_PACIENTE
                SET Status = 'aplicada',
                    AppliedDate = @AppliedDate,
                    BatchNumber = @BatchNumber,
                    Manufacturer = @Manufacturer,
                    AppliedByUserId = @AppliedByUserId,
                    Observations = @Observations,
                    UpdatedAt = GETDATE()
                OUTPUT INSERTED.*
                WHERE Id = @DoseId AND PatientId = @PatientId
                """,
                new
                {
                    DoseId = doseId,
                    PatientId = patientId,
                    req.AppliedDate,
                    req.BatchNumber,
                    req.Manufacturer,
                    AppliedByUserId = userId,
                    req.Observations
                },
                transaction: tx
            );

            if (updated is null)
            {
                await tx.RollbackAsync(ct);
                return NotFound(new { message = "Dosis no encontrada." });
            }

            await _audit.RecordAsync(
                conn, tx, HttpContext, "Aplicación de Dosis",
                "TB_VACUNAS_PACIENTE", doseId.ToString(), patientId,
                newValue: new { req.BatchNumber, req.Manufacturer, req.AppliedDate }
            );

            await tx.CommitAsync(ct);
            return Ok(updated);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    [HttpPost("patients/{patientId:guid}/doses")]
    [Authorize(Roles = "SUPERADMIN,ADMIN,MEDICO,ENFERMERIA,ASISTENTE,RECEPCION")]
    public async Task<IActionResult> AddPatientDose(Guid patientId, [FromBody] AddPatientDoseRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.DoseNumber) || string.IsNullOrWhiteSpace(req.MilestoneLabel))
        {
            return BadRequest(new { message = "La dosis y el hito de edad son obligatorios." });
        }

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            var resolvedVaccineId = req.VaccineId;
            if (resolvedVaccineId is null || resolvedVaccineId == Guid.Empty)
            {
                var name = (req.VaccineName ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(name))
                {
                    await tx.RollbackAsync(ct);
                    return BadRequest(new { message = "Debe seleccionar o indicar el nombre de la vacuna." });
                }

                resolvedVaccineId = await conn.QueryFirstOrDefaultAsync<Guid?>(
                    "SELECT TOP 1 Id FROM dbo.TB_VACUNAS_MAESTRO WHERE LOWER(CommercialName) = LOWER(@Name)",
                    new { Name = name },
                    transaction: tx
                );

                if (resolvedVaccineId is null || resolvedVaccineId == Guid.Empty)
                {
                    resolvedVaccineId = await conn.QuerySingleAsync<Guid>(
                        """
                        INSERT INTO dbo.TB_VACUNAS_MAESTRO (CommercialName, GenericName, DosesRequired, RecommendedAges, Route)
                        OUTPUT INSERTED.Id
                        VALUES (@Name, @Name, 1, @MilestoneLabel, 'Intramuscular (IM)')
                        """,
                        new { Name = name, req.MilestoneLabel },
                        transaction: tx
                    );
                }
            }

            var normalizedStatus = req.Status == "aplicada" ? "aplicada" : "pendiente";
            Guid? userId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;

            var created = await conn.QuerySingleAsync(
                """
                INSERT INTO dbo.TB_VACUNAS_PACIENTE (
                    PatientId, VaccineId, MilestoneLabel, MilestoneMonths, DoseNumber,
                    Status, AppliedDate, BatchNumber, Manufacturer, AppliedByUserId, Observations
                )
                OUTPUT INSERTED.*
                VALUES (
                    @PatientId, @VaccineId, @MilestoneLabel, @MilestoneMonths, @DoseNumber,
                    @Status, @AppliedDate, @BatchNumber, @Manufacturer, @AppliedByUserId, @Observations
                )
                """,
                new
                {
                    PatientId = patientId,
                    VaccineId = resolvedVaccineId,
                    req.MilestoneLabel,
                    req.MilestoneMonths,
                    req.DoseNumber,
                    Status = normalizedStatus,
                    AppliedDate = normalizedStatus == "aplicada" ? (DateTime?)(req.AppliedDate ?? DateTime.UtcNow.Date) : null,
                    req.BatchNumber,
                    req.Manufacturer,
                    AppliedByUserId = normalizedStatus == "aplicada" ? userId : null,
                    req.Observations
                },
                transaction: tx
            );

            await _audit.RecordAsync(
                conn, tx, HttpContext, "Registro de Vacuna",
                "TB_VACUNAS_PACIENTE", ((object)created.Id).ToString() ?? string.Empty, patientId,
                newValue: new { req.VaccineName, req.DoseNumber, normalizedStatus }
            );

            await tx.CommitAsync(ct);
            return StatusCode(201, created);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }
}

