import { query } from "../../db.js";
import { catchError } from "../utils/errorHandler.js";

export async function getAllUsers(req, res) {
  const [error, result] = await catchError(
    query("SELECT id, name, email FROM api_users")
  );
  if (error) {
    console.error("Database error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  if (!result.rows.length)
    return res.status(404).json({ message: "No users found" });

  return res.status(200).json(result.rows);
}

export async function getUserById(req, res) {
  const userId = req.params.id;
  const [error, result] = await catchError(
    query("SELECT id, name, email FROM api_users WHERE id = $1", [userId])
  );
  if (error) {
    console.error("Database error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  if (!result.rows.length)
    return res.status(404).json({ message: "User not found" });

  return res.status(200).json(result.rows[0]);
}
