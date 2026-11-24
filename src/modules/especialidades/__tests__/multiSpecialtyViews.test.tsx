import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PediatricConsultationView } from '../pediatria/views/PediatricConsultationView';
import { resolveActiveSpecialtyPlugins } from '../registry';

let mockSpecialties: string[] = ['pediatria'];
let mockBirthDate = '2022-05-01'; // Niño ~4 años

const stableVitals = {
  weightKg: 15.6,
  heightCm: 100.3,
  headCircumferenceCm: 50.0,
  temperatureC: 36.7,
  heartRateBpm: 100,
  spo2Percent: 99,
  systolicBp: 95,
  diastolicBp: 60,
  recordedAt: 'Ahora',
  recordedBy: 'Dra. Rosany',
};

const stableClinicalFns = {
  patients: [],
  appointments: [],
  templateConfig: { clinicName: 'MediCare Clínica' },
  currentDoctorHasAssistant: false,
  navigateToActiveConsultation: vi.fn(),
  setCurrentView: vi.fn(),
  completeConsultation: vi.fn(),
  addPatientStudy: vi.fn(),
  openDispatchModal: vi.fn(),
  incrementWhatsappSent: vi.fn(),
  doctors: [],
  refreshPatient360: vi.fn(),
  navigateToPatientVaccines: vi.fn(),
};

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'doc-1',
      name: 'Dra. Rosany',
      email: 'rosany@medicare.local',
      role: 'PEDIATRA',
      roleCode: 'MEDICO',
      roleName: 'Médico',
      dictationEnabled: false,
      specialties: mockSpecialties,
    },
    userRole: 'PEDIATRA',
    doctorSignature: {
      doctorName: 'Dra. Rosany',
      specialtyLabel: 'Pediatría · Gastroenterología',
      mppsNumber: 'MPPS-44210',
      colegioNumber: 'CM-901',
      useDigitalSignature: false,
      useWetStamp: false,
    },
  }),
}));

vi.mock('../../../context/NotificationContext', () => ({
  useNotifications: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('../../../context/ClinicalContext', () => ({
  useClinical: () => ({
    selectedPatient: {
      id: 'pat-1',
      historyNumber: 'HC-2026-0901',
      firstName: 'Sofía',
      lastName: 'Gómez',
      sex: 'F',
      birthDate: mockBirthDate,
      bloodType: 'O+',
      criticalAllergies: [],
      chronicConditions: [],
      guardianName: 'María Gómez',
      guardianRelation: 'Madre',
      guardianIdDocument: 'V-19000111',
      guardianWhatsapp: '04141234567',
      consultations: [],
      growthHistory: [],
      vaccines: [],
      studies: [],
      latestVitals: stableVitals,
    },
    ...stableClinicalFns,
  }),
}));

describe('Pruebas de Vista Multi-Especialidad (Pediatría, Gastroenterología y Gastro Pediátrica)', () => {
  beforeEach(() => {
    mockSpecialties = ['pediatria'];
    mockBirthDate = '2022-05-01'; // Niño
  });

  it('Escenario 1: Médico Solo Pediatría (niño) ve OMS y P. Cefálico, sin bloque Gastro', () => {
    render(<PediatricConsultationView />);

    expect(screen.getByText(/Evaluación OMS/i)).toBeTruthy();
    expect(screen.getByText(/P\. Cefálico \(cm\)/i)).toBeTruthy();
    expect(screen.queryByTestId('multi-specialty-bar')).toBeNull();
    expect(screen.queryByTestId('gastro-exam-card')).toBeNull();
  });

  it('Escenario 2: Médico Solo Gastroenterología (adulto) ve Escala de Bristol y CIE-10 digestivo, sin OMS infantil', () => {
    mockSpecialties = ['gastroenterologia'];
    mockBirthDate = '1990-03-15'; // Adulto 36 años

    render(<PediatricConsultationView />);

    expect(screen.getByTestId('gastro-exam-card')).toBeTruthy();
    expect(screen.getByText(/Hábito Intestinal — Escala de Bristol/i)).toBeTruthy();
    expect(screen.getByText(/Plan Dietético e Indicaciones Digestivas/i)).toBeTruthy();
    expect(screen.queryByText(/Evaluación OMS/i)).toBeNull();
    expect(screen.queryByText(/P\. Cefálico \(cm\)/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Tipo 6' }));
    expect(screen.getByText(/Tipo 6: Fragmentos pastosos/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Diagnóstico CIE-10 Gastroenterología'), {
      target: { value: 'K21.9' },
    });
    expect(
      (screen.getByLabelText('Diagnóstico CIE-10 Gastroenterología') as HTMLSelectElement).value
    ).toBe('K21.9');
  });

  it('Escenario 3: Médico Gastro Pediatra (2 especialidades) combina Pediatría + Gastro en niño y apaga Pediatría en adulto', () => {
    mockSpecialties = ['pediatria', 'gastroenterologia'];
    mockBirthDate = '2022-05-01'; // Niño 4 años

    const { rerender } = render(<PediatricConsultationView />);

    expect(screen.getByTestId('multi-specialty-bar')).toBeTruthy();
    expect(screen.getByText(/Evaluación OMS/i)).toBeTruthy();
    expect(screen.getByTestId('gastro-exam-card')).toBeTruthy();

    // Verificar regla de resolución automática para adulto con las mismas 2 especialidades
    const adultPlugins = resolveActiveSpecialtyPlugins(
      ['pediatria', 'gastroenterologia'],
      420 // 35 años
    );
    expect(adultPlugins.map((p) => p.id)).toEqual(['gastroenterologia']);

    mockBirthDate = '1990-03-15';
    rerender(<PediatricConsultationView />);
    expect(screen.getByTestId('gastro-exam-card')).toBeTruthy();
    expect(screen.queryByText(/Evaluación OMS/i)).toBeNull();
  });
});
