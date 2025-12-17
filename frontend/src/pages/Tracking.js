import React from 'react';
import Track from './Track';

function Tracking({ apiUrl, onLoadMeal }) {
  return (
    <div className="tracking-page">
      {/* Health Tracking Section - Existing functionality */}
      <div className="tracking-section">
        <Track apiUrl={apiUrl} />
      </div>

      {/* Habits Tracking Section - Coming Soon */}
      <div className="tracking-section" style={{ marginTop: '24px' }}>
        <div style={{ padding: '32px 24px', textAlign: 'center', background: 'rgba(0, 0, 0, 0.02)', border: '1px solid rgba(0, 0, 0, 0.06)', borderRadius: '0.25rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Coming Soon</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Habits & Goals Tracking</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Spreadsheet-like interface for daily habit tracking with rank-based scoring
          </p>
        </div>
      </div>
    </div>
  );
}

export default Tracking;
