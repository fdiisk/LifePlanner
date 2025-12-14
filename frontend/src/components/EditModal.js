import React, { useState, useEffect } from 'react';

function EditModal({ isOpen, onClose, onSave, entry, category }) {
  const [editedData, setEditedData] = useState(null);

  useEffect(() => {
    if (entry && entry.parsed_data) {
      setEditedData(JSON.parse(JSON.stringify(entry.parsed_data)));
    }
  }, [entry]);

  if (!isOpen || !editedData) return null;

  const handleSave = () => {
    onSave(editedData);
    onClose();
  };

  const renderFoodEditor = () => {
    if (!editedData.items) return null;

    return (
      <div className="edit-form">
        {editedData.items.map((item, index) => (
          <div key={index} className="edit-food-item">
            <h4>Item {index + 1}</h4>
            <div className="form-group">
              <label>Food:</label>
              <input
                type="text"
                value={item.food || ''}
                onChange={(e) => {
                  const newItems = [...editedData.items];
                  newItems[index].food = e.target.value;
                  setEditedData({ ...editedData, items: newItems });
                }}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Amount:</label>
                <input
                  type="number"
                  value={item.amount || ''}
                  onChange={(e) => {
                    const newItems = [...editedData.items];
                    newItems[index].amount = parseFloat(e.target.value);
                    setEditedData({ ...editedData, items: newItems });
                  }}
                />
              </div>
              <div className="form-group">
                <label>Unit:</label>
                <input
                  type="text"
                  value={item.unit || 'g'}
                  onChange={(e) => {
                    const newItems = [...editedData.items];
                    newItems[index].unit = e.target.value;
                    setEditedData({ ...editedData, items: newItems });
                  }}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Preparation:</label>
              <input
                type="text"
                value={item.preparation || ''}
                onChange={(e) => {
                  const newItems = [...editedData.items];
                  newItems[index].preparation = e.target.value;
                  setEditedData({ ...editedData, items: newItems });
                }}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Calories:</label>
                <input
                  type="number"
                  value={item.calories || ''}
                  onChange={(e) => {
                    const newItems = [...editedData.items];
                    newItems[index].calories = parseFloat(e.target.value);
                    setEditedData({ ...editedData, items: newItems });
                  }}
                />
              </div>
              <div className="form-group">
                <label>Protein (g):</label>
                <input
                  type="number"
                  step="0.1"
                  value={item.protein || ''}
                  onChange={(e) => {
                    const newItems = [...editedData.items];
                    newItems[index].protein = parseFloat(e.target.value);
                    setEditedData({ ...editedData, items: newItems });
                  }}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Carbs (g):</label>
                <input
                  type="number"
                  step="0.1"
                  value={item.carbs || ''}
                  onChange={(e) => {
                    const newItems = [...editedData.items];
                    newItems[index].carbs = parseFloat(e.target.value);
                    setEditedData({ ...editedData, items: newItems });
                  }}
                />
              </div>
              <div className="form-group">
                <label>Fats (g):</label>
                <input
                  type="number"
                  step="0.1"
                  value={item.fats || ''}
                  onChange={(e) => {
                    const newItems = [...editedData.items];
                    newItems[index].fats = parseFloat(e.target.value);
                    setEditedData({ ...editedData, items: newItems });
                  }}
                />
              </div>
            </div>
            {index < editedData.items.length - 1 && <hr />}
          </div>
        ))}
      </div>
    );
  };

  const renderWaterEditor = () => {
    return (
      <div className="edit-form">
        <div className="form-group">
          <label>Amount (ml):</label>
          <input
            type="number"
            value={editedData.amount_ml || ''}
            onChange={(e) => setEditedData({ ...editedData, amount_ml: parseInt(e.target.value) })}
          />
        </div>
      </div>
    );
  };

  const renderStepsEditor = () => {
    return (
      <div className="edit-form">
        <div className="form-group">
          <label>Total Steps:</label>
          <input
            type="number"
            value={editedData.total_steps || ''}
            onChange={(e) => setEditedData({ ...editedData, total_steps: parseInt(e.target.value) })}
          />
        </div>
      </div>
    );
  };

  const renderSleepEditor = () => {
    return (
      <div className="edit-form">
        <div className="form-group">
          <label>Duration (hours):</label>
          <input
            type="number"
            step="0.5"
            value={editedData.duration_hours || ''}
            onChange={(e) => setEditedData({ ...editedData, duration_hours: parseFloat(e.target.value) })}
          />
        </div>
        <div className="form-group">
          <label>Quality Score (1-10):</label>
          <input
            type="number"
            min="1"
            max="10"
            value={editedData.quality_score || ''}
            onChange={(e) => setEditedData({ ...editedData, quality_score: parseInt(e.target.value) })}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Edit {category.charAt(0).toUpperCase() + category.slice(1)} Entry</h3>

        {category === 'food' && renderFoodEditor()}
        {category === 'water' && renderWaterEditor()}
        {category === 'steps' && renderStepsEditor()}
        {category === 'sleep' && renderSleepEditor()}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditModal;
