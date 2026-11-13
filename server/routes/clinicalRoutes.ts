import { Router, type Request, type Response, type NextFunction } from "express";
import { getDbPool, sql } from "../db.ts";
import { recordAudit } from "../utils/audit.ts";

const router = Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * 1. Bootstrap inicial del tenant, plantilla, especialidades y catálogo de vacunas
 */
router.get(
  "/bootstrap",
  asyncHandler(async (_req, res) => {
    const pool = await getDbPool();
    const [tenantRes, templateRes, specialtiesRes, vaccinesRes, usageRes] = await Promise.all([
      pool.request().query("SELECT TOP 1 * FROM dbo.TB_CONFIG_TENANT ORDER BY Id ASC"),
      pool.request().query("SELECT TOP 1 * FROM dbo.TB_PLANTILLAS_RECETA ORDER BY Id ASC"),
      pool.request().query("SELECT * FROM dbo.TB_ESPECIALIDADES WHERE Activa = 1 ORDER BY Id ASC"),
      pool.request().query("SELECT * FROM dbo.TB_VACUNAS_MAESTRO ORDER BY CommercialName ASC"),
      pool.request().query("SELECT TOP 1 * FROM dbo.TB_USO_SAAS ORDER BY PeriodoMes DESC"),
    ]);

    res.json({
      tenant: tenantRes.recordset[0] || null,
      template: templateRes.recordset[0] || null,
      specialties: specialtiesRes.recordset,
      masterVaccines: vaccinesRes.recordset,
      usage: usageRes.recordset[0] || { AiMinutesUsed: 0, WhatsappMessagesSent: 0 },
    });
  })
);

/**
 * 2. Pacientes: listado ligero, ficha 360° y creación transaccional
 */
router.get(
  "/patients",
  asyncHandler(async (req, res) => {
    const search = String(req.query.q || "").trim();
    const pool = await getDbPool();
    const request = pool.request().input("Search", sql.NVarChar(150), `%${search}%`);

    const result = await request.query(`
      SELECT
        p.Id, p.HistoryNumber, p.FirstName, p.LastName, p.Sex, p.BirthDate,
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
    `);

    res.json(result.recordset);
  })
);

router.get(
  "/patients/:id",
  asyncHandler(async (req, res) => {
    const pool = await getDbPool();
    const patientId = req.params.id;

    const [patRes, fichasRes, vitalsRes, consultsRes, vaccinesRes, studiesRes] =
      await Promise.all([
        pool
          .request()
          .input("Id", sql.UniqueIdentifier, patientId)
          .query(`
            SELECT p.*, e.Nombre AS PrimarySpecialtyName, e.Codigo AS PrimarySpecialtyCode
            FROM dbo.TB_PACIENTES p
            INNER JOIN dbo.TB_ESPECIALIDADES e ON e.Id = p.PrimarySpecialtyId
            WHERE p.Id = @Id
          `),
        pool
          .request()
          .input("PatientId", sql.UniqueIdentifier, patientId)
          .query(`
            SELECT f.*, e.Codigo AS SpecialtyCode, e.Nombre AS SpecialtyName
            FROM dbo.TB_PACIENTE_FICHA_ESPECIALIDAD f
            INNER JOIN dbo.TB_ESPECIALIDADES e ON e.Id = f.SpecialtyId
            WHERE f.PatientId = @PatientId
          `),
        pool
          .request()
          .input("PatientId", sql.UniqueIdentifier, patientId)
          .query(`
            SELECT TOP 50 *
            FROM dbo.TB_SIGNOS_VITALES
            WHERE PatientId = @PatientId
            ORDER BY RecordedAt DESC
          `),
        pool
          .request()
          .input("PatientId", sql.UniqueIdentifier, patientId)
          .query(`
            SELECT c.*, u.NombreCompleto AS DoctorName, e.Nombre AS SpecialtyName
            FROM dbo.TB_CONSULTAS c
            INNER JOIN dbo.TB_USUARIOS u ON u.Id = c.DoctorUserId
            INNER JOIN dbo.TB_ESPECIALIDADES e ON e.Id = c.SpecialtyId
            WHERE c.PatientId = @PatientId
            ORDER BY c.ConsultationDate DESC
          `),
        pool
          .request()
          .input("PatientId", sql.UniqueIdentifier, patientId)
          .query(`
            SELECT vp.*, vm.CommercialName, vm.GenericName
            FROM dbo.TB_VACUNAS_PACIENTE vp
            INNER JOIN dbo.TB_VACUNAS_MAESTRO vm ON vm.Id = vp.VaccineId
            WHERE vp.PatientId = @PatientId
            ORDER BY vp.MilestoneMonths ASC
          `),
        pool
          .request()
          .input("PatientId", sql.UniqueIdentifier, patientId)
          .query(`
            SELECT *
            FROM dbo.TB_ESTUDIOS_MEDICOS
            WHERE PatientId = @PatientId
            ORDER BY StudyDate DESC
          `),
      ]);

    const patient = patRes.recordset[0];
    if (!patient) {
      return res.status(404).json({ error: "Paciente no encontrado." });
    }

    res.json({
      ...patient,
      specialtyRecords: fichasRes.recordset,
      vitalsHistory: vitalsRes.recordset,
      consultations: consultsRes.recordset,
      vaccines: vaccinesRes.recordset,
      studies: studiesRes.recordset,
    });
  })
);

