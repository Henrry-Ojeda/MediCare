using System.Security.Claims;
using System.Text.Json;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SUPERADMIN,ADMIN,MEDICO")]
public sealed class ConsultationsController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly AuditService _audit;

    public ConsultationsController(DbConnectionFactory db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public sealed record PrescriptionInput(
        string MedicationName,
        string Presentation,
        string DosePerTake,
        string FrequencyHours,
        string DurationDays,
        string? SpecialInstructions,
        string? CalculatedMgPerKg
    );

    public sealed record VitalsInput(
        decimal WeightKg,
        decimal HeightCm,
        decimal? HeadCircumferenceCm,
        decimal TemperatureC,
        int HeartRateBpm,
        int Spo2Percent,
        int SystolicBp,
        int DiastolicBp
    );

    public sealed record CreateConsultationRequest(
        Guid PatientId,
        Guid? AppointmentId,
        int SpecialtyId,
        string Reason,
        string Cie10Code,
        string Cie10Name,
        string PhysicalExamSummary,
        object? SpecialtyExam,
        string? PatientGuide,
        List<string>? AlarmSigns,
        List<PrescriptionInput>? Prescriptions,
        VitalsInput? Vitals,
        bool UsedAiCopilot
    );

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateConsultationRequest req, CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var doctorUserId))
            return Unauthorized(new { message = "Usuario médico no identificado en el token." });

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            var created = await conn.QuerySingleAsync(
                """
                INSERT INTO dbo.TB_CONSULTAS (
                    PatientId, AppointmentId, DoctorUserId, SpecialtyId, Reason,
                    Cie10Code, Cie10Name, PhysicalExamSummary, SpecialtyExamJson,
                    PatientGuide, AlarmSignsJson, UsedAiCopilot
                )
                OUTPUT INSERTED.*
                VALUES (
                    @PatientId, @AppointmentId, @DoctorUserId, @SpecialtyId, @Reason,
                    @Cie10Code, @Cie10Name, @PhysicalExamSummary, @SpecialtyExamJson,
                    @PatientGuide, @AlarmSignsJson, @UsedAiCopilot
                )
                """,
                new
                {
                    req.PatientId,
                    req.AppointmentId,
                    DoctorUserId = doctorUserId,
                    req.SpecialtyId,
                    req.Reason,
                    req.Cie10Code,
                    req.Cie10Name,
                    req.PhysicalExamSummary,
                    SpecialtyExamJson = req.SpecialtyExam is null ? null : JsonSerializer.Serialize(req.SpecialtyExam),
                    req.PatientGuide,
                    AlarmSignsJson = JsonSerializer.Serialize(req.AlarmSigns ?? []),
                    req.UsedAiCopilot
                },
                transaction: tx
            );

            Guid consultationId = created.Id;

            if (req.Prescriptions is not null)
            {
                foreach (var item in req.Prescriptions)
                {
                    await conn.ExecuteAsync(
                        """
                        INSERT INTO dbo.TB_RECETAS_CONSULTA (
                            ConsultationId, MedicationName, Presentation, DosePerTake,
                            FrequencyHours, DurationDays, SpecialInstructions, CalculatedMgPerKg
                        )
                        VALUES (
                            @ConsultationId, @MedicationName, @Presentation, @DosePerTake,
                            @FrequencyHours, @DurationDays, @SpecialInstructions, @CalculatedMgPerKg
                        )
                        """,
                        new
                        {
                            ConsultationId = consultationId,
                            item.MedicationName,
                            item.Presentation,
                            item.DosePerTake,
                            item.FrequencyHours,
                            item.DurationDays,
                            item.SpecialInstructions,
                            item.CalculatedMgPerKg
                        },
                        transaction: tx
                    );
                }
            }

            if (req.Vitals is not null)
            {
                var heightM = req.Vitals.HeightCm / 100m;
                decimal? bmi = heightM > 0 ? Math.Round(req.Vitals.WeightKg / (heightM * heightM), 2) : null;

                await conn.ExecuteAsync(
                    """
                    INSERT INTO dbo.TB_SIGNOS_VITALES (
                        PatientId, ConsultationId, RecordedByUserId, WeightKg, HeightCm,
                        HeadCircumferenceCm, TemperatureC, HeartRateBpm, Spo2Percent,
                        SystolicBp, DiastolicBp, Bmi
                    )
                    VALUES (
                        @PatientId, @ConsultationId, @RecordedByUserId, @WeightKg, @HeightCm,
                        @HeadCircumferenceCm, @TemperatureC, @HeartRateBpm, @Spo2Percent,
                        @SystolicBp, @DiastolicBp, @Bmi
                    )
                    """,
                    new
                    {
                        req.PatientId,
                        ConsultationId = consultationId,
                        RecordedByUserId = doctorUserId,
                        req.Vitals.WeightKg,
                        req.Vitals.HeightCm,
                        req.Vitals.HeadCircumferenceCm,
                        req.Vitals.TemperatureC,
                        req.Vitals.HeartRateBpm,
                        req.Vitals.Spo2Percent,
                        req.Vitals.SystolicBp,
                        req.Vitals.DiastolicBp,
                        Bmi = bmi
                    },
                    transaction: tx
                );
            }

            if (req.AppointmentId.HasValue)
            {
                await conn.ExecuteAsync(
                    "UPDATE dbo.TB_CITAS SET Stage = 'completado', UpdatedAt = GETDATE() WHERE Id = @Id",
                    new { Id = req.AppointmentId.Value },
                    transaction: tx
                );
            }

            await _audit.RecordAsync(
                conn, tx, HttpContext, "Creación de Consulta",
                "TB_CONSULTAS", consultationId.ToString(), req.PatientId,
                newValue: new { req.Cie10Code, req.Cie10Name, prescriptionsCount = req.Prescriptions?.Count ?? 0 }
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

