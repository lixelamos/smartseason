import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import fieldsRoutes from "./routes/fields";
import dashboardRoutes from "./routes/dashboard";
import agentsRoutes from "./routes/agents";
import reportsRoutes from "./routes/reports";

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
    optionsSuccessStatus: 204,
    maxAge: 86_400,
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/fields", fieldsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/agents", agentsRoutes);
app.use("/api/reports", reportsRoutes);

export { app };
