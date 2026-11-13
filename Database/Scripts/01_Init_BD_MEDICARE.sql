-- ====================================================================
-- BASE DE DATOS: BD_MEDICARE (Plantilla Multi-Especialidad)
-- Sistema Clínico SaaS: Historia Clínica, Vacunas, Caja, Auditoría e IA
-- Estándar de Nomenclatura SQL Server: dbo.TB_*
-- ====================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'BD_MEDICARE')
BEGIN
    CREATE DATABASE BD_MEDICARE;
END
GO

USE BD_MEDICARE;
GO

-- ====================================================================
-- 1. SEGURIDAD, ROLES, USUARIOS Y ESPECIALIDADES
-- ====================================================================

IF OBJECT_ID('dbo.TB_ROLES', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_ROLES (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Codigo NVARCHAR(40) NOT NULL UNIQUE,
        Nombre NVARCHAR(100) NOT NULL,
        Descripcion NVARCHAR(250) NULL,
        Activo BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

IF OBJECT_ID('dbo.TB_ESPECIALIDADES', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_ESPECIALIDADES (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Codigo NVARCHAR(40) NOT NULL UNIQUE, -- Ej: PEDIATRIA, GINECOLOGIA, CARDIOLOGIA
        Nombre NVARCHAR(120) NOT NULL,
        ModuloCodigoSaaS NVARCHAR(50) NULL,  -- Ej: esp_pediatria
        ConfigCamposJson NVARCHAR(MAX) NULL, -- Definición de secciones/campos propios
        Activa BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

IF OBJECT_ID('dbo.TB_USUARIOS', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_USUARIOS (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        RoleId INT NOT NULL REFERENCES dbo.TB_ROLES(Id),
        Username NVARCHAR(60) NOT NULL UNIQUE,
        NombreCompleto NVARCHAR(150) NOT NULL,
        Email NVARCHAR(150) NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        NumeroColegiado NVARCHAR(60) NULL,
        Telefono NVARCHAR(40) NULL,
        AvatarUrl NVARCHAR(500) NULL,
        Activo BIT NOT NULL DEFAULT 1,
        UltimoAcceso DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL
    );
END
GO

IF OBJECT_ID('dbo.TB_USUARIO_ESPECIALIDADES', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_USUARIO_ESPECIALIDADES (
        UserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_USUARIOS(Id),
        SpecialtyId INT NOT NULL REFERENCES dbo.TB_ESPECIALIDADES(Id),
        EsPrincipal BIT NOT NULL DEFAULT 0,
        PRIMARY KEY (UserId, SpecialtyId)
    );
END
GO

IF OBJECT_ID('dbo.TB_ASISTENTE_MEDICOS', 'U') IS NULL
BEGIN
    -- Relación N:M: permite 1 asistente personal por médico o 1 asistente compartida para varios médicos en clínica
    CREATE TABLE dbo.TB_ASISTENTE_MEDICOS (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        AsistenteUserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_USUARIOS(Id),
        MedicoUserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_USUARIOS(Id),
        TipoAsignacion NVARCHAR(30) NOT NULL DEFAULT 'PERSONAL', -- 'PERSONAL' | 'COMPARTIDA_CLINICA'
        PuedeAgendar BIT NOT NULL DEFAULT 1,
        PuedeRegistrarInfo BIT NOT NULL DEFAULT 1,
        PuedeCobrar BIT NOT NULL DEFAULT 1,
        PuedePosponerCancelar BIT NOT NULL DEFAULT 1,
        Activo BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT UQ_TB_ASISTENTE_MEDICO UNIQUE (AsistenteUserId, MedicoUserId)
    );
END
GO

-- ====================================================================
-- 2. CONFIGURACIÓN DE CLÍNICA, PLANTILLAS, BCV Y USO SAAS
-- ====================================================================

IF OBJECT_ID('dbo.TB_CONFIG_TENANT', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_CONFIG_TENANT (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        BusinessName NVARCHAR(150) NOT NULL,
        Subdomain NVARCHAR(80) NOT NULL UNIQUE,
        Rif NVARCHAR(40) NOT NULL,
        Phone NVARCHAR(40) NOT NULL,
        Email NVARCHAR(120) NOT NULL,
        Address NVARCHAR(300) NOT NULL,
        ScheduleWeekdays NVARCHAR(120) NOT NULL,
        ScheduleSaturdays NVARCHAR(120) NOT NULL,
        BillingCurrency NVARCHAR(10) NOT NULL DEFAULT 'USD',
        AutoSyncBcv BIT NOT NULL DEFAULT 1,
        BcvRate DECIMAL(18,4) NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL
    );
END
GO

IF OBJECT_ID('dbo.TB_PLANTILLAS_RECETA', 'U') IS NULL
BEGIN
    -- Los datos fiscales (Nombre, RIF, Dirección, Teléfono) se leen de TB_CONFIG_TENANT
    CREATE TABLE dbo.TB_PLANTILLAS_RECETA (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TenantId INT NOT NULL REFERENCES dbo.TB_CONFIG_TENANT(Id),
        ClinicSubtitle NVARCHAR(150) NULL,
        LogoPosition NVARCHAR(20) NOT NULL DEFAULT 'left',
        FontFamily NVARCHAR(60) NOT NULL DEFAULT 'Plus Jakarta Sans',
        BorderColor NVARCHAR(20) NOT NULL DEFAULT '#0284C7',
        ShowQrCode BIT NOT NULL DEFAULT 1,
        ShowDigitalSignature BIT NOT NULL DEFAULT 1,
        ShowWetStamp BIT NOT NULL DEFAULT 0,
        FooterNote NVARCHAR(400) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL
    );
END
GO

IF OBJECT_ID('dbo.TB_HISTORIAL_BCV', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_HISTORIAL_BCV (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Tasa DECIMAL(18,4) NOT NULL,
        Origen NVARCHAR(40) NOT NULL DEFAULT 'Manual', -- Manual | BCV_Auto
        UpdatedByUserId UNIQUEIDENTIFIER NULL REFERENCES dbo.TB_USUARIOS(Id),
        RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

IF OBJECT_ID('dbo.TB_USO_SAAS', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_USO_SAAS (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PeriodoMes CHAR(7) NOT NULL UNIQUE, -- YYYY-MM
        AiMinutesUsed INT NOT NULL DEFAULT 0,
        WhatsappMessagesSent INT NOT NULL DEFAULT 0,
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

-- ====================================================================
-- 3. PACIENTES Y FICHAS POR ESPECIALIDAD
-- ====================================================================

IF OBJECT_ID('dbo.TB_PACIENTES', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_PACIENTES (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        HistoryNumber NVARCHAR(30) NOT NULL UNIQUE,
        FirstName NVARCHAR(100) NOT NULL,
        LastName NVARCHAR(100) NOT NULL,
        Sex CHAR(1) NOT NULL CHECK (Sex IN ('M', 'F')),
        BirthDate DATE NOT NULL,
        IdDocument NVARCHAR(40) NULL,
        BloodType NVARCHAR(5) NOT NULL,
        PrimarySpecialtyId INT NOT NULL REFERENCES dbo.TB_ESPECIALIDADES(Id),
        CriticalAllergiesJson NVARCHAR(MAX) NOT NULL DEFAULT '[]',
        ChronicConditionsJson NVARCHAR(MAX) NOT NULL DEFAULT '[]',
        PreviousHospitalizations NVARCHAR(500) NULL,
        GuardianName NVARCHAR(150) NOT NULL,
        GuardianRelation NVARCHAR(60) NOT NULL,
        GuardianIdDocument NVARCHAR(40) NOT NULL,
        GuardianOccupation NVARCHAR(100) NULL,
        GuardianWhatsapp NVARCHAR(40) NOT NULL,
        GuardianEmail NVARCHAR(120) NULL,
        Activo BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL
    );
END
GO

IF OBJECT_ID('dbo.TB_PACIENTE_FICHA_ESPECIALIDAD', 'U') IS NULL
BEGIN
    -- Almacena antecedentes específicos por especialidad (Perinatal, Gineco-Obstétrico, Cardiovascular, etc.)
    CREATE TABLE dbo.TB_PACIENTE_FICHA_ESPECIALIDAD (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PatientId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_PACIENTES(Id),
        SpecialtyId INT NOT NULL REFERENCES dbo.TB_ESPECIALIDADES(Id),
        DatosJson NVARCHAR(MAX) NOT NULL DEFAULT '{}',
        UpdatedByUserId UNIQUEIDENTIFIER NULL REFERENCES dbo.TB_USUARIOS(Id),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT UQ_PACIENTE_ESPECIALIDAD UNIQUE (PatientId, SpecialtyId)
    );
END
GO

-- ====================================================================
-- 4. AGENDA, SALA DE ESPERA, CONSULTAS Y SIGNOS VITALES UNIFICADOS
-- ====================================================================

IF OBJECT_ID('dbo.TB_CITAS', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_CITAS (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        PatientId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_PACIENTES(Id),
        DoctorUserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_USUARIOS(Id),
        SpecialtyId INT NOT NULL REFERENCES dbo.TB_ESPECIALIDADES(Id),
        AppointmentDate DATE NOT NULL,
        AppointmentTime NVARCHAR(20) NOT NULL,
        DurationMinutes INT NOT NULL DEFAULT 30,
        AppointmentType NVARCHAR(30) NOT NULL CHECK (AppointmentType IN ('control', 'urgencia', 'vacunacion', 'primera_vez')),
        Reason NVARCHAR(400) NOT NULL,
        Stage NVARCHAR(30) NOT NULL CHECK (Stage IN ('programado', 'en_sala', 'en_triaje', 'en_consulta', 'completado', 'cancelado')),
        ArrivedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL
    );
END
GO

IF OBJECT_ID('dbo.TB_CONSULTAS', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_CONSULTAS (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        PatientId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_PACIENTES(Id),
        AppointmentId UNIQUEIDENTIFIER NULL REFERENCES dbo.TB_CITAS(Id),
        DoctorUserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_USUARIOS(Id),
        SpecialtyId INT NOT NULL REFERENCES dbo.TB_ESPECIALIDADES(Id),
        ConsultationDate DATETIME2 NOT NULL DEFAULT GETDATE(),
        Reason NVARCHAR(MAX) NOT NULL,
        Cie10Code NVARCHAR(20) NOT NULL,
        Cie10Name NVARCHAR(250) NOT NULL,
        PhysicalExamSummary NVARCHAR(MAX) NOT NULL,
        SpecialtyExamJson NVARCHAR(MAX) NULL, -- Hallazgos estructurados propios de la especialidad
        PatientGuide NVARCHAR(MAX) NULL,      -- Guía para padres / indicaciones al paciente
        AlarmSignsJson NVARCHAR(MAX) NOT NULL DEFAULT '[]',
        UsedAiCopilot BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

IF OBJECT_ID('dbo.TB_SIGNOS_VITALES', 'U') IS NULL
BEGIN
    -- Tabla única de signos vitales (alimenta Triaje, Consulta, Últimos Vitales y Curvas de Crecimiento)
    CREATE TABLE dbo.TB_SIGNOS_VITALES (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        PatientId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_PACIENTES(Id),
        AppointmentId UNIQUEIDENTIFIER NULL REFERENCES dbo.TB_CITAS(Id),
        ConsultationId UNIQUEIDENTIFIER NULL REFERENCES dbo.TB_CONSULTAS(Id),
        RecordedByUserId UNIQUEIDENTIFIER NULL REFERENCES dbo.TB_USUARIOS(Id),
        WeightKg DECIMAL(6,2) NOT NULL,
        HeightCm DECIMAL(6,2) NOT NULL,
        HeadCircumferenceCm DECIMAL(6,2) NULL,
        TemperatureC DECIMAL(4,1) NOT NULL,
        HeartRateBpm INT NOT NULL,
        Spo2Percent INT NOT NULL,
        SystolicBp INT NOT NULL,
        DiastolicBp INT NOT NULL,
        Bmi DECIMAL(6,2) NULL,
        AgeMonthsAtRecord INT NULL,
        RecordedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

IF OBJECT_ID('dbo.TB_RECETAS_CONSULTA', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_RECETAS_CONSULTA (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ConsultationId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_CONSULTAS(Id),
        MedicationName NVARCHAR(150) NOT NULL,
        Presentation NVARCHAR(150) NOT NULL,
        DosePerTake NVARCHAR(120) NOT NULL,
        FrequencyHours NVARCHAR(80) NOT NULL,
        DurationDays NVARCHAR(80) NOT NULL,
        SpecialInstructions NVARCHAR(400) NULL,
        CalculatedMgPerKg NVARCHAR(80) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

IF OBJECT_ID('dbo.TB_ESTUDIOS_MEDICOS', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_ESTUDIOS_MEDICOS (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        PatientId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_PACIENTES(Id),
        SpecialtyId INT NULL REFERENCES dbo.TB_ESPECIALIDADES(Id),
        Title NVARCHAR(180) NOT NULL,
        Category NVARCHAR(60) NOT NULL,
        StudyDate DATE NOT NULL,
        Summary NVARCHAR(MAX) NULL,
        ImageUrl NVARCHAR(500) NULL,
        ValuesHighlight NVARCHAR(300) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

-- ====================================================================
-- 5. VACUNACIÓN (CATÁLOGO MAESTRO Y CARNET POR PACIENTE)
-- ====================================================================

IF OBJECT_ID('dbo.TB_VACUNAS_MAESTRO', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_VACUNAS_MAESTRO (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        CommercialName NVARCHAR(120) NOT NULL,
        GenericName NVARCHAR(150) NOT NULL,
        DosesRequired INT NOT NULL DEFAULT 1,
        RecommendedAges NVARCHAR(150) NOT NULL,
        Route NVARCHAR(50) NOT NULL,
        Active BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL
    );
END
GO

IF OBJECT_ID('dbo.TB_VACUNAS_PACIENTE', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_VACUNAS_PACIENTE (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        PatientId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_PACIENTES(Id),
        VaccineId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_VACUNAS_MAESTRO(Id),
        MilestoneLabel NVARCHAR(80) NOT NULL,
        MilestoneMonths INT NOT NULL DEFAULT 0,
        DoseNumber NVARCHAR(40) NOT NULL,
        Status NVARCHAR(20) NOT NULL CHECK (Status IN ('aplicada', 'pendiente', 'futura')),
        AppliedDate DATE NULL,
        BatchNumber NVARCHAR(60) NULL,
        Manufacturer NVARCHAR(100) NULL,
        AppliedByUserId UNIQUEIDENTIFIER NULL REFERENCES dbo.TB_USUARIOS(Id),
        Observations NVARCHAR(400) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL
    );
END
GO

-- ====================================================================
-- 6. CAJA, FACTURACIÓN Y AUDITORÍA
-- ====================================================================

IF OBJECT_ID('dbo.TB_PAGOS', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_PAGOS (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ReceiptNumber NVARCHAR(40) NOT NULL UNIQUE,
        PaymentDateTime DATETIME2 NOT NULL DEFAULT GETDATE(),
        PatientId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_PACIENTES(Id),
        ConsultationId UNIQUEIDENTIFIER NULL REFERENCES dbo.TB_CONSULTAS(Id),
        DoctorUserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_USUARIOS(Id),
        SpecialtyId INT NOT NULL REFERENCES dbo.TB_ESPECIALIDADES(Id),
        Concept NVARCHAR(100) NOT NULL,
        Cie10Code NVARCHAR(20) NULL,
        AmountUsd DECIMAL(18,2) NOT NULL,
        BcvRate DECIMAL(18,4) NOT NULL,
        AmountVes DECIMAL(18,2) NOT NULL,
        Method NVARCHAR(50) NOT NULL,
        Reference NVARCHAR(80) NOT NULL,
        InsuranceCompany NVARCHAR(100) NULL,
        RecordedByUserId UNIQUEIDENTIFIER NULL REFERENCES dbo.TB_USUARIOS(Id),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

IF OBJECT_ID('dbo.TB_AUDITORIA', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_AUDITORIA (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        EventTimestamp DATETIME2 NOT NULL DEFAULT GETDATE(),
        UserId UNIQUEIDENTIFIER NULL REFERENCES dbo.TB_USUARIOS(Id),
        UserName NVARCHAR(120) NOT NULL,
        UserRole NVARCHAR(60) NOT NULL,
        ActionType NVARCHAR(100) NOT NULL,
        EntityName NVARCHAR(60) NULL,
        EntityId NVARCHAR(60) NULL,
        PatientId UNIQUEIDENTIFIER NULL REFERENCES dbo.TB_PACIENTES(Id),
        IpAddress NVARCHAR(60) NOT NULL,
        PreviousValueJson NVARCHAR(MAX) NULL,
        NewValueJson NVARCHAR(MAX) NULL
    );
END
GO

-- ====================================================================
-- 6.1 PERMISOS DE DIAGNÓSTICO POR REFERENCIA / INTERCONSULTA
-- (Los estudios/exámenes en TB_ESTUDIOS_MEDICOS NO requieren permiso)
-- ====================================================================
IF OBJECT_ID('dbo.TB_PERMISOS_DIAGNOSTICO', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_PERMISOS_DIAGNOSTICO (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        PatientId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_PACIENTES(Id),
        ConsultationId UNIQUEIDENTIFIER NULL REFERENCES dbo.TB_CONSULTAS(Id),
        GrantedByUserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_USUARIOS(Id),
        GrantedBySpecialtyId INT NOT NULL REFERENCES dbo.TB_ESPECIALIDADES(Id),
        TargetSpecialtyId INT NOT NULL REFERENCES dbo.TB_ESPECIALIDADES(Id),
        TargetDoctorUserId UNIQUEIDENTIFIER NULL REFERENCES dbo.TB_USUARIOS(Id),
        Reason NVARCHAR(300) NULL,
        Activo BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        ExpiresAt DATETIME2 NULL
    );
END
GO

-- ====================================================================
-- 7. ÍNDICES PRINCIPALES
-- ====================================================================

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TB_CITAS_FECHA_STAGE')
    CREATE INDEX IX_TB_CITAS_FECHA_STAGE ON dbo.TB_CITAS (AppointmentDate, Stage);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TB_CONSULTAS_PACIENTE')
    CREATE INDEX IX_TB_CONSULTAS_PACIENTE ON dbo.TB_CONSULTAS (PatientId, ConsultationDate DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TB_SIGNOS_VITALES_PACIENTE')
    CREATE INDEX IX_TB_SIGNOS_VITALES_PACIENTE ON dbo.TB_SIGNOS_VITALES (PatientId, RecordedAt DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TB_PAGOS_FECHA')
    CREATE INDEX IX_TB_PAGOS_FECHA ON dbo.TB_PAGOS (PaymentDateTime DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TB_VACUNAS_PACIENTE')
    CREATE INDEX IX_TB_VACUNAS_PACIENTE ON dbo.TB_VACUNAS_PACIENTE (PatientId, Status);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TB_AUDITORIA_FECHA')
    CREATE INDEX IX_TB_AUDITORIA_FECHA ON dbo.TB_AUDITORIA (EventTimestamp DESC);
GO

-- ====================================================================
-- 8. DATOS SEMILLA INICIALES (ROLES, USUARIOS BASE Y ESPECIALIDADES)
-- ====================================================================

IF NOT EXISTS (SELECT 1 FROM dbo.TB_ROLES WHERE Codigo = 'SUPERADMIN')
    INSERT INTO dbo.TB_ROLES (Codigo, Nombre, Descripcion) VALUES ('SUPERADMIN', 'Super Administrador', 'Control maestro de plataforma, soporte técnico y todos los módulos');
IF NOT EXISTS (SELECT 1 FROM dbo.TB_ROLES WHERE Codigo = 'ADMIN')
    INSERT INTO dbo.TB_ROLES (Codigo, Nombre, Descripcion) VALUES ('ADMIN', 'Administrador', 'Control total de la clínica, usuarios, caja, configuración y auditoría');
IF NOT EXISTS (SELECT 1 FROM dbo.TB_ROLES WHERE Codigo = 'MEDICO')
    INSERT INTO dbo.TB_ROLES (Codigo, Nombre, Descripcion) VALUES ('MEDICO', 'Médico Especialista', 'Atención de consultas, historia clínica, recetas y vacunación');
IF NOT EXISTS (SELECT 1 FROM dbo.TB_ROLES WHERE Codigo = 'ASISTENTE')
    INSERT INTO dbo.TB_ROLES (Codigo, Nombre, Descripcion) VALUES ('ASISTENTE', 'Asistente Médica', 'Asistente personal o compartida: agenda, pospone citas, registra información y gestiona cobros');
IF NOT EXISTS (SELECT 1 FROM dbo.TB_ROLES WHERE Codigo = 'ENFERMERIA')
    INSERT INTO dbo.TB_ROLES (Codigo, Nombre, Descripcion) VALUES ('ENFERMERIA', 'Enfermera de Triaje', 'Signos vitales, sala de espera y aplicación de vacunas');
IF NOT EXISTS (SELECT 1 FROM dbo.TB_ROLES WHERE Codigo = 'RECEPCION')
    INSERT INTO dbo.TB_ROLES (Codigo, Nombre, Descripcion) VALUES ('RECEPCION', 'Recepción / Caja', 'Agenda de citas, admisión y cobros');
GO

-- Usuarios iniciales equivalentes a Transporte_V2 (SUPERADMIN y ADMIN)
-- Nota: Cambia las contraseñas después del primer inicio de sesión.
DECLARE @SuperAdminRoleId INT = (SELECT TOP 1 Id FROM dbo.TB_ROLES WHERE Codigo = 'SUPERADMIN');
DECLARE @AdminRoleId INT = (SELECT TOP 1 Id FROM dbo.TB_ROLES WHERE Codigo = 'ADMIN');

IF NOT EXISTS (SELECT 1 FROM dbo.TB_USUARIOS WHERE Username = 'superadmin')
    INSERT INTO dbo.TB_USUARIOS (RoleId, Username, NombreCompleto, Email, PasswordHash)
    VALUES (@SuperAdminRoleId, 'superadmin', 'Super Administrador MediCare', 'superadmin@medicare.local', '$2a$11$KIXu1j6N7Z6y8s3m8vQ9QeW9q0b7xX2Y3Z4A5B6C7D8E9F0G1H2I3');

IF NOT EXISTS (SELECT 1 FROM dbo.TB_USUARIOS WHERE Username = 'admin')
    INSERT INTO dbo.TB_USUARIOS (RoleId, Username, NombreCompleto, Email, PasswordHash)
    VALUES (@AdminRoleId, 'admin', 'Administrador Clínica', 'admin@medicare.local', '$2a$11$KIXu1j6N7Z6y8s3m8vQ9QeW9q0b7xX2Y3Z4A5B6C7D8E9F0G1H2I3');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.TB_ESPECIALIDADES WHERE Codigo = 'MEDICINA_GENERAL')
    INSERT INTO dbo.TB_ESPECIALIDADES (Codigo, Nombre, ModuloCodigoSaaS) VALUES ('MEDICINA_GENERAL', 'Medicina General', 'esp_medicina_general');
IF NOT EXISTS (SELECT 1 FROM dbo.TB_ESPECIALIDADES WHERE Codigo = 'PEDIATRIA')
    INSERT INTO dbo.TB_ESPECIALIDADES (Codigo, Nombre, ModuloCodigoSaaS) VALUES ('PEDIATRIA', 'Pediatría', 'esp_pediatria');
IF NOT EXISTS (SELECT 1 FROM dbo.TB_ESPECIALIDADES WHERE Codigo = 'GINECOLOGIA')
    INSERT INTO dbo.TB_ESPECIALIDADES (Codigo, Nombre, ModuloCodigoSaaS) VALUES ('GINECOLOGIA', 'Ginecología', 'esp_ginecologia');
IF NOT EXISTS (SELECT 1 FROM dbo.TB_ESPECIALIDADES WHERE Codigo = 'CARDIOLOGIA')
    INSERT INTO dbo.TB_ESPECIALIDADES (Codigo, Nombre, ModuloCodigoSaaS) VALUES ('CARDIOLOGIA', 'Medicina Interna / Cardiología', 'esp_cardiologia');
IF NOT EXISTS (SELECT 1 FROM dbo.TB_ESPECIALIDADES WHERE Codigo = 'TRAUMATOLOGIA')
    INSERT INTO dbo.TB_ESPECIALIDADES (Codigo, Nombre, ModuloCodigoSaaS) VALUES ('TRAUMATOLOGIA', 'Traumatología', 'esp_traumatologia');
IF NOT EXISTS (SELECT 1 FROM dbo.TB_ESPECIALIDADES WHERE Codigo = 'DERMATOLOGIA')
    INSERT INTO dbo.TB_ESPECIALIDADES (Codigo, Nombre, ModuloCodigoSaaS) VALUES ('DERMATOLOGIA', 'Dermatología', 'esp_dermatologia');
GO
