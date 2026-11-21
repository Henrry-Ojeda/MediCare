import { describe, expect, it } from 'vitest';
import { canRoleAccessView, ROLE_PERMISSIONS } from '../permissions.config';

describe('permissions.config', () => {
  it('permite al pediatra acceder a consulta y pacientes', () => {
    expect(canRoleAccessView('PEDIATRA', 'consulta-activa')).toBe(true);
    expect(canRoleAccessView('PEDIATRA', 'pacientes')).toBe(true);
    expect(canRoleAccessView('PEDIATRA', 'admin-clinicas')).toBe(false);
  });

  it('bloquea módulo clínico y creación de pacientes al ADMIN', () => {
    expect(ROLE_PERMISSIONS.ADMIN.canCreatePatient).toBe(false);
    expect(ROLE_PERMISSIONS.ADMIN.canStartConsultation).toBe(false);
    expect(canRoleAccessView('ADMIN', 'consulta-activa')).toBe(false);
    expect(canRoleAccessView('ADMIN', 'admin-doctores')).toBe(true);
  });
});
