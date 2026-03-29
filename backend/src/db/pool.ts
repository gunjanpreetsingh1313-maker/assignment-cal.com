import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.DB_PORT ?? 3306);

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number.isFinite(port) ? port : 3306,
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "scheduling",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

export type Pool = typeof pool;
