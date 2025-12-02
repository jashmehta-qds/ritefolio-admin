import { Pool, QueryResultRow } from "pg";

// Maintain a pool per database name
const pools: Record<string, Pool> = {};

function getPool(dbName?: string): Pool {
  const database = dbName || process.env.PG_DEFAULT_DB || "postgres";
  if (!pools[database]) {
    pools[database] = new Pool({
      host: process.env.PG_HOST,
      port: Number(process.env.PG_PORT),
      user: process.env.PG_USERNAME,
      password: process.env.PG_PASSWORD,
      database,
    });
  }
  return pools[database];
}

export async function queryDB<T = unknown>({
  query,
  dbName,
  params,
}: {
  query: string;
  dbName?: string;
  params?: unknown[];
}): Promise<T[]> {
  const pool = getPool(dbName);
  const client = await pool.connect();

  try {
    const res = await client.query<T & QueryResultRow>(query, params);
    return res.rows;
  } catch (err: unknown) {
    throw err;
  } finally {
    client.release();
  }
}

export async function callProcedure<T = unknown>({
  procedureName,
  dbName,
  params,
}: {
  procedureName: string;
  dbName?: string;
  params?: unknown[];
}): Promise<void> {
  const pool = getPool(dbName);
  const client = await pool.connect();

  try {
    const placeholders = params?.map((_, i) => `$${i + 1}`).join(", ") || "";
    const query = `CALL ${procedureName}(${placeholders})`;
    await client.query(query, params);
  } catch (err: unknown) {
    throw err;
  } finally {
    client.release();
  }
}

export async function callFunction<T = unknown>({
  functionName,
  dbName,
  params,
}: {
  functionName: string;
  dbName?: string;
  params?: unknown[];
}): Promise<T[]> {
  const pool = getPool(dbName);
  const client = await pool.connect();

  try {
    const placeholders = params?.map((_, i) => `$${i + 1}`).join(", ") || "";
    const query = `SELECT * FROM ${functionName}(${placeholders})`;
    const res = await client.query<T & QueryResultRow>(query, params);
    return res.rows;
  } catch (err: unknown) {
    throw err;
  } finally {
    client.release();
  }
}
