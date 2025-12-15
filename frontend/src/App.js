import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Track from './pages/Track';
import Notes from './pages/Notes';
import LifeDashboard from './pages/LifeDashboard';
import Tracking from './pages/Tracking';
import GoalsSetup from './pages/GoalsSetup';
import Settings from './pages/Settings';
import DevelopmentNotes from './pages/DevelopmentNotes';
import StatsDisplay from './components/StatsDisplay';
import SavedMeals from './components/SavedMeals';
import axios from 'axios';

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

  const handleLoadMeal = async (meal) => {
    try {
      // Create a pending log entry for today with the meal ingredients
      const today = new Date().toISOString().split('T')[0];

      // Build the input text from ingredients
      const ingredientsText = JSON.parse(meal.ingredients)
        .map(item => `${item.amount}${item.unit || 'g'} ${item.food}`)
        .join(', ');

      await axios.post(`${API_URL}/pending-log`, {
        input: ingredientsText,
        date: today
      });

      // Switch to dashboard to see the loaded meal
      setCurrentPage('dashboard');
    } catch (error) {
      console.error('Error loading meal:', error);
      throw error;
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} apiUrl={API_URL} />;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎯 Life Tracker</h1>
        <nav className="main-nav">
          <button
            className={currentPage === 'dashboard' ? 'active' : ''}
            onClick={() => setCurrentPage('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={currentPage === 'tracking' ? 'active' : ''}
            onClick={() => setCurrentPage('tracking')}
          >
            ✅ Tracking
          </button>
          <button
            className={currentPage === 'goals' ? 'active' : ''}
            onClick={() => setCurrentPage('goals')}
          >
            🎯 Goals Setup
          </button>
          <button
            className={currentPage === 'meals' ? 'active' : ''}
            onClick={() => setCurrentPage('meals')}
          >
            🍽️ Meals
          </button>
          <button
            className={currentPage === 'settings' ? 'active' : ''}
            onClick={() => setCurrentPage('settings')}
          >
            ⚙️ Settings
          </button>
          <button
            className={currentPage === 'devnotes' ? 'active' : ''}
            onClick={() => setCurrentPage('devnotes')}
          >
            📝 Dev Notes
          </button>
          <button onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>

      <div className="container">
        {currentPage === 'dashboard' && (
          <LifeDashboard apiUrl={API_URL} />
        )}

        {currentPage === 'tracking' && (
          <Tracking apiUrl={API_URL} onLoadMeal={handleLoadMeal} />
        )}

        {currentPage === 'goals' && (
          <GoalsSetup apiUrl={API_URL} />
        )}

        {currentPage === 'meals' && (
          <SavedMeals apiUrl={API_URL} onLoadMeal={handleLoadMeal} />
        )}

        {currentPage === 'settings' && (
          <Settings apiUrl={API_URL} />
        )}

        {currentPage === 'devnotes' && (
          <DevelopmentNotes />
        )}

        {/* Legacy pages - keeping for reference */}
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