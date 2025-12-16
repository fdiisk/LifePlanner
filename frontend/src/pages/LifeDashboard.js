import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Droplets, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

function LifeDashboard({ apiUrl }) {
  const [loading, setLoading] = useState(true);
  const [pendingLogs, setPendingLogs] = useState([]);
  const [compiledStats, setCompiledStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const extractNutritionTargets = (goals) => {
    // Extract nutrition targets from daily goals
    const targets = {};
    const flattenGoals = (goalsList) => {
      goalsList.forEach(goal => {
        if (goal.goal_type === 'daily' && goal.target_value) {
          const title = goal.title.toLowerCase();
          if (title.includes('calorie')) {
            targets.daily_calories_target = parseInt(goal.target_value);
          } else if (title.includes('protein')) {
            targets.daily_protein_target = parseInt(goal.target_value);
          } else if (title.includes('carb')) {
            targets.daily_carbs_target = parseInt(goal.target_value);
          } else if (title.includes('fat')) {
            targets.daily_fats_target = parseInt(goal.target_value);
          }
        }
        if (goal.children && goal.children.length > 0) {
          flattenGoals(goal.children);
        }
      });
    };
    flattenGoals(goals);
    return Object.keys(targets).length > 0 ? targets : null;
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch pending logs, compiled stats, goals, and settings in parallel
      const [pendingRes, foodRes, goalsRes, settingsRes] = await Promise.all([
        fetch(`${apiUrl}/pending-log?date=${selectedDate}`),
        fetch(`${apiUrl}/food-stats?date=${selectedDate}`),
        fetch(`${apiUrl}/life-tracking?resource=goals`),
        fetch(`${apiUrl}/life-tracking?resource=settings`)
      ]);

      const pendingData = await pendingRes.json();
      const foodData = await foodRes.json();
      const goalsData = await goalsRes.json();
      const settingsData = await settingsRes.json();

      // Flatten the grouped logs into a single array
      const allLogs = [];
      if (pendingData.logs) {
        Object.entries(pendingData.logs).forEach(([category, logs]) => {
          logs.forEach(log => {
            allLogs.push({
              ...log,
              category: category
            });
          });
        });
      }
      setPendingLogs(allLogs);
      setCompiledStats(foodData);

      // Extract nutrition targets from goals (priority) or use settings (fallback)
      const goalTargets = extractNutritionTargets(goalsData.goals || []);
      setSettings(goalTargets || settingsData.settings);
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

  const renderProgressBar = (label, current, target, unit = '') => {
    if (!target) return null;

    const percentage = (current / target) * 100;
    const difference = current - target;
    const isOver = difference > 0;
    const isClose = Math.abs(difference) <= target * 0.05; // Within 5%

    return (
      <div className="stat-item" style={{ display: 'block' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span className="stat-label">{label}</span>
          <span className="stat-value">
            {Math.round(current)}/{target}{unit}
            <span style={{
              marginLeft: '8px',
              fontSize: '12px',
              color: isClose ? '#10b981' : isOver ? '#ff8c00' : '#6b7280'
            }}>
              ({isOver ? '+' : ''}{Math.round(difference)}{unit})
            </span>
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '6px',
          background: '#e5e7eb',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${Math.min(percentage, 100)}%`,
            height: '100%',
            background: isClose ? '#10b981' : percentage > 100 ? '#ff8c00' : '#0066ff',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    );
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
          {settings ? (
            <>
              {renderProgressBar('Calories', displayData.calories, settings.daily_calories_target)}
              {renderProgressBar('Protein', displayData.protein, settings.daily_protein_target, 'g')}
              {renderProgressBar('Carbs', displayData.carbs, settings.daily_carbs_target, 'g')}
              {renderProgressBar('Fats', displayData.fats, settings.daily_fats_target, 'g')}
            </>
          ) : (
            <>
              <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '0.25rem', marginBottom: '12px' }}>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  Set nutrition goals in Goals Setup to track progress
                </p>
              </div>
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
            </>
          )}
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
