import React from 'react';
import { Crosshair, AlertCircle, Activity } from 'lucide-react';

function GoalsSetup({ apiUrl }) {
  return (
    <div className="goals-setup">
      <h2><Crosshair size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Goals Setup</h2>
      <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(0, 102, 255, 0.1)', borderRadius: '0.25rem', margin: '20px 0' }}>
        <h3><AlertCircle size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Coming Soon</h3>
        <p style={{ color: '#6b7280', marginTop: '12px' }}>
          Hierarchical goal tree with cascading structure: High-level → Yearly → Quarterly → Monthly → Weekly → Daily
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
          Backend infrastructure complete with SMART goals, auto-calculations, and health data linking.
        </p>
        <div style={{ marginTop: '24px', padding: '20px', background: 'white', borderRadius: '0.25rem', textAlign: 'left' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Sample Goal Hierarchy:</h4>
          <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.8', color: '#4b5563' }}>
            <Activity size={16} style={{ display: 'inline', marginRight: '4px' }} /> Health<br/>
            &nbsp;&nbsp;└─ Transform body composition by Dec 31, 2026<br/>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─ Gain 2kg muscle in 2025<br/>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;└─ Q1: Gain 0.5kg muscle<br/>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ Habits: Gym 4x/week, Protein 160g/day<br/>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ Lose 5kg fat in 2025<br/>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GoalsSetup;
