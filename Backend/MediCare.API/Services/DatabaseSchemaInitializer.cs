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
