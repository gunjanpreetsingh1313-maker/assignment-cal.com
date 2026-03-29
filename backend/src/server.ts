import cors from "cors";
import express from "express";
import dotenv from "dotenv";

import eventTypesRoutes from "./routes/eventTypes.routes.js";
import availabilityRoutes from "./routes/availability.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import slotsRoutes from "./routes/slots.routes.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/event-types", eventTypesRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/slots", slotsRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
