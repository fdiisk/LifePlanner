import React, { useEffect, useState } from 'react';

const PendingLogs = () => {
  const [pendingLogs, setPendingLogs] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const date = '2025-12-13'; // Remove the :1 suffix

  useEffect(() => {
    const fetchPendingLogs = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/pending-log?date=${date}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        setPendingLogs(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching pending logs:', error);
        setPendingLogs([]);
        setError(`Failed to load pending logs: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingLogs();
  }, [date]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Pending Logs</h1>
      <ul>
        {pendingLogs.map((log) => (
          <li key={log.id}>{log.message}</li>
        ))}
      </ul>
    </div>
  );
};

export default PendingLogs;