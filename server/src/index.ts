import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import { connectDb } from "./db.js";
import spritesRouter from "./routes/sprites.js";

const app = express();
const PORT = Number(process.env.PORT ?? 5000);

app.use(cors({
    origin: ['https://svg-sprites-react.vercel.app'],
    methods: ['POST', 'GET'],
    credentials: true,
}))
app.use(express.json({ limit: "5mb" }));

// Log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log(`  Headers:`, { origin: req.headers.origin, host: req.headers.host });
    next();
});

app.get("/", (_req: Request, res: Response) => {
    res.send("Backend Running");
});

app.use("/api/sprites", spritesRouter);

// Connect to DB once at module load (Vercel serverless)
connectDb().catch(() => console.error("[server] Starting without DB connection."));

// Required for Vercel — export app as the serverless handler
export default app;

// Local development only
if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`[server] Running on port ${PORT}`);
    });
}
