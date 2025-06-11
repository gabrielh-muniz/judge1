import express from "express";
import { config } from "dotenv";
import { router as authRoutes } from "./api/routes/auth.js";

config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/v1/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
