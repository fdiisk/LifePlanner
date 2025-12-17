import React, { useState, useEffect } from 'react';
import { Plus, Check, X, Calendar, Target, List } from 'lucide-react';

function MilestoneManager({ goalId, apiUrl, onUpdate }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    target_month: '',
    weight_percentage: 10,
    milestone_type: 'quantitative',
    target_value: '',
    target_unit: ''
  });

  useEffect(() => {
    if (goalId) {
      fetchMilestones();
    }
  }, [goalId]);

  const fetchMilestones = async () => {
    try {
      const response = await fetch(`${apiUrl}/unified-goals?resource=milestones&goal_id=${goalId}`);
      const data = await response.json();
      setMilestones(data.milestones || []);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = `${apiUrl}/unified-goals?resource=milestones`;
      const method = editingMilestone ? 'PUT' : 'POST';
      const body = editingMilestone
        ? { ...formData, id: editingMilestone.id }
        : { ...formData, goal_id: goalId };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowAddModal(false);
        setEditingMilestone(null);
        resetForm();
        fetchMilestones();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error saving milestone:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this milestone?')) return;

    try {
      const response = await fetch(`${apiUrl}/unified-goals?resource=milestones`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (response.ok) {
        fetchMilestones();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error deleting milestone:', error);
    }
  };

  const toggleComplete = async (milestone) => {
    try {
      const response = await fetch(`${apiUrl}/unified-goals?resource=milestones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: milestone.id,
          is_completed: !milestone.is_completed,
          completed_date: !milestone.is_completed ? new Date().toISOString().split('T')[0] : null
        })
      });

      if (response.ok) {
        fetchMilestones();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error toggling milestone:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      due_date: '',
      target_month: '',
      weight_percentage: 10,
      milestone_type: 'quantitative',
      target_value: '',
      target_unit: ''
    });
  };

  const openEdit = (milestone) => {
    setEditingMilestone(milestone);
    setFormData({
      title: milestone.title,
      description: milestone.description || '',
      due_date: milestone.due_date || '',
      target_month: milestone.target_month || '',
      weight_percentage: milestone.weight_percentage,
      milestone_type: milestone.milestone_type,
      target_value: milestone.target_value || '',
      target_unit: milestone.target_unit || ''
    });
    setShowAddModal(true);
  };

  if (loading) return <div className="text-sm text-secondary">Loading milestones...</div>;

  return (
    <div className="milestone-manager">
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Milestones
        </h4>
        <button
          className="btn-sm btn-primary"
          onClick={() => { resetForm(); setShowAddModal(true); }}
        >
          <Plus size={14} /> Add Milestone
        </button>
      </div>

      {milestones.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          No milestones yet. Add checkpoints to track progress toward this goal.
        </p>
      ) : (
        <div className="flex-col gap-sm">
          {milestones.map(milestone => (
            <div key={milestone.id} className="card" style={{ padding: '12px' }}>
              <div className="flex-between">
                <div className="flex" style={{ gap: '12px', alignItems: 'flex-start', flex: 1 }}>
                  <button
                    onClick={() => toggleComplete(milestone)}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: milestone.is_completed ? 'none' : '2px solid var(--border-default)',
                      background: milestone.is_completed ? 'var(--accent-primary)' : 'transparent',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {milestone.is_completed && <Check size={14} />}
                  </button>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: milestone.is_completed ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: milestone.is_completed ? 'line-through' : 'none'
                    }}>
                      {milestone.title}
                    </div>

                    <div className="flex gap-sm" style={{ marginTop: '4px', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}>
                        {milestone.weight_percentage}% weight
                      </span>

                      {milestone.due_date && (
                        <span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>
                          <Calendar size={10} style={{ marginRight: '4px' }} />
                          {new Date(milestone.due_date).toLocaleDateString()}
                        </span>
                      )}

                      {milestone.target_month && (
                        <span className="badge" style={{ background: '#DBEAFE', color: '#1e40af' }}>
                          Month {milestone.target_month}
                        </span>
                      )}

                      {milestone.calculated_progress && (
                        <span className="badge" style={{
                          background: milestone.calculated_progress.percentage >= 90 ? '#DCFCE7' : milestone.calculated_progress.percentage >= 70 ? '#FEF3C7' : '#FEE2E2',
                          color: milestone.calculated_progress.percentage >= 90 ? '#166534' : milestone.calculated_progress.percentage >= 70 ? '#92400E' : '#991B1B'
                        }}>
                          {Math.round(milestone.calculated_progress.percentage)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-sm">
                  <button className="btn-icon" onClick={() => openEdit(milestone)}>
                    <Target size={14} />
                  </button>
                  <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(milestone.id)}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              {milestone.description && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', marginLeft: '32px' }}>
                  {milestone.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setEditingMilestone(null); }}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <h3>{editingMilestone ? 'Edit Milestone' : 'Add Milestone'}</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Complete 20 personal projects"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Due Date (optional)</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Or Target Month</label>
                  <input
                    type="number"
                    value={formData.target_month}
                    onChange={(e) => setFormData({ ...formData, target_month: e.target.value })}
                    placeholder="e.g., 6"
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Weight Contribution (%)</label>
                <input
                  type="number"
                  value={formData.weight_percentage}
                  onChange={(e) => setFormData({ ...formData, weight_percentage: parseFloat(e.target.value) })}
                  min="0"
                  max="100"
                  step="1"
                  required
                />
                <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  How much this milestone contributes to the parent goal
                </small>
              </div>

              <div className="form-group">
                <label>Type</label>
                <select
                  value={formData.milestone_type}
                  onChange={(e) => setFormData({ ...formData, milestone_type: e.target.value })}
                >
                  <option value="quantitative">Quantitative (target value)</option>
                  <option value="qualitative">Qualitative (checklist)</option>
                </select>
              </div>

              {formData.milestone_type === 'quantitative' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Target Value</label>
                    <input
                      type="number"
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                      step="any"
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <input
                      type="text"
                      value={formData.target_unit}
                      onChange={(e) => setFormData({ ...formData, target_unit: e.target.value })}
                      placeholder="e.g., projects, hours"
                    />
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowAddModal(false); setEditingMilestone(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingMilestone ? 'Update' : 'Add'} Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MilestoneManager;
