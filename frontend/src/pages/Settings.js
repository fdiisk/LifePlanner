import React from 'react';

function Settings({ apiUrl }) {
  return (
    <div className="settings">
      <h2>⚙️ Settings</h2>
      <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', margin: '20px 0' }}>
        <h3>🚧 Coming Soon</h3>
        <p style={{ color: '#6b7280', marginTop: '12px' }}>
          AI configuration, API keys, parsing preferences, and data management
        </p>
      </div>
    </div>
  );
}

export default Settings;
