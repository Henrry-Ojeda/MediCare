# MedCore AI — SaaS Médico Ambulatorio Multi-Especialidad & EMR con Copiloto Clínico

Plataforma integral de Historia Clínica Electrónica (EMR), Gestión Ambulatoria Multi-Especialidad (Pediatría, Ginecología, Medicina Interna/Cardiología, Traumatología y Dermatología), Vacunación OMS, Facturación Bimoneda (USD/VES BCV) y Copiloto Clínico impulsado por Inteligencia Artificial, estructurada a través de las **24 vistas operativas completas**.

## User Review & Critical Decisions

> [!IMPORTANT]
> Las siguientes decisiones estratégicas han sido confirmadas e integradas en la arquitectura del sistema:

- **Decisión Confirmada 1 — Flujo de Entrada y Navegación de las 24 Vistas**: La aplicación iniciará en la **Vista 1: Login Multi-Tenant (`/login`)** con credenciales institucionales listas para acceder con un clic, enlaces directos a Recuperación (`/recuperar-password`), Restablecimiento (`/reset-password`) y Onboarding de Consultorio (`/onboarding`). Además, dentro de toda la plataforma existirá un **Selector Rápido de las 24 Vistas (Command Switcher)** en la barra superior para saltar instantáneamente a cualquier vista o modal sin fricción.
- **Decisión Confirmada 2 — Copiloto Clínico de IA Híbrido (Voz + Gemini API Server-Side + Modo Demo Instantáneo)**: El puesto de consulta activa (`/consulta/:id`) contará con reconocimiento de voz en vivo (Web Speech API + visualizador de ondas de audio), un botón de **Simulación de Dictado Clínico Instantáneo** y procesamiento real en servidor mediante `gemini-3.8-flash` con esquema JSON estructurado para autocompletar enfermedad actual, examen físico por sistemas, código CIE-10, cálculo de dosis pediátrica por kg de peso, guía empática para padres y signos de alarma.
- **Decisión Confirmada 3 — Persistencia Local Reactiva con Casos Multi-Especialidad Precargados**: Estado global sincronizado en `localStorage` con casos clínicos realistas precargados (pacientes pediátricos con curvas OMS y esquemas de vacunación, control prenatal ginecológico, cardiología/medicina interna, traumatología y dermatología), permitiendo crear, editar y persistir citas, signos vitales de triaje, vacunas, consultas, cobros en caja y plantillas.

---

## 1. Overview & Core Concept

- **What It Does**: Unifica todo el flujo operativo de una clínica o consultorio médico ambulatorio moderno: desde la autenticación multi-tenant y el onboarding institucional hasta la recepción/sala de espera Kanban en tiempo real, triaje de enfermería, expediente clínico 360° con curvas OMS, carnet digital de vacunación, puesto de consulta asistido por voz e IA con despacho automático de récipes por WhatsApp/PDF, cuaderno de caja bimoneda (USD/VES con tasa BCV), analítica epidemiológica CIE-10 y configuración SaaS.
- **Target Audience / Persona**: Médicos especialistas (Pediatras, Ginecólogos, Internistas, Cardiólogos, Traumatólogos, Dermatólogos), asistentes de enfermería/triaje y personal de recepción/administración clínica.
- **Key Value**: Permite al médico completar una consulta documentada al 100% y despachar el récipe legal más la guía educativa para la familia en **menos de 3 minutos**, eliminando la carga de tipeo manual y los errores de cálculo de dosis por peso.

---

## 2. User Experience & Visual Design

### Key User Flows (24 Vistas Completas)

