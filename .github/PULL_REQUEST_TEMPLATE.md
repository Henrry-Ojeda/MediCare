## Descripción del Cambio
- ¿Qué se corrigió o agregó?

## Ambiente Destino
- [ ] `develop` (Desarrollo)
- [ ] `qa` (Pruebas QA — viene desde `develop`)
- [ ] `main` (PRODUCCIÓN — **solo desde `qa` o `hotfix/*` y con autorización**)

## Checklist Obligatorio antes de Aprobar
- [ ] `npm run lint` (`tsc --noEmit`) sin errores.
- [ ] `npm run build` exitoso.
- [ ] `dotnet build Backend/MediCare.sln` sin errores.
- [ ] Si hubo cambios en SQL (`Database/`), el script fue probado primero en **DEV** y **QA**.
- [ ] Probado funcionalmente en **QA** (roles: `MEDICO`, `ASISTENTE`, `ADMIN`, `SUPERADMIN`).

