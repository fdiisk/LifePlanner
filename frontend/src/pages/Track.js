import React, { useState } from 'react';
import QuickLog from '../components/QuickLog';
import PendingLogs from '../components/PendingLogs';

function Track({ apiUrl }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLogAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="track-page">
      <QuickLog
        apiUrl={apiUrl}
        onLogAdded={handleLogAdded}
      />

      <PendingLogs
        apiUrl={apiUrl}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}

export default Track;