1. **Módulo 1 — Autenticación, Onboarding y Seguridad (Vistas 1 a 6)**:
   - **Vista 1 (`/login`)**: Pantalla dividida 50/50 con ilustración médica de alta resolución, insignia de cifrado médico de punto a punto, testimonio de colega especialista y formulario de ingreso con alerta flotante ante credenciales erróneas y spinner interactivo.
   - **Vista 2 (`/recuperar-password`)**: Tarjeta centrada con ícono de candado médico, ingreso de correo y animación de confirmación de enlace enviado.
   - **Vista 3 (`/reset-password`)**: Formulario de nueva clave con medidor reactivo de fortaleza (8+ caracteres, mayúsculas, números, símbolos) y validación de coincidencia.
   - **Vista 4 (`/onboarding`)**: Stepper horizontal interactivo de 4 pasos (1. Identidad y subdominio, 2. Especialidades y colegiatura MPPS/CM, 3. Carga drag-and-drop de logo, firma y sello húmedo con recorte transparente, 4. Monedas USD/VES y sincronización BCV).
   - **Vista 5 (`/perfil`)**: Cabecera editable del médico con pestañas de *Datos Personales* y *Credenciales Médicas* (visor seguro de firma digital, sello, membrete y switch 2FA).
   - **Vista 6 (`/seguridad/auditoria`)**: Tabla inmutable de auditoría del tenant con filtros por fecha, usuario y tipo de acción, IP y filas expandibles con visor de diferencias JSON (`diff` entre valor anterior y valor nuevo).

2. **Módulo 2 — Agenda, Recepción y Sala de Espera (Vistas 7 a 9)**:
   - **Vista 7 (`/agenda`)**: Calendario interactivo con vistas Mes, Semana, Día y Lista; filtros por médico y especialidad; creación de citas y tarjetas codificadas por color (Azul: Control Sano, Rojo: Urgencia/Fiebre, Verde: Vacunación, Púrpura: Primera Vez); reprogramación rápida y modal de paciente con enlace directo a WhatsApp.
   - **Vista 8 (`/sala-espera`)**: Tablero Kanban de 4 columnas (*Programados para Hoy*, *En Sala de Espera* con cronómetro en vivo de minutos de espera, *En Triaje / Toma de Signos*, *En Consulta con el Médico*), con botones de "Pasar a Triaje" y "Llamar a Consultorio" con alerta visual y sonora suave.
   - **Vista 9 (Modal de Triaje Rápido)**: Modal centrado con inputs numéricos grandes (`tabular-nums`) para Peso (kg), Talla (cm), Perímetro Cefálico (cm, habilitado automáticamente si el paciente es menor de 3 años), Temperatura (°C), FC (lpm), SpO2 (%) y Tensión Arterial (Sistólica/Diastólica), que guarda los signos y mueve al paciente en el tablero.

3. **Módulo 3 — Directorio Integral de Pacientes (Vistas 10 a 12)**:
   - **Vista 10 (`/pacientes`)**: Buscador inteligente con debounce por nombre, N° de historia, cédula o teléfono del representante; filas con edad desglosada exacta (`3 años, 4 meses`), contacto WhatsApp del tutor, alerta clínica roja para alergias severas y acciones rápidas (`Iniciar Consulta Ahora` / `Ver Expediente`).
   - **Vista 11 (`/pacientes/:id`)**: Expediente 360° con cabecera persistente (Foto, edad exacta, grupo sanguíneo, tarjeta roja de alergias críticas con `AlertTriangle`, teléfonos) y 4 pestañas interactivas: *Línea de Tiempo (Timeline)*, *Ficha Perinatal / Antecedentes* (semanas de gestación, Apgar 1'/5', peso/talla al nacer, tipo de parto), *Curvas de Crecimiento OMS* (gráficos SVG interactivos de percentiles P3, P15, P50, P85, P97 para Peso/Edad, Talla/Edad e IMC) y *Archivos y Estudios* con visor modal.
   - **Vista 12 (`/pacientes/nuevo`)**: Registro guiado en 3 bloques (Datos del Paciente con cálculo automático de edad exacta, Datos del Representante Legal y Antecedentes Médicos/Alergias).

4. **Módulo 4 — Vacunación Pediátrica y Preventiva (Vistas 13 a 15)**:
   - **Vista 13 (`/pacientes/:id/vacunas`)**: Matriz cronológica interactiva por hitos de edad (Al nacer, 2m, 4m, 6m, 12m, 18m, 5 años) con tarjetas de dosis en Verde (Aplicada con fecha, lote y responsable), Amarillo (Pendiente en edad óptima) y Gris (Futura programada).
   - **Vista 14 (Modal de Aplicación Rápida de Dosis)**: Modal al hacer clic en cualquier dosis para registrar número de dosis, lote del frasco, laboratorio fabricante, fecha y observaciones clínicas.
   - **Vista 15 (`/configuracion/vacunas`)**: Catálogo maestro administrativo para activar, desactivar o crear nuevas vacunas en el esquema oficial del consultorio.

