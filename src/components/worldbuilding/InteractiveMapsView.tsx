import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import {
  MapLayer,
  MapPin,
  MapPinIcon,
  DrawingToolType,
  MapDrawingShape,
  Entity,
} from '../../types/campaign';
import { MentionText, MentionTextarea } from '../common/MentionText';
import { uploadImageToCloudStorage } from '../../services/storageService';
import { Id } from '../../../convex/_generated/dataModel';
import {
  Map as MapIcon,
  Plus,
  Upload,
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
  Eye,
  EyeOff,
  Coins,
  Swords,
  ExternalLink,
  Trash2,
  X,
  PenTool,
  Waves,
  Type,
  CloudOff,
  Ruler,
  Hand,
  Circle as CircleIcon,
  Square,
  Hexagon,
  MousePointer,
  Check,
  Loader2,
  Cloud,
  MapPin as MapPinLucide,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Link2,
  Edit3,
  Save,
  BookPlus,
  Layers,
  CornerDownRight,
} from 'lucide-react';

const STAGE_W = 1280;
const STAGE_H = 820;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 4.5;

const LAYER_CONFIG: Record<
  MapLayer,
  { label: string; shortLabel: string; pinStyle: string; dot: string }
> = {
  locations: {
    label: 'Locais & Assentamentos',
    shortLabel: 'Locais',
    pinStyle: 'border-emerald-400/70 text-emerald-300 bg-[#121215]/95',
    dot: 'bg-emerald-400',
  },
  dangers: {
    label: 'Perigos & Masmorras',
    shortLabel: 'Perigos',
    pinStyle: 'border-rose-400/70 text-rose-300 bg-[#121215]/95',
    dot: 'bg-rose-400',
  },
  quests: {
    label: 'Ganchos & Missões',
    shortLabel: 'Missões',
    pinStyle: 'border-amber-400/70 text-amber-300 bg-[#121215]/95',
    dot: 'bg-amber-400',
  },
  secrets: {
    label: 'Segredos do Mestre',
    shortLabel: 'Segredos',
    pinStyle: 'border-violet-400/70 text-violet-300 bg-[#121215]/95',
    dot: 'bg-violet-400',
  },
};

const PIN_ICON_META: Record<
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

const SHAPE_COLORS = [
  { label: 'Latão', hex: '#d4a853' },
  { label: 'Carmesim', hex: '#e11d48' },
  { label: 'Esmeralda', hex: '#10b981' },
  { label: 'Rio / Céu', hex: '#38bdf8' },
  { label: 'Violeta', hex: '#a855f7' },
  { label: 'Marfim', hex: '#e4e4e7' },
];

const ENTITY_CATEGORY_DOT: Record<string, string> = {
  npc: 'bg-amber-400',
  faction: 'bg-violet-400',
  location: 'bg-emerald-400',
  item: 'bg-sky-400',
  monster: 'bg-rose-400',
  lore: 'bg-zinc-400',
};

// ============================================================================
// MEMOIZED VECTOR LAYER (60FPS PAN/ZOOM)
// ============================================================================
interface MapVectorLayerProps {
  shapes: MapDrawingShape[];
  drawingPoints: { x: number; y: number }[];
  activeTool: DrawingToolType;
  shapeColor: string;
  rulerPoints: { x: number; y: number }[];
  rulerDistanceLabel: string;
  viewRole: 'gm' | 'player';
  entitiesMap: Map<string, Entity>;
  onSelectEntity: (entityId: string) => void;
}

