import { config } from "dotenv";
import { Pool } from "pg";

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("connect", () => {
  console.log("Connected to the database");
});

pool.on("error", (err) => {
  console.error("Database error:", err);
});

export const query = (text, params) => {
  return pool.query(text, params);
};
