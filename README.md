# Velozity Client Project Dashboard

A real-time task management system with Role-Based Access Control (RBAC).

## 🚀 Features
- **Real-time Updates:** Tasks sync across all clients instantly using Socket.io.
- **Secure Auth:** JWT stored in **HttpOnly Cookies** to prevent XSS.
- **RBAC:** Admins/Managers can update status; Developers have read-only access to specific actions.
- **Background Jobs:** Node-cron automatically flags overdue tasks.

## 🛠️ Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, Lucide-React.
- **Backend:** Node.js, Express, Socket.io.
- **Database:** PostgreSQL with Prisma ORM.

## 🏃 How to Run
1. **Database:** Ensure PostgreSQL is running and update `.env`.
2. **Backend:** - `npm install`
   - `npx prisma migrate dev`
   - `npx tsx prisma/seed.ts`
   - `npx tsx src/server.ts`
3. **Frontend:**
   - `npm install`
   - `npm run dev`