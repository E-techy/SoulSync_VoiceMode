import express, { Application, Request, Response } from 'express';
import dotenv from "dotenv";

dotenv.config();
const PORT = process.env.VOICE_MODE_PORT || 3001;

const app: Application = express();

// Middleware to parse JSON bodies
app.use(express.json());

// A basic GET route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World! This is a TypeScript and Express server.');
});


// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 SoulSync VoiceMode server running on http://localhost:${PORT}`);
});