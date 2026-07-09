import express from "express";
import { adminOverview } from "./requests";
const router = express.Router();

router.get("/overview", async (req, res) => {
  const result = await adminOverview(
    req.headers.authorization?.split(" ")[1] || null
  );

  res.status(result.status).json(result.body);
});

export default router;