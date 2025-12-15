import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Droplets, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

function LifeDashboard({ apiUrl }) {
  const [loading, setLoading] = useState(true);
  const [pendingLogs, setPendingLogs] = useState([]);
  const [compiledStats, setCompiledStats] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch pending logs
      const pendingRes = await fetch(`${apiUrl}/pending-log?date=${selectedDate}`);
      const pendingData = await pendingRes.json();
      setPendingLogs(pendingData.logs || []);

      // Fetch compiled food stats
      const foodRes = await fetch(`${apiUrl}/food-stats?date=${selectedDate}`);
      const foodData = await foodRes.json();
      setCompiledStats(foodData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  }, [apiUrl, selectedDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const calculatePendingTotals = () => {
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      water: 0,
      caffeine: 0,
      steps: 0,
      sleepHours: 0
    };

    // Safety check: ensure pendingLogs is an array
    if (!Array.isArray(pendingLogs)) {
      return totals;
    }

    pendingLogs.forEach(log => {
      let parsedData = log.parsed_data;
      if (typeof parsedData === 'string') {
        try {
          parsedData = JSON.parse(parsedData);
        } catch (e) {
          return;
        }
      }

      if (log.category === 'food' && parsedData.items) {
        parsedData.items.forEach(item => {
          totals.calories += item.calories || 0;
          totals.protein += item.protein || 0;
          totals.carbs += item.carbs || 0;
          totals.fats += item.fats || 0;
        });
      } else if (log.category === 'water') {
        totals.water += parsedData.amount_ml || 0;
      } else if (log.category === 'caffeine') {
        totals.caffeine += parsedData.caffeine_mg || 0;
      } else if (log.category === 'steps') {
        totals.steps += parsedData.total_steps || 0;
      } else if (log.category === 'sleep') {
        totals.sleepHours += parsedData.duration_hours || 0;
      }
    });

    return totals;
  };

  const hasCompiledStats = compiledStats && compiledStats.total_calories > 0;
  const pendingTotals = calculatePendingTotals();

  // Determine which data to display
  const displayData = hasCompiledStats
    ? {
        calories: compiledStats.total_calories,
        protein: compiledStats.total_protein,
        carbs: compiledStats.total_carbs,
        fats: compiledStats.total_fats,
        water: 0, // Not in compiled stats yet
        caffeine: 0,
        steps: 0,
        sleepHours: 0,
        status: 'compiled'
      }
    : {
        ...pendingTotals,
        status: 'pending'
      };

  const changeDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <div className="life-dashboard">
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Activity className="spinner" size={32} />
          <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="life-dashboard">
      <div className="dashboard-header">
        <h2>Daily Health Overview</h2>
        <div className="date-selector">
          <button className="date-nav" onClick={() => changeDate(-1)}>←</button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-nav"
          />
          <button className="date-nav" onClick={() => changeDate(1)}>→</button>
        </div>
      </div>

      <div style={{ marginBottom: '24px', padding: '12px 16px', background: displayData.status === 'compiled' ? 'rgba(0, 102, 255, 0.1)' : 'rgba(255, 165, 0, 0.1)', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {displayData.status === 'compiled' ? (
          <>
            <CheckCircle size={18} style={{ color: '#0066ff' }} />
            <span style={{ color: '#0066ff', fontSize: '14px', fontWeight: 500 }}>Compiled & Reviewed</span>
          </>
        ) : (
          <>
            <AlertCircle size={18} style={{ color: '#ff8c00' }} />
            <span style={{ color: '#ff8c00', fontSize: '14px', fontWeight: 500 }}>In Progress - Pending Review</span>
          </>
        )}
      </div>

      <div className="stats-display">
        <div className="stat-card">
          <h3><Activity size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Nutrition</h3>
          <div className="stat-item">
            <span className="stat-label">Calories</span>
            <span className="stat-value">{Math.round(displayData.calories)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Protein</span>
            <span className="stat-value">{Math.round(displayData.protein)}g</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Carbs</span>
            <span className="stat-value">{Math.round(displayData.carbs)}g</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Fats</span>
            <span className="stat-value">{Math.round(displayData.fats)}g</span>
          </div>
        </div>

        <div className="stat-card">
          <h3><Droplets size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Hydration & Stimulants</h3>
          <div className="stat-item">
            <span className="stat-label">Water</span>
            <span className="stat-value">{displayData.water}ml</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Caffeine</span>
            <span className="stat-value">{displayData.caffeine}mg</span>
          </div>
        </div>

        <div className="stat-card">
          <h3><TrendingUp size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Activity & Recovery</h3>
          <div className="stat-item">
            <span className="stat-label">Steps</span>
            <span className="stat-value">{displayData.steps.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Sleep</span>
            <span className="stat-value">{displayData.sleepHours}h</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LifeDashboard;
