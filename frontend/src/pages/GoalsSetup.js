import React, { useState, useEffect, useCallback } from 'react';
import { Crosshair, Plus, Edit, Trash2, ChevronDown, ChevronRight, Target, Calendar, CheckCircle, Activity, Star } from 'lucide-react';

function GoalsSetup({ apiUrl }) {
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [achievements, setAchievements] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedGoals, setExpandedGoals] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupGoals, setGroupGoals] = useState([]);
  const [showNutritionSetup, setShowNutritionSetup] = useState(false);
  const [nutritionTargets, setNutritionTargets] = useState({
    calories: '2000',
    protein: '150',
    carbs: '200',
    fats: '65'
  });
  const [formData, setFormData] = useState({
    category_id: '',
    parent_id: null,
    title: '',
    description: '',
    goal_type: 'high_level',
    timeframe_start: '',
    timeframe_end: '',
    target_value: '',
    target_unit: '',
    is_smart: false
  });

  const ensureHealthCategory = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/life-tracking?resource=categories`);
      const data = await response.json();
      const categories = data.categories || [];

      const healthCategory = categories.find(cat => cat.name.toLowerCase() === 'health');

      if (!healthCategory) {
        // Create Health category
        await fetch(`${apiUrl}/life-tracking?resource=categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Health',
            icon: 'activity',
            color: '#0066ff',
            display_order: 0
          })
        });
      }
    } catch (error) {
      console.error('Error ensuring health category:', error);
    }
  }, [apiUrl]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Ensure Health category exists
      await ensureHealthCategory();

      const today = new Date().toISOString().split('T')[0];

      const [categoriesRes, goalsRes, achievementsRes] = await Promise.all([
        fetch(`${apiUrl}/life-tracking?resource=categories`),
        fetch(`${apiUrl}/life-tracking?resource=goals`),
        fetch(`${apiUrl}/life-tracking?resource=goal-achievements&date=${today}`)
      ]);

      const categoriesData = await categoriesRes.json();
      const goalsData = await goalsRes.json();
      const achievementsData = await achievementsRes.json();

      setCategories(categoriesData.categories || []);
      setGoals(goalsData.goals || []);
      setAchievements(achievementsData.achievements || {});
    } catch (error) {
      console.error('Error fetching goals data:', error);
    }
    setLoading(false);
  }, [apiUrl, ensureHealthCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleGoal = (goalId) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId]
    }));
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/life-tracking?resource=goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowAddModal(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/life-tracking?resource=goals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id: editingGoal.id })
      });

      if (response.ok) {
        setEditingGoal(null);
        resetForm();
        fetchData();
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Delete this goal? This will also delete all child goals.')) return;

    try {
      const response = await fetch(`${apiUrl}/life-tracking?resource=goals`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId })
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      category_id: '',
      parent_id: null,
      title: '',
      description: '',
      goal_type: 'high_level',
      timeframe_start: '',
      timeframe_end: '',
      target_value: '',
      target_unit: '',
      is_smart: false
    });
  };

  const handleCreateNutritionGoals = async (e) => {
    e.preventDefault();

    const healthCategory = categories.find(cat => cat.name.toLowerCase() === 'health');
    if (!healthCategory) {
      alert('Health category not found. Please refresh the page.');
      return;
    }

    try {
      // First, create a goal group for nutrition macros
      const groupResponse = await fetch(`${apiUrl}/life-tracking?resource=goal-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: healthCategory.id,
          name: 'Daily Nutrition Macros',
          description: 'Track daily calorie and macronutrient intake'
        })
      });

      if (!groupResponse.ok) {
        throw new Error('Failed to create goal group');
      }

      const groupData = await groupResponse.json();
      const groupId = groupData.group.id;

      // Create all 4 nutrition goals linked to the group
      const nutritionGoals = [
        {
          category_id: healthCategory.id,
          group_id: groupId,
          title: 'Daily Calorie Target',
          description: 'Track daily calorie intake to meet nutritional goals',
          goal_type: 'daily',
          target_value: nutritionTargets.calories,
          target_unit: 'cal',
          is_smart: true,
          is_auto_tracked: true,
          is_binary: false
        },
        {
          category_id: healthCategory.id,
          group_id: groupId,
          title: 'Daily Protein Target',
          description: 'Meet daily protein intake for muscle maintenance and growth',
          goal_type: 'daily',
          target_value: nutritionTargets.protein,
          target_unit: 'g',
          is_smart: true,
          is_auto_tracked: true,
          is_binary: false
        },
        {
          category_id: healthCategory.id,
          group_id: groupId,
          title: 'Daily Carbs Target',
          description: 'Maintain optimal carbohydrate intake for energy',
          goal_type: 'daily',
          target_value: nutritionTargets.carbs,
          target_unit: 'g',
          is_smart: true,
          is_auto_tracked: true,
          is_binary: false
        },
        {
          category_id: healthCategory.id,
          group_id: groupId,
          title: 'Daily Fats Target',
          description: 'Ensure adequate healthy fat intake',
          goal_type: 'daily',
          target_value: nutritionTargets.fats,
          target_unit: 'g',
          is_smart: true,
          is_auto_tracked: true,
          is_binary: false
        }
      ];

      for (const goal of nutritionGoals) {
        await fetch(`${apiUrl}/life-tracking?resource=goals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(goal)
        });
      }

      setShowNutritionSetup(false);
      fetchData();
    } catch (error) {
      console.error('Error creating nutrition goals:', error);
      alert('Failed to create nutrition goals. Please try again.');
    }
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setFormData({
      category_id: goal.category_id || '',
      parent_id: goal.parent_id,
      title: goal.title,
      description: goal.description || '',
      goal_type: goal.goal_type,
      timeframe_start: goal.timeframe_start ? goal.timeframe_start.split('T')[0] : '',
      timeframe_end: goal.timeframe_end ? goal.timeframe_end.split('T')[0] : '',
      target_value: goal.target_value || '',
      target_unit: goal.target_unit || '',
      is_smart: goal.is_smart
    });
  };

  const openGroupEditModal = async (groupId) => {
    try {
      // Fetch all goals in this group
      const response = await fetch(`${apiUrl}/life-tracking?resource=goals`);
      const data = await response.json();

      // Flatten goals and filter by group_id
      const allGoals = [];
      const flattenGoals = (goalsList) => {
        goalsList.forEach(goal => {
          allGoals.push(goal);
          if (goal.children) {
            flattenGoals(goal.children);
          }
        });
      };
      flattenGoals(data.goals || []);

      const goalsInGroup = allGoals.filter(g => g.group_id === groupId);

      if (goalsInGroup.length > 0) {
        setEditingGroup({ id: groupId, name: goalsInGroup[0].group_name || 'Nutrition Macros' });
        setGroupGoals(goalsInGroup.map(g => ({
          id: g.id,
          title: g.title,
          target_value: g.target_value || '',
          target_unit: g.target_unit || ''
        })));
      }
    } catch (error) {
      console.error('Error fetching group goals:', error);
    }
  };

  const handleUpdateGroupGoals = async (e) => {
    e.preventDefault();

    try {
      // Update each goal in the group
      for (const goal of groupGoals) {
        await fetch(`${apiUrl}/life-tracking?resource=goals&id=${goal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_value: goal.target_value
          })
        });
      }

      setEditingGroup(null);
      setGroupGoals([]);
      fetchData();
    } catch (error) {
      console.error('Error updating group goals:', error);
      alert('Failed to update goals. Please try again.');
    }
  };

  const getGoalTypeColor = (goalType) => {
    const colors = {
      high_level: '#8b5cf6',    // purple
      yearly: '#ef4444',         // red
      quarterly: '#f59e0b',      // amber
      monthly: '#10b981',        // green
      weekly: '#3b82f6',         // blue
      daily: '#0066ff'           // deep blue
    };
    return colors[goalType] || '#6b7280';
  };

  const getStarRating = (goal) => {
    if (!goal.target_value || !goal.is_auto_tracked) return null;

    const achievementData = achievements[goal.id];
    if (!achievementData) return null;

    const percentage = achievementData.percentage;
    const threshold2 = goal.star_threshold_2 || 70;
    const threshold3 = goal.star_threshold_3 || 90;

    if (percentage >= threshold3) return 3;
    if (percentage >= threshold2) return 2;
    if (percentage > 0) return 1;
    return null; // No stars if no progress
  };

  const renderStars = (goal, rating) => {
    if (!rating) return null;

    const achievementData = achievements[goal.id];
    const tooltip = achievementData
      ? `${achievementData.achieved}/${achievementData.target}${goal.target_unit} (${achievementData.percentage}%)`
      : '';

    return (
      <div
        style={{ display: 'flex', gap: '2px', marginLeft: '8px', cursor: 'help' }}
        title={tooltip}
      >
        {[1, 2, 3].map(i => (
          <Star
            key={i}
            size={14}
            fill={i <= rating ? '#fbbf24' : 'none'}
            stroke={i <= rating ? '#fbbf24' : '#d1d5db'}
            strokeWidth={1.5}
          />
        ))}
      </div>
    );
  };

  const renderGoalTree = (goalsList, level = 0, renderedGroups = new Set()) => {
    return goalsList.map(goal => {
      const isGrouped = goal.group_id != null;
      const isFirstInGroup = isGrouped && !renderedGroups.has(goal.group_id);
      const starRating = getStarRating(goal);
      const typeColor = getGoalTypeColor(goal.goal_type);

      if (isFirstInGroup) {
        renderedGroups.add(goal.group_id);
      }

      return (
        <div key={goal.id} style={{ marginLeft: `${level * 24}px` }}>
          <div className="goal-item" style={{
            borderLeft: `3px solid ${typeColor}`,
            paddingLeft: '12px'
          }}>
            <div className="goal-main">
              <button
                className="goal-toggle"
                onClick={() => toggleGoal(goal.id)}
                style={{ visibility: goal.children && goal.children.length > 0 ? 'visible' : 'hidden' }}
              >
                {expandedGoals[goal.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              <div className="goal-content">
                <div className="goal-header-row">
                  <Target size={16} style={{ color: typeColor, flexShrink: 0 }} />
                  <span className="goal-title">{goal.title}</span>
                  <span className="goal-type-badge" style={{
                    background: `${typeColor}15`,
                    color: typeColor,
                    border: `1px solid ${typeColor}40`
                  }}>
                    {goal.goal_type.replace('_', ' ')}
                  </span>
                  {isGrouped && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      borderRadius: '0.25rem',
                      marginLeft: '6px'
                    }}>
                      Grouped
                    </span>
                  )}
                  {starRating && renderStars(goal, starRating)}
                </div>

                {goal.description && (
                  <p className="goal-description">{goal.description}</p>
                )}

                <div className="goal-meta">
                  {goal.category_name && (
                    <span className="goal-meta-item">{goal.category_name}</span>
                  )}
                  {goal.timeframe_end && (
                    <span className="goal-meta-item">
                      <Calendar size={12} /> Due: {new Date(goal.timeframe_end).toLocaleDateString()}
                    </span>
                  )}
                  {goal.target_value && (
                    <span className="goal-meta-item">
                      Target: {goal.target_value}{goal.target_unit}
                    </span>
                  )}
                  {goal.is_smart && (
                    <span className="goal-meta-item smart-badge">
                      <CheckCircle size={12} /> SMART
                    </span>
                  )}
                </div>

                {isFirstInGroup && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      className="btn-secondary"
                      style={{ width: 'auto', fontSize: '12px', padding: '4px 12px' }}
                      onClick={() => openGroupEditModal(goal.group_id)}
                    >
                      <Edit size={12} /> Edit All Macros
                    </button>
                  </div>
                )}
              </div>

              <div className="goal-actions">
                <button className="btn-icon" onClick={() => openEditModal(goal)} title="Edit">
                  <Edit size={14} />
                </button>
                <button className="btn-icon" onClick={() => {
                  setFormData({ ...formData, parent_id: goal.id, category_id: goal.category_id });
                  setShowAddModal(true);
                }} title="Add child goal">
                  <Plus size={14} />
                </button>
                <button className="btn-icon btn-icon-danger" onClick={() => handleDeleteGoal(goal.id)} title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {expandedGoals[goal.id] && goal.children && goal.children.length > 0 && (
            <div className="goal-children">
              {renderGoalTree(goal.children, level + 1, renderedGroups)}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="goals-setup">
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Crosshair className="spinner" size={32} />
          <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="goals-setup">
      <div className="goals-header">
        <h2><Crosshair size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Goals Setup</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" style={{ width: 'auto' }} onClick={() => setShowNutritionSetup(true)}>
            <Activity size={16} /> Set Nutrition Goals
          </button>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Goal
          </button>
        </div>
      </div>

      {/* Hierarchy Legend */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '0.25rem',
        border: '1px solid #e5e7eb'
      }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>
          Goal Hierarchy
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px' }}>
          {['high_level', 'yearly', 'quarterly', 'monthly', 'weekly', 'daily'].map(type => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '3px',
                height: '16px',
                background: getGoalTypeColor(type),
                borderRadius: '2px'
              }} />
              <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>
                {type.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
          Build your goals from high-level visions down to daily actions. Star ratings show achievement (1★ = attempted, 2★ = 70%+, 3★ = 90%+).
        </p>
      </div>

      {goals.length === 0 ? (
        <div className="empty-state">
          <Crosshair size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
          <p>No goals yet. Set your nutrition goals or create a custom goal!</p>
        </div>
      ) : (
        <div className="goals-tree">
          {renderGoalTree(goals)}
        </div>
      )}

      {showNutritionSetup && (
        <div className="modal-overlay" onClick={() => setShowNutritionSetup(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <h3><Activity size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Set Your Daily Nutrition Targets</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
              Enter your specific macro targets. These will be tracked on your dashboard.
            </p>

            <form onSubmit={handleCreateNutritionGoals}>
              <div className="form-group">
                <label>Daily Calorie Target</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    value={nutritionTargets.calories}
                    onChange={(e) => setNutritionTargets({ ...nutritionTargets, calories: e.target.value })}
                    min="0"
                    step="50"
                    required
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: '#6b7280', fontSize: '14px', minWidth: '40px' }}>cal</span>
                </div>
              </div>

              <div className="form-group">
                <label>Daily Protein Target</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    value={nutritionTargets.protein}
                    onChange={(e) => setNutritionTargets({ ...nutritionTargets, protein: e.target.value })}
                    min="0"
                    step="5"
                    required
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: '#6b7280', fontSize: '14px', minWidth: '40px' }}>grams</span>
                </div>
              </div>

              <div className="form-group">
                <label>Daily Carbs Target</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    value={nutritionTargets.carbs}
                    onChange={(e) => setNutritionTargets({ ...nutritionTargets, carbs: e.target.value })}
                    min="0"
                    step="5"
                    required
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: '#6b7280', fontSize: '14px', minWidth: '40px' }}>grams</span>
                </div>
              </div>

              <div className="form-group">
                <label>Daily Fats Target</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    value={nutritionTargets.fats}
                    onChange={(e) => setNutritionTargets({ ...nutritionTargets, fats: e.target.value })}
                    min="0"
                    step="5"
                    required
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: '#6b7280', fontSize: '14px', minWidth: '40px' }}>grams</span>
                </div>
              </div>

              <div style={{ marginTop: '24px', padding: '12px', background: '#f0f9ff', borderRadius: '0.25rem', border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>
                  <strong>Note:</strong> This will create 4 daily goals that you can edit or delete individually later.
                </p>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNutritionSetup(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
                  <Activity size={16} /> Create All Goals
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingGroup && (
        <div className="modal-overlay" onClick={() => { setEditingGroup(null); setGroupGoals([]); }}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <h3><Activity size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Edit All Nutrition Macros</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
              Update all your daily macro targets at once. Changes will be reflected on your dashboard.
            </p>

            <form onSubmit={handleUpdateGroupGoals}>
              {groupGoals.map((goal, index) => (
                <div key={goal.id} className="form-group">
                  <label>{goal.title.replace('Daily ', '').replace(' Target', '')}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      value={goal.target_value}
                      onChange={(e) => {
                        const updated = [...groupGoals];
                        updated[index].target_value = e.target.value;
                        setGroupGoals(updated);
                      }}
                      min="0"
                      step={goal.target_unit === 'cal' ? '50' : '5'}
                      required
                      style={{ flex: 1 }}
                    />
                    <span style={{ color: '#6b7280', fontSize: '14px', minWidth: '60px' }}>
                      {goal.target_unit === 'cal' ? 'calories' : 'grams'}
                    </span>
                  </div>
                </div>
              ))}

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => { setEditingGroup(null); setGroupGoals([]); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
                  <Activity size={16} /> Update All Goals
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(showAddModal || editingGoal) && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setEditingGoal(null); resetForm(); }}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <h3>{editingGoal ? 'Edit Goal' : 'Add New Goal'}</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
              {editingGoal ? 'Update your goal details below' : 'Create a new goal to track progress'}
            </p>

            <form onSubmit={editingGoal ? handleUpdateGoal : handleAddGoal} className="goal-form">
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Goal Type</label>
                <select
                  value={formData.goal_type}
                  onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
                  required
                  style={{ paddingRight: '32px' }}
                >
                  <option value="high_level">High Level - Life vision & major objectives</option>
                  <option value="yearly">Yearly - Annual goals & milestones</option>
                  <option value="quarterly">Quarterly - 3-month targets</option>
                  <option value="monthly">Monthly - 30-day focus areas</option>
                  <option value="weekly">Weekly - 7-day priorities</option>
                  <option value="daily">Daily - Daily actions & habits</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                  <div style={{
                    width: '3px',
                    height: '12px',
                    background: getGoalTypeColor(formData.goal_type),
                    borderRadius: '2px'
                  }} />
                  <small style={{ color: '#9ca3af', fontSize: '11px' }}>
                    Color-coded in tree view
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Gain 2kg muscle mass"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details about this goal..."
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date (optional)</label>
                  <input
                    type="date"
                    value={formData.timeframe_start}
                    onChange={(e) => setFormData({ ...formData, timeframe_start: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date (optional)</label>
                  <input
                    type="date"
                    value={formData.timeframe_end}
                    onChange={(e) => setFormData({ ...formData, timeframe_end: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Target Value</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    placeholder="e.g., 2000 (for calories), 150 (for protein)"
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    For nutrition: calories, protein/carbs/fats in grams
                  </small>
                </div>
                <div className="form-group">
                  <label>Target Unit</label>
                  <input
                    type="text"
                    value={formData.target_unit}
                    onChange={(e) => setFormData({ ...formData, target_unit: e.target.value })}
                    placeholder="e.g., cal, g, kg"
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Common: cal (calories), g (grams), kg, ml
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_smart}
                    onChange={(e) => setFormData({ ...formData, is_smart: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  <span>Mark as SMART goal</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowAddModal(false); setEditingGoal(null); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
                  {editingGoal ? 'Update Goal' : 'Add Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoalsSetup;
