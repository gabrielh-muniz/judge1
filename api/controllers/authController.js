import bcrypt from "bcrypt";
import { query } from "../../db.js";
import crypto from "crypto";
import { catchError } from "../utils/errorHandler.js";

export async function signup(req, res) {
  const { username, email, password } = req.body;

  // Validate input
  if (!username || !email || !password)
    return res.status(400).json({ error: "All fields are required" });

  if (password.length < 8)
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters long" });

  const [errorEmail, emailExists] = await catchError(
    query("SELECT * FROM api_users WHERE email = $1", [email])
  );
  if (errorEmail) {
    console.error("Database error:", errorEmail);
    return res.status(500).json({ error: "Internal server error" });
  }
  if (emailExists.rows.length > 0)
    return res.status(400).json({ error: "Email already exists" });

  // Hash the password
  // TODO: Implement proper matching (e.g., one uppercase, one number, etc.)
  const [errorHash, hashedPassword] = await catchError(
    bcrypt.hash(password, 10)
  );
  if (errorHash) {
    console.error("Hashing error:", errorHash);
    return res.status(500).json({ error: "Internal server error" });
  }

  // Generate API key
  const apiKeyPlain = crypto.randomBytes(32).toString("hex");
  const hashedApiKey = crypto
    .createHash("sha256")
    .update(apiKeyPlain)
    .digest("hex");

  // Insert user into the database
  const [errorInsert, result] = await catchError(
    query(
      "INSERT INTO api_users (email, name, password, api_key_hash) VALUES ($1, $2, $3, $4) RETURNING *",
      [email, username, hashedPassword, hashedApiKey]
    )
  );
  if (errorInsert) {
    console.error("Insert error:", errorInsert);
    return res.status(500).json({ error: "Internal server error" });
  }

  // Return success response with user data and API key
  res.status(201).json({
    user: result.rows[0],
    api_key: apiKeyPlain, // Include the API key in the response
    message:
      "User registered successfully. Save your API key, it won't be shown again.",
  });
}