5. **Módulo 5 — La Consulta Médica Activa con Copiloto IA (Vistas 16 y 17)**:
   - **Vista 16 (`/consulta/:id`)**:
     - *Barra Flotante Superior del Copiloto IA*: Botón violeta vibrante (`#7C3AED`), visualizador de ondas de sonido en vivo, cronómetro de grabación, botón de pausa, selector de dictado demostrativo y botón **`Procesar Consulta con IA`** con estados de progreso claros.
     - *Columna Izquierda (Exploración Clínica)*: Antropometría del día con cálculo automático en tiempo real de IMC y percentil OMS; Motivo de Consulta y Enfermedad Actual; Examen Físico segmentado (General, Cabeza/Cuello, Cardiopulmonar, Abdomen, Extremidades); Diagnóstico CIE-10 con buscador predictivo oficial.
     - *Columna Derecha (Prescripción y Educación)*: Tabla dinámica de Récipe Farmacológico con sugerencia automática de dosis en `mg` y `ml` según el peso en `kg` del paciente; Guía para Padres/Paciente redactada con empatía; Checkboxes de Signos de Alarma Críticos.
     - *Footer Fijo*: Estado de consulta, `Guardar Borrador` y **`Finalizar Consulta y Despachar Documentos`**.
   - **Vista 17 (Modal de Previsualización y Despacho Automatizado)**: Visor interactivo de 2 páginas (Página 1: Récipe Legal con membrete, firma, sello y QR de autenticidad; Página 2: Guía Didáctica Ilustrada con tabla horaria y signos de alarma) más switches de envío por WhatsApp y Correo e impresión directa.

6. **Módulo 6 — Caja, Facturación y Pagos (Vistas 18 y 19)**:
   - **Vista 18 (`/caja`)**: Cabecera financiera con indicador editable de Tasa Oficial BCV (`Bs./USD`), totales recaudados en USD y Bolívares, tabla de cobros del día (Pago Móvil, Punto de Venta, Efectivo USD, Zelle) y modal para registrar nuevos pagos con conversión automática.
   - **Vista 19 (`/caja/recibos`)**: Histórico de recibos con buscador y generador en 1 clic de comprobante membretado para reembolso ante aseguradoras (Mercantil, Caracas, Pirámide, etc.).

7. **Módulo 7 — Reportes, Analítica y Epidemiología (Vistas 20 y 21)**:
   - **Vista 20 (`/reportes`)**: Tarjetas KPI superiores y gráficos interactivos (Barras de consultas por día y horas pico, Dona de Top 5 patologías diagnosticadas, Líneas de evolución de ingresos multimoneda).
   - **Vista 21 (`/reportes/epidemiologia`)**: Tabla oficial filtrable por código CIE-10, grupo etario y sexo, con exportación instantánea a archivo CSV/Excel compatible con el reporte de morbilidad ambulatoria del Ministerio de Salud.

8. **Módulo 8 — Configuración Institucional y Suscripción SaaS (Vistas 22 a 24)**:
   - **Vista 22 (`/configuracion`)**: Formulario de Razón Social, RIF, especialidades activas, horarios de atención y ubicación física.
   - **Vista 23 (`/configuracion/plantillas`)**: Diseñador visual WYSIWYG con alineación de logotipo (Izquierda, Centro, Derecha), tipografía, color corporativo y vista previa en vivo de la hoja de récipe.
   - **Vista 24 (`/configuracion/suscripcion`)**: Tarjeta de Plan Activo (*Plan Élite Copiloto IA*), barras de progreso de consumo mensual (Minutos de IA, Envíos de WhatsApp, Consultas del ciclo), reporte de pago de suscripción y comparativa para escalar de plan.

### Visual Identity & Theme

