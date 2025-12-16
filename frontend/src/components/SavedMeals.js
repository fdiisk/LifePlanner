import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from './Modal';

function SavedMeals({ apiUrl, onLoadMeal }) {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false });

  const fetchSavedMeals = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/saved-meals`);
      setMeals(response.data.meals || []);
    } catch (error) {
      console.error('Error fetching saved meals:', error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchSavedMeals();
  }, [fetchSavedMeals]);

  const handleLoadMeal = async (meal, multiplier = 1) => {
    try {
      // Update usage stats
      await axios.put(`${apiUrl}/saved-meals?id=${meal.id}`);

      // Load meal into pending logs (multiple times if multiplier > 1)
      for (let i = 0; i < multiplier; i++) {
        await onLoadMeal(meal);
      }

      setModalConfig({
        isOpen: true,
        title: 'Success!',
        message: `Loaded "${meal.title}"${multiplier > 1 ? ` x${multiplier}` : ''} to today's logs`,
        confirmText: 'OK',
        type: 'success'
      });
    } catch (error) {
      console.error('Error loading meal:', error);
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load meal. Please try again.',
        confirmText: 'OK',
        type: 'danger'
      });
    }
  };

  const handleDeleteMeal = (meal) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Meal',
      message: `Are you sure you want to delete "${meal.title}"?`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        try {
          await axios.delete(`${apiUrl}/saved-meals?id=${meal.id}`);
          fetchSavedMeals();
        } catch (error) {
          console.error('Error deleting meal:', error);
        }
      }
    });
  };

  const filteredMeals = meals.filter(meal =>
    meal.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading">
        <svg className="spinner" viewBox="0 0 24 24" style={{ width: '24px', height: '24px', marginRight: '8px' }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="50" strokeDashoffset="0">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 12 12"
              to="360 12 12"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
        Loading saved meals...
      </div>
    );
  }

  return (
    <div className="saved-meals">
      <div className="saved-meals-header">
        <input
          type="text"
          placeholder="Search meals..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {filteredMeals.length === 0 ? (
        <div className="empty-state">
          {searchTerm ? 'No meals found matching your search.' : 'No saved meals yet. Save your first meal from pending logs!'}
        </div>
      ) : (
        <div className="meals-grid">
          {filteredMeals.map((meal) => (
            <div key={meal.id} className="meal-card">
              <div className="meal-header">
                <h3>{meal.title}</h3>
                {meal.times_used > 0 && (
                  <span className="usage-badge">Used {meal.times_used}x</span>
                )}
              </div>

              <div className="meal-macros">
                <div className="macro-item">
                  <span className="macro-value">{meal.total_calories}</span>
                  <span className="macro-label">cal</span>
                </div>
                <div className="macro-item">
                  <span className="macro-value">{meal.total_protein}g</span>
                  <span className="macro-label">protein</span>
                </div>
                <div className="macro-item">
                  <span className="macro-value">{meal.total_carbs}g</span>
                  <span className="macro-label">carbs</span>
                </div>
                <div className="macro-item">
                  <span className="macro-value">{meal.total_fats}g</span>
                  <span className="macro-label">fats</span>
                </div>
              </div>

              <div className="meal-ingredients">
                {JSON.parse(meal.ingredients).map((item, i) => (
                  <div key={i} className="ingredient-item">
                    <span>{item.food}</span>
                    <span>{item.amount}{item.unit || 'g'}</span>
                  </div>
                ))}
              </div>

              <div className="meal-actions">
                <button
                  className="btn-load"
                  onClick={() => handleLoadMeal(meal, 1)}
                >
                  Load 1x
                </button>
                <button
                  className="btn-load"
                  onClick={() => handleLoadMeal(meal, 2)}
                >
                  Load 2x
                </button>
                <button
                  className="btn-delete-meal"
                  onClick={() => handleDeleteMeal(meal)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal {...modalConfig} onClose={() => setModalConfig({ isOpen: false })} />
    </div>
  );
}

export default SavedMeals;
