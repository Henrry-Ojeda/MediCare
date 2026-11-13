-- ====================================================================
-- SCRIPT PARA DB_SAAS_MASTER (Transporte_SaaS_Manager)
-- Habilita soporte Multi-Producto ('TRANSPORTE' y 'MEDICARE')
-- y registra los módulos y especialidades de MediCare.
-- ====================================================================

USE DB_SAAS_MASTER;
GO

-- 1. Agregar columna ProductoCodigo a TB_MODULOS_SISTEMA si no existe
IF COL_LENGTH('dbo.TB_MODULOS_SISTEMA', 'ProductoCodigo') IS NULL
BEGIN
    ALTER TABLE dbo.TB_MODULOS_SISTEMA
    ADD ProductoCodigo NVARCHAR(30) NOT NULL CONSTRAINT DF_TB_MODULOS_ProductoCodigo DEFAULT ('TRANSPORTE');
END
GO

-- 2. Agregar columna ProductoCodigo a TB_EMPRESAS si no existe
IF OBJECT_ID('dbo.TB_EMPRESAS', 'U') IS NOT NULL AND COL_LENGTH('dbo.TB_EMPRESAS', 'ProductoCodigo') IS NULL
BEGIN
    ALTER TABLE dbo.TB_EMPRESAS
    ADD ProductoCodigo NVARCHAR(30) NOT NULL CONSTRAINT DF_TB_EMPRESAS_ProductoCodigo DEFAULT ('TRANSPORTE');
END
GO

-- 2.1 Registrar Producto 'MEDICARE' en TB_PRODUCTOS_SAAS si no existe
IF OBJECT_ID('dbo.TB_PRODUCTOS_SAAS', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.TB_PRODUCTOS_SAAS WHERE Codigo = 'MEDICARE')
        INSERT INTO dbo.TB_PRODUCTOS_SAAS (Codigo, Nombre, Descripcion, Icono, Color, Estado)
        VALUES ('MEDICARE', 'MediCare Clínico Multi-Especialidad', 'Sistema clínico SaaS: Historia 360°, vacunas, caja multimoneda y Copiloto IA', 'Stethoscope', '#0284C7', 'ACTIVO');
END
GO

-- 3. Registrar Módulos Funcionales de MediCare (ProductoCodigo = 'MEDICARE')
IF NOT EXISTS (SELECT 1 FROM dbo.TB_MODULOS_SISTEMA WHERE Codigo = 'med_auth')
    INSERT INTO dbo.TB_MODULOS_SISTEMA (Codigo, Nombre, Descripcion, EsModuloBase, Orden, ProductoCodigo)
    VALUES ('med_auth', 'Autenticación y Auditoría', 'Login multi-tenant, perfil médico, roles y bitácora de auditoría', 1, 101, 'MEDICARE');

IF NOT EXISTS (SELECT 1 FROM dbo.TB_MODULOS_SISTEMA WHERE Codigo = 'med_agenda')
    INSERT INTO dbo.TB_MODULOS_SISTEMA (Codigo, Nombre, Descripcion, EsModuloBase, Orden, ProductoCodigo)
    VALUES ('med_agenda', 'Agenda y Sala de Espera', 'Agenda médica, sala de espera virtual Kanban y triaje rápido', 1, 102, 'MEDICARE');

IF NOT EXISTS (SELECT 1 FROM dbo.TB_MODULOS_SISTEMA WHERE Codigo = 'med_pacientes')
    INSERT INTO dbo.TB_MODULOS_SISTEMA (Codigo, Nombre, Descripcion, EsModuloBase, Orden, ProductoCodigo)
    VALUES ('med_pacientes', 'Pacientes 360°', 'Directorio de pacientes, historia clínica integral y estudios médicos', 1, 103, 'MEDICARE');

IF NOT EXISTS (SELECT 1 FROM dbo.TB_MODULOS_SISTEMA WHERE Codigo = 'med_consulta_ia')
    INSERT INTO dbo.TB_MODULOS_SISTEMA (Codigo, Nombre, Descripcion, EsModuloBase, Orden, ProductoCodigo)
    VALUES ('med_consulta_ia', 'Consulta Activa + Copiloto IA', 'Dictado clínico estructurado con Gemini AI, recetas y guía al paciente', 0, 104, 'MEDICARE');

