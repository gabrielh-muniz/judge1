import { Router } from "express";
import { getAllUsers } from "../controllers/userController.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = Router();

router.get("/", verifyToken, getAllUsers);

export { router };
