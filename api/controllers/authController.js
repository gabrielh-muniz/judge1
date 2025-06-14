import bcrypt from "bcrypt";
import { query } from "../../db.js";
import crypto from "crypto";
import { catchError } from "../utils/errorHandler.js";
import jwt from "jsonwebtoken";
import { config } from "dotenv";

config();

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

  // Generate access token and refresh token
  try {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.SECRET_KEY,
      { expiresIn: "30s" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.SECRET_REFRESH_KEY
    );

    // Store the refresh token in the database
    const [errorToken, tokenResult] = await catchError(
      query(
        "INSERT INTO refresh_tokens (user_id, token_hash) VALUES ($1, $2) ON CONFLICT (token_hash) DO UPDATE SET token_hash = $2 RETURNING *",
        [user.id, refreshToken]
      )
    );
    if (errorToken) {
      console.error("Token storage error:", errorToken);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (!tokenResult.rows.length) {
      return res.status(500).json({ error: "Failed to store refresh token" });
    }

    // Set refresh token in secure cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "Strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      message: "User signed in successfully.",
      accessToken,
      //refreshToken,
    });
  } catch (error) {
    console.error("JWT error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Implement the refresh token endpoint
export async function refresh(req, res) {
  const token = req.cookies.refreshToken;
  if (!token)
    return res.status(401).json({ error: "Refresh token is required" });

  const [errorLookup, { rows }] = await catchError(
    query("SELECT * FROM refresh_tokens WHERE token_hash = $1", [token])
  );
  if (errorLookup) {
    console.error("Token lookup error:", errorLookup);
    return res.status(500).json({ error: "Internal server error" });
  }
  if (!rows.length || rows[0].token_hash !== token)
    return res.status(401).json({ error: "Invalid refresh token" });

  // Successfully found the refresh token
  const user = rows[0];
  try {
    const accessToken = jwt.sign(
      { id: user.user_id, email: user.email },
      process.env.SECRET_KEY,
      { expiresIn: "15m" }
    );

    // TODO: consider rotating the refresh token here

    res.status(200).json({
      message: "Access token refreshed successfully.",
      accessToken,
    });
  } catch (error) {
    console.error("JWT error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function logout(req, res) {
  const token = req.cookies.refreshToken;
  if (!token) {
    return res.status(200).json({ message: "Already logged out" });
  }

  try {
    const [errorDelete, deleteResult] = await catchError(
      query("DELETE FROM refresh_tokens WHERE token_hash = $1 RETURNING *", [
        token,
      ])
    );
    if (errorDelete) {
      console.error("Error during logout:", errorDelete);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (!deleteResult.rows.length)
      return res.status(200).json({ message: "Already logged out" });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "Strict",
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
