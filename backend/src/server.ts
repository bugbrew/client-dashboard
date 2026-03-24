import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:5173", credentials: true } });

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = "velozity_secret_2026";

// RBAC Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) { res.status(401).json({ message: "Invalid Token" }); }
};

// --- ROUTES ---

// 1. Home (Just to stop the "Cannot GET /" error)
app.get('/', (req, res) => res.send("Backend is API-Ready"));

// 2. Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (user && password === "password123") { // Replace with bcrypt in real use
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
    res.cookie('access_token', token, { httpOnly: true, sameSite: 'lax' });
    return res.json({ role: user.role, name: user.name });
  }
  res.status(401).json({ message: "Invalid credentials" });
});

// 3. Get Tasks
app.get('/api/tasks', authenticate, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// 4. Update Task (Real-time)
// Replace or add this route in your server.ts
app.patch('/api/tasks/:id', authenticate, async (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // 1. Update the Task in PostgreSQL
    const updatedTask = await prisma.task.update({
      where: { id: id },
      data: { status: status },
    });

    // 2. Create an Activity Log entry (for the history requirement)
    const log = await prisma.activityLog.create({
      data: {
        message: `${req.user.name} changed task "${updatedTask.title}" to ${status}`,
        userId: req.user.id,
        role: req.user.role // Store the role to filter who sees it later
      }
    });

    // 3. BROADCAST: Tell all connected clients via Socket.io
    io.emit('activity_feed', {
      message: log.message,
      timestamp: log.createdAt,
      userName: req.user.name
    });

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

server.listen(5000, () => console.log("🚀 Server at http://localhost:5000"));