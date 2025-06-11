import express from "express";
import { config } from "dotenv";
import { query } from "./db.js";

config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  const sql = "SELECT NOW() AS current_time";
  query(sql)
    .then((result) => {
      res.json(result.rows[0]);
    })
    .catch((err) => {
      console.error("Error executing query:", err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
