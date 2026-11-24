using Dapper;

namespace MediCare.API.Services;

/// <summary>
/// Ejecuta las migraciones idempotentes de esquema una sola vez al arrancar la API,
/// evitando ejecutar DDL (ALTER TABLE) dentro de los controladores en cada petición HTTP.
/// </summary>
public sealed class DatabaseSchemaInitializer : IHostedService
{
    private readonly DbConnectionFactory _db;
    private readonly ILogger<DatabaseSchemaInitializer> _logger;

    public DatabaseSchemaInitializer(DbConnectionFactory db, ILogger<DatabaseSchemaInitializer> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);

            const string sql = """
                IF COL_LENGTH('dbo.TB_USUARIOS', 'DictationEnabled') IS NULL
                    ALTER TABLE dbo.TB_USUARIOS
                        ADD DictationEnabled BIT NOT NULL CONSTRAINT DF_TB_USUARIOS_DICTATION DEFAULT 0;

                IF COL_LENGTH('dbo.TB_PERMISOS_DIAGNOSTICO', 'Status') IS NULL
                    ALTER TABLE dbo.TB_PERMISOS_DIAGNOSTICO
                        ADD Status NVARCHAR(20) NOT NULL CONSTRAINT DF_TB_PERMISOS_DIAG_STATUS DEFAULT 'APPROVED';

                IF COL_LENGTH('dbo.TB_PERMISOS_DIAGNOSTICO', 'IncludeStudies') IS NULL
                    ALTER TABLE dbo.TB_PERMISOS_DIAGNOSTICO
                        ADD IncludeStudies BIT NOT NULL CONSTRAINT DF_TB_PERMISOS_DIAG_STUDIES DEFAULT 0;

                IF COL_LENGTH('dbo.TB_ESTUDIOS_MEDICOS', 'CreatedByDoctorUserId') IS NULL
                    ALTER TABLE dbo.TB_ESTUDIOS_MEDICOS ADD CreatedByDoctorUserId UNIQUEIDENTIFIER NULL;

                IF COL_LENGTH('dbo.TB_ESTUDIOS_MEDICOS', 'ClinicId') IS NULL
                    ALTER TABLE dbo.TB_ESTUDIOS_MEDICOS ADD ClinicId UNIQUEIDENTIFIER NULL;

                IF COL_LENGTH('dbo.TB_CITAS', 'ClinicId') IS NULL
                    ALTER TABLE dbo.TB_CITAS ADD ClinicId UNIQUEIDENTIFIER NULL;

                IF COL_LENGTH('dbo.TB_CONSULTAS', 'ClinicId') IS NULL
                    ALTER TABLE dbo.TB_CONSULTAS ADD ClinicId UNIQUEIDENTIFIER NULL;

                IF COL_LENGTH('dbo.TB_NOTIFICACIONES', 'TargetUserId') IS NULL
                    ALTER TABLE dbo.TB_NOTIFICACIONES ADD TargetUserId NVARCHAR(100) NULL;

                IF COL_LENGTH('dbo.TB_PLANTILLAS_RECETA', 'DoctorUserId') IS NULL
                    ALTER TABLE dbo.TB_PLANTILLAS_RECETA ADD
                        DoctorUserId UNIQUEIDENTIFIER NULL,
                        ClinicName NVARCHAR(200) NULL,
                        Rif NVARCHAR(80) NULL,
                        Address NVARCHAR(300) NULL,
                        Phone NVARCHAR(80) NULL,
                        Orientation NVARCHAR(30) NULL,
                        BackgroundTemplateDataUrl NVARCHAR(MAX) NULL,
                        HideDefaultHeaderOnBg BIT NULL,
                        ContentTopPaddingPx INT NULL,
                        ContentBottomPaddingPx INT NULL,
                        BackgroundOpacity FLOAT NULL;

                IF OBJECT_ID('dbo.TB_MEDICO_ESPECIALIDADES', 'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.TB_MEDICO_ESPECIALIDADES (
                        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
                        DoctorUserId UNIQUEIDENTIFIER NOT NULL,
                        SpecialtyId INT NOT NULL,
                        IsPrimary BIT NOT NULL DEFAULT 0,
                        Activo BIT NOT NULL DEFAULT 1,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                    );
                END

                IF NOT EXISTS (SELECT 1 FROM dbo.TB_ROLES WHERE Codigo = 'GERENTE')
                    INSERT INTO dbo.TB_ROLES (Codigo, Nombre) VALUES ('GERENTE', 'Gerente de Clínica');

                IF COL_LENGTH('dbo.TB_USUARIOS', 'ClinicId') IS NULL
                    ALTER TABLE dbo.TB_USUARIOS ADD ClinicId UNIQUEIDENTIFIER NULL;

                IF COL_LENGTH('dbo.TB_USUARIOS', 'HasPersonalPlan') IS NULL
                    ALTER TABLE dbo.TB_USUARIOS
                        ADD HasPersonalPlan BIT NOT NULL CONSTRAINT DF_TB_USUARIOS_PERSONAL DEFAULT 0;

                IF COL_LENGTH('dbo.TB_USUARIOS', 'AssistantScope') IS NULL
                    ALTER TABLE dbo.TB_USUARIOS
                        ADD AssistantScope NVARCHAR(30) NOT NULL CONSTRAINT DF_TB_USUARIOS_ASCOPE DEFAULT 'ALL_CLINIC_DOCTORS';

                IF COL_LENGTH('dbo.TB_PERMISOS_DIAGNOSTICO', 'ScopeClinicId') IS NULL
                    ALTER TABLE dbo.TB_PERMISOS_DIAGNOSTICO ADD ScopeClinicId UNIQUEIDENTIFIER NULL;

                IF COL_LENGTH('dbo.TB_PERMISOS_DIAGNOSTICO', 'MaxConsultationDate') IS NULL
                    ALTER TABLE dbo.TB_PERMISOS_DIAGNOSTICO ADD MaxConsultationDate DATETIME2 NULL;

                IF COL_LENGTH('dbo.TB_PERMISOS_DIAGNOSTICO', 'IsEmergencyContinuity') IS NULL
                    ALTER TABLE dbo.TB_PERMISOS_DIAGNOSTICO
                        ADD IsEmergencyContinuity BIT NOT NULL CONSTRAINT DF_TB_PERMISOS_DIAG_EMERG DEFAULT 0;

                IF OBJECT_ID('dbo.TB_PLANES', 'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.TB_PLANES (
                        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        Code NVARCHAR(40) NOT NULL UNIQUE,
                        Name NVARCHAR(120) NOT NULL,
                        PlanType NVARCHAR(20) NOT NULL,
                        MaxDoctors INT NOT NULL DEFAULT 1,
                        MaxAssistants INT NOT NULL DEFAULT 0,
                        AllowDictationAi BIT NOT NULL DEFAULT 0,
                        AllowFinanceBcv BIT NOT NULL DEFAULT 0,
                        AllowedSpecialtiesJson NVARCHAR(MAX) NOT NULL DEFAULT '["pediatria"]',
                        PriceUsdMonthly DECIMAL(10,2) NOT NULL DEFAULT 0,
                        Activo BIT NOT NULL DEFAULT 1
                    );

                    INSERT INTO dbo.TB_PLANES (Code, Name, PlanType, MaxDoctors, MaxAssistants, AllowDictationAi, AllowFinanceBcv, AllowedSpecialtiesJson, PriceUsdMonthly)
                    VALUES
                        ('PERSONAL_BASIC', 'Médico Personal Básico', 'PERSONAL', 1, 0, 0, 0, '["pediatria"]', 19.00),
                        ('PERSONAL_PRO', 'Médico Personal Pro + IA', 'PERSONAL', 1, 1, 1, 0, '["pediatria","gastroenterologia"]', 39.00),
                        ('CLINIC_STD', 'Clínica Estándar', 'CLINIC', 5, 3, 0, 1, '["pediatria","gastroenterologia"]', 79.00),
                        ('CLINIC_PRO', 'Clínica Pro + IA', 'CLINIC', 20, 10, 1, 1, '["pediatria","gastroenterologia","medicina_general"]', 149.00);
                END

                IF OBJECT_ID('dbo.TB_SUSCRIPCIONES', 'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.TB_SUSCRIPCIONES (
                        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
                        OwnerType NVARCHAR(20) NOT NULL,
                        OwnerId UNIQUEIDENTIFIER NOT NULL,
                        PlanId INT NOT NULL,
                        Status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                        StartsAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        ExpiresAt DATETIME2 NOT NULL,
                        DictationOverride BIT NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                    );
                END

                IF OBJECT_ID('dbo.TB_CLINICA_INVITACIONES', 'U') IS NULL
                BEGIN
                    CREATE TABLE dbo.TB_CLINICA_INVITACIONES (
                        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
                        ClinicId UNIQUEIDENTIFIER NOT NULL,
                        DoctorUserId UNIQUEIDENTIFIER NOT NULL,
                        InvitedByUserId UNIQUEIDENTIFIER NOT NULL,
                        Status NVARCHAR(30) NOT NULL DEFAULT 'PENDING_DOCTOR',
                        ExpiresAt DATETIME2 NOT NULL,
                        DoctorAcceptedAt DATETIME2 NULL,
                        ClinicConfirmedAt DATETIME2 NULL,
                        ClinicConfirmedByUserId UNIQUEIDENTIFIER NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                    );
                END
                """;

            await conn.ExecuteAsync(new CommandDefinition(sql, cancellationToken: cancellationToken));
            _logger.LogInformation("DatabaseSchemaInitializer: esquema verificado correctamente.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "DatabaseSchemaInitializer: no se pudo inicializar el esquema al arranque (se continuará normalmente).");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
