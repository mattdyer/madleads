import mysql from 'mysql2/promise';

const {
  DB_HOST = 'db',
  DB_PORT = '3306',
  DB_USER = 'leads',
  DB_PASSWORD = 'leadspass',
  DB_NAME = 'madleads',
} = process.env;

export const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function waitForDatabase(retries = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`Waiting for database... (${attempt}/${retries})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
