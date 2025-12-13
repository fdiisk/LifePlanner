import React, { useState, useEffect } from 'react';

function Notes() {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('planner_notes');
    if (saved) {
      setNotes(saved);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('planner_notes', notes);
    alert('Notes saved!');
  };

  return (
    <div className="notes-page">
      <h1>Development Notes</h1>
      <p>Quick notes on what to work on next...</p>
      
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Type your notes here..."
        style={{
          width: '100%',
          minHeight: '400px',
          padding: '12px',
          border: '1px solid black',
          fontFamily: 'Mona Sans, monospace',
          fontSize: '1rem',
          lineHeight: '1.6',
          marginBottom: '12px'
        }}
      />
      
      <button className="btn-primary" onClick={handleSave}>
        Save Notes
      </button>
    </div>
  );
}

export default Notes;