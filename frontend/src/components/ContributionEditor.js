import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

/**
 * Contribution Editor Component
 * Manages weighted parent-child goal relationships
 */
function ContributionEditor({ goalId, apiUrl, onUpdate }) {
  const [contributions, setContributions] = useState([]);
  const [availableGoals, setAvailableGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContribution, setNewContribution] = useState({
    child_goal_id: '',
    weight_percentage: 10
  });

  useEffect(() => {
    if (goalId) {
      fetchContributions();
      fetchAvailableGoals();
    }
  }, [goalId]);

  const fetchContributions = async () => {
    try {
      const response = await fetch(
        `${apiUrl}/unified-goals?resource=contributions&parent_goal_id=${goalId}`
      );
      const data = await response.json();
      setContributions(data.contributions || []);
    } catch (error) {
      console.error('Error fetching contributions:', error);
    }
    setLoading(false);
  };

  const fetchAvailableGoals = async () => {
    try {
      const response = await fetch(`${apiUrl}/life-tracking?resource=goals`);
      const data = await response.json();

      // Flatten goal tree to get all goals
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

      const allGoals = flattenGoals(data.goals || []);
      // Filter out current goal and already contributed goals
      const contributedIds = contributions.map(c => c.child_goal_id);
      const available = allGoals.filter(g =>
        g.id !== goalId && !contributedIds.includes(g.id)
      );
      setAvailableGoals(available);
    } catch (error) {
      console.error('Error fetching available goals:', error);
    }
  };

  const handleAddContribution = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/unified-goals?resource=contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_goal_id: goalId,
          child_goal_id: parseInt(newContribution.child_goal_id),
          weight_percentage: parseFloat(newContribution.weight_percentage)
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewContribution({ child_goal_id: '', weight_percentage: 10 });
        fetchContributions();
        fetchAvailableGoals();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error adding contribution:', error);
    }
  };

  const handleUpdateWeight = async (contributionId, newWeight) => {
    try {
      const response = await fetch(`${apiUrl}/unified-goals?resource=contributions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contributionId,
          weight_percentage: parseFloat(newWeight)
        })
      });

      if (response.ok) {
        fetchContributions();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error updating contribution:', error);
    }
  };

  const handleDeleteContribution = async (contributionId) => {
    if (!window.confirm('Remove this contribution relationship?')) return;

    try {
      const response = await fetch(`${apiUrl}/unified-goals?resource=contributions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contributionId })
      });

      if (response.ok) {
        fetchContributions();
        fetchAvailableGoals();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error deleting contribution:', error);
    }
  };

  if (loading) {
    return <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loading contributions...</div>;
  }

  const totalWeight = contributions.reduce((sum, c) => sum + parseFloat(c.weight_percentage), 0);
  const isBalanced = Math.abs(totalWeight - 100) < 0.1;

  return (
    <div className="contribution-editor">
      <div className="flex-between" style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Goal Contributions
        </span>
        <button
          className="btn-secondary"
          style={{ width: 'auto', fontSize: '12px', padding: '4px 12px' }}
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={12} /> Add Contribution
        </button>
      </div>

      {contributions.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          No child goals contributing to this goal yet.
        </div>
      ) : (
        <>
          <div style={{
            marginBottom: '12px',
            padding: '8px 12px',
            background: isBalanced ? '#ecfdf5' : '#fef3c7',
            border: `1px solid ${isBalanced ? '#a7f3d0' : '#fde68a'}`,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {!isBalanced && <AlertCircle size={14} color="#f59e0b" />}
            <span style={{ fontSize: '12px', color: isBalanced ? '#059669' : '#92400e' }}>
              Total Weight: {totalWeight.toFixed(1)}% {isBalanced ? '✓ Balanced' : '⚠ Should total 100%'}
            </span>
          </div>

          <div className="flex-col gap-sm">
            {contributions.map(contrib => (
              <div
                key={contrib.id}
                className="card"
                style={{
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div className="flex-between">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {contrib.child_goal_title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {contrib.child_goal_type?.replace('_', ' ')}
                    </div>
                  </div>
                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={() => handleDeleteContribution(contrib.id)}
                    title="Remove contribution"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={contrib.weight_percentage}
                    onChange={(e) => handleUpdateWeight(contrib.id, e.target.value)}
                    style={{
                      flex: 1,
                      height: '6px',
                      borderRadius: '3px',
                      background: 'var(--border-light)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={contrib.weight_percentage}
                    onChange={(e) => handleUpdateWeight(contrib.id, e.target.value)}
                    style={{
                      width: '60px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      textAlign: 'center',
                      border: '1px solid var(--border-default)',
                      borderRadius: '4px'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', minWidth: '16px' }}>%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <h3>Add Goal Contribution</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Link a child goal to contribute toward this parent goal's progress.
            </p>

            <form onSubmit={handleAddContribution}>
              <div className="form-group">
                <label>Child Goal</label>
                <select
                  value={newContribution.child_goal_id}
                  onChange={(e) => setNewContribution({ ...newContribution, child_goal_id: e.target.value })}
                  required
                >
                  <option value="">Select a goal</option>
                  {availableGoals.map(goal => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title} ({goal.goal_type?.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Weight Percentage</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={newContribution.weight_percentage}
                    onChange={(e) => setNewContribution({ ...newContribution, weight_percentage: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={newContribution.weight_percentage}
                    onChange={(e) => setNewContribution({ ...newContribution, weight_percentage: e.target.value })}
                    style={{ width: '80px' }}
                  />
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>%</span>
                </div>
                <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  All contributions should total 100%
                </small>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
                  <Plus size={16} /> Add Contribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContributionEditor;
