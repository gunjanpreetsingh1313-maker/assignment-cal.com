import { Router } from "express";
import * as c from "../controllers/bookings.controller.js";
import { asyncRoute } from "../utils/asyncRoute.js";

const r = Router();
r.get("/", asyncRoute(c.list));
r.post("/", asyncRoute(c.create));
r.patch("/:id", asyncRoute(c.patch));

export default r;
