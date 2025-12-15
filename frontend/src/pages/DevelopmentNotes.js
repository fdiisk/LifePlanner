import React, { useState, useEffect } from 'react';
import { FileText, Save, X, Edit, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'lifeplanner_dev_notes';

const initialContent = {
  phase1: {
    title: 'Phase 1 (Backend)',
    status: 'completed',
    items: [
      'Database tables created',
      'API endpoints functional',
      'Dummy data loads correctly',
      'Hierarchical structure builds',
      'Under Vercel function limit'
    ]
  },
  phase2: {
    title: 'Phase 2 (Deployment)',
    status: 'completed',
    items: [
      'Build compiles successfully',
      'No missing component errors',
      'Under 12 function limit',
      'All APIs consolidated properly'
    ]
  },
  phase3: {
    title: 'Phase 3 (Frontend - TODO)',
    status: 'in-progress',
    items: [
      'Implement LifeDashboard 3-tier layout',
      'Implement Tracking habits spreadsheet',
      'Implement GoalsSetup tree editor',
      'Health data auto-populates habits',
      'Rankings calculate correctly'
    ]
  },
  phase4: {
    title: 'Phase 4 (Micro-Enhancements & Iterations - In Progress/TODO)',
    status: 'in-progress',
    items: [
      { text: 'Integrate weight tracking module (input, logging, and storage)', checked: false, notes: '', date: '' },
      { text: 'Integrate sleep tracking module (input, duration/quality logging, and storage)', checked: false, notes: '', date: '' },
      { text: 'Expand health AI prompter to include weight and sleep data processing', checked: false, notes: '', date: '' },
      { text: 'Implement daily time blocks tracker (e.g., schedule allocation with start/end times)', checked: false, notes: '', date: '' },
      { text: 'Develop end-of-day review checklist (e.g., verify water, caffeine, macros against targets)', checked: false, notes: '', date: '' },
      { text: 'Refine goal hierarchy with 3-level pyramid visualization (high/mid/actionable)', checked: false, notes: '', date: '' },
      { text: 'Ensure habit tracking with 1-3 scoring system functions fully (missed/partial/full)', checked: false, notes: '', date: '' },
      { text: 'Add goal comparison logic (tracked stats vs. ideal targets from goals)', checked: false, notes: '', date: '' },
      { text: 'Enable goal tweaking interface (adjust timeframes based on comparisons)', checked: false, notes: '', date: '' },
      { text: 'Integrate capacity allocation system (shift time/energy balances across activities/categories)', checked: false, notes: '', date: '' },
      { text: 'Enhance dashboard with health category updates (include weight/sleep trends)', checked: false, notes: '', date: '' },
      { text: 'Add wheel of life ratings component (radial chart for life domain balance)', checked: false, notes: '', date: '' },
      { text: 'Implement time-to-goal calculator display (projections based on current pace)', checked: false, notes: '', date: '' },
      { text: 'Develop calendar view for tasks, habits, and time blocks', checked: false, notes: '', date: '' },
      { text: 'Create badges and streaks gamification (e.g., awards for 3/3 scores or consecutive completions)', checked: false, notes: '', date: '' },
      { text: 'Link tracking data to goals (e.g., auto-update progress from daily logs)', checked: false, notes: '', date: '' },
      { text: 'Implement automated calculations (e.g., calorie deficits, macro adjustments from goals)', checked: false, notes: '', date: '' },
      { text: 'Add export to JSON functionality (for all data: goals, tracking, notes)', checked: false, notes: '', date: '' },
      { text: 'Develop general notes section (storage, with next-day reminder flagging)', checked: false, notes: '', date: '' }
    ]
  }
};

function DevelopmentNotes() {
  const [content, setContent] = useState(initialContent);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');
  const [expandedPhases, setExpandedPhases] = useState({
    phase1: true,
    phase2: true,
    phase3: true,
    phase4: true
  });
  const [expandedTasks, setExpandedTasks] = useState({});

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setContent(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved notes:', error);
      }
    }
  }, []);

  // Convert content to markdown for editing
  const contentToMarkdown = () => {
    let markdown = '';

    Object.entries(content).forEach(([key, phase]) => {
      markdown += `${phase.title}\n`;

      if (key === 'phase4') {
        // Phase 4 with checkboxes
        phase.items.forEach(item => {
          const checkbox = item.checked ? '[x]' : '[ ]';
          markdown += `  - ${checkbox} ${item.text}\n`;
          if (item.notes) markdown += `    Notes: ${item.notes}\n`;
          if (item.date) markdown += `    Completed: ${item.date}\n`;
        });
      } else {
        // Other phases without checkboxes
        phase.items.forEach(item => {
          markdown += `  - ${item}\n`;
        });
      }
      markdown += '\n';
    });

    return markdown;
  };

  // Parse markdown back to content structure
  const markdownToContent = (markdown) => {
    const newContent = JSON.parse(JSON.stringify(initialContent)); // Deep clone

    const lines = markdown.split('\n');
    let currentPhase = null;
    let currentItem = null;

    lines.forEach(line => {
      // Phase headers
      if (line.includes('Phase 1')) currentPhase = 'phase1';
      else if (line.includes('Phase 2')) currentPhase = 'phase2';
      else if (line.includes('Phase 3')) currentPhase = 'phase3';
      else if (line.includes('Phase 4')) currentPhase = 'phase4';

      // Items
      if (line.trim().startsWith('- [') && currentPhase === 'phase4') {
        const checked = line.includes('[x]');
        const text = line.replace(/^\s*-\s*\[[x\s]\]\s*/, '');
        const itemIndex = newContent.phase4.items.length;

        if (itemIndex < initialContent.phase4.items.length) {
          newContent.phase4.items[itemIndex].checked = checked;
          newContent.phase4.items[itemIndex].text = text;
          currentItem = itemIndex;
        }
      } else if (line.trim().startsWith('- ') && currentPhase && currentPhase !== 'phase4') {
        const text = line.replace(/^\s*-\s*/, '');
        if (newContent[currentPhase]) {
          const itemIndex = newContent[currentPhase].items.length;
          if (itemIndex < initialContent[currentPhase].items.length) {
            newContent[currentPhase].items[itemIndex] = text;
          }
        }
      }

      // Notes and dates for Phase 4 items
      if (line.trim().startsWith('Notes:') && currentPhase === 'phase4' && currentItem !== null) {
        newContent.phase4.items[currentItem].notes = line.replace(/^\s*Notes:\s*/, '');
      }
      if (line.trim().startsWith('Completed:') && currentPhase === 'phase4' && currentItem !== null) {
        newContent.phase4.items[currentItem].date = line.replace(/^\s*Completed:\s*/, '');
      }
    });

    return newContent;
  };

  const handleToggleEditMode = () => {
    if (editMode) {
      // Exiting edit mode - parse and save
      const newContent = markdownToContent(editText);
      setContent(newContent);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newContent));
    } else {
      // Entering edit mode - convert to markdown
      setEditText(contentToMarkdown());
    }
    setEditMode(!editMode);
  };

  const handleToggleCheckbox = (itemIndex) => {
    const newContent = { ...content };
    newContent.phase4.items[itemIndex].checked = !newContent.phase4.items[itemIndex].checked;

    // Add completion date if checking
    if (newContent.phase4.items[itemIndex].checked && !newContent.phase4.items[itemIndex].date) {
      newContent.phase4.items[itemIndex].date = new Date().toLocaleDateString();
    }

    setContent(newContent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newContent));
  };

  const handleTogglePhase = (phase) => {
    setExpandedPhases(prev => ({ ...prev, [phase]: !prev[phase] }));
  };

  const handleToggleTask = (itemIndex) => {
    setExpandedTasks(prev => ({ ...prev, [itemIndex]: !prev[itemIndex] }));
  };

  const handleUpdateNotes = (itemIndex, notes) => {
    const newContent = { ...content };
    newContent.phase4.items[itemIndex].notes = notes;
    setContent(newContent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newContent));
  };

  const getCompletionStats = () => {
    const total = content.phase4.items.length;
    const completed = content.phase4.items.filter(item => item.checked).length;
    const percentage = Math.round((completed / total) * 100);
    return { total, completed, percentage };
  };

  if (editMode) {
    return (
      <div className="development-notes">
        <div className="dev-notes-header">
          <h2><FileText size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Development Notes</h2>
          <div className="dev-notes-actions">
            <button className="btn-save" onClick={handleToggleEditMode}>
              <Save size={16} />
              Save Changes
            </button>
            <button className="btn-cancel" onClick={() => setEditMode(false)}>
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>

        <div className="edit-mode-info">
          <p><Edit size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /><strong>Edit Mode Active</strong></p>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
            Edit the markdown below. Use <code>[ ]</code> for unchecked and <code>[x]</code> for checked items in Phase 4.
          </p>
        </div>

        <textarea
          className="dev-notes-editor"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          rows={30}
        />
      </div>
    );
  }

  const stats = getCompletionStats();

  return (
    <div className="development-notes">
      <div className="dev-notes-header">
        <h2><FileText size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Development Notes</h2>
        <div className="dev-notes-actions">
          <button className="btn-edit-mode" onClick={handleToggleEditMode}>
            <Edit size={16} />
            Edit Mode
          </button>
        </div>
      </div>

      <div className="dev-notes-progress">
        <div className="progress-stats">
          <span className="stat-item">
            <strong>{stats.completed}</strong> / {stats.total} tasks completed
          </span>
          <span className="stat-item">
            <strong>{stats.percentage}%</strong> progress
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${stats.percentage}%` }}></div>
        </div>
      </div>

      {Object.entries(content).map(([key, phase]) => (
        <div key={key} className="dev-notes-phase">
          <div
            className="phase-header"
            onClick={() => handleTogglePhase(key)}
          >
            <div className="phase-title">
              {expandedPhases[key] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              {phase.status === 'completed' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{phase.title}</span>
            </div>
            <span className={`phase-status ${phase.status}`}>
              {phase.status === 'completed' ? 'Completed' : 'In Progress'}
            </span>
          </div>

          {expandedPhases[key] && (
            <div className="phase-items">
              {key === 'phase4' ? (
                // Phase 4 with interactive checkboxes
                phase.items.map((item, index) => (
                  <div key={index} className="phase4-item">
                    <div className="item-main">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggleCheckbox(index)}
                        className="task-checkbox"
                      />
                      <span className={item.checked ? 'task-text completed' : 'task-text'}>
                        {item.text}
                      </span>
                      {(item.notes || item.date) && (
                        <button
                          className="btn-expand-task"
                          onClick={(e) => { e.stopPropagation(); handleToggleTask(index); }}
                        >
                          {expandedTasks[index] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </div>

                    {expandedTasks[index] && (
                      <div className="task-details">
                        {item.date && (
                          <div className="task-detail">
                            <strong>Completed:</strong> {item.date}
                          </div>
                        )}
                        {item.notes && (
                          <div className="task-detail">
                            <strong>Notes:</strong> {item.notes}
                          </div>
                        )}
                        <div className="task-detail">
                          <strong>Add Notes:</strong>
                          <textarea
                            value={item.notes}
                            onChange={(e) => handleUpdateNotes(index, e.target.value)}
                            placeholder="Add notes about this task..."
                            rows={2}
                            className="task-notes-input"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // Other phases - simple list
                <ul className="phase-items-list">
                  {phase.items.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default DevelopmentNotes;
