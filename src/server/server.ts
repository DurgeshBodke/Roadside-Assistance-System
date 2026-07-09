import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { connect } from "./db";

import authRoutes from "./routes/auth";
import requestRoutes from "./routes/request";
import adminRoutes from "./routes/admin";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connect();

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Roadside Assistance API Running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});