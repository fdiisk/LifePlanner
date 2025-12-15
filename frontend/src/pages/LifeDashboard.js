import React from 'react';

function LifeDashboard({ apiUrl }) {
  return (
    <div className="life-dashboard">
      <h2>📊 Life Dashboard</h2>
      <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', margin: '20px 0' }}>
        <h3>🚧 Coming Soon</h3>
        <p style={{ color: '#6b7280', marginTop: '12px' }}>
          3-tier hierarchical dashboard with Overall Progress, Health Category, and Other Categories
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
          Backend infrastructure complete. UI implementation in progress.
        </p>
      </div>
    </div>
  );
}

export default LifeDashboard;
