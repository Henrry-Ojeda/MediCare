# Migraciones SQL Controladas (`DEV -> QA -> PROD`)

1. Todo cambio incremental de esquema después de `01_Init_BD_MEDICARE.sql` debe crearse aquí como `V###__Descripcion.sql`.
2. Cada script debe ser **idempotente** y verificar `dbo.TB_SCHEMA_VERSIONS` antes de aplicarse.
3. Orden obligatorio:
   - Probar primero en `BD_MEDICARE_DEV`.
   - Promover por PR a `qa` y ejecutar en `BD_MEDICARE_QA`.
   - Hacer **backup previo** de `BD_MEDICARE_PROD` antes de ejecutar cualquier migración aprobada en `main`.
