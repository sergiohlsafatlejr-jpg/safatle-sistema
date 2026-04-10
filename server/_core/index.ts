import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeJobScheduler } from "./jobScheduler";
import { startBoletoCron } from "../workers/boletoChecker";
import { startDailyReportSync } from "../workers/dailyReportSync";
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Force restart
  console.log("Restarting TRPC Router with Tasy module...");
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Serve local uploads when forge config missing
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: (opts) => {
        try { fs.appendFileSync('error_trpc.log', new Date().toISOString() + ' [' + opts.path + '] ' + (opts.error.stack || opts.error.message) + '\n'); } catch(e){}
        console.error('TRPC Error on', opts.path, opts.error);
      }
    })
  );
  // development mode uses Vite, production mode uses static files
  if ((process.env.NODE_ENV || "").trim() === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Inicializar JobScheduler e Cron de Boletos
  try {
    await initializeJobScheduler();
    startBoletoCron();
    startDailyReportSync();
  } catch (error) {
    console.error("Erro ao inicializar JobScheduler ou Cron:", error);
  }
}

startServer().catch(console.error);
