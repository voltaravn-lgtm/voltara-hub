let app: any = null;
let loadError: any = null;

async function getApp() {
  if (app) return app;
  if (loadError) throw loadError;
  try {
    // Dynamic import to prevent top-level load failure
    const module = await import("../server.js");
    app = module.default;
    return app;
  } catch (err: any) {
    loadError = err;
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  // Ensure CORS headers are present on all responses, including errors and preflights
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    const expressApp = await getApp();
    return expressApp(req, res);
  } catch (err: any) {
    console.error("Vercel Startup Error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      error: "Vercel Startup/Runtime Error",
      message: err.message,
      stack: err.stack
    }, null, 2));
  }
}