router.post(
  "/patients",
  asyncHandler(async (req, res) => {
    const body = req.body;
    const pool = await getDbPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const countRes = await new sql.Request(tx).query(
        "SELECT COUNT(*) AS Total FROM dbo.TB_PACIENTES"
      );
      const nextNum = 101 + Number(countRes.recordset[0]?.Total || 0);
      const historyNumber = `HC-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`;

      const insertPat = await new sql.Request(tx)
        .input("HistoryNumber", sql.NVarChar(30), historyNumber)
        .input("FirstName", sql.NVarChar(100), body.firstName)
        .input("LastName", sql.NVarChar(100), body.lastName)
        .input("Sex", sql.Char(1), body.sex)
        .input("BirthDate", sql.Date, body.birthDate)
        .input("IdDocument", sql.NVarChar(40), body.idDocument || null)
        .input("BloodType", sql.NVarChar(5), body.bloodType || "O+")
        .input("PrimarySpecialtyId", sql.Int, Number(body.primarySpecialtyId || 1))
        .input(
          "CriticalAllergiesJson",
          sql.NVarChar(sql.MAX),
          JSON.stringify(body.criticalAllergies || [])
        )
        .input(
          "ChronicConditionsJson",
          sql.NVarChar(sql.MAX),
          JSON.stringify(body.chronicConditions || [])
        )
        .input(
          "PreviousHospitalizations",
          sql.NVarChar(500),
          body.previousHospitalizations || null
        )
        .input("GuardianName", sql.NVarChar(150), body.guardianName)
        .input("GuardianRelation", sql.NVarChar(60), body.guardianRelation)
        .input("GuardianIdDocument", sql.NVarChar(40), body.guardianIdDocument)
        .input("GuardianOccupation", sql.NVarChar(100), body.guardianOccupation || null)
        .input("GuardianWhatsapp", sql.NVarChar(40), body.guardianWhatsapp)
        .input("GuardianEmail", sql.NVarChar(120), body.guardianEmail || null)
        .query(`
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
        `);

      const createdPatient = insertPat.recordset[0];

      if (body.specialtyData) {
        await new sql.Request(tx)
          .input("PatientId", sql.UniqueIdentifier, createdPatient.Id)
          .input("SpecialtyId", sql.Int, Number(body.primarySpecialtyId || 1))
          .input("DatosJson", sql.NVarChar(sql.MAX), JSON.stringify(body.specialtyData))
          .query(`
            INSERT INTO dbo.TB_PACIENTE_FICHA_ESPECIALIDAD (PatientId, SpecialtyId, DatosJson)
            VALUES (@PatientId, @SpecialtyId, @DatosJson)
          `);
      }

      await recordAudit(tx, req, {
        userName: body.recordedByName || "Sistema",
        userRole: body.recordedByRole || "Médico Especialista",
        actionType: "Creación de Expediente",
        entityName: "TB_PACIENTES",
        entityId: createdPatient.Id,
        patientId: createdPatient.Id,
        newValue: { historyNumber },
      });

      await tx.commit();
      res.status(201).json(createdPatient);
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  })
);

