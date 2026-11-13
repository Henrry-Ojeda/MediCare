import type { Request } from "express";
import sql from "mssql";

export interface AuditInput {
  userId?: string | null;
  userName: string;
  userRole: string;
  actionType: string;
  entityName?: string;
  entityId?: string;
  patientId?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

/**
 * Registra un evento en dbo.TB_AUDITORIA dentro de una transacción o pool activo.
 */
export async function recordAudit(
  executor: sql.Transaction | sql.ConnectionPool,
  req: Request,
  input: AuditInput
): Promise<void> {
  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    "0.0.0.0";

  const request = executor.request();
  await request
    .input("UserId", sql.UniqueIdentifier, input.userId || null)
    .input("UserName", sql.NVarChar(120), input.userName)
    .input("UserRole", sql.NVarChar(60), input.userRole)
    .input("ActionType", sql.NVarChar(100), input.actionType)
    .input("EntityName", sql.NVarChar(60), input.entityName || null)
    .input("EntityId", sql.NVarChar(60), input.entityId || null)
    .input("PatientId", sql.UniqueIdentifier, input.patientId || null)
    .input("IpAddress", sql.NVarChar(60), ipAddress)
    .input(
      "PreviousValueJson",
      sql.NVarChar(sql.MAX),
      input.previousValue ? JSON.stringify(input.previousValue) : null
    )
    .input(
      "NewValueJson",
      sql.NVarChar(sql.MAX),
      input.newValue ? JSON.stringify(input.newValue) : null
    )
    .query(`
      INSERT INTO dbo.TB_AUDITORIA (
        UserId, UserName, UserRole, ActionType, EntityName, EntityId,
        PatientId, IpAddress, PreviousValueJson, NewValueJson
      )
      VALUES (
        @UserId, @UserName, @UserRole, @ActionType, @EntityName, @EntityId,
        @PatientId, @IpAddress, @PreviousValueJson, @NewValueJson
      )
    `);
}
