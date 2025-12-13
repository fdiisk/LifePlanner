import React, { useState } from 'react';
import axios from 'axios';

function QuickLog({ apiUrl, onLogAdded }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(`${apiUrl}/pending-log`, {
        input: input.trim(),
        date: new Date().toISOString().split('T')[0]
      });

      const logs = response.data.logs || [response.data.log];
      const categories = [...new Set(logs.map(l => l.category))].join(', ');

      setResult({
        type: 'success',
        message: response.data.message,
        category: categories
      });
      setInput('');
      
      if (onLogAdded) {
        onLogAdded();
      }

    } catch (error) {
      setResult({
        type: 'error',
        message: error.response?.data?.error || 'Failed to log entry'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quick-log">
      <h2>Quick Log</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="text"
            placeholder="e.g., had 1l water, ran 5k, ate chicken and rice..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Processing...' : 'Add Entry'}
        </button>
      </form>

      {result && (
        <div className={`result ${result.type}`}>
          ✓ {result.message}
          {result.category && (
            <div style={{ marginTop: '6px', fontSize: '0.9rem' }}>
              Filed under: <strong>{result.category}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QuickLog;