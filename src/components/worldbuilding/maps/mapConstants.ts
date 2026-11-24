import React from 'react';
import {
  Castle,
  Building2,
  Home,
  Beer,
  ShoppingBag,
  Anchor,
  Sparkles,
  DoorOpen,
  Skull,
  Landmark,
  Tent,
  Orbit,
  Compass,
  Users,
  Lock,
} from 'lucide-react';
import type {
  CampaignMap,
  MapCanvasTheme,
  MapDrawingShape,
  MapLayer,
  MapPinIcon,
} from '../../../types/campaign';

export const DEFAULT_STAGE_W = 1600;
export const DEFAULT_STAGE_H = 1000;
export const MIN_ZOOM = 0.18;
export const MAX_ZOOM = 6.5;

export const LAYER_CONFIG: Record<
  MapLayer,
  { label: string; shortLabel: string; color: string }
> = {
  locations: { label: 'Locais e assentamentos', shortLabel: 'Locais', color: '#22a06b' },
  dangers: { label: 'Perigos e masmorras', shortLabel: 'Perigos', color: '#e5484d' },
  quests: { label: 'Ganchos e missões', shortLabel: 'Missões', color: '#d99a1c' },
  secrets: { label: 'Segredos do mestre', shortLabel: 'Segredos', color: '#8e6bd8' },
};

export const PIN_ICON_META: Record<
  MapPinIcon,
  {
    label: string;
    defaultLayer: MapLayer;
    icon: React.FC<{ className?: string }>;
  }
> = {
  castle: { label: 'Castelo / Forte', defaultLayer: 'locations', icon: Castle },
  city: { label: 'Cidade / Capital', defaultLayer: 'locations', icon: Building2 },
  village: { label: 'Vila / Povoado', defaultLayer: 'locations', icon: Home },
  tavern: { label: 'Taverna / Estalagem', defaultLayer: 'locations', icon: Beer },
  shop: { label: 'Mercado / Forja', defaultLayer: 'locations', icon: ShoppingBag },
  port: { label: 'Porto / Cais', defaultLayer: 'locations', icon: Anchor },
  shrine: { label: 'Templo / Santuário', defaultLayer: 'locations', icon: Sparkles },
  dungeon: { label: 'Entrada de Masmorra', defaultLayer: 'dangers', icon: DoorOpen },
  skull: { label: 'Chefe / Ameaça Mortal', defaultLayer: 'dangers', icon: Skull },
  ruins: { label: 'Ruínas Antigas', defaultLayer: 'dangers', icon: Landmark },
  camp: { label: 'Acampamento', defaultLayer: 'locations', icon: Tent },
  portal: { label: 'Portal / Fenda Arcana', defaultLayer: 'secrets', icon: Orbit },
  quest: { label: 'Gancho de Missão', defaultLayer: 'quests', icon: Compass },
  party: { label: 'Posição do Grupo', defaultLayer: 'quests', icon: Users },
  secret: { label: 'Segredo / Armadilha', defaultLayer: 'secrets', icon: Lock },
};

export const CANVAS_THEMES: Record<
  MapCanvasTheme,
  {
    label: string;
    viewportBg: string;
    stageBg: string;
    gridStroke: string;
    dotFill: string;
    textDefault: string;
    borderColor: string;
  }
