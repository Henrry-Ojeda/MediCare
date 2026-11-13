-- V002: Soporte de Asistente Personal y Asistente Compartida de Clínica
IF EXISTS (SELECT 1 FROM dbo.TB_SCHEMA_VERSIONS WHERE ScriptName = 'V002__Asistente_Medicos.sql')
BEGIN
    PRINT 'V002__Asistente_Medicos.sql ya fue aplicada previamente.';
    RETURN;
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.TB_ROLES WHERE Codigo = 'ASISTENTE')
    INSERT INTO dbo.TB_ROLES (Codigo, Nombre, Descripcion)
    VALUES ('ASISTENTE', 'Asistente Médica', 'Asistente personal o compartida: agenda, pospone citas, registra información y gestiona cobros');
GO

IF OBJECT_ID('dbo.TB_ASISTENTE_MEDICOS', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TB_ASISTENTE_MEDICOS (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        AsistenteUserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_USUARIOS(Id),
        MedicoUserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.TB_USUARIOS(Id),
        TipoAsignacion NVARCHAR(30) NOT NULL DEFAULT 'PERSONAL',
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

INSERT INTO dbo.TB_SCHEMA_VERSIONS (ScriptName) VALUES ('V002__Asistente_Medicos.sql');
GO
