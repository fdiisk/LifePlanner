import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Droplets, Utensils, Coffee, Activity, Dumbbell, Moon, Footprints, FileText } from 'lucide-react';
import Modal from './Modal';
import EditModal from './EditModal';

function Dashboard({ apiUrl }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState({
    water: [],
    food: [],
    caffeine: [],
    cardio: [],
    workout: [],
    sleep: [],
    steps: []
  });
  const [totals, setTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    water: 0,
    steps: 0,
    caffeine: 0
  });
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false });
  const [editModalConfig, setEditModalConfig] = useState({ isOpen: false, entry: null, category: null });

  const fetchPendingLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/pending-log?date=${selectedDate}`);
      const fetchedLogs = response.data.logs || {
        water: [],
        food: [],
        caffeine: [],
        cardio: [],
        workout: [],
        sleep: [],
        steps: []
      };
      setLogs(fetchedLogs);
      calculateTotals(fetchedLogs);
    } catch (error) {
      console.error('Error fetching pending logs:', error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, selectedDate]);

  useEffect(() => {
    fetchPendingLogs();
  }, [selectedDate, fetchPendingLogs]);

  const calculateTotals = (logsData) => {
    let calories = 0, protein = 0, carbs = 0, fats = 0, water = 0, steps = 0, caffeine = 0;

    // Food
    logsData.food.forEach(log => {
      if (log.parsed_data?.items) {
        log.parsed_data.items.forEach(item => {
          calories += item.calories || 0;
          protein += item.protein || 0;
          carbs += item.carbs || 0;
          fats += item.fats || 0;
        });
      }
    });

    // Water
    logsData.water.forEach(log => {
      if (log.parsed_data?.amount_ml) {
        water += log.parsed_data.amount_ml;
      }
    });

    // Caffeine
    logsData.caffeine.forEach(log => {
      if (log.parsed_data?.caffeine_mg) {
        caffeine += log.parsed_data.caffeine_mg;
      }
    });

    // Steps
    logsData.steps.forEach(log => {
      if (log.parsed_data?.total_steps) {
        steps += log.parsed_data.total_steps;
      }
    });

    setTotals({
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fats: Math.round(fats * 10) / 10,
      water: Math.round(water),
      steps,
      caffeine: Math.round(caffeine)
    });
  };

  const handlePreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timestamp) => {
    // Parse UTC timestamp and convert to Australian local time
    // Backend now stores timestamps in UTC, so we need to convert to local
    if (typeof timestamp === 'string' && timestamp.includes(' ')) {
      // Parse as UTC: "2025-12-14 02:00:00" → UTC Date object
      const utcDate = new Date(timestamp + 'Z'); // Adding 'Z' marks it as UTC
      return utcDate.toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Australia/Sydney'
      });
    }
    // Fallback for other formats
    return new Date(timestamp).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Sydney'
    });
  };

  const getCategoryIcon = (category) => {
    const iconSize = 16;
    const iconStyle = { display: 'inline', verticalAlign: 'middle', marginRight: '4px' };

    const icons = {
      water: <Droplets size={iconSize} style={iconStyle} />,
      food: <Utensils size={iconSize} style={iconStyle} />,
      caffeine: <Coffee size={iconSize} style={iconStyle} />,
      cardio: <Activity size={iconSize} style={iconStyle} />,
      workout: <Dumbbell size={iconSize} style={iconStyle} />,
      sleep: <Moon size={iconSize} style={iconStyle} />,
      steps: <Footprints size={iconSize} style={iconStyle} />
    };
    return icons[category] || <FileText size={iconSize} style={iconStyle} />;
  };

  const hasLogs = Object.values(logs).some(arr => arr.length > 0);

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
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Daily Tracker</h1>
        <div className="date-selector">
          <button className="date-nav" onClick={handlePreviousDay}>←</button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button className="date-nav" onClick={handleNextDay}>→</button>
          <button className="date-nav" onClick={handleToday}>Today</button>
        </div>
      </div>

      {/* Macro Summary */}
      <div className="macro-summary">
        <h2>Today's Totals</h2>
        <div className="macro-grid">
          <div className="macro-item">
            <div className="macro-value">{totals.calories}</div>
            <div className="macro-label">Calories</div>
          </div>
          <div className="macro-item">
            <div className="macro-value">{totals.protein}g</div>
            <div className="macro-label">Protein</div>
          </div>
          <div className="macro-item">
            <div className="macro-value">{totals.carbs}g</div>
            <div className="macro-label">Carbs</div>
          </div>
          <div className="macro-item">
            <div className="macro-value">{totals.fats}g</div>
            <div className="macro-label">Fats</div>
          </div>
          <div className="macro-item">
            <div className="macro-value">{(totals.water / 1000).toFixed(1)}L</div>
            <div className="macro-label">Water</div>
          </div>
          <div className="macro-item">
            <div className="macro-value">{totals.steps.toLocaleString()}</div>
            <div className="macro-label">Steps</div>
          </div>
          <div className="macro-item">
            <div className="macro-value">{totals.caffeine}mg</div>
            <div className="macro-label">Caffeine</div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {hasLogs ? (
        <>
          <div className="category-breakdown">
            {Object.entries(logs).map(([category, entries]) => {
              if (entries.length === 0) return null;

              return (
                <div key={category} className="category-card">
                  <div className="category-header">
                    <div className="category-title">
                      {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>
                    <div className="category-count">{entries.length}</div>
                  </div>
                  <div className="category-items">
                    {entries.map((entry, idx) => (
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
                        <div className="pending-item-content">
                          {entry.raw_input}
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
                                      {item.dataSource && item.dataSource.startsWith('verified:') && (
                                        <span className="data-source-badge verified">
                                          ✓ {item.dataSource.replace('verified:', '')}
                                        </span>
                                      )}
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
                            {category === 'caffeine' && entry.parsed_data.caffeine_mg && (
                              <div className="formatted-value">
                                {entry.parsed_data.drink_type && `${entry.parsed_data.drink_type} · `}
                                {entry.parsed_data.caffeine_mg}mg Caffeine
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

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
              ) : 'Compile Day'}
            </button>
          </div>
        </>
      ) : (
        <div className="empty-state">
          No entries for {formatDate(selectedDate)} yet. Start logging!
        </div>
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

export default Dashboard;
