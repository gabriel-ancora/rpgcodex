import React from 'react';

interface ProgressClockSvgProps {
  segments: 4 | 6 | 8 | 12;
  filled: number;
  size?: number;
  onSelectSegment?: (newFilled: number) => void;
}

export const ProgressClockSvg: React.FC<ProgressClockSvgProps> = ({
  segments,
  filled,
  size = 100,
  onSelectSegment,
}) => {
  const center = size / 2;
  const radius = size / 2 - 5;

  const isCritical = filled >= segments - 1;
  const isTriggered = filled >= segments;

  const activeFill = isTriggered
    ? '#e11d48'
    : isCritical
    ? '#e5a93c'
    : '#d4a853';

  const renderWedges = () => {
    const wedges = [];
    const angleStep = (2 * Math.PI) / segments;

    for (let i = 0; i < segments; i++) {
      const startAngle = i * angleStep - Math.PI / 2;
      const endAngle = (i + 1) * angleStep - Math.PI / 2;

      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      const largeArcFlag = angleStep > Math.PI ? 1 : 0;
      const pathData = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ');

      const isFilled = i < filled;

      wedges.push(
        <path
          key={i}
          d={pathData}
          fill={isFilled ? activeFill : '#0e0e11'}
          fillOpacity={isFilled ? 0.85 : 1}
          stroke="#27272a"
          strokeWidth="1.25"
          onClick={() => {
            if (!onSelectSegment) return;
            const targetVal = i + 1 === filled ? i : i + 1;
            onSelectSegment(targetVal);
          }}
          className={
            onSelectSegment
              ? 'cursor-pointer hover:opacity-85 transition-opacity'
              : ''
          }
        />
      );
    }
    return wedges;
  };

  return (
    <div className="relative inline-flex items-center justify-center select-none">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {renderWedges()}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={isTriggered ? '#e11d48' : '#3f3f46'}
          strokeWidth="1.5"
        />
        <circle
          cx={center}
          cy={center}
          r={15}
          fill="#0b0b0d"
          stroke="#27272a"
          strokeWidth="1.25"
        />
        <text
          x={center}
          y={center + 3.5}
          textAnchor="middle"
          fill="#e4e4e7"
          fontSize="10"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="600"
        >
          {filled}/{segments}
        </text>
      </svg>
    </div>
  );
};
