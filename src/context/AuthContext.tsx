import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, DoctorSignatureConfig, UserRole } from '../types/auth.types';
import { medicareApi } from '../api/medicareApi';
import { getAuthToken } from '../api/client';

const USER_STORAGE_KEY = 'medicare_current_user';
const SIGNATURE_STORAGE_KEY = 'medicare_doctor_signature_v1';

const DEFAULT_SIGNATURE: DoctorSignatureConfig = {
  doctorName: '',
  specialtyLabel: 'Pediatría y Puericultura',
  mppsNumber: '',
  colegioNumber: '',
  useDigitalSignature: true,
  useWetStamp: true,
};

export function mapRoleCodeToUserRole(roleCode?: string): UserRole {
  const upper = (roleCode || '').toUpperCase();
  if (upper === 'ASISTENTE') return 'ASISTENTE';
  if (upper === 'ADMIN' || upper === 'SUPERADMIN') return 'ADMIN';
  return 'PEDIATRA';
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  userRole: UserRole;
  doctorSignature: DoctorSignatureConfig;
  setCurrentUser: (user: AuthUser | null) => void;
  setIsAuthenticated: (val: boolean) => void;
  updateDoctorSignature: (partial: Partial<DoctorSignatureConfig>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        if (parsed && (getAuthToken() || parsed.id?.startsWith('demo-'))) {
          return {
            ...parsed,
            role: parsed.role || mapRoleCodeToUserRole(parsed.roleCode),
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(currentUser));

  const [doctorSignature, setDoctorSignature] = useState<DoctorSignatureConfig>(() => {
    try {
      const raw = localStorage.getItem(SIGNATURE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DoctorSignatureConfig;
        return {
          ...DEFAULT_SIGNATURE,
          ...parsed,
          doctorName: parsed.doctorName || currentUser?.name || '',
        };
      }
    } catch {
      // ignore
    }
    return {
      ...DEFAULT_SIGNATURE,
      doctorName: currentUser?.name || '',
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify(doctorSignature));
    } catch {
      // ignore
    }
  }, [doctorSignature]);

  const setCurrentUser = (user: AuthUser | null) => {
    const normalized = user
      ? { ...user, role: user.role || mapRoleCodeToUserRole(user.roleCode) }
      : null;
    setCurrentUserState(normalized);
    if (normalized?.name) {
      setDoctorSignature((prev) =>
        !prev.doctorName || prev.doctorName === 'Dra. Valeria Méndez'
          ? { ...prev, doctorName: normalized.name }
          : prev
      );
    }
    try {
      if (normalized) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  const updateDoctorSignature = (partial: Partial<DoctorSignatureConfig>) => {
    setDoctorSignature((prev) => ({ ...prev, ...partial }));
  };

  const logout = () => {
    medicareApi.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const userRole: UserRole = currentUser?.role || mapRoleCodeToUserRole(currentUser?.roleCode);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        userRole,
        doctorSignature,
        setCurrentUser,
        setIsAuthenticated,
        updateDoctorSignature,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe utilizarse dentro de <AuthProvider>');
  }
  return ctx;
}
