import { describe, expect, it } from 'vitest';
import { canRoleAccessView, ROLE_PERMISSIONS } from '../permissions.config';

describe('permissions.config', () => {
  it('permite al pediatra acceder a consulta y pacientes, pero bloquea ia-modulo', () => {
    expect(canRoleAccessView('PEDIATRA', 'consulta-activa')).toBe(true);
    expect(canRoleAccessView('PEDIATRA', 'pacientes')).toBe(true);
    expect(canRoleAccessView('PEDIATRA', 'sala-espera')).toBe(true);
    expect(canRoleAccessView('PEDIATRA', 'admin-clinicas')).toBe(false);
    expect(canRoleAccessView('PEDIATRA', 'ia-modulo')).toBe(false);
  });

  it('bloquea módulo clínico y creación de pacientes al ADMIN, pero permite ia-modulo', () => {
    expect(ROLE_PERMISSIONS.ADMIN.canCreatePatient).toBe(false);
    expect(ROLE_PERMISSIONS.ADMIN.canStartConsultation).toBe(false);
    expect(canRoleAccessView('ADMIN', 'consulta-activa')).toBe(false);
    expect(canRoleAccessView('ADMIN', 'admin-doctores')).toBe(true);
    expect(canRoleAccessView('ADMIN', 'ia-modulo')).toBe(true);
  });
});
