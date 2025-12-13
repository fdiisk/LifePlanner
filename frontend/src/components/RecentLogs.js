import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function RecentLogs({ apiUrl, refreshTrigger }) {
  const [activeTab, setActiveTab] = useState('gym');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'gym' ? '/gym-log' : '/food-log';
      const response = await axios.get(`${apiUrl}${endpoint}?days=7`);
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, apiUrl]);

  useEffect(() => {
    fetchLogs();
  }, [activeTab, refreshTrigger, fetchLogs]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return `Today ${date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="recent-logs">
      <h2>Recent Logs</h2>
      
      <div className="log-tabs">
        <button 
          className={`log-tab ${activeTab === 'gym' ? 'active' : ''}`}
          onClick={() => setActiveTab('gym')}
        >
          Gym
        </button>
        <button 
          className={`log-tab ${activeTab === 'food' ? 'active' : ''}`}
          onClick={() => setActiveTab('food')}
        >
          Food
        </button>
      </div>

      <div className="log-list">
        {loading ? (
          <div className="loading">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="loading">No logs yet. Start tracking!</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="log-item">
              <div className="log-header">
                <span className="log-title">
                  {activeTab === 'gym' ? log.exercise : `${log.calories}cal`}
                </span>
                <span className="log-date">{formatDate(log.date)}</span>
              </div>
              <div className="log-details">
                {activeTab === 'gym' ? (
                  <>
                    {log.sets}x{log.reps} @ {log.weight}{log.unit}
                    {log.notes && <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#999' }}>
                      {log.notes}
                    </div>}
                  </>
                ) : (
                  <>
                    P: {log.protein}g | C: {log.carbs}g | F: {log.fats}g
                    <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#999' }}>
                      {log.description}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default RecentLogs;