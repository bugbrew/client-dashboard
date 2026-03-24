import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  // 1. Upsert Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: { email: 'admin@test.com', name: 'Admin User', password, role: 'ADMIN' },
  });

  // 2. Create a Project (Required for Tasks)
  const project = await prisma.project.create({
    data: {
      name: 'Alpha Website Redesign',
      description: 'Main project for the assessment',
    }
  });

  // 3. Create 3 Tasks
  await prisma.task.createMany({
    data: [
      { 
        title: 'Setup WebSocket Server', 
        status: 'TODO', 
        projectId: project.id, 
        dueDate: new Date(Date.now() + 86400000) 
      },
      { 
        title: 'Configure PostgreSQL', 
        status: 'IN_PROGRESS', 
        projectId: project.id, 
        dueDate: new Date(Date.now() + 172800000) 
      },
      { 
        title: 'Implement RBAC Middleware', 
        status: 'TODO', 
        projectId: project.id, 
        dueDate: new Date(Date.now() - 86400000) // This will show as OVERDUE logic test
      },
    ]
  });

  console.log('✅ DATABASE POPULATED: 1 Admin, 1 Project, 3 Tasks.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });