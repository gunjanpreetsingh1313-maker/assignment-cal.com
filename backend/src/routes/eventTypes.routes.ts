import { Router } from "express";
import * as c from "../controllers/eventTypes.controller.js";
import { asyncRoute } from "../utils/asyncRoute.js";

const r = Router();
r.get("/", asyncRoute(c.list));
r.post("/", asyncRoute(c.create));
r.put("/:id", asyncRoute(c.update));
r.delete("/:id", asyncRoute(c.remove));

export default r;