- **Aesthetic Direction**: Pulcritud clínica contemporánea, serenidad luminosa y agilidad operativa. Superficies blancas nítidas (`#FFFFFF`) sobre lienzo neutro frío (`#F8FAFC`), con bordes sutiles de `1px` (`border-slate-200/80`) y jerarquía visual clara.
- **Color Palette & Mood**:
  - **Clínico Primario**: `#F0F9FF` (`sky-50`), `#0EA5E9` (`sky-500`), `#0284C7` (`sky-600`), `#0369A1` (`sky-700`).
  - **Salud & Pediatría**: `#ECFDF5` (`emerald-50`), `#10B981` (`emerald-500`), `#059669` (`emerald-600`).
  - **Copiloto de IA**: `#F5F3FF` (`violet-50`), `#8B5CF6` (`violet-500`), `#7C3AED` (`violet-600`).
  - **Semáforo Clínico**: Alerta `#F59E0B` (`amber-500`), Peligro/Alergia Crítica `#E11D48` (`rose-600`), Sala de Espera `#38BDF8` (`sky-400`).
- **Typography & Hierarchy**:
  - **Display & UI**: `Plus Jakarta Sans` (pesos 500, 600, 700) para encabezados, navegación y etiquetas clínicas claras.
  - **Datos Clínicos, Dosis y Finanzas**: `JetBrains Mono` y `tabular-nums` obligatorio en signos vitales (`kg`, `cm`, `mmHg`, `°C`, `% O2`), calculadoras de dosis (`mg/kg/día`, `ml`), cronómetros de espera, códigos CIE-10 y montos bimoneda (`USD` / `VES`).
- **Interactive Feedback & Motion**: Transiciones fluidas con Framer Motion (`initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}`) en todos los modales (Triaje, Aplicación de Vacuna, Previsualización de Récipe PDF, Registro de Pago), estados vacíos ilustrados con acción directa y skeletons de carga.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Enrutador Interno Unificado + Barra de Salto Rápido a las 24 Vistas**:
  - *Chosen Approach*: Implementar un sistema de navegación que soporta tanto el flujo natural desde `/login` (con rutas públicas y privadas) como un selector rápido superior ("Explorar 24 Vistas") y accesos contextuales para abrir directamente cualquiera de las 24 vistas (incluyendo las 3 vistas modales: Vista 9 Triaje, Vista 14 Aplicación de Vacuna y Vista 17 Despacho de Récipe).
  - *Why*: Permite evaluar y auditar las 24 vistas numeradas en segundos sin perder la experiencia realista de iniciar sesión como médico especialista.
- **Decision 2 — Copiloto IA con Backend Express + Gemini 3.8 Flash y Fallback Clínico Inteligente**:
  - *Chosen Approach*: Ruta de servidor `/api/ai/process-consultation` que invoca `gemini-3.8-flash` con `responseSchema` estricto para estructurar la transcripción libre del médico en campos clínicos, diagnóstico CIE-10, prescripción pediátrica/adulto ajustada al peso y guía para la familia. Incluye además plantillas de dictado clínico por especialidad para pruebas en 1 clic.
  - *Why*: Garantiza seguridad de la API key en el servidor (`process.env.GEMINI_API_KEY`) y velocidad inmediata durante demostraciones en vivo.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        MedCore AI — Application Shell                        │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Top Bar & Quick 24-View Switcher (Búsqueda, Especialidad, Tasa BCV)    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│         │                                                        │           │
