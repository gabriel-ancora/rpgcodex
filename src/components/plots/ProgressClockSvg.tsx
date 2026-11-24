import React from 'react';

interface ProgressClockSvgProps {
  segments: 4 | 6 | 8 | 12;
  filled: number;
  size?: number;
  onSelectSegment?: (newFilled: number) => void;
}

/**
 * Relógio de progresso. Usa `currentColor` + classes de token para funcionar
 * nos temas claro e escuro.
 */
export const ProgressClockSvg: React.FC<ProgressClockSvgProps> = ({
  segments,
  filled,
  size = 100,
  onSelectSegment,
}) => {
  const center = size / 2;
  const radius = size / 2 - 3;

  const isCritical = filled >= segments - 1;
  const isTriggered = filled >= segments;

  // Cor de preenchimento: neutra no progresso normal, status quando crítico/disparado.
  const fillClass = isTriggered
    ? 'text-danger'
    : isCritical
    ? 'text-warning'
    : 'text-fg-muted';

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
          className={`${isFilled ? fillClass : 'text-surface-2'} ${
            onSelectSegment ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
          }`}
          fill="currentColor"
          onClick={() => {
            if (!onSelectSegment) return;
            const targetVal = i + 1 === filled ? i : i + 1;
            onSelectSegment(targetVal);
          }}
        />
      );
    }
    return wedges;
  };

  const renderSpokes = () => {
    const spokes = [];
    const angleStep = (2 * Math.PI) / segments;
    for (let i = 0; i < segments; i++) {
      const a = i * angleStep - Math.PI / 2;
      spokes.push(
        <line
          key={i}
          x1={center}
          y1={center}
          x2={center + radius * Math.cos(a)}
          y2={center + radius * Math.sin(a)}
          stroke="currentColor"
          strokeWidth="1.5"
        />
      );
    }
    return spokes;
  };

  const hubRadius = Math.max(12, size * 0.17);

  return (
    <div className="relative inline-flex items-center justify-center select-none">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {renderWedges()}
        <g className="text-surface pointer-events-none">{renderSpokes()}</g>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className={isTriggered ? 'text-danger' : 'text-line-strong'}
        />
        <circle
          cx={center}
          cy={center}
          r={hubRadius}
          fill="currentColor"
          className="text-surface pointer-events-none"
        />
        <circle
          cx={center}
          cy={center}
          r={hubRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-line pointer-events-none"
        />
        <text
          x={center}
          y={center}
          dy="0.35em"
          textAnchor="middle"
          fill="currentColor"
          fontSize={Math.max(10, Math.round(size * 0.12))}
          fontFamily="'IBM Plex Mono', ui-monospace, monospace"
          fontWeight="600"
          className="text-fg pointer-events-none"
        >
          {filled}/{segments}
        </text>
      </svg>
    </div>
  );
};
