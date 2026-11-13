using System.Security.Claims;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class AppointmentsController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly AuditService _audit;

    public AppointmentsController(DbConnectionFactory db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public sealed record CreateAppointmentRequest(
        Guid PatientId,
        Guid DoctorUserId,
        int SpecialtyId,
        DateTime Date,
        string Time,
        int DurationMinutes,
        string Type,
        string Reason,
        string? Stage
    );

    public sealed record UpdateStageRequest(string Stage);

    public sealed record RescheduleAppointmentRequest(DateTime NewDate, string NewTime, string? Reason, Guid? DoctorUserId);

    public sealed record TriageRequest(
        decimal WeightKg,
        decimal HeightCm,
        decimal? HeadCircumferenceCm,
        decimal TemperatureC,
        int HeartRateBpm,
        int Spo2Percent,
        int SystolicBp,
        int DiastolicBp
    );

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] DateTime? date, [FromQuery] string? stage, [FromQuery] Guid? doctorUserId, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var rows = await conn.QueryAsync(
            """
            SELECT c.*, p.FirstName + ' ' + p.LastName AS PatientName,
                   p.GuardianName, p.GuardianWhatsapp,
                   u.NombreCompleto AS DoctorName, e.Nombre AS SpecialtyName
            FROM dbo.TB_CITAS c
            INNER JOIN dbo.TB_PACIENTES p ON p.Id = c.PatientId
            INNER JOIN dbo.TB_USUARIOS u ON u.Id = c.DoctorUserId
            INNER JOIN dbo.TB_ESPECIALIDADES e ON e.Id = c.SpecialtyId
            WHERE (@Date IS NULL OR c.AppointmentDate = @Date)
              AND (@Stage IS NULL OR c.Stage = @Stage)
              AND (@DoctorUserId IS NULL OR c.DoctorUserId = @DoctorUserId)
            ORDER BY c.AppointmentDate ASC, c.AppointmentTime ASC
            """,
            new { Date = date, Stage = stage, DoctorUserId = doctorUserId }
        );
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAppointmentRequest req, CancellationToken ct)
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        if (role.Equals("ADMIN", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new
            {
                message = "El rol ADMIN no puede crear ni agendar citas directamente. Debe ingresar con el usuario del médico o contar con autorización aprobada del doctor."
            });
        }

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var created = await conn.QuerySingleAsync(
            """
            INSERT INTO dbo.TB_CITAS (
                PatientId, DoctorUserId, SpecialtyId, AppointmentDate, AppointmentTime,
                DurationMinutes, AppointmentType, Reason, Stage
            )
            OUTPUT INSERTED.*
            VALUES (
                @PatientId, @DoctorUserId, @SpecialtyId, @Date, @Time,
                @DurationMinutes, @Type, @Reason, @Stage
            )
            """,
            new
            {
                req.PatientId,
                req.DoctorUserId,
                req.SpecialtyId,
                req.Date,
                req.Time,
                DurationMinutes = req.DurationMinutes > 0 ? req.DurationMinutes : 30,
                Type = string.IsNullOrWhiteSpace(req.Type) ? "control" : req.Type,
                req.Reason,
                Stage = string.IsNullOrWhiteSpace(req.Stage) ? "programado" : req.Stage
            }
        );
        return StatusCode(201, created);
    }

    [HttpPatch("{id:guid}/stage")]
    public async Task<IActionResult> UpdateStage(Guid id, [FromBody] UpdateStageRequest req, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var updated = await conn.QueryFirstOrDefaultAsync(
            """
            UPDATE dbo.TB_CITAS
            SET Stage = @Stage,
                ArrivedAt = CASE WHEN @Stage = 'en_sala' AND ArrivedAt IS NULL THEN GETDATE() ELSE ArrivedAt END,
                UpdatedAt = GETDATE()
            OUTPUT INSERTED.*
            WHERE Id = @Id
            """,
            new { Id = id, req.Stage }
        );

        return updated is null ? NotFound(new { message = "Cita no encontrada." }) : Ok(updated);
    }

    [HttpPatch("{id:guid}/reschedule")]
    public async Task<IActionResult> Reschedule(Guid id, [FromBody] RescheduleAppointmentRequest req, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        var updated = await conn.QueryFirstOrDefaultAsync(
            """
            UPDATE dbo.TB_CITAS
            SET AppointmentDate = @NewDate,
                AppointmentTime = @NewTime,
                DoctorUserId = COALESCE(@DoctorUserId, DoctorUserId),
                Reason = CASE WHEN @Reason IS NOT NULL AND LEN(@Reason) > 0 THEN @Reason ELSE Reason END,
                Stage = 'programado',
                UpdatedAt = GETDATE()
            OUTPUT INSERTED.*
            WHERE Id = @Id
            """,
            new { Id = id, req.NewDate, req.NewTime, req.Reason, req.DoctorUserId }
        );

        if (updated is null)
            return NotFound(new { message = "Cita no encontrada." });

        await _audit.RecordAsync(
            conn, null, HttpContext, "Reprogramación de Cita",
            "TB_CITAS", id.ToString(),
            newValue: new { req.NewDate, req.NewTime, req.Reason, req.DoctorUserId }
        );

        return Ok(updated);
    }

    [HttpPatch("{id:guid}/triage")]
    public async Task<IActionResult> SaveTriage(Guid id, [FromBody] TriageRequest req, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            var apt = await conn.QueryFirstOrDefaultAsync(
                "SELECT * FROM dbo.TB_CITAS WHERE Id = @Id",
                new { Id = id },
                transaction: tx
            );

            if (apt is null)
            {
                await tx.RollbackAsync(ct);
                return NotFound(new { message = "Cita no encontrada." });
            }

            Guid patientId = apt.PatientId;
            string prevStage = apt.Stage;
            Guid? userId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;

            var heightM = req.HeightCm / 100m;
            decimal? bmi = heightM > 0 ? Math.Round(req.WeightKg / (heightM * heightM), 2) : null;

            await conn.ExecuteAsync(
                """
                INSERT INTO dbo.TB_SIGNOS_VITALES (
                    PatientId, AppointmentId, RecordedByUserId, WeightKg, HeightCm,
                    HeadCircumferenceCm, TemperatureC, HeartRateBpm, Spo2Percent,
                    SystolicBp, DiastolicBp, Bmi
                )
                VALUES (
                    @PatientId, @AppointmentId, @RecordedByUserId, @WeightKg, @HeightCm,
                    @HeadCircumferenceCm, @TemperatureC, @HeartRateBpm, @Spo2Percent,
                    @SystolicBp, @DiastolicBp, @Bmi
                )
                """,
                new
                {
                    PatientId = patientId,
                    AppointmentId = id,
                    RecordedByUserId = userId,
                    req.WeightKg,
                    req.HeightCm,
                    req.HeadCircumferenceCm,
                    req.TemperatureC,
                    req.HeartRateBpm,
                    req.Spo2Percent,
                    req.SystolicBp,
                    req.DiastolicBp,
                    Bmi = bmi
                },
                transaction: tx
            );

            await conn.ExecuteAsync(
                "UPDATE dbo.TB_CITAS SET Stage = 'en_consulta', UpdatedAt = GETDATE() WHERE Id = @Id",
                new { Id = id },
                transaction: tx
            );

            await _audit.RecordAsync(
                conn, tx, HttpContext, "Registro de Triaje",
                "TB_CITAS", id.ToString(), patientId,
                previousValue: new { stage = prevStage },
                newValue: new { stage = "en_consulta", req.WeightKg, req.TemperatureC }
            );

            await tx.CommitAsync(ct);
            return Ok(new { ok = true, appointmentId = id, stage = "en_consulta" });
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }
}

