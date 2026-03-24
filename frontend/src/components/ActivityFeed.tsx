import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function ActivityFeed() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
  const socket = io('http://localhost:5000');

  // Listen for the 'activity_feed' event we defined in the backend
  socket.on('activity_feed', (newLog) => {
    setLogs((currentLogs) => [newLog, ...currentLogs]);
    
    // Bonus: Show a popup notification
    console.log("New Activity:", newLog.message);
  });

  return () => { socket.disconnect(); };
}, []);

  return (
    <div className="p-4 border rounded bg-white h-64 overflow-y-auto">
      <h3 className="font-bold mb-2">Live Activity Feed</h3>
      {logs.map((log, i) => (
        <div key={i} className="text-sm border-b py-1">
          <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
        </div>
      ))}
    </div>
  );
}