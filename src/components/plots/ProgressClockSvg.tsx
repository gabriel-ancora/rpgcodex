import React from 'react';
import type { ClockVisualStyle } from '../../types/campaign';

interface ProgressClockSvgProps {
  segments: number;
  filled: number;
  size?: number;
  color?: string;
  style?: ClockVisualStyle | string;
  onSelectSegment?: (newFilled: number) => void;
}

/**
 * Relógio de progresso altamente personalizável (2 a 24 segmentos,
 * cor personalizada e 3 estilos visuais: pizza, anel radial e barras táticas).
 */
export const ProgressClockSvg: React.FC<ProgressClockSvgProps> = ({
  segments: rawSegments,
  filled: rawFilled,
  size = 96,
  color,
  style = 'pie',
  onSelectSegment,
}) => {
  const segments = Math.max(2, Math.min(24, Math.floor(rawSegments || 4)));
  const filled = Math.max(0, Math.min(segments, Math.floor(rawFilled || 0)));

  const isCritical = filled >= segments - 1 && filled < segments;
  const isTriggered = filled >= segments;

  const fallbackClass = isTriggered
    ? 'text-danger'
    : isCritical
    ? 'text-warning'
    : 'text-accent';

  const handleSegmentClick = (index: number) => {
    if (!onSelectSegment) return;
    const targetVal = index + 1 === filled ? index : index + 1;
    onSelectSegment(targetVal);
  };

  if (style === 'bars') {
    const cols = segments <= 6 ? segments : segments <= 12 ? 6 : 8;
    return (
      <div className="inline-flex flex-col items-end gap-1.5 select-none min-w-[116px]">
        <div className="text-xs font-mono font-semibold tabular-nums text-fg">
          {filled}/{segments}
        </div>
        <div
          className="grid gap-1 w-full"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(12px, 1fr))` }}
        >
          {Array.from({ length: segments }).map((_, i) => {
            const isFilled = i < filled;
            return (
              <button
                key={i}
                type="button"
                disabled={!onSelectSegment}
                onClick={() => handleSegmentClick(i)}
                title={`Segmento ${i + 1} de ${segments}`}
                className={`h-5 rounded-sm border transition-all ${
                  isFilled
                    ? color
                      ? 'border-transparent'
                      : `${fallbackClass} bg-current border-transparent`
                    : 'bg-surface-2 border-line'
                } ${
                  onSelectSegment
                    ? 'cursor-pointer hover:opacity-80'
                    : 'cursor-default'
                }`}
                style={
                  isFilled && color
                    ? { backgroundColor: color, borderColor: color }
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>
    );
  }

  const center = size / 2;
  const radius = size / 2 - 4;

  if (style === 'ring') {
    const ringStroke = Math.max(7, Math.round(size * 0.11));
    const r = radius - ringStroke / 2;
    const circumference = 2 * Math.PI * r;
    const gapAngle = segments > 16 ? 2 : 4;
    const segAngle = 360 / segments;
    const arcLen = Math.max(2, ((segAngle - gapAngle) / 360) * circumference);

    return (
      <div className="relative inline-flex items-center justify-center select-none">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {Array.from({ length: segments }).map((_, i) => {
            const isFilled = i < filled;
            const rot = i * segAngle - 90 + gapAngle / 2;
            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={isFilled && color ? color : 'currentColor'}
                strokeWidth={ringStroke}
                strokeDasharray={`${arcLen} ${circumference}`}
                transform={`rotate(${rot} ${center} ${center})`}
                className={`${!isFilled ? 'text-surface-3' : !color ? fallbackClass : ''} ${
                  onSelectSegment ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
                }`}
                onClick={() => handleSegmentClick(i)}
              />
            );
          })}
          <text
            x={center}
            y={center}
            dy="0.35em"
            textAnchor="middle"
            fill="currentColor"
            fontSize={Math.max(11, Math.round(size * 0.15))}
            fontFamily="'IBM Plex Mono', ui-monospace, monospace"
            fontWeight="600"
            className="text-fg pointer-events-none"
          >
            {filled}/{segments}
          </text>
        </svg>
      </div>
    );
  }

  // Estilo 'pie' (padrão)
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
      // Para 2 segmentos (180 graus exatos), evita ambiguidade de arco SVG usando sweep=1
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
          className={`${isFilled ? (!color ? fallbackClass : '') : 'text-surface-2'} ${
            onSelectSegment ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
          }`}
          fill={isFilled && color ? color : 'currentColor'}
          onClick={() => handleSegmentClick(i)}
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
          strokeWidth={segments > 14 ? '1' : '1.5'}
        />
      );
    }
    return spokes;
  };

  const hubRadius = Math.max(13, size * 0.19);

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
          stroke={isTriggered && color ? color : 'currentColor'}
          strokeWidth="1.25"
          className={isTriggered && !color ? 'text-danger' : 'text-line-strong'}
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
