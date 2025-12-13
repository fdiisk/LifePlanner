import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function PendingLogs({ apiUrl, refreshTrigger }) {
  const [logs, setLogs] = useState({
    water: [],
    food: [],
    cardio: [],
    workout: [],
    sleep: [],
    steps: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchPendingLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/pending-log?date=${selectedDate}`);
      setLogs(response.data.logs || {
        water: [],
        food: [],
        cardio: [],
        workout: [],
        sleep: [],
        steps: []
      });
    } catch (error) {
      console.error('Error fetching pending logs:', error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, selectedDate]);

  useEffect(() => {
    fetchPendingLogs();
  }, [selectedDate, refreshTrigger, fetchPendingLogs]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;

    try {
      await axios.delete(`${apiUrl}/pending-log?id=${id}`);
      fetchPendingLogs();
    } catch (error) {
      console.error('Error deleting log:', error);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      water: '💧',
      food: '🍽️',
      cardio: '🏃',
      workout: '💪',
      sleep: '😴',
      steps: '👟'
    };
    return icons[category] || '📝';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return <div className="loading">Loading pending logs...</div>;
  }

  const hasLogs = logs && Object.values(logs).some(arr => arr.length > 0);

  return (
    <div className="pending-logs">
      <div className="pending-header">
        <h2>Pending Logs</h2>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {!hasLogs ? (
        <div className="empty-state">
          No entries for this day yet. Start logging!
        </div>
      ) : (
        <>
          {Object.entries(logs).map(([category, entries]) => {
            if (entries.length === 0) return null;

            return (
              <div key={category} className="pending-category">
                <h3>
                  {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
                </h3>
                
                {entries.map((entry) => (
                  <div key={entry.id} className="pending-item">
                    <div className="pending-item-header">
                      <span className="pending-time">{formatTime(entry.logged_at)}</span>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDelete(entry.id)}
                      >
                        Delete
                      </button>
                    </div>
                    <div className="pending-item-content">
                      {entry.raw_input}
                    </div>
                    {entry.parsed_data && (
                      <div className="pending-item-parsed">
                        {category === 'water' && entry.parsed_data.amount_ml && (
                          <span>{entry.parsed_data.amount_ml}ml</span>
                        )}
                        {category === 'food' && entry.parsed_data.items && (
                          <span>{entry.parsed_data.items.length} items</span>
                        )}
                        {category === 'cardio' && entry.parsed_data.type && (
                          <span>
                            {entry.parsed_data.type}
                            {entry.parsed_data.distance_km && ` · ${entry.parsed_data.distance_km}km`}
                            {entry.parsed_data.pace_per_km && ` · ${entry.parsed_data.pace_per_km}/km`}
                          </span>
                        )}
                        {category === 'workout' && entry.parsed_data.exercises && (
                          <span>{entry.parsed_data.exercises.length} exercises</span>
                        )}
                        {category === 'sleep' && entry.parsed_data.duration_hours && (
                          <span>{entry.parsed_data.duration_hours}hrs</span>
                        )}
                        {category === 'steps' && entry.parsed_data.total_steps && (
                          <span>{entry.parsed_data.total_steps.toLocaleString()} steps</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          <div className="pending-actions">
            <button className="btn-primary">
              Review & Compile Day
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default PendingLogs;