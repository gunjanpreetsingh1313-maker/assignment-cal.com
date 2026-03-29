/**
 * CLI helper: `npm run db:setup` or `npm run db:seed`
 * Executes schema.sql or seed.sql against MySQL using env from .env
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const kind = process.argv[2] === "seed" ? "seed" : "schema";
const file = kind === "seed" ? "seed.sql" : "schema.sql";

async function main() {
  const host = process.env.DB_HOST ?? "127.0.0.1";
  const port = Number(process.env.DB_PORT ?? 3306);
  const user = process.env.DB_USER ?? "root";
  const password = process.env.DB_PASSWORD ?? "";
  const database = process.env.DB_NAME ?? "scheduling";

  const sqlPath = path.join(__dirname, file);
  const sql = await fs.readFile(sqlPath, "utf8");

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  try {
    if (kind === "schema") {
      await conn.query(sql);
    } else {
      const db = database.replace(/`/g, "``");
      await conn.query(`USE \`${db}\`; ${sql}`);
    }
    console.log(`Executed ${file} OK`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
