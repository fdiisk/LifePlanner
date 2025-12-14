import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from './Modal';
import EditModal from './EditModal';

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
  const [compiling, setCompiling] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalConfig, setModalConfig] = useState({ isOpen: false });
  const [editModalConfig, setEditModalConfig] = useState({ isOpen: false, entry: null, category: null });

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
    setModalConfig({
      isOpen: true,
      title: 'Delete Entry',
      message: 'Are you sure you want to delete this entry?',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        // Modal will close automatically, just delete in background
        axios.delete(`${apiUrl}/pending-log?id=${id}`)
          .then(() => fetchPendingLogs())
          .catch(error => console.error('Error deleting log:', error));
      }
    });
  };

  const handleEdit = (entry, category) => {
    setEditModalConfig({
      isOpen: true,
      entry: entry,
      category: category
    });
  };

  const handleSaveEdit = async (parsedData) => {
    try {
      await axios.put(`${apiUrl}/pending-log`, {
        id: editModalConfig.entry.id,
        parsed_data: parsedData
      });
      fetchPendingLogs();
    } catch (error) {
      console.error('Error updating log:', error);
    }
  };

  const handleCompileDay = () => {
    setModalConfig({
      isOpen: true,
      title: 'Compile Day',
      message: 'Ready to finalize all entries for this day? This will save them to your permanent logs.',
      confirmText: 'Compile Day',
      type: 'confirm',
      onConfirm: async () => {
        setCompiling(true);
        try {
          const response = await axios.post(`${apiUrl}/compile-day`, {
            date: selectedDate
          });

          setModalConfig({
            isOpen: true,
            title: 'Success!',
            message: `${response.data.message}\n\nProcessed: ${response.data.totalLogs} entries`,
            confirmText: 'OK',
            onConfirm: () => {},
            hideCancel: true
          });

          fetchPendingLogs();
        } catch (error) {
          console.error('Error compiling day:', error);
          setModalConfig({
            isOpen: true,
            title: 'Error',
            message: error.response?.data?.error || 'Failed to compile day',
            confirmText: 'OK',
            type: 'danger',
            onConfirm: () => {},
            hideCancel: true
          });
        } finally {
          setCompiling(false);
        }
      }
    });
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
    return (
      <div className="loading">
        <svg className="spinner" viewBox="0 0 24 24" style={{ width: '24px', height: '24px', marginRight: '8px' }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="50" strokeDashoffset="0">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 12 12"
              to="360 12 12"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
        Loading pending logs...
      </div>
    );
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
                      <div className="pending-item-actions">
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(entry, category)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(entry.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {entry.parsed_data && (
                      <div className="pending-item-parsed">
                        {category === 'food' && entry.parsed_data.items && (
                          <div className="food-items-list">
                            {entry.parsed_data.items.map((item, i) => (
                              <div key={i} className="food-item-detail">
                                <div className="food-item-name">
                                  {item.food}
                                  {item.preparation && <span className="food-prep">, {item.preparation}</span>}
                                </div>
                                <div className="food-item-amount">
                                  {item.amount}{item.unit || 'g'}
                                </div>
                                <div className="food-item-macros">
                                  {item.calories}cal · {item.protein}p · {item.carbs}c · {item.fats}f
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {category === 'steps' && entry.parsed_data.total_steps && (
                          <div className="formatted-value">
                            {entry.parsed_data.total_steps.toLocaleString()} Steps
                          </div>
                        )}
                        {category === 'water' && entry.parsed_data.amount_ml && (
                          <div className="formatted-value">
                            {(entry.parsed_data.amount_ml / 1000).toFixed(1)}L Water
                          </div>
                        )}
                        {category === 'cardio' && entry.parsed_data.type && (
                          <div className="formatted-value">
                            {entry.parsed_data.type}
                            {entry.parsed_data.distance_km && ` · ${entry.parsed_data.distance_km}km`}
                            {entry.parsed_data.pace_per_km && ` · ${entry.parsed_data.pace_per_km}/km`}
                          </div>
                        )}
                        {category === 'workout' && entry.parsed_data.exercises && (
                          <div className="formatted-value">
                            {entry.parsed_data.exercises.length} exercises
                          </div>
                        )}
                        {category === 'sleep' && entry.parsed_data.duration_hours && (
                          <div className="formatted-value">
                            {entry.parsed_data.duration_hours}hrs sleep
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          <div className="pending-actions">
            <button className="btn-primary" onClick={handleCompileDay} disabled={compiling}>
              {compiling ? (
                <>
                  <svg className="spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="50" strokeDashoffset="0">
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 12 12"
                        to="360 12 12"
                        dur="1s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </svg>
                  Compiling...
                </>
              ) : 'Review & Compile Day'}
            </button>
          </div>
        </>
      )}

      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        type={modalConfig.type}
      />

      <EditModal
        isOpen={editModalConfig.isOpen}
        onClose={() => setEditModalConfig({ isOpen: false, entry: null, category: null })}
        onSave={handleSaveEdit}
        entry={editModalConfig.entry}
        category={editModalConfig.category}
      />
    </div>
  );
}

export default PendingLogs;