import React from 'react';
import { Settings as SettingsIcon, AlertCircle } from 'lucide-react';

function Settings({ apiUrl }) {
  return (
    <div className="settings">
      <h2><SettingsIcon size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Settings</h2>
      <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(0, 102, 255, 0.1)', borderRadius: '0.25rem', margin: '20px 0' }}>
        <h3><AlertCircle size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Coming Soon</h3>
        <p style={{ color: '#6b7280', marginTop: '12px' }}>
          AI configuration, API keys, parsing preferences, and data management
        </p>
      </div>
    </div>
  );
}

export default Settings;