IF NOT EXISTS (SELECT 1 FROM dbo.TB_MODULOS_SISTEMA WHERE Codigo = 'med_vacunacion')
    INSERT INTO dbo.TB_MODULOS_SISTEMA (Codigo, Nombre, Descripcion, EsModuloBase, Orden, ProductoCodigo)
    VALUES ('med_vacunacion', 'Vacunación y Carnet Digital', 'Catálogo maestro de vacunas y control de dosis aplicadas', 0, 105, 'MEDICARE');

IF NOT EXISTS (SELECT 1 FROM dbo.TB_MODULOS_SISTEMA WHERE Codigo = 'med_caja_finanzas')
    INSERT INTO dbo.TB_MODULOS_SISTEMA (Codigo, Nombre, Descripcion, EsModuloBase, Orden, ProductoCodigo)
    VALUES ('med_caja_finanzas', 'Caja y Facturación Multimoneda', 'Cobros USD/VES, tasa BCV y emisión de recibos', 0, 106, 'MEDICARE');

IF NOT EXISTS (SELECT 1 FROM dbo.TB_MODULOS_SISTEMA WHERE Codigo = 'med_reportes_epidemiologia')
    INSERT INTO dbo.TB_MODULOS_SISTEMA (Codigo, Nombre, Descripcion, EsModuloBase, Orden, ProductoCodigo)
    VALUES ('med_reportes_epidemiologia', 'Reportes y Epidemiología', 'Analítica clínica y vigilancia epidemiológica CIE-10', 0, 107, 'MEDICARE');

IF NOT EXISTS (SELECT 1 FROM dbo.TB_MODULOS_SISTEMA WHERE Codigo = 'med_configuracion')
    INSERT INTO dbo.TB_MODULOS_SISTEMA (Codigo, Nombre, Descripcion, EsModuloBase, Orden, ProductoCodigo)
    VALUES ('med_configuracion', 'Configuración y Plantillas', 'Ajustes de clínica, diseñador de recetas y suscripción SaaS', 1, 108, 'MEDICARE');

-- 4. Registrar Especialidades Activables por Clínica (ProductoCodigo = 'MEDICARE')
IF NOT EXISTS (SELECT 1 FROM dbo.TB_MODULOS_SISTEMA WHERE Codigo = 'esp_pediatria')
    INSERT INTO dbo.TB_MODULOS_SISTEMA (Codigo, Nombre, Descripcion, EsModuloBase, Orden, ProductoCodigo)
    VALUES ('esp_pediatria', 'Especialidad: Pediatría', 'Ficha perinatal, curvas de crecimiento infantil y control pediátrico', 1, 201, 'MEDICARE');

IF NOT EXISTS (SELECT 1 FROM dbo.TB_MODULOS_SISTEMA WHERE Codigo = 'esp_ginecologia')
    INSERT INTO dbo.TB_MODULOS_SISTEMA (Codigo, Nombre, Descripcion, EsModuloBase, Orden, ProductoCodigo)
    VALUES ('esp_ginecologia', 'Especialidad: Ginecología', 'Historia gineco-obstétrica, control prenatal y citologías', 0, 202, 'MEDICARE');

IF NOT EXISTS (SELECT 1 FROM dbo.TB_MODULOS_SISTEMA WHERE Codigo = 'esp_cardiologia')
    INSERT INTO dbo.TB_MODULOS_SISTEMA (Codigo, Nombre, Descripcion, EsModuloBase, Orden, ProductoCodigo)
    VALUES ('esp_cardiologia', 'Especialidad: Medicina Interna / Cardiología', 'Evaluación cardiovascular, riesgo y seguimiento crónico', 0, 203, 'MEDICARE');

IF NOT EXISTS (SELECT 1 FROM dbo.TB_MODULOS_SISTEMA WHERE Codigo = 'esp_traumatologia')
    INSERT INTO dbo.TB_MODULOS_SISTEMA (Codigo, Nombre, Descripcion, EsModuloBase, Orden, ProductoCodigo)
    VALUES ('esp_traumatologia', 'Especialidad: Traumatología', 'Evaluación osteomuscular, lesiones y rehabilitación', 0, 204, 'MEDICARE');

IF NOT EXISTS (SELECT 1 FROM dbo.TB_MODULOS_SISTEMA WHERE Codigo = 'esp_dermatologia')
    INSERT INTO dbo.TB_MODULOS_SISTEMA (Codigo, Nombre, Descripcion, EsModuloBase, Orden, ProductoCodigo)
    VALUES ('esp_dermatologia', 'Especialidad: Dermatología', 'Evaluación dermatológica, lesiones cutáneas y seguimiento', 0, 205, 'MEDICARE');
GO