│         ▼ (Vistas Públicas 1–4)                                  ▼           │
│  ┌─────────────────────────────┐   ┌──────────────────────────────────────┐  │
│  │ Módulo 1: Auth & Onboarding │   │ AppLayout (Sidebar + Main Viewport)  │  │
│  │ • Vista 1: Login MultiTenant│   │  ├─ Módulo 1 (Vistas 5–6): Perfil,   │  │
│  │ • Vista 2: Recuperar Clave  │   │  │   Seguridad y Auditoría JSON Diff │  │
│  │ • Vista 3: Reset Password   │   │  ├─ Módulo 2 (Vistas 7–9): Agenda,   │  │
│  │ • Vista 4: Onboarding 4-Step│   │  │   Sala Espera Kanban + Modal Triaje│  │
│  └─────────────────────────────┘   │  ├─ Módulo 3 (Vistas 10–12):         │  │
│                                    │  │   Directorio, Ficha 360° + OMS,   │  │
│                                    │  │   Nuevo Paciente                  │  │
│                                    │  ├─ Módulo 4 (Vistas 13–15): Carnet  │  │
│                                    │  │   Vacunas, Modal Dosis, Catálogo  │  │
│                                    │  ├─ Módulo 5 (Vistas 16–17):         │  │
│  ┌─────────────────────────────┐   │  │   Puesto Consulta IA + Modal PDF  │  │
│  │ Backend Server (Express)    │◄──┼──┤  ├─ Módulo 6 (Vistas 18–19):      │  │
│  │ POST /api/ai/consultation   │   │  │   Caja BCV + Recibos Seguros      │  │
│  │ • @google/genai SDK         │   │  ├─ Módulo 7 (Vistas 20–21):         │  │
│  │ • Model: gemini-3.8-flash   │   │  │   Dashboard KPI + Epidemiología   │  │
│  │ • Structured JSON Schema    │   │  └─ Módulo 8 (Vistas 22–24): Tenant, │  │
│  └─────────────────────────────┘   │      Plantillas WYSIWYG, Suscripción │  │
│                                    └──────────────────────────────────────┘  │
│                                                      │                       │
│                                                      ▼                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Reactive Medical Store (Context + localStorage Persistence)            │  │
│  │ Pacientes • Citas & Sala Espera • Vacunas • Consultas • Caja • Logs    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **`Patient`**: Identificación, fecha de nacimiento, cálculo dinámico de edad exacta (años, meses), sexo, grupo sanguíneo, alergias severas (`criticalAllergies`), datos del representante legal (nombre, parentesco, cédula, WhatsApp, email), antecedentes perinatales (semanas de gestación, Apgar 1'/5', peso/talla neonatal, parto), mediciones históricas de crecimiento OMS (`weightKg`, `heightCm`, `headCircumferenceCm`, `date`), esquema individual de vacunas y archivos adjuntos.
- **`Appointment` & `WaitingRoomItem`**: Cita vinculada a paciente, especialidad, médico, motivo, categoría cromática (`control`, `urgencia`, `vacunacion`, `primera_vez`), estado Kanban (`programado`, `en_sala`, `en_triaje`, `en_consulta`, `completado`), hora de llegada y signos vitales registrados en triaje.
- **`ConsultationRecord`**: Signos vitales y antropometría del día, IMC y percentil OMS calculados, transcripción del dictado, enfermedad actual, examen físico por sistemas, diagnóstico CIE-10 (`code`, `name`), lista de medicamentos con cálculo de dosis por peso, guía para padres e indicadores de signos de alarma.
- **`FinancialTransaction` & `AuditLogEntry`**: Cobros con monto en USD, tasa BCV aplicada, equivalente en Bs., método de pago, aseguradora para reembolso, y registros inmutables de auditoría con `previousValue` y `newValue` en JSON.

### Interactive Component & State Mapping

- **Cálculo Antropométrico y Farmacológico en Vivo**: Al modificar el peso (`kg`) o talla (`cm`) en el Modal de Triaje (Vista 9) o en la Consulta Activa (Vista 16), se recalcula instantáneamente el IMC, el percentil OMS estimado y las dosis sugeridas en `mg` y `ml` de cada medicamento del récipe.
- **Sincronización Entre Módulos**:
  - Registrar signos en el **Modal de Triaje (Vista 9)** actualiza el estado del paciente en la **Sala de Espera (Vista 8)** y precarga automáticamente la antropometría en la **Consulta Médica Activa (Vista 16)**.
  - Aplicar una vacuna en el **Modal de Dosis (Vista 14)** marca la tarjeta en verde con lote y fecha en el **Carnet Digital (Vista 13)** y registra un evento en el **Registro de Auditoría (Vista 6)**.
  - Finalizar la consulta en la **Vista 16** abre el **Modal de Previsualización y Despacho PDF (Vista 17)**, agrega la visita al **Timeline de la Ficha 360° (Vista 11)** e incrementa las métricas de uso en **Suscripción SaaS (Vista 24)**.
