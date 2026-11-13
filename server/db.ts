import sql from "mssql";

let poolPromise: Promise<sql.ConnectionPool> | null = null;

function buildSqlConfig(): sql.config {
  const server = process.env.DB_HOST;
  const database = process.env.DB_NAME || "BD_MEDICARE";
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const port = Number(process.env.DB_PORT || 1433);

  if (!server || !user || !password) {
    throw new Error(
      "Configuración de SQL Server incompleta. Define DB_HOST, DB_USER y DB_PASSWORD en tu archivo .env."
    );
  }

  return {
    server,
    port,
    database,
    user,
    password,
    options: {
      encrypt: process.env.DB_ENCRYPT === "true",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

/**
 * Obtiene o inicializa el pool de conexiones singleton hacia SQL Server (BD_MEDICARE).
 */
export async function getDbPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    const config = buildSqlConfig();
    poolPromise = new sql.ConnectionPool(config).connect().catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

/**
 * Verifica conectividad contra SQL Server sin lanzar excepción en caso de no estar configurado.
 */
export async function checkDbHealth(): Promise<{
  connected: boolean;
  database?: string;
  error?: string;
}> {
  try {
    const pool = await getDbPool();
    const result = await pool.request().query("SELECT DB_NAME() AS currentDb");
    return {
      connected: true,
      database: result.recordset?.[0]?.currentDb,
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error?.message || "No se pudo conectar a SQL Server.",
    };
  }
}

export { sql };

