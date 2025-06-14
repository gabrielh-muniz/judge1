import { Router } from "express";
import { signup, signin, refresh } from "../controllers/authController.js";

const router = Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/refresh", refresh);

export { router };
