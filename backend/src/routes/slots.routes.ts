import { Router } from "express";
import * as c from "../controllers/slots.controller.js";
import { asyncRoute } from "../utils/asyncRoute.js";

const r = Router();
r.get("/", asyncRoute(c.getSlots));

export default r;
