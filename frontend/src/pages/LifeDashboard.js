import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Droplets, TrendingUp, Star, Target, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { BarChart, LineChart, ProgressRing, TrendIndicator } from '../components/Charts';

function LifeDashboard({ apiUrl }) {
  const [loading, setLoading] = useState(true);
  const [pendingLogs, setPendingLogs] = useState([]);
  const [compiledStats, setCompiledStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [goals, setGoals] = useState([]);
  const [achievements, setAchievements] = useState({});
  const [timeframe, setTimeframe] = useState('today'); // today, yesterday, week, month, quarter, year
  const [historicalData, setHistoricalData] = useState([]);

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
      // Fetch pending logs, compiled stats, goals, settings, and achievements in parallel
      const [pendingRes, foodRes, goalsRes, settingsRes, achievementsRes] = await Promise.all([
        fetch(`${apiUrl}/pending-log?date=${selectedDate}`),
        fetch(`${apiUrl}/food-stats?date=${selectedDate}`),
        fetch(`${apiUrl}/life-tracking?resource=goals`),
        fetch(`${apiUrl}/life-tracking?resource=settings`),
        fetch(`${apiUrl}/life-tracking?resource=goal-achievements&date=${selectedDate}`)
      ]);

      const pendingData = await pendingRes.json();
      const foodData = await foodRes.json();
      const goalsData = await goalsRes.json();
      const settingsData = await settingsRes.json();
      const achievementsData = await achievementsRes.json();

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

      // Flatten goals for display
      const flattenGoals = (goalsList) => {
        let flat = [];
        goalsList.forEach(goal => {
          flat.push(goal);
          if (goal.children && goal.children.length > 0) {
            flat = flat.concat(flattenGoals(goal.children));
          }
        });
        return flat;
      };
      const allGoals = flattenGoals(goalsData.goals || []);
      const dailyGoals = allGoals.filter(g => g.goal_type === 'daily' && g.health_metric_type && g.target_value);
      setGoals(dailyGoals);
      setAchievements(achievementsData.achievements || {});

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

    return (
      <div className="data-row">
        <span className="data-label">{label}</span>
        <span className="data-value">
          {Math.round(current)}/{target}{unit}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="life-dashboard">
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Activity className="spinner" size={32} />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const timeframes = [
    { id: 'today', label: 'Today', days: 1 },
    { id: 'yesterday', label: 'Yesterday', days: 1 },
    { id: 'week', label: 'Last 7 Days', days: 7 },
    { id: 'month', label: 'Last 30 Days', days: 30 },
    { id: 'quarter', label: 'Last Quarter', days: 90 },
    { id: 'year', label: 'Last Year', days: 365 }
  ];

  return (
    <div className="life-dashboard">
      <div className="dashboard-header">
        <div className="date-selector">
          <button className="date-nav" onClick={() => changeDate(-1)}>←</button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              padding: '4px 8px',
              cursor: 'pointer'
            }}
          />
          <button className="date-nav" onClick={() => changeDate(1)}>→</button>
        </div>

        <div className="timeframe-selector">
          {timeframes.map(tf => (
            <button
              key={tf.id}
              className={`btn-sm ${timeframe === tf.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTimeframe(tf.id)}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {goals.length > 0 && (
        <div className="card mb-xl">
          <div className="card-title">
            <Target size={16} />
            Daily Goals
          </div>
          <div className="flex-col gap-md">
            {goals.map(goal => {
              const achievement = achievements[goal.id];
              if (!achievement) return null;

              const stars = achievement.stars || 1;
              const percentage = achievement.percentage || 0;
              const achieved = achievement.achieved || 0;
              const target = achievement.target || goal.target_value;

              return (
                <div key={goal.id} className="goal-list-item">
                  <div className="flex-between">
                    <div className="goal-header">
                      <span className="goal-title-text">{goal.title}</span>
                      {goal.current_streak > 0 && (
                        <span className="badge badge-warning">
                          {goal.current_streak}d
                        </span>
                      )}
                    </div>
                    <div className="goal-header">
                      <span className="goal-meta-text">
                        {achieved}/{target}{goal.target_unit}
                      </span>
                      <div className="goal-stars">
                        {[1, 2, 3].map(i => (
                          <Star
                            key={i}
                            size={12}
                            fill={i <= stars ? 'var(--accent-primary)' : 'none'}
                            stroke={i <= stars ? 'var(--accent-primary)' : 'var(--border-default)'}
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(percentage, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="card">
          <div className="card-title">
            <Activity size={16} />
            Nutrition
          </div>
          {settings ? (
            <>
              {renderProgressBar('Calories', displayData.calories, settings.daily_calories_target)}
              {renderProgressBar('Protein', displayData.protein, settings.daily_protein_target, 'g')}
              {renderProgressBar('Carbs', displayData.carbs, settings.daily_carbs_target, 'g')}
              {renderProgressBar('Fats', displayData.fats, settings.daily_fats_target, 'g')}
            </>
          ) : (
            <>
              <div className="data-row">
                <span className="data-label">Calories</span>
                <span className="data-value">{Math.round(displayData.calories)}</span>
              </div>
              <div className="data-row">
                <span className="data-label">Protein</span>
                <span className="data-value">{Math.round(displayData.protein)}g</span>
              </div>
              <div className="data-row">
                <span className="data-label">Carbs</span>
                <span className="data-value">{Math.round(displayData.carbs)}g</span>
              </div>
              <div className="data-row">
                <span className="data-label">Fats</span>
                <span className="data-value">{Math.round(displayData.fats)}g</span>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <Droplets size={16} />
            Hydration
          </div>
          <div className="data-row">
            <span className="data-label">Water</span>
            <span className="data-value">{displayData.water}ml</span>
          </div>
          <div className="data-row">
            <span className="data-label">Caffeine</span>
            <span className="data-value">{displayData.caffeine}mg</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <TrendingUp size={16} />
            Activity
          </div>
          <div className="data-row">
            <span className="data-label">Steps</span>
            <span className="data-value">{displayData.steps.toLocaleString()}</span>
          </div>
          <div className="data-row">
            <span className="data-label">Sleep</span>
            <span className="data-value">{displayData.sleepHours}h</span>
          </div>
        </div>
      </div>

      {/* Trends and Analytics */}
      {timeframe !== 'today' && (
        <>
          <div className="card mt-xl">
            <div className="card-title">
              <BarChart3 size={16} />
              Nutrition Trends
            </div>
            <div className="chart-section">
              <BarChart
                data={[
                  { label: 'Mon', value: 2100 },
                  { label: 'Tue', value: 1950 },
                  { label: 'Wed', value: 2200 },
                  { label: 'Thu', value: 2050 },
                  { label: 'Fri', value: 2150 },
                  { label: 'Sat', value: 2300 },
                  { label: 'Sun', value: 2000 }
                ]}
                maxValue={2500}
                height={200}
              />
            </div>
          </div>

          <div className="stats-grid mt-xl">
            <div className="card">
              <div className="card-title">
                <LineChartIcon size={16} />
                Weekly Average
              </div>
              <div className="stat-large">
                2,107
                <span className="stat-unit">cal/day</span>
              </div>
              <TrendIndicator value={2107} previousValue={2050} />
            </div>

            <div className="card">
              <div className="card-title">
                <Target size={16} />
                Goal Achievement
              </div>
              <div className="flex" style={{ justifyContent: 'center', padding: '16px 0' }}>
                <ProgressRing percentage={85} size={100} label="This Week" />
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <TrendingUp size={16} />
                Activity Score
              </div>
              <div className="stat-large">
                7,850
                <span className="stat-unit">steps/day</span>
              </div>
              <TrendIndicator value={7850} previousValue={7200} />
            </div>
          </div>

          <div className="card mt-xl">
            <div className="card-title">
              <LineChartIcon size={16} />
              Progress Over Time
            </div>
            <div className="chart-section">
              <LineChart
                data={[
                  { label: 'Week 1', value: 75 },
                  { label: 'Week 2', value: 78 },
                  { label: 'Week 3', value: 82 },
                  { label: 'Week 4', value: 85 }
                ]}
                height={200}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default LifeDashboard;
