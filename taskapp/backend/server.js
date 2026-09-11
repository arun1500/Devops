const express = require("express");
const cors = require("cors");
const pool = require("./db");
const tasksRouter = require("./routes/tasks");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Simple request logger - handy when practicing observability
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Liveness probe - process is up
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Readiness probe - process AND db are reachable
app.get("/ready", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ready" });
  } catch (err) {
    res.status(503).json({ status: "not ready", error: err.message });
  }
});

app.use("/api/tasks", tasksRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
