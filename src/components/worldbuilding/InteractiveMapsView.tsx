import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Brush,
  Check,
  Circle as CircleIcon,
  CloudOff,
  Compass,
  Download,
  Eraser,
  Eye,
  EyeOff,
  Frame,
  Grid3X3,
  Hand,
  Hexagon,
  Highlighter,
  Layers,
  Lock,
  Magnet,
  Map as MapIcon,
  MapPin as MapPinIconLucide,
  Maximize2,
  Minimize2,
  MousePointer2,
  MoveUpRight,
  PenTool,
  Plus,
  Redo2,
  Ruler,
  SlidersHorizontal,
  Square,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Waves,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import type {
  DrawingToolType,
  Entity,
  MapCanvasTheme,
  MapDrawingShape,
  MapGridMode,
  MapLayer,
  MapPin,
  MapPinIcon,
} from '../../types/campaign';
import { useConfirm } from '../common/Modal';
import {
  BoundingBox,
  CANVAS_THEMES,
  DEFAULT_STAGE_H,
  DEFAULT_STAGE_W,
  LAYER_CONFIG,
  MAP_STAMPS,
  MAX_ZOOM,
  MIN_ZOOM,
  PIN_ICON_META,
  Point,
  STICKY_PALETTE,
  STROKE_PALETTE,
  boxesIntersect,
  formatPathDistance,
  getShapeBounds,
  resizeShapeToBounds,
  round2,
  simplifyPoints,
  translateShape,
} from './maps/mapConstants';
import { CanvasVectorStage, ResizeHandleId } from './maps/CanvasVectorStage';
import { FloatingShapeToolbar } from './maps/FloatingShapeToolbar';
import {
  MapSettingsModal,
  MapSettingsSubmitPayload,
} from './maps/MapSettingsModal';
import {
  CreatePinModal,
  CreatePinSubmitData,
  MapPinInspector,
  MapPinMarker,
} from './maps/MapPinInspectorAndModal';

