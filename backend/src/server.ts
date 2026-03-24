import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron'; // <-- Added this for automated background jobs

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
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid Token" });
  }
};

// --- ROUTES ---

app.get('/', (req, res) => res.send("Backend is API-Ready"));

// 1. Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt: ${email} / ${password}`); // Check your terminal for this!

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log("❌ User not found in database");
      return res.status(401).json({ message: "User not found" });
    }

    // For Plan B, we match the plain text 'password123' 
    // because our seed uses that.
    if (password === "password123") {
      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name }, 
        JWT_SECRET, 
        { expiresIn: '1h' }
      );

      console.log("✅ Login successful for:", user.name);
      return res.json({ token, role: user.role, name: user.name });
    } else {
      console.log("❌ Password mismatch");
      return res.status(401).json({ message: "Invalid password" });
    }
  } catch (err) {
    console.error("Internal Server Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. Get Tasks
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

// 3. Update Task (Real-time Broadcast)
app.patch('/api/tasks/:id', authenticate, async (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updatedTask = await prisma.task.update({
      where: { id: id },
      data: { status: status },
    });

    // Broadcast the update to all clients
    const activityMessage = `${req.user.name} changed task "${updatedTask.title}" to ${status}`;
    
    io.emit('activity_feed', {
      message: activityMessage,
      timestamp: new Date(),
      userName: req.user.name
    });

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// --- AUTOMATED BACKGROUND JOB ---
// Runs every minute to check for overdue tasks
cron.schedule('* * * * *', async () => {
  const now = new Date();
  
  try {
    const overdueTasks = await prisma.task.updateMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ['COMPLETED', 'OVERDUE'] }
      },
      data: { status: 'OVERDUE' }
    });

    if (overdueTasks.count > 0) {
      io.emit('activity_feed', {
        message: `System: ${overdueTasks.count} tasks were marked as OVERDUE automatically.`,
        timestamp: new Date(),
        userName: "System"
      });
      console.log(`✅ System updated ${overdueTasks.count} overdue tasks.`);
    }
  } catch (err) {
    console.error("Cron Error:", err);
  }
});

server.listen(5000, () => console.log("🚀 Server at http://localhost:5000"));