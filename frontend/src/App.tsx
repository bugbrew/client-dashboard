import React, { useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  // Check if we already have a token in storage
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  // THIS IS THE MISSING FUNCTION
  const handleLoginSuccess = () => {
    console.log("Login successful! Switching to Dashboard...");
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  return (
    <div className="App">
      {isLoggedIn ? (
        // Pass the logout function to Dashboard
        <Dashboard onLogout={handleLogout} />
      ) : (
        // CRITICAL: You must pass handleLoginSuccess to the onLoginSuccess prop!
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;