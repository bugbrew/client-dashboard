import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:5173", credentials: true } });

// Enhanced CORS to prevent the "Cannot connect" false-positive
app.use(cors({ 
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"], 
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(cookieParser())

const JWT_SECRET = "velozity_secret_2026";

// --- TYPESCRIPT INTERFACES ---
export interface AuthRequest extends Request {
  user?: {
    id: string; // Change to 'number' if your Prisma ID is an Int
    role: string;
    name: string;
  };
}

// --- RBAC MIDDLEWARE ---
const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string, role: string, name: string };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid Token" });
  }
};

// --- ROUTES ---

app.get('/', (req: Request, res: Response) => {
  res.send("Backend is API-Ready");
});

// 1. Login
app.post('/api/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  console.log(`Login attempt: ${email} / ${password}`);

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log("❌ User not found in database");
      res.status(401).json({ message: "User not found" });
      return;
    }

    if (password === "password123") {
      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name }, 
        JWT_SECRET, 
        { expiresIn: '1h' }
      );

      console.log("✅ Login successful for:", user.name);
      res.json({ token, role: user.role, name: user.name });
    } else {
      console.log("❌ Password mismatch");
      res.status(401).json({ message: "Invalid password" });
    }
  } catch (err) {
    console.error("Internal Server Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. Get Dashboard Data (Real User & Tasks)
app.get('/api/dashboard-data', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }, 
      select: { id: true, name: true, role: true, email: true } 
    });

    if (!user) {
      res.status(404).json({ message: "User not found in database" });
      return;
    }

    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({ user, tasks });

  } catch (error) {
    console.error("Dashboard Data Error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// 3. Get All Tasks (General)
app.get('/api/tasks', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// 4. Update Task (Real-time Broadcast)
app.patch('/api/tasks/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string; 
  const { status } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id: id },
      data: { status: status },
    });

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

// 5. Create a New Task (Admin/Manager Only) - FIXED
app.post('/api/tasks', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
      res.status(403).json({ message: "Forbidden: You do not have permission to create tasks." });
      return;
    }

    // Extract projectId from the incoming request body
    const { title, description, projectId } = req.body;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    // Create the task in Prisma, linking it to the projectId
    const newTask = await prisma.task.create({
      data: {
        title,
        description,
        status: 'TODO',
        dueDate: dueDate,
        projectId: projectId // Satisfies Prisma's strict relation requirement!
      }
    });

    io.emit('activity_feed', {
      message: `${req.user.name} created a new task: "${newTask.title}"`,
      timestamp: new Date(),
      userName: req.user.name
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error("Create Task Error:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// --- AUTOMATED BACKGROUND JOB ---
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