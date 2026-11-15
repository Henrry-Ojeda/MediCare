import { Patient, PastConsultationSummary } from '../types/medical';
import { calculateExactAgeLabel } from './pediatricCalculations';

/**
 * Normaliza un número de teléfono venezolano/internacional para URL wa.me.
 */
export function normalizeWhatsappPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) {
    return `58${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Construye el texto clínico amigable del Récipe Médico + Guía de Cuidados para enviar por WhatsApp.
 */
export function buildRecipeWhatsappMessage(
  patient: Patient,
  consultation: PastConsultationSummary,
  clinicName: string
): string {
  const ageLabel = calculateExactAgeLabel(patient.birthDate);
  const medsText = consultation.prescriptions
    .map(
      (rx, idx) =>
        `${idx + 1}. *${rx.medicationName}* (${rx.presentation})\n` +
        `   • Dosis: ${rx.dosePerTake} | ${rx.frequencyHours} por ${rx.durationDays}\n` +
        `   • Indicación: ${rx.specialInstructions}`
    )
    .join('\n');

  const alarmText = consultation.alarmSigns.map((s) => `⚠️ ${s}`).join('\n');

  return (
    `🏥 *${clinicName} — Récipe Médico Pediátrico*\n\n` +
    `👶 *Paciente:* ${patient.firstName} ${patient.lastName} (${ageLabel})\n` +
    `⚖️ *Peso:* ${consultation.weightKg} kg | *Fecha:* ${consultation.date}\n` +
    `🩺 *Diagnóstico (${consultation.cie10Code}):* ${consultation.cie10Name}\n` +
    `👩‍⚕️ *Atendido por:* ${consultation.doctorName}\n\n` +
    `💊 *PRESCRIPCIÓN MÉDICA:*\n${medsText}\n\n` +
    `📘 *GUÍA PARA PADRES:*\n${consultation.parentGuide}\n\n` +
    `🚨 *SIGNOS DE ALARMA (Acudir a urgencias si presenta):*\n${alarmText}`
  );
}

/**
 * Genera el enlace oficial wa.me listo para abrir WhatsApp Web o App Móvil.
 */
export function buildRecipeWhatsappUrl(
  patient: Patient,
  consultation: PastConsultationSummary,
  clinicName: string
): string {
  const phone = normalizeWhatsappPhone(patient.guardianWhatsapp);
  const text = buildRecipeWhatsappMessage(patient, consultation, clinicName);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