> = {
  obsidian: {
    label: 'Obsidian (Escuro)',
    viewportBg: '#0b0c0f',
    stageBg: '#14161b',
    gridStroke: 'rgba(255,255,255,0.10)',
    dotFill: 'rgba(255,255,255,0.22)',
    textDefault: '#f4f4f5',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  parchment: {
    label: 'Pergaminho Cartográfico',
    viewportBg: '#231d16',
    stageBg: '#ecdec2',
    gridStroke: 'rgba(84,58,30,0.18)',
    dotFill: 'rgba(84,58,30,0.32)',
    textDefault: '#2c1e10',
    borderColor: 'rgba(84,58,30,0.35)',
  },
  paper: {
    label: 'Quadro Branco (Miro)',
    viewportBg: '#e4e7ec',
    stageBg: '#f9fafb',
    gridStroke: 'rgba(15,23,42,0.09)',
    dotFill: 'rgba(15,23,42,0.22)',
    textDefault: '#18181b',
    borderColor: 'rgba(15,23,42,0.14)',
  },
  blueprint: {
    label: 'Planta Arcana / Blueprint',
    viewportBg: '#071320',
    stageBg: '#0d2137',
    gridStroke: 'rgba(125,211,252,0.16)',
    dotFill: 'rgba(125,211,252,0.32)',
    textDefault: '#e0f2fe',
    borderColor: 'rgba(125,211,252,0.25)',
  },
};

export const STROKE_PALETTE = [
  { label: 'Tinta Escura', hex: '#1e1b18' },
  { label: 'Giz Branco', hex: '#f4f4f5' },
  { label: 'Ocre / Ouro', hex: '#d4a853' },
  { label: 'Sépia', hex: '#854d0e' },
  { label: 'Carmesim', hex: '#e11d48' },
  { label: 'Laranja Brasa', hex: '#ea580c' },
  { label: 'Esmeralda', hex: '#10b981' },
  { label: 'Musgo', hex: '#3f6212' },
  { label: 'Rio / Safira', hex: '#0ea5e9' },
  { label: 'Azul Real', hex: '#2563eb' },
  { label: 'Ametista', hex: '#9333ea' },
  { label: 'Ardósia', hex: '#64748b' },
];

export const STICKY_PALETTE = [
  { label: 'Amarelo Miro', hex: '#fef08a', text: '#1c1917' },
  { label: 'Âmbar Quente', hex: '#fed7aa', text: '#1c1917' },
  { label: 'Rosa Coral', hex: '#fecdd3', text: '#1c1917' },
  { label: 'Menta', hex: '#bbf7d0', text: '#14532d' },
  { label: 'Céu', hex: '#bae6fd', text: '#0c4a6e' },
  { label: 'Lavanda', hex: '#e9d5ff', text: '#3b0764' },
  { label: 'Pergaminho', hex: '#f5e6c8', text: '#2c1e10' },
  { label: 'Obsidiana', hex: '#27272a', text: '#f4f4f5' },
];

export interface StampDefinition {
  id: string;
  label: string;
  category: 'terrain' | 'settlement' | 'hazard';
  /** SVG paths inside a 24x24 viewBox */
  paths: string[];
  filledPaths?: string[];
}

export const MAP_STAMPS: StampDefinition[] = [
  {
    id: 'mountains',
    label: 'Montanhas',
    category: 'terrain',
    paths: [
      'M2 20 L9 6 L16 20',
      'M10 20 L16 9 L22 20',
      'M6.5 11 L9 13 L11.5 11',
      'M14 12.6 L16 14 L18 12.6',
    ],
  },
  {
    id: 'hills',
    label: 'Colinas',
    category: 'terrain',
    paths: ['M2 18 Q7 10 12 18', 'M9 18 Q15.5 8 22 18', 'M5 19.5 H19'],
  },
  {
    id: 'forest',
    label: 'Floresta',
    category: 'terrain',
    paths: [
      'M8 5 C5 5 3.5 7.5 4.5 10 C3 11 3.5 14 6 14 H10 C12.5 14 13 11 11.5 10 C12.5 7.5 11 5 8 5 Z',
      'M8 14 V19',
      'M16.5 7 C14 7 13 9 13.8 11 C12.5 12 13 14.5 15 14.5 H18 C20 14.5 20.5 12 19.2 11 C20 9 19 7 16.5 7 Z',
      'M16.5 14.5 V19',
    ],
  },
  {
    id: 'pine',
    label: 'Pinheiros',
    category: 'terrain',
    paths: [
      'M8 4 L3.5 11 H6 L3 16 H13 L10 11 H12.5 Z',
      'M8 16 V20',
      'M17 7 L13.5 12.5 H15.5 L13 17 H21 L18.5 12.5 H20.5 Z',
      'M17 17 V20',
    ],
  },
  {
    id: 'swamp',
    label: 'Pântano',
    category: 'terrain',
    paths: [
      'M3 17 H21',
      'M6 20 H18',
      'M7 17 L5.5 12',
      'M9 17 V11',
      'M11 17 L12.5 12',
      'M16 17 V12.5',
      'M18 17 L19.5 13',
    ],
  },
  {
    id: 'compass',
    label: 'Rosa dos Ventos',
    category: 'terrain',
    paths: [
      'M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z',
      'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6',
    ],
  },
  {
    id: 'castle',
    label: 'Castelo',
    category: 'settlement',
    paths: [
      'M4 20 V8 H7 V10 H10 V8 H14 V10 H17 V8 H20 V20 Z',
      'M10 20 V15 A2 2 0 0 1 14 15 V20',
      'M4 8 V5 H6 V7 M18 8 V5 H20 V7',
    ],
  },
  {
    id: 'tower',
    label: 'Torre',
    category: 'settlement',
    paths: [
      'M8 21 L9 8 H15 L16 21 Z',
      'M7 8 H17 V5 H15 V6.5 H13 V5 H11 V6.5 H9 V5 H7 Z',
      'M11 21 V17 H13 V21',
      'M12 11 V13',
    ],
  },
  {
    id: 'village',
    label: 'Povoado',
    category: 'settlement',
    paths: [
      'M3 14 L8 9 L13 14',
      'M4.5 13 V20 H11.5 V13',
      'M12 15 L16.5 10.5 L21 15',
      'M13.5 14 V20 H19.5 V14',
    ],
  },
  {
    id: 'ruins',
    label: 'Ruínas',
    category: 'settlement',
    paths: [
      'M3 20 H21',
      'M5 20 V7 H8 V20',
      'M11 20 V11 H14 V20',
      'M17 20 V14 L19.5 15 V20',
      'M4 7 H9',
    ],
  },
  {
    id: 'bridge',
    label: 'Ponte',
    category: 'settlement',
    paths: [
      'M2 15 Q12 7 22 15',
      'M2 18 Q12 11 22 18',
      'M6 12.5 V15.5 M12 10.5 V14.5 M18 12.5 V15.5',
    ],
  },
  {
    id: 'ship',
    label: 'Navio',
    category: 'settlement',
    paths: [
      'M3 16 L6 20 H18 L21 16 Z',
      'M12 4 V16',
      'M12 5 L19 13 H12',
      'M12 7 L7 13 H12',
    ],
  },
  {
    id: 'cave',
    label: 'Caverna / Entrada',
    category: 'hazard',
    paths: [
      'M3 20 L6 8 Q12 4 18 8 L21 20 Z',
      'M8 20 V14 A4 4 0 0 1 16 14 V20',
    ],
    filledPaths: ['M8 20 V14 A4 4 0 0 1 16 14 V20 Z'],
  },
  {
    id: 'camp',
    label: 'Acampamento',
    category: 'hazard',
    paths: ['M3 20 L12 6 L21 20 Z', 'M12 6 L9 20', 'M12 6 L15 20', 'M2 20 H22'],
  },
  {
    id: 'skull',
    label: 'Perigo Mortal',
    category: 'hazard',
    paths: [
      'M12 4 A7 7 0 0 0 5 11 C5 13.8 6.5 15.8 8 17 V20 H16 V17 C17.5 15.8 19 13.8 19 11 A7 7 0 0 0 12 4 Z',
      'M9.5 11.5 A1 1 0 1 0 9.5 11.6',
      'M14.5 11.5 A1 1 0 1 0 14.5 11.6',
      'M10 20 V18 M14 20 V18',
    ],
  },
  {
    id: 'portal',
    label: 'Portal Arcano',
    category: 'hazard',
    paths: [
      'M12 3 C17 3 20 7 20 12 C20 17 17 21 12 21 C7 21 4 17 4 12 C4 7 7 3 12 3 Z',
      'M12 7 C15 7 16.5 9.5 16.5 12 C16.5 14.5 15 17 12 17 C9 17 7.5 14.5 7.5 12 C7.5 9.5 9 7 12 7 Z',
    ],
  },
  {
    id: 'chest',
    label: 'Tesouro',
    category: 'hazard',
    paths: [
      'M4 10 H20 V19 H4 Z',
      'M4 10 Q12 5 20 10',
      'M4 13 H20',
      'M11 12 H13 V15 H11 Z',
    ],
  },
  {
    id: 'fire',
    label: 'Chamas / Batalha',
    category: 'hazard',
    paths: [
      'M12 3 C13 7 18 8.5 18 14 A6 6 0 0 1 6 14 C6 10 9 8.5 9.5 6 C10.5 7.5 12 6 12 3 Z',
      'M12 12 C13 13.5 14.5 14.5 14.5 16.5 A2.5 2.5 0 0 1 9.5 16.5 C9.5 14.5 11 13.5 12 12 Z',
    ],
  },
];

export const STAMP_MAP = new Map<string, StampDefinition>(
  MAP_STAMPS.map((s) => [s.id, s])
);

// ============================================================================
// GEOMETRY, CURVE SMOOTHING & BOUNDING BOX ENGINE
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

function perpendicularDistance(pt: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  if (dx === 0 && dy === 0) return Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y);
  const t = ((pt.x - lineStart.x) * dx + (pt.y - lineStart.y) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const projX = lineStart.x + clamped * dx;
  const projY = lineStart.y + clamped * dy;
  return Math.hypot(pt.x - projX, pt.y - projY);
}

/** Ramer-Douglas-Peucker simplification to keep freehand strokes silky & compact. */
export function simplifyPoints(points: Point[], epsilon = 0.14): Point[] {
  if (points.length <= 3) return points.map((p) => ({ x: round2(p.x), y: round2(p.y) }));
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }
  if (dmax > epsilon) {
    const left = simplifyPoints(points.slice(0, index + 1), epsilon);
    const right = simplifyPoints(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [
    { x: round2(points[0].x), y: round2(points[0].y) },
    { x: round2(points[end].x), y: round2(points[end].y) },
  ];
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Builds a smooth quadratic midpoint Bezier SVG path from points. */
export function buildSmoothSvgPath(points: Point[], closed = false): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x + 0.01} ${p.y + 0.01}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}${closed ? ' Z' : ''}`;
  }

  if (closed) {
    const firstMid = {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
    let d = `M ${round2(firstMid.x)} ${round2(firstMid.y)}`;
    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      const next = points[(i + 1) % points.length];
      const midX = round2((curr.x + next.x) / 2);
      const midY = round2((curr.y + next.y) / 2);
      d += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
    }
    d += ` Q ${points[0].x} ${points[0].y} ${round2(firstMid.x)} ${round2(firstMid.y)} Z`;
    return d;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = round2((points[i].x + points[i + 1].x) / 2);
    const midY = round2((points[i].y + points[i + 1].y) / 2);
    d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/** Computes bounding box in 0..100 stage percentage space for any shape. */
export function getShapeBounds(shape: MapDrawingShape): BoundingBox {
  const p0 = shape.points[0] || { x: 50, y: 50 };

  if (
    shape.type === 'rect' ||
    shape.type === 'fog' ||
    shape.type === 'sticky' ||
    shape.type === 'frame' ||
    shape.type === 'stamp'
  ) {
    const w = shape.width ?? (shape.type === 'stamp' ? 6 : shape.type === 'sticky' ? 14 : 18);
    const h = shape.height ?? (shape.type === 'stamp' ? 6 : shape.type === 'sticky' ? 14 : 14);
    return { x: p0.x, y: p0.y, width: w, height: h, cx: p0.x + w / 2, cy: p0.y + h / 2 };
  }

  if (shape.type === 'circle') {
    if (shape.width !== undefined && shape.height !== undefined) {
      return {
        x: p0.x,
        y: p0.y,
        width: shape.width,
        height: shape.height,
        cx: p0.x + shape.width / 2,
        cy: p0.y + shape.height / 2,
      };
    }
    const r = shape.radius ?? 8;
    return {
      x: p0.x - r,
      y: p0.y - r,
      width: r * 2,
      height: r * 2,
      cx: p0.x,
      cy: p0.y,
    };
  }

  if (shape.type === 'text') {
    const fs = shape.fontSize || 2.4;
    const textLen = Math.max(4, (shape.label || 'Texto').length);
    const w = Math.max(6, Math.min(60, textLen * fs * 0.56));
    const h = Math.max(2.6, fs * 1.45);
    const align = shape.textAlign || 'center';
    const x = align === 'left' ? p0.x : align === 'right' ? p0.x - w : p0.x - w / 2;
    const y = p0.y - h * 0.78;
    return { x, y, width: w, height: h, cx: x + w / 2, cy: y + h / 2 };
  }

  // Multi-point shapes: road, river, arrow, polygon, fog_poly, freehand, highlighter
  if (shape.points.length === 0) {
    return { x: 0, y: 0, width: 2, height: 2, cx: 1, cy: 1 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pt of shape.points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }
  const pad = Math.max(0.6, (shape.strokeWidth || 2) * 0.12);
  const w = Math.max(1.2, maxX - minX);
  const h = Math.max(1.2, maxY - minY);
  return {
    x: minX - pad / 2,
    y: minY - pad / 2,
    width: w + pad,
    height: h + pad,
    cx: minX + w / 2,
    cy: minY + h / 2,
  };
}

export function boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}

export function pointInBounds(pt: Point, b: BoundingBox, pad = 0.8): boolean {
  return (
    pt.x >= b.x - pad &&
    pt.x <= b.x + b.width + pad &&
    pt.y >= b.y - pad &&
    pt.y <= b.y + b.height + pad
  );
}

/** Translates any shape by (dx, dy) in stage percentage coordinates. */
export function translateShape(shape: MapDrawingShape, dx: number, dy: number): MapDrawingShape {
  return {
    ...shape,
    points: shape.points.map((p) => ({
      x: round2(p.x + dx),
      y: round2(p.y + dy),
    })),
  };
}

/** Resizes any shape proportionally to fit inside `nextBounds`. */
export function resizeShapeToBounds(
  shape: MapDrawingShape,
  prevBounds: BoundingBox,
  nextBounds: BoundingBox
): MapDrawingShape {
  const safeW = Math.max(1.2, nextBounds.width);
  const safeH = Math.max(1.2, nextBounds.height);

  if (
    shape.type === 'rect' ||
    shape.type === 'fog' ||
    shape.type === 'sticky' ||
    shape.type === 'frame' ||
    shape.type === 'stamp'
  ) {
    return {
      ...shape,
      points: [{ x: round2(nextBounds.x), y: round2(nextBounds.y) }],
      width: round2(safeW),
      height: round2(safeH),
    };
  }

  if (shape.type === 'circle') {
    return {
      ...shape,
      points: [{ x: round2(nextBounds.x), y: round2(nextBounds.y) }],
      width: round2(safeW),
      height: round2(safeH),
      radius: round2(Math.max(safeW, safeH) / 2),
    };
  }

  if (shape.type === 'text') {
    const scale = safeH / Math.max(1, prevBounds.height);
    const nextFs = Math.max(1.0, Math.min(14, round2((shape.fontSize || 2.4) * scale)));
    return {
      ...shape,
      fontSize: nextFs,
      points: [
        {
          x: round2(
            shape.textAlign === 'left'
              ? nextBounds.x
              : shape.textAlign === 'right'
              ? nextBounds.x + safeW
              : nextBounds.x + safeW / 2
          ),
          y: round2(nextBounds.y + safeH * 0.78),
        },
      ],
    };
  }

  // Multi-point paths & polygons: scale every vertex!
  const sx = prevBounds.width > 0.2 ? safeW / prevBounds.width : 1;
  const sy = prevBounds.height > 0.2 ? safeH / prevBounds.height : 1;
  return {
    ...shape,
    points: shape.points.map((pt) => ({
      x: round2(nextBounds.x + (pt.x - prevBounds.x) * sx),
      y: round2(nextBounds.y + (pt.y - prevBounds.y) * sy),
    })),
  };
}

export function formatPathDistance(
  points: Point[],
  map: CampaignMap | undefined,
  stageW: number,
  stageH: number
): string {
  if (points.length < 2) return '';
  let totalPct = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = ((points[i].y - points[i - 1].y) * stageH) / stageW;
    totalPct += Math.hypot(dx, dy);
  }

  const regionType = map?.regionType || 'regional';
  if (regionType === 'tactical') {
    const metersFull = map?.scalePer100Pct || 60; // default 60m (40 squares of 1.5m)
    const meters = (totalPct / 100) * metersFull;
    const squares = Math.max(1, Math.round(meters / 1.5));
    return `${meters.toFixed(1).replace('.0', '')} m (${squares} quad.)`;
  }
  if (regionType === 'city') {
    const metersFull = map?.scalePer100Pct || 1800;
    const meters = Math.round((totalPct / 100) * metersFull);
    return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters} m`;
  }
  const kmFull = map?.scalePer100Pct || 240;
  const km = Math.max(0.5, Number(((totalPct / 100) * kmFull).toFixed(1)));
  const days = (km / 38).toFixed(1).replace('.0', '');
  return `${km} km (~${days}d a pé)`;
}
