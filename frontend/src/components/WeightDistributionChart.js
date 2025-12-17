import React, { useState, useEffect } from 'react';

/**
 * Weight Distribution Chart Component
 * Displays a pie chart showing how sub-goals/milestones contribute to a parent goal
 */
function WeightDistributionChart({ goalId, apiUrl }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (goalId) {
      fetchDistribution();
    }
  }, [goalId]);

  const fetchDistribution = async () => {
    try {
      // Fetch contributions
      const contribResponse = await fetch(
        `${apiUrl}/unified-goals?resource=contributions&parent_goal_id=${goalId}`
      );
      const contribData = await contribResponse.json();
      const contributions = contribData.contributions || [];

      // Fetch milestones
      const milestoneResponse = await fetch(
        `${apiUrl}/unified-goals?resource=milestones&goal_id=${goalId}`
      );
      const milestoneData = await milestoneResponse.json();
      const milestones = milestoneData.milestones || [];

      // Combine into distribution data
      const distribution = [
        ...contributions.map(c => ({
          label: c.child_goal_title,
          weight: parseFloat(c.weight_percentage),
          color: '#3b82f6', // blue for goals
          type: 'goal'
        })),
        ...milestones.map(m => ({
          label: m.title,
          weight: parseFloat(m.weight_percentage),
          color: '#8b5cf6', // purple for milestones
          type: 'milestone'
        }))
      ];

      setData(distribution);
    } catch (error) {
      console.error('Error fetching weight distribution:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loading distribution...</div>;
  }

  if (data.length === 0) {
    return (
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        No contributions or milestones to display.
      </div>
    );
  }

  const totalWeight = data.reduce((sum, item) => sum + item.weight, 0);
  const radius = 60;
  const centerX = 70;
  const centerY = 70;

  // Calculate pie chart segments
  let currentAngle = -90; // Start at top
  const segments = data.map(item => {
    const percentage = (item.weight / totalWeight) * 100;
    const angle = (item.weight / totalWeight) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    // Convert to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate arc path
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const path = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    currentAngle = endAngle;

    return {
      ...item,
      path,
      percentage: percentage.toFixed(1)
    };
  });

  return (
    <div className="weight-distribution-chart">
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
        Weight Distribution
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Pie Chart */}
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          style={{ flexShrink: 0 }}
        >
          {segments.map((segment, index) => (
            <g key={index}>
              <path
                d={segment.path}
                fill={segment.color}
                stroke="#ffffff"
                strokeWidth="2"
                opacity="0.9"
              >
                <title>{segment.label}: {segment.percentage}%</title>
              </path>
            </g>
          ))}

          {/* Center circle for donut effect */}
          <circle
            cx={centerX}
            cy={centerY}
            r="25"
            fill="var(--background-primary)"
          />

          {/* Total weight text */}
          <text
            x={centerX}
            y={centerY - 5}
            textAnchor="middle"
            fontSize="16"
            fontWeight="600"
            fill="var(--text-primary)"
          >
            {totalWeight.toFixed(0)}%
          </text>
          <text
            x={centerX}
            y={centerY + 10}
            textAnchor="middle"
            fontSize="10"
            fill="var(--text-secondary)"
          >
            Total
          </text>
        </svg>

        {/* Legend */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {segments.map((segment, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px'
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  background: segment.color,
                  borderRadius: '2px',
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={segment.label}
                >
                  {segment.label}
                </div>
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                minWidth: '45px',
                textAlign: 'right'
              }}>
                {segment.percentage}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {Math.abs(totalWeight - 100) > 0.1 && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '6px',
          fontSize: '11px',
          color: '#92400e'
        }}>
          ⚠ Weights should total 100% for accurate progress calculation
        </div>
      )}
    </div>
  );
}

export default WeightDistributionChart;
