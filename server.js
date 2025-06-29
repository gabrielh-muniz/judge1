import express from "express";
import { config } from "dotenv";
import { router as authRoutes } from "./api/routes/auth.js";
import { router as userRoutes } from "./api/routes/users.js";
import cookieParser from "cookie-parser";
import cors from "cors";

config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3001",
  "http://127.0.0.1:8080", // or localhost:8080
  "http://localhost:8080",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl requests, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-KEY",
      "Access-Control-Allow-Origin",
    ],
  })
);
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "CORS Error: Origin not allowed",
      message: "The request origin is not in the allowed list of origins.",
    });
  }
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
