import express from "express";
import { register, login } from "../services/auth";
const router = express.Router();

router.post("/register", async (req, res) => {
  const result = await register(req.body);

  if ("error" in result) {
    return res.status(400).json(result);
  }

  res.json(result);
});

router.post("/login", async (req, res) => {
  const result = await login(req.body);

  if ("error" in result) {
    return res.status(401).json(result);
  }

  res.json(result);
});

export default router;