/**
 * 3. Agenda, Sala de Espera y Triaje
 */
router.get(
  "/appointments",
  asyncHandler(async (req, res) => {
    const pool = await getDbPool();
    const dateFilter = req.query.date ? String(req.query.date) : null;
    const stageFilter = req.query.stage ? String(req.query.stage) : null;

    const result = await pool
      .request()
      .input("Date", sql.Date, dateFilter)
      .input("Stage", sql.NVarChar(30), stageFilter)
      .query(`
        SELECT
          c.*,
          p.FirstName + ' ' + p.LastName AS PatientName,
          p.GuardianName,
          p.GuardianWhatsapp,
          u.NombreCompleto AS DoctorName,
          e.Nombre AS SpecialtyName
        FROM dbo.TB_CITAS c
        INNER JOIN dbo.TB_PACIENTES p ON p.Id = c.PatientId
        INNER JOIN dbo.TB_USUARIOS u ON u.Id = c.DoctorUserId
        INNER JOIN dbo.TB_ESPECIALIDADES e ON e.Id = c.SpecialtyId
        WHERE (@Date IS NULL OR c.AppointmentDate = @Date)
          AND (@Stage IS NULL OR c.Stage = @Stage)
        ORDER BY c.AppointmentDate ASC, c.AppointmentTime ASC
      `);

    res.json(result.recordset);
  })
);

router.post(
  "/appointments",
  asyncHandler(async (req, res) => {
    const b = req.body;
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("PatientId", sql.UniqueIdentifier, b.patientId)
      .input("DoctorUserId", sql.UniqueIdentifier, b.doctorUserId)
      .input("SpecialtyId", sql.Int, Number(b.specialtyId))
      .input("AppointmentDate", sql.Date, b.date)
      .input("AppointmentTime", sql.NVarChar(20), b.time)
      .input("DurationMinutes", sql.Int, Number(b.durationMinutes || 30))
      .input("AppointmentType", sql.NVarChar(30), b.type || "control")
      .input("Reason", sql.NVarChar(400), b.reason)
      .input("Stage", sql.NVarChar(30), b.stage || "programado")
      .query(`
        INSERT INTO dbo.TB_CITAS (
          PatientId, DoctorUserId, SpecialtyId, AppointmentDate, AppointmentTime,
          DurationMinutes, AppointmentType, Reason, Stage
        )
        OUTPUT INSERTED.*
        VALUES (
          @PatientId, @DoctorUserId, @SpecialtyId, @AppointmentDate, @AppointmentTime,
          @DurationMinutes, @AppointmentType, @Reason, @Stage
        )
      `);

    res.status(201).json(result.recordset[0]);
  })
);

