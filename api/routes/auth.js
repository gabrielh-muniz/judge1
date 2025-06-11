import { Router } from "express";
import { signup, listUsers } from "../controllers/authController.js";

const router = Router();

router.post("/signup", signup);
router.get("/list-users", listUsers);

export default router;
