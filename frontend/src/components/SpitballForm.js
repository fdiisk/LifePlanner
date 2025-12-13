import React, { useState } from 'react';
import axios from 'axios';

function SpitballForm({ onSuccess, apiUrl }) {
  const [activeTab, setActiveTab] = useState('gym');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const endpoint = activeTab === 'gym' ? '/gym-log' : '/food-log';
      const response = await axios.post(`${apiUrl}${endpoint}`, { input });
      
      setResult({ type: 'success', message: response.data.message, data: response.data.parsed });
      setInput('');
      onSuccess();
    } catch (error) {
      setResult({ type: 'error', message: error.response?.data?.error || 'Failed to log entry' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="spitball-form">
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'gym' ? 'active' : ''}`}
          onClick={() => setActiveTab('gym')}
        >
          Gym
        </button>
        <button 
          className={`tab ${activeTab === 'food' ? 'active' : ''}`}
          onClick={() => setActiveTab('food')}
        >
          Food
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <textarea
            placeholder={
              activeTab === 'gym' 
                ? 'e.g., "Did squats 4 sets 10 reps 200 pounds"' 
                : 'e.g., "Ate 200g chicken, 100g rice, banana"'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Processing...' : `Log ${activeTab === 'gym' ? 'Workout' : 'Food'}`}
        </button>
      </form>

      {result && (
        <div className={`result ${result.type}`}>
          <strong>{result.message}</strong>
          {result.data && activeTab === 'gym' && result.data.exercises && (
            <div style={{ marginTop: '0.5rem' }}>
              {result.data.exercises.map((ex, i) => (
                <div key={i}>
                  {ex.name}: {ex.sets}x{ex.reps} @ {ex.weight}{ex.unit} (Volume: {ex.volume})
                </div>
              ))}
            </div>
          )}
          {result.data && activeTab === 'food' && (
            <div style={{ marginTop: '0.5rem' }}>
              Total: {result.data.total_calories}cal | P: {result.data.total_protein}g | C: {result.data.total_carbs}g | F: {result.data.total_fats}g
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SpitballForm;