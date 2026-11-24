import React from 'react';
import type {
  DrawingToolType,
  Entity,
  MapDrawingShape,
} from '../../../types/campaign';
import {
  BoundingBox,
  Point,
  STAMP_MAP,
  buildSmoothSvgPath,
  getShapeBounds,
} from './mapConstants';

export type ResizeHandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface CanvasVectorStageProps {
  shapes: MapDrawingShape[];
  selectedShapeIds: string[];
  activeTool: DrawingToolType;
  viewRole: 'gm' | 'player';
  zoom: number;
  entitiesMap: Map<string, Entity>;
  drawingPoints: Point[];
  liveCursorPoint: Point | null;
  dragDraftShape: MapDrawingShape | null;
  marqueeBox: BoundingBox | null;
  rulerPoints: Point[];
  rulerDistanceLabel: string;
  activeStrokeColor: string;
  activeFillColor: string;
  activeStrokeWidth: number;
  onShapePointerDown: (e: React.PointerEvent<SVGElement>, shape: MapDrawingShape) => void;
  onShapePointerEnter: (e: React.PointerEvent<SVGElement>, shape: MapDrawingShape) => void;
  onShapeDoubleClick: (e: React.MouseEvent<SVGElement>, shape: MapDrawingShape) => void;
  onResizeHandlePointerDown: (
    e: React.PointerEvent<SVGElement>,
    handle: ResizeHandleId,
    bounds: BoundingBox
  ) => void;
  onRotateHandlePointerDown: (e: React.PointerEvent<SVGElement>, shape: MapDrawingShape, bounds: BoundingBox) => void;
  onVertexPointerDown: (e: React.PointerEvent<SVGElement>, shape: MapDrawingShape, vertexIndex: number) => void;
  onSelectEntity: (entityId: string) => void;
}

function getStrokeDasharray(shape: MapDrawingShape, unitScale = 1): string | undefined {
  const style = shape.strokeStyle || (shape.dashed ? 'dashed' : 'solid');
  if (style === 'dashed') return `${1.2 * unitScale} ${0.85 * unitScale}`;
  if (style === 'dotted') return `${0.32 * unitScale} ${0.68 * unitScale}`;
  return undefined;
}

function getFontFamilyCss(ff?: MapDrawingShape['fontFamily']): string {
  if (ff === 'serif') return 'Georgia, "Times New Roman", serif';
  if (ff === 'mono') return 'ui-monospace, SFMono-Regular, Menlo, monospace';
  return '"IBM Plex Sans", system-ui, sans-serif';
}

