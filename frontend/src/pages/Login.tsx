import { useState } from 'react';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: any) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/login', { email, password });
      
      // SUCCESS: res.data now contains { token, role, name }
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify({ 
        name: res.data.name, 
        role: res.data.role 
      }));
      
      // Move to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      console.error(err);
      alert("Login Failed: Check your email/password or Backend console.");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="p-8 bg-white shadow-md rounded-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Velozity Login</h2>
        <input 
          type="email" 
          placeholder="admin@test.com" 
          className="border p-2 w-full mb-4 rounded" 
          onChange={(e) => setEmail(e.target.value)} 
        />
        <input 
          type="password" 
          placeholder="password123" 
          className="border p-2 w-full mb-6 rounded" 
          onChange={(e) => setPassword(e.target.value)} 
        />
        <button className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2 rounded font-bold transition">
          Login
        </button>
      </form>
    </div>
  );
}