# PLAN.md — MediCare (Web + Backend .NET 8)

## Proyecto y Rutas
- **Repositorio Web + Backend:** `c:\Users\Usuario\source\repos\MediCare` (ramas `develop` → `qa` → `main`)
- **Repositorio App Móvil Flutter relacionado:** `c:\Users\Usuario\source\repos\MediCare_App_Movil` (rama `develop`)
- **API Producción (VPS):** `http://84.247.178.194:5189/api`
- **Base de Datos:** SQL Server (`BD_MEDICARE`)

## Decisiones de Arquitectura y Reglas Permanentes
1. **Multi-Especialidad Componible (N:M):** Rol clínico unificado `MEDICO` vinculado a 1..N especialidades (`TB_MEDICO_ESPECIALIDADES`: Pediatría hoy, Medicina General, Gastroenterología, Cardiología a futuro). Consulta basada en **Núcleo Común + Plugins enchufables** (sin módulos combinados), guardando bloques por clave en `SpecialtyExamJson`.
2. **Privacidad clínica estricta:** Motivo/anamnesis, examen físico, diagnóstico CIE-10, guía de cuidados y signos de alarma son privados del médico autor (`HasDiagnosisAccess`); solo accesibles por permiso aprobado en `TB_PERMISOS_DIAGNOSTICO` (con flujo de solicitud/aprobación/rechazo). Triaje, récipe/medicamentos, nombre del doctor, alergias, vacunas y curva OMS son visibles. Exámenes médicos compartidos solo dentro de la misma clínica (`ClinicId`).
3. **Paciente único portátil (sin doctor fijo):** Listado por defecto "Mis Pacientes" paginado + búsqueda exacta por cédula/historia (`lookup`) para vincular pacientes sin duplicar fichas.
4. **Antropometría OMS 3-en-1:** Comparativa Actual vs. Anterior vs. OMS si existe historial previo, o Primera Evaluación OMS si no existe.
5. **Récipe personalizado por médico:** Plantilla independiente por `DoctorUserId` en `TB_PLANTILLAS_RECETA`.
6. **Dictado Clínico IA por plan:** Habilitado exclusivamente por `SUPERADMIN`/Administrador según plan (`DictationEnabled`); el médico no ve ni edita ese ajuste ni `ia-modulo`.
7. **Finanzas / BCV:** Se conserva para el **Plan Clínico**, desacoplado en su propio `FinanceContext.tsx`.
8. **Modelo SaaS (separado del núcleo clínico):**
   - Planes: `PERSONAL` (con/sin asistente personal) y `CLINIC` (asistentes compartidos de clínica, médicos, Finanzas/BCV).
   - Roles: `SUPERADMIN` (único que crea clínicas y gestiona planes), `ADMIN` (solo SU clínica), `GERENTE` (solo SU clínica, coordina salidas y traspasos con `CutoffDate`), `MEDICO` (Privado y/o 1..N Clínicas con selector de contexto), `ASISTENTE` (Clínica o Personal).
   - Asociación Médico Personal ↔ Clínica con **doble confirmación y caducidad de 24h**.
9. **Regla Git en Windows:** Usar siempre `Backend/...` (con `B` mayúscula) en `git add`.

## Estado Actual
- **Desplegado / Promovido a `main` (PR #28):** Privacidad de diagnóstico + guía/alarmas, solicitud/aprobación/rechazo de permisos, récipe por médico, hidratación Patient 360, OMS 3-en-1, y `DictationEnabled` controlado por admin (pendiente aprobación manual de `Deploy - Ambiente PRODUCCION` run `45271100123`).
- **App Móvil Flutter (`develop` `73663db`):** Paridad en sesión (`userId`, `roleCode`, `dictationEnabled`), privacidad + solicitud/aprobación en `Patient360Screen`, y OMS 3-en-1 en `ConsultationScreen`.
- **Completado en `develop` (Track A — Núcleo Clínico):**
  - Aislamiento de agenda por médico/asistente y validación global de colisión de horarios (`AppointmentsController.cs`).
  - `ia-modulo` restringido solo a `ADMIN` (testado en `permissions.test.ts`).
  - Sala de Espera habilitada para médicos sin asistente (`App.tsx`, `Sidebar.tsx`, `WaitingRoomView.tsx`).
  - Notificación automática al médico autor al solicitar permiso de diagnóstico (`DiagnosisPermissionsController.cs`).
  - Eliminación de duplicados: endpoints viejos en `PatientsController.cs` + `medicareApi.ts`, vista duplicada `AdminUsersView.tsx`.
  - Code-splitting real en Vite (`index.js` bajó de `608 kB` a `437 kB` sin warnings).
  - `DatabaseSchemaInitializer.cs` en arranque de API (incluye `TB_MEDICO_ESPECIALIDADES` y `ClinicId`).
  - `GET /api/patients` paginado + `GET /api/patients/lookup?document=...` para paciente portátil.
  - `FinanceContext.tsx` desacoplado para Plan Clínico, `assets.ts` extraído y plantillas demo de dictado solo en `DEV`.
  - `registry.ts` actualizado con resolución componible multi-especialidad N:M y `AuthController.cs` devolviendo `specialties`.
- **Siguiente hito inmediato (`M-16`):** Crear el módulo independiente de **Gastroenterología** (`src/modules/especialidades/gastroenterologia/`) con toda la información clínica de la especialidad (Bristol, reflujo, cuadrantes, antecedentes endoscópicos, plan dietético, CIE-10 digestivo) y realizar pruebas de vista en 3 escenarios (Solo Pediatría, Solo Gastro adulto, Gastro Pediátrica combinada).
- **Pendiente posterior (Track B — Plataforma SaaS `S-01`–`S-10`):** Roles `SUPERADMIN`/`ADMIN`/`GERENTE`, doble confirmación 24h, traspaso con `CutoffDate`, planes y suscripciones.

## Comandos Clave de Verificación
```powershell
npm run lint
npm run build
npx vitest run
dotnet test Backend\MediCare.Tests\MediCare.Tests.csproj
```
