import React from 'react';
import { CheckSquare, Activity, ClipboardList, AlertCircle } from 'lucide-react';
import Track from './Track';

function Tracking({ apiUrl, onLoadMeal }) {
  return (
    <div className="tracking-page">
      <h2><CheckSquare size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Tracking</h2>

      {/* Health Tracking Section - Existing functionality */}
      <div className="tracking-section">
        <h3><Activity size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Health Tracking</h3>
        <Track apiUrl={apiUrl} />
      </div>

      {/* Habits Tracking Section - Coming Soon */}
      <div className="tracking-section" style={{ marginTop: '32px' }}>
        <h3><ClipboardList size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Habits & Goals Tracking</h3>
        <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(0, 102, 255, 0.1)', borderRadius: '0.25rem', marginTop: '16px' }}>
          <h4><AlertCircle size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Coming Soon</h4>
          <p style={{ color: '#6b7280', marginTop: '12px' }}>
            Spreadsheet-like interface for daily habit tracking with rank-based scoring (1-3)
          </p>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
            Backend infrastructure complete. UI implementation in progress.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Tracking;
