import { useState } from 'react';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: any) => {
    e.preventDefault();
    try {
      // withCredentials is REQUIRED for HttpOnly cookies
      const res = await axios.post('http://localhost:5000/api/login', 
        { email, password }, 
        { withCredentials: true } 
      );
      localStorage.setItem('user', JSON.stringify(res.data));
      alert(`Logged in as ${res.data.role}`);
      window.location.href = '/dashboard';
    } catch (err) {
      alert("Login Failed");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="p-8 bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Velozity Dashboard</h2>
        <input type="email" placeholder="Email" className="border p-2 w-full mb-2" 
               onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="border p-2 w-full mb-4" 
               onChange={(e) => setPassword(e.target.value)} />
        <button className="bg-blue-600 text-white w-full py-2 rounded">Login</button>
      </form>
    </div>
  );
}