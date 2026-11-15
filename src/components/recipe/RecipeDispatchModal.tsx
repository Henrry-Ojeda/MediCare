import React, { useState, useEffect } from 'react';
import { Printer, Send, CheckCircle2, ShieldCheck, MessageCircle } from 'lucide-react';
import { Modal } from '../common';
import { RecipeDocumentPreview } from './RecipeDocumentPreview';
import { useClinical } from '../../context/ClinicalContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { buildRecipeWhatsappUrl } from '../../utils/whatsappFormatter';

export const RecipeDispatchModal: React.FC = () => {
  const { dispatchModalConsultation, closeDispatchModal, templateConfig, incrementWhatsappSent } =
    useClinical();
  const { doctorSignature } = useAuth();
  const { showToast } = useNotifications();

  const [activePdfPage, setActivePdfPage] = useState<1 | 2>(1);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

  useEffect(() => {
    if (dispatchModalConsultation) {
      setActivePdfPage(1);
      setDispatchedSuccess(false);
    }
  }, [dispatchModalConsultation]);

  if (!dispatchModalConsultation) return null;

  const { patient, consultation } = dispatchModalConsultation;
  const whatsappUrl = buildRecipeWhatsappUrl(patient, consultation, templateConfig.clinicName);

  const handleSendWhatsapp = () => {
    incrementWhatsappSent(1);
    setDispatchedSuccess(true);
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    showToast(`Abriendo WhatsApp para enviar récipe a ${patient.guardianWhatsapp}`);
  };

  return (
    <Modal
      isOpen={Boolean(dispatchModalConsultation)}
      onClose={closeDispatchModal}
      title={`Récipe Médico y Guía — ${patient.firstName} ${patient.lastName}`}
      subtitle="Previsualización firmada lista para imprimir en PDF o enviar por WhatsApp"
      maxWidthClass="max-w-5xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActivePdfPage(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                activePdfPage === 1 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Página 1: Récipe Legal
            </button>
            <button
              type="button"
              onClick={() => setActivePdfPage(2)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                activePdfPage === 2 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Página 2: Guía para Padres
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
            <span>Firmado por {doctorSignature.doctorName}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 bg-slate-100/70 p-3 sm:p-5 rounded-xl flex justify-center">
            <RecipeDocumentPreview
              patient={patient}
              consultation={consultation}
              templateConfig={templateConfig}
              doctorSignature={doctorSignature}
              activePage={activePdfPage}
            />
          </div>

          <div className="lg:col-span-4 space-y-4 no-print">
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <MessageCircle className="w-4 h-4 text-[#059669]" />
                <span>WhatsApp del Representante</span>
              </div>
              <div className="text-xs font-semibold text-slate-800">{patient.guardianName}</div>
              <div className="text-xs font-mono font-bold text-[#059669]">
                {patient.guardianWhatsapp}
              </div>
            </div>

            {dispatchedSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mensaje de WhatsApp preparado con dosis y signos de alarma.</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSendWhatsapp}
              className="w-full py-3 px-4 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Récipe por WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Guardar PDF / Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
