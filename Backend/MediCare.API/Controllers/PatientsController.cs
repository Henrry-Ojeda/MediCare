using System.Security.Claims;
using System.Text.Json;
using Dapper;
using MediCare.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MediCare.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class PatientsController : ControllerBase
{
    private readonly DbConnectionFactory _db;
    private readonly AuditService _audit;

    public PatientsController(DbConnectionFactory db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public sealed record CreatePatientRequest(
        string FirstName,
        string LastName,
        string Sex,
        DateTime BirthDate,
        string? IdDocument,
        string BloodType,
        int PrimarySpecialtyId,
        List<string>? CriticalAllergies,
        List<string>? ChronicConditions,
        string? PreviousHospitalizations,
        string GuardianName,
        string GuardianRelation,
        string GuardianIdDocument,
        string? GuardianOccupation,
        string GuardianWhatsapp,
        string? GuardianEmail,
        object? SpecialtyData
    );

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, CancellationToken ct)
    {
        var search = $"%{(q ?? string.Empty).Trim()}%";
        await using var conn = await _db.CreateOpenConnectionAsync(ct);

        var rows = await conn.QueryAsync(
            """
            SELECT p.Id, p.HistoryNumber, p.FirstName, p.LastName, p.Sex, p.BirthDate,
                   p.IdDocument, p.BloodType, p.PrimarySpecialtyId,
                   e.Nombre AS PrimarySpecialtyName,
                   p.GuardianName, p.GuardianRelation, p.GuardianWhatsapp, p.GuardianEmail,
                   p.CreatedAt
            FROM dbo.TB_PACIENTES p
            INNER JOIN dbo.TB_ESPECIALIDADES e ON e.Id = p.PrimarySpecialtyId
            WHERE p.Activo = 1
              AND (@Search = '%%'
                OR p.FirstName LIKE @Search
                OR p.LastName LIKE @Search
                OR p.HistoryNumber LIKE @Search
                OR p.GuardianName LIKE @Search)
            ORDER BY p.CreatedAt DESC
            """,
            new { Search = search }
        );

        return Ok(rows);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, [FromQuery] int? viewerSpecialtyId, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);

        var patient = await conn.QueryFirstOrDefaultAsync(
            """
            SELECT p.*, e.Nombre AS PrimarySpecialtyName, e.Codigo AS PrimarySpecialtyCode
            FROM dbo.TB_PACIENTES p
            INNER JOIN dbo.TB_ESPECIALIDADES e ON e.Id = p.PrimarySpecialtyId
            WHERE p.Id = @Id
            """,
            new { Id = id }
        );

        if (patient is null) return NotFound(new { message = "Paciente no encontrado." });

        var specialtyRecords = await conn.QueryAsync(
            """
            SELECT f.*, e.Codigo AS SpecialtyCode, e.Nombre AS SpecialtyName
            FROM dbo.TB_PACIENTE_FICHA_ESPECIALIDAD f
            INNER JOIN dbo.TB_ESPECIALIDADES e ON e.Id = f.SpecialtyId
            WHERE f.PatientId = @PatientId
            """,
            new { PatientId = id }
        );

        var vitalsHistory = await conn.QueryAsync(
            "SELECT TOP 50 * FROM dbo.TB_SIGNOS_VITALES WHERE PatientId = @PatientId ORDER BY RecordedAt DESC",
            new { PatientId = id }
        );

        Guid? currentUserId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;

        var rawConsultations = await conn.QueryAsync<dynamic>(
            """
            SELECT c.*, u.NombreCompleto AS DoctorName, e.Nombre AS SpecialtyName,
                   CASE
                     WHEN @ViewerSpecialtyId IS NULL
                       OR c.SpecialtyId = @ViewerSpecialtyId
                       OR c.DoctorUserId = @CurrentUserId
                       OR EXISTS (
                         SELECT 1 FROM dbo.TB_PERMISOS_DIAGNOSTICO perm
                         WHERE perm.PatientId = c.PatientId
                           AND perm.Activo = 1
                           AND (perm.ExpiresAt IS NULL OR perm.ExpiresAt > GETDATE())
                           AND perm.TargetSpecialtyId = @ViewerSpecialtyId
                           AND (perm.ConsultationId IS NULL OR perm.ConsultationId = c.Id)
                       )
                     THEN CAST(1 AS BIT)
                     ELSE CAST(0 AS BIT)
                   END AS HasDiagnosisAccess
            FROM dbo.TB_CONSULTAS c
            INNER JOIN dbo.TB_USUARIOS u ON u.Id = c.DoctorUserId
            INNER JOIN dbo.TB_ESPECIALIDADES e ON e.Id = c.SpecialtyId
            WHERE c.PatientId = @PatientId
            ORDER BY c.ConsultationDate DESC
            """,
            new { PatientId = id, ViewerSpecialtyId = viewerSpecialtyId, CurrentUserId = currentUserId }
        );

        var consultations = rawConsultations.Select(c =>
        {
            bool hasAccess = (bool)c.HasDiagnosisAccess;
            return new
            {
                c.Id,
                c.PatientId,
                c.AppointmentId,
                c.DoctorUserId,
                c.DoctorName,
                c.SpecialtyId,
                c.SpecialtyName,
                c.ConsultationDate,
                hasDiagnosisAccess = hasAccess,
                Reason = hasAccess ? (string)c.Reason : "Diagnóstico restringido: requiere permiso del médico remitente.",
                Cie10Code = hasAccess ? (string)c.Cie10Code : "RESTRINGIDO",
                Cie10Name = hasAccess ? (string)c.Cie10Name : "Diagnóstico protegido (sin permiso de especialidad)",
                PhysicalExamSummary = hasAccess ? (string)c.PhysicalExamSummary : null,
                SpecialtyExamJson = hasAccess ? (string?)c.SpecialtyExamJson : null,
                PatientGuide = hasAccess ? (string?)c.PatientGuide : null,
                AlarmSignsJson = hasAccess ? (string)c.AlarmSignsJson : "[]",
            };
        });

        var diagnosisPermissions = await conn.QueryAsync(
            """
            SELECT perm.*,
                   uFrom.NombreCompleto AS GrantedByName,
                   eFrom.Nombre AS GrantedBySpecialtyName,
                   eTo.Nombre AS TargetSpecialtyName
            FROM dbo.TB_PERMISOS_DIAGNOSTICO perm
            INNER JOIN dbo.TB_USUARIOS uFrom ON uFrom.Id = perm.GrantedByUserId
            INNER JOIN dbo.TB_ESPECIALIDADES eFrom ON eFrom.Id = perm.GrantedBySpecialtyId
            INNER JOIN dbo.TB_ESPECIALIDADES eTo ON eTo.Id = perm.TargetSpecialtyId
            WHERE perm.PatientId = @PatientId AND perm.Activo = 1
            ORDER BY perm.CreatedAt DESC
            """,
            new { PatientId = id }
        );

        var vaccines = await conn.QueryAsync(
            """
            SELECT vp.*, vm.CommercialName, vm.GenericName
            FROM dbo.TB_VACUNAS_PACIENTE vp
            INNER JOIN dbo.TB_VACUNAS_MAESTRO vm ON vm.Id = vp.VaccineId
            WHERE vp.PatientId = @PatientId
            ORDER BY vp.MilestoneMonths ASC
            """,
            new { PatientId = id }
        );

        // Los exámenes y estudios realizados NO requieren permiso de diagnóstico
        var studies = await conn.QueryAsync(
            "SELECT * FROM dbo.TB_ESTUDIOS_MEDICOS WHERE PatientId = @PatientId ORDER BY StudyDate DESC",
            new { PatientId = id }
        );

        return Ok(new
        {
            patient,
            specialtyRecords,
            vitalsHistory,
            consultations,
            diagnosisPermissions,
            vaccines,
            studies
        });
    }

    public sealed record GrantDiagnosisPermissionRequest(
        Guid? ConsultationId,
        int GrantedBySpecialtyId,
        int TargetSpecialtyId,
        Guid? TargetDoctorUserId,
        string? Reason,
        DateTime? ExpiresAt
    );

    [HttpPost("{id:guid}/diagnosis-permissions")]
    [Authorize(Roles = "SUPERADMIN,ADMIN,MEDICO")]
    public async Task<IActionResult> GrantDiagnosisPermission(
        Guid id,
        [FromBody] GrantDiagnosisPermissionRequest req,
        CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var grantedByUserId))
            return Unauthorized(new { message = "Usuario no identificado." });

        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            var created = await conn.QuerySingleAsync(
                """
                INSERT INTO dbo.TB_PERMISOS_DIAGNOSTICO (
                    PatientId, ConsultationId, GrantedByUserId, GrantedBySpecialtyId,
                    TargetSpecialtyId, TargetDoctorUserId, Reason, ExpiresAt
                )
                OUTPUT INSERTED.*
                VALUES (
                    @PatientId, @ConsultationId, @GrantedByUserId, @GrantedBySpecialtyId,
                    @TargetSpecialtyId, @TargetDoctorUserId, @Reason, @ExpiresAt
                )
                """,
                new
                {
                    PatientId = id,
                    req.ConsultationId,
                    GrantedByUserId = grantedByUserId,
                    req.GrantedBySpecialtyId,
                    req.TargetSpecialtyId,
                    req.TargetDoctorUserId,
                    req.Reason,
                    req.ExpiresAt
                },
                transaction: tx
            );

            await _audit.RecordAsync(
                conn, tx, HttpContext, "Permiso de Diagnóstico a Especialista",
                "TB_PERMISOS_DIAGNOSTICO", created.Id.ToString(), id,
                newValue: new { req.TargetSpecialtyId, req.ConsultationId, req.Reason }
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

    [HttpDelete("{id:guid}/diagnosis-permissions/{permissionId:guid}")]
    [Authorize(Roles = "SUPERADMIN,ADMIN,MEDICO")]
    public async Task<IActionResult> RevokeDiagnosisPermission(
        Guid id,
        Guid permissionId,
        CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            var rows = await conn.ExecuteAsync(
                "UPDATE dbo.TB_PERMISOS_DIAGNOSTICO SET Activo = 0 WHERE Id = @PermissionId AND PatientId = @PatientId",
                new { PermissionId = permissionId, PatientId = id },
                transaction: tx
            );

            if (rows == 0)
            {
                await tx.RollbackAsync(ct);
                return NotFound(new { message = "Permiso no encontrado." });
            }

            await _audit.RecordAsync(
                conn, tx, HttpContext, "Revocación de Permiso de Diagnóstico",
                "TB_PERMISOS_DIAGNOSTICO", permissionId.ToString(), id
            );

            await tx.CommitAsync(ct);
            return Ok(new { ok = true });
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePatientRequest req, CancellationToken ct)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            var total = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.TB_PACIENTES", transaction: tx);
            var historyNumber = $"HC-{DateTime.UtcNow.Year}-{(101 + total):D4}";

            var created = await conn.QuerySingleAsync(
                """
                INSERT INTO dbo.TB_PACIENTES (
                    HistoryNumber, FirstName, LastName, Sex, BirthDate, IdDocument, BloodType,
                    PrimarySpecialtyId, CriticalAllergiesJson, ChronicConditionsJson,
                    PreviousHospitalizations, GuardianName, GuardianRelation,
                    GuardianIdDocument, GuardianOccupation, GuardianWhatsapp, GuardianEmail
                )
                OUTPUT INSERTED.*
                VALUES (
                    @HistoryNumber, @FirstName, @LastName, @Sex, @BirthDate, @IdDocument, @BloodType,
                    @PrimarySpecialtyId, @CriticalAllergiesJson, @ChronicConditionsJson,
                    @PreviousHospitalizations, @GuardianName, @GuardianRelation,
                    @GuardianIdDocument, @GuardianOccupation, @GuardianWhatsapp, @GuardianEmail
                )
                """,
                new
                {
                    HistoryNumber = historyNumber,
                    req.FirstName,
                    req.LastName,
                    req.Sex,
                    req.BirthDate,
                    req.IdDocument,
                    req.BloodType,
                    req.PrimarySpecialtyId,
                    CriticalAllergiesJson = JsonSerializer.Serialize(req.CriticalAllergies ?? []),
                    ChronicConditionsJson = JsonSerializer.Serialize(req.ChronicConditions ?? []),
                    req.PreviousHospitalizations,
                    req.GuardianName,
                    req.GuardianRelation,
                    req.GuardianIdDocument,
                    req.GuardianOccupation,
                    req.GuardianWhatsapp,
                    req.GuardianEmail
                },
                transaction: tx
            );

            Guid patientId = created.Id;

            if (req.SpecialtyData is not null)
            {
                await conn.ExecuteAsync(
                    """
                    INSERT INTO dbo.TB_PACIENTE_FICHA_ESPECIALIDAD (PatientId, SpecialtyId, DatosJson)
                    VALUES (@PatientId, @SpecialtyId, @DatosJson)
                    """,
                    new
                    {
                        PatientId = patientId,
                        SpecialtyId = req.PrimarySpecialtyId,
                        DatosJson = JsonSerializer.Serialize(req.SpecialtyData)
                    },
                    transaction: tx
                );
            }

            await _audit.RecordAsync(
                conn, tx, HttpContext, "Creación de Expediente",
                "TB_PACIENTES", patientId.ToString(), patientId,
                newValue: new { historyNumber }
            );

            await tx.CommitAsync(ct);
            return CreatedAtAction(nameof(GetById), new { id = patientId }, created);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }
}

