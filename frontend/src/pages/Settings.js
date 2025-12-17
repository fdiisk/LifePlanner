import React, { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Save, Activity } from 'lucide-react';

function Settings({ apiUrl }) {
  const [settings, setSettings] = useState({
    daily_calories_target: 2000,
    daily_protein_target: 150,
    daily_carbs_target: 200,
    daily_fats_target: 65
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/life-tracking?resource=settings`);
      const data = await response.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
    setLoading(false);
  }, [apiUrl]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch(`${apiUrl}/life-tracking?resource=settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setSaveMessage('Settings saved successfully');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving settings');
    }

    setSaving(false);
  };

  const handleChange = (field, value) => {
    setSettings({
      ...settings,
      [field]: parseInt(value) || 0
    });
  };

  if (loading) {
    return (
      <div className="settings">
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <SettingsIcon className="spinner" size={32} />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings">
      <h2><SettingsIcon size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Settings</h2>

      <div className="settings-section" style={{ marginTop: '24px' }}>
        <h3><Activity size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Daily Nutrition Goals</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px', marginBottom: '20px' }}>
          Set your daily nutrition targets. These will be used to track your progress on the dashboard.
        </p>

        <form onSubmit={handleSave} style={{ maxWidth: '500px' }}>
          <div className="form-group">
            <label>Daily Calories Target</label>
            <input
              type="number"
              value={settings.daily_calories_target}
              onChange={(e) => handleChange('daily_calories_target', e.target.value)}
              min="0"
              step="50"
              required
            />
          </div>

          <div className="form-group">
            <label>Daily Protein Target (grams)</label>
            <input
              type="number"
              value={settings.daily_protein_target}
              onChange={(e) => handleChange('daily_protein_target', e.target.value)}
              min="0"
              step="5"
              required
            />
          </div>

          <div className="form-group">
            <label>Daily Carbs Target (grams)</label>
            <input
              type="number"
              value={settings.daily_carbs_target}
              onChange={(e) => handleChange('daily_carbs_target', e.target.value)}
              min="0"
              step="5"
              required
            />
          </div>

          <div className="form-group">
            <label>Daily Fats Target (grams)</label>
            <input
              type="number"
              value={settings.daily_fats_target}
              onChange={(e) => handleChange('daily_fats_target', e.target.value)}
              min="0"
              step="5"
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: 'auto', marginTop: '8px' }} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {saveMessage && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: saveMessage.includes('success') ? 'rgba(0, 102, 255, 0.1)' : 'rgba(255, 0, 0, 0.1)',
              color: saveMessage.includes('success') ? '#0066ff' : '#ff0000',
              borderRadius: '0.25rem',
              fontSize: '14px'
            }}>
              {saveMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Settings;
