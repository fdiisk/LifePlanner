import React from 'react';

function StatsDisplay({ stats }) {
  const { gym, food } = stats;

  return (
    <div className="stats-display">
      <div className="stat-card">
        <h3>Gym Stats</h3>
        {gym ? (
          <>
            <div className="stat-item">
              <span className="stat-label">Total Sessions</span>
              <span className="stat-value">{gym.total_sessions}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Exercises</span>
              <span className="stat-value">{gym.total_exercises}</span>
            </div>
            {gym.exercises_by_type && Object.keys(gym.exercises_by_type).length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>By Exercise:</strong>
                {Object.entries(gym.exercises_by_type).map(([exercise, data]) => (
                  <div key={exercise} style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    <strong>{exercise}</strong>: {data.count}x | Max: {data.max_weight}lbs | Volume: {data.total_volume.toLocaleString()}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="loading">Loading...</div>
        )}
      </div>

      <div className="stat-card">
        <h3>Today's Food</h3>
        {food ? (
          <>
            <div className="stat-item">
              <span className="stat-label">Calories</span>
              <span className="stat-value">{food.total_calories}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Protein</span>
              <span className="stat-value">{food.total_protein}g</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Carbs</span>
              <span className="stat-value">{food.total_carbs}g</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Fats</span>
              <span className="stat-value">{food.total_fats}g</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Meals Logged</span>
              <span className="stat-value">{food.meals_logged}</span>
            </div>
          </>
        ) : (
          <div className="loading">Loading...</div>
        )}
      </div>
    </div>
  );
}

export default StatsDisplay;