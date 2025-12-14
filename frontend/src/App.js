import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Track from './pages/Track';
import Notes from './pages/Notes';
import Dashboard from './components/Dashboard';
import StatsDisplay from './components/StatsDisplay';

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://192.168.1.106:5001/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [stats, setStats] = useState({ gym: null, food: null });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentPage === 'dashboard') {
      fetchStats();
    }
  }, [isAuthenticated, currentPage]);

  const fetchStats = async () => {
    try {
      const [gymRes, foodRes] = await Promise.all([
        fetch(`${API_URL}/gym-stats`),
        fetch(`${API_URL}/food-stats`)
      ]);
      
      const gymData = await gymRes.json();
      const foodData = await foodRes.json();
      
      setStats({ gym: gymData, food: foodData });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLoginSuccess = () => {
    localStorage.setItem('auth_token', 'authenticated');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} apiUrl={API_URL} />;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Life Planner 1111</h1>
        <nav className="main-nav">
          <button
            className={currentPage === 'dashboard' ? 'active' : ''}
            onClick={() => setCurrentPage('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={currentPage === 'track' ? 'active' : ''}
            onClick={() => setCurrentPage('track')}
          >
            Track
          </button>
          <button
            className={currentPage === 'stats' ? 'active' : ''}
            onClick={() => setCurrentPage('stats')}
          >
            Stats
          </button>
          <button
            className={currentPage === 'notes' ? 'active' : ''}
            onClick={() => setCurrentPage('notes')}
          >
            Notes
          </button>
          <button onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>

      <div className="container">
        {currentPage === 'dashboard' && (
          <Dashboard apiUrl={API_URL} />
        )}

        {currentPage === 'track' && (
          <Track apiUrl={API_URL} />
        )}

        {currentPage === 'stats' && (
          <>
            <h2>Stats</h2>
            <StatsDisplay stats={stats} />
          </>
        )}

        {currentPage === 'notes' && (
          <Notes />
        )}
      </div>
    </div>
  );
}

export default App;