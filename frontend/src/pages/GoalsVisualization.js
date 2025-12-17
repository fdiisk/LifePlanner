import React, { useState, useEffect } from 'react';
import { Calendar, BarChart3, TrendingUp, Target, Activity } from 'lucide-react';
import { ProgressRing } from '../components/Charts';

/**
 * Goals Visualization Page
 * Comprehensive visualization of goal progress, trends, and analytics
 */
function GoalsVisualization({ apiUrl }) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('90'); // days
  const [progressHistory, setProgressHistory] = useState([]);
  const [categoryProgress, setCategoryProgress] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);

  useEffect(() => {
    fetchVisualizationData();
  }, [timeRange]);

  const fetchVisualizationData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      // Fetch progress history for heatmap
      const dates = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().split('T')[0]);
      }

      // Fetch goal achievements for each date
      const achievementPromises = dates.map(async (date) => {
        try {
          const response = await fetch(`${apiUrl}/life-tracking?resource=goal-achievements&date=${date}`);
          const data = await response.json();

          // Calculate average stars for the day
          const achievements = Object.values(data.achievements || {});
          const avgStars = achievements.length > 0
            ? achievements.reduce((sum, a) => sum + (a.stars || 0), 0) / achievements.length
            : 0;

          return {
            date,
            stars: Math.round(avgStars),
            achievements: achievements.length
          };
        } catch (error) {
          return { date, stars: 0, achievements: 0 };
        }
      });

      const heatmap = await Promise.all(achievementPromises);
      setHeatmapData(heatmap);

      // Fetch category progress
      await fetchCategoryProgress();

      // Fetch milestones for timeline
      await fetchMilestonesTimeline();
    } catch (error) {
      console.error('Error fetching visualization data:', error);
    }
    setLoading(false);
  };

  const fetchCategoryProgress = async () => {
    try {
      const [categoriesRes, goalsRes] = await Promise.all([
        fetch(`${apiUrl}/life-tracking?resource=categories`),
        fetch(`${apiUrl}/life-tracking?resource=goals`)
      ]);

      const categoriesData = await categoriesRes.json();
      const goalsData = await goalsRes.json();

      // Calculate progress for each category
      const categoryStats = (categoriesData.categories || []).map(category => {
        const categoryGoals = (goalsData.goals || []).filter(g => g.category_id === category.id);

        if (categoryGoals.length === 0) {
          return { ...category, progress: 0, goalCount: 0 };
        }

        const avgProgress = categoryGoals.reduce((sum, g) => sum + (parseFloat(g.progress_percentage) || 0), 0) / categoryGoals.length;

        return {
          ...category,
          progress: avgProgress,
          goalCount: categoryGoals.length
        };
      }).filter(c => c.goalCount > 0);

      setCategoryProgress(categoryStats);
    } catch (error) {
      console.error('Error fetching category progress:', error);
    }
  };

  const fetchMilestonesTimeline = async () => {
    try {
      const goalsRes = await fetch(`${apiUrl}/life-tracking?resource=goals`);
      const goalsData = await goalsRes.json();

      // Flatten goals
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
          return (data.milestones || []).map(m => ({
            ...m,
            parentGoalTitle: goal.title,
            parentGoalType: goal.goal_type,
            category: goal.category_name
          }));
        } catch (error) {
          return [];
        }
      });

      const allMilestones = (await Promise.all(milestonePromises)).flat();
      // Sort by due date
      allMilestones.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });

      setMilestones(allMilestones);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  };

  const renderHeatmap = () => {
    if (heatmapData.length === 0) return null;

    // Group by week
    const weeks = [];
    let currentWeek = [];

    heatmapData.forEach((day, index) => {
      currentWeek.push(day);
      if (new Date(day.date).getDay() === 6 || index === heatmapData.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    const getColor = (stars) => {
      if (stars === 0) return '#ebedf0';
      if (stars === 1) return '#fef3c7';
      if (stars === 2) return '#fbbf24';
      return '#10b981';
    };

    return (
      <div style={{ overflowX: 'auto', padding: '8px' }}>
        <div style={{ display: 'flex', gap: '4px', minWidth: 'fit-content' }}>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {week.map((day) => (
                <div
                  key={day.date}
                  style={{
                    width: '14px',
                    height: '14px',
                    background: getColor(day.stars),
                    borderRadius: '2px',
                    border: '1px solid var(--border-light)',
                    cursor: 'pointer'
                  }}
                  title={`${day.date}: ${day.stars} stars (${day.achievements} goals)`}
                />
              ))}
            </div>
          ))}
        </div>
        <div style={{
          marginTop: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          <span>Less</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 1, 2, 3].map(stars => (
              <div
                key={stars}
                style={{
                  width: '14px',
                  height: '14px',
                  background: getColor(stars),
                  borderRadius: '2px',
                  border: '1px solid var(--border-light)'
                }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    );
  };

  const renderCategoryBalance = () => {
    if (categoryProgress.length === 0) return null;

    return (
      <div className="flex-col gap-md">
        {categoryProgress.map(category => (
          <div key={category.id} style={{ marginBottom: '12px' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    background: category.color || '#6b7280',
                    borderRadius: '50%'
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {category.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  ({category.goalCount} {category.goalCount === 1 ? 'goal' : 'goals'})
                </span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {Math.round(category.progress)}%
              </span>
            </div>
            <div className="progress-bar-container" style={{ height: '8px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${category.progress}%`,
                  background: category.color || '#6b7280'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMilestonesTimeline = () => {
    if (milestones.length === 0) return null;

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const ninetyDaysAhead = new Date(today);
    ninetyDaysAhead.setDate(today.getDate() + 90);

    // Filter milestones within the visible range
    const visibleMilestones = milestones.filter(m => {
      if (!m.due_date) return true;
      const dueDate = new Date(m.due_date);
      return dueDate >= thirtyDaysAgo && dueDate <= ninetyDaysAhead;
    });

    return (
      <div className="flex-col gap-md">
        {visibleMilestones.slice(0, 15).map(milestone => {
          const progress = milestone.calculated_progress?.percentage || 0;
          const dueDate = milestone.due_date ? new Date(milestone.due_date) : null;
          const daysUntilDue = dueDate
            ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <div
              key={milestone.id}
              style={{
                padding: '12px',
                background: 'var(--background-secondary)',
                borderRadius: '8px',
                border: `2px solid ${milestone.is_completed ? '#10b981' : 'var(--border-light)'}`,
                opacity: milestone.is_completed ? 0.7 : 1
              }}
            >
              <div className="flex-between">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {milestone.title}
                    {milestone.is_completed && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: '#ecfdf5',
                        color: '#059669',
                        borderRadius: '4px'
                      }}>
                        ✓ Completed
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {milestone.parentGoalTitle} · {milestone.category}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '11px' }}>
                    <span style={{
                      padding: '2px 6px',
                      background: 'var(--border-light)',
                      borderRadius: '4px',
                      color: 'var(--text-secondary)'
                    }}>
                      {milestone.weight_percentage}% weight
                    </span>
                    {daysUntilDue !== null && (
                      <span style={{
                        padding: '2px 6px',
                        background: daysUntilDue < 7 ? '#fef3c7' : daysUntilDue < 0 ? '#fee2e2' : 'var(--border-light)',
                        color: daysUntilDue < 7 ? '#92400e' : daysUntilDue < 0 ? '#991b1b' : 'var(--text-secondary)',
                        borderRadius: '4px'
                      }}>
                        {daysUntilDue < 0
                          ? `${Math.abs(daysUntilDue)}d overdue`
                          : daysUntilDue === 0
                          ? 'Due today'
                          : `${daysUntilDue}d remaining`}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ flexShrink: 0, marginLeft: '16px' }}>
                  <ProgressRing percentage={progress} size={60} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="goals-visualization">
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <BarChart3 className="spinner" size={32} />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading visualizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="goals-visualization">
      <div className="dashboard-header">
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Goal Analytics & Visualization</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['30', '90', '180', '365'].map(days => (
            <button
              key={days}
              className={`btn-sm ${timeRange === days ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTimeRange(days)}
            >
              {days === '30' ? '30d' : days === '90' ? '90d' : days === '180' ? '6mo' : '1yr'}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Heatmap */}
      <div className="card mb-xl">
        <div className="card-title">
          <Calendar size={16} />
          Daily Achievement Heatmap
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Average star rating across all daily goals. Darker colors indicate better performance.
        </p>
        {renderHeatmap()}
      </div>

      {/* Category Balance */}
      <div className="card mb-xl">
        <div className="card-title">
          <BarChart3 size={16} />
          Category Balance
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Progress across different life categories. Aim for balanced growth.
        </p>
        {renderCategoryBalance()}
      </div>

      {/* Milestones Timeline */}
      <div className="card mb-xl">
        <div className="card-title">
          <Target size={16} />
          Milestones Timeline
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Upcoming and completed milestones across all goals. Showing next 15.
        </p>
        {renderMilestonesTimeline()}
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="card">
          <div className="card-title">
            <Activity size={16} />
            Total Categories
          </div>
          <div className="stat-large">
            {categoryProgress.length}
            <span className="stat-unit">active</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <Target size={16} />
            Active Milestones
          </div>
          <div className="stat-large">
            {milestones.filter(m => !m.is_completed).length}
            <span className="stat-unit">in progress</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <TrendingUp size={16} />
            Completion Rate
          </div>
          <div className="stat-large">
            {milestones.length > 0
              ? Math.round((milestones.filter(m => m.is_completed).length / milestones.length) * 100)
              : 0}
            <span className="stat-unit">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GoalsVisualization;
