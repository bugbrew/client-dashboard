import { useEffect, useState } from 'react';
import axios from 'axios';
import ActivityFeed from '../components/ActivityFeed';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    // 1. Get user info from localStorage
    const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(savedUser);

    // 2. Fetch Tasks from Backend
    const fetchTasks = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/tasks', { 
          withCredentials: true 
        });
        setTasks(res.data);
      } catch (err) {
        console.error("Could not fetch tasks - check if you are logged in!");
      }
    };
    fetchTasks();
  }, []);

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      // API call to update the task
      await axios.patch(`http://localhost:5000/api/tasks/${taskId}`, 
        { status: newStatus }, 
        { withCredentials: true }
      );
      
      // Update local state so the list reflects the change instantly
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
    } catch (err) {
      alert("Permission Denied: Only Admins/Managers can update task status.");
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Project Dashboard</h1>
          <p className="text-sm text-gray-500">Real-time task management</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900">{user?.name}</p>
          <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase tracking-wider">
            {user?.role}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List Section */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">Active Tasks</h2>
          
          {tasks.length === 0 && (
            <div className="bg-white p-10 text-center rounded border-2 border-dashed border-gray-200 text-gray-400">
              No tasks found. Ensure the seed script has been run.
            </div>
          )}

          {tasks.map(task => (
            <div key={task.id} className="p-5 bg-white shadow-sm border border-gray-100 rounded-xl flex justify-between items-center hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-gray-800">{task.title}</h3>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                    task.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {task.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    ID: {task.id.substring(0, 8)}...
                  </span>
                </div>
              </div>
              
              {/* RBAC Logic: Only Managers/Admins can change status to COMPLETED */}
              {task.status !== 'COMPLETED' && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                <button 
                  onClick={() => handleStatusUpdate(task.id, 'COMPLETED')}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  Mark Done
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Real-time Activity Feed Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}