router.patch(
  "/appointments/:id/stage",
  asyncHandler(async (req, res) => {
    const { stage } = req.body;
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.UniqueIdentifier, req.params.id)
      .input("Stage", sql.NVarChar(30), stage)
      .query(`
        UPDATE dbo.TB_CITAS
        SET Stage = @Stage,
            ArrivedAt = CASE WHEN @Stage = 'en_sala' AND ArrivedAt IS NULL THEN GETDATE() ELSE ArrivedAt END,
            UpdatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE Id = @Id
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({ error: "Cita no encontrada." });
    }
    res.json(result.recordset[0]);
  })
);

router.patch(
  "/appointments/:id/triage",
  asyncHandler(async (req, res) => {
    const appointmentId = req.params.id;
    const { vitals, recordedByUserId, recordedByName } = req.body;
    const pool = await getDbPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const aptRes = await new sql.Request(tx)
        .input("Id", sql.UniqueIdentifier, appointmentId)
        .query("SELECT * FROM dbo.TB_CITAS WHERE Id = @Id");

      const apt = aptRes.recordset[0];
      if (!apt) {
        await tx.rollback();
        return res.status(404).json({ error: "Cita no encontrada." });
      }

      const heightM = Number(vitals.heightCm) / 100;
      const bmi = heightM > 0 ? Number((Number(vitals.weightKg) / (heightM * heightM)).toFixed(2)) : null;

      await new sql.Request(tx)
        .input("PatientId", sql.UniqueIdentifier, apt.PatientId)
        .input("AppointmentId", sql.UniqueIdentifier, appointmentId)
        .input("RecordedByUserId", sql.UniqueIdentifier, recordedByUserId || null)
        .input("WeightKg", sql.Decimal(6, 2), vitals.weightKg)
        .input("HeightCm", sql.Decimal(6, 2), vitals.heightCm)
        .input("HeadCircumferenceCm", sql.Decimal(6, 2), vitals.headCircumferenceCm || null)
        .input("TemperatureC", sql.Decimal(4, 1), vitals.temperatureC)
        .input("HeartRateBpm", sql.Int, vitals.heartRateBpm)
        .input("Spo2Percent", sql.Int, vitals.spo2Percent)
        .input("SystolicBp", sql.Int, vitals.systolicBp)
        .input("DiastolicBp", sql.Int, vitals.diastolicBp)
        .input("Bmi", sql.Decimal(6, 2), bmi)
        .query(`
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
        `);

      await new sql.Request(tx)
        .input("Id", sql.UniqueIdentifier, appointmentId)
        .query("UPDATE dbo.TB_CITAS SET Stage = 'en_consulta', UpdatedAt = GETDATE() WHERE Id = @Id");

      await recordAudit(tx, req, {
        userId: recordedByUserId || null,
        userName: recordedByName || "Enfermería",
        userRole: "Enfermera de Triaje",
        actionType: "Registro de Triaje",
        entityName: "TB_CITAS",
        entityId: appointmentId,
        patientId: apt.PatientId,
        previousValue: { stage: apt.Stage },
        newValue: { stage: "en_consulta", weightKg: vitals.weightKg, tempC: vitals.temperatureC },
      });

      await tx.commit();
      res.json({ ok: true, appointmentId, stage: "en_consulta" });
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  })
);

/**
 * 4. Cierre transaccional de Consulta Médica (Consulta + Recetas + Vitales + Cierre de Cita + Auditoría)
 */
router.post(
  "/consultations",
  asyncHandler(async (req, res) => {
    const {
      patientId,
      appointmentId,
      doctorUserId,
      doctorName,
      specialtyId,
      reason,
      cie10Code,
      cie10Name,
      physicalExamSummary,
      specialtyExam,
      patientGuide,
      alarmSigns,
      prescriptions,
      vitals,
      usedAiCopilot,
    } = req.body;

    const pool = await getDbPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const consultRes = await new sql.Request(tx)
        .input("PatientId", sql.UniqueIdentifier, patientId)
        .input("AppointmentId", sql.UniqueIdentifier, appointmentId || null)
        .input("DoctorUserId", sql.UniqueIdentifier, doctorUserId)
        .input("SpecialtyId", sql.Int, Number(specialtyId))
        .input("Reason", sql.NVarChar(sql.MAX), reason)
        .input("Cie10Code", sql.NVarChar(20), cie10Code)
        .input("Cie10Name", sql.NVarChar(250), cie10Name)
        .input("PhysicalExamSummary", sql.NVarChar(sql.MAX), physicalExamSummary)
        .input(
          "SpecialtyExamJson",
          sql.NVarChar(sql.MAX),
          specialtyExam ? JSON.stringify(specialtyExam) : null
        )
        .input("PatientGuide", sql.NVarChar(sql.MAX), patientGuide || null)
        .input("AlarmSignsJson", sql.NVarChar(sql.MAX), JSON.stringify(alarmSigns || []))
        .input("UsedAiCopilot", sql.Bit, Boolean(usedAiCopilot))
        .query(`
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
        `);

      const createdConsultation = consultRes.recordset[0];

      if (Array.isArray(prescriptions)) {
        for (const item of prescriptions) {
          await new sql.Request(tx)
            .input("ConsultationId", sql.UniqueIdentifier, createdConsultation.Id)
            .input("MedicationName", sql.NVarChar(150), item.medicationName)
            .input("Presentation", sql.NVarChar(150), item.presentation)
            .input("DosePerTake", sql.NVarChar(120), item.dosePerTake)
            .input("FrequencyHours", sql.NVarChar(80), item.frequencyHours)
            .input("DurationDays", sql.NVarChar(80), item.durationDays)
            .input("SpecialInstructions", sql.NVarChar(400), item.specialInstructions || null)
            .input("CalculatedMgPerKg", sql.NVarChar(80), item.calculatedMgPerKg || null)
            .query(`
              INSERT INTO dbo.TB_RECETAS_CONSULTA (
                ConsultationId, MedicationName, Presentation, DosePerTake,
                FrequencyHours, DurationDays, SpecialInstructions, CalculatedMgPerKg
              )
              VALUES (
                @ConsultationId, @MedicationName, @Presentation, @DosePerTake,
                @FrequencyHours, @DurationDays, @SpecialInstructions, @CalculatedMgPerKg
              )
            `);
        }
      }

      if (vitals) {
        const heightM = Number(vitals.heightCm) / 100;
        const bmi = heightM > 0 ? Number((Number(vitals.weightKg) / (heightM * heightM)).toFixed(2)) : null;

        await new sql.Request(tx)
          .input("PatientId", sql.UniqueIdentifier, patientId)
          .input("ConsultationId", sql.UniqueIdentifier, createdConsultation.Id)
          .input("RecordedByUserId", sql.UniqueIdentifier, doctorUserId)
          .input("WeightKg", sql.Decimal(6, 2), vitals.weightKg)
          .input("HeightCm", sql.Decimal(6, 2), vitals.heightCm)
          .input("HeadCircumferenceCm", sql.Decimal(6, 2), vitals.headCircumferenceCm || null)
          .input("TemperatureC", sql.Decimal(4, 1), vitals.temperatureC)
          .input("HeartRateBpm", sql.Int, vitals.heartRateBpm)
          .input("Spo2Percent", sql.Int, vitals.spo2Percent)
          .input("SystolicBp", sql.Int, vitals.systolicBp)
          .input("DiastolicBp", sql.Int, vitals.diastolicBp)
          .input("Bmi", sql.Decimal(6, 2), bmi)
          .query(`
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
          `);
      }

      if (appointmentId) {
        await new sql.Request(tx)
          .input("AppointmentId", sql.UniqueIdentifier, appointmentId)
          .query("UPDATE dbo.TB_CITAS SET Stage = 'completado', UpdatedAt = GETDATE() WHERE Id = @AppointmentId");
      }

      await recordAudit(tx, req, {
        userId: doctorUserId,
        userName: doctorName || "Médico Especialista",
        userRole: "Médico Especialista",
        actionType: "Creación de Consulta",
        entityName: "TB_CONSULTAS",
        entityId: createdConsultation.Id,
        patientId,
        newValue: { cie10Code, cie10Name, prescriptionsCount: prescriptions?.length || 0 },
      });

      await tx.commit();
      res.status(201).json(createdConsultation);
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  })
);

/**
 * 5. Vacunación (Catálogo Maestro y Dosis por Paciente)
 */
router.get(
  "/vaccines/master",
  asyncHandler(async (_req, res) => {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .query("SELECT * FROM dbo.TB_VACUNAS_MAESTRO ORDER BY CommercialName ASC");
    res.json(result.recordset);
  })
);

router.post(
  "/vaccines/master",
  asyncHandler(async (req, res) => {
    const b = req.body;
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("CommercialName", sql.NVarChar(120), b.commercialName)
      .input("GenericName", sql.NVarChar(150), b.genericName)
      .input("DosesRequired", sql.Int, Number(b.dosesRequired || 1))
      .input("RecommendedAges", sql.NVarChar(150), b.recommendedAges)
      .input("Route", sql.NVarChar(50), b.route)
      .query(`
        INSERT INTO dbo.TB_VACUNAS_MAESTRO (CommercialName, GenericName, DosesRequired, RecommendedAges, Route)
        OUTPUT INSERTED.*
        VALUES (@CommercialName, @GenericName, @DosesRequired, @RecommendedAges, @Route)
      `);
    res.status(201).json(result.recordset[0]);
  })
);

router.patch(
  "/vaccines/master/:id/toggle",
  asyncHandler(async (req, res) => {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("Id", sql.UniqueIdentifier, req.params.id)
      .query(`
        UPDATE dbo.TB_VACUNAS_MAESTRO
        SET Active = CASE WHEN Active = 1 THEN 0 ELSE 1 END,
            UpdatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE Id = @Id
      `);
    res.json(result.recordset[0]);
  })
);

router.patch(
  "/patients/:patientId/vaccines/:doseId",
  asyncHandler(async (req, res) => {
    const { patientId, doseId } = req.params;
    const { appliedDate, batchNumber, manufacturer, appliedByUserId, appliedByName, observations } = req.body;
    const pool = await getDbPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const updated = await new sql.Request(tx)
        .input("DoseId", sql.UniqueIdentifier, doseId)
        .input("PatientId", sql.UniqueIdentifier, patientId)
        .input("AppliedDate", sql.Date, appliedDate)
        .input("BatchNumber", sql.NVarChar(60), batchNumber)
        .input("Manufacturer", sql.NVarChar(100), manufacturer)
        .input("AppliedByUserId", sql.UniqueIdentifier, appliedByUserId || null)
        .input("Observations", sql.NVarChar(400), observations || null)
        .query(`
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
        `);

      if (!updated.recordset[0]) {
        await tx.rollback();
        return res.status(404).json({ error: "Dosis no encontrada." });
      }

      await recordAudit(tx, req, {
        userId: appliedByUserId || null,
        userName: appliedByName || "Médico Especialista",
        userRole: "Médico Especialista",
        actionType: "Aplicación de Dosis",
        entityName: "TB_VACUNAS_PACIENTE",
        entityId: doseId,
        patientId,
        newValue: { batchNumber, manufacturer, appliedDate },
      });

      await tx.commit();
      res.json(updated.recordset[0]);
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  })
);

/**
 * 6. Caja, Pagos y Reportes Epidemiológicos
 */
router.get(
  "/payments",
  asyncHandler(async (_req, res) => {
    const pool = await getDbPool();
    const result = await pool.request().query(`
      SELECT
        pg.*,
        p.FirstName + ' ' + p.LastName AS PatientName,
        p.GuardianName,
        p.GuardianIdDocument,
        u.NombreCompleto AS DoctorName,
        e.Nombre AS SpecialtyName
      FROM dbo.TB_PAGOS pg
      INNER JOIN dbo.TB_PACIENTES p ON p.Id = pg.PatientId
      INNER JOIN dbo.TB_USUARIOS u ON u.Id = pg.DoctorUserId
      INNER JOIN dbo.TB_ESPECIALIDADES e ON e.Id = pg.SpecialtyId
      ORDER BY pg.PaymentDateTime DESC
    `);
    res.json(result.recordset);
  })
);

router.post(
  "/payments",
  asyncHandler(async (req, res) => {
    const b = req.body;
    const pool = await getDbPool();
    const countRes = await pool.request().query("SELECT COUNT(*) AS Total FROM dbo.TB_PAGOS");
    const nextNum = 841 + Number(countRes.recordset[0]?.Total || 0);
    const receiptNumber = `REC-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`;

    const result = await pool
      .request()
      .input("ReceiptNumber", sql.NVarChar(40), receiptNumber)
      .input("PatientId", sql.UniqueIdentifier, b.patientId)
      .input("ConsultationId", sql.UniqueIdentifier, b.consultationId || null)
      .input("DoctorUserId", sql.UniqueIdentifier, b.doctorUserId)
      .input("SpecialtyId", sql.Int, Number(b.specialtyId))
      .input("Concept", sql.NVarChar(100), b.concept)
      .input("Cie10Code", sql.NVarChar(20), b.cie10Code || null)
      .input("AmountUsd", sql.Decimal(18, 2), b.amountUsd)
      .input("BcvRate", sql.Decimal(18, 4), b.bcvRate)
      .input("AmountVes", sql.Decimal(18, 2), b.amountVes)
      .input("Method", sql.NVarChar(50), b.method)
      .input("Reference", sql.NVarChar(80), b.reference)
      .input("InsuranceCompany", sql.NVarChar(100), b.insuranceCompany || null)
      .input("RecordedByUserId", sql.UniqueIdentifier, b.recordedByUserId || null)
      .query(`
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
      `);

    res.status(201).json(result.recordset[0]);
  })
);

router.get(
  "/reports/epidemiology",
  asyncHandler(async (_req, res) => {
    const pool = await getDbPool();
    const result = await pool.request().query(`
      SELECT
        c.Cie10Code,
        c.Cie10Name,
        e.Nombre AS SpecialtyName,
        COUNT(*) AS CasesCount
      FROM dbo.TB_CONSULTAS c
      INNER JOIN dbo.TB_ESPECIALIDADES e ON e.Id = c.SpecialtyId
      GROUP BY c.Cie10Code, c.Cie10Name, e.Nombre
      ORDER BY CasesCount DESC
    `);
    res.json(result.recordset);
  })
);

/**
 * 7. Configuración de Tenant, Tasa BCV, Plantillas y Auditoría
 */
router.patch(
  "/tenant/bcv-rate",
  asyncHandler(async (req, res) => {
    const { bcvRate, updatedByUserId, updatedByName } = req.body;
    const pool = await getDbPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      const currentRes = await new sql.Request(tx).query(
        "SELECT TOP 1 Id, BcvRate FROM dbo.TB_CONFIG_TENANT ORDER BY Id ASC"
      );
      const current = currentRes.recordset[0];

      if (current) {
        await new sql.Request(tx)
          .input("Id", sql.Int, current.Id)
          .input("BcvRate", sql.Decimal(18, 4), bcvRate)
          .query("UPDATE dbo.TB_CONFIG_TENANT SET BcvRate = @BcvRate, UpdatedAt = GETDATE() WHERE Id = @Id");
      }

      await new sql.Request(tx)
        .input("Tasa", sql.Decimal(18, 4), bcvRate)
        .input("UpdatedByUserId", sql.UniqueIdentifier, updatedByUserId || null)
        .query("INSERT INTO dbo.TB_HISTORIAL_BCV (Tasa, Origen, UpdatedByUserId) VALUES (@Tasa, 'Manual', @UpdatedByUserId)");

      await recordAudit(tx, req, {
        userId: updatedByUserId || null,
        userName: updatedByName || "Administrador",
        userRole: "Administrador Tenant",
        actionType: "Actualización de Tasa BCV",
        entityName: "TB_CONFIG_TENANT",
        entityId: String(current?.Id || 1),
        previousValue: { bcvRate: current?.BcvRate ?? 0 },
        newValue: { bcvRate },
      });

      await tx.commit();
      res.json({ ok: true, bcvRate });
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  })
);

router.get(
  "/audit-logs",
  asyncHandler(async (_req, res) => {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .query("SELECT TOP 200 * FROM dbo.TB_AUDITORIA ORDER BY EventTimestamp DESC");
    res.json(result.recordset);
  })
);

export default router;

