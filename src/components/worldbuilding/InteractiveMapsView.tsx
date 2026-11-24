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
  // `color` identifica a camada no ícone do marcador e nos filtros. Os marcadores
  // ficam sobre imagens do usuário, então usam cores explícitas (não tokens).
  { label: string; shortLabel: string; color: string }
> = {
  locations: { label: 'Locais e assentamentos', shortLabel: 'Locais', color: '#22a06b' },
  dangers: { label: 'Perigos e masmorras', shortLabel: 'Perigos', color: '#e5484d' },
  quests: { label: 'Ganchos e missões', shortLabel: 'Missões', color: '#d99a1c' },
  secrets: { label: 'Segredos do mestre', shortLabel: 'Segredos', color: '#8e6bd8' },
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
  { label: 'Ocre', hex: '#d4a853' },
  { label: 'Vermelho', hex: '#e11d48' },
  { label: 'Verde', hex: '#10b981' },
  { label: 'Azul', hex: '#38bdf8' },
  { label: 'Violeta', hex: '#a855f7' },
  { label: 'Branco', hex: '#e4e4e7' },
];

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
                    fill="#d4d4d8"
                    fontSize="1.6"
                    fontFamily="IBM Plex Sans, sans-serif"
                  >
                    {shape.label || 'Névoa de guerra'}
                    {shape.isRevealed ? ' (revelada)' : ''}
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
                  fontFamily="IBM Plex Sans, sans-serif"
                  fontWeight="600"
                  stroke="rgba(0,0,0,0.65)"
                  strokeWidth={fs * 0.08}
                  paintOrder="stroke"
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
            {/* Traço duplo (escuro + branco) para ficar legível sobre qualquer imagem */}
            <line
              x1={rulerPoints[0].x}
              y1={rulerPoints[0].y}
              x2={rulerPoints[1].x}
              y2={rulerPoints[1].y}
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="0.7"
            />
            <line
              x1={rulerPoints[0].x}
              y1={rulerPoints[0].y}
              x2={rulerPoints[1].x}
              y2={rulerPoints[1].y}
              stroke="#ffffff"
              strokeWidth="0.35"
              strokeDasharray="0.9 0.6"
            />
            <circle cx={rulerPoints[0].x} cy={rulerPoints[0].y} r="0.7" fill="#ffffff" stroke="#18181b" strokeWidth="0.2" />
            <circle cx={rulerPoints[1].x} cy={rulerPoints[1].y} r="0.7" fill="#ffffff" stroke="#18181b" strokeWidth="0.2" />
            <rect
              x={(rulerPoints[0].x + rulerPoints[1].x) / 2 - 9}
              y={(rulerPoints[0].y + rulerPoints[1].y) / 2 - 3.6}
              width="18"
              height="3.2"
              rx="0.6"
              fill="#18181b"
              fillOpacity="0.92"
              stroke="#ffffff"
              strokeOpacity="0.6"
              strokeWidth="0.15"
            />
            <text
              x={(rulerPoints[0].x + rulerPoints[1].x) / 2}
              y={(rulerPoints[0].y + rulerPoints[1].y) / 2 - 1.5}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="1.55"
              fontFamily="IBM Plex Sans, sans-serif"
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
        className={`absolute group ${
          isSelected ? 'z-30' : 'z-20 hover:z-30'
        } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      >
        {/* Cores explícitas: o marcador precisa ser legível sobre imagens claras e escuras */}
        <div className="relative mx-auto w-fit">
          <div
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mx-auto shadow-[0_1px_3px_rgba(0,0,0,0.45)] ${
              isSelected
                ? 'bg-white border-[#18181b]'
                : 'bg-[#18181b] border-white'
            }`}
            style={{ color: layerStyle.color }}
          >
            <IconComp className="w-4 h-4" />
          </div>

          {(linkedCount > 0 || hasSubMap) && (
            <span
              title={`${linkedCount} vínculo(s) no códice${hasSubMap ? ' e submapa' : ''}`}
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[#18181b] border border-[#18181b]/20 text-xs leading-none font-semibold flex items-center justify-center tabular-nums"
            >
              {hasSubMap ? '↳' : linkedCount}
            </span>
          )}
        </div>

        <div
          className={`mt-1 px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${
            isSelected
              ? 'bg-white text-[#18181b] ring-2 ring-accent'
              : 'bg-[#18181b]/90 text-white'
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

  // Altura do palco acompanha a proporção real da imagem enviada (evita cortes).
  // A largura é fixa (STAGE_W); pins e formas usam coordenadas em %, então continuam alinhados.
  const [stageH, setStageH] = useState(STAGE_H);
  const stageHRef = useRef(STAGE_H);
  const mapImageUrl = currentMap?.customImageUrl;
  useEffect(() => {
    if (!mapImageUrl) {
      stageHRef.current = STAGE_H;
      setStageH(STAGE_H);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
      const h = Math.round((STAGE_W * img.naturalHeight) / img.naturalWidth);
      stageHRef.current = h;
      setStageH(h);
    };
    img.src = mapImageUrl;
    return () => {
      cancelled = true;
    };
  }, [mapImageUrl]);

  // Fit stage inside viewport
  const fitMapToViewport = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    if (vw <= 0 || vh <= 0) return;
    const h = stageHRef.current;
    const fitZ = Math.max(
      MIN_ZOOM,
      Math.min(1.25, Math.min((vw - 32) / STAGE_W, (vh - 32) / h))
    );
    setZoom(Number(fitZ.toFixed(3)));
    setPan({
      x: Math.round((vw - STAGE_W * fitZ) / 2),
      y: Math.round((vh - h * fitZ) / 2),
    });
  }, []);

  const centerOnPercent = useCallback((xPct: number, yPct: number, targetZoom = 1.75) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
    const stageX = (xPct / 100) * STAGE_W;
    const stageY = (yPct / 100) * stageHRef.current;
    setZoom(clampedZoom);
    setPan({
      x: Math.round(vw / 2 - stageX * clampedZoom),
      y: Math.round(vh / 2 - stageY * clampedZoom),
    });
  }, []);

  // Fit on initial mount, map switch or when the image proportions are known
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      fitMapToViewport();
    });
    return () => window.cancelAnimationFrame(id);
  }, [currentMap?.id, stageH, fitMapToViewport]);

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
      const yPct = Math.max(0, Math.min(100, Number(((stageY / stageH) * 100).toFixed(2))));
      return { x: xPct, y: yPct };
    },
    [pan.x, pan.y, zoom, stageH]
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
      showToast('Área de névoa adicionada.');
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
    // y em % da altura → converte para a mesma escala de % da largura
    const dy = ((rulerPoints[1].y - rulerPoints[0].y) * stageH) / STAGE_W;
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
  }, [rulerPoints, currentMap?.regionType, stageH]);

  // Create Pin Submit (with optional 1-click Wiki Entity creation + multi-entity links)
  const handleCreatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMap || !pendingCoords || !pinLabel.trim()) return;

    let finalPrimaryEntityId = pinEntityId || undefined;

    if (!finalPrimaryEntityId && pinAutoCreateWiki) {
      const created = await addEntity({
        name: pinLabel.trim(),
        subtitle: pinSubtitle.trim() || `Local em ${currentMap.name}`,
        category: 'location',
        summary: pinDesc.trim() || `Ponto cartografado em ${currentMap.name}.`,
        publicContent:
          pinDesc.trim() ||
          `Local registrado através do mapa **${currentMap.name}**.`,
        isPublicToPlayers: !pinSecret,
      });
      if (created) finalPrimaryEntityId = created.id;
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
  const handleCreateWikiPageFromActivePin = async () => {
    if (!currentMap || !activePin) return;
    const created = await addEntity({
      name: activePin.label,
      subtitle: activePin.subtitle || `Local em ${currentMap.name}`,
      category: 'location',
      summary: activePin.description || `Ponto cartografado em ${currentMap.name}.`,
      publicContent:
        activePin.description ||
        `Local registrado no mapa **${currentMap.name}**.`,
      isPublicToPlayers: !(activePin.isSecret && !activePin.isRevealed),
    });
    if (!created) return;
    updateMapPin(currentMap.id, activePin.id, { entityId: created.id });
    showToast(`Página #${created.handle} criada no códice e vinculada ao marcador.`);
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

  const isActiveToolClass = 'bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent';
  const showShapeOptions =
    viewRole === 'gm' &&
    activeTool !== 'select' &&
    activeTool !== 'pan' &&
    activeTool !== 'pin' &&
    activeTool !== 'ruler';
  const showPinStamps = viewRole === 'gm' && activeTool === 'pin';

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[520px] card overflow-hidden relative">
      {/* Linha 1: mapas e camadas */}
      <div className="px-3 border-b border-line flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-surface">
        <div className="flex items-center gap-1 overflow-x-auto min-w-0 -mb-px">
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
                className={`tab shrink-0 ${active ? 'tab-active' : ''}`}
              >
                <span>{m.name}</span>
                <span className="text-xs text-fg-subtle tabular-nums">{m.pins.length}</span>
              </button>
            );
          })}

          {viewRole === 'gm' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-ghost btn-sm shrink-0 ml-1"
            >
              <Upload className="w-4 h-4" />
              <span>Novo mapa</span>
            </button>
          )}
        </div>

        {/* Filtros de camada */}
        <div className="flex flex-wrap items-center gap-1 py-2">
          {(Object.keys(LAYER_CONFIG) as MapLayer[]).map((layer) => {
            if (viewRole === 'player' && layer === 'secrets') return null;
            const active = activeLayers[layer];
            return (
              <button
                key={layer}
                onClick={() =>
                  setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
                }
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-surface border-line-strong text-fg'
                    : 'bg-transparent border-transparent text-fg-subtle hover:text-fg-muted'
                }`}
                title={LAYER_CONFIG[layer].label}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: active ? LAYER_CONFIG[layer].color : 'transparent',
                    boxShadow: `inset 0 0 0 1.5px ${LAYER_CONFIG[layer].color}`,
                  }}
                />
                <span>{LAYER_CONFIG[layer].shortLabel}</span>
              </button>
            );
          })}

          <button
            onClick={() => setShowVectorShapes(!showVectorShapes)}
            aria-pressed={showVectorShapes}
            className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border transition-colors ${
              showVectorShapes
                ? 'bg-surface border-line-strong text-fg'
                : 'bg-transparent border-transparent text-fg-subtle hover:text-fg-muted'
            }`}
            title="Mostrar desenhos"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Desenhos</span>
          </button>
        </div>
      </div>

      {/* Linha 2: ferramentas */}
      {currentMap && (
        <div className="px-2 py-1.5 border-b border-line bg-surface flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-0.5">
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
                  <React.Fragment key={tool.id}>
                    {tool.id === 'pin' && <span className="w-px h-5 bg-line mx-1" />}
                    <button
                      onClick={() => {
                        setActiveTool(tool.id);
                        setDrawingPoints([]);
                        if (tool.id !== 'ruler') setRulerPoints([]);
                        if ('defaultName' in tool && tool.defaultName) {
                          setShapeLabel(tool.defaultName);
                        }
                      }}
                      title={tool.label}
                      aria-label={tool.label}
                      aria-pressed={isActive}
                      className={`btn btn-ghost btn-sm px-2 ${isActive ? isActiveToolClass : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden xl:inline">{tool.label}</span>
                    </button>
                  </React.Fragment>
                );
              })}
          </div>

          {viewRole === 'gm' && maps.length >= 1 && (
            <button
              onClick={() => deleteMap(currentMap.id)}
              className="btn btn-danger-ghost btn-sm"
              title="Excluir mapa atual"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Excluir mapa</span>
            </button>
          )}
        </div>
      )}

      {/* Linha 3: opções contextuais da ferramenta */}
      {currentMap && (showPinStamps || showShapeOptions || activeTool === 'ruler') && (
        <div className="px-3 py-2 border-b border-line bg-surface-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          {/* Ícones rápidos do marcador */}
          {showPinStamps && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-fg-muted mr-1">Ícone</span>
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
                    aria-pressed={selected}
                    className={`btn btn-icon h-7 w-7 border ${
                      selected
                        ? 'bg-accent-soft text-accent border-accent/30'
                        : 'bg-surface text-fg-muted border-line hover:text-fg hover:border-line-strong'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
              <span className="text-fg-subtle ml-2">Clique no mapa para posicionar.</span>
            </div>
          )}

          {/* Opções de forma */}
          {showShapeOptions && (
            <>
              <label className="flex items-center gap-2">
                <span className="text-fg-muted">Rótulo</span>
                <input
                  type="text"
                  value={shapeLabel}
                  onChange={(e) => setShapeLabel(e.target.value)}
                  placeholder="Rótulo no mapa"
                  className="input h-8 w-40"
                />
              </label>

              {activeTool !== 'fog' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-fg-muted">Cor</span>
                    <div className="flex items-center gap-1.5">
                      {SHAPE_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setShapeColor(c.hex)}
                          className={`w-5 h-5 rounded-full border border-black/10 transition-shadow ${
                            shapeColor === c.hex
                              ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface-2'
                              : 'hover:ring-2 hover:ring-line-strong'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                          aria-label={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2">
                    <span className="text-fg-muted">Vínculo</span>
                    <select
                      value={shapeEntityId}
                      onChange={(e) => setShapeEntityId(e.target.value)}
                      className="input h-8 w-auto max-w-[180px]"
                      title="Vincular desenho a uma entrada do códice"
                    >
                      <option value="">Nenhum</option>
                      {entities.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {ent.mentionPrefix}
                          {ent.handle} ({ent.name})
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {activeTool === 'circle' && (
                <label className="flex items-center gap-2">
                  <span className="text-fg-muted">Raio</span>
                  <input
                    type="number"
                    min={3}
                    max={40}
                    value={shapeRadius}
                    onChange={(e) => setShapeRadius(Number(e.target.value) || 10)}
                    className="input h-8 w-16 tabular-nums"
                  />
                </label>
              )}

              {activeTool === 'text' && (
                <label className="flex items-center gap-2">
                  <span className="text-fg-muted">Tamanho</span>
                  <select
                    value={shapeFontSize}
                    onChange={(e) => setShapeFontSize(Number(e.target.value))}
                    className="input h-8 w-auto"
                  >
                    <option value={1.8}>Pequeno</option>
                    <option value={2.6}>Médio</option>
                    <option value={3.8}>Grande</option>
                  </select>
                </label>
              )}

              {(activeTool === 'road' ||
                activeTool === 'polygon' ||
                activeTool === 'circle' ||
                activeTool === 'rect') && (
                <label className="flex items-center gap-2 text-fg-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="checkbox"
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
                  className="btn btn-primary btn-sm ml-auto"
                >
                  <Check className="w-4 h-4" />
                  <span>Concluir</span>
                  <span className="tabular-nums opacity-80">({drawingPoints.length})</span>
                </button>
              )}
            </>
          )}

          {activeTool === 'ruler' && (
            <div className="flex items-center gap-2 text-fg-muted">
              <Ruler className="w-4 h-4 text-fg-subtle" />
              <span>
                {rulerPoints.length === 0
                  ? 'Clique no ponto de origem.'
                  : rulerPoints.length === 1
                  ? 'Clique no ponto de destino.'
                  : (
                    <>
                      Distância:{' '}
                      <span className="font-medium text-fg tabular-nums">
                        {rulerDistanceLabel}
                      </span>
                    </>
                  )}
              </span>
              {rulerPoints.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRulerPoints([])}
                  className="btn btn-ghost btn-sm"
                >
                  Limpar
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Área do mapa + inspetor */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {!currentMap ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-surface-2">
            <div className="w-10 h-10 rounded-lg bg-surface border border-line flex items-center justify-center text-fg-subtle">
              <MapIcon className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="section-title">Nenhum mapa cadastrado</h3>
              <p className="text-[13px] text-fg-muted">
                Envie uma imagem de mapa regional, urbano ou tático, ou use uma grade em branco,
                para posicionar marcadores e vinculá-los ao códice.
              </p>
            </div>
            {viewRole === 'gm' && (
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="btn btn-primary"
              >
                <Upload className="w-4 h-4" />
                <span>Criar mapa</span>
              </button>
            )}
          </div>
        ) : (
          <div
            ref={viewportRef}
            onPointerDown={handleViewportPointerDown}
            onPointerMove={handleViewportPointerMove}
            onPointerUp={handleViewportPointerUp}
            className={`flex-1 min-h-[280px] relative overflow-hidden select-none bg-surface-2 ${
              isSpaceHeld || activeTool === 'pan'
                ? 'cursor-grab active:cursor-grabbing'
                : activeTool !== 'select'
                ? 'cursor-crosshair'
                : 'cursor-grab active:cursor-grabbing'
            }`}
          >
            {/* Palco com zoom e pan */}
            <div
              style={{
                width: `${STAGE_W}px`,
                height: `${stageH}px`,
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transformOrigin: '0 0',
                willChange: 'transform',
              }}
              className="relative shadow-card border border-line rounded-sm overflow-hidden bg-surface"
            >
              {/* Imagem do mapa ou fundo procedural */}
              {currentMap.customImageUrl ? (
                <img
                  src={currentMap.customImageUrl}
                  alt={currentMap.name}
                  draggable={false}
                  decoding="async"
                  className="w-full h-full object-contain pointer-events-none select-none"
                />
              ) : currentMap.regionType === 'tactical' ? (
                <svg
                  viewBox="0 0 1280 820"
                  className="w-full h-full pointer-events-none"
                >
                  <rect width="1280" height="820" className="fill-surface" />
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
                        className="stroke-line"
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
                    rx="6"
                    className="fill-surface-2 stroke-line-strong"
                    fillOpacity="0.6"
                    strokeWidth="2"
                  />
                  <text
                    x="640"
                    y="84"
                    textAnchor="middle"
                    className="fill-fg-subtle"
                    fontSize="20"
                    fontWeight="500"
                    fontFamily="IBM Plex Sans, sans-serif"
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
                    <pattern
                      id="studioSubtleGrid"
                      width="48"
                      height="48"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 48 0 L 0 0 0 48"
                        fill="none"
                        className="stroke-line"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="1280" height="820" className="fill-surface" />
                  <rect width="1280" height="820" fill="url(#studioSubtleGrid)" />
                  <text
                    x="640"
                    y="400"
                    textAnchor="middle"
                    className="fill-fg-subtle"
                    fontSize="26"
                    fontWeight="500"
                    fontFamily="IBM Plex Sans, sans-serif"
                  >
                    {currentMap.name}
                  </text>
                  {currentMap.subtitle && (
                    <text
                      x="640"
                      y="432"
                      textAnchor="middle"
                      className="fill-fg-subtle"
                      fontSize="15"
                      fontFamily="IBM Plex Sans, sans-serif"
                      opacity="0.8"
                    >
                      {currentMap.subtitle}
                    </text>
                  )}
                </svg>
              )}

              {/* Grade opcional (quadrada / hexagonal), legível sobre imagens claras e escuras */}
              {gridMode !== 'off' && (
                <svg
                  viewBox={`0 0 ${STAGE_W} ${stageH}`}
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
                          stroke="rgba(0,0,0,0.22)"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M 40 0 L 0 0 0 40"
                          fill="none"
                          stroke="rgba(255,255,255,0.28)"
                          strokeWidth="0.75"
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
                          stroke="rgba(0,0,0,0.22)"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M28 0 L56 14 L56 34.5 L28 48.5 L0 34.5 L0 14 Z"
                          fill="none"
                          stroke="rgba(255,255,255,0.28)"
                          strokeWidth="0.75"
                        />
                      </pattern>
                    )}
                  </defs>
                  <rect
                    width={STAGE_W}
                    height={stageH}
                    fill={
                      gridMode === 'square'
                        ? 'url(#overlaySquareGrid)'
                        : 'url(#overlayHexGrid)'
                    }
                  />
                </svg>
              )}

              {/* Camada vetorial e névoa */}
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

              {/* Marcadores */}
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

            {/* Ir para marcador */}
            <div
              className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-auto"
            >
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
                  className="input h-8 w-auto max-w-[220px] shadow-card"
                >
                  <option value="">Ir para marcador ({visiblePins.length})</option>
                  {visiblePins.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Gerenciador de desenhos e névoa (mestre) */}
            {visibleShapes.length > 0 && viewRole === 'gm' && (
              <div
                className="absolute bottom-3 left-3 z-20 pointer-events-auto"
              >
                {!showShapesDrawer ? (
                  <button
                    type="button"
                    onClick={() => setShowShapesDrawer(true)}
                    className="btn btn-secondary btn-sm shadow-card"
                  >
                    <Layers className="w-4 h-4 text-fg-subtle" />
                    <span>Desenhos</span>
                    <span className="text-fg-subtle tabular-nums">{visibleShapes.length}</span>
                  </button>
                ) : (
                  <div className="card shadow-elevated w-72 max-w-[calc(100vw-3rem)]">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-line">
                      <span className="text-[13px] font-medium text-fg">
                        Desenhos e névoa{' '}
                        <span className="text-fg-subtle tabular-nums">({visibleShapes.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowShapesDrawer(false)}
                        className="btn btn-ghost btn-icon h-7 w-7"
                        title="Fechar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {visibleShapes.map((sh) => {
                        const linkedEnt = sh.entityId
                          ? entitiesMap.get(sh.entityId)
                          : undefined;
                        return (
                          <div
                            key={sh.id}
                            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-surface-2 text-[13px] text-fg"
                          >
                            <div className="min-w-0 flex-1 flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                                style={{
                                  backgroundColor:
                                    sh.type === 'fog' ? '#71717a' : sh.color,
                                }}
                              />
                              <span className="truncate">{sh.label}</span>
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                              {linkedEnt && (
                                <button
                                  type="button"
                                  onClick={() => openEntityInWiki(linkedEnt.id)}
                                  className="text-xs font-mono text-fg-muted hover:text-accent px-1"
                                  title="Abrir no códice"
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
                                  className="btn btn-ghost h-7 px-2 text-xs"
                                  title={
                                    sh.isRevealed
                                      ? 'Ocultar área novamente'
                                      : 'Revelar área aos jogadores'
                                  }
                                >
                                  {sh.isRevealed ? 'Ocultar' : 'Revelar'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteMapShape(currentMap.id, sh.id)}
                                className="btn btn-danger-ghost btn-icon h-7 w-7"
                                title="Remover desenho"
                              >
                                <Trash2 className="w-4 h-4" />
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

            {/* Zoom e grade */}
            <div
              className="absolute bottom-3 right-3 z-20 flex items-center gap-0.5 p-1 rounded-lg bg-surface border border-line shadow-card pointer-events-auto"
            >
              <button
                type="button"
                onClick={() =>
                  setGridMode((prev) =>
                    prev === 'off' ? 'square' : prev === 'square' ? 'hex' : 'off'
                  )
                }
                className={`btn btn-ghost btn-sm px-2 ${gridMode !== 'off' ? isActiveToolClass : ''}`}
                title="Alternar grade (desligada / quadrada / hexagonal)"
              >
                <Grid3X3 className="w-4 h-4" />
                <span className="text-xs">
                  {gridMode === 'off'
                    ? 'Grade'
                    : gridMode === 'square'
                    ? 'Quadrada'
                    : 'Hexagonal'}
                </span>
              </button>

              <span className="w-px h-5 bg-line mx-0.5" />

              <button
                type="button"
                onClick={() => adjustZoomAroundCenter(1 / 1.25)}
                className="btn btn-ghost btn-icon"
                title="Reduzir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={fitMapToViewport}
                className="btn btn-ghost h-8 px-1.5 text-xs tabular-nums min-w-[52px]"
                title="Ajustar à tela"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                type="button"
                onClick={() => adjustZoomAroundCenter(1.25)}
                className="btn btn-ghost btn-icon"
                title="Ampliar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={fitMapToViewport}
                className="btn btn-ghost btn-icon"
                title="Ajustar à tela"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Inspetor do marcador */}
        {activePin && currentMap && (
          <aside className="w-full md:w-80 lg:w-96 shrink-0 max-h-[55%] md:max-h-none bg-surface border-t md:border-t-0 md:border-l border-line flex flex-col overflow-y-auto z-20">
            {isEditingPin && editDraft && viewRole === 'gm' ? (
              <form onSubmit={saveEditedPin} className="flex flex-col min-h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                  <span className="section-title">Editar marcador</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingPin(false)}
                    className="btn btn-ghost btn-icon"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-4 flex-1">
                  <div>
                    <label className="label">Nome</label>
                    <input
                      type="text"
                      required
                      value={editDraft.label}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, label: e.target.value })
                      }
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">Subtítulo</label>
                    <input
                      type="text"
                      value={editDraft.subtitle}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, subtitle: e.target.value })
                      }
                      className="input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Camada</label>
                      <select
                        value={editDraft.layer}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            layer: e.target.value as MapLayer,
                          })
                        }
                        className="input"
                      >
                        <option value="locations">Locais</option>
                        <option value="dangers">Perigos</option>
                        <option value="quests">Missões</option>
                        <option value="secrets">Segredos</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Ícone</label>
                      <select
                        value={editDraft.iconType}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            iconType: e.target.value as MapPinIcon,
                          })
                        }
                        className="input"
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
                    <label className="label">Página principal no códice</label>
                    <select
                      value={editDraft.entityId}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, entityId: e.target.value })
                      }
                      className="input"
                    >
                      <option value="">Nenhuma</option>
                      {entities.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {ent.mentionPrefix}
                          {ent.handle} — {ent.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Submapa</label>
                    <select
                      value={editDraft.linkedMapId}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, linkedMapId: e.target.value })
                      }
                      className="input"
                    >
                      <option value="">Nenhum</option>
                      {maps
                        .filter((m) => m.id !== currentMap.id)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.regionType})
                          </option>
                        ))}
                    </select>
                    <p className="hint">Ex.: interior de um edifício ou mapa da cidade.</p>
                  </div>

                  <div>
                    <label className="label">Descrição</label>
                    <MentionTextarea
                      value={editDraft.description}
                      onChange={(val) =>
                        setEditDraft({ ...editDraft, description: val })
                      }
                      rows={4}
                    />
                    <p className="hint">Aceita menções com @ e #.</p>
                  </div>

                  <div>
                    <label className="label">Ameaças</label>
                    <input
                      type="text"
                      value={editDraft.monsters}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, monsters: e.target.value })
                      }
                      className="input"
                    />
                    <p className="hint">Separe por vírgula.</p>
                  </div>

                  <div>
                    <label className="label">Espólios</label>
                    <input
                      type="text"
                      value={editDraft.treasures}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, treasures: e.target.value })
                      }
                      className="input"
                    />
                    <p className="hint">Separe por vírgula.</p>
                  </div>
                </div>

                <div className="sticky bottom-0 flex justify-end gap-2 px-4 py-3 border-t border-line bg-surface">
                  <button
                    type="button"
                    onClick={() => setIsEditingPin(false)}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Save className="w-4 h-4" />
                    <span>Salvar</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-line">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: LAYER_CONFIG[activePin.layer].color }}
                        />
                        {LAYER_CONFIG[activePin.layer].label}
                      </span>
                      <span className="font-mono text-fg-subtle tabular-nums">
                        {activePin.x.toFixed(1)}%, {activePin.y.toFixed(1)}%
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-fg break-words">
                      {activePin.label}
                    </h3>
                    <p className="text-[13px] text-fg-muted">{activePin.subtitle}</p>
                  </div>

                  <div className="flex items-center shrink-0">
                    {viewRole === 'gm' && (
                      <button
                        type="button"
                        onClick={startEditingActivePin}
                        className="btn btn-ghost btn-icon"
                        title="Editar marcador"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedPinId(null)}
                      className="btn btn-ghost btn-icon"
                      title="Fechar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-5 flex-1">
                  {/* Submapa */}
                  {linkedSubMap && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMapId(linkedSubMap.id);
                        setSelectedPinId(linkedSubMap.pins[0]?.id || null);
                      }}
                      className="btn btn-secondary w-full justify-between"
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <CornerDownRight className="w-4 h-4 text-fg-subtle shrink-0" />
                        <span className="truncate">Abrir submapa: {linkedSubMap.name}</span>
                      </span>
                      <ExternalLink className="w-4 h-4 text-fg-subtle shrink-0" />
                    </button>
                  )}

                  {/* Descrição */}
                  <div className="text-sm text-fg leading-relaxed">
                    <MentionText text={activePin.description} />
                  </div>

                  {/* Vínculos com o códice */}
                  <section className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-[13px] font-semibold text-fg flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-fg-subtle" />
                        Códice
                      </h4>
                      {viewRole === 'gm' && !primaryPinEntity && (
                        <button
                          type="button"
                          onClick={handleCreateWikiPageFromActivePin}
                          className="btn btn-ghost btn-sm"
                          title="Cria uma entrada de local no códice com os dados deste marcador"
                        >
                          <BookPlus className="w-4 h-4" />
                          <span>Criar página</span>
                        </button>
                      )}
                    </div>

                    {primaryPinEntity && (
                      <button
                        type="button"
                        onClick={() => openEntityInWiki(primaryPinEntity.id)}
                        className="w-full px-3 py-2 rounded-md border border-line bg-surface hover:bg-surface-2 hover:border-line-strong flex items-center justify-between gap-2 text-left transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-xs text-fg-subtle">
                            Página principal ·{' '}
                            <span className="font-mono">
                              {primaryPinEntity.mentionPrefix}
                              {primaryPinEntity.handle}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-fg truncate">
                            {primaryPinEntity.name}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-fg-subtle shrink-0" />
                      </button>
                    )}

                    {secondaryPinEntities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {secondaryPinEntities.map((ent) => (
                          <div
                            key={ent.id}
                            className="inline-flex items-center gap-1 h-7 pl-2 pr-1 rounded-md bg-surface-2 border border-line text-[13px] text-fg"
                          >
                            <button
                              type="button"
                              onClick={() => openEntityInWiki(ent.id)}
                              className="hover:text-accent truncate max-w-[180px]"
                            >
                              {ent.name}{' '}
                              <span className="font-mono text-xs text-fg-subtle">
                                {ent.mentionPrefix}
                                {ent.handle}
                              </span>
                            </button>
                            {viewRole === 'gm' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleLinkedEntityOnActivePin(ent.id)
                                }
                                className="p-0.5 rounded text-fg-subtle hover:text-danger"
                                title="Desvincular"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {!primaryPinEntity && secondaryPinEntities.length === 0 && (
                      <p className="text-[13px] text-fg-subtle">Nenhuma entrada vinculada.</p>
                    )}

                    {viewRole === 'gm' && entities.length > 0 && (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={inspectorWikiSearch}
                          onChange={(e) => setInspectorWikiSearch(e.target.value)}
                          placeholder="Vincular entrada do códice"
                          className="input h-8"
                        />
                        {inspectorWikiSearch.trim().length > 0 && (
                          <div className="max-h-40 overflow-y-auto p-1 rounded-md border border-line bg-surface shadow-card">
                            {filteredInspectorEntities.length === 0 ? (
                              <div className="text-[13px] text-fg-subtle px-2 py-1.5">
                                Nenhuma entrada encontrada.
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
                                    className="w-full px-2 py-1.5 rounded text-left text-[13px] hover:bg-surface-2 flex items-center justify-between gap-2"
                                  >
                                    <span className="truncate text-fg">
                                      {ent.name}{' '}
                                      <span className="font-mono text-xs text-fg-subtle">
                                        {ent.mentionPrefix}
                                        {ent.handle}
                                      </span>
                                    </span>
                                    <span className="text-xs text-fg-muted shrink-0">
                                      {alreadyLinked ? 'Remover' : 'Vincular'}
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Ameaças */}
                  <section className="space-y-2">
                    <h4 className="text-[13px] font-semibold text-fg flex items-center gap-2">
                      <Swords className="w-4 h-4 text-fg-subtle" />
                      Ameaças
                    </h4>
                    {activePin.monsters.length === 0 ? (
                      <p className="text-[13px] text-fg-subtle">Nenhuma ameaça registrada.</p>
                    ) : (
                      <div className="rounded-md border border-line divide-y divide-line">
                        {activePin.monsters.map((m, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 flex items-center justify-between gap-2 text-sm"
                          >
                            <div className="text-fg min-w-0">
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
                                className="btn btn-secondary btn-sm shrink-0"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Combate</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Espólios */}
                  <section className="space-y-2">
                    <h4 className="text-[13px] font-semibold text-fg flex items-center gap-2">
                      <Coins className="w-4 h-4 text-fg-subtle" />
                      Espólios
                    </h4>
                    {activePin.treasures.length === 0 ? (
                      <p className="text-[13px] text-fg-subtle">Nenhum item listado.</p>
                    ) : (
                      <div className="rounded-md border border-line divide-y divide-line">
                        {activePin.treasures.map((tr, idx) => (
                          <div key={idx} className="px-3 py-2 text-sm text-fg">
                            <MentionText text={tr} />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                {viewRole === 'gm' && (
                  <div className="sticky bottom-0 px-4 py-3 border-t border-line bg-surface flex items-center gap-2">
                    <button
                      onClick={() => toggleRevealMapPin(currentMap.id, activePin.id)}
                      className={`btn flex-1 ${
                        activePin.isSecret && !activePin.isRevealed
                          ? 'btn-primary'
                          : 'btn-secondary'
                      }`}
                    >
                      {activePin.isSecret && !activePin.isRevealed ? (
                        <>
                          <Eye className="w-4 h-4" />
                          <span>Revelar aos jogadores</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4" />
                          <span>Ocultar dos jogadores</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        deleteMapPin(currentMap.id, activePin.id);
                        setSelectedPinId(null);
                      }}
                      className="btn btn-danger-ghost btn-icon h-9 w-9"
                      title="Remover marcador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </aside>
        )}
      </div>

      {/* Modal: novo marcador */}
      {pendingCoords && currentMap && (
        <div className="modal-backdrop">
          <form onSubmit={handleCreatePin} className="modal max-w-lg max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="section-title">
                Novo marcador{' '}
                <span className="font-mono text-xs text-fg-subtle font-normal tabular-nums">
                  {pendingCoords.x.toFixed(1)}%, {pendingCoords.y.toFixed(1)}%
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setPendingCoords(null)}
                className="btn btn-ghost btn-icon"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Nome</label>
                  <input
                    type="text"
                    required
                    value={pinLabel}
                    onChange={(e) => setPinLabel(e.target.value)}
                    placeholder="Ex.: Fortaleza Cinza"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Subtítulo</label>
                  <input
                    type="text"
                    value={pinSubtitle}
                    onChange={(e) => setPinSubtitle(e.target.value)}
                    placeholder="Ex.: Posto da guarda norte"
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Camada</label>
                  <select
                    value={pinLayer}
                    onChange={(e) => setPinLayer(e.target.value as MapLayer)}
                    className="input"
                  >
                    <option value="locations">Locais e assentamentos</option>
                    <option value="dangers">Perigos e masmorras</option>
                    <option value="quests">Ganchos e missões</option>
                    <option value="secrets">Segredos do mestre</option>
                  </select>
                </div>

                <div>
                  <label className="label">Ícone</label>
                  <select
                    value={pinIcon}
                    onChange={(e) => {
                      const ic = e.target.value as MapPinIcon;
                      setPinIcon(ic);
                    }}
                    className="input"
                  >
                    {(Object.keys(PIN_ICON_META) as MapPinIcon[]).map((k) => (
                      <option key={k} value={k}>
                        {PIN_ICON_META[k].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vínculo com o códice */}
              <div className="card-muted p-3 space-y-3">
                <div>
                  <label className="label">Página principal no códice</label>
                  <select
                    value={pinEntityId}
                    onChange={(e) => {
                      setPinEntityId(e.target.value);
                      if (e.target.value) setPinAutoCreateWiki(false);
                    }}
                    className="input"
                  >
                    <option value="">Nenhuma</option>
                    {entities.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.mentionPrefix}
                        {e.handle} — {e.name}
                      </option>
                    ))}
                  </select>
                  {!pinEntityId && (
                    <label className="mt-2 inline-flex items-center gap-2 text-[13px] text-fg-muted cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={pinAutoCreateWiki}
                        onChange={(e) => setPinAutoCreateWiki(e.target.checked)}
                      />
                      <span>Criar entrada de local no códice</span>
                    </label>
                  )}
                </div>

                {entities.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="label mb-0">Outras entradas presentes aqui</label>
                    {pinLinkedEntityIds.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {pinLinkedEntityIds.map((id) => {
                          const ent = entitiesMap.get(id);
                          if (!ent) return null;
                          return (
                            <span key={id} className="badge bg-surface font-mono">
                              {ent.mentionPrefix}
                              {ent.handle}
                              <button
                                type="button"
                                onClick={() =>
                                  setPinLinkedEntityIds((prev) =>
                                    prev.filter((x) => x !== id)
                                  )
                                }
                                className="text-fg-subtle hover:text-danger"
                                title="Remover"
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
                      placeholder="Buscar NPCs, facções, itens"
                      className="input h-8"
                    />
                    {modalWikiSearch.trim().length > 0 && (
                      <div className="max-h-32 overflow-y-auto p-1 rounded-md border border-line bg-surface">
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
                              className="w-full px-2 py-1.5 rounded text-left text-[13px] hover:bg-surface-2 flex items-center justify-between gap-2"
                            >
                              <span className="truncate text-fg">
                                {ent.name}{' '}
                                <span className="font-mono text-xs text-fg-subtle">
                                  {ent.mentionPrefix}
                                  {ent.handle}
                                </span>
                              </span>
                              <span
                                className={`text-xs shrink-0 inline-flex items-center gap-1 ${
                                  checked ? 'text-accent' : 'text-fg-muted'
                                }`}
                              >
                                {checked && <Check className="w-3.5 h-3.5" />}
                                {checked ? 'Vinculado' : 'Vincular'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {maps.length > 1 && (
                <div>
                  <label className="label">Submapa</label>
                  <select
                    value={pinLinkedMapId}
                    onChange={(e) => setPinLinkedMapId(e.target.value)}
                    className="input"
                  >
                    <option value="">Nenhum</option>
                    {maps
                      .filter((m) => m.id !== currentMap.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                  <p className="hint">Ex.: da cidade para o mapa tático.</p>
                </div>
              )}

              <div>
                <label className="label">Descrição</label>
                <MentionTextarea
                  value={pinDesc}
                  onChange={setPinDesc}
                  rows={3}
                  placeholder="Área, atmosfera e segredos locais"
                />
                <p className="hint">Digite @ ou # para mencionar entradas do códice.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Ameaças</label>
                  <input
                    type="text"
                    value={pinMonsters}
                    onChange={(e) => setPinMonsters(e.target.value)}
                    placeholder="Ex.: 3 Carniçais, @Chefe"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Espólios</label>
                  <input
                    type="text"
                    value={pinTreasures}
                    onChange={(e) => setPinTreasures(e.target.value)}
                    placeholder="Ex.: 120 PO, #ChaveAntiga"
                    className="input"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={pinSecret}
                  onChange={(e) => setPinSecret(e.target.checked)}
                />
                <span>Ocultar dos jogadores</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-line bg-surface-2">
              <button
                type="button"
                onClick={() => setPendingCoords(null)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Salvar marcador
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: novo mapa */}
      {showUploadModal && (
        <div className="modal-backdrop">
          <form onSubmit={handleCreateMap} className="modal max-w-md max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="section-title">Novo mapa</h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="btn btn-ghost btn-icon"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="label">Nome</label>
                <input
                  type="text"
                  required
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  placeholder="Ex.: Cripta — Nível 1"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Descrição</label>
                <input
                  type="text"
                  value={newMapSubtitle}
                  onChange={(e) => setNewMapSubtitle(e.target.value)}
                  placeholder="Escala ou região"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Escala</label>
                <select
                  value={newMapRegionType}
                  onChange={(e) =>
                    setNewMapRegionType(
                      e.target.value as 'regional' | 'tactical' | 'city'
                    )
                  }
                  className="input"
                >
                  <option value="regional">Regional / mundo (km)</option>
                  <option value="city">Cidade / assentamento (metros)</option>
                  <option value="tactical">Masmorra / tático (quadrados de 1,5 m)</option>
                </select>
              </div>

              <div>
                <label className="label">Imagem</label>
                <div className="rounded-lg border border-dashed border-line-strong bg-surface-2 p-4 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={isUploadingMap}
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary"
                    >
                      {isUploadingMap ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enviando…</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Selecionar arquivo</span>
                        </>
                      )}
                    </button>
                    {uploadedStorageId && (
                      <span className="badge badge-success">
                        <Cloud className="w-3 h-3" />
                        Enviado
                      </span>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newMapUrl}
                      onChange={(e) => {
                        setNewMapUrl(e.target.value);
                        setUploadedStorageId(undefined);
                      }}
                      placeholder="https://exemplo.com/mapa.jpg"
                      className="input"
                    />
                    <p className="hint">
                      Ou informe uma URL. Deixe em branco para usar uma grade sem imagem.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-line bg-surface-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" disabled={isUploadingMap} className="btn btn-primary">
                Criar mapa
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
