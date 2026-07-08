import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import { connectDb } from "./db.js";
import spritesRouter from "./routes/sprites.js";

const app = express();
const PORT = Number(process.env.PORT ?? 5000);

// Allow CORS from the frontend domain(s)
const allowedOrigins = process.env.CLIENT_URL 
    ? process.env.CLIENT_URL.split(",").map(url => url.trim())
    : ["http://localhost:3000", "http://localhost:5173"];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
            callback(null, true);
        } else {
            console.log(`CORS blocked: ${origin}`);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));
app.use(express.json({ limit: "5mb" }));

app.get("/", (_req: Request, res: Response) => {
    res.send("Backend Running");
});

app.use("/api/sprites", spritesRouter);

async function start() {
    try {
        await connectDb();
    } catch (err) {
        // We still start the HTTP server so the rest of the API can
        // respond (e.g. with a clear error for the DB-backed routes).
        console.error("[server] Starting without DB connection.");
    }

    app.listen(PORT, () => {
        console.log(`[server] Running on port ${PORT}`);
    });
}

void start();
