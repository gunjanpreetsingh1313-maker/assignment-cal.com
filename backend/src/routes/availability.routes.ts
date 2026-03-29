import { Router } from "express";
import * as c from "../controllers/availability.controller.js";
import { asyncRoute } from "../utils/asyncRoute.js";

const r = Router();
r.get("/:eventTypeId", asyncRoute(c.getByEventType));
r.post("/", asyncRoute(c.save));

export default r;
