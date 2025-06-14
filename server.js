import express from "express";
import { config } from "dotenv";
import { router as authRoutes } from "./api/routes/auth.js";
import { router as userRoutes } from "./api/routes/users.js";
import cookieParser from "cookie-parser";

config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
