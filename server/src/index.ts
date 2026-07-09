import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import { connectDb } from "./db.js";
import spritesRouter from "./routes/sprites.js";

const app = express();
const PORT = Number(process.env.PORT ?? 5000);

app.use(cors())
app.use(express.json({ limit: "5mb" }));

app.get("/", (_req: Request, res: Response) => {
    res.send("Backend Running");
});

app.use("/api/sprites", spritesRouter);

// Required for Vercel — export app as the serverless handler
export default app;

// Local development only
if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`[server] Running on port ${PORT}`);
    });
}