const MapVectorLayer: React.FC<MapVectorLayerProps> = React.memo(
  ({
    shapes,
    drawingPoints,
    activeTool,
    shapeColor,
    rulerPoints,
    rulerDistanceLabel,
    viewRole,
    entitiesMap,
    onSelectEntity,
  }) => {
    return (
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      >
        {shapes.map((shape) => {
          const linkedEntity = shape.entityId
            ? entitiesMap.get(shape.entityId)
            : undefined;
          const displayLabel = linkedEntity
            ? `${shape.label} (${linkedEntity.mentionPrefix}${linkedEntity.handle})`
            : shape.label;

          if (
            (shape.type === 'road' || shape.type === 'river') &&
            shape.points.length >= 2
          ) {
            const pts = shape.points.map((p) => `${p.x},${p.y}`).join(' ');
            const mid = shape.points[Math.floor(shape.points.length / 2)];
            const isRiver = shape.type === 'river';
            return (
              <g key={shape.id}>
                {isRiver && (
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={shape.color}
                    strokeOpacity={0.25}
                    strokeWidth={(shape.strokeWidth || 3) * 0.45}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                <polyline
                  points={pts}
                  fill="none"
                  stroke={shape.color}
                  strokeWidth={(shape.strokeWidth || 3) * (isRiver ? 0.24 : 0.2)}
                  strokeDasharray={
                    isRiver ? undefined : shape.dashed ? '1.3 0.9' : undefined
                  }
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {mid && shape.label && (
                  <text
                    x={mid.x}
                    y={mid.y - 1.2}
                    textAnchor="middle"
                    fill={shape.color}
                    fontSize="1.65"
                    fontWeight="600"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
                  >
                    {displayLabel}
                  </text>
                )}
              </g>
            );
          }

          if (shape.type === 'polygon' && shape.points.length >= 3) {
            const pts = shape.points.map((p) => `${p.x},${p.y}`).join(' ');
            const cx =
              shape.points.reduce((acc, p) => acc + p.x, 0) / shape.points.length;
            const cy =
              shape.points.reduce((acc, p) => acc + p.y, 0) / shape.points.length;
            return (
              <g key={shape.id}>
                <polygon
                  points={pts}
                  fill={shape.color}
                  fillOpacity={shape.opacity ?? 0.18}
                  stroke={shape.color}
                  strokeWidth={0.3}
                  strokeDasharray={shape.dashed ? '1.1 0.7' : undefined}
                />
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  fill={shape.color}
                  fontSize="1.85"
                  fontWeight="600"
                  className={linkedEntity ? 'pointer-events-auto cursor-pointer' : ''}
                  onClick={(e) => {
                    if (linkedEntity) {
                      e.stopPropagation();
                      onSelectEntity(linkedEntity.id);
                    }
                  }}
                >
                  {displayLabel}
                </text>
              </g>
            );
          }

          if (shape.type === 'circle' && shape.points[0]) {
            const center = shape.points[0];
            const r = shape.radius || 10;
            return (
              <g key={shape.id}>
                <circle
                  cx={center.x}
                  cy={center.y}
                  r={r}
                  fill={shape.color}
                  fillOpacity={shape.opacity ?? 0.16}
                  stroke={shape.color}
                  strokeWidth={0.3}
                  strokeDasharray={shape.dashed ? '1.1 0.7' : undefined}
                />
                <text
                  x={center.x}
                  y={center.y - r - 0.9}
                  textAnchor="middle"
                  fill={shape.color}
                  fontSize="1.75"
                  fontWeight="600"
                >
                  {displayLabel}
                </text>
              </g>
            );
          }

          if (shape.type === 'rect' && shape.points[0]) {
            const p = shape.points[0];
            const w = shape.width || 16;
            const h = shape.height || 12;
            return (
              <g key={shape.id}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={w}
                  height={h}
                  fill={shape.color}
                  fillOpacity={shape.opacity ?? 0.16}
                  stroke={shape.color}
                  strokeWidth={0.3}
                  strokeDasharray={shape.dashed ? '1.1 0.7' : undefined}
                />
                <text
                  x={p.x + w / 2}
                  y={p.y - 0.9}
                  textAnchor="middle"
                  fill={shape.color}
                  fontSize="1.75"
                  fontWeight="600"
                >
                  {displayLabel}
                </text>
              </g>
            );
          }

          if (shape.type === 'fog' && shape.points[0]) {
            // Fog of war: hidden when isRevealed === true for players; semi-opaque for GM
            if (shape.isRevealed && viewRole === 'player') return null;
            const p = shape.points[0];
            const w = shape.width || 22;
            const h = shape.height || 18;
            const fillOp =
              viewRole === 'player' ? 0.97 : shape.isRevealed ? 0.18 : 0.62;
            return (
              <g key={shape.id}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={w}
                  height={h}
                  rx={0.8}
                  fill="#070709"
                  fillOpacity={fillOp}
                  stroke={viewRole === 'gm' ? '#71717a' : 'none'}
                  strokeWidth={0.25}
                  strokeDasharray="0.9 0.7"
                />
                {viewRole === 'gm' && (
                  <text
                    x={p.x + w / 2}
                    y={p.y + h / 2}
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="1.6"
                    fontStyle="italic"
                  >
                    {shape.label || 'Névoa de Guerra'}
                    {shape.isRevealed ? ' (Dissipada)' : ''}
                  </text>
                )}
              </g>
            );
          }

          if (shape.type === 'text' && shape.points[0]) {
            const p = shape.points[0];
            const fs = shape.fontSize || 2.4;
            return (
              <g key={shape.id}>
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  fill={shape.color || '#e4e4e7'}
                  fontSize={fs}
                  fontFamily="Newsreader, Georgia, serif"
                  fontStyle="italic"
                  fontWeight="600"
                  letterSpacing="0.15"
                  style={{ textShadow: '0 2px 6px rgba(0,0,0,0.95)' }}
                >
                  {displayLabel}
                </text>
              </g>
            );
          }

          return null;
        })}

        {/* Active Multi-Point Preview */}
        {drawingPoints.length > 0 && (
          <g>
            <polyline
              points={drawingPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill={activeTool === 'polygon' ? shapeColor : 'none'}
              fillOpacity={activeTool === 'polygon' ? 0.16 : 0}
              stroke={shapeColor}
              strokeWidth="0.45"
              strokeDasharray="1 0.8"
            />
            {drawingPoints.map((pt, idx) => (
              <circle key={idx} cx={pt.x} cy={pt.y} r="0.65" fill={shapeColor} />
            ))}
          </g>
        )}

        {/* Ruler Distance Overlay */}
        {rulerPoints.length === 2 && (
          <g>
            <line
              x1={rulerPoints[0].x}
              y1={rulerPoints[0].y}
              x2={rulerPoints[1].x}
              y2={rulerPoints[1].y}
              stroke="#fbbf24"
              strokeWidth="0.4"
              strokeDasharray="0.9 0.6"
            />
            <circle cx={rulerPoints[0].x} cy={rulerPoints[0].y} r="0.7" fill="#fbbf24" />
            <circle cx={rulerPoints[1].x} cy={rulerPoints[1].y} r="0.7" fill="#fbbf24" />
            <rect
              x={(rulerPoints[0].x + rulerPoints[1].x) / 2 - 9}
              y={(rulerPoints[0].y + rulerPoints[1].y) / 2 - 3.6}
              width="18"
              height="3.2"
              rx="0.7"
              fill="#09090b"
              stroke="#fbbf24"
              strokeWidth="0.2"
            />
            <text
              x={(rulerPoints[0].x + rulerPoints[1].x) / 2}
              y={(rulerPoints[0].y + rulerPoints[1].y) / 2 - 1.5}
              textAnchor="middle"
              fill="#fde68a"
              fontSize="1.55"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
            >
              {rulerDistanceLabel}
            </text>
          </g>
        )}
      </svg>
    );
  }
);

// ============================================================================
// MEMOIZED PIN MARKER (COUNTER-SCALED ON ZOOM + DRAGGABLE)
// ============================================================================
interface MapPinMarkerProps {
  pin: MapPin;
  displayX: number;
  displayY: number;
  isSelected: boolean;
  counterScale: number;
  linkedCount: number;
  hasSubMap: boolean;
  canDrag: boolean;
  onSelect: (pinId: string) => void;
  onStartDrag: (e: React.PointerEvent<HTMLButtonElement>, pin: MapPin) => void;
}

const MapPinMarker: React.FC<MapPinMarkerProps> = React.memo(
  ({
    pin,
    displayX,
    displayY,
    isSelected,
    counterScale,
    linkedCount,
    hasSubMap,
    canDrag,
    onSelect,
    onStartDrag,
  }) => {
    const layerStyle = LAYER_CONFIG[pin.layer] || LAYER_CONFIG.locations;
    const iconMeta = PIN_ICON_META[pin.iconType] || PIN_ICON_META.castle;
    const IconComp = iconMeta.icon || MapPinLucide;

    return (
      <button
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect(pin.id);
          if (canDrag && e.button === 0) {
            onStartDrag(e, pin);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(pin.id);
        }}
        style={{
          left: `${displayX}%`,
          top: `${displayY}%`,
          transform: `translate(-50%, -50%) scale(${
            isSelected ? counterScale * 1.12 : counterScale
          })`,
        }}
        className={`absolute group transition-shadow ${
          isSelected ? 'z-30' : 'z-20 hover:z-30'
        } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      >
        <div className="relative mx-auto w-fit">
          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-lg backdrop-blur-md mx-auto transition-colors ${
              layerStyle.pinStyle
            } ${
              isSelected
                ? 'ring-2 ring-white/70 shadow-[0_0_18px_rgba(255,255,255,0.22)]'
                : 'group-hover:border-white/50'
            }`}
          >
            <IconComp className="w-3.5 h-3.5" />
          </div>

          {(linkedCount > 0 || hasSubMap) && (
            <span
              title={`${linkedCount} vínculo(s) na Wiki${hasSubMap ? ' + Sub-mapa' : ''}`}
              className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-zinc-100 text-zinc-950 text-[9px] font-mono font-bold flex items-center justify-center shadow"
            >
              {hasSubMap ? '↳' : linkedCount}
            </span>
          )}
        </div>

        <div
          className={`mt-1 px-2 py-0.5 rounded-md border text-[10px] font-medium whitespace-nowrap shadow-md transition-colors ${
            isSelected
              ? 'bg-zinc-100 text-zinc-950 border-white font-semibold'
              : 'bg-[#0b0b0d]/92 border-white/[0.12] text-zinc-200'
          }`}
        >
          {pin.label}
        </div>
      </button>
    );
  }
);

// ============================================================================
// MAIN INTERACTIVE MAPS VIEW
// ============================================================================
export const InteractiveMapsView: React.FC = () => {
  const maps = useCampaignStore((s) => s.maps);
  const selectedMapId = useCampaignStore((s) => s.selectedMapId);
  const setSelectedMapId = useCampaignStore((s) => s.setSelectedMapId);
  const focusMapPin = useCampaignStore((s) => s.focusMapPin);
  const clearFocusMapPin = useCampaignStore((s) => s.clearFocusMapPin);
  const viewRole = useCampaignStore((s) => s.viewRole);
  const entities = useCampaignStore((s) => s.entities);
  const addEntity = useCampaignStore((s) => s.addEntity);
  const addMap = useCampaignStore((s) => s.addMap);
  const deleteMap = useCampaignStore((s) => s.deleteMap);
  const addMapPin = useCampaignStore((s) => s.addMapPin);
  const updateMapPin = useCampaignStore((s) => s.updateMapPin);
  const deleteMapPin = useCampaignStore((s) => s.deleteMapPin);
  const toggleRevealMapPin = useCampaignStore((s) => s.toggleRevealMapPin);
  const addMapShape = useCampaignStore((s) => s.addMapShape);
  const updateMapShape = useCampaignStore((s) => s.updateMapShape);
  const deleteMapShape = useCampaignStore((s) => s.deleteMapShape);
  const setSelectedEntityId = useCampaignStore((s) => s.setSelectedEntityId);
  const setWorldSubTab = useCampaignStore((s) => s.setWorldSubTab);
  const addCombatant = useCampaignStore((s) => s.addCombatant);
  const showToast = useCampaignStore((s) => s.showToast);

  const currentMap = maps.find((m) => m.id === selectedMapId) || maps[0];

  const entitiesMap = useMemo(() => {
    const m = new Map<string, Entity>();
    for (const e of entities) m.set(e.id, e);
    return m;
  }, [entities]);

  // Viewport Zoom & Pan State
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 24, y: 18 });
  const [gridMode, setGridMode] = useState<'off' | 'square' | 'hex'>('off');
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

  // Panning & Dragging Refs (Zero-lag pointer tracking)
  const panDragRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    originPanX: number;
    originPanY: number;
    moved: boolean;
  }>({
    active: false,
    startClientX: 0,
    startClientY: 0,
    originPanX: 0,
    originPanY: 0,
    moved: false,
  });

  const [draggingPin, setDraggingPin] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  // Layer & Tool States
  const [activeLayers, setActiveLayers] = useState<Record<MapLayer, boolean>>({
    locations: true,
    dangers: true,
    quests: true,
    secrets: true,
  });
  const [showVectorShapes, setShowVectorShapes] = useState(true);
  const [showShapesDrawer, setShowShapesDrawer] = useState(false);

  const [activeTool, setActiveTool] = useState<DrawingToolType>('select');
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [rulerPoints, setRulerPoints] = useState<{ x: number; y: number }[]>([]);
  const [shapeLabel, setShapeLabel] = useState('Território / Rota');
  const [shapeColor, setShapeColor] = useState('#d4a853');
  const [shapeStrokeWidth] = useState(3);
  const [shapeDashed, setShapeDashed] = useState(true);
  const [shapeRadius, setShapeRadius] = useState(10);
  const [shapeFontSize, setShapeFontSize] = useState(2.6);
  const [shapeEntityId, setShapeEntityId] = useState('');

  const [selectedPinId, setSelectedPinId] = useState<string | null>(
    currentMap?.pins[0]?.id || null
  );
  const [isEditingPin, setIsEditingPin] = useState(false);

  // Create Pin Modal State
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(
    null
  );
  const [pinLabel, setPinLabel] = useState('');
  const [pinSubtitle, setPinSubtitle] = useState('');
  const [pinLayer, setPinLayer] = useState<MapLayer>('locations');
  const [pinIcon, setPinIcon] = useState<MapPinIcon>('castle');
  const [pinEntityId, setPinEntityId] = useState('');
  const [pinLinkedEntityIds, setPinLinkedEntityIds] = useState<string[]>([]);
  const [pinLinkedMapId, setPinLinkedMapId] = useState('');
  const [pinDesc, setPinDesc] = useState('');
  const [pinMonsters, setPinMonsters] = useState('');
  const [pinTreasures, setPinTreasures] = useState('');
  const [pinSecret, setPinSecret] = useState(false);
  const [pinAutoCreateWiki, setPinAutoCreateWiki] = useState(false);
  const [modalWikiSearch, setModalWikiSearch] = useState('');

  // Inspector Wiki Linker Search
  const [inspectorWikiSearch, setInspectorWikiSearch] = useState('');

  // Edit Pin Draft State
  const [editDraft, setEditDraft] = useState<{
    label: string;
    subtitle: string;
    layer: MapLayer;
    iconType: MapPinIcon;
    description: string;
    monsters: string;
    treasures: string;
    entityId: string;
    linkedMapId: string;
  } | null>(null);

  // Upload Map Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [newMapSubtitle, setNewMapSubtitle] = useState('');
  const [newMapUrl, setNewMapUrl] = useState('');
  const [uploadedStorageId, setUploadedStorageId] = useState<Id<'_storage'> | undefined>(
    undefined
  );
  const [isUploadingMap, setIsUploadingMap] = useState(false);
  const [newMapRegionType, setNewMapRegionType] = useState<'regional' | 'tactical' | 'city'>('regional');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fit stage inside viewport
  const fitMapToViewport = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    if (vw <= 0 || vh <= 0) return;
    const fitZ = Math.max(
      0.42,
      Math.min(1.25, Math.min((vw - 32) / STAGE_W, (vh - 32) / STAGE_H))
    );
    setZoom(Number(fitZ.toFixed(3)));
    setPan({
      x: Math.round((vw - STAGE_W * fitZ) / 2),
      y: Math.round((vh - STAGE_H * fitZ) / 2),
    });
  }, []);

  const centerOnPercent = useCallback((xPct: number, yPct: number, targetZoom = 1.75) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
    const stageX = (xPct / 100) * STAGE_W;
    const stageY = (yPct / 100) * STAGE_H;
    setZoom(clampedZoom);
    setPan({
      x: Math.round(vw / 2 - stageX * clampedZoom),
      y: Math.round(vh / 2 - stageY * clampedZoom),
    });
  }, []);

  // Fit on initial mount or map switch
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      fitMapToViewport();
    });
    return () => window.cancelAnimationFrame(id);
  }, [currentMap?.id, fitMapToViewport]);

  // Handle cross-module focus from Wiki ("Ver no Mapa")
  useEffect(() => {
    if (!focusMapPin) return;
    const targetMap = maps.find((m) => m.id === focusMapPin.mapId);
    if (targetMap) {
      if (selectedMapId !== targetMap.id) {
        setSelectedMapId(targetMap.id);
      }
      const targetPin = targetMap.pins.find((p) => p.id === focusMapPin.pinId);
      if (targetPin) {
        setSelectedPinId(targetPin.id);
        window.requestAnimationFrame(() => {
          centerOnPercent(targetPin.x, targetPin.y, 1.85);
        });
      }
    }
    clearFocusMapPin();
  }, [focusMapPin, maps, selectedMapId, setSelectedMapId, centerOnPercent, clearFocusMapPin]);

  // Spacebar shortcut for quick pan
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        setIsSpaceHeld(true);
      }
      if (e.key === 'Escape') {
        setDrawingPoints([]);
        setRulerPoints([]);
        setActiveTool('select');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Native non-passive wheel zoom centered on cursor
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.13 : 1 / 1.13;

      setZoom((prevZoom) => {
        const nextZoom = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, Number((prevZoom * factor).toFixed(3)))
        );
        setPan((prevPan) => {
          const stagePointX = (cursorX - prevPan.x) / prevZoom;
          const stagePointY = (cursorY - prevPan.y) / prevZoom;
          return {
            x: cursorX - stagePointX * nextZoom,
            y: cursorY - stagePointY * nextZoom,
          };
        });
        return nextZoom;
      });
    };

    vp.addEventListener('wheel', handleWheel, { passive: false });
    return () => vp.removeEventListener('wheel', handleWheel);
  }, [currentMap?.id]);

  const adjustZoomAroundCenter = (multiplier: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const cx = vp.clientWidth / 2;
    const cy = vp.clientHeight / 2;
    setZoom((prevZoom) => {
      const nextZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, Number((prevZoom * multiplier).toFixed(3)))
      );
      setPan((prevPan) => {
        const stagePointX = (cx - prevPan.x) / prevZoom;
        const stagePointY = (cy - prevPan.y) / prevZoom;
        return {
          x: cx - stagePointX * nextZoom,
          y: cy - stagePointY * nextZoom,
        };
      });
      return nextZoom;
    });
  };

  // Convert client pointer to stage 0..100% coordinates
  const clientToStagePercent = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const vp = viewportRef.current;
      if (!vp) return null;
      const rect = vp.getBoundingClientRect();
      const stageX = (clientX - rect.left - pan.x) / zoom;
      const stageY = (clientY - rect.top - pan.y) / zoom;
      const xPct = Math.max(0, Math.min(100, Number(((stageX / STAGE_W) * 100).toFixed(2))));
      const yPct = Math.max(0, Math.min(100, Number(((stageY / STAGE_H) * 100).toFixed(2))));
      return { x: xPct, y: yPct };
    },
    [pan.x, pan.y, zoom]
  );

  // Visible Pins & Shapes
  const visiblePins = useMemo(() => {
    return (currentMap?.pins || []).filter((p) => {
      if (!activeLayers[p.layer]) return false;
      if (viewRole === 'player' && p.isSecret && !p.isRevealed) return false;
      return true;
    });
  }, [currentMap?.pins, activeLayers, viewRole]);

  const visibleShapes = useMemo(() => {
    return (currentMap?.shapes || []).filter((s) => {
      if (!showVectorShapes && s.type !== 'fog') return false;
      if (viewRole === 'player' && s.isSecret && !s.isRevealed && s.type !== 'fog')
        return false;
      return true;
    });
  }, [currentMap?.shapes, showVectorShapes, viewRole]);

  const activePin: MapPin | undefined = useMemo(
    () => visiblePins.find((p) => p.id === selectedPinId),
    [visiblePins, selectedPinId]
  );

  // Reset inline pin editor when switching selected pin
  useEffect(() => {
    setIsEditingPin(false);
    setEditDraft(null);
    setInspectorWikiSearch('');
  }, [selectedPinId, currentMap?.id]);

  const startEditingActivePin = () => {
    if (!activePin) return;
    setEditDraft({
      label: activePin.label,
      subtitle: activePin.subtitle,
      layer: activePin.layer,
      iconType: activePin.iconType,
      description: activePin.description,
      monsters: activePin.monsters.join(', '),
      treasures: activePin.treasures.join(', '),
      entityId: activePin.entityId || '',
      linkedMapId: activePin.linkedMapId || '',
    });
    setIsEditingPin(true);
  };

  const saveEditedPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMap || !activePin || !editDraft || !editDraft.label.trim()) return;
    updateMapPin(currentMap.id, activePin.id, {
      label: editDraft.label.trim(),
      subtitle: editDraft.subtitle.trim() || 'Local mapeado',
      layer: editDraft.layer,
      iconType: editDraft.iconType,
      description: editDraft.description.trim(),
      entityId: editDraft.entityId || undefined,
      linkedMapId: editDraft.linkedMapId || undefined,
      monsters: editDraft.monsters
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      treasures: editDraft.treasures
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setIsEditingPin(false);
    showToast('Marcador atualizado.');
  };

  // Start dragging a pin (60fps local state, commit to Convex on pointerUp)
  const handleStartPinDrag = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, pin: MapPin) => {
      if (viewRole !== 'gm' || activeTool !== 'select') return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDraggingPin({ id: pin.id, x: pin.x, y: pin.y });
    },
    [viewRole, activeTool]
  );

  // Viewport pointer handlers (Pan, Drag Pin, Tools)
  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!currentMap) return;

    const shouldPan =
      e.button === 1 ||
      isSpaceHeld ||
      activeTool === 'pan' ||
      (activeTool === 'select' && e.button === 0);

    if (shouldPan) {
      panDragRef.current = {
        active: true,
        startClientX: e.clientX,
        startClientY: e.clientY,
        originPanX: pan.x,
        originPanY: pan.y,
        moved: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (activeTool === 'ruler' && e.button === 0) {
      const pt = clientToStagePercent(e.clientX, e.clientY);
      if (!pt) return;
      setRulerPoints((prev) => (prev.length === 1 ? [prev[0], pt] : [pt]));
    }
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingPin) {
      const pt = clientToStagePercent(e.clientX, e.clientY);
      if (pt) {
        setDraggingPin({ id: draggingPin.id, x: pt.x, y: pt.y });
      }
      return;
    }

    if (panDragRef.current.active) {
      const dx = e.clientX - panDragRef.current.startClientX;
      const dy = e.clientY - panDragRef.current.startClientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        panDragRef.current.moved = true;
      }
      setPan({
        x: panDragRef.current.originPanX + dx,
        y: panDragRef.current.originPanY + dy,
      });
    }
  };

  const handleViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingPin && currentMap) {
      const existing = currentMap.pins.find((p) => p.id === draggingPin.id);
      if (
        existing &&
        (Math.abs(existing.x - draggingPin.x) > 0.05 ||
          Math.abs(existing.y - draggingPin.y) > 0.05)
      ) {
        updateMapPin(currentMap.id, draggingPin.id, {
          x: draggingPin.x,
          y: draggingPin.y,
        });
      }
      setDraggingPin(null);
      return;
    }

    const wasPanning = panDragRef.current.active;
    const didMove = panDragRef.current.moved;
    panDragRef.current.active = false;

    if (wasPanning && didMove) {
      return;
    }

    if (activeTool === 'select' || activeTool === 'pan' || activeTool === 'ruler') {
      return;
    }

    if (viewRole !== 'gm' || !currentMap || e.button !== 0) return;

    const coords = clientToStagePercent(e.clientX, e.clientY);
    if (!coords) return;

    const { x, y } = coords;

    if (activeTool === 'pin') {
      setPendingCoords({ x, y });
      return;
    }

    if (
      activeTool === 'road' ||
      activeTool === 'river' ||
      activeTool === 'polygon'
    ) {
      setDrawingPoints((prev) => [...prev, { x, y }]);
      return;
    }

    if (activeTool === 'text') {
      addMapShape(currentMap.id, {
        type: 'text',
        label: shapeLabel.trim() || 'Região Desconhecida',
        color: shapeColor,
        strokeWidth: 1,
        fontSize: shapeFontSize,
        entityId: shapeEntityId || undefined,
        points: [{ x, y }],
        isSecret: false,
        isRevealed: true,
      });
      setActiveTool('select');
      return;
    }

    if (activeTool === 'circle') {
      addMapShape(currentMap.id, {
        type: 'circle',
        label: shapeLabel.trim() || 'Zona demarcada',
        color: shapeColor,
        strokeWidth: shapeStrokeWidth,
        dashed: shapeDashed,
        opacity: 0.18,
        entityId: shapeEntityId || undefined,
        points: [{ x, y }],
        radius: shapeRadius,
        isSecret: false,
        isRevealed: true,
      });
      setActiveTool('select');
      return;
    }

    if (activeTool === 'rect') {
      addMapShape(currentMap.id, {
        type: 'rect',
        label: shapeLabel.trim() || 'Estrutura / Quarteirão',
        color: shapeColor,
        strokeWidth: shapeStrokeWidth,
        dashed: shapeDashed,
        opacity: 0.18,
        entityId: shapeEntityId || undefined,
        points: [{ x: Math.max(1, x - 9), y: Math.max(1, y - 7) }],
        width: 18,
        height: 14,
        isSecret: false,
        isRevealed: true,
      });
      setActiveTool('select');
      return;
    }

    if (activeTool === 'fog') {
      addMapShape(currentMap.id, {
        type: 'fog',
        label: shapeLabel.trim() || 'Área Inexplorada',
        color: '#09090b',
        strokeWidth: 1,
        opacity: 0.95,
        points: [{ x: Math.max(0, x - 12), y: Math.max(0, y - 10) }],
        width: 24,
        height: 20,
        isSecret: true,
        isRevealed: false,
      });
      showToast('Zona de Névoa de Guerra adicionada.');
      setActiveTool('select');
    }
  };

  const handleFinishMultiPointShape = () => {
    if (!currentMap) return;
    const minPts = activeTool === 'polygon' ? 3 : 2;
    if (drawingPoints.length < minPts) return;

    const shapeType: MapDrawingShape['type'] =
      activeTool === 'polygon'
        ? 'polygon'
        : activeTool === 'river'
        ? 'river'
        : 'road';

    addMapShape(currentMap.id, {
      type: shapeType,
      label:
        shapeLabel.trim() ||
        (shapeType === 'polygon'
          ? 'Território'
          : shapeType === 'river'
          ? 'Rio'
          : 'Rota'),
      color: shapeType === 'river' && shapeColor === '#d4a853' ? '#38bdf8' : shapeColor,
      strokeWidth: shapeStrokeWidth,
      dashed: shapeType === 'river' ? false : shapeDashed,
      opacity: shapeType === 'polygon' ? 0.18 : 0.9,
      entityId: shapeEntityId || undefined,
      points: drawingPoints,
      isSecret: false,
      isRevealed: true,
    });
    setDrawingPoints([]);
    setActiveTool('select');
  };

  // Ruler distance calculation based on map scale
  const rulerDistanceLabel = useMemo(() => {
    if (rulerPoints.length < 2) return '';
    const dx = rulerPoints[1].x - rulerPoints[0].x;
    const dy = rulerPoints[1].y - rulerPoints[0].y;
    const pctDist = Math.hypot(dx, dy);

    if (currentMap?.regionType === 'tactical') {
      // 100% width = 40 tactical squares (60m / 200ft)
      const squares = Math.max(1, Math.round(pctDist * 0.4));
      const meters = (squares * 1.5).toFixed(1).replace('.0', '');
      return `${meters}m (${squares} quad.)`;
    }
    if (currentMap?.regionType === 'city') {
      const meters = Math.round(pctDist * 18);
      return `${meters} m`;
    }
    // Regional: 100% = ~240 km (38 km/dia marcha normal D&D)
    const km = Math.max(1, Math.round(pctDist * 2.4));
    const days = (km / 38).toFixed(1).replace('.0', '');
    return `${km} km (~${days}d)`;
  }, [rulerPoints, currentMap?.regionType]);

  // Create Pin Submit (with optional 1-click Wiki Entity creation + multi-entity links)
  const handleCreatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMap || !pendingCoords || !pinLabel.trim()) return;

    let finalPrimaryEntityId = pinEntityId || undefined;

    if (!finalPrimaryEntityId && pinAutoCreateWiki) {
      const created = addEntity({
        name: pinLabel.trim(),
        subtitle: pinSubtitle.trim() || `Local em ${currentMap.name}`,
        category: 'location',
        summary: pinDesc.trim() || `Ponto cartografado em ${currentMap.name}.`,
        publicContent:
          pinDesc.trim() ||
          `Local registrado através do mapa **${currentMap.name}**.`,
        isPublicToPlayers: !pinSecret,
      });
      finalPrimaryEntityId = created.id;
    }

    addMapPin(currentMap.id, {
      x: pendingCoords.x,
      y: pendingCoords.y,
      label: pinLabel.trim(),
      subtitle: pinSubtitle.trim() || PIN_ICON_META[pinIcon].label,
      layer: pinLayer,
      iconType: pinIcon,
      entityId: finalPrimaryEntityId,
      linkedEntityIds:
        pinLinkedEntityIds.length > 0 ? pinLinkedEntityIds : undefined,
      linkedMapId: pinLinkedMapId || undefined,
      description: pinDesc.trim() || `Ponto de interesse em ${currentMap.name}.`,
      monsters: pinMonsters
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      treasures: pinTreasures
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      isSecret: pinSecret,
      isRevealed: !pinSecret,
    });

    setPendingCoords(null);
    setActiveTool('select');
    setPinLabel('');
    setPinSubtitle('');
    setPinEntityId('');
    setPinLinkedEntityIds([]);
    setPinLinkedMapId('');
    setPinDesc('');
    setPinMonsters('');
    setPinTreasures('');
    setPinSecret(false);
    setPinAutoCreateWiki(false);
    setModalWikiSearch('');
  };

  // Generate Wiki Page from an already-existing Pin
  const handleCreateWikiPageFromActivePin = () => {
    if (!currentMap || !activePin) return;
    const created = addEntity({
      name: activePin.label,
      subtitle: activePin.subtitle || `Local em ${currentMap.name}`,
      category: 'location',
      summary: activePin.description || `Ponto cartografado em ${currentMap.name}.`,
      publicContent:
        activePin.description ||
        `Local registrado no mapa **${currentMap.name}**.`,
      isPublicToPlayers: !(activePin.isSecret && !activePin.isRevealed),
    });
    updateMapPin(currentMap.id, activePin.id, { entityId: created.id });
    showToast(`Página #${created.handle} criada na Wiki e vinculada ao marcador!`);
  };

  // Toggle secondary Wiki entity link on existing pin
  const handleToggleLinkedEntityOnActivePin = (entityId: string) => {
    if (!currentMap || !activePin) return;
    const current = activePin.linkedEntityIds || [];
    const exists = current.includes(entityId);
    const next = exists
      ? current.filter((id) => id !== entityId)
      : [...current, entityId];
    updateMapPin(currentMap.id, activePin.id, { linkedEntityIds: next });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMap(true);
    try {
      const uploaded = await uploadImageToCloudStorage(file);
      setNewMapUrl(uploaded.url);
      setUploadedStorageId(uploaded.storageId);
      if (!newMapName.trim()) {
        setNewMapName(file.name.replace(/\.[^/.]+$/, ''));
      }
      showToast(
        uploaded.usedCloudStorage
          ? 'Imagem enviada para o armazenamento em nuvem.'
          : 'Imagem otimizada localmente.'
      );
    } catch {
      showToast('Falha ao processar imagem de mapa.');
    } finally {
      setIsUploadingMap(false);
    }
  };

  const handleCreateMap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapName.trim() || isUploadingMap) return;
    addMap(
      newMapName.trim(),
      newMapSubtitle.trim() || 'Mapa da campanha',
      newMapUrl,
      newMapRegionType,
      uploadedStorageId
    );
    setNewMapName('');
    setNewMapSubtitle('');
    setNewMapUrl('');
    setUploadedStorageId(undefined);
    setShowUploadModal(false);
  };

  const openEntityInWiki = useCallback(
    (entityId: string) => {
      setSelectedEntityId(entityId);
      setWorldSubTab('wiki');
    },
    [setSelectedEntityId, setWorldSubTab]
  );

  // Counter-scale so pins stay readable at 3x-4x zoom without covering the map
  const pinCounterScale = useMemo(
    () => Number((1 / Math.pow(Math.max(0.55, zoom), 0.58)).toFixed(3)),
    [zoom]
  );

  const primaryPinEntity = activePin?.entityId
    ? entitiesMap.get(activePin.entityId)
    : undefined;

  const secondaryPinEntities = useMemo(() => {
    if (!activePin?.linkedEntityIds) return [];
    return activePin.linkedEntityIds
      .map((id) => entitiesMap.get(id))
      .filter((e): e is Entity => Boolean(e))
      .filter((e) => viewRole === 'gm' || e.isPublicToPlayers);
  }, [activePin?.linkedEntityIds, entitiesMap, viewRole]);

  const linkedSubMap = useMemo(() => {
    if (!activePin?.linkedMapId) return undefined;
    return maps.find((m) => m.id === activePin.linkedMapId);
  }, [activePin?.linkedMapId, maps]);

  const filteredInspectorEntities = useMemo(() => {
    const q = inspectorWikiSearch.trim().toLowerCase();
    return entities
      .filter((e) => e.id !== activePin?.entityId)
      .filter((e) => {
        if (!q) return true;
        return (
          e.name.toLowerCase().includes(q) ||
          e.handle.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [entities, activePin?.entityId, inspectorWikiSearch]);

  const filteredModalEntities = useMemo(() => {
    const q = modalWikiSearch.trim().toLowerCase();
    return entities
      .filter((e) => e.id !== pinEntityId)
      .filter((e) => {
        if (!q) return true;
        return (
          e.name.toLowerCase().includes(q) ||
          e.handle.toLowerCase().includes(q)
        );
      })
      .slice(0, 15);
  }, [entities, pinEntityId, modalWikiSearch]);

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] surface-panel rounded-xl overflow-hidden relative">
      {/* Row 1: Map Switcher & Layer Visibility */}
      <div className="px-3.5 py-2.5 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2 z-20 bg-[#111114]">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {maps.map((m) => {
            const active = m.id === currentMap?.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedMapId(m.id);
                  setSelectedPinId(m.pins[0]?.id || null);
                  setDrawingPoints([]);
                  setRulerPoints([]);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                  active
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                }`}
              >
                <span>{m.name}</span>
                <span className="text-[10px] font-mono opacity-60 tabular-nums">
                  {m.pins.length}
                </span>
              </button>
            );
          })}

          {viewRole === 'gm' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-subtle px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Novo mapa</span>
            </button>
          )}
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1 bg-[#0b0b0d] border border-white/[0.06] rounded-lg p-1">
          {(Object.keys(LAYER_CONFIG) as MapLayer[]).map((layer) => {
            if (viewRole === 'player' && layer === 'secrets') return null;
            const active = activeLayers[layer];
            return (
              <button
                key={layer}
                onClick={() =>
                  setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
                }
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  active
                    ? 'bg-white/[0.08] text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    active ? LAYER_CONFIG[layer].dot : 'bg-zinc-600'
                  }`}
                />
                <span>{LAYER_CONFIG[layer].shortLabel}</span>
              </button>
            );
          })}

          <button
            onClick={() => setShowVectorShapes(!showVectorShapes)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
              showVectorShapes
                ? 'bg-white/[0.08] text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <PenTool className="w-3 h-3" />
            <span>Camadas</span>
          </button>
        </div>
      </div>

      {/* Row 2: Expanded Cartography & Tactical Toolbar */}
      {currentMap && (
        <div className="px-3.5 py-2 border-b border-white/[0.06] bg-[#0e0e11] flex flex-wrap items-center justify-between gap-2 z-20 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                { id: 'select', label: 'Selecionar', icon: MousePointer, gmOnly: false },
                { id: 'pan', label: 'Mover', icon: Hand, gmOnly: false },
                { id: 'ruler', label: 'Régua', icon: Ruler, gmOnly: false },
                { id: 'pin', label: 'Marcador', icon: Plus, gmOnly: true },
                { id: 'text', label: 'Rótulo', icon: Type, defaultName: 'Reino do Norte', gmOnly: true },
                { id: 'road', label: 'Estrada', icon: PenTool, defaultName: 'Estrada Real', gmOnly: true },
                { id: 'river', label: 'Rio', icon: Waves, defaultName: 'Rio Cinzento', gmOnly: true },
                { id: 'polygon', label: 'Território', icon: Hexagon, defaultName: 'Domínio', gmOnly: true },
                { id: 'circle', label: 'Raio', icon: CircleIcon, defaultName: 'Zona de Risco', gmOnly: true },
                { id: 'rect', label: 'Estrutura', icon: Square, defaultName: 'Quarteirão', gmOnly: true },
                { id: 'fog', label: 'Névoa', icon: CloudOff, defaultName: 'Névoa de Guerra', gmOnly: true },
              ] as const
            )
              .filter((t) => !t.gmOnly || viewRole === 'gm')
              .map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveTool(tool.id);
                      setDrawingPoints([]);
                      if (tool.id !== 'ruler') setRulerPoints([]);
                      if ('defaultName' in tool && tool.defaultName) {
                        setShapeLabel(tool.defaultName);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-950'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tool.label}</span>
                  </button>
                );
              })}
          </div>

          {/* Quick-Stamp Preset Pins when 'pin' tool is active */}
          {viewRole === 'gm' && activeTool === 'pin' && (
            <div className="flex flex-wrap items-center gap-1.5 bg-[#141418] px-2.5 py-1 rounded-lg border border-white/[0.08]">
              <span className="text-[11px] text-zinc-500 mr-1">Pincel rápido:</span>
              {(
                [
                  'city',
                  'village',
                  'tavern',
                  'dungeon',
                  'skull',
                  'shrine',
                  'port',
                  'portal',
                  'party',
                  'secret',
                ] as MapPinIcon[]
              ).map((ic) => {
                const meta = PIN_ICON_META[ic];
                const Icon = meta.icon;
                const selected = pinIcon === ic;
                return (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => {
                      setPinIcon(ic);
                      setPinLayer(meta.defaultLayer);
                    }}
                    title={meta.label}
                    className={`p-1.5 rounded-md border transition-colors ${
                      selected
                        ? 'bg-zinc-100 text-zinc-950 border-white'
                        : 'border-white/[0.06] text-zinc-400 hover:text-zinc-100 bg-[#0b0b0d]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Contextual Shape Options */}
          {viewRole === 'gm' &&
            activeTool !== 'select' &&
            activeTool !== 'pan' &&
            activeTool !== 'pin' &&
            activeTool !== 'ruler' && (
              <div className="flex flex-wrap items-center gap-2 bg-[#141418] px-2.5 py-1 rounded-lg border border-white/[0.08]">
                <input
                  type="text"
                  value={shapeLabel}
                  onChange={(e) => setShapeLabel(e.target.value)}
                  placeholder="Rótulo no mapa"
                  className="input-clean px-2 py-0.5 rounded text-xs w-32"
                />

                {activeTool !== 'fog' && (
                  <>
                    <div className="flex items-center gap-1">
                      {SHAPE_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setShapeColor(c.hex)}
                          className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                            shapeColor === c.hex
                              ? 'border-white scale-125'
                              : 'border-transparent opacity-75 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                        />
                      ))}
                    </div>

                    <select
                      value={shapeEntityId}
                      onChange={(e) => setShapeEntityId(e.target.value)}
                      className="input-clean px-2 py-0.5 rounded text-[11px] max-w-[150px]"
                      title="Vincular camada vetorial a uma entidade da Wiki"
                    >
                      <option value="">Sem vínculo Wiki</option>
                      {entities.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {ent.mentionPrefix}
                          {ent.handle} ({ent.name})
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {activeTool === 'circle' && (
                  <label className="flex items-center gap-1 text-[11px] text-zinc-400">
                    <span>Raio:</span>
                    <input
                      type="number"
                      min={3}
                      max={40}
                      value={shapeRadius}
                      onChange={(e) => setShapeRadius(Number(e.target.value) || 10)}
                      className="input-clean w-12 px-1.5 py-0.5 rounded text-[11px] font-mono"
                    />
                  </label>
                )}

                {activeTool === 'text' && (
                  <label className="flex items-center gap-1 text-[11px] text-zinc-400">
                    <span>Tam:</span>
                    <select
                      value={shapeFontSize}
                      onChange={(e) => setShapeFontSize(Number(e.target.value))}
                      className="input-clean px-1.5 py-0.5 rounded text-[11px]"
                    >
                      <option value={1.8}>Pequeno</option>
                      <option value={2.6}>Médio</option>
                      <option value={3.8}>Grande (Reino)</option>
                    </select>
                  </label>
                )}

                {(activeTool === 'road' ||
                  activeTool === 'polygon' ||
                  activeTool === 'circle' ||
                  activeTool === 'rect') && (
                  <label className="flex items-center gap-1 text-[11px] text-zinc-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={shapeDashed}
                      onChange={(e) => setShapeDashed(e.target.checked)}
                    />
                    <span>Tracejado</span>
                  </label>
                )}

                {(activeTool === 'road' ||
                  activeTool === 'river' ||
                  activeTool === 'polygon') && (
                  <button
                    type="button"
                    onClick={handleFinishMultiPointShape}
                    disabled={
                      drawingPoints.length < (activeTool === 'polygon' ? 3 : 2)
                    }
                    className="btn-solid px-2.5 py-0.5 rounded text-[11px] disabled:opacity-40 inline-flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Concluir ({drawingPoints.length})</span>
                  </button>
                )}
              </div>
            )}

          {activeTool === 'ruler' && (
            <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
              <Ruler className="w-3.5 h-3.5" />
              <span>
                {rulerPoints.length === 0
                  ? 'Clique no ponto de origem no mapa'
                  : rulerPoints.length === 1
                  ? 'Clique no ponto de destino para medir'
                  : `Distância medida: ${rulerDistanceLabel}`}
              </span>
              {rulerPoints.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRulerPoints([])}
                  className="underline ml-1 text-zinc-300 hover:text-white"
                >
                  Limpar
                </button>
              )}
            </div>
          )}

          {viewRole === 'gm' && maps.length >= 1 && (
            <button
              onClick={() => deleteMap(currentMap.id)}
              className="p-1.5 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Excluir mapa atual"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Map Viewport + Lateral Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {!currentMap ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-[#08080a]">
            <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400">
              <MapIcon className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-medium text-zinc-200">
                Nenhum mapa cadastrado
              </h3>
              <p className="text-xs text-zinc-500">
                Envie uma imagem de mapa regional, urbano ou tático (ou crie um grid vetorial limpo) para posicionar marcadores, zoom e vínculos com a Wiki.
              </p>
            </div>
            {viewRole === 'gm' && (
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="btn-solid inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs mt-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Criar primeiro mapa</span>
              </button>
            )}
          </div>
        ) : (
          <div
            ref={viewportRef}
            onPointerDown={handleViewportPointerDown}
            onPointerMove={handleViewportPointerMove}
            onPointerUp={handleViewportPointerUp}
            className={`flex-1 relative overflow-hidden select-none bg-[#070709] ${
              isSpaceHeld || activeTool === 'pan'
                ? 'cursor-grab active:cursor-grabbing'
                : activeTool !== 'select'
                ? 'cursor-crosshair'
                : 'cursor-grab active:cursor-grabbing'
            }`}
          >
            {/* GPU-Accelerated Zoomable & Pannable Stage */}
            <div
              style={{
                width: `${STAGE_W}px`,
                height: `${STAGE_H}px`,
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transformOrigin: '0 0',
                willChange: 'transform',
              }}
              className="relative shadow-[0_20px_70px_rgba(0,0,0,0.85)] border border-white/[0.08] rounded-md overflow-hidden bg-[#0b0b0d]"
            >
              {/* Base Map Image or Crisp Procedural Grid */}
              {currentMap.customImageUrl ? (
                <img
                  src={currentMap.customImageUrl}
                  alt={currentMap.name}
                  draggable={false}
                  decoding="async"
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
              ) : currentMap.regionType === 'tactical' ? (
                <svg
                  viewBox="0 0 1280 820"
                  className="w-full h-full pointer-events-none"
                >
                  <rect width="1280" height="820" fill="#0c0c0f" />
                  <defs>
                    <pattern
                      id="baseTacticalGrid"
                      width="32"
                      height="32"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 32 0 L 0 0 0 32"
                        fill="none"
                        stroke="#1c1c22"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="1280" height="820" fill="url(#baseTacticalGrid)" />
                  <rect
                    x="160"
                    y="120"
                    width="960"
                    height="580"
                    rx="8"
                    fill="#111116"
                    stroke="#3f3f46"
                    strokeWidth="2"
                  />
                  <text
                    x="640"
                    y="84"
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="20"
                    fontFamily="Newsreader, Georgia, serif"
                    fontStyle="italic"
                  >
                    {currentMap.name}
                  </text>
                </svg>
              ) : (
                <svg
                  viewBox="0 0 1280 820"
                  className="w-full h-full pointer-events-none"
                >
                  <defs>
                    <radialGradient id="studioMapGlow" cx="50%" cy="50%" r="70%">
                      <stop offset="0%" stopColor="#16161b" />
                      <stop offset="70%" stopColor="#0d0d10" />
                      <stop offset="100%" stopColor="#09090b" />
                    </radialGradient>
                    <pattern
                      id="studioSubtleGrid"
                      width="48"
                      height="48"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 48 0 L 0 0 0 48"
                        fill="none"
                        stroke="#1a1a20"
                        strokeWidth="0.8"
                      />
                    </pattern>
                  </defs>
                  <rect width="1280" height="820" fill="url(#studioMapGlow)" />
                  <rect width="1280" height="820" fill="url(#studioSubtleGrid)" />
                  <text
                    x="640"
                    y="400"
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="26"
                    letterSpacing="3"
                    fontFamily="Newsreader, Georgia, serif"
                    fontStyle="italic"
                    opacity="0.45"
                  >
                    {currentMap.name}
                  </text>
                  {currentMap.subtitle && (
                    <text
                      x="640"
                      y="432"
                      textAnchor="middle"
                      fill="#71717a"
                      fontSize="14"
                      letterSpacing="1.5"
                      opacity="0.55"
                    >
                      {currentMap.subtitle}
                    </text>
                  )}
                </svg>
              )}

              {/* Optional Tactical Square / Hex Grid Overlay (works over uploaded images too) */}
              {gridMode !== 'off' && (
                <svg
                  viewBox="0 0 1280 820"
                  className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
                >
                  <defs>
                    {gridMode === 'square' ? (
                      <pattern
                        id="overlaySquareGrid"
                        width="40"
                        height="40"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 40 0 L 0 0 0 40"
                          fill="none"
                          stroke="rgba(255,255,255,0.16)"
                          strokeWidth="1"
                        />
                      </pattern>
                    ) : (
                      <pattern
                        id="overlayHexGrid"
                        width="56"
                        height="48.5"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M28 0 L56 14 L56 34.5 L28 48.5 L0 34.5 L0 14 Z"
                          fill="none"
                          stroke="rgba(255,255,255,0.16)"
                          strokeWidth="1"
                        />
                      </pattern>
                    )}
                  </defs>
                  <rect
                    width="1280"
                    height="820"
                    fill={
                      gridMode === 'square'
                        ? 'url(#overlaySquareGrid)'
                        : 'url(#overlayHexGrid)'
                    }
                  />
                </svg>
              )}

              {/* Memoized Vector & Fog Layer */}
              <MapVectorLayer
                shapes={visibleShapes}
                drawingPoints={drawingPoints}
                activeTool={activeTool}
                shapeColor={shapeColor}
                rulerPoints={rulerPoints}
                rulerDistanceLabel={rulerDistanceLabel}
                viewRole={viewRole}
                entitiesMap={entitiesMap}
                onSelectEntity={openEntityInWiki}
              />

              {/* Memoized Interactive Pins */}
              {visiblePins.map((pin) => {
                const isDraggingThis = draggingPin?.id === pin.id;
                const displayX = isDraggingThis ? draggingPin.x : pin.x;
                const displayY = isDraggingThis ? draggingPin.y : pin.y;
                const linkedCount =
                  (pin.entityId ? 1 : 0) + (pin.linkedEntityIds?.length || 0);

                return (
                  <MapPinMarker
                    key={pin.id}
                    pin={pin}
                    displayX={displayX}
                    displayY={displayY}
                    isSelected={pin.id === activePin?.id}
                    counterScale={pinCounterScale}
                    linkedCount={linkedCount}
                    hasSubMap={Boolean(pin.linkedMapId)}
                    canDrag={viewRole === 'gm' && activeTool === 'select'}
                    onSelect={setSelectedPinId}
                    onStartDrag={handleStartPinDrag}
                  />
                );
              })}
            </div>

            {/* Top-Left Quick Pin Jump & Scale Info */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-auto">
              {visiblePins.length > 0 && (
                <select
                  value={selectedPinId || ''}
                  onChange={(e) => {
                    const pid = e.target.value;
                    if (!pid) return;
                    setSelectedPinId(pid);
                    const p = visiblePins.find((item) => item.id === pid);
                    if (p) centerOnPercent(p.x, p.y, Math.max(zoom, 1.55));
                  }}
                  className="bg-[#111114]/95 border border-white/[0.10] backdrop-blur-md text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 outline-none"
                >
                  <option value="">Ir para marcador ({visiblePins.length})...</option>
                  {visiblePins.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Bottom-Left Vector & Fog Layer Manager (GM) */}
            {visibleShapes.length > 0 && viewRole === 'gm' && (
              <div className="absolute bottom-3 left-3 z-20 pointer-events-auto">
                {!showShapesDrawer ? (
                  <button
                    type="button"
                    onClick={() => setShowShapesDrawer(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#111114]/95 border border-white/[0.10] backdrop-blur-md text-xs text-zinc-200 inline-flex items-center gap-1.5 shadow-lg"
                  >
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Camadas desenhadas ({visibleShapes.length})</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-[#111114]/95 border border-white/[0.10] backdrop-blur-md w-72 space-y-2 shadow-2xl">
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                      <span>Camadas vetoriais & névoa ({visibleShapes.length})</span>
                      <button
                        type="button"
                        onClick={() => setShowShapesDrawer(false)}
                        className="text-zinc-500 hover:text-zinc-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {visibleShapes.map((sh) => {
                        const linkedEnt = sh.entityId
                          ? entitiesMap.get(sh.entityId)
                          : undefined;
                        return (
                          <div
                            key={sh.id}
                            className="flex items-center justify-between gap-1.5 text-[11px] text-zinc-300 bg-[#0b0b0d] px-2 py-1.5 rounded-md border border-white/[0.06]"
                          >
                            <div className="min-w-0 flex-1 flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    sh.type === 'fog' ? '#71717a' : sh.color,
                                }}
                              />
                              <span className="truncate">{sh.label}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {linkedEnt && (
                                <button
                                  type="button"
                                  onClick={() => openEntityInWiki(linkedEnt.id)}
                                  className="text-[10px] font-mono text-amber-300 hover:underline"
                                  title="Abrir na Wiki"
                                >
                                  {linkedEnt.mentionPrefix}
                                  {linkedEnt.handle}
                                </button>
                              )}
                              {sh.type === 'fog' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateMapShape(currentMap.id, sh.id, {
                                      isRevealed: !sh.isRevealed,
                                    })
                                  }
                                  className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px]"
                                  title={
                                    sh.isRevealed
                                      ? 'Ocultar área novamente'
                                      : 'Revelar névoa aos jogadores'
                                  }
                                >
                                  {sh.isRevealed ? 'Ocultar' : 'Dissipar'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteMapShape(currentMap.id, sh.id)}
                                className="text-zinc-500 hover:text-rose-400 p-0.5"
                                title="Remover camada"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom-Right Floating Zoom & Grid HUD */}
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 p-1.5 rounded-xl bg-[#111114]/95 border border-white/[0.10] backdrop-blur-md shadow-xl pointer-events-auto">
              <button
                type="button"
                onClick={() =>
                  setGridMode((prev) =>
                    prev === 'off' ? 'square' : prev === 'square' ? 'hex' : 'off'
                  )
                }
                className={`px-2 py-1 rounded-lg text-[11px] font-mono inline-flex items-center gap-1 transition-colors ${
                  gridMode !== 'off'
                    ? 'bg-white/[0.10] text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Alternar grade tática sobre o mapa (Off / Quadrada / Hexagonal)"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>
                  {gridMode === 'off'
                    ? 'Grade'
                    : gridMode === 'square'
                    ? 'Quad'
                    : 'Hex'}
                </span>
              </button>

              <div className="w-px h-4 bg-white/[0.08]" />

              <button
                type="button"
                onClick={() => adjustZoomAroundCenter(1 / 1.25)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
                title="Reduzir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={fitMapToViewport}
                className="px-2 py-1 rounded-lg text-[11px] font-mono text-zinc-200 hover:bg-white/[0.06] tabular-nums min-w-[52px] text-center"
                title="Ajustar mapa à tela"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                type="button"
                onClick={() => adjustZoomAroundCenter(1.25)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
                title="Ampliar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={fitMapToViewport}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
                title="Centralizar e ajustar à janela"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Right Lateral Inspector with Deep Wiki Entity Linking & Inline Editing */}
        {activePin && currentMap && (
          <aside className="w-80 lg:w-[25rem] bg-[#111114] border-l border-white/[0.07] p-5 flex flex-col justify-between overflow-y-auto z-20">
            {isEditingPin && editDraft && viewRole === 'gm' ? (
              <form onSubmit={saveEditedPin} className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="font-semibold text-zinc-100">Editar marcador</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingPin(false)}
                    className="text-zinc-500 hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={editDraft.label}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, label: e.target.value })
                    }
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Subtítulo
                  </label>
                  <input
                    type="text"
                    value={editDraft.subtitle}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, subtitle: e.target.value })
                    }
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Camada
                    </label>
                    <select
                      value={editDraft.layer}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          layer: e.target.value as MapLayer,
                        })
                      }
                      className="input-clean w-full px-2 py-1.5 rounded-lg"
                    >
                      <option value="locations">Locais</option>
                      <option value="dangers">Perigos</option>
                      <option value="quests">Missões</option>
                      <option value="secrets">Segredos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Ícone
                    </label>
                    <select
                      value={editDraft.iconType}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          iconType: e.target.value as MapPinIcon,
                        })
                      }
                      className="input-clean w-full px-2 py-1.5 rounded-lg"
                    >
                      {(Object.keys(PIN_ICON_META) as MapPinIcon[]).map((k) => (
                        <option key={k} value={k}>
                          {PIN_ICON_META[k].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Página principal na Wiki
                  </label>
                  <select
                    value={editDraft.entityId}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, entityId: e.target.value })
                    }
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  >
                    <option value="">Sem página principal</option>
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.mentionPrefix}
                        {ent.handle} — {ent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Sub-mapa conectado (ex: interior / cidade)
                  </label>
                  <select
                    value={editDraft.linkedMapId}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, linkedMapId: e.target.value })
                    }
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  >
                    <option value="">Nenhum sub-mapa</option>
                    {maps
                      .filter((m) => m.id !== currentMap.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.regionType})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Descrição (suporta @NPC e #Local)
                  </label>
                  <MentionTextarea
                    value={editDraft.description}
                    onChange={(val) =>
                      setEditDraft({ ...editDraft, description: val })
                    }
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Ameaças (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={editDraft.monsters}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, monsters: e.target.value })
                    }
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Espólios (separados por vírgula)
                  </label>
                  <input
                    type="text"
                    value={editDraft.treasures}
                    onChange={(e) =>
                      setEditDraft({ ...editDraft, treasures: e.target.value })
                    }
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingPin(false)}
                    className="btn-subtle px-3 py-1.5 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-solid px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-3.5">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            LAYER_CONFIG[activePin.layer].dot
                          }`}
                        />
                        {LAYER_CONFIG[activePin.layer].label}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-600">
                        ({activePin.x.toFixed(1)}%, {activePin.y.toFixed(1)}%)
                      </span>
                    </div>
                    <h3 className="text-xl font-serif font-medium text-zinc-100 break-words">
                      {activePin.label}
                    </h3>
                    <p className="text-xs text-zinc-400">{activePin.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {viewRole === 'gm' && (
                      <button
                        type="button"
                        onClick={startEditingActivePin}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
                        title="Editar marcador"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedPinId(null)}
                      className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-Map Drilldown Button */}
                {linkedSubMap && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMapId(linkedSubMap.id);
                      setSelectedPinId(linkedSubMap.pins[0]?.id || null);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs font-medium flex items-center justify-between transition-colors"
                  >
                    <span className="inline-flex items-center gap-2">
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>Entrar no mapa: {linkedSubMap.name}</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Description */}
                <div className="p-3.5 rounded-xl bg-[#0e0e11] border border-white/[0.06] text-xs text-zinc-300 leading-relaxed">
                  <MentionText text={activePin.description} />
                </div>

                {/* Wiki Links Hub (Primary + Multi-Entity Links) */}
                <div className="p-3.5 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Vínculos com a Wiki</span>
                    </span>
                    {viewRole === 'gm' && !primaryPinEntity && (
                      <button
                        type="button"
                        onClick={handleCreateWikiPageFromActivePin}
                        className="text-[11px] text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1"
                        title="Cria automaticamente uma entrada #Local na Wiki com os dados deste marcador"
                      >
                        <BookPlus className="w-3 h-3" />
                        <span>Gerar página na Wiki</span>
                      </button>
                    )}
                  </div>

                  {/* Primary Entity */}
                  {primaryPinEntity && (
                    <button
                      type="button"
                      onClick={() => openEntityInWiki(primaryPinEntity.id)}
                      className="w-full p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-between gap-2 text-left transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono text-emerald-400">
                          Página Principal · {primaryPinEntity.mentionPrefix}
                          {primaryPinEntity.handle}
                        </div>
                        <div className="text-xs font-medium text-zinc-100 truncate">
                          {primaryPinEntity.name}
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </button>
                  )}

                  {/* Secondary Linked Entities */}
                  {secondaryPinEntities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {secondaryPinEntities.map((ent) => (
                        <div
                          key={ent.id}
                          className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-md bg-[#141418] border border-white/[0.08] text-[11px] text-zinc-200"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              ENTITY_CATEGORY_DOT[ent.category] || 'bg-zinc-400'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => openEntityInWiki(ent.id)}
                            className="hover:text-white hover:underline truncate max-w-[165px]"
                          >
                            {ent.name}{' '}
                            <span className="font-mono text-[10px] text-zinc-500">
                              ({ent.mentionPrefix}
                              {ent.handle})
                            </span>
                          </button>
                          {viewRole === 'gm' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleLinkedEntityOnActivePin(ent.id)
                              }
                              className="text-zinc-500 hover:text-rose-400 p-0.5"
                              title="Desvincular entidade"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!primaryPinEntity && secondaryPinEntities.length === 0 && (
                    <p className="text-[11px] text-zinc-500">
                      Nenhuma entidade da Wiki vinculada a este ponto.
                    </p>
                  )}

                  {/* GM Quick Entity Linker */}
                  {viewRole === 'gm' && entities.length > 0 && (
                    <div className="pt-1.5 border-t border-white/[0.05] space-y-1.5">
                      <input
                        type="text"
                        value={inspectorWikiSearch}
                        onChange={(e) => setInspectorWikiSearch(e.target.value)}
                        placeholder="+ Vincular @NPC, @Facção, #Item ou #Lore..."
                        className="input-clean w-full px-2.5 py-1 rounded-md text-[11px]"
                      />
                      {inspectorWikiSearch.trim().length > 0 && (
                        <div className="max-h-32 overflow-y-auto space-y-0.5 bg-[#09090b] p-1 rounded-lg border border-white/[0.07]">
                          {filteredInspectorEntities.length === 0 ? (
                            <div className="text-[11px] text-zinc-500 px-2 py-1">
                              Nenhuma entidade encontrada.
                            </div>
                          ) : (
                            filteredInspectorEntities.map((ent) => {
                              const alreadyLinked = Boolean(
                                activePin.linkedEntityIds?.includes(ent.id)
                              );
                              return (
                                <button
                                  key={ent.id}
                                  type="button"
                                  onClick={() => {
                                    handleToggleLinkedEntityOnActivePin(ent.id);
                                    setInspectorWikiSearch('');
                                  }}
                                  className="w-full px-2 py-1 rounded text-left text-[11px] hover:bg-white/[0.06] flex items-center justify-between gap-2"
                                >
                                  <span className="truncate text-zinc-200">
                                    {ent.name}{' '}
                                    <span className="font-mono text-[10px] text-zinc-500">
                                      {ent.mentionPrefix}
                                      {ent.handle}
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-zinc-400">
                                    {alreadyLinked ? 'Remover' : '+ Vincular'}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Monsters */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Ameaças locais</span>
                  </span>
                  {activePin.monsters.length === 0 ? (
                    <p className="text-xs text-zinc-500">Nenhuma ameaça registrada.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {activePin.monsters.map((m, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-[#0e0e11] border border-white/[0.06] flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="text-zinc-200">
                            <MentionText text={m} />
                          </div>
                          {viewRole === 'gm' && (
                            <button
                              onClick={() => {
                                addCombatant({
                                  name: m.replace(/^[@#]/, ''),
                                  type: 'monster',
                                  initiative: Math.floor(Math.random() * 20) + 3,
                                  hp: 45,
                                  maxHp: 45,
                                  armorClass: 15,
                                  conditions: [],
                                  notes: `Originado de ${activePin.label}`,
                                });
                                showToast(`"${m}" adicionado ao combate.`);
                              }}
                              className="btn-subtle px-2 py-0.5 rounded text-[10px] font-mono shrink-0"
                            >
                              + Combate
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Treasures */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Espólio & relíquias</span>
                  </span>
                  {activePin.treasures.length === 0 ? (
                    <p className="text-xs text-zinc-500">Nenhum item listado.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {activePin.treasures.map((tr, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-[#0e0e11] border border-white/[0.06] text-xs text-zinc-200"
                        >
                          <MentionText text={tr} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {viewRole === 'gm' && !isEditingPin && (
              <div className="pt-3 mt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
                <button
                  onClick={() => toggleRevealMapPin(currentMap.id, activePin.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs inline-flex items-center justify-center gap-1.5 ${
                    activePin.isSecret && !activePin.isRevealed
                      ? 'btn-solid'
                      : 'btn-subtle'
                  }`}
                >
                  {activePin.isSecret && !activePin.isRevealed ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Revelar aos jogadores</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Ocultar dos jogadores</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    deleteMapPin(currentMap.id, activePin.id);
                    setSelectedPinId(null);
                  }}
                  className="btn-subtle p-2 rounded-lg hover:text-rose-400"
                  title="Remover marcador"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Modal: Create Pin with Multi-Entity Wiki Linking */}
      {pendingCoords && currentMap && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePin}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#121215] border border-white/[0.09] p-6 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-semibold text-zinc-100">
                Novo marcador{' '}
                <span className="font-mono text-xs text-zinc-500 font-normal">
                  ({pendingCoords.x.toFixed(1)}%, {pendingCoords.y.toFixed(1)}%)
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setPendingCoords(null)}
                className="p-1 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={pinLabel}
                  onChange={(e) => setPinLabel(e.target.value)}
                  placeholder="Nome do local (ex: Fortaleza Cinza)"
                  className="input-clean w-full px-3 py-2 rounded-lg"
                />
                <input
                  type="text"
                  value={pinSubtitle}
                  onChange={(e) => setPinSubtitle(e.target.value)}
                  placeholder="Subtítulo (ex: Posto da guarda norte)"
                  className="input-clean w-full px-3 py-2 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Camada
                  </label>
                  <select
                    value={pinLayer}
                    onChange={(e) => setPinLayer(e.target.value as MapLayer)}
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  >
                    <option value="locations">Locais & Assentamentos</option>
                    <option value="dangers">Perigos & Masmorras</option>
                    <option value="quests">Ganchos & Missões</option>
                    <option value="secrets">Segredos do Mestre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Ícone do marcador (15 tipos)
                  </label>
                  <select
                    value={pinIcon}
                    onChange={(e) => {
                      const ic = e.target.value as MapPinIcon;
                      setPinIcon(ic);
                    }}
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  >
                    {(Object.keys(PIN_ICON_META) as MapPinIcon[]).map((k) => (
                      <option key={k} value={k}>
                        {PIN_ICON_META[k].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Primary Wiki Link OR Auto-Create */}
              <div className="p-3 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-zinc-300">
                    Página principal na Wiki
                  </label>
                  {!pinEntityId && (
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pinAutoCreateWiki}
                        onChange={(e) => setPinAutoCreateWiki(e.target.checked)}
                      />
                      <span>Criar #Local automaticamente na Wiki</span>
                    </label>
                  )}
                </div>

                <select
                  value={pinEntityId}
                  onChange={(e) => {
                    setPinEntityId(e.target.value);
                    if (e.target.value) setPinAutoCreateWiki(false);
                  }}
                  className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                >
                  <option value="">Nenhum vínculo principal selecionado</option>
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.mentionPrefix}
                      {e.handle} — {e.name}
                    </option>
                  ))}
                </select>

                {/* Additional Linked Entities (@NPCs, @Factions, #Items) */}
                {entities.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <label className="block text-[11px] text-zinc-400">
                      Vincular outras entidades da Wiki presentes aqui (@NPCs, @Facções, #Itens)
                    </label>
                    {pinLinkedEntityIds.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {pinLinkedEntityIds.map((id) => {
                          const ent = entitiesMap.get(id);
                          if (!ent) return null;
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.06] text-[11px] text-zinc-200"
                            >
                              {ent.mentionPrefix}
                              {ent.handle}
                              <button
                                type="button"
                                onClick={() =>
                                  setPinLinkedEntityIds((prev) =>
                                    prev.filter((x) => x !== id)
                                  )
                                }
                                className="text-zinc-400 hover:text-rose-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <input
                      type="text"
                      value={modalWikiSearch}
                      onChange={(e) => setModalWikiSearch(e.target.value)}
                      placeholder="Buscar entidades na Wiki para vincular..."
                      className="input-clean w-full px-2.5 py-1 rounded-md text-[11px]"
                    />
                    {modalWikiSearch.trim().length > 0 && (
                      <div className="max-h-28 overflow-y-auto bg-[#09090b] p-1 rounded-lg border border-white/[0.07] space-y-0.5">
                        {filteredModalEntities.map((ent) => {
                          const checked = pinLinkedEntityIds.includes(ent.id);
                          return (
                            <button
                              key={ent.id}
                              type="button"
                              onClick={() =>
                                setPinLinkedEntityIds((prev) =>
                                  checked
                                    ? prev.filter((x) => x !== ent.id)
                                    : [...prev, ent.id]
                                )
                              }
                              className="w-full px-2 py-1 rounded text-left text-[11px] hover:bg-white/[0.06] flex items-center justify-between"
                            >
                              <span className="truncate text-zinc-200">
                                {ent.name}{' '}
                                <span className="font-mono text-[10px] text-zinc-500">
                                  ({ent.mentionPrefix}
                                  {ent.handle})
                                </span>
                              </span>
                              <span className="text-[10px] text-emerald-400">
                                {checked ? 'Vinculado ✓' : '+ Vincular'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Optional Sub-Map Link */}
              {maps.length > 1 && (
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Conectar a um Sub-Mapa (ex: Cidade → Mapa Tático)
                  </label>
                  <select
                    value={pinLinkedMapId}
                    onChange={(e) => setPinLinkedMapId(e.target.value)}
                    className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                  >
                    <option value="">Sem sub-mapa conectado</option>
                    {maps
                      .filter((m) => m.id !== currentMap.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Descrição (digite @ ou # para autocompletar entidades da Wiki)
                </label>
                <MentionTextarea
                  value={pinDesc}
                  onChange={setPinDesc}
                  rows={3}
                  placeholder="Descrição da área, atmosfera e segredos locais..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={pinMonsters}
                  onChange={(e) => setPinMonsters(e.target.value)}
                  placeholder="Ameaças (ex: 3 Carniçais, @Chefe)"
                  className="input-clean w-full px-3 py-1.5 rounded-lg"
                />
                <input
                  type="text"
                  value={pinTreasures}
                  onChange={(e) => setPinTreasures(e.target.value)}
                  placeholder="Espólios (ex: 120 PO, #ChaveAntiga)"
                  className="input-clean w-full px-3 py-1.5 rounded-lg"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer text-zinc-400 select-none">
                <input
                  type="checkbox"
                  checked={pinSecret}
                  onChange={(e) => setPinSecret(e.target.checked)}
                />
                <span>Ocultar marcador na visão dos jogadores</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingCoords(null)}
                className="btn-subtle px-3.5 py-2 rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-solid px-4 py-2 rounded-lg text-xs"
              >
                Salvar marcador
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Upload Map */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateMap}
            className="w-full max-w-md rounded-2xl bg-[#121215] border border-white/[0.09] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-semibold text-zinc-100">
                Novo mapa interativo
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <input
                type="text"
                required
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                placeholder="Nome do mapa (ex: Cripta — Nível 1)"
                className="input-clean w-full px-3 py-2 rounded-lg"
              />
              <input
                type="text"
                value={newMapSubtitle}
                onChange={(e) => setNewMapSubtitle(e.target.value)}
                placeholder="Escala ou região"
                className="input-clean w-full px-3 py-2 rounded-lg"
              />

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Escala</label>
                <select
                  value={newMapRegionType}
                  onChange={(e) =>
                    setNewMapRegionType(
                      e.target.value as 'regional' | 'tactical' | 'city'
                    )
                  }
                  className="input-clean w-full px-3 py-2 rounded-lg"
                >
                  <option value="regional">Regional / Mundo (escala em km)</option>
                  <option value="city">Cidade / Assentamento (escala em metros)</option>
                  <option value="tactical">Masmorra / Tático (quadrados 1,5m)</option>
                </select>
              </div>

              <div className="p-4 rounded-xl bg-[#0e0e11] border border-dashed border-white/[0.12] text-center space-y-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploadingMap}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-subtle px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUploadingMap ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando imagem...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Selecionar arquivo de imagem</span>
                    </>
                  )}
                </button>
                {uploadedStorageId && (
                  <div className="text-[11px] text-emerald-400 flex items-center justify-center gap-1">
                    <Cloud className="w-3 h-3" />
                    <span>Sincronizado em nuvem</span>
                  </div>
                )}
                <div className="text-[11px] text-zinc-500">
                  ou informe uma URL externa (ou deixe em branco para usar o grid vetorial):
                </div>
                <input
                  type="text"
                  value={newMapUrl}
                  onChange={(e) => {
                    setNewMapUrl(e.target.value);
                    setUploadedStorageId(undefined);
                  }}
                  placeholder="https://exemplo.com/mapa.jpg"
                  className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="btn-subtle px-3.5 py-2 rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUploadingMap}
                className="btn-solid px-4 py-2 rounded-lg text-xs disabled:opacity-50"
              >
                Criar mapa
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
