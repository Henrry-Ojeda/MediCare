import React from 'react';
import { PatientForm } from './components/PatientForm';

export const NewPatientView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <PatientForm showPerinatalSection />
    </div>
  );
};
