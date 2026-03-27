import React, { useState, useEffect } from 'react';
import './Dashboard.css';

interface User {
  id: string | number;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'DEVELOPER';
}

interface Task {
  id: string | number;
  title: string; 
  description?: string;
  status: string;
}

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<string>('tasks');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newProjectId, setNewProjectId] = useState(''); // NEW: Track Project ID

  // Fetch Data
  useEffect(() => {
    const fetchRealData = async () => {
      const token = localStorage.getItem('token');
      if (!token) { onLogout(); return; }

      try {
        const response = await fetch('http://localhost:5000/api/dashboard-data', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Unauthorized");
        const data = await response.json();
        setCurrentUser(data.user);
        setTasks(data.tasks || []); 
      } catch (err) {
        setError("Failed to load real data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRealData();
  }, [onLogout]);

  const handleSignOut = () => {
    localStorage.removeItem('token'); 
    onLogout(); 
  };

  const handleStatusChange = async (taskId: string | number, newStatus: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setTasks(prevTasks => prevTasks.map(task => task.id === taskId ? { ...task, status: newStatus } : task));
    try {
      await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // --- UPDATE: Handle Creating a Task with Project ID ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          title: newTaskTitle, 
          description: newTaskDesc,
          projectId: newProjectId // Included to satisfy Prisma relation
        })
      });

      if (response.ok) {
        const createdTask = await response.json();
        setTasks(prev => [createdTask, ...prev]);
        setIsModalOpen(false);
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewProjectId('');
      } else {
        const errData = await response.json();
        alert(`Failed to create task: ${errData.message || "Ensure Project ID is valid"}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="dashboard-layout">
      
      {/* SIDEBAR */}
      <aside className="corporate-sidebar">
        <div className="sidebar-header">
          <h2>Velozity<span className="text-red">Dash</span></h2>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Tasks & Status</button>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleSignOut}>Sign Out</button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-text-group">
            <h1 className="greeting">Dashboard</h1>
            <p className="subtitle">Welcome back, {currentUser?.name}</p>
          </div>
          <div className="user-profile">
            <span className={`role-badge ${currentUser?.role?.toLowerCase()}`}>{currentUser?.role}</span>
          </div>
        </header>

        {error && <div className="error-alert">{error}</div>}

        <div className="dashboard-content">
          {activeTab === 'tasks' && (
            <div className="projects-view">
              <div className="section-header">
                <h2>Task Database</h2>
                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                  <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                    Add New Task
                  </button>
                )}
              </div>

              <div className="data-grid">
                {tasks.map(task => (
                  <div key={task.id} className="corporate-card">
                    <div className="card-header">
                      <h3>{task.title}</h3>
                      <select 
                        value={task.status} 
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className={`status-dropdown ${task.status.toLowerCase()}`}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="OVERDUE">Overdue</option>
                      </select>
                    </div>
                    <p className="description">{task.description || "No description provided."}</p>
                    <div className="card-footer">
                      <span className="project-id">ID: {task.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- MODAL POPUP --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Create New Task</h2>
            <form onSubmit={handleCreateTask}>
              {/* NEW: PROJECT ID INPUT */}
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Project ID</label>
                <input 
                  type="text" 
                  value={newProjectId} 
                  onChange={(e) => setNewProjectId(e.target.value)} 
                  placeholder="Enter parent project ID"
                  required 
                  style={{ width: '100%', padding: '0.8rem', border: '1px solid #d4d4d8', borderRadius: '6px' }}
                />
              </div>

              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Task Title</label>
                <input 
                  type="text" 
                  value={newTaskTitle} 
                  onChange={(e) => setNewTaskTitle(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '0.8rem', border: '1px solid #d4d4d8', borderRadius: '6px' }}
                />
              </div>

              <div className="input-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Description</label>
                <textarea 
                  value={newTaskDesc} 
                  onChange={(e) => setNewTaskDesc(e.target.value)} 
                  required 
                  rows={4}
                  style={{ width: '100%', padding: '0.8rem', border: '1px solid #d4d4d8', borderRadius: '6px', resize: 'vertical' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;