export const CanvasVectorStage: React.FC<CanvasVectorStageProps> = React.memo(
  ({
    shapes,
    selectedShapeIds,
    activeTool,
    viewRole,
    zoom,
    entitiesMap,
    drawingPoints,
    liveCursorPoint,
    dragDraftShape,
    marqueeBox,
    rulerPoints,
    rulerDistanceLabel,
    activeStrokeColor,
    activeFillColor,
    activeStrokeWidth,
    onShapePointerDown,
    onShapePointerEnter,
    onShapeDoubleClick,
    onResizeHandlePointerDown,
    onRotateHandlePointerDown,
    onVertexPointerDown,
    onSelectEntity,
  }) => {
    const selectedSet = React.useMemo(() => new Set(selectedShapeIds), [selectedShapeIds]);
    const isInteractiveTool =
      viewRole === 'gm' && (activeTool === 'select' || activeTool === 'eraser');

    // Separate normal shapes (sorted by zIndex, frames at bottom by default) from Fog of War (top shroud)
    const { regularShapes, fogShapes } = React.useMemo(() => {
      const reg: MapDrawingShape[] = [];
      const fog: MapDrawingShape[] = [];
      for (const s of shapes) {
        if (s.type === 'fog' || s.type === 'fog_poly') {
          fog.push(s);
        } else {
          reg.push(s);
        }
      }
      reg.sort((a, b) => {
        const za = a.zIndex ?? (a.type === 'frame' ? -10 : 0);
        const zb = b.zIndex ?? (b.type === 'frame' ? -10 : 0);
        return za - zb;
      });
      return { regularShapes: reg, fogShapes: fog };
    }, [shapes]);

    const handleSize = Math.max(0.55, Math.min(1.6, 1.05 / Math.pow(Math.max(0.35, zoom), 0.75)));

    // Combined selection bounds
    const selectionBounds = React.useMemo((): BoundingBox | null => {
      const selected = shapes.filter((s) => selectedSet.has(s.id));
      if (selected.length === 0) return null;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const s of selected) {
        const b = getShapeBounds(s);
        if (b.x < minX) minX = b.x;
        if (b.y < minY) minY = b.y;
        if (b.x + b.width > maxX) maxX = b.x + b.width;
        if (b.y + b.height > maxY) maxY = b.y + b.height;
      }
      const w = maxX - minX;
      const h = maxY - minY;
      return { x: minX, y: minY, width: w, height: h, cx: minX + w / 2, cy: minY + h / 2 };
    }, [shapes, selectedSet]);

    const singleSelectedShape = React.useMemo(() => {
      if (selectedShapeIds.length !== 1) return null;
      return shapes.find((s) => s.id === selectedShapeIds[0]) || null;
    }, [shapes, selectedShapeIds]);

    const renderSingleShape = (shape: MapDrawingShape) => {
      const linkedEntity = shape.entityId ? entitiesMap.get(shape.entityId) : undefined;
      const displayLabel = linkedEntity
        ? `${shape.label} (${linkedEntity.mentionPrefix}${linkedEntity.handle})`
        : shape.label;

      // Locked shapes only intercept clicks if Alt is held or Eraser is active, just like Miro!
      const canHit =
        isInteractiveTool &&
        (!shape.locked || activeTool === 'eraser');

      const commonEvents = canHit
        ? {
            onPointerDown: (e: React.PointerEvent<SVGElement>) => onShapePointerDown(e, shape),
            onPointerEnter: (e: React.PointerEvent<SVGElement>) => onShapePointerEnter(e, shape),
            onDoubleClick: (e: React.MouseEvent<SVGElement>) => onShapeDoubleClick(e, shape),
          }
        : undefined;

      const pointerClass = canHit
        ? activeTool === 'eraser'
          ? 'pointer-events-auto cursor-cell'
          : 'pointer-events-auto cursor-move'
        : 'pointer-events-none';

      const secretBadge =
        viewRole === 'gm' && shape.isSecret && !shape.isRevealed && shape.type !== 'fog' && shape.type !== 'fog_poly';

      const bounds = getShapeBounds(shape);
      const rotationTransform = shape.rotation
        ? `rotate(${shape.rotation} ${bounds.cx} ${bounds.cy})`
        : undefined;

      // 1. FREEHAND & HIGHLIGHTER
      if ((shape.type === 'freehand' || shape.type === 'highlighter') && shape.points.length >= 1) {
        const isHi = shape.type === 'highlighter';
        const d = buildSmoothSvgPath(shape.points, Boolean(shape.closed));
        const sw = (shape.strokeWidth || (isHi ? 10 : 3)) * (isHi ? 0.34 : 0.16);
        return (
          <g key={shape.id} className={pointerClass} {...commonEvents} opacity={secretBadge ? 0.65 : 1}>
            {/* Invisible fat hit target for easy selection */}
            <path d={d} fill="none" stroke="transparent" strokeWidth={Math.max(1.6, sw + 0.9)} strokeLinecap="round" strokeLinejoin="round" />
            <path
              d={d}
              fill={shape.closed && shape.fillColor ? shape.fillColor : 'none'}
              fillOpacity={shape.opacity ?? (isHi ? 0.36 : 0.2)}
              stroke={shape.color}
              strokeOpacity={isHi ? shape.opacity ?? 0.38 : shape.opacity ?? 0.95}
              strokeWidth={sw}
              strokeDasharray={isHi ? undefined : getStrokeDasharray(shape, Math.max(0.8, sw * 1.4))}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      }

      // 2. ROAD, RIVER, ARROW / CONNECTOR
      if (
        (shape.type === 'road' || shape.type === 'river' || shape.type === 'arrow') &&
        shape.points.length >= 2
      ) {
        const isRiver = shape.type === 'river';
        const isArrow = shape.type === 'arrow';
        const useSmooth = isRiver || Boolean(shape.curved);
        const pathD = useSmooth
          ? buildSmoothSvgPath(shape.points, false)
          : `M ${shape.points.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
        const sw = (shape.strokeWidth || 3) * (isRiver ? 0.25 : 0.18);
        const mid = shape.points[Math.floor(shape.points.length / 2)];
        const markerEndId = isArrow && (shape.arrowEnd ?? true) ? `arrow-end-${shape.id}` : undefined;
        const markerStartId = isArrow && shape.arrowStart ? `arrow-start-${shape.id}` : undefined;

        return (
          <g key={shape.id} className={pointerClass} {...commonEvents} opacity={secretBadge ? 0.65 : 1}>
            {isArrow && (
              <defs>
                <marker
                  id={`arrow-end-${shape.id}`}
                  viewBox="0 0 10 10"
                  refX="8.5"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={shape.color} />
                </marker>
                <marker
                  id={`arrow-start-${shape.id}`}
                  viewBox="0 0 10 10"
                  refX="8.5"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={shape.color} />
                </marker>
              </defs>
            )}
            <path d={pathD} fill="none" stroke="transparent" strokeWidth={Math.max(1.8, sw + 1)} />
            {isRiver && (
              <path
                d={pathD}
                fill="none"
                stroke={shape.color}
                strokeOpacity={0.26}
                strokeWidth={sw * 1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <path
              d={pathD}
              fill="none"
              stroke={shape.color}
              strokeOpacity={shape.opacity ?? 0.95}
              strokeWidth={sw}
              strokeDasharray={isRiver ? undefined : getStrokeDasharray(shape, Math.max(0.8, sw * 1.4))}
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={markerEndId ? `url(#${markerEndId})` : undefined}
              markerStart={markerStartId ? `url(#${markerStartId})` : undefined}
            />
            {mid && displayLabel && (
              <text
                x={mid.x}
                y={mid.y - 1.1}
                textAnchor="middle"
                fill={shape.color}
                fontSize={shape.fontSize || 1.55}
                fontFamily={getFontFamilyCss(shape.fontFamily)}
                fontWeight={shape.fontWeight || 'bold'}
                fontStyle={shape.fontStyle || 'normal'}
                stroke="rgba(0,0,0,0.72)"
                strokeWidth="0.26"
                paintOrder="stroke"
              >
                {displayLabel}
              </text>
            )}
          </g>
        );
      }

      // 3. POLYGON / TERRITORY
      if (shape.type === 'polygon' && shape.points.length >= 3) {
        const pathD = shape.curved
          ? buildSmoothSvgPath(shape.points, true)
          : `M ${shape.points.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;
        const cx = shape.points.reduce((a, p) => a + p.x, 0) / shape.points.length;
        const cy = shape.points.reduce((a, p) => a + p.y, 0) / shape.points.length;
        const sw = (shape.strokeWidth || 2) * 0.14;
        return (
          <g key={shape.id} className={pointerClass} {...commonEvents} opacity={secretBadge ? 0.65 : 1}>
            <path
              d={pathD}
              fill={shape.fillColor || shape.color}
              fillOpacity={shape.opacity ?? 0.2}
              stroke={shape.color}
              strokeWidth={sw}
              strokeDasharray={getStrokeDasharray(shape, Math.max(0.8, sw * 1.4))}
              strokeLinejoin="round"
            />
            {displayLabel && (
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fill={shape.color}
                fontSize={shape.fontSize || 1.8}
                fontFamily={getFontFamilyCss(shape.fontFamily)}
                fontWeight={shape.fontWeight || 'bold'}
                fontStyle={shape.fontStyle || 'normal'}
                stroke="rgba(0,0,0,0.68)"
                strokeWidth="0.26"
                paintOrder="stroke"
                onClick={(e) => {
                  if (linkedEntity && activeTool === 'select' && viewRole === 'player') {
                    e.stopPropagation();
                    onSelectEntity(linkedEntity.id);
                  }
                }}
              >
                {displayLabel}
              </text>
            )}
          </g>
        );
      }

      // 4. CIRCLE / ELLIPSE
      if (shape.type === 'circle' && shape.points[0]) {
        const sw = (shape.strokeWidth || 2) * 0.14;
        const rx = bounds.width / 2;
        const ry = bounds.height / 2;
        return (
          <g
            key={shape.id}
            transform={rotationTransform}
            className={pointerClass}
            {...commonEvents}
            opacity={secretBadge ? 0.65 : 1}
          >
            <ellipse
              cx={bounds.cx}
              cy={bounds.cy}
              rx={rx}
              ry={ry}
              fill={shape.fillColor || shape.color}
              fillOpacity={shape.opacity ?? 0.18}
              stroke={shape.color}
              strokeWidth={sw}
              strokeDasharray={getStrokeDasharray(shape, Math.max(0.8, sw * 1.4))}
            />
            {displayLabel && (
              <text
                x={bounds.cx}
                y={bounds.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fill={shape.color}
                fontSize={shape.fontSize || 1.7}
                fontFamily={getFontFamilyCss(shape.fontFamily)}
                fontWeight={shape.fontWeight || 'bold'}
                fontStyle={shape.fontStyle || 'normal'}
                stroke="rgba(0,0,0,0.65)"
                strokeWidth="0.24"
                paintOrder="stroke"
              >
                {displayLabel}
              </text>
            )}
          </g>
        );
      }

      // 5. RECTANGLE & MIRO FRAME
      if ((shape.type === 'rect' || shape.type === 'frame') && shape.points[0]) {
        const isFrame = shape.type === 'frame';
        const sw = isFrame ? 0.24 : (shape.strokeWidth || 2) * 0.14;
        return (
          <g
            key={shape.id}
            transform={rotationTransform}
            className={pointerClass}
            {...commonEvents}
            opacity={secretBadge ? 0.65 : 1}
          >
            {isFrame && displayLabel && (
              <g>
                <rect
                  x={bounds.x}
                  y={bounds.y - 2.3}
                  width={Math.min(bounds.width, Math.max(8, displayLabel.length * 0.95 + 2))}
                  height={2.1}
                  rx={0.4}
                  fill={shape.color}
                  fillOpacity={0.9}
                />
                <text
                  x={bounds.x + 0.8}
                  y={bounds.y - 0.85}
                  fill="#ffffff"
                  fontSize={1.35}
                  fontFamily={getFontFamilyCss('sans')}
                  fontWeight="bold"
                >
                  {displayLabel}
                </text>
              </g>
            )}
            <rect
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              rx={isFrame ? 0.5 : 0.35}
              fill={shape.fillColor || shape.color}
              fillOpacity={shape.opacity ?? (isFrame ? 0.05 : 0.18)}
              stroke={shape.color}
              strokeWidth={sw}
              strokeDasharray={isFrame ? '0.9 0.6' : getStrokeDasharray(shape, Math.max(0.8, sw * 1.4))}
            />
            {!isFrame && displayLabel && (
              <text
                x={bounds.cx}
                y={bounds.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fill={shape.color}
                fontSize={shape.fontSize || 1.7}
                fontFamily={getFontFamilyCss(shape.fontFamily)}
                fontWeight={shape.fontWeight || 'bold'}
                fontStyle={shape.fontStyle || 'normal'}
                stroke="rgba(0,0,0,0.65)"
                strokeWidth="0.24"
                paintOrder="stroke"
              >
                {displayLabel}
              </text>
            )}
          </g>
        );
      }

      // 6. MIRO STICKY NOTE
      if (shape.type === 'sticky' && shape.points[0]) {
        const bg = shape.fillColor || shape.color || '#fef08a';
        const isDarkSticky = bg === '#27272a' || bg === '#18181b' || bg === '#1e1b18';
        const fg = isDarkSticky ? '#f4f4f5' : '#1c1917';
        const fs = shape.fontSize || 1.55;
        return (
          <g
            key={shape.id}
            transform={rotationTransform}
            className={pointerClass}
            {...commonEvents}
            opacity={secretBadge ? 0.72 : 1}
          >
            {/* Subtle drop shadow */}
            <rect
              x={bounds.x + 0.25}
              y={bounds.y + 0.35}
              width={bounds.width}
              height={bounds.height}
              rx={0.45}
              fill="rgba(0,0,0,0.28)"
            />
            <rect
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              rx={0.45}
              fill={bg}
              fillOpacity={shape.opacity ?? 0.97}
              stroke="rgba(0,0,0,0.14)"
              strokeWidth={0.14}
            />
            {/* Corner fold accent */}
            <polygon
              points={`${bounds.x + bounds.width - 1.6},${bounds.y + bounds.height} ${bounds.x + bounds.width},${bounds.y + bounds.height - 1.6} ${bounds.x + bounds.width},${bounds.y + bounds.height}`}
              fill="rgba(0,0,0,0.12)"
            />
            <foreignObject
              x={bounds.x + 0.7}
              y={bounds.y + 0.7}
              width={Math.max(1, bounds.width - 1.4)}
              height={Math.max(1, bounds.height - 1.4)}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  color: fg,
                  fontSize: `${fs}px`,
                  lineHeight: 1.28,
                  fontFamily: getFontFamilyCss(shape.fontFamily),
                  fontWeight: shape.fontWeight === 'bold' ? 700 : 500,
                  fontStyle: shape.fontStyle || 'normal',
                  textAlign: shape.textAlign || 'left',
                  overflow: 'hidden',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                }}
              >
                {displayLabel || ' Duplo clique para escrever…'}
              </div>
            </foreignObject>
          </g>
        );
      }

      // 7. CARTOGRAPHY TERRAIN STAMP
      if (shape.type === 'stamp' && shape.points[0]) {
        const stamp = STAMP_MAP.get(shape.stampType || 'mountains') || STAMP_MAP.get('mountains')!;
        return (
          <g
            key={shape.id}
            transform={rotationTransform}
            className={pointerClass}
            {...commonEvents}
            opacity={secretBadge ? 0.65 : shape.opacity ?? 0.95}
          >
            <rect
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              fill="transparent"
            />
            <svg
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              viewBox="0 0 24 24"
              preserveAspectRatio="xMidYMid meet"
            >
              {stamp.filledPaths?.map((fp, i) => (
                <path key={`f-${i}`} d={fp} fill={shape.fillColor || 'rgba(0,0,0,0.45)'} />
              ))}
              {stamp.paths.map((p, i) => (
                <path
                  key={i}
                  d={p}
                  fill={shape.fillColor ? shape.fillColor : 'none'}
                  fillOpacity={shape.fillColor ? 0.25 : 0}
                  stroke={shape.color}
                  strokeWidth={Math.max(1.1, Math.min(3.2, (shape.strokeWidth || 2) * 0.7))}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>
            {shape.label && (
              <text
                x={bounds.cx}
                y={bounds.y + bounds.height + 1.25}
                textAnchor="middle"
                fill={shape.color}
                fontSize={shape.fontSize || 1.35}
                fontFamily={getFontFamilyCss(shape.fontFamily || 'serif')}
                fontWeight={shape.fontWeight || 'bold'}
                fontStyle={shape.fontStyle || 'normal'}
                stroke="rgba(0,0,0,0.68)"
                strokeWidth="0.22"
                paintOrder="stroke"
              >
                {displayLabel}
              </text>
            )}
          </g>
        );
      }

      // 8. TEXT / REGION LABEL
      if (shape.type === 'text' && shape.points[0]) {
        const p = shape.points[0];
        const fs = shape.fontSize || 2.4;
        const anchor =
          shape.textAlign === 'left' ? 'start' : shape.textAlign === 'right' ? 'end' : 'middle';
        return (
          <g
            key={shape.id}
            transform={rotationTransform}
            className={pointerClass}
            {...commonEvents}
            opacity={secretBadge ? 0.65 : shape.opacity ?? 1}
          >
            {shape.fillColor && (
              <rect
                x={bounds.x - 0.5}
                y={bounds.y - 0.2}
                width={bounds.width + 1}
                height={bounds.height + 0.4}
                rx={0.4}
                fill={shape.fillColor}
                fillOpacity={0.85}
              />
            )}
            <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="transparent" />
            <text
              x={p.x}
              y={p.y}
              textAnchor={anchor}
              fill={shape.color || '#f4f4f5'}
              fontSize={fs}
              fontFamily={getFontFamilyCss(shape.fontFamily)}
              fontWeight={shape.fontWeight || 'bold'}
              fontStyle={shape.fontStyle || 'normal'}
              stroke={shape.fillColor ? 'none' : 'rgba(0,0,0,0.7)'}
              strokeWidth={fs * 0.085}
              paintOrder="stroke"
            >
              {displayLabel}
            </text>
          </g>
        );
      }

      return null;
    };

    const renderFogShape = (shape: MapDrawingShape) => {
      if (shape.isRevealed && viewRole === 'player') return null;
      const canHit =
        isInteractiveTool && (!shape.locked || activeTool === 'eraser');
      const commonEvents = canHit
        ? {
            onPointerDown: (e: React.PointerEvent<SVGElement>) => onShapePointerDown(e, shape),
            onPointerEnter: (e: React.PointerEvent<SVGElement>) => onShapePointerEnter(e, shape),
            onDoubleClick: (e: React.MouseEvent<SVGElement>) => onShapeDoubleClick(e, shape),
          }
        : undefined;
      const pointerClass = canHit
        ? activeTool === 'eraser'
          ? 'pointer-events-auto cursor-cell'
          : 'pointer-events-auto cursor-move'
        : 'pointer-events-none';

      const fillOp = viewRole === 'player' ? 0.985 : shape.isRevealed ? 0.16 : 0.66;

      if (shape.type === 'fog_poly' && shape.points.length >= 3) {
        const pts = shape.points.map((p) => `${p.x},${p.y}`).join(' ');
        const cx = shape.points.reduce((a, p) => a + p.x, 0) / shape.points.length;
        const cy = shape.points.reduce((a, p) => a + p.y, 0) / shape.points.length;
        return (
          <g key={shape.id} className={pointerClass} {...commonEvents}>
            <polygon
              points={pts}
              fill="#070709"
              fillOpacity={fillOp}
              stroke={viewRole === 'gm' ? '#a1a1aa' : 'none'}
              strokeWidth={0.25}
              strokeDasharray="0.9 0.6"
            />
            {viewRole === 'gm' && (
              <text x={cx} y={cy} textAnchor="middle" fill="#e4e4e7" fontSize="1.45" fontWeight="600">
                {shape.label || 'Névoa'}
                {shape.isRevealed ? ' (revelada)' : ''}
              </text>
            )}
          </g>
        );
      }

      if (shape.type === 'fog' && shape.points[0]) {
        const b = getShapeBounds(shape);
        return (
          <g key={shape.id} className={pointerClass} {...commonEvents}>
            <rect
              x={b.x}
              y={b.y}
              width={b.width}
              height={b.height}
              rx={0.5}
              fill="#070709"
              fillOpacity={fillOp}
              stroke={viewRole === 'gm' ? '#a1a1aa' : 'none'}
              strokeWidth={0.25}
              strokeDasharray="0.9 0.6"
            />
            {viewRole === 'gm' && (
              <text x={b.cx} y={b.cy} textAnchor="middle" fill="#e4e4e7" fontSize="1.45" fontWeight="600">
                {shape.label || 'Névoa de Guerra'}
                {shape.isRevealed ? ' (revelada)' : ''}
              </text>
            )}
          </g>
        );
      }
      return null;
    };

    const resizeHandles: { id: ResizeHandleId; x: number; y: number; cursor: string }[] =
      selectionBounds
        ? [
            { id: 'nw', x: selectionBounds.x, y: selectionBounds.y, cursor: 'nwse-resize' },
            { id: 'n', x: selectionBounds.cx, y: selectionBounds.y, cursor: 'ns-resize' },
            { id: 'ne', x: selectionBounds.x + selectionBounds.width, y: selectionBounds.y, cursor: 'nesw-resize' },
            { id: 'e', x: selectionBounds.x + selectionBounds.width, y: selectionBounds.cy, cursor: 'ew-resize' },
            { id: 'se', x: selectionBounds.x + selectionBounds.width, y: selectionBounds.y + selectionBounds.height, cursor: 'nwse-resize' },
            { id: 's', x: selectionBounds.cx, y: selectionBounds.y + selectionBounds.height, cursor: 'ns-resize' },
            { id: 'sw', x: selectionBounds.x, y: selectionBounds.y + selectionBounds.height, cursor: 'nesw-resize' },
            { id: 'w', x: selectionBounds.x, y: selectionBounds.cy, cursor: 'ew-resize' },
          ]
        : [];

    const canShowVertices =
      viewRole === 'gm' &&
      activeTool === 'select' &&
      singleSelectedShape &&
      !singleSelectedShape.locked &&
      (singleSelectedShape.type === 'polygon' ||
        singleSelectedShape.type === 'fog_poly' ||
        singleSelectedShape.type === 'road' ||
        singleSelectedShape.type === 'river' ||
        singleSelectedShape.type === 'arrow');

    const canRotateSingle =
      viewRole === 'gm' &&
      activeTool === 'select' &&
      singleSelectedShape &&
      !singleSelectedShape.locked &&
      (singleSelectedShape.type === 'rect' ||
        singleSelectedShape.type === 'circle' ||
        singleSelectedShape.type === 'sticky' ||
        singleSelectedShape.type === 'stamp' ||
        singleSelectedShape.type === 'text');

    return (
      <>
        {/* Layer 1: Regular Vector Drawings, Sticky Notes, Stamps & Frames (below Pins) */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
        >
          {regularShapes.map(renderSingleShape)}
          {dragDraftShape &&
            dragDraftShape.type !== 'fog' &&
            renderSingleShape(dragDraftShape)}

          {/* Active Multi-Point / Freehand Live Preview */}
          {drawingPoints.length > 0 && (
            <g className="pointer-events-none">
              {activeTool === 'freehand' || activeTool === 'highlighter' ? (
                <path
                  d={buildSmoothSvgPath(drawingPoints, false)}
                  fill="none"
                  stroke={activeStrokeColor}
                  strokeOpacity={activeTool === 'highlighter' ? 0.38 : 0.92}
                  strokeWidth={
                    activeTool === 'highlighter'
                      ? Math.max(1.2, activeStrokeWidth * 0.34)
                      : Math.max(0.2, activeStrokeWidth * 0.16)
                  }
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <>
                  <polyline
                    points={[...drawingPoints, ...(liveCursorPoint ? [liveCursorPoint] : [])]
                      .map((p) => `${p.x},${p.y}`)
                      .join(' ')}
                    fill={
                      activeTool === 'polygon' || activeTool === 'fog_poly'
                        ? activeTool === 'fog_poly'
                          ? '#09090b'
                          : activeFillColor || activeStrokeColor
                        : 'none'
                    }
                    fillOpacity={activeTool === 'polygon' || activeTool === 'fog_poly' ? 0.22 : 0}
                    stroke={activeTool === 'fog_poly' ? '#a1a1aa' : activeStrokeColor}
                    strokeWidth="0.35"
                    strokeDasharray="0.9 0.6"
                  />
                  {drawingPoints.map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r={idx === 0 ? handleSize * 0.75 : handleSize * 0.55}
                      fill={idx === 0 ? '#ffffff' : activeStrokeColor}
                      stroke="#18181b"
                      strokeWidth="0.18"
                    />
                  ))}
                </>
              )}
            </g>
          )}
        </svg>

        {/* Layer 2: Fog of War & UI Overlays (Ruler, Selection Handles, Marquee) on top */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none z-[25] overflow-visible"
        >
          {fogShapes.map(renderFogShape)}
          {dragDraftShape && dragDraftShape.type === 'fog' && renderFogShape(dragDraftShape)}

          {/* Selection Bounding Box + 8 Resize Handles + Rotation + Vertex Handles */}
          {viewRole === 'gm' && activeTool === 'select' && selectionBounds && (
            <g>
              <rect
                x={selectionBounds.x}
                y={selectionBounds.y}
                width={selectionBounds.width}
                height={selectionBounds.height}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={Math.max(0.14, 0.22 / Math.sqrt(Math.max(0.4, zoom)))}
                strokeDasharray={
                  singleSelectedShape?.locked ? '0.6 0.4' : undefined
                }
              />

              {/* Rotation Handle */}
              {canRotateSingle && singleSelectedShape && (
                <g>
                  <line
                    x1={selectionBounds.cx}
                    y1={selectionBounds.y}
                    x2={selectionBounds.cx}
                    y2={selectionBounds.y - handleSize * 2.2}
                    stroke="#3b82f6"
                    strokeWidth={0.18}
                  />
                  <circle
                    cx={selectionBounds.cx}
                    cy={selectionBounds.y - handleSize * 2.2}
                    r={handleSize * 0.62}
                    fill="#ffffff"
                    stroke="#3b82f6"
                    strokeWidth={0.22}
                    className="pointer-events-auto cursor-grab active:cursor-grabbing"
                    onPointerDown={(e) =>
                      onRotateHandlePointerDown(e, singleSelectedShape, selectionBounds)
                    }
                  />
                </g>
              )}

              {/* 8 Resize Handles */}
              {!singleSelectedShape?.locked &&
                resizeHandles.map((h) => (
                  <rect
                    key={h.id}
                    x={h.x - handleSize / 2}
                    y={h.y - handleSize / 2}
                    width={handleSize}
                    height={handleSize}
                    rx={handleSize * 0.18}
                    fill="#ffffff"
                    stroke="#3b82f6"
                    strokeWidth={Math.max(0.14, handleSize * 0.2)}
                    style={{ cursor: h.cursor }}
                    className="pointer-events-auto"
                    onPointerDown={(e) =>
                      onResizeHandlePointerDown(e, h.id, selectionBounds)
                    }
                  />
                ))}

              {/* Individual Vertex Handles for Polygons / Paths */}
              {canShowVertices &&
                singleSelectedShape.points.map((pt, idx) => (
                  <circle
                    key={`v-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={handleSize * 0.52}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={Math.max(0.12, handleSize * 0.18)}
                    className="pointer-events-auto cursor-crosshair"
                    onPointerDown={(e) =>
                      onVertexPointerDown(e, singleSelectedShape, idx)
                    }
                  />
                ))}
            </g>
          )}

          {/* Miro Marquee Selection Box */}
          {marqueeBox && (
            <rect
              x={marqueeBox.x}
              y={marqueeBox.y}
              width={marqueeBox.width}
              height={marqueeBox.height}
              fill="rgba(59, 130, 246, 0.12)"
              stroke="#3b82f6"
              strokeWidth={0.2}
            />
          )}

          {/* Multi-Waypoint Ruler Overlay */}
          {rulerPoints.length >= 1 && (
            <g className="pointer-events-none">
              {rulerPoints.length >= 2 && (
                <>
                  <polyline
                    points={rulerPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="rgba(0,0,0,0.65)"
                    strokeWidth="0.65"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={rulerPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="0.34"
                    strokeDasharray="0.85 0.55"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}
              {rulerPoints.length === 1 && liveCursorPoint && (
                <line
                  x1={rulerPoints[0].x}
                  y1={rulerPoints[0].y}
                  x2={liveCursorPoint.x}
                  y2={liveCursorPoint.y}
                  stroke="#38bdf8"
                  strokeWidth="0.3"
                  strokeDasharray="0.8 0.5"
                />
              )}
              {rulerPoints.map((rp, i) => (
                <circle
                  key={i}
                  cx={rp.x}
                  cy={rp.y}
                  r={handleSize * 0.6}
                  fill={i === 0 ? '#38bdf8' : '#ffffff'}
                  stroke="#09090b"
                  strokeWidth="0.2"
                />
              ))}
              {rulerPoints.length >= 2 && rulerDistanceLabel && (
                <g>
                  <rect
                    x={rulerPoints[rulerPoints.length - 1].x - 10.5}
                    y={rulerPoints[rulerPoints.length - 1].y - 4.2}
                    width="21"
                    height="3.1"
                    rx="0.6"
                    fill="#09090b"
                    fillOpacity="0.92"
                    stroke="#38bdf8"
                    strokeWidth="0.18"
                  />
                  <text
                    x={rulerPoints[rulerPoints.length - 1].x}
                    y={rulerPoints[rulerPoints.length - 1].y - 2.15}
                    textAnchor="middle"
                    fill="#f4f4f5"
                    fontSize="1.42"
                    fontFamily="IBM Plex Sans, sans-serif"
                    fontWeight="700"
                  >
                    {rulerDistanceLabel}
                  </text>
                </g>
              )}
            </g>
          )}
        </svg>
      </>
    );
  }
);
