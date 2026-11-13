-- V001: Tabla de control de versiones de migraciones SQL (BD_MEDICARE)
IF OBJECT_ID('dbo.TB_SCHEMA_VERSIONS', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_SCHEMA_VERSIONS (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ScriptName NVARCHAR(200) NOT NULL UNIQUE,
        AppliedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        AppliedBy NVARCHAR(120) NULL DEFAULT SUSER_SNAME()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.TB_SCHEMA_VERSIONS WHERE ScriptName = 'V001__Create_SchemaVersions.sql')
    INSERT INTO dbo.TB_SCHEMA_VERSIONS (ScriptName) VALUES ('V001__Create_SchemaVersions.sql');
GO
