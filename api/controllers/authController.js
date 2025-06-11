import bcrypt from "bcrypt";
import { query } from "../../db.js";
import crypto from "crypto";
import { catchError } from "../utils/errorHandler.js";

export async function signup(req, res) {
  const { username, email, password, confirmPassword } = req.body;

  // Validate input
  if (!username || !email || !password || !confirmPassword)
    return res.status(400).json({ error: "All fields are required" });

  if (password.length < 3)
    return res
      .status(400)
      .json({ error: "Password must be at least 4 characters long" });

  if (password !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

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

  res.status(201).json({
    user: result.rows[0],
    api_key: hashedApiKey,
    message:
      "User registered successfully. Save your API key, it won't be shown again.",
  });
}

export async function signin(req, res) {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  // Check if user exists
  const [errorUser, result] = await catchError(
    query("SELECT * FROM api_users WHERE email = $1", [email])
  );
  if (errorUser) {
    console.error("Database error:", errorUser);
    return res.status(500).json({ error: "Internal server error" });
  }
  if (!result.rows.length)
    return res.status(400).json({ error: "Invalid email or password" });

  const user = result.rows[0];

  // Verify the password
  const [errorVerify, isMatch] = await catchError(
    bcrypt.compare(password, user.password)
  );
  if (errorVerify) {
    console.error("Verification error:", errorVerify);
    return res.status(500).json({ error: "Internal server error" });
  }
  if (!isMatch)
    return res.status(400).json({ error: "Invalid email or password" });

  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    api_key: user.api_key_hash,
    message: "User signed in successfully.",
  });
}
