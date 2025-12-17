import React, { useState, useEffect } from 'react';
import { Check, Square, CheckSquare } from 'lucide-react';

/**
 * Daily Checklist Component
 * Displays and manages daily checklist items for qualitative goals
 */
function DailyChecklist({ goalId, date, apiUrl, onProgressUpdate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (goalId && date) {
      fetchChecklist();
    }
  }, [goalId, date]);

  const fetchChecklist = async () => {
    try {
      const response = await fetch(
        `${apiUrl}/unified-goals?resource=daily-checklist&goal_id=${goalId}&date=${date}`
      );
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching checklist:', error);
    }
    setLoading(false);
  };

  const toggleItem = async (item) => {
    try {
      const response = await fetch(`${apiUrl}/unified-goals?resource=checklist-completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist_item_id: item.id,
          date,
          is_completed: !item.is_completed
        })
      });

      if (response.ok) {
        fetchChecklist();
        if (onProgressUpdate) onProgressUpdate();
      }
    } catch (error) {
      console.error('Error toggling checklist item:', error);
    }
  };

  if (loading) {
    return <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loading checklist...</div>;
  }

  if (items.length === 0) {
    return (
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        No checklist items for this goal.
      </div>
    );
  }

  const completedCount = items.filter(i => i.is_completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <div className="daily-checklist">
      <div className="flex-between" style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Daily Checklist
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {completedCount}/{items.length} completed
        </span>
      </div>

      <div className="progress-bar-container" style={{ marginBottom: '12px' }}>
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-col gap-sm">
        {items.map(item => (
          <div
            key={item.id}
            className="flex"
            style={{
              gap: '8px',
              alignItems: 'center',
              padding: '8px',
              borderRadius: '6px',
              background: item.is_completed ? 'var(--border-light)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            onClick={() => toggleItem(item)}
          >
            {item.is_completed ? (
              <CheckSquare size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            ) : (
              <Square size={18} color="var(--border-default)" style={{ flexShrink: 0 }} />
            )}

            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '13px',
                color: item.is_completed ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: item.is_completed ? 'line-through' : 'none'
              }}>
                {item.title}
              </div>
              {item.description && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {item.description}
                </div>
              )}
            </div>

            <span style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              background: 'var(--border-light)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {item.weight_percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DailyChecklist;
