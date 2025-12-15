import React, { useState, useEffect, useCallback } from 'react';
import { Crosshair, Plus, Edit, Trash2, ChevronDown, ChevronRight, Target, Calendar, CheckCircle, Activity, Zap } from 'lucide-react';

function GoalsSetup({ apiUrl }) {
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoals, setExpandedGoals] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
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

      const [categoriesRes, goalsRes] = await Promise.all([
        fetch(`${apiUrl}/life-tracking?resource=categories`),
        fetch(`${apiUrl}/life-tracking?resource=goals`)
      ]);

      const categoriesData = await categoriesRes.json();
      const goalsData = await goalsRes.json();

      setCategories(categoriesData.categories || []);
      setGoals(goalsData.goals || []);
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

  const applyTemplate = (template) => {
    // Find or create Health category
    let healthCategory = categories.find(cat => cat.name.toLowerCase() === 'health');

    setFormData({
      category_id: healthCategory ? healthCategory.id : '',
      parent_id: null,
      title: template.title,
      description: template.description,
      goal_type: template.goal_type,
      timeframe_start: '',
      timeframe_end: '',
      target_value: template.target_value,
      target_unit: template.target_unit,
      is_smart: true
    });
    setShowTemplates(false);
    setShowAddModal(true);
  };

  const nutritionTemplates = [
    {
      title: 'Daily Calorie Target',
      description: 'Track daily calorie intake to meet nutritional goals',
      goal_type: 'daily',
      target_value: '2000',
      target_unit: 'cal'
    },
    {
      title: 'Daily Protein Target',
      description: 'Meet daily protein intake for muscle maintenance and growth',
      goal_type: 'daily',
      target_value: '150',
      target_unit: 'g'
    },
    {
      title: 'Daily Carbs Target',
      description: 'Maintain optimal carbohydrate intake for energy',
      goal_type: 'daily',
      target_value: '200',
      target_unit: 'g'
    },
    {
      title: 'Daily Fats Target',
      description: 'Ensure adequate healthy fat intake',
      goal_type: 'daily',
      target_value: '65',
      target_unit: 'g'
    }
  ];

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

  const renderGoalTree = (goalsList, level = 0) => {
    return goalsList.map(goal => (
      <div key={goal.id} style={{ marginLeft: `${level * 24}px` }}>
        <div className="goal-item">
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
                <Target size={16} style={{ color: '#0066ff', flexShrink: 0 }} />
                <span className="goal-title">{goal.title}</span>
                <span className="goal-type-badge">{goal.goal_type.replace('_', ' ')}</span>
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
            {renderGoalTree(goal.children, level + 1)}
          </div>
        )}
      </div>
    ));
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
          <button className="btn-secondary" style={{ width: 'auto' }} onClick={() => setShowTemplates(true)}>
            <Zap size={16} /> Quick Start
          </button>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Goal
          </button>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="empty-state">
          <Crosshair size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
          <p>No goals yet. Use Quick Start to add nutrition goals or create a custom goal!</p>
        </div>
      ) : (
        <div className="goals-tree">
          {renderGoalTree(goals)}
        </div>
      )}

      {showTemplates && (
        <div className="modal-overlay" onClick={() => setShowTemplates(false)}>
          <div className="modal-content" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <h3><Zap size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Quick Start Templates</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
              Click a template to quickly set up common health and nutrition goals
            </p>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} style={{ color: '#0066ff' }} />
                Nutrition Goals
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {nutritionTemplates.map((template, idx) => (
                  <div
                    key={idx}
                    onClick={() => applyTemplate(template)}
                    style={{
                      padding: '16px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#0066ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{template.title}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{template.description}</div>
                    <div style={{ fontSize: '12px', color: '#0066ff', fontWeight: 500 }}>
                      Target: {template.target_value}{template.target_unit} {template.goal_type}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowTemplates(false)}>
                Close
              </button>
            </div>
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
                >
                  <option value="high_level">High Level</option>
                  <option value="yearly">Yearly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
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
