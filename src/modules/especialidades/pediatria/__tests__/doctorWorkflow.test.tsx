import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../context/AuthContext';
import { NotificationProvider } from '../../../../context/NotificationContext';
import { NavigationProvider } from '../../../../context/NavigationContext';
import { ClinicalProvider, useClinical } from '../../../../context/ClinicalContext';
import { PatientDirectoryView } from '../../../pacientes/PatientDirectoryView';
import { NewPatientView } from '../../../pacientes/NewPatientView';
import { PediatricConsultationView } from '../views/PediatricConsultationView';

vi.mock('../../../../api/clinicalSync', () => ({
  clinicalSync: {
    hydrateFromApi: vi.fn().mockResolvedValue(null),
    createPatient: vi.fn().mockResolvedValue(null),
    updatePatient: vi.fn().mockResolvedValue(undefined),
    createAppointment: vi.fn().mockResolvedValue(null),
    createPatientStudy: vi.fn().mockResolvedValue(null),
    saveRecipeTemplate: vi.fn().mockResolvedValue(null),
    updateAppointmentStage: vi.fn().mockResolvedValue(undefined),
    saveTriage: vi.fn().mockResolvedValue(undefined),
    applyVaccineDose: vi.fn().mockResolvedValue(undefined),
    addPatientVaccineDose: vi.fn().mockResolvedValue(null),
    completeConsultation: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../../api/medicareApi', () => ({
  medicareApi: {
    getMe: vi.fn().mockResolvedValue(null),
    getNotifications: vi.fn().mockResolvedValue([]),
    createNotification: vi.fn().mockResolvedValue(null),
    listDoctors: vi.fn().mockResolvedValue([]),
    listAssistants: vi.fn().mockResolvedValue([]),
    listClinics: vi.fn().mockResolvedValue([]),
    getBcvHistory: vi.fn().mockResolvedValue([]),
    listDiagnosisPermissions: vi.fn().mockResolvedValue([]),
  },
}));

const DoctorWorkflowHarness: React.FC = () => {
  const { currentView, patients, appointments } = useClinical();
  return (
    <div>
      <div data-testid="current-view">{currentView}</div>
      <div data-testid="patients-count">{patients.length}</div>
      <div data-testid="appointments-json">{JSON.stringify(appointments)}</div>
      <div data-testid="patients-json">{JSON.stringify(patients)}</div>

      {currentView === 'pacientes' && <PatientDirectoryView />}
      {currentView === 'paciente-nuevo' && <NewPatientView />}
      {currentView === 'consulta-activa' && <PediatricConsultationView />}
    </div>
  );
};

function renderWithProviders() {
  return render(
    <AuthProvider>
      <NotificationProvider>
        <NavigationProvider initialView="pacientes">
          <ClinicalProvider>
            <DoctorWorkflowHarness />
          </ClinicalProvider>
        </NavigationProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

describe('Flujo real de uso del Doctor de Pediatría', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '#/pacientes';
    window.open = vi.fn();
    localStorage.setItem('medicare_jwt_token', 'test-jwt-token');
    localStorage.setItem(
      'medicare_current_user',
      JSON.stringify({
        id: 'doc-test-1',
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

  it('Escenario 1: Paciente NO existe -> busca -> crea -> inicia consulta -> registra base -> cierra consulta', async () => {
    renderWithProviders();

    // 1. Buscar paciente inexistente en Pacientes
    const searchInput = screen.getByPlaceholderText(/Buscar por niño/i);
    fireEvent.change(searchInput, { target: { value: 'Mateo' } });
    expect(
      screen.getByText(/No se encontraron pacientes pediátricos con ese criterio/i)
    ).toBeInTheDocument();

    // 2. Ir a Nuevo Paciente
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Paciente/i }));
    await waitFor(() => {
      expect(screen.getByTestId('current-view')).toHaveTextContent('paciente-nuevo');
    });

    // 3. Llenar formulario único de paciente y dar a "Guardar e Iniciar Consulta"
    fireEvent.change(screen.getByLabelText(/Nombres \*/i), { target: { value: 'Mateo' } });
    fireEvent.change(screen.getByLabelText(/Apellidos/i), { target: { value: 'Gómez' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Nacimiento \*/i), {
      target: { value: '2024-05-10' },
    });
    fireEvent.change(screen.getByLabelText(/^Representante \*/i), {
      target: { value: 'Laura Gómez' },
    });
    fireEvent.change(screen.getByLabelText(/WhatsApp Representante/i), {
      target: { value: '+584141112233' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar e Iniciar Consulta/i }));

    // 4. Verifica que entró a consulta y se creó automáticamente la cita en agenda en_consulta
    await waitFor(() => {
      expect(screen.getByTestId('current-view')).toHaveTextContent('consulta-activa');
    });
    const aptsAfterStart = JSON.parse(screen.getByTestId('appointments-json').textContent || '[]');
    expect(aptsAfterStart).toHaveLength(1);
    expect(aptsAfterStart[0].patientName).toBe('Mateo Gómez');
    expect(aptsAfterStart[0].stage).toBe('en_consulta');

    // 5. Registrar información base y finalizar consulta sin récipe (opcional)
    fireEvent.change(
      screen.getByPlaceholderText(/Describa síntomas/i),
      { target: { value: 'Control de niño sano' } }
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Finalizar Consulta y Enviar Récipe por WhatsApp/i })
    );

    // 6. Verifica que la consulta se guardó en historial y la cita quedó completada
    const aptsAfterClose = JSON.parse(screen.getByTestId('appointments-json').textContent || '[]');
    expect(aptsAfterClose[0].stage).toBe('completado');
    const patientsAfterClose = JSON.parse(screen.getByTestId('patients-json').textContent || '[]');
    expect(patientsAfterClose[0].consultations).toHaveLength(1);
    expect(patientsAfterClose[0].consultations[0].reason).toBe('Control de niño sano');
  });

  it('Escenario 2: Paciente SÍ existe -> busca -> inicia consulta -> agrega récipe -> cierra consulta', async () => {
    localStorage.setItem(
      'medcore_pediatric_state_v2',
      JSON.stringify({
        patients: [
          {
            id: 'pat-sofia-1',
            historyNumber: 'HC-2026-0101',
            firstName: 'Sofia Elena',
            lastName: 'Ojeda Vergel',
            sex: 'F',
            birthDate: '2026-08-15',
            bloodType: 'O+',
            primarySpecialty: 'Pediatría',
            criticalAllergies: [],
            chronicConditions: [],
            previousHospitalizations: '',
            guardianName: 'Eliascar Vergel',
            guardianRelation: 'Madre',
            guardianIdDocument: 'V-20111222',
            guardianOccupation: '',
            guardianWhatsapp: '+584141234567',
            guardianEmail: '',
            perinatal: {
              gestationalWeeks: 39,
              apgar1Min: 9,
              apgar5Min: 10,
              birthWeightKg: 3.2,
              birthHeightCm: 50,
              birthHeadCircumferenceCm: 34,
              deliveryType: 'Parto Eutócico Simple',
              neonatalComplications: 'Ninguna',
              maternalBloodType: 'O+',
              exclusiveBreastfeedingMonths: 6,
            },
            growthHistory: [],
            vaccines: [],
            studies: [],
            consultations: [],
          },
        ],
        appointments: [],
      })
    );

    renderWithProviders();

    // 1. Buscar paciente existente
    const searchInput = screen.getByPlaceholderText(/Buscar por niño/i);
    fireEvent.change(searchInput, { target: { value: 'Sofia' } });
    expect(screen.getByText('Sofia Elena Ojeda Vergel')).toBeInTheDocument();

    // 2. Iniciar Consulta
    fireEvent.click(screen.getByRole('button', { name: /Consulta/i }));

    await waitFor(() => {
      expect(screen.getByTestId('current-view')).toHaveTextContent('consulta-activa');
    });

    // Se registró cita walk-in automática en agenda
    const aptsAfterStart = JSON.parse(screen.getByTestId('appointments-json').textContent || '[]');
    expect(aptsAfterStart).toHaveLength(1);
    expect(aptsAfterStart[0].patientName).toBe('Sofia Elena Ojeda Vergel');
    expect(aptsAfterStart[0].stage).toBe('en_consulta');

    // 3. Registrar información base + activar Récipe opcional y agregar medicamento
    fireEvent.change(
      screen.getByPlaceholderText(/Describa síntomas/i),
      { target: { value: 'Fiebre de 38.5°C y tos leve' } }
    );
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByText(/Récipe Activado/i)).toBeInTheDocument();

    // Agregar medicamento calculado por peso del formulario pediátrico
    const addMedBtn = screen.getByRole('button', { name: /Calcular y Agregar/i });
    fireEvent.click(addMedBtn);

    // 4. Cerrar consulta
    fireEvent.click(
      screen.getByRole('button', { name: /Finalizar Consulta y Enviar Récipe por WhatsApp/i })
    );

    // 5. Verificar consulta + récipe guardados y cita completada
    const aptsAfterClose = JSON.parse(screen.getByTestId('appointments-json').textContent || '[]');
    expect(aptsAfterClose[0].stage).toBe('completado');
    const patientsAfterClose = JSON.parse(screen.getByTestId('patients-json').textContent || '[]');
    expect(patientsAfterClose[0].consultations).toHaveLength(1);
    expect(patientsAfterClose[0].consultations[0].prescriptions.length).toBeGreaterThan(0);
  });
});
