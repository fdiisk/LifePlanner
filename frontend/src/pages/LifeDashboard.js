import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Droplets, TrendingUp, Star, Target, BarChart3, LineChart as LineChartIcon, CheckSquare, Square, Calendar as CalendarIcon } from 'lucide-react';
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
  const [historicalData, setHistoricalData] = useState(null);
  const [dailyChecklists, setDailyChecklists] = useState([]);
  const [activeMilestones, setActiveMilestones] = useState([]);

  // Fetch historical data when timeframe changes
  useEffect(() => {
    if (timeframe !== 'today') {
      fetchHistoricalData();
    }
  }, [timeframe, selectedDate]);

  const fetchHistoricalData = async () => {
    try {
      const response = await fetch(`${apiUrl}/historical-stats?timeframe=${timeframe}&endDate=${selectedDate}`);
      const data = await response.json();
      setHistoricalData(data);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  const fetchDailyChecklists = async (goals) => {
    try {
      // Find all daily qualitative goals
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

      const allGoals = flattenGoals(goals);
      const qualitativeDaily = allGoals.filter(g => g.goal_type === 'daily' && g.is_qualitative);

      // Fetch checklist items for each qualitative goal
      const checklistPromises = qualitativeDaily.map(async (goal) => {
        try {
          const response = await fetch(
            `${apiUrl}/unified-goals?resource=daily-checklist&goal_id=${goal.id}&date=${selectedDate}`
          );
          const data = await response.json();
          const items = data.items || [];

          if (items.length > 0) {
            const completed = items.filter(i => i.is_completed).length;
            const percentage = (completed / items.length) * 100;

            return {
              goalId: goal.id,
              goalTitle: goal.title,
              items,
              completed,
              total: items.length,
              percentage
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching checklist for goal ${goal.id}:`, error);
          return null;
        }
      });

      const checklists = (await Promise.all(checklistPromises)).filter(c => c !== null);
      setDailyChecklists(checklists);
    } catch (error) {
      console.error('Error fetching daily checklists:', error);
    }
  };

  const fetchActiveMilestones = async (goals) => {
    try {
      // Find all goals that can have milestones
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

      const allGoals = flattenGoals(goals);
      const milestonableGoals = allGoals.filter(g =>
        ['high_level', 'yearly', 'quarterly', 'monthly'].includes(g.goal_type)
      );

      // Fetch milestones for each goal
      const milestonePromises = milestonableGoals.map(async (goal) => {
        try {
          const response = await fetch(
            `${apiUrl}/unified-goals?resource=milestones&goal_id=${goal.id}`
          );
          const data = await response.json();
          const milestones = (data.milestones || []).filter(m => !m.is_completed);

          return milestones.map(m => ({
            ...m,
            parentGoalTitle: goal.title,
            parentGoalType: goal.goal_type
          }));
        } catch (error) {
          console.error(`Error fetching milestones for goal ${goal.id}:`, error);
          return [];
        }
      });

      const allMilestones = (await Promise.all(milestonePromises)).flat();
      // Sort by due date (soonest first)
      allMilestones.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });
      setActiveMilestones(allMilestones.slice(0, 5)); // Show top 5 upcoming
    } catch (error) {
      console.error('Error fetching active milestones:', error);
    }
  };

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

      // Fetch daily checklists for qualitative goals
      await fetchDailyChecklists(goalsData.goals || []);

      // Fetch active milestones
      await fetchActiveMilestones(goalsData.goals || []);

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

      {/* Today's Checklists */}
      {dailyChecklists.length > 0 && (
        <div className="card mb-xl">
          <div className="card-title">
            <CheckSquare size={16} />
            Today's Checklists
          </div>
          <div className="flex-col gap-md">
            {dailyChecklists.map(checklist => (
              <div key={checklist.goalId} className="goal-list-item">
                <div className="flex-between" style={{ marginBottom: '8px' }}>
                  <span className="goal-title-text">{checklist.goalTitle}</span>
                  <span className="goal-meta-text">
                    {checklist.completed}/{checklist.total} completed
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${checklist.percentage}%` }} />
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {checklist.items.slice(0, 3).map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                      {item.is_completed ? (
                        <CheckSquare size={14} style={{ color: 'var(--accent-primary)' }} />
                      ) : (
                        <Square size={14} />
                      )}
                      <span style={{
                        textDecoration: item.is_completed ? 'line-through' : 'none',
                        color: item.is_completed ? 'var(--text-muted)' : 'var(--text-secondary)'
                      }}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                  {checklist.items.length > 3 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '20px' }}>
                      +{checklist.items.length - 3} more items
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Milestones */}
      {activeMilestones.length > 0 && (
        <div className="card mb-xl">
          <div className="card-title">
            <CalendarIcon size={16} />
            Active Milestones
          </div>
          <div className="flex-col gap-md">
            {activeMilestones.map(milestone => {
              const progress = milestone.calculated_progress?.percentage || 0;
              const daysUntilDue = milestone.due_date
                ? Math.ceil((new Date(milestone.due_date) - new Date()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div key={milestone.id} style={{
                  padding: '12px',
                  background: 'var(--background-secondary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)'
                }}>
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {milestone.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {milestone.parentGoalTitle}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, marginLeft: '12px' }}>
                      <ProgressRing percentage={progress} size={50} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span style={{
                      padding: '2px 6px',
                      background: 'var(--border-light)',
                      borderRadius: '4px'
                    }}>
                      {milestone.weight_percentage}% weight
                    </span>
                    {daysUntilDue !== null && (
                      <span style={{
                        padding: '2px 6px',
                        background: daysUntilDue < 7 ? '#fef3c7' : 'var(--border-light)',
                        color: daysUntilDue < 7 ? '#92400e' : 'var(--text-secondary)',
                        borderRadius: '4px'
                      }}>
                        {daysUntilDue < 0 ? 'Overdue' : daysUntilDue === 0 ? 'Due today' : `${daysUntilDue}d remaining`}
                      </span>
                    )}
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
      {timeframe !== 'today' && historicalData && (
        <>
          <div className="card mt-xl">
            <div className="card-title">
              <BarChart3 size={16} />
              Nutrition Trends - Calories
            </div>
            <div className="chart-section">
              <BarChart
                data={historicalData.dailyStats.map(day => ({
                  label: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                  value: day.calories
                }))}
                maxValue={settings?.daily_calories_target ? settings.daily_calories_target * 1.2 : undefined}
                height={200}
              />
            </div>
          </div>

          <div className="stats-grid mt-xl">
            <div className="card">
              <div className="card-title">
                <Activity size={16} />
                Avg Calories
              </div>
              <div className="stat-large">
                {historicalData.averages.calories.toLocaleString()}
                <span className="stat-unit">cal/day</span>
              </div>
              {settings?.daily_calories_target && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Target: {settings.daily_calories_target} cal
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-title">
                <Target size={16} />
                Goal Achievement
              </div>
              <div className="flex" style={{ justifyContent: 'center', padding: '16px 0' }}>
                <ProgressRing
                  percentage={historicalData.goalAchievementRate}
                  size={100}
                  label={`${timeframe === 'week' ? 'This Week' : timeframe === 'month' ? 'This Month' : 'Period Avg'}`}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <TrendingUp size={16} />
                Avg Activity
              </div>
              <div className="stat-large">
                {historicalData.averages.steps.toLocaleString()}
                <span className="stat-unit">steps/day</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Sleep: {historicalData.averages.sleep_hours}h/night
              </div>
            </div>
          </div>

          <div className="card mt-xl">
            <div className="card-title">
              <LineChartIcon size={16} />
              Steps Over Time
            </div>
            <div className="chart-section">
              <LineChart
                data={historicalData.dailyStats.map(day => ({
                  label: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  value: day.steps
                }))}
                height={200}
              />
            </div>
          </div>

          <div className="card mt-xl">
            <div className="card-title">
              <Droplets size={16} />
              Hydration & Macros
            </div>
            <div className="stats-grid">
              <div>
                <div className="data-row">
                  <span className="data-label">Avg Water</span>
                  <span className="data-value">{historicalData.averages.water}ml</span>
                </div>
                <div className="data-row">
                  <span className="data-label">Avg Protein</span>
                  <span className="data-value">{historicalData.averages.protein}g</span>
                </div>
              </div>
              <div>
                <div className="data-row">
                  <span className="data-label">Avg Carbs</span>
                  <span className="data-value">{historicalData.averages.carbs}g</span>
                </div>
                <div className="data-row">
                  <span className="data-label">Avg Fats</span>
                  <span className="data-value">{historicalData.averages.fats}g</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default LifeDashboard;
