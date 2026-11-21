import { expect, test } from '@playwright/test';

test.describe('E2E Doctor de Pediatría (UI + Red)', () => {
  test('Escenario 1 y 2: Buscar/Crear paciente, iniciar consulta, récipe opcional y cierre sin errores de consola/API', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const apiFailures: string[] = [];

    page.on('pageerror', (err) => {
      console.error('E2E PAGEERROR:', err.message);
      consoleErrors.push(err.message);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('E2E CONSOLE ERROR:', msg.text());
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', (res) => {
      if (res.url().includes('/api/') && res.status() >= 400) {
        apiFailures.push(`${res.status()} ${res.url()}`);
      }
    });

    // Interceptar endpoints /api/* del backend (sin interceptar /src/api/*.ts de Vite)
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/src/api/')) {
        await route.continue();
        return;
      }
      if (url.includes('/auth/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'doc-e2e-1',
            name: 'Dr. Henrry Ojeda',
            email: 'dr@medicare.test',
            roleCode: 'PEDIATRA',
          }),
        });
        return;
      }
      if (url.includes('/bootstrap')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            patients: [],
            appointments: [],
            masterVaccines: [],
          }),
        });
        return;
      }
      if (
        url.includes('/patients') ||
        url.includes('/doctors') ||
        url.includes('/assistants') ||
        url.includes('/clinics') ||
        url.includes('/notifications') ||
        url.includes('/bcv') ||
        url.includes('/diagnosis-permissions')
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    // Sembrar sesión de Doctor en localStorage antes de cargar
    await page.addInitScript(() => {
      localStorage.setItem('medicare_jwt_token', 'e2e-test-token');
      localStorage.setItem(
        'medicare_current_user',
        JSON.stringify({
          id: 'doc-e2e-1',
          name: 'Dr. Henrry Ojeda',
          email: 'dr@medicare.test',
          role: 'PEDIATRA',
        })
      );
      localStorage.setItem(
        'medicare_doctor_signature_v1',
        JSON.stringify({
          doctorName: 'Dr. Henrry Ojeda',
          specialtyLabel: 'Pediatría y Puericultura',
          mppsNumber: 'MPPS-12345',
          colegioNumber: 'COL-123',
          useDigitalSignature: true,
          useWetStamp: true,
        })
      );
    });

    await page.goto('/#/pacientes');

    // Escenario 1: Paciente NO existe -> Crear -> Guardar e Iniciar Consulta -> Cerrar
    const searchInput = page.getByPlaceholder(/Buscar por niño/i);
    await searchInput.fill('Mateo');
    await expect(
      page.getByText(/No se encontraron pacientes pediátricos con ese criterio/i)
    ).toBeVisible();

    await page.getByRole('button', { name: /Nuevo Paciente/i }).click();
    await page.getByLabel(/Nombres \*/i).fill('Mateo');
    await page.getByLabel(/Apellidos/i).fill('Gómez');
    await page.getByLabel(/Fecha de Nacimiento \*/i).fill('2024-05-10');
    await page.getByLabel(/^Representante \*/i).fill('Laura Gómez');
    await page.getByLabel(/WhatsApp Representante/i).fill('+584141112233');

    await page.getByRole('button', { name: /Guardar e Iniciar Consulta/i }).click();
    await expect(page.getByText('Mateo Gómez').first()).toBeVisible();

    await page.getByPlaceholder(/Describa síntomas/i).fill('Control niño sano E2E');
    await page
      .getByRole('button', { name: /Finalizar Consulta y Enviar Récipe por WhatsApp/i })
      .click();

    // Cerrar el modal de despacho de récipe/resumen antes de pasar al siguiente paciente
    await page.getByRole('button', { name: /Cerrar modal/i }).click();

    // Escenario 2: Ir a Pacientes -> Buscar paciente existente ("Mateo") -> Iniciar Consulta -> Récipe -> Cerrar
    await page.getByRole('button', { name: /^Pacientes$/i }).first().click();
    await page.getByPlaceholder(/Buscar por niño/i).fill('Mateo');
    await expect(page.getByText('Mateo Gómez').first()).toBeVisible();

    await page.getByRole('button', { name: /^Consulta$/i }).first().click();
    await page.getByPlaceholder(/Describa síntomas/i).fill('Fiebre y tos E2E');
    await page.getByRole('switch').click();
    await page.getByRole('button', { name: /Calcular y Agregar/i }).click();
    await page
      .getByRole('button', { name: /Finalizar Consulta y Enviar Récipe por WhatsApp/i })
      .click();
    await page.getByRole('button', { name: /Cerrar modal/i }).click();

    // Escenario 3: Personalizar Récipe (Orientación Horizontal / Vertical) y verificar en Agenda (Configurar + Agendar)
    await page.getByRole('button', { name: /Personalizar Récipe/i }).click();
    await expect(page.getByText('Personalizar Récipe Médico')).toBeVisible();
    await page.getByRole('button', { name: /Guardar Plantilla Personalizada/i }).click();

    await page.getByRole('button', { name: /Agenda Médica/i }).click();
    await page.getByRole('button', { name: /Configurar/i }).click();
    await expect(page.getByText(/Duración por bloque/i)).toBeVisible();

    expect(apiFailures).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
