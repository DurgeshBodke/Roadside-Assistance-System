import express from "express";
import {
  createRequest,
  nearbyRequests,
  myRequests,
  updateStatus,
} from "./requests";

const router = express.Router();

router.post("/", async (req, res) => {
  const result = await createRequest({
    token: req.headers.authorization?.split(" ")[1] || null,
    ...req.body,
  });

  res.status(result.status).json(result.body);
});

router.get("/my", async (req, res) => {
  const result = await myRequests(
    req.headers.authorization?.split(" ")[1] || null
  );

  res.status(result.status).json(result.body);
});

router.get("/nearby", async (req, res) => {
  const result = await nearbyRequests({
    token: req.headers.authorization?.split(" ")[1] || null,
    point: {
      lat: Number(req.query.lat),
      lng: Number(req.query.lng),
    },
    radiusKm: Number(req.query.radius) || 25,
  });

  res.status(result.status).json(result.body);
});

router.put("/:id/status", async (req, res) => {
  const result = await updateStatus({
    token: req.headers.authorization?.split(" ")[1] || null,
    requestId: req.params.id,
    status: req.body.status,
  });

  res.status(result.status).json(result.body);
});

export default router;