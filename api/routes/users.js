import { Router } from "express";
import { getAllUsers, getUserById } from "../controllers/userController.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = Router();

router.get("/", verifyToken, getAllUsers);
router.get("/:id", verifyToken, getUserById);

export { router };
