import React, { useState, useEffect } from 'react';

function SaveMealModal({ isOpen, onClose, onSave, ingredients }) {
  const [title, setTitle] = useState('');
  const [autoTitle, setAutoTitle] = useState('');

  useEffect(() => {
    if (isOpen && ingredients && ingredients.length > 0) {
      // Generate auto title from ingredients
      const generated = generateMealTitle(ingredients);
      setAutoTitle(generated);
      setTitle(generated);
    }
  }, [isOpen, ingredients]);

  const generateMealTitle = (items) => {
    if (!items || items.length === 0) return '';

    // Get main ingredient (usually first or largest by calories)
    const mainItem = items.reduce((prev, current) =>
      (current.calories > prev.calories) ? current : prev
    );

    // Build title based on ingredients
    if (items.length === 1) {
      // Single item: "200g 10% beef mince"
      return `${mainItem.amount}${mainItem.unit || 'g'} ${mainItem.food}`;
    } else if (items.length === 2) {
      // Two items: "chicken & rice"
      return `${items[0].food} & ${items[1].food}`;
    } else if (items.length <= 4) {
      // 3-4 items: detect meal type
      const itemNames = items.map(i => i.food.toLowerCase());

      // Check for burger
      if (itemNames.some(n => n.includes('mince') || n.includes('patty')) &&
          itemNames.some(n => n.includes('bun')) &&
          itemNames.some(n => n.includes('cheese'))) {
        const meatItem = items.find(i => i.food.toLowerCase().includes('mince') || i.food.toLowerCase().includes('patty'));
        return `${meatItem.amount}g ${meatItem.food.split(' ').filter(w => !w.includes('mince') && !w.includes('beef')).join(' ')} burger`;
      }

      // Check for sandwich
      if (itemNames.some(n => n.includes('bread') || n.includes('bun'))) {
        return `${mainItem.food} sandwich`;
      }

      // Default: list first 3
      return items.slice(0, 3).map(i => i.food).join(', ');
    } else {
      // Many items: use main + count
      return `${mainItem.food} meal (${items.length} items)`;
    }
  };

  const handleSave = () => {
    if (title.trim()) {
      onSave(title.trim());
      onClose();
    }
  };

  const handleUseAuto = () => {
    setTitle(autoTitle);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal save-meal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💾 Save Meal</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="save-meal-content">
            <div className="meal-preview">
              <h4>Ingredients ({ingredients?.length || 0}):</h4>
              <div className="ingredients-list">
                {ingredients?.map((item, i) => (
                  <div key={i} className="ingredient-preview">
                    <span className="ingredient-name">{item.food}</span>
                    <span className="ingredient-amount">{item.amount}{item.unit || 'g'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="meal-title-input">
              <label>Meal Title:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter meal name..."
                autoFocus
              />
              {autoTitle && title !== autoTitle && (
                <button
                  className="btn-use-auto"
                  onClick={handleUseAuto}
                  type="button"
                >
                  Use auto: "{autoTitle}"
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-confirm"
            onClick={handleSave}
            disabled={!title.trim()}
          >
            Save Meal
          </button>
        </div>
      </div>
    </div>
  );
}

export default SaveMealModal;
