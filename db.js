import { config } from "dotenv";
import { Pool } from "pg";

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text, params) => {
  return pool.query(text, params);
};
