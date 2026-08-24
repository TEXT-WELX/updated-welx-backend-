const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");

dotenv.config();
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));
app.get("/", (_req, res) => res.json({ ok: true, service: "wlex-backend-fixed" }));

app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/onboarding", require("./src/routes/onboarding"));
app.use("/api/employees", require("./src/routes/employees"));
app.use("/api/company", require("./src/routes/company"));
app.use("/api/courses", require("./src/routes/courses"));
app.use("/api/payment", require("./src/routes/payment"));
app.use("/api/progress", require("./src/routes/progress"));
app.use("/api/quizzes", require("./src/routes/quizzes"));
app.use("/api/career-path", require("./src/routes/careerPath"));
app.use("/api/points", require("./src/routes/points"));
app.use("/api/learner", require("./src/routes/learner"));

const port = Number(process.env.PORT || 5000);
async function startServer() {
  try {
    await connectDB();
    const server = app.listen(port, () => console.log(`WEL.X API running at http://localhost:${port}`));
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") console.error(`Port ${port} is already in use. Stop the old backend process so the frontend stays connected to http://localhost:${port}.`);
      else console.error("Server error:", error.message);
    });
    return server;
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exitCode = 1;
    throw error;
  }
}

if (require.main === module) startServer();
module.exports = { app, startServer };
