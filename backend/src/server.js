import "dotenv/config";
import app from "./app.js";
import pool from "./db/pool.js";

const port = Number(process.env.PORT) || 5000;
const nodeEnv = process.env.NODE_ENV || "development";
const apiPrefix = process.env.API_PREFIX || "/api/v1";

const startServer = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL pool connected successfully.");

    const server = app.listen(port, () => {
      console.log(
        `Server running on port ${port} in ${nodeEnv} mode at ${apiPrefix}`
      );
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Closing server and DB pool...`);

      server.close(async () => {
        await pool.end();
        console.log("Server and PostgreSQL pool closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });
    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  } catch (error) {
    console.error("Failed to connect PostgreSQL pool:", error.message);
    process.exit(1);
  }
};

void startServer();
