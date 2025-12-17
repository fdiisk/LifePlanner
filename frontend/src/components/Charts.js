import React from 'react';
import './Charts.css';

export const BarChart = ({ data, maxValue, height = 200, color = 'var(--accent-primary)' }) => {
  if (!data || data.length === 0) return null;

  const max = maxValue || Math.max(...data.map(d => d.value));

  return (
    <div className="chart-container" style={{ height }}>
      <div className="chart-bars">
        {data.map((item, index) => {
          const percentage = max > 0 ? (item.value / max) * 100 : 0;
          return (
            <div key={index} className="bar-wrapper">
              <div className="bar-value">{item.value}</div>
              <div className="bar" style={{
                height: `${percentage}%`,
                background: color
              }}>
                <div className="bar-tooltip">{item.label}: {item.value}</div>
              </div>
              <div className="bar-label">{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const LineChart = ({ data, height = 200, color = 'var(--accent-primary)' }) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((item.value - min) / range) * 100;
    return { x, y, ...item };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  return (
    <div className="chart-container" style={{ height }}>
      <div className="chart-labels">
        <span className="chart-label-max">{Math.round(max)}</span>
        <span className="chart-label-min">{Math.round(min)}</span>
      </div>
      <svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={color}
            vectorEffect="non-scaling-stroke"
          >
            <title>{point.label}: {point.value}</title>
          </circle>
        ))}
      </svg>
      <div className="chart-x-labels">
        {data.map((item, index) => (
          <span key={index} className="x-label">{item.label}</span>
        ))}
      </div>
    </div>
  );
};

export const ProgressRing = ({ percentage, size = 120, strokeWidth = 8, label, value }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 90) return 'var(--accent-primary)';
    if (percentage >= 70) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="progress-ring-container">
      <svg width={size} height={size} className="progress-ring">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-light)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="progress-ring-text">
        <div className="progress-ring-value">{value || `${Math.round(percentage)}%`}</div>
        {label && <div className="progress-ring-label">{label}</div>}
      </div>
    </div>
  );
};

export const TrendIndicator = ({ value, previousValue }) => {
  if (!previousValue) return null;

  const change = value - previousValue;
  const percentChange = previousValue > 0 ? (change / previousValue) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <div className={`trend-indicator ${isPositive ? 'trend-up' : 'trend-down'}`}>
      <span className="trend-arrow">{isPositive ? '↑' : '↓'}</span>
      <span className="trend-value">{Math.abs(percentChange).toFixed(1)}%</span>
    </div>
  );
};