type InteractionState =
  | { kind: 'none' }
  | {
      kind: 'pan';
      startClientX: number;
      startClientY: number;
      originPanX: number;
      originPanY: number;
      moved: boolean;
    }
  | {
      kind: 'freehand';
      tool: 'freehand' | 'highlighter';
      rawPoints: Point[];
    }
  | {
      kind: 'eraser';
      erasedIds: Set<string>;
      baseShapes: MapDrawingShape[];
    }
  | {
      kind: 'drag_create';
      tool: 'rect' | 'circle' | 'sticky' | 'frame' | 'stamp' | 'fog' | 'arrow';
      startPt: Point;
      currentPt: Point;
    }
  | {
      kind: 'marquee';
      startPt: Point;
      currentPt: Point;
      additive: boolean;
      initialSelected: string[];
    }
  | {
      kind: 'move_shapes';
      startPt: Point;
      baseShapes: MapDrawingShape[];
      selectedIds: Set<string>;
      moved: boolean;
    }
  | {
      kind: 'resize_shapes';
      handle: ResizeHandleId;
      startPt: Point;
      initialUnionBounds: BoundingBox;
      initialShapeBounds: Map<string, BoundingBox>;
      baseShapes: MapDrawingShape[];
      selectedIds: Set<string>;
    }
  | {
      kind: 'rotate_shape';
      shapeId: string;
      center: Point;
      baseShapes: MapDrawingShape[];
    }
  | {
      kind: 'move_vertex';
      shapeId: string;
      vertexIndex: number;
      baseShapes: MapDrawingShape[];
    };

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
  const updateMap = useCampaignStore((s) => s.updateMap);
  const deleteMap = useCampaignStore((s) => s.deleteMap);
  const addMapPin = useCampaignStore((s) => s.addMapPin);
  const updateMapPin = useCampaignStore((s) => s.updateMapPin);
  const deleteMapPin = useCampaignStore((s) => s.deleteMapPin);
  const toggleRevealMapPin = useCampaignStore((s) => s.toggleRevealMapPin);
  const setMapShapes = useCampaignStore((s) => s.setMapShapes);
  const setSelectedEntityId = useCampaignStore((s) => s.setSelectedEntityId);
  const setWorldSubTab = useCampaignStore((s) => s.setWorldSubTab);
  const addCombatant = useCampaignStore((s) => s.addCombatant);
  const showToast = useCampaignStore((s) => s.showToast);
  const confirm = useConfirm();

  const currentMap = maps.find((m) => m.id === selectedMapId) || maps[0];
  const isGm = viewRole === 'gm';

  const entitiesMap = useMemo(() => {
    const m = new Map<string, Entity>();
    for (const e of entities) m.set(e.id, e);
    return m;
  }, [entities]);

  // Viewport, Zoom, Pan & Fullscreen
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 28 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // Stage dimensions & theme derived from map (with auto image aspect ratio support)
  const stageW = currentMap?.stageWidth || DEFAULT_STAGE_W;
  const [naturalStageH, setNaturalStageH] = useState<number | null>(null);
  const stageH = naturalStageH || currentMap?.stageHeight || DEFAULT_STAGE_H;
  const stageWRef = useRef(stageW);
  const stageHRef = useRef(stageH);
  stageWRef.current = stageW;
  stageHRef.current = stageH;

  const canvasTheme: MapCanvasTheme = currentMap?.canvasTheme || 'obsidian';
  const themeMeta = CANVAS_THEMES[canvasTheme] || CANVAS_THEMES.obsidian;
  const gridMode: MapGridMode = currentMap?.gridMode || 'dots';
  const gridSize = currentMap?.gridSize || 40;
  const gridOpacity = currentMap?.gridOpacity ?? 0.38;
  const imageOpacity = currentMap?.imageOpacity ?? 1;

  useEffect(() => {
    const url = currentMap?.customImageUrl;
    if (!url) {
      setNaturalStageH(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
      const computedH = Math.round((stageWRef.current * img.naturalHeight) / img.naturalWidth);
      setNaturalStageH(computedH);
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [currentMap?.customImageUrl, currentMap?.stageWidth]);

  // Tool & Active Drawing Presets
  const [activeTool, setActiveTool] = useState<DrawingToolType>('select');
  const [openDockMenu, setOpenDockMenu] = useState<
    'pen' | 'shapes' | 'lines' | 'stamps' | 'fog' | null
  >(null);
  const [brushColor, setBrushColor] = useState('#d4a853');
  const [brushFillColor, setBrushFillColor] = useState('');
  const [stickyColor, setStickyColor] = useState(STICKY_PALETTE[0].hex);
  const [brushWidth, setBrushWidth] = useState(3);
  const [brushDash, setBrushDash] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [brushCloseFreehand, setBrushCloseFreehand] = useState(false);
  const [activeStampId, setActiveStampId] = useState('mountains');
  const [defaultPinIcon, setDefaultPinIcon] = useState<MapPinIcon>('castle');
  const [defaultPinLayer, setDefaultPinLayer] = useState<MapLayer>('locations');

  // Layer Visibility Filters
  const [activeLayers, setActiveLayers] = useState<Record<MapLayer, boolean>>({
    locations: true,
    dangers: true,
    quests: true,
    secrets: true,
  });
  const [showVectorShapes, setShowVectorShapes] = useState(true);
  const [showLayersDrawer, setShowLayersDrawer] = useState(false);

  // Selection, Live Drag Override, Inline Text Editing & Undo/Redo Stacks
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [liveShapesOverride, setLiveShapesOverride] = useState<MapDrawingShape[] | null>(
    null
  );
  const [dragDraftShape, setDragDraftShape] = useState<MapDrawingShape | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<BoundingBox | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [liveCursorPoint, setLiveCursorPoint] = useState<Point | null>(null);
  const [rulerPoints, setRulerPoints] = useState<Point[]>([]);
  const [draggingPin, setDraggingPin] = useState<{ id: string; x: number; y: number } | null>(
    null
  );
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [editingShapeText, setEditingShapeText] = useState('');

  // Per-map Undo/Redo & Clipboard
  const historyRef = useRef<
    Map<string, { past: MapDrawingShape[][]; future: MapDrawingShape[][] }>
  >(new Map());
  const [historyTick, setHistoryTick] = useState(0);
  const clipboardRef = useRef<MapDrawingShape[]>([]);
  const interactionRef = useRef<InteractionState>({ kind: 'none' });

  // Modals
  const [settingsModal, setSettingsModal] = useState<'create' | 'edit' | null>(null);
  const [pendingPinCoords, setPendingPinCoords] = useState<Point | null>(null);

  const serverShapes = currentMap?.shapes || [];
  const effectiveShapes = liveShapesOverride ?? serverShapes;

  const commitShapesWithHistory = useCallback(
    (nextShapes: MapDrawingShape[], label = 'atualizar o canvas') => {
      if (!currentMap) return;
      const entry = historyRef.current.get(currentMap.id) || { past: [], future: [] };
      const prevSnapshot = currentMap.shapes || [];
      entry.past = [...entry.past.slice(-49), prevSnapshot];
      entry.future = [];
      historyRef.current.set(currentMap.id, entry);
      setHistoryTick((t) => t + 1);
      setLiveShapesOverride(null);
      void setMapShapes(currentMap.id, nextShapes, label);
    },
    [currentMap, setMapShapes]
  );

  const handleUndo = useCallback(() => {
    if (!currentMap || !isGm) return;
    const entry = historyRef.current.get(currentMap.id);
    if (!entry || entry.past.length === 0) return;
    const previous = entry.past[entry.past.length - 1];
    entry.past = entry.past.slice(0, -1);
    entry.future = [currentMap.shapes || [], ...entry.future.slice(0, 49)];
    historyRef.current.set(currentMap.id, entry);
    setHistoryTick((t) => t + 1);
    void setMapShapes(currentMap.id, previous, 'desfazer');
  }, [currentMap, isGm, setMapShapes]);

  const handleRedo = useCallback(() => {
    if (!currentMap || !isGm) return;
    const entry = historyRef.current.get(currentMap.id);
    if (!entry || entry.future.length === 0) return;
    const next = entry.future[0];
    entry.future = entry.future.slice(1);
    entry.past = [...entry.past.slice(-49), currentMap.shapes || []];
    historyRef.current.set(currentMap.id, entry);
    setHistoryTick((t) => t + 1);
    void setMapShapes(currentMap.id, next, 'refazer');
  }, [currentMap, isGm, setMapShapes]);

  const currentHistory = currentMap ? historyRef.current.get(currentMap.id) : undefined;
  const canUndo = Boolean(currentHistory && currentHistory.past.length > 0);
  const canRedo = Boolean(currentHistory && currentHistory.future.length > 0);
  void historyTick;

  // Fit & Center Viewport
  const fitMapToViewport = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    if (vw <= 0 || vh <= 0) return;
    const w = stageWRef.current;
    const h = stageHRef.current;
    const fitZ = Math.max(
      MIN_ZOOM,
      Math.min(1.2, Math.min((vw - 96) / w, (vh - 64) / h))
    );
    setZoom(Number(fitZ.toFixed(3)));
    setPan({
      x: Math.round((vw - w * fitZ) / 2),
      y: Math.round((vh - h * fitZ) / 2),
    });
  }, []);

  const centerOnPercent = useCallback((xPct: number, yPct: number, targetZoom = 1.65) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
    const sx = (xPct / 100) * stageWRef.current;
    const sy = (yPct / 100) * stageHRef.current;
    setZoom(clampedZoom);
    setPan({
      x: Math.round(vw / 2 - sx * clampedZoom),
      y: Math.round(vh / 2 - sy * clampedZoom),
    });
  }, []);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => fitMapToViewport());
    return () => window.cancelAnimationFrame(id);
  }, [currentMap?.id, stageH, stageW, isFullscreen, fitMapToViewport]);

  // Clear transient state on map switch
  useEffect(() => {
    setSelectedShapeIds([]);
    setDrawingPoints([]);
    setRulerPoints([]);
    setEditingShapeId(null);
    setLiveShapesOverride(null);
  }, [currentMap?.id]);

  // Cross-module focus ("Ver no Mapa")
  useEffect(() => {
    if (!focusMapPin) return;
    const targetMap = maps.find((m) => m.id === focusMapPin.mapId);
    if (targetMap) {
      if (selectedMapId !== targetMap.id) setSelectedMapId(targetMap.id);
      const targetPin = targetMap.pins.find((p) => p.id === focusMapPin.pinId);
      if (targetPin) {
        setSelectedPinId(targetPin.id);
        window.requestAnimationFrame(() =>
          centerOnPercent(targetPin.x, targetPin.y, 1.85)
        );
      }
    }
    clearFocusMapPin();
  }, [focusMapPin, maps, selectedMapId, setSelectedMapId, centerOnPercent, clearFocusMapPin]);

  // Coordinate Conversion + Optional Snap-to-Grid
  const clientToStagePercent = useCallback(
    (clientX: number, clientY: number, applySnap = false): Point | null => {
      const vp = viewportRef.current;
      if (!vp) return null;
      const rect = vp.getBoundingClientRect();
      let sx = (clientX - rect.left - pan.x) / zoom;
      let sy = (clientY - rect.top - pan.y) / zoom;
      if (applySnap && snapToGrid && gridSize > 4) {
        const step = gridSize / 2;
        sx = Math.round(sx / step) * step;
        sy = Math.round(sy / step) * step;
      }
      // Allow drawing slightly outside 0..100 (-25..125) for infinite-board flexibility
      const xPct = Math.max(-25, Math.min(125, round2((sx / stageW) * 100)));
      const yPct = Math.max(-25, Math.min(125, round2((sy / stageH) * 100)));
      return { x: xPct, y: yPct };
    },
    [pan.x, pan.y, zoom, stageW, stageH, snapToGrid, gridSize]
  );

  // Wheel Zoom (centered on cursor) & Trackpad Pan
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Shift+Wheel or trackpad horizontal delta pans smoothly
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        return;
      }
      const rect = vp.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom((prevZoom) => {
        const nextZoom = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, Number((prevZoom * factor).toFixed(3)))
        );
        setPan((prevPan) => {
          const sx = (cursorX - prevPan.x) / prevZoom;
          const sy = (cursorY - prevPan.y) / prevZoom;
          return {
            x: cursorX - sx * nextZoom,
            y: cursorY - sy * nextZoom,
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
        const sx = (cx - prevPan.x) / prevZoom;
        const sy = (cy - prevPan.y) / prevZoom;
        return { x: cx - sx * nextZoom, y: cy - sy * nextZoom };
      });
      return nextZoom;
    });
  };

  // Filtered Visible Pins & Shapes
  const visiblePins = useMemo(() => {
    return (currentMap?.pins || []).filter((p) => {
      if (!activeLayers[p.layer]) return false;
      if (!isGm && p.isSecret && !p.isRevealed) return false;
      return true;
    });
  }, [currentMap?.pins, activeLayers, isGm]);

  const visibleShapes = useMemo(() => {
    return effectiveShapes.filter((s) => {
      const isFog = s.type === 'fog' || s.type === 'fog_poly';
      if (!showVectorShapes && !isFog) return false;
      if (!isGm && s.isSecret && !s.isRevealed && !isFog) return false;
      return true;
    });
  }, [effectiveShapes, showVectorShapes, isGm]);

  const activePin: MapPin | undefined = useMemo(
    () => visiblePins.find((p) => p.id === selectedPinId),
    [visiblePins, selectedPinId]
  );

  const selectedShapes = useMemo(() => {
    if (selectedShapeIds.length === 0) return [];
    const set = new Set(selectedShapeIds);
    return effectiveShapes.filter((s) => set.has(s.id));
  }, [effectiveShapes, selectedShapeIds]);

  const framesList = useMemo(
    () => visibleShapes.filter((s) => s.type === 'frame'),
    [visibleShapes]
  );

  // Finish Multi-Point Shape (Polygon, Road, River, Fog Poly)
  const finishMultiPointDrawing = useCallback(() => {
    if (!currentMap || !isGm) return;
    const isPoly = activeTool === 'polygon' || activeTool === 'fog_poly';
    const minPts = isPoly ? 3 : 2;
    if (drawingPoints.length < minPts) {
      setDrawingPoints([]);
      return;
    }

    const id = `shape-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
    let newShape: MapDrawingShape;
    if (activeTool === 'fog_poly') {
      newShape = {
        id,
        type: 'fog_poly',
        label: 'Névoa de Guerra',
        color: '#09090b',
        strokeWidth: 1,
        opacity: 0.95,
        points: drawingPoints,
        isSecret: true,
        isRevealed: false,
      };
    } else {
      const sType =
        activeTool === 'polygon'
          ? 'polygon'
          : activeTool === 'river'
          ? 'river'
          : 'road';
      newShape = {
        id,
        type: sType,
        label: '',
        color: sType === 'river' && brushColor === '#d4a853' ? '#0ea5e9' : brushColor,
        fillColor: sType === 'polygon' ? brushFillColor || brushColor : undefined,
        strokeWidth: brushWidth,
        strokeStyle: sType === 'river' ? 'solid' : brushDash,
        dashed: brushDash === 'dashed',
        curved: sType === 'river',
        opacity: sType === 'polygon' ? 0.22 : 0.95,
        points: drawingPoints,
        isSecret: false,
        isRevealed: true,
      };
    }

    commitShapesWithHistory([...serverShapes, newShape], 'criar forma');
    setDrawingPoints([]);
    setSelectedShapeIds([id]);
  }, [
    currentMap,
    isGm,
    activeTool,
    drawingPoints,
    brushColor,
    brushFillColor,
    brushWidth,
    brushDash,
    commitShapesWithHistory,
    serverShapes,
  ]);

  // Selection Actions (Update, Z-Order, Duplicate, Delete)
  const updateSelectedShapes = useCallback(
    (patch: Partial<MapDrawingShape>) => {
      if (!currentMap || selectedShapeIds.length === 0) return;
      const set = new Set(selectedShapeIds);
      const next = serverShapes.map((s) => (set.has(s.id) ? { ...s, ...patch } : s));
      commitShapesWithHistory(next, 'editar elemento');
    },
    [currentMap, selectedShapeIds, serverShapes, commitShapesWithHistory]
  );

  const bringSelectedToFront = useCallback(() => {
    if (!currentMap || selectedShapeIds.length === 0) return;
    const maxZ = serverShapes.reduce((m, s) => Math.max(m, s.zIndex ?? 0), 0);
    const set = new Set(selectedShapeIds);
    const next = serverShapes.map((s) =>
      set.has(s.id) ? { ...s, zIndex: maxZ + 1 } : s
    );
    commitShapesWithHistory(next, 'trazer para frente');
  }, [currentMap, selectedShapeIds, serverShapes, commitShapesWithHistory]);

  const sendSelectedToBack = useCallback(() => {
    if (!currentMap || selectedShapeIds.length === 0) return;
    const minZ = serverShapes.reduce((m, s) => Math.min(m, s.zIndex ?? 0), 0);
    const set = new Set(selectedShapeIds);
    const next = serverShapes.map((s) =>
      set.has(s.id) ? { ...s, zIndex: minZ - 1 } : s
    );
    commitShapesWithHistory(next, 'enviar para trás');
  }, [currentMap, selectedShapeIds, serverShapes, commitShapesWithHistory]);

  const duplicateSelectedShapes = useCallback(() => {
    if (!currentMap || selectedShapeIds.length === 0) return;
    const set = new Set(selectedShapeIds);
    const clones: MapDrawingShape[] = [];
    for (const s of serverShapes) {
      if (!set.has(s.id)) continue;
      const moved = translateShape(s, 2.2, 2.2);
      clones.push({
        ...moved,
        id: `shape-${Date.now()}-${Math.floor(Math.random() * 1e5)}`,
        locked: false,
      });
    }
    commitShapesWithHistory([...serverShapes, ...clones], 'duplicar elementos');
    setSelectedShapeIds(clones.map((c) => c.id));
  }, [currentMap, selectedShapeIds, serverShapes, commitShapesWithHistory]);

  const deleteSelectedShapes = useCallback(() => {
    if (!currentMap || selectedShapeIds.length === 0) return;
    const set = new Set(selectedShapeIds);
    const next = serverShapes.filter((s) => !set.has(s.id));
    commitShapesWithHistory(next, 'remover elementos');
    setSelectedShapeIds([]);
  }, [currentMap, selectedShapeIds, serverShapes, commitShapesWithHistory]);

  // Inline Text Commit (Double-Click on Sticky, Text, Frame, Shape)
  const commitInlineTextEdit = useCallback(() => {
    if (!editingShapeId || !currentMap) {
      setEditingShapeId(null);
      return;
    }
    const next = serverShapes.map((s) =>
      s.id === editingShapeId ? { ...s, label: editingShapeText } : s
    );
    commitShapesWithHistory(next, 'editar texto');
    setEditingShapeId(null);
  }, [editingShapeId, editingShapeText, currentMap, serverShapes, commitShapesWithHistory]);

  // Global Keyboard Shortcuts (Miro Standard!)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      const inInput =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;

      if (inInput) {
        if (e.key === 'Escape' && editingShapeId) {
          commitInlineTextEdit();
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpaceHeld(true);
        return;
      }

      if (e.key === 'Escape') {
        if (drawingPoints.length > 0) {
          setDrawingPoints([]);
          return;
        }
        if (rulerPoints.length > 0) {
          setRulerPoints([]);
          return;
        }
        setSelectedShapeIds([]);
        setOpenDockMenu(null);
        setActiveTool('select');
        return;
      }

      if (e.key === 'Enter' && drawingPoints.length >= 2) {
        e.preventDefault();
        finishMultiPointDrawing();
        return;
      }

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
          return;
        }
        if (k === 'y' || (k === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
          return;
        }
        if (k === 'd' && selectedShapeIds.length > 0 && isGm) {
          e.preventDefault();
          duplicateSelectedShapes();
          return;
        }
        if (k === 'c' && selectedShapeIds.length > 0 && isGm) {
          e.preventDefault();
          const set = new Set(selectedShapeIds);
          clipboardRef.current = serverShapes.filter((s) => set.has(s.id));
          showToast(`${clipboardRef.current.length} elemento(s) copiado(s).`);
          return;
        }
        if (k === 'v' && clipboardRef.current.length > 0 && isGm && currentMap) {
          e.preventDefault();
          const pasted = clipboardRef.current.map((s) => ({
            ...translateShape(s, 2.5, 2.5),
            id: `shape-${Date.now()}-${Math.floor(Math.random() * 1e5)}`,
            locked: false,
          }));
          commitShapesWithHistory([...serverShapes, ...pasted], 'colar elementos');
          setSelectedShapeIds(pasted.map((p) => p.id));
          return;
        }
        if (k === 'a' && isGm) {
          e.preventDefault();
          setSelectedShapeIds(
            visibleShapes.filter((s) => !s.locked).map((s) => s.id)
          );
          return;
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeIds.length > 0 && isGm) {
        e.preventDefault();
        deleteSelectedShapes();
        return;
      }

      // Single-letter Miro tool hotkeys
      const key = e.key.toLowerCase();
      if (key === 'v') setActiveTool('select');
      else if (key === 'h') setActiveTool('pan');
      else if (key === 'r') setActiveTool('ruler');
      else if (isGm) {
        if (key === 'p') setActiveTool('freehand');
        else if (key === 'e') setActiveTool('eraser');
        else if (key === 'n') setActiveTool('sticky');
        else if (key === 't') setActiveTool('text');
        else if (key === 's') setActiveTool('rect');
        else if (key === 'o') setActiveTool('circle');
        else if (key === 'l') setActiveTool('arrow');
        else if (key === 'g') setActiveTool('stamp');
        else if (key === 'm') setActiveTool('pin');
        else if (key === 'f') setActiveTool('fog');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceHeld(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    editingShapeId,
    commitInlineTextEdit,
    drawingPoints.length,
    rulerPoints.length,
    finishMultiPointDrawing,
    handleUndo,
    handleRedo,
    selectedShapeIds,
    isGm,
    duplicateSelectedShapes,
    deleteSelectedShapes,
    serverShapes,
    visibleShapes,
    currentMap,
    commitShapesWithHistory,
    showToast,
  ]);

  // ==========================================================================
  // POINTER INTERACTIONS (60FPS ZERO-LAG ENGINE)
  // ==========================================================================

  const buildDraftShapeFromDrag = useCallback(
    (
      tool: 'rect' | 'circle' | 'sticky' | 'frame' | 'stamp' | 'fog' | 'arrow',
      startPt: Point,
      endPt: Point
    ): MapDrawingShape => {
      if (tool === 'arrow') {
        return {
          id: 'draft-shape',
          type: 'arrow',
          label: '',
          color: brushColor,
          strokeWidth: brushWidth,
          strokeStyle: brushDash,
          dashed: brushDash === 'dashed',
          arrowEnd: true,
          points: [startPt, endPt],
          isSecret: false,
          isRevealed: true,
        };
      }
      const x = round2(Math.min(startPt.x, endPt.x));
      const y = round2(Math.min(startPt.y, endPt.y));
      const dist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
      const defaultW =
        tool === 'stamp' ? 7 : tool === 'sticky' ? 14 : tool === 'frame' ? 28 : 14;
      const defaultH =
        tool === 'stamp' ? 7 : tool === 'sticky' ? 14 : tool === 'frame' ? 20 : 10;
      const w = dist < 1.2 ? defaultW : round2(Math.max(2, Math.abs(endPt.x - startPt.x)));
      const h = dist < 1.2 ? defaultH : round2(Math.max(2, Math.abs(endPt.y - startPt.y)));
      const px = dist < 1.2 ? round2(startPt.x - w / 2) : x;
      const py = dist < 1.2 ? round2(startPt.y - h / 2) : y;

      if (tool === 'fog') {
        return {
          id: 'draft-shape',
          type: 'fog',
          label: 'Névoa de Guerra',
          color: '#09090b',
          strokeWidth: 1,
          opacity: 0.95,
          points: [{ x: px, y: py }],
          width: w,
          height: h,
          isSecret: true,
          isRevealed: false,
        };
      }
      if (tool === 'sticky') {
        return {
          id: 'draft-shape',
          type: 'sticky',
          label: '',
          color: stickyColor,
          fillColor: stickyColor,
          strokeWidth: 1,
          opacity: 0.97,
          fontSize: 1.55,
          textAlign: 'left',
          points: [{ x: px, y: py }],
          width: w,
          height: h,
          isSecret: false,
          isRevealed: true,
        };
      }
      if (tool === 'frame') {
        const frameNum = framesList.length + 1;
        return {
          id: 'draft-shape',
          type: 'frame',
          label: `Quadro ${frameNum}`,
          color: '#6366f1',
          fillColor: '#6366f1',
          strokeWidth: 2,
          opacity: 0.05,
          zIndex: -10,
          points: [{ x: px, y: py }],
          width: w,
          height: h,
          isSecret: false,
          isRevealed: true,
        };
      }
      if (tool === 'stamp') {
        return {
          id: 'draft-shape',
          type: 'stamp',
          stampType: activeStampId,
          label: '',
          color: brushColor,
          fillColor: brushFillColor || undefined,
          strokeWidth: brushWidth,
          opacity: 0.95,
          points: [{ x: px, y: py }],
          width: w,
          height: h,
          isSecret: false,
          isRevealed: true,
        };
      }
      return {
        id: 'draft-shape',
        type: tool,
        label: '',
        color: brushColor,
        fillColor: brushFillColor || brushColor,
        strokeWidth: brushWidth,
        strokeStyle: brushDash,
        dashed: brushDash === 'dashed',
        opacity: brushFillColor === 'transparent' ? 0 : 0.18,
        points: [{ x: px, y: py }],
        width: w,
        height: h,
        radius: round2(Math.max(w, h) / 2),
        isSecret: false,
        isRevealed: true,
      };
    },
    [
      brushColor,
      brushFillColor,
      brushWidth,
      brushDash,
      stickyColor,
      activeStampId,
      framesList.length,
    ]
  );

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!currentMap) return;
    setOpenDockMenu(null);
    if (editingShapeId) {
      commitInlineTextEdit();
    }

    // Middle mouse, Right mouse, Spacebar, Hand tool, or Player select -> Pan
    const shouldPan =
      e.button === 1 ||
      e.button === 2 ||
      isSpaceHeld ||
      activeTool === 'pan' ||
      (!isGm && activeTool === 'select');

    if (shouldPan) {
      interactionRef.current = {
        kind: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        originPanX: pan.x,
        originPanY: pan.y,
        moved: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0) return;

    const pt = clientToStagePercent(
      e.clientX,
      e.clientY,
      activeTool !== 'freehand' && activeTool !== 'highlighter'
    );
    if (!pt) return;

    // Ruler (works for both GM and Players!)
    if (activeTool === 'ruler') {
      setRulerPoints((prev) => [...prev, pt]);
      return;
    }

    if (!isGm) return;

    // Select on empty canvas -> Miro Marquee Selection Box!
    if (activeTool === 'select') {
      if (!e.shiftKey) {
        setSelectedShapeIds([]);
        setSelectedPinId(null);
      }
      interactionRef.current = {
        kind: 'marquee',
        startPt: pt,
        currentPt: pt,
        additive: e.shiftKey,
        initialSelected: e.shiftKey ? selectedShapeIds : [],
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Freehand Pen & Highlighter
    if (activeTool === 'freehand' || activeTool === 'highlighter') {
      interactionRef.current = {
        kind: 'freehand',
        tool: activeTool,
        rawPoints: [pt],
      };
      setDrawingPoints([pt]);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Eraser drag
    if (activeTool === 'eraser') {
      interactionRef.current = {
        kind: 'eraser',
        erasedIds: new Set(),
        baseShapes: serverShapes,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Drag-to-create tools (Rect, Circle, Sticky, Frame, Stamp, Fog, Arrow)
    if (
      activeTool === 'rect' ||
      activeTool === 'circle' ||
      activeTool === 'sticky' ||
      activeTool === 'frame' ||
      activeTool === 'stamp' ||
      activeTool === 'fog' ||
      activeTool === 'arrow'
    ) {
      interactionRef.current = {
        kind: 'drag_create',
        tool: activeTool,
        startPt: pt,
        currentPt: pt,
      };
      setDragDraftShape(buildDraftShapeFromDrag(activeTool, pt, pt));
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Click-to-place Text
    if (activeTool === 'text') {
      const id = `shape-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
      const newText: MapDrawingShape = {
        id,
        type: 'text',
        label: 'Novo texto',
        color: brushColor,
        strokeWidth: 1,
        fontSize: 2.6,
        fontFamily: 'serif',
        fontWeight: 'bold',
        textAlign: 'center',
        points: [pt],
        isSecret: false,
        isRevealed: true,
      };
      commitShapesWithHistory([...serverShapes, newText], 'adicionar texto');
      setSelectedShapeIds([id]);
      setEditingShapeId(id);
      setEditingShapeText('Novo texto');
      setActiveTool('select');
      return;
    }

    // Click-to-place RPG Pin
    if (activeTool === 'pin') {
      setPendingPinCoords(pt);
      return;
    }

    // Multi-point tools (Polygon, Road, River, Fog Polygon)
    if (
      activeTool === 'polygon' ||
      activeTool === 'road' ||
      activeTool === 'river' ||
      activeTool === 'fog_poly'
    ) {
      // Clicking near the first vertex closes a polygon automatically!
      if (
        (activeTool === 'polygon' || activeTool === 'fog_poly') &&
        drawingPoints.length >= 3 &&
        Math.hypot(pt.x - drawingPoints[0].x, pt.y - drawingPoints[0].y) < 1.8
      ) {
        finishMultiPointDrawing();
        return;
      }
      setDrawingPoints((prev) => [...prev, pt]);
    }
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingPin) {
      const pt = clientToStagePercent(e.clientX, e.clientY, true);
      if (pt) setDraggingPin({ id: draggingPin.id, x: pt.x, y: pt.y });
      return;
    }

    const inter = interactionRef.current;

    if (inter.kind === 'pan') {
      const dx = e.clientX - inter.startClientX;
      const dy = e.clientY - inter.startClientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) inter.moved = true;
      setPan({ x: inter.originPanX + dx, y: inter.originPanY + dy });
      return;
    }

    const rawPt = clientToStagePercent(
      e.clientX,
      e.clientY,
      inter.kind !== 'freehand'
    );
    if (!rawPt) return;

    if (
      drawingPoints.length > 0 ||
      (activeTool === 'ruler' && rulerPoints.length > 0)
    ) {
      setLiveCursorPoint(rawPt);
    }

    if (inter.kind === 'freehand') {
      const last = inter.rawPoints[inter.rawPoints.length - 1];
      if (!last || Math.hypot(rawPt.x - last.x, rawPt.y - last.y) >= 0.18) {
        inter.rawPoints.push(rawPt);
        setDrawingPoints([...inter.rawPoints]);
      }
      return;
    }

    if (inter.kind === 'eraser') {
      // Hit-test shapes under cursor while dragging eraser
      let changed = false;
      for (const s of inter.baseShapes) {
        if (inter.erasedIds.has(s.id)) continue;
        const b = getShapeBounds(s);
        if (
          rawPt.x >= b.x - 0.8 &&
          rawPt.x <= b.x + b.width + 0.8 &&
          rawPt.y >= b.y - 0.8 &&
          rawPt.y <= b.y + b.height + 0.8
        ) {
          inter.erasedIds.add(s.id);
          changed = true;
        }
      }
      if (changed) {
        setLiveShapesOverride(
          inter.baseShapes.filter((s) => !inter.erasedIds.has(s.id))
        );
      }
      return;
    }

    if (inter.kind === 'drag_create') {
      inter.currentPt = rawPt;
      setDragDraftShape(
        buildDraftShapeFromDrag(inter.tool, inter.startPt, rawPt)
      );
      return;
    }

    if (inter.kind === 'marquee') {
      inter.currentPt = rawPt;
      const x = Math.min(inter.startPt.x, rawPt.x);
      const y = Math.min(inter.startPt.y, rawPt.y);
      const w = Math.abs(rawPt.x - inter.startPt.x);
      const h = Math.abs(rawPt.y - inter.startPt.y);
      const box: BoundingBox = { x, y, width: w, height: h, cx: x + w / 2, cy: y + h / 2 };
      setMarqueeBox(box);
      const hits = visibleShapes
        .filter((s) => !s.locked && boxesIntersect(box, getShapeBounds(s)))
        .map((s) => s.id);
      setSelectedShapeIds(
        inter.additive ? Array.from(new Set([...inter.initialSelected, ...hits])) : hits
      );
      return;
    }

    if (inter.kind === 'move_shapes') {
      const dx = rawPt.x - inter.startPt.x;
      const dy = rawPt.y - inter.startPt.y;
      if (Math.abs(dx) > 0.08 || Math.abs(dy) > 0.08) inter.moved = true;
      setLiveShapesOverride(
        inter.baseShapes.map((s) =>
          inter.selectedIds.has(s.id) && !s.locked ? translateShape(s, dx, dy) : s
        )
      );
      return;
    }

    if (inter.kind === 'resize_shapes') {
      const dx = rawPt.x - inter.startPt.x;
      const dy = rawPt.y - inter.startPt.y;
      const ub = inter.initialUnionBounds;
      let nx = ub.x;
      let ny = ub.y;
      let nw = ub.width;
      let nh = ub.height;

      if (inter.handle.includes('e')) nw = Math.max(1.5, ub.width + dx);
      if (inter.handle.includes('s')) nh = Math.max(1.5, ub.height + dy);
      if (inter.handle.includes('w')) {
        const clampedDx = Math.min(dx, ub.width - 1.5);
        nx = ub.x + clampedDx;
        nw = ub.width - clampedDx;
      }
      if (inter.handle.includes('n')) {
        const clampedDy = Math.min(dy, ub.height - 1.5);
        ny = ub.y + clampedDy;
        nh = ub.height - clampedDy;
      }

      const sx = ub.width > 0.1 ? nw / ub.width : 1;
      const sy = ub.height > 0.1 ? nh / ub.height : 1;

      setLiveShapesOverride(
        inter.baseShapes.map((s) => {
          if (!inter.selectedIds.has(s.id) || s.locked) return s;
          const sb = inter.initialShapeBounds.get(s.id) || getShapeBounds(s);
          const targetBox: BoundingBox = {
            x: nx + (sb.x - ub.x) * sx,
            y: ny + (sb.y - ub.y) * sy,
            width: sb.width * sx,
            height: sb.height * sy,
            cx: 0,
            cy: 0,
          };
          return resizeShapeToBounds(s, sb, targetBox);
        })
      );
      return;
    }

    if (inter.kind === 'rotate_shape') {
      const angleRad = Math.atan2(rawPt.y - inter.center.y, rawPt.x - inter.center.x);
      let deg = Math.round((angleRad * 180) / Math.PI + 90);
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      setLiveShapesOverride(
        inter.baseShapes.map((s) =>
          s.id === inter.shapeId ? { ...s, rotation: deg } : s
        )
      );
      return;
    }

    if (inter.kind === 'move_vertex') {
      setLiveShapesOverride(
        inter.baseShapes.map((s) => {
          if (s.id !== inter.shapeId) return s;
          const nextPts = s.points.map((p, idx) =>
            idx === inter.vertexIndex ? { x: round2(rawPt.x), y: round2(rawPt.y) } : p
          );
          return { ...s, points: nextPts };
        })
      );
    }
  };

  const handleViewportPointerUp = () => {
    if (draggingPin && currentMap) {
      const existing = currentMap.pins.find((p) => p.id === draggingPin.id);
      if (
        existing &&
        (Math.abs(existing.x - draggingPin.x) > 0.05 ||
          Math.abs(existing.y - draggingPin.y) > 0.05)
      ) {
        void updateMapPin(currentMap.id, draggingPin.id, {
          x: draggingPin.x,
          y: draggingPin.y,
        });
      }
      setDraggingPin(null);
      return;
    }

    const inter = interactionRef.current;
    interactionRef.current = { kind: 'none' };

    if (inter.kind === 'freehand' && currentMap) {
      const simplified = simplifyPoints(
        inter.rawPoints,
        inter.tool === 'highlighter' ? 0.22 : 0.13
      );
      setDrawingPoints([]);
      if (simplified.length >= 1) {
        const id = `shape-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
        const newStroke: MapDrawingShape = {
          id,
          type: inter.tool,
          label: '',
          color: brushColor,
          fillColor: brushCloseFreehand ? brushFillColor || brushColor : undefined,
          strokeWidth: inter.tool === 'highlighter' ? Math.max(6, brushWidth * 2.5) : brushWidth,
          strokeStyle: brushDash,
          dashed: brushDash === 'dashed',
          opacity: inter.tool === 'highlighter' ? 0.36 : brushCloseFreehand ? 0.22 : 0.95,
          closed: inter.tool === 'freehand' ? brushCloseFreehand : false,
          points: simplified,
          isSecret: false,
          isRevealed: true,
        };
        commitShapesWithHistory([...serverShapes, newStroke], 'desenho livre');
      }
      return;
    }

    if (inter.kind === 'eraser' && currentMap) {
      if (inter.erasedIds.size > 0) {
        const remaining = inter.baseShapes.filter((s) => !inter.erasedIds.has(s.id));
        commitShapesWithHistory(remaining, 'apagar traços');
      } else {
        setLiveShapesOverride(null);
      }
      return;
    }

    if (inter.kind === 'drag_create' && currentMap) {
      const draft = buildDraftShapeFromDrag(
        inter.tool,
        inter.startPt,
        inter.currentPt
      );
      setDragDraftShape(null);
      // Avoid zero-length accidental arrow click
      if (
        inter.tool === 'arrow' &&
        Math.hypot(
          inter.currentPt.x - inter.startPt.x,
          inter.currentPt.y - inter.startPt.y
        ) < 1.2
      ) {
        draft.points = [
          inter.startPt,
          { x: round2(inter.startPt.x + 12), y: round2(inter.startPt.y) },
        ];
      }
      const id = `shape-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
      const finalShape: MapDrawingShape = { ...draft, id };
      commitShapesWithHistory([...serverShapes, finalShape], 'adicionar elemento');
      setSelectedShapeIds([id]);
      if (inter.tool === 'sticky') {
        setEditingShapeId(id);
        setEditingShapeText('');
      }
      if (inter.tool !== 'stamp') {
        setActiveTool('select');
      }
      return;
    }

    if (inter.kind === 'marquee') {
      setMarqueeBox(null);
      return;
    }

    if (
      (inter.kind === 'move_shapes' && inter.moved) ||
      inter.kind === 'resize_shapes' ||
      inter.kind === 'rotate_shape' ||
      inter.kind === 'move_vertex'
    ) {
      if (liveShapesOverride) {
        commitShapesWithHistory(liveShapesOverride, 'transformar elemento');
      }
    } else {
      setLiveShapesOverride(null);
    }
  };

  const handleViewportDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentMap || !isGm) return;
    if (
      activeTool === 'polygon' ||
      activeTool === 'fog_poly' ||
      activeTool === 'road' ||
      activeTool === 'river'
    ) {
      e.preventDefault();
      finishMultiPointDrawing();
      return;
    }
    if (activeTool === 'ruler') {
      setRulerPoints([]);
      return;
    }
    // Miro-style double-click on empty canvas -> instant Sticky Note or Text!
    if (activeTool === 'select') {
      const pt = clientToStagePercent(e.clientX, e.clientY, true);
      if (!pt) return;
      const id = `shape-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
      const newText: MapDrawingShape = {
        id,
        type: 'text',
        label: ' Rótulo',
        color: themeMeta.textDefault,
        strokeWidth: 1,
        fontSize: 2.4,
        fontFamily: 'sans',
        fontWeight: 'bold',
        textAlign: 'center',
        points: [pt],
        isSecret: false,
        isRevealed: true,
      };
      commitShapesWithHistory([...serverShapes, newText], 'adicionar texto');
      setSelectedShapeIds([id]);
      setEditingShapeId(id);
      setEditingShapeText('');
    }
  };

  // Shape / Handle Callbacks passed into CanvasVectorStage
  const handleShapePointerDown = useCallback(
    (e: React.PointerEvent<SVGElement>, shape: MapDrawingShape) => {
      if (!isGm) return;
      e.stopPropagation();

      if (activeTool === 'eraser') {
        interactionRef.current = {
          kind: 'eraser',
          erasedIds: new Set([shape.id]),
          baseShapes: serverShapes,
        };
        setLiveShapesOverride(serverShapes.filter((s) => s.id !== shape.id));
        viewportRef.current?.setPointerCapture(e.pointerId);
        return;
      }

      if (activeTool !== 'select') return;

      setSelectedPinId(null);
      let nextSelection: string[];
      if (e.shiftKey) {
        nextSelection = selectedShapeIds.includes(shape.id)
          ? selectedShapeIds.filter((id) => id !== shape.id)
          : [...selectedShapeIds, shape.id];
      } else {
        nextSelection = selectedShapeIds.includes(shape.id)
          ? selectedShapeIds
          : [shape.id];
      }
      setSelectedShapeIds(nextSelection);

      if (shape.locked) return;
      const pt = clientToStagePercent(e.clientX, e.clientY, true);
      if (!pt) return;
      interactionRef.current = {
        kind: 'move_shapes',
        startPt: pt,
        baseShapes: serverShapes,
        selectedIds: new Set(nextSelection),
        moved: false,
      };
      viewportRef.current?.setPointerCapture(e.pointerId);
    },
    [isGm, activeTool, serverShapes, selectedShapeIds, clientToStagePercent]
  );

  const handleShapePointerEnter = useCallback(
    (_e: React.PointerEvent<SVGElement>, shape: MapDrawingShape) => {
      const inter = interactionRef.current;
      if (inter.kind === 'eraser' && !inter.erasedIds.has(shape.id)) {
        inter.erasedIds.add(shape.id);
        setLiveShapesOverride(
          inter.baseShapes.filter((s) => !inter.erasedIds.has(s.id))
        );
      }
    },
    []
  );

  const handleShapeDoubleClick = useCallback(
    (e: React.MouseEvent<SVGElement>, shape: MapDrawingShape) => {
      if (!isGm) return;
      e.stopPropagation();
      setSelectedShapeIds([shape.id]);
      setEditingShapeId(shape.id);
      setEditingShapeText(shape.label || '');
    },
    [isGm]
  );

  const handleResizeHandlePointerDown = useCallback(
    (
      e: React.PointerEvent<SVGElement>,
      handle: ResizeHandleId,
      unionBounds: BoundingBox
    ) => {
      e.stopPropagation();
      const pt = clientToStagePercent(e.clientX, e.clientY, true);
      if (!pt) return;
      const boundsMap = new Map<string, BoundingBox>();
      const set = new Set(selectedShapeIds);
      for (const s of serverShapes) {
        if (set.has(s.id)) boundsMap.set(s.id, getShapeBounds(s));
      }
      interactionRef.current = {
        kind: 'resize_shapes',
        handle,
        startPt: pt,
        initialUnionBounds: unionBounds,
        initialShapeBounds: boundsMap,
        baseShapes: serverShapes,
        selectedIds: set,
      };
      viewportRef.current?.setPointerCapture(e.pointerId);
    },
    [clientToStagePercent, selectedShapeIds, serverShapes]
  );

  const handleRotateHandlePointerDown = useCallback(
    (
      e: React.PointerEvent<SVGElement>,
      shape: MapDrawingShape,
      bounds: BoundingBox
    ) => {
      e.stopPropagation();
      interactionRef.current = {
        kind: 'rotate_shape',
        shapeId: shape.id,
        center: { x: bounds.cx, y: bounds.cy },
        baseShapes: serverShapes,
      };
      viewportRef.current?.setPointerCapture(e.pointerId);
    },
    [serverShapes]
  );

  const handleVertexPointerDown = useCallback(
    (
      e: React.PointerEvent<SVGElement>,
      shape: MapDrawingShape,
      vertexIndex: number
    ) => {
      e.stopPropagation();
      interactionRef.current = {
        kind: 'move_vertex',
        shapeId: shape.id,
        vertexIndex,
        baseShapes: serverShapes,
      };
      viewportRef.current?.setPointerCapture(e.pointerId);
    },
    [serverShapes]
  );

  // Pin Dragging & Creation
  const handleStartPinDrag = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, pin: MapPin) => {
      if (!isGm || activeTool !== 'select') return;
      setSelectedShapeIds([]);
      e.currentTarget.setPointerCapture(e.pointerId);
      setDraggingPin({ id: pin.id, x: pin.x, y: pin.y });
    },
    [isGm, activeTool]
  );

  const handleCreatePinSubmit = async (data: CreatePinSubmitData) => {
    if (!currentMap || !pendingPinCoords) return;
    let finalEntityId = data.entityId;
    if (!finalEntityId && data.autoCreateWiki) {
      const created = await addEntity({
        name: data.label,
        subtitle: data.subtitle,
        category: 'location',
        summary: data.description,
        publicContent: data.description,
        isPublicToPlayers: !data.isSecret,
      });
      if (created) finalEntityId = created.id;
    }
    const createdPinId = await addMapPin(currentMap.id, {
      x: pendingPinCoords.x,
      y: pendingPinCoords.y,
      label: data.label,
      subtitle: data.subtitle,
      layer: data.layer,
      iconType: data.iconType,
      entityId: finalEntityId,
      linkedEntityIds:
        data.linkedEntityIds.length > 0 ? data.linkedEntityIds : undefined,
      linkedMapId: data.linkedMapId,
      description: data.description,
      monsters: data.monsters,
      treasures: data.treasures,
      isSecret: data.isSecret,
      isRevealed: !data.isSecret,
    });
    setPendingPinCoords(null);
    setActiveTool('select');
    if (createdPinId) setSelectedPinId(createdPinId);
  };

  const handleCreateWikiFromActivePin = async () => {
    if (!currentMap || !activePin) return;
    const created = await addEntity({
      name: activePin.label,
      subtitle: activePin.subtitle || `Local em ${currentMap.name}`,
      category: 'location',
      summary: activePin.description || `Ponto cartografado em ${currentMap.name}.`,
      publicContent:
        activePin.description || `Local registrado no mapa **${currentMap.name}**.`,
      isPublicToPlayers: !(activePin.isSecret && !activePin.isRevealed),
    });
    if (!created) return;
    void updateMapPin(currentMap.id, activePin.id, { entityId: created.id });
    showToast(`Página #${created.handle} criada no Códice.`);
  };

  // Map Create / Settings Submit & Quick Presets
  const handleSettingsSubmit = async (payload: MapSettingsSubmitPayload) => {
    const extra = {
      isPublicToPlayers: payload.isPublicToPlayers,
      canvasTheme: payload.canvasTheme,
      gridMode: payload.gridMode,
      gridSize: payload.gridSize,
      gridOpacity: payload.gridOpacity,
      imageOpacity: payload.imageOpacity,
      stageWidth: payload.stageWidth,
      stageHeight: payload.stageHeight,
      scalePer100Pct: payload.scalePer100Pct,
    };
    if (settingsModal === 'create') {
      await addMap(
        payload.name,
        payload.subtitle,
        payload.customImageUrl,
        payload.regionType,
        payload.storageId,
        extra
      );
    } else if (settingsModal === 'edit' && currentMap) {
      await updateMap(currentMap.id, {
        name: payload.name,
        subtitle: payload.subtitle,
        regionType: payload.regionType,
        customImageUrl: payload.customImageUrl || undefined,
        storageId: payload.storageId,
        clearImage: payload.clearImage,
        ...extra,
      });
      showToast('Configurações do canvas salvas.');
    }
  };

  const createQuickPresetMap = async (
    preset: 'miro' | 'parchment' | 'tactical'
  ) => {
    if (preset === 'miro') {
      await addMap('Quadro Cartográfico', 'Canvas livre', '', 'regional', undefined, {
        canvasTheme: 'paper',
        gridMode: 'dots',
        gridSize: 36,
        gridOpacity: 0.45,
        stageWidth: 2400,
        stageHeight: 1500,
      });
    } else if (preset === 'parchment') {
      await addMap('Mapa Regional', 'Exploração continental', '', 'regional', undefined, {
        canvasTheme: 'parchment',
        gridMode: 'hex',
        gridSize: 52,
        gridOpacity: 0.35,
        stageWidth: 2400,
        stageHeight: 1500,
      });
    } else {
      await addMap('Arena Tática', 'Combate em grade de 1,5m', '', 'tactical', undefined, {
        canvasTheme: 'obsidian',
        gridMode: 'square',
        gridSize: 40,
        gridOpacity: 0.4,
        stageWidth: 1600,
        stageHeight: 1200,
        scalePer100Pct: 60,
      });
    }
  };

  // Export Canvas SVG + Background as High-Res PNG
  const handleExportPng = async () => {
    if (!currentMap || !stageRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = stageW;
      canvas.height = stageH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Fill theme background
      ctx.fillStyle = themeMeta.stageBg;
      ctx.fillRect(0, 0, stageW, stageH);

      // 2. Draw background map image if present (and CORS allows)
      if (currentMap.customImageUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.save();
            ctx.globalAlpha = imageOpacity;
            ctx.drawImage(img, 0, 0, stageW, stageH);
            ctx.restore();
            resolve();
          };
          img.onerror = () => resolve();
          img.src = currentMap.customImageUrl!;
        });
      }

      // 3. Serialize vector SVG layer(s)
      const svgs = stageRef.current.querySelectorAll('svg');
      for (const svgEl of Array.from(svgs)) {
        const clone = svgEl.cloneNode(true) as SVGSVGElement;
        clone.setAttribute('width', String(stageW));
        clone.setAttribute('height', String(stageH));
        const xml = new XMLSerializer().serializeToString(clone);
        const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
        await new Promise<void>((resolve) => {
          const sImg = new Image();
          sImg.onload = () => {
            ctx.drawImage(sImg, 0, 0, stageW, stageH);
            resolve();
          };
          sImg.onerror = () => resolve();
          sImg.src = url;
        });
      }

      // 4. Draw pins markers onto exported PNG
      for (const p of visiblePins) {
        const px = (p.x / 100) * stageW;
        const py = (p.y / 100) * stageH;
        const col = LAYER_CONFIG[p.layer]?.color || '#22a06b';
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#18181b';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = col;
        ctx.stroke();
        ctx.font = '600 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 3;
        ctx.strokeText(p.label, px, py + 26);
        ctx.fillText(p.label, px, py + 26);
      }

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${currentMap.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      a.click();
      showToast('Mapa exportado como PNG.');
    } catch {
      showToast('Não foi possível exportar este mapa como PNG.');
    }
  };

  const handleDeleteCurrentMap = async () => {
    if (!currentMap) return;
    const ok = await confirm({
      title: `Excluir "${currentMap.name}"?`,
      message:
        'O mapa, todos os desenhos vetoriais, quadros e marcadores serão removidos permanentemente.',
      confirmLabel: 'Excluir mapa',
    });
    if (ok) await deleteMap(currentMap.id);
  };

  const openEntityInWiki = useCallback(
    (entityId: string) => {
      setSelectedEntityId(entityId);
      setWorldSubTab('wiki');
    },
    [setSelectedEntityId, setWorldSubTab]
  );

  const pinCounterScale = useMemo(
    () => Number((1 / Math.pow(Math.max(0.45, zoom), 0.58)).toFixed(3)),
    [zoom]
  );

  const rulerDistanceLabel = useMemo(() => {
    const pts =
      rulerPoints.length === 1 && liveCursorPoint
        ? [rulerPoints[0], liveCursorPoint]
        : rulerPoints;
    return formatPathDistance(pts, currentMap, stageW, stageH);
  }, [rulerPoints, liveCursorPoint, currentMap, stageW, stageH]);

  const editingShape = useMemo(
    () => (editingShapeId ? effectiveShapes.find((s) => s.id === editingShapeId) : null),
    [editingShapeId, effectiveShapes]
  );

  const editingBounds = useMemo(
    () => (editingShape ? getShapeBounds(editingShape) : null),
    [editingShape]
  );

  // Mini-map viewport indicator calculations
  const minimapViewport = useMemo(() => {
    const vp = viewportRef.current;
    const vw = vp?.clientWidth || 900;
    const vh = vp?.clientHeight || 600;
    const leftPct = ((-pan.x / zoom) / stageW) * 100;
    const topPct = ((-pan.y / zoom) / stageH) * 100;
    const widthPct = ((vw / zoom) / stageW) * 100;
    const heightPct = ((vh / zoom) / stageH) * 100;
    return {
      x: Math.max(-20, Math.min(110, leftPct)),
      y: Math.max(-20, Math.min(110, topPct)),
      w: Math.max(4, Math.min(140, widthPct)),
      h: Math.max(4, Math.min(140, heightPct)),
    };
  }, [pan.x, pan.y, zoom, stageW, stageH]);

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col bg-surface overflow-hidden'
    : 'flex flex-col h-[calc(100vh-7.5rem)] min-h-[560px] card overflow-hidden relative';

  const isMultiPointTool =
    activeTool === 'polygon' ||
    activeTool === 'fog_poly' ||
    activeTool === 'road' ||
    activeTool === 'river';

  return (
    <div className={containerClass}>
      {/* =================================================================== */}
      {/* TOP STUDIO HEADER: MAP TABS, JUMP TO FRAME/PIN, FILTERS & ACTIONS   */}
      {/* =================================================================== */}
      <header className="h-11 px-3 border-b border-line bg-surface flex items-center justify-between gap-2 shrink-0 z-30">
        {/* Left: Map Tabs + New Map */}
        <div className="flex items-center gap-1 overflow-x-auto min-w-0">
          {maps.map((m) => {
            const active = m.id === currentMap?.id;
            const count = m.pins.length + (m.shapes?.length || 0);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedMapId(m.id);
                  setSelectedPinId(null);
                }}
                className={`h-8 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 shrink-0 transition-colors ${
                  active
                    ? 'bg-accent-soft text-accent font-semibold'
                    : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                }`}
              >
                <span className="truncate max-w-[140px]">{m.name}</span>
                {count > 0 && (
                  <span className="text-[11px] opacity-75 tabular-nums">{count}</span>
                )}
              </button>
            );
          })}

          {isGm && (
            <button
              type="button"
              onClick={() => setSettingsModal('create')}
              className="btn btn-ghost btn-sm h-7 px-2 text-xs shrink-0"
              title="Criar novo mapa ou quadro branco"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo quadro</span>
            </button>
          )}
        </div>

        {/* Right: Layer Toggles, Undo/Redo, Settings, Export, Fullscreen */}
        {currentMap && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Quick Jump to Frame or Pin */}
            {(framesList.length > 0 || visiblePins.length > 0) && (
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  if (val.startsWith('pin:')) {
                    const pid = val.slice(4);
                    const p = visiblePins.find((x) => x.id === pid);
                    if (p) {
                      setSelectedPinId(p.id);
                      centerOnPercent(p.x, p.y, Math.max(zoom, 1.55));
                    }
                  } else if (val.startsWith('frame:')) {
                    const fid = val.slice(6);
                    const f = framesList.find((x) => x.id === fid);
                    if (f) {
                      const b = getShapeBounds(f);
                      centerOnPercent(b.cx, b.cy, 1.15);
                      if (isGm) setSelectedShapeIds([f.id]);
                    }
                  }
                }}
                className="hidden lg:block input h-7 w-40 text-xs py-0"
              >
                <option value="">Ir para área / pin…</option>
                {framesList.length > 0 && (
                  <optgroup label="Quadros (Frames)">
                    {framesList.map((f) => (
                      <option key={f.id} value={`frame:${f.id}`}>
                        ▢ {f.label || 'Quadro'}
                      </option>
                    ))}
                  </optgroup>
                )}
                {visiblePins.length > 0 && (
                  <optgroup label="Marcadores">
                    {visiblePins.map((p) => (
                      <option key={p.id} value={`pin:${p.id}`}>
                        📍 {p.label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}

            {/* Compact Layer Filter Dots */}
            <div className="hidden xl:flex items-center gap-0.5 px-1 border-x border-line">
              {(Object.keys(LAYER_CONFIG) as MapLayer[]).map((layer) => {
                if (!isGm && layer === 'secrets') return null;
                const on = activeLayers[layer];
                return (
                  <button
                    key={layer}
                    type="button"
                    onClick={() =>
                      setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }))
                    }
                    className={`h-7 px-2 rounded text-[11px] font-medium inline-flex items-center gap-1 ${
                      on ? 'text-fg bg-surface-2' : 'text-fg-subtle opacity-60'
                    }`}
                    title={LAYER_CONFIG[layer].label}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: LAYER_CONFIG[layer].color }}
                    />
                    <span>{LAYER_CONFIG[layer].shortLabel}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowVectorShapes((v) => !v)}
                className={`h-7 px-2 rounded text-[11px] font-medium inline-flex items-center gap-1 ${
                  showVectorShapes ? 'text-fg bg-surface-2' : 'text-fg-subtle opacity-60'
                }`}
                title="Mostrar/ocultar desenhos vetoriais"
              >
                <PenTool className="w-3 h-3" />
                <span>Desenhos</span>
              </button>
            </div>

            {isGm && (
              <>
                <button
                  type="button"
                  disabled={!canUndo}
                  onClick={handleUndo}
                  className="btn btn-ghost btn-icon h-7 w-7 disabled:opacity-35"
                  title="Desfazer (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={!canRedo}
                  onClick={handleRedo}
                  className="btn btn-ghost btn-icon h-7 w-7 disabled:opacity-35"
                  title="Refazer (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsModal('edit')}
                  className="btn btn-ghost btn-icon h-7 w-7"
                  title="Configurações do canvas (tema, grade, escala, imagem)"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleExportPng}
              className="btn btn-ghost btn-icon h-7 w-7"
              title="Exportar mapa como PNG"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((f) => !f)}
              className="btn btn-ghost btn-icon h-7 w-7"
              title={isFullscreen ? 'Sair da tela cheia' : 'Expandir em tela cheia'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {isGm && (
              <button
                type="button"
                onClick={handleDeleteCurrentMap}
                className="btn btn-danger-ghost btn-icon h-7 w-7"
                title="Excluir mapa atual"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </header>

      {/* =================================================================== */}
      {/* MAIN STUDIO WORKSPACE: MIRO CANVAS + FLOATING DOCKS + PIN INSPECTOR */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {!currentMap ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5 bg-surface-2">
            <div className="w-12 h-12 rounded-xl bg-surface border border-line flex items-center justify-center text-accent shadow-card">
              <MapIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base font-semibold text-fg">
                Estúdio Cartográfico & Quadro Livre
              </h3>
              <p className="text-[13px] text-fg-muted leading-relaxed">
                Desenhe mapas regionais, masmorras táticas, fluxos e territórios livremente como no Miro, ou envie uma imagem de mapa para anotar e cobrir com Névoa de Guerra.
              </p>
            </div>
            {isGm && (
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => void createQuickPresetMap('miro')}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4" />
                  <span>Quadro em Branco (Miro)</span>
                </button>
                <button
                  type="button"
                  onClick={() => void createQuickPresetMap('parchment')}
                  className="btn btn-secondary"
                >
                  <Compass className="w-4 h-4" />
                  <span>Pergaminho Hexagonal</span>
                </button>
                <button
                  type="button"
                  onClick={() => void createQuickPresetMap('tactical')}
                  className="btn btn-secondary"
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span>Grade Tática (1,5m)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsModal('create')}
                  className="btn btn-ghost"
                >
                  <span>Personalizar / Enviar imagem…</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            ref={viewportRef}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={handleViewportPointerDown}
            onPointerMove={handleViewportPointerMove}
            onPointerUp={handleViewportPointerUp}
            onDoubleClick={handleViewportDoubleClick}
            style={{ backgroundColor: themeMeta.viewportBg }}
            className={`flex-1 min-h-[340px] relative overflow-hidden select-none ${
              isSpaceHeld || activeTool === 'pan'
                ? 'cursor-grab active:cursor-grabbing'
                : activeTool === 'eraser'
                ? 'cursor-cell'
                : activeTool !== 'select'
                ? 'cursor-crosshair'
                : 'cursor-default'
            }`}
          >
            {/* ============================================================= */}
            {/* LEFT FLOATING MIRO TOOL DOCK                                  */}
            {/* ============================================================= */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 p-1.5 rounded-xl bg-surface/95 backdrop-blur border border-line-strong shadow-elevated pointer-events-auto"
            >
              {/* Select (V) */}
              <button
                type="button"
                onClick={() => {
                  setActiveTool('select');
                  setOpenDockMenu(null);
                }}
                title="Selecionar / Caixa de seleção (V)"
                className={`btn btn-icon h-9 w-9 rounded-lg ${
                  activeTool === 'select'
                    ? 'bg-accent text-accent-fg shadow-sm'
                    : 'btn-ghost text-fg-muted hover:text-fg'
                }`}
              >
                <MousePointer2 className="w-4 h-4" />
              </button>

              {/* Hand / Pan (H / Space) */}
              <button
                type="button"
                onClick={() => {
                  setActiveTool('pan');
                  setOpenDockMenu(null);
                }}
                title="Mover visão / Pan (H ou Espaço)"
                className={`btn btn-icon h-9 w-9 rounded-lg ${
                  activeTool === 'pan'
                    ? 'bg-accent text-accent-fg shadow-sm'
                    : 'btn-ghost text-fg-muted hover:text-fg'
                }`}
              >
                <Hand className="w-4 h-4" />
              </button>

              {isGm && (
                <>
                  <span className="h-px bg-line mx-1 my-0.5" />

                  {/* Freehand Pen & Highlighter (P) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTool !== 'freehand' && activeTool !== 'highlighter') {
                          setActiveTool('freehand');
                        }
                        setOpenDockMenu((m) => (m === 'pen' ? null : 'pen'));
                      }}
                      title="Desenho livre / Pincel e Marca-texto (P)"
                      className={`btn btn-icon h-9 w-9 rounded-lg ${
                        activeTool === 'freehand' || activeTool === 'highlighter'
                          ? 'bg-accent text-accent-fg shadow-sm'
                          : 'btn-ghost text-fg-muted hover:text-fg'
                      }`}
                    >
                      {activeTool === 'highlighter' ? (
                        <Highlighter className="w-4 h-4" />
                      ) : (
                        <Brush className="w-4 h-4" />
                      )}
                    </button>

                    {openDockMenu === 'pen' && (
                      <div className="absolute left-full top-0 ml-2.5 p-3 rounded-xl bg-surface border border-line-strong shadow-elevated w-60 space-y-3 z-40">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveTool('freehand')}
                            className={`h-8 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 border ${
                              activeTool === 'freehand'
                                ? 'bg-accent-soft text-accent border-accent/40'
                                : 'border-line text-fg-muted'
                            }`}
                          >
                            <Brush className="w-3.5 h-3.5" />
                            Caneta
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTool('highlighter')}
                            className={`h-8 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 border ${
                              activeTool === 'highlighter'
                                ? 'bg-accent-soft text-accent border-accent/40'
                                : 'border-line text-fg-muted'
                            }`}
                          >
                            <Highlighter className="w-3.5 h-3.5" />
                            Marca-texto
                          </button>
                        </div>

                        <div className="grid grid-cols-6 gap-1.5">
                          {STROKE_PALETTE.map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setBrushColor(c.hex)}
                              className={`w-6 h-6 rounded-full border border-black/20 ${
                                brushColor === c.hex ? 'ring-2 ring-accent' : ''
                              }`}
                              style={{ backgroundColor: c.hex }}
                              title={c.label}
                            />
                          ))}
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-fg-muted">
                          <span>Cor livre</span>
                          <input
                            type="color"
                            value={brushColor}
                            onChange={(e) => setBrushColor(e.target.value)}
                            className="w-8 h-6 rounded cursor-pointer bg-transparent border-0"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-fg-muted">
                            <span>Espessura</span>
                            <span className="tabular-nums">{brushWidth}px</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={16}
                            value={brushWidth}
                            onChange={(e) => setBrushWidth(Number(e.target.value))}
                            className="w-full accent-accent"
                          />
                        </div>

                        {activeTool === 'freehand' && (
                          <label className="flex items-center gap-2 text-xs text-fg-muted cursor-pointer">
                            <input
                              type="checkbox"
                              className="checkbox"
                              checked={brushCloseFreehand}
                              onChange={(e) => setBrushCloseFreehand(e.target.checked)}
                            />
                            <span>Fechar e preencher ilha/massa</span>
                          </label>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Eraser (E) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool('eraser');
                      setOpenDockMenu(null);
                    }}
                    title="Borracha — arraste sobre traços para apagar (E)"
                    className={`btn btn-icon h-9 w-9 rounded-lg ${
                      activeTool === 'eraser'
                        ? 'bg-accent text-accent-fg shadow-sm'
                        : 'btn-ghost text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Eraser className="w-4 h-4" />
                  </button>

                  {/* Shapes & Frames (S) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          activeTool !== 'rect' &&
                          activeTool !== 'circle' &&
                          activeTool !== 'polygon' &&
                          activeTool !== 'frame'
                        ) {
                          setActiveTool('rect');
                        }
                        setOpenDockMenu((m) => (m === 'shapes' ? null : 'shapes'));
                      }}
                      title="Formas geométricas, Territórios e Quadros (S)"
                      className={`btn btn-icon h-9 w-9 rounded-lg ${
                        activeTool === 'rect' ||
                        activeTool === 'circle' ||
                        activeTool === 'polygon' ||
                        activeTool === 'frame'
                          ? 'bg-accent text-accent-fg shadow-sm'
                          : 'btn-ghost text-fg-muted hover:text-fg'
                      }`}
                    >
                      {activeTool === 'circle' ? (
                        <CircleIcon className="w-4 h-4" />
                      ) : activeTool === 'polygon' ? (
                        <Hexagon className="w-4 h-4" />
                      ) : activeTool === 'frame' ? (
                        <Frame className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    {openDockMenu === 'shapes' && (
                      <div className="absolute left-full top-0 ml-2.5 p-2.5 rounded-xl bg-surface border border-line-strong shadow-elevated w-56 space-y-2.5 z-40">
                        <div className="grid grid-cols-2 gap-1.5">
                          {(
                            [
                              { id: 'rect', label: 'Retângulo / Sala', icon: Square },
                              { id: 'circle', label: 'Círculo / Área', icon: CircleIcon },
                              { id: 'polygon', label: 'Polígono / Reino', icon: Hexagon },
                              { id: 'frame', label: 'Quadro (Frame)', icon: Frame },
                            ] as const
                          ).map((it) => {
                            const Icon = it.icon;
                            return (
                              <button
                                key={it.id}
                                type="button"
                                onClick={() => {
                                  setActiveTool(it.id);
                                  setDrawingPoints([]);
                                  setOpenDockMenu(null);
                                }}
                                className={`h-9 px-2 rounded-md text-xs font-medium flex items-center gap-1.5 border ${
                                  activeTool === it.id
                                    ? 'bg-accent-soft text-accent border-accent/40'
                                    : 'border-line text-fg-muted hover:text-fg'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{it.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-6 gap-1.5 pt-1 border-t border-line">
                          {STROKE_PALETTE.map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setBrushColor(c.hex)}
                              className={`w-6 h-6 rounded-full border border-black/20 ${
                                brushColor === c.hex ? 'ring-2 ring-accent' : ''
                              }`}
                              style={{ backgroundColor: c.hex }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lines, Arrows, Roads & Rivers (L) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          activeTool !== 'arrow' &&
                          activeTool !== 'road' &&
                          activeTool !== 'river'
                        ) {
                          setActiveTool('arrow');
                        }
                        setOpenDockMenu((m) => (m === 'lines' ? null : 'lines'));
                      }}
                      title="Setas, Estradas e Rios (L)"
                      className={`btn btn-icon h-9 w-9 rounded-lg ${
                        activeTool === 'arrow' ||
                        activeTool === 'road' ||
                        activeTool === 'river'
                          ? 'bg-accent text-accent-fg shadow-sm'
                          : 'btn-ghost text-fg-muted hover:text-fg'
                      }`}
                    >
                      {activeTool === 'river' ? (
                        <Waves className="w-4 h-4" />
                      ) : activeTool === 'road' ? (
                        <PenTool className="w-4 h-4" />
                      ) : (
                        <MoveUpRight className="w-4 h-4" />
                      )}
                    </button>

                    {openDockMenu === 'lines' && (
                      <div className="absolute left-full top-0 ml-2.5 p-2.5 rounded-xl bg-surface border border-line-strong shadow-elevated w-52 space-y-1.5 z-40">
                        {(
                          [
                            { id: 'arrow', label: 'Seta / Conector (arraste)', icon: MoveUpRight },
                            { id: 'road', label: 'Estrada / Trilha (pontos)', icon: PenTool },
                            { id: 'river', label: 'Rio / Curso d’água (curvo)', icon: Waves },
                          ] as const
                        ).map((it) => {
                          const Icon = it.icon;
                          return (
                            <button
                              key={it.id}
                              type="button"
                              onClick={() => {
                                setActiveTool(it.id);
                                setDrawingPoints([]);
                                setOpenDockMenu(null);
                              }}
                              className={`w-full h-8 px-2.5 rounded-md text-xs font-medium flex items-center gap-2 border ${
                                activeTool === it.id
                                  ? 'bg-accent-soft text-accent border-accent/40'
                                  : 'border-transparent text-fg-muted hover:bg-surface-2 hover:text-fg'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span>{it.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Sticky Note (N) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool('sticky');
                      setOpenDockMenu(null);
                    }}
                    title="Nota adesiva estilo Miro (N)"
                    className={`btn btn-icon h-9 w-9 rounded-lg ${
                      activeTool === 'sticky'
                        ? 'bg-accent text-accent-fg shadow-sm'
                        : 'btn-ghost text-fg-muted hover:text-fg'
                    }`}
                  >
                    <StickyNote className="w-4 h-4" />
                  </button>

                  {/* Text (T) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool('text');
                      setOpenDockMenu(null);
                    }}
                    title="Texto / Nome de região (T ou duplo clique)"
                    className={`btn btn-icon h-9 w-9 rounded-lg ${
                      activeTool === 'text'
                        ? 'bg-accent text-accent-fg shadow-sm'
                        : 'btn-ghost text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Type className="w-4 h-4" />
                  </button>

                  {/* Terrain & Cartography Stamps (G) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool('stamp');
                        setOpenDockMenu((m) => (m === 'stamps' ? null : 'stamps'));
                      }}
                      title="Carimbos de terreno e cartografia (G)"
                      className={`btn btn-icon h-9 w-9 rounded-lg ${
                        activeTool === 'stamp'
                          ? 'bg-accent text-accent-fg shadow-sm'
                          : 'btn-ghost text-fg-muted hover:text-fg'
                      }`}
                    >
                      <Compass className="w-4 h-4" />
                    </button>

                    {openDockMenu === 'stamps' && (
                      <div className="absolute left-full top-0 ml-2.5 p-2.5 rounded-xl bg-surface border border-line-strong shadow-elevated w-64 space-y-2 z-40">
                        <div className="text-[11px] font-medium text-fg-subtle">
                          Carimbos cartográficos (clique ou arraste)
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                          {MAP_STAMPS.map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                setActiveStampId(st.id);
                                setActiveTool('stamp');
                                setOpenDockMenu(null);
                              }}
                              title={st.label}
                              className={`h-9 w-9 rounded-md flex items-center justify-center border ${
                                activeStampId === st.id
                                  ? 'bg-accent-soft text-accent border-accent/40'
                                  : 'border-transparent hover:bg-surface-2 text-fg'
                              }`}
                            >
                              <svg viewBox="0 0 24 24" className="w-5 h-5">
                                {st.paths.map((p, idx) => (
                                  <path
                                    key={idx}
                                    d={p}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                ))}
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interactive RPG Map Pin (M) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool('pin');
                      setOpenDockMenu(null);
                    }}
                    title="Marcador interativo com Códice / Submapa / Combate (M)"
                    className={`btn btn-icon h-9 w-9 rounded-lg ${
                      activeTool === 'pin'
                        ? 'bg-accent text-accent-fg shadow-sm'
                        : 'btn-ghost text-fg-muted hover:text-fg'
                    }`}
                  >
                    <MapPinIconLucide className="w-4 h-4" />
                  </button>

                  {/* Fog of War (F) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTool !== 'fog' && activeTool !== 'fog_poly') {
                          setActiveTool('fog');
                        }
                        setOpenDockMenu((m) => (m === 'fog' ? null : 'fog'));
                      }}
                      title="Névoa de Guerra (F)"
                      className={`btn btn-icon h-9 w-9 rounded-lg ${
                        activeTool === 'fog' || activeTool === 'fog_poly'
                          ? 'bg-accent text-accent-fg shadow-sm'
                          : 'btn-ghost text-fg-muted hover:text-fg'
                      }`}
                    >
                      <CloudOff className="w-4 h-4" />
                    </button>

                    {openDockMenu === 'fog' && (
                      <div className="absolute left-full bottom-0 ml-2.5 p-2.5 rounded-xl bg-surface border border-line-strong shadow-elevated w-56 space-y-1.5 z-40">
                        <div className="text-[11px] font-medium text-fg-subtle">
                          Névoa de Guerra
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTool('fog');
                            setOpenDockMenu(null);
                          }}
                          className={`w-full h-8 px-2.5 rounded-md text-xs font-medium flex items-center gap-2 ${
                            activeTool === 'fog'
                              ? 'bg-accent-soft text-accent'
                              : 'hover:bg-surface-2 text-fg'
                          }`}
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Área retangular (arraste)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTool('fog_poly');
                            setDrawingPoints([]);
                            setOpenDockMenu(null);
                          }}
                          className={`w-full h-8 px-2.5 rounded-md text-xs font-medium flex items-center gap-2 ${
                            activeTool === 'fog_poly'
                              ? 'bg-accent-soft text-accent'
                              : 'hover:bg-surface-2 text-fg'
                          }`}
                        >
                          <Hexagon className="w-3.5 h-3.5" />
                          <span>Polígono livre (pontos)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              <span className="h-px bg-line mx-1 my-0.5" />

              {/* Multi-waypoint Ruler (R) */}
              <button
                type="button"
                onClick={() => {
                  setActiveTool('ruler');
                  setOpenDockMenu(null);
                }}
                title="Régua de distância em rota (R)"
                className={`btn btn-icon h-9 w-9 rounded-lg ${
                  activeTool === 'ruler'
                    ? 'bg-accent text-accent-fg shadow-sm'
                    : 'btn-ghost text-fg-muted hover:text-fg'
                }`}
              >
                <Ruler className="w-4 h-4" />
              </button>
            </div>

            {/* ============================================================= */}
            {/* TOP FLOATING CONTEXTUAL BARS (SELECTION OR ACTIVE TOOL HINT)  */}
            {/* ============================================================= */}
            {isGm && selectedShapes.length > 0 && activeTool === 'select' && (
              <FloatingShapeToolbar
                selectedShapes={selectedShapes}
                entities={entities}
                onUpdateSelected={updateSelectedShapes}
                onBringToFront={bringSelectedToFront}
                onSendToBack={sendSelectedToBack}
                onDuplicate={duplicateSelectedShapes}
                onDelete={deleteSelectedShapes}
                onOpenEntity={openEntityInWiki}
              />
            )}

            {/* Helper Pill for Multi-point / Pin / Sticky / Ruler Tools */}
            {(isMultiPointTool || activeTool === 'ruler' || activeTool === 'pin' || activeTool === 'sticky') && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/95 backdrop-blur border border-line-strong shadow-card text-xs pointer-events-auto"
              >
                {activeTool === 'pin' && (
                  <>
                    <span className="text-fg-muted">Ícone rápido:</span>
                    {(
                      ['castle', 'city', 'village', 'tavern', 'dungeon', 'skull', 'quest', 'party', 'secret'] as MapPinIcon[]
                    ).map((ic) => {
                      const Meta = PIN_ICON_META[ic];
                      const Ic = Meta.icon;
                      return (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => {
                            setDefaultPinIcon(ic);
                            setDefaultPinLayer(Meta.defaultLayer);
                          }}
                          title={Meta.label}
                          className={`w-6 h-6 rounded flex items-center justify-center ${
                            defaultPinIcon === ic
                              ? 'bg-accent-soft text-accent'
                              : 'text-fg-muted hover:text-fg'
                          }`}
                        >
                          <Ic className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                    <span className="text-fg-subtle">· Clique no mapa</span>
                  </>
                )}

                {activeTool === 'sticky' && (
                  <>
                    <span className="text-fg-muted">Cor da nota:</span>
                    {STICKY_PALETTE.map((sc) => (
                      <button
                        key={sc.hex}
                        type="button"
                        onClick={() => setStickyColor(sc.hex)}
                        className={`w-4 h-4 rounded border border-black/20 ${
                          stickyColor === sc.hex ? 'ring-2 ring-accent' : ''
                        }`}
                        style={{ backgroundColor: sc.hex }}
                        title={sc.label}
                      />
                    ))}
                    <span className="text-fg-subtle">· Clique ou arraste</span>
                  </>
                )}

                {isMultiPointTool && (
                  <>
                    <span className="text-fg-muted">
                      Clique para marcar vértices ({drawingPoints.length}) · Duplo clique ou Enter para concluir
                    </span>
                    {drawingPoints.length >= (activeTool === 'polygon' || activeTool === 'fog_poly' ? 3 : 2) && (
                      <button
                        type="button"
                        onClick={finishMultiPointDrawing}
                        className="btn btn-primary btn-sm h-6 px-2 text-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Concluir</span>
                      </button>
                    )}
                    {drawingPoints.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setDrawingPoints([])}
                        className="btn btn-ghost btn-sm h-6 px-2 text-xs"
                      >
                        Cancelar
                      </button>
                    )}
                  </>
                )}

                {activeTool === 'ruler' && (
                  <>
                    <Ruler className="w-3.5 h-3.5 text-accent" />
                    <span className="text-fg">
                      {rulerDistanceLabel
                        ? `Distância total: ${rulerDistanceLabel}`
                        : 'Clique no mapa para medir rotas com múltiplos pontos'}
                    </span>
                    {rulerPoints.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRulerPoints([])}
                        className="btn btn-ghost btn-sm h-6 px-2 text-xs"
                      >
                        Limpar
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* TRANSFORMED STAGE (THE BOARD)                                 */}
            {/* ============================================================= */}
            <div
              ref={stageRef}
              style={{
                width: `${stageW}px`,
                height: `${stageH}px`,
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transformOrigin: '0 0',
                willChange: 'transform',
                backgroundColor: themeMeta.stageBg,
                borderColor: themeMeta.borderColor,
              }}
              className="relative shadow-elevated border rounded-md overflow-visible"
            >
              {/* Optional Base Image */}
              {currentMap.customImageUrl && (
                <img
                  src={currentMap.customImageUrl}
                  alt={currentMap.name}
                  draggable={false}
                  decoding="async"
                  style={{ opacity: imageOpacity }}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none rounded-md"
                />
              )}

              {/* Grid Overlay (Dots Miro-style / Square / Hex) */}
              {gridMode !== 'off' && (
                <svg
                  viewBox={`0 0 ${stageW} ${stageH}`}
                  style={{ opacity: gridOpacity }}
                  className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
                >
                  <defs>
                    {gridMode === 'dots' && (
                      <pattern
                        id="miroDotsPattern"
                        width={gridSize}
                        height={gridSize}
                        patternUnits="userSpaceOnUse"
                      >
                        <circle
                          cx={gridSize / 2}
                          cy={gridSize / 2}
                          r={Math.max(1.2, gridSize * 0.042)}
                          fill={themeMeta.dotFill}
                        />
                      </pattern>
                    )}
                    {gridMode === 'square' && (
                      <pattern
                        id="miroSquarePattern"
                        width={gridSize}
                        height={gridSize}
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                          fill="none"
                          stroke={themeMeta.gridStroke}
                          strokeWidth="1.2"
                        />
                      </pattern>
                    )}
                    {gridMode === 'hex' && (
                      <pattern
                        id="miroHexPattern"
                        width={gridSize * 1.5}
                        height={gridSize * 1.299}
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d={`M ${gridSize * 0.75} 0 L ${gridSize * 1.5} ${gridSize * 0.375} L ${gridSize * 1.5} ${gridSize * 0.924} L ${gridSize * 0.75} ${gridSize * 1.299} L 0 ${gridSize * 0.924} L 0 ${gridSize * 0.375} Z`}
                          fill="none"
                          stroke={themeMeta.gridStroke}
                          strokeWidth="1.2"
                        />
                      </pattern>
                    )}
                  </defs>
                  <rect
                    width={stageW}
                    height={stageH}
                    fill={
                      gridMode === 'dots'
                        ? 'url(#miroDotsPattern)'
                        : gridMode === 'square'
                        ? 'url(#miroSquarePattern)'
                        : 'url(#miroHexPattern)'
                    }
                  />
                </svg>
              )}

              {/* Vector Stage (Freehand, Shapes, Sticky Notes, Stamps, Frames, Fog, Handles) */}
              <CanvasVectorStage
                shapes={visibleShapes}
                selectedShapeIds={selectedShapeIds}
                activeTool={activeTool}
                viewRole={viewRole}
                zoom={zoom}
                entitiesMap={entitiesMap}
                drawingPoints={drawingPoints}
                liveCursorPoint={liveCursorPoint}
                dragDraftShape={dragDraftShape}
                marqueeBox={marqueeBox}
                rulerPoints={rulerPoints}
                rulerDistanceLabel={rulerDistanceLabel}
                activeStrokeColor={brushColor}
                activeFillColor={brushFillColor}
                activeStrokeWidth={brushWidth}
                onShapePointerDown={handleShapePointerDown}
                onShapePointerEnter={handleShapePointerEnter}
                onShapeDoubleClick={handleShapeDoubleClick}
                onResizeHandlePointerDown={handleResizeHandlePointerDown}
                onRotateHandlePointerDown={handleRotateHandlePointerDown}
                onVertexPointerDown={handleVertexPointerDown}
                onSelectEntity={openEntityInWiki}
              />

              {/* Inline On-Canvas Textarea Editor (Sticky Notes, Text, Labels) */}
              {editingShape && editingBounds && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    left: `${editingBounds.x}%`,
                    top: `${editingBounds.y}%`,
                    width: `${Math.max(12, editingBounds.width)}%`,
                    minHeight: `${Math.max(5, editingBounds.height)}%`,
                  }}
                  className="absolute z-40"
                >
                  <textarea
                    autoFocus
                    value={editingShapeText}
                    onChange={(e) => setEditingShapeText(e.target.value)}
                    onBlur={commitInlineTextEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || editingShape.type !== 'sticky')) {
                        e.preventDefault();
                        commitInlineTextEdit();
                      }
                    }}
                    placeholder="Digite o texto…"
                    className="w-full h-full min-h-[72px] p-2 rounded-md border-2 border-accent shadow-elevated bg-surface text-fg text-sm resize-both focus:outline-none"
                  />
                </div>
              )}

              {/* RPG Interactive Pins */}
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
                    canDrag={isGm && activeTool === 'select'}
                    viewRole={viewRole}
                    onSelect={(id) => {
                      setSelectedPinId(id);
                      setSelectedShapeIds([]);
                    }}
                    onStartDrag={handleStartPinDrag}
                  />
                );
              })}
            </div>

            {/* ============================================================= */}
            {/* BOTTOM-LEFT: OBJECTS, LAYERS & FOG DRAWER                     */}
            {/* ============================================================= */}
            {isGm && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute bottom-3 left-3 z-30 pointer-events-auto"
              >
                {!showLayersDrawer ? (
                  <button
                    type="button"
                    onClick={() => setShowLayersDrawer(true)}
                    className="btn btn-secondary btn-sm shadow-card bg-surface/95 backdrop-blur"
                  >
                    <Layers className="w-4 h-4 text-fg-subtle" />
                    <span>Elementos</span>
                    <span className="text-fg-subtle tabular-nums">
                      {serverShapes.length}
                    </span>
                  </button>
                ) : (
                  <div className="card shadow-elevated w-80 max-w-[calc(100vw-3rem)] bg-surface/95 backdrop-blur">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-line">
                      <span className="text-xs font-semibold text-fg">
                        Elementos do canvas ({serverShapes.length})
                      </span>
                      <div className="flex items-center gap-1">
                        {serverShapes.length > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Limpar todos os desenhos?',
                                message:
                                  'Todos os traços, formas, notas e névoas deste mapa serão apagados (você pode desfazer com Ctrl+Z).',
                                confirmLabel: 'Limpar canvas',
                              });
                              if (ok) {
                                commitShapesWithHistory([], 'limpar canvas');
                                setSelectedShapeIds([]);
                              }
                            }}
                            className="text-[11px] text-danger hover:underline px-1.5"
                          >
                            Limpar tudo
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowLayersDrawer(false)}
                          className="btn btn-ghost btn-icon h-6 w-6"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                      {serverShapes.length === 0 ? (
                        <p className="text-xs text-fg-subtle p-3 text-center">
                          Use a barra à esquerda para desenhar livremente, criar formas, notas adesivas, carimbos ou névoa.
                        </p>
                      ) : (
                        [...serverShapes].reverse().map((sh) => {
                          const selected = selectedShapeIds.includes(sh.id);
                          const isFog = sh.type === 'fog' || sh.type === 'fog_poly';
                          return (
                            <div
                              key={sh.id}
                              onClick={() => {
                                setSelectedShapeIds([sh.id]);
                                const b = getShapeBounds(sh);
                                centerOnPercent(b.cx, b.cy, Math.max(zoom, 1.1));
                              }}
                              className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs ${
                                selected
                                  ? 'bg-accent-soft text-accent font-medium'
                                  : 'hover:bg-surface-2 text-fg'
                              }`}
                            >
                              <div className="min-w-0 flex-1 flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20"
                                  style={{
                                    backgroundColor: isFog
                                      ? '#52525b'
                                      : sh.fillColor || sh.color,
                                  }}
                                />
                                <span className="truncate">
                                  {sh.label || `[${sh.type}]`}
                                </span>
                              </div>

                              <div
                                className="flex items-center gap-0.5 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = serverShapes.map((item) =>
                                      item.id === sh.id
                                        ? { ...item, locked: !item.locked }
                                        : item
                                    );
                                    commitShapesWithHistory(next, 'travar/destravar');
                                  }}
                                  className="btn btn-ghost btn-icon h-6 w-6"
                                  title={sh.locked ? 'Destravar' : 'Travar'}
                                >
                                  {sh.locked ? (
                                    <Lock className="w-3 h-3 text-accent" />
                                  ) : (
                                    <Unlock className="w-3 h-3 text-fg-subtle" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = serverShapes.map((item) => {
                                      if (item.id !== sh.id) return item;
                                      if (isFog) {
                                        return { ...item, isRevealed: !item.isRevealed };
                                      }
                                      const hidden = item.isSecret && !item.isRevealed;
                                      return hidden
                                        ? { ...item, isSecret: false, isRevealed: true }
                                        : { ...item, isSecret: true, isRevealed: false };
                                    });
                                    commitShapesWithHistory(next, 'visibilidade');
                                  }}
                                  className="btn btn-ghost btn-icon h-6 w-6"
                                  title="Alternar visibilidade aos jogadores"
                                >
                                  {(isFog ? !sh.isRevealed : sh.isSecret && !sh.isRevealed) ? (
                                    <EyeOff className="w-3 h-3 text-warning" />
                                  ) : (
                                    <Eye className="w-3 h-3 text-fg-subtle" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    commitShapesWithHistory(
                                      serverShapes.filter((item) => item.id !== sh.id),
                                      'remover elemento'
                                    );
                                  }}
                                  className="btn btn-danger-ghost btn-icon h-6 w-6"
                                  title="Remover"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* BOTTOM-RIGHT: MINI-MAP NAVIGATOR + GRID/SNAP/ZOOM BAR         */}
            {/* ============================================================= */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute bottom-3 right-3 z-30 flex flex-col items-end gap-2 pointer-events-auto"
            >
              {showMinimap && (
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const xp = ((e.clientX - rect.left) / rect.width) * 100;
                    const yp = ((e.clientY - rect.top) / rect.height) * 100;
                    centerOnPercent(xp, yp, zoom);
                  }}
                  title="Minimapa de navegação (clique para saltar)"
                  style={{ backgroundColor: themeMeta.stageBg }}
                  className="w-40 h-24 rounded-lg border border-line-strong shadow-elevated overflow-hidden relative cursor-pointer"
                >
                  {currentMap.customImageUrl && (
                    <img
                      src={currentMap.customImageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain opacity-65 pointer-events-none"
                    />
                  )}
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                    {visibleShapes.slice(0, 80).map((s) => {
                      const b = getShapeBounds(s);
                      return (
                        <rect
                          key={s.id}
                          x={b.x}
                          y={b.y}
                          width={Math.max(1.5, b.width)}
                          height={Math.max(1.5, b.height)}
                          fill={s.fillColor || s.color}
                          fillOpacity={0.55}
                        />
                      );
                    })}
                    {visiblePins.map((p) => (
                      <circle
                        key={p.id}
                        cx={p.x}
                        cy={p.y}
                        r={2}
                        fill={LAYER_CONFIG[p.layer]?.color || '#22a06b'}
                      />
                    ))}
                    <rect
                      x={minimapViewport.x}
                      y={minimapViewport.y}
                      width={minimapViewport.w}
                      height={minimapViewport.h}
                      fill="rgba(59,130,246,0.16)"
                      stroke="#3b82f6"
                      strokeWidth={1.6}
                    />
                  </svg>
                </div>
              )}

              <div className="flex items-center gap-0.5 p-1 rounded-xl bg-surface/95 backdrop-blur border border-line-strong shadow-elevated">
                {isGm && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const order: MapGridMode[] = ['dots', 'square', 'hex', 'off'];
                        const next =
                          order[(order.indexOf(gridMode) + 1) % order.length];
                        void updateMap(currentMap.id, { gridMode: next });
                      }}
                      className={`btn btn-ghost btn-sm h-7 px-2 text-xs ${
                        gridMode !== 'off' ? 'text-accent' : 'text-fg-muted'
                      }`}
                      title="Alternar grade (Pontilhada Miro / Quadrada / Hexagonal / Desligada)"
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {gridMode === 'dots'
                          ? 'Pontos'
                          : gridMode === 'square'
                          ? 'Quad.'
                          : gridMode === 'hex'
                          ? 'Hex'
                          : 'Off'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSnapToGrid((s) => !s)}
                      className={`btn btn-ghost btn-icon h-7 w-7 ${
                        snapToGrid ? 'bg-accent-soft text-accent' : 'text-fg-muted'
                      }`}
                      title={
                        snapToGrid
                          ? 'Alinhamento magnético à grade ativado'
                          : 'Ativar alinhamento magnético à grade (Snap)'
                      }
                    >
                      <Magnet className="w-3.5 h-3.5" />
                    </button>

                    <span className="w-px h-4 bg-line mx-0.5" />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setShowMinimap((m) => !m)}
                  className={`btn btn-ghost btn-icon h-7 w-7 ${
                    showMinimap ? 'text-accent' : 'text-fg-muted'
                  }`}
                  title="Mostrar/ocultar minimapa"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => adjustZoomAroundCenter(1 / 1.25)}
                  className="btn btn-ghost btn-icon h-7 w-7"
                  title="Reduzir zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={fitMapToViewport}
                  className="btn btn-ghost h-7 px-1.5 text-xs tabular-nums min-w-[48px]"
                  title="Ajustar quadro à tela"
                >
                  {Math.round(zoom * 100)}%
                </button>

                <button
                  type="button"
                  onClick={() => adjustZoomAroundCenter(1.25)}
                  className="btn btn-ghost btn-icon h-7 w-7"
                  title="Ampliar zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right Side RPG Pin Inspector Drawer */}
        {activePin && currentMap && (
          <MapPinInspector
            activePin={activePin}
            currentMap={currentMap}
            maps={maps}
            entities={entities}
            entitiesMap={entitiesMap}
            viewRole={viewRole}
            onClose={() => setSelectedPinId(null)}
            onSelectMap={(mapId, firstPinId) => {
              setSelectedMapId(mapId);
              setSelectedPinId(firstPinId);
            }}
            onOpenEntity={openEntityInWiki}
            onUpdatePin={(mapId, pinId, updates) =>
              void updateMapPin(mapId, pinId, updates)
            }
            onDeletePin={(mapId, pinId) => void deleteMapPin(mapId, pinId)}
            onToggleRevealPin={(mapId, pinId) =>
              void toggleRevealMapPin(mapId, pinId)
            }
            onCreateWikiFromPin={() => void handleCreateWikiFromActivePin()}
            onAddMonsterToCombat={(m, pinLabel) => {
              void addCombatant({
                name: m.replace(/^[@#]/, ''),
                type: 'monster',
                initiative: Math.floor(Math.random() * 20) + 3,
                hp: 45,
                maxHp: 45,
                armorClass: 15,
                conditions: [],
                notes: `Originado de ${pinLabel}`,
              });
              showToast(`"${m}" adicionado ao combate.`);
            }}
            onToast={showToast}
          />
        )}
      </div>

      {/* Modals */}
      {currentMap && (
        <CreatePinModal
          coords={pendingPinCoords}
          defaultIcon={defaultPinIcon}
          defaultLayer={defaultPinLayer}
          currentMap={currentMap}
          maps={maps}
          entities={entities}
          entitiesMap={entitiesMap}
          onClose={() => setPendingPinCoords(null)}
          onSubmit={handleCreatePinSubmit}
        />
      )}

      <MapSettingsModal
        isOpen={settingsModal !== null}
        mode={settingsModal || 'create'}
        initialMap={settingsModal === 'edit' ? currentMap : undefined}
        onClose={() => setSettingsModal(null)}
        onSubmit={handleSettingsSubmit}
        onToast={showToast}
      />
    </div>
  );
};
