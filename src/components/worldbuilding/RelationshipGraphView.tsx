import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Check,
  Crosshair,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  GitBranch,
  LayoutGrid,
  Link2,
  Lock,
  Maximize2,
  Minimize2,
  Network,
  Orbit,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Workflow,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import type { EntityCategory, RelationType, RelationshipEdge } from '../../types/campaign';
import type {
  AiSuggestedGraphNode,
  AiSuggestedRelationship,
} from '../../services/geminiService';
import {
  GRAPH_CANVAS_CENTER,
  GraphLayoutMode,
  NODE_CATEGORY_META,
  NodeCategory,
  RELATION_META,
  UnifiedGraphNode,
  computeGraphLayout,
} from './graph/graphLayout';
import { GraphAiModal } from './graph/GraphAiModal';

const MIN_ZOOM = 0.22;
const MAX_ZOOM = 2.6;
const NODE_W = 168;
const NODE_H = 66;

/** Computes point on rounded rectangle perimeter facing target (tx, ty) so arrowheads sit cleanly on card border. */
function getCardPerimeterPoint(
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  halfW = NODE_W / 2 + 4,
  halfH = NODE_H / 2 + 4
): { x: number; y: number } {
  const dx = tx - cx;
  const dy = ty - cy;
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return { x: cx, y: cy };
  const scaleX = Math.abs(dx) > 0.001 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0.001 ? halfH / Math.abs(dy) : Infinity;
  const s = Math.min(scaleX, scaleY);
  return { x: cx + dx * s, y: cy + dy * s };
}

export const RelationshipGraphView: React.FC = () => {
  const entities = useCampaignStore((s) => s.entities);
  const manualGraphNodes = useCampaignStore((s) => s.manualGraphNodes);
  const characterSheets = useCampaignStore((s) => s.characterSheets);
  const relationships = useCampaignStore((s) => s.relationships);
  const graphPositions = useCampaignStore((s) => s.graphPositions);
  const fronts = useCampaignStore((s) => s.fronts);
  const quests = useCampaignStore((s) => s.quests);
  const journal = useCampaignStore((s) => s.journal);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const geminiApiKey = useCampaignStore((s) => s.geminiApiKey);
  const viewRole = useCampaignStore((s) => s.viewRole);

  const updateGraphNodePosition = useCampaignStore((s) => s.updateGraphNodePosition);
  const commitGraphNodePosition = useCampaignStore((s) => s.commitGraphNodePosition);
  const batchUpdateGraphPositions = useCampaignStore((s) => s.batchUpdateGraphPositions);
  const addManualGraphNode = useCampaignStore((s) => s.addManualGraphNode);
  const deleteManualGraphNode = useCampaignStore((s) => s.deleteManualGraphNode);
  const addEntity = useCampaignStore((s) => s.addEntity);
  const addRelationship = useCampaignStore((s) => s.addRelationship);
  const updateRelationshipLabel = useCampaignStore((s) => s.updateRelationshipLabel);
  const deleteRelationship = useCampaignStore((s) => s.deleteRelationship);
  const toggleRevealRelationship = useCampaignStore((s) => s.toggleRevealRelationship);
  const setSelectedEntityId = useCampaignStore((s) => s.setSelectedEntityId);
  const setWorldSubTab = useCampaignStore((s) => s.setWorldSubTab);
  const setIsSettingsModalOpen = useCampaignStore((s) => s.setIsSettingsModalOpen);
  const showToast = useCampaignStore((s) => s.showToast);

  const isGm = viewRole === 'gm';
  const activeCamp = campaigns.find((c) => c.id === activeCampaignId);

  // Build Unified Graph Nodes (respecting player visibility in player preview!)
  const allNodes: UnifiedGraphNode[] = useMemo(() => {
    const visibleEntities = isGm
      ? entities
      : entities.filter((e) => e.isPublicToPlayers);
    const publicEntityIds = new Set(visibleEntities.map((e) => e.id));

    const fromEntities: UnifiedGraphNode[] = visibleEntities.map((e) => ({
      id: e.id,
      label: `${e.mentionPrefix}${e.handle}`,
      subtitle: e.name,
      roleOrTag: e.subtitle || e.tags[0] || '',
      category: e.category,
      isManual: false,
      entityId: e.id,
      isHiddenFromPlayers: !e.isPublicToPlayers,
      summary: e.summary || e.publicContent,
    }));

    const fromManual: UnifiedGraphNode[] = manualGraphNodes
      .filter((m) => isGm || !m.entityId || publicEntityIds.has(m.entityId))
      .map((m) => ({
        id: m.id,
        label: m.label,
        subtitle: m.subtitle || m.label,
        roleOrTag: 'Nó manual',
        category: m.category,
        isManual: true,
        entityId: m.entityId,
      }));

    return [...fromEntities, ...fromManual];
  }, [entities, manualGraphNodes, isGm]);

  const allNodesMap = useMemo(
    () => new Map(allNodes.map((n) => [n.id, n])),
    [allNodes]
  );

  // Visible relationships respecting GM vs Player role and existing nodes
  const visibleRelationships = useMemo(
    () =>
      relationships.filter(
        (r) =>
          (isGm || !r.isSecret || r.isRevealed) &&
          allNodesMap.has(r.sourceId) &&
          allNodesMap.has(r.targetId)
      ),
    [relationships, isGm, allNodesMap]
  );

  // Filters, Search, Focus Mode & Inspector Tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<NodeCategory | 'all'>('all');
  const [relTypeFilter, setRelTypeFilter] = useState<RelationType | 'all'>('all');
  const [egoFocusOnly, setEgoFocusOnly] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'node' | 'all' | 'create'>('node');

  // Viewport Pan, Zoom, Fullscreen & Layout Menu
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const svgExportRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showFiltersBar, setShowFiltersBar] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);

  // Dragging node / panning / drag-connecting wires
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragNodeOffsetRef = useRef<{ dx: number; dy: number; moved: boolean }>({
    dx: 0,
    dy: 0,
    moved: false,
  });
  const panDragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, origPanX: 0, origPanY: 0, moved: false });

  const [isConnectMode, setIsConnectMode] = useState(false);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [wireCursor, setWireCursor] = useState<{ x: number; y: number } | null>(null);
  const [quickLinkPair, setQuickLinkPair] = useState<{
    sourceId: string;
    targetId: string;
  } | null>(null);

  // Manual Node Form
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeSubtitle, setNewNodeSubtitle] = useState('');
  const [newNodeCategory, setNewNodeCategory] = useState<NodeCategory>('npc');

  // Relationship Create & Inline Edit State
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [edgeLabel, setEdgeLabel] = useState('');
  const [edgeType, setEdgeType] = useState<RelationType>('allied');
  const [edgeNotes, setEdgeNotes] = useState('');
  const [edgeIsSecret, setEdgeIsSecret] = useState(false);

  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [editEdgeDraft, setEditEdgeDraft] = useState<{
    label: string;
    type: RelationType;
    notes: string;
  } | null>(null);

  // Keep valid default selections
  useEffect(() => {
    if (allNodes.length === 0) return;
    if (!selectedNodeId || !allNodesMap.has(selectedNodeId)) {
      setSelectedNodeId(allNodes[0].id);
    }
    if (!sourceId || !allNodesMap.has(sourceId)) {
      setSourceId(allNodes[0].id);
    }
    if (!targetId || !allNodesMap.has(targetId)) {
      setTargetId(allNodes[1]?.id || allNodes[0].id);
    }
  }, [allNodes, allNodesMap, selectedNodeId, sourceId, targetId]);

  // Deterministic Auto-Layout Fallback for any unpositioned nodes!
  const fallbackPositionMap = useMemo(() => {
    const auto = computeGraphLayout('force', allNodes, visibleRelationships);
    return new Map(auto.map((p) => [p.entityId, { x: p.x, y: p.y }]));
  }, [allNodes, visibleRelationships]);

  const savedPositionMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const p of graphPositions) m.set(p.entityId, { x: p.x, y: p.y });
    for (const mn of manualGraphNodes) m.set(mn.id, { x: mn.x, y: mn.y });
    return m;
  }, [graphPositions, manualGraphNodes]);

  const getNodePos = useCallback(
    (nodeId: string): { x: number; y: number } => {
      return (
        savedPositionMap.get(nodeId) ||
        fallbackPositionMap.get(nodeId) ||
        GRAPH_CANVAS_CENTER
      );
    },
    [savedPositionMap, fallbackPositionMap]
  );

  // Filtered Nodes & Edges
  const activeNeighborSet = useMemo(() => {
    const focusId = hoveredNodeId || selectedNodeId;
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    for (const r of visibleRelationships) {
      if (r.sourceId === focusId) set.add(r.targetId);
      if (r.targetId === focusId) set.add(r.sourceId);
    }
    return set;
  }, [hoveredNodeId, selectedNodeId, visibleRelationships]);

  const filteredRelationships = useMemo(() => {
    return visibleRelationships.filter((r) => {
      if (relTypeFilter !== 'all' && r.type !== relTypeFilter) return false;
      if (egoFocusOnly && selectedNodeId) {
        if (r.sourceId !== selectedNodeId && r.targetId !== selectedNodeId) return false;
      }
      return true;
    });
  }, [visibleRelationships, relTypeFilter, egoFocusOnly, selectedNodeId]);

  const filteredNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const egoNeighbors = new Set<string>();
    if (egoFocusOnly && selectedNodeId) {
      egoNeighbors.add(selectedNodeId);
      for (const r of visibleRelationships) {
        if (r.sourceId === selectedNodeId) egoNeighbors.add(r.targetId);
        if (r.targetId === selectedNodeId) egoNeighbors.add(r.sourceId);
      }
    }

    return allNodes.filter((n) => {
      if (egoFocusOnly && selectedNodeId && !egoNeighbors.has(n.id)) return false;
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
      if (q) {
        return (
          n.subtitle.toLowerCase().includes(q) ||
          n.label.toLowerCase().includes(q) ||
          (n.roleOrTag || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allNodes, categoryFilter, searchQuery, egoFocusOnly, selectedNodeId, visibleRelationships]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes]
  );

  const renderedEdges = useMemo(
    () =>
      filteredRelationships.filter(
        (r) => filteredNodeIds.has(r.sourceId) && filteredNodeIds.has(r.targetId)
      ),
    [filteredRelationships, filteredNodeIds]
  );

  // Compute degree count for every node
  const nodeDegrees = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of visibleRelationships) {
      map.set(r.sourceId, (map.get(r.sourceId) || 0) + 1);
      map.set(r.targetId, (map.get(r.targetId) || 0) + 1);
    }
    return map;
  }, [visibleRelationships]);

  // Parallel-edge grouping so multiple edges between A and B curve cleanly apart!
  const edgeCurveOffsets = useMemo(() => {
    const groups = new Map<string, RelationshipEdge[]>();
    for (const r of renderedEdges) {
      const pairKey = [r.sourceId, r.targetId].sort().join('::');
      const arr = groups.get(pairKey) || [];
      arr.push(r);
      groups.set(pairKey, arr);
    }
    const offsets = new Map<string, number>();
    for (const [, list] of groups) {
      if (list.length === 1) {
        // Subtle gentle curve even on single edges for organic aesthetic
        offsets.set(list[0].id, 18);
      } else {
        list.forEach((edge, i) => {
          const step = 46;
          const rawOffset = (i - (list.length - 1) / 2) * step;
          // Flip sign if sourceId > targetId so A->B and B->A curve to opposite sides!
          const dirSign = edge.sourceId < edge.targetId ? 1 : -1;
          offsets.set(edge.id, rawOffset === 0 ? 22 * dirSign : rawOffset * dirSign);
        });
      }
    }
    return offsets;
  }, [renderedEdges]);

  // Fit Graph to Viewport
  const fitGraphToViewport = useCallback(
    (customPositions?: { entityId: string; x: number; y: number }[]) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const vw = vp.clientWidth;
      const vh = vp.clientHeight;
      if (vw <= 0 || vh <= 0) return;

      const customMap = customPositions
        ? new Map(customPositions.map((p) => [p.entityId, p]))
        : null;

      const targetNodes = filteredNodes.length > 0 ? filteredNodes : allNodes;
      if (targetNodes.length === 0) {
        setZoom(0.9);
        setPan({ x: vw / 2 - GRAPH_CANVAS_CENTER.x * 0.9, y: vh / 2 - GRAPH_CANVAS_CENTER.y * 0.9 });
        return;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n of targetNodes) {
        const p = customMap?.get(n.id) || getNodePos(n.id);
        minX = Math.min(minX, p.x - NODE_W / 2 - 40);
        maxX = Math.max(maxX, p.x + NODE_W / 2 + 40);
        minY = Math.min(minY, p.y - NODE_H / 2 - 40);
        maxY = Math.max(maxY, p.y + NODE_H / 2 + 40);
      }

      const contentW = Math.max(320, maxX - minX);
      const contentH = Math.max(240, maxY - minY);
      const fitZ = Math.max(
        MIN_ZOOM,
        Math.min(1.15, Math.min((vw - 64) / contentW, (vh - 64) / contentH))
      );
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      setZoom(Number(fitZ.toFixed(3)));
      setPan({
        x: Math.round(vw / 2 - cx * fitZ),
        y: Math.round(vh / 2 - cy * fitZ),
      });
    },
    [filteredNodes, allNodes, getNodePos]
  );

  const centerOnNode = useCallback(
    (nodeId: string, targetZoom?: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const p = getNodePos(nodeId);
      const z = targetZoom ?? Math.max(zoom, 0.95);
      setZoom(z);
      setPan({
        x: Math.round(vp.clientWidth / 2 - p.x * z),
        y: Math.round(vp.clientHeight / 2 - p.y * z),
      });
    },
    [getNodePos, zoom]
  );

  // Fit on initial load or fullscreen toggle
  const didInitialFitRef = useRef(false);
  useEffect(() => {
    if (allNodes.length > 0 && !didInitialFitRef.current) {
      didInitialFitRef.current = true;
      window.requestAnimationFrame(() => fitGraphToViewport());
    }
  }, [allNodes.length, fitGraphToViewport]);

  useEffect(() => {
    window.requestAnimationFrame(() => fitGraphToViewport());
  }, [isFullscreen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Native Wheel Zoom centered on cursor
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        return;
      }
      const rect = vp.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom((prevZ) => {
        const nextZ = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, Number((prevZ * factor).toFixed(3)))
        );
        setPan((prevP) => {
          const wx = (cx - prevP.x) / prevZ;
          const wy = (cy - prevP.y) / prevZ;
          return { x: cx - wx * nextZ, y: cy - wy * nextZ };
        });
        return nextZ;
      });
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, []);

  const clientToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const vp = viewportRef.current;
      if (!vp) return GRAPH_CANVAS_CENTER;
      const rect = vp.getBoundingClientRect();
      return {
        x: Math.round((clientX - rect.left - pan.x) / zoom),
        y: Math.round((clientY - rect.top - pan.y) / zoom),
      };
    },
    [pan.x, pan.y, zoom]
  );

  // Apply Professional Auto-Layout
  const handleRunAutoLayout = async (mode: GraphLayoutMode) => {
    setShowLayoutMenu(false);
    if (!isGm || allNodes.length === 0) return;
    const computed = computeGraphLayout(
      mode,
      allNodes,
      visibleRelationships,
      selectedNodeId
    );
    await batchUpdateGraphPositions(computed);
    fitGraphToViewport(computed);
    const labelMap: Record<GraphLayoutMode, string> = {
      force: 'Força Orgânica & Comunidades',
      hierarchical: 'Hierarquia de Poder',
      radial: 'Anéis Radiais em Foco',
      clusters: 'Setores por Categoria',
    };
    showToast(`Grafo organizado: ${labelMap[mode]}.`);
  };

  // Apply AI Suggestions + Optional Auto-Layout
  const handleApplyAiSuggestions = async (payload: {
    nodesToCreate: AiSuggestedGraphNode[];
    relationshipsToCreate: AiSuggestedRelationship[];
    autoLayoutAfter: boolean;
  }) => {
    const tempKeyToRealId = new Map<string, string>();

    // 1. Create any selected new Wiki entities first
    for (const sn of payload.nodesToCreate) {
      const created = await addEntity({
        name: sn.name,
        subtitle: sn.subtitle,
        category: sn.category as EntityCategory,
        summary: sn.summary,
        publicContent: sn.summary,
        isPublicToPlayers: false,
        secrets: sn.secret
          ? [
              {
                id: `sec-${Date.now()}`,
                title: 'Segredo de Intriga',
                content: sn.secret,
                isRevealed: false,
              },
            ]
          : [],
      });
      if (created) {
        tempKeyToRealId.set(sn.tempKey, created.id);
      }
    }

    // 2. Create all selected relationships
    let createdCount = 0;
    const addedEdgesForLayout: RelationshipEdge[] = [];
    for (const rel of payload.relationshipsToCreate) {
      const realSrc = tempKeyToRealId.get(rel.sourceId) || rel.sourceId;
      const realTgt = tempKeyToRealId.get(rel.targetId) || rel.targetId;
      if (
        (!allNodesMap.has(realSrc) && !Array.from(tempKeyToRealId.values()).includes(realSrc)) ||
        (!allNodesMap.has(realTgt) && !Array.from(tempKeyToRealId.values()).includes(realTgt))
      ) {
        continue;
      }
      const id = await addRelationship({
        sourceId: realSrc,
        targetId: realTgt,
        label: rel.label,
        type: rel.type,
        notes: rel.rationale,
        isSecret: rel.isSecret,
        isRevealed: !rel.isSecret,
      });
      if (id) {
        createdCount++;
        addedEdgesForLayout.push({
          id,
          sourceId: realSrc,
          targetId: realTgt,
          label: rel.label,
          type: rel.type,
          notes: rel.rationale,
          isSecret: rel.isSecret,
          isRevealed: !rel.isSecret,
        });
      }
    }

    // 3. Auto-layout including newly created nodes/edges
    if (payload.autoLayoutAfter) {
      const currentState = useCampaignStore.getState();
      const updatedNodes: UnifiedGraphNode[] = [
        ...currentState.entities.map((e) => ({
          id: e.id,
          label: `${e.mentionPrefix}${e.handle}`,
          subtitle: e.name,
          category: e.category,
          isManual: false,
          entityId: e.id,
        })),
        ...currentState.manualGraphNodes.map((m) => ({
          id: m.id,
          label: m.label,
          subtitle: m.subtitle || m.label,
          category: m.category,
          isManual: true,
          entityId: m.entityId,
        })),
      ];
      const combinedEdges = [...visibleRelationships, ...addedEdgesForLayout];
      const layout = computeGraphLayout('force', updatedNodes, combinedEdges);
      await batchUpdateGraphPositions(layout);
      fitGraphToViewport(layout);
    }

    showToast(
      `${createdCount} vínculo(s)${
        tempKeyToRealId.size > 0 ? ` e ${tempKeyToRealId.size} entrada(s)` : ''
      } adicionados ao grafo.`,
      'success'
    );
  };

  // Pointer Handlers on Canvas
  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setShowLayoutMenu(false);
    if (e.button !== 0 && e.button !== 1) return;
    panDragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const world = clientToWorld(e.clientX, e.clientY);

    if (connectingSourceId) {
      setWireCursor(world);
    }

    if (draggingNodeId && isGm) {
      const nx = world.x - dragNodeOffsetRef.current.dx;
      const ny = world.y - dragNodeOffsetRef.current.dy;
      dragNodeOffsetRef.current.moved = true;
      updateGraphNodePosition(draggingNodeId, nx, ny, { persist: false });
      return;
    }

    if (panDragRef.current.active) {
      const dx = e.clientX - panDragRef.current.startX;
      const dy = e.clientY - panDragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panDragRef.current.moved = true;
      setPan({
        x: panDragRef.current.origPanX + dx,
        y: panDragRef.current.origPanY + dy,
      });
    }
  };

  const handleViewportPointerUp = () => {
    if (draggingNodeId && isGm) {
      if (dragNodeOffsetRef.current.moved) {
        void commitGraphNodePosition(draggingNodeId);
      }
      setDraggingNodeId(null);
      return;
    }
    if (panDragRef.current.active) {
      const moved = panDragRef.current.moved;
      panDragRef.current.active = false;
      if (!moved && connectingSourceId) {
        setConnectingSourceId(null);
        setWireCursor(null);
      }
    }
  };

  const handleNodePointerDown = (
    e: React.PointerEvent<SVGGElement>,
    nodeId: string
  ) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setInspectorTab('node');

    if (isConnectMode && isGm) {
      if (!connectingSourceId) {
        setConnectingSourceId(nodeId);
        setWireCursor(getNodePos(nodeId));
      } else if (connectingSourceId !== nodeId) {
        setQuickLinkPair({ sourceId: connectingSourceId, targetId: nodeId });
        setEdgeLabel('');
        setConnectingSourceId(null);
        setWireCursor(null);
      }
      return;
    }

    if (isGm && e.button === 0) {
      const world = clientToWorld(e.clientX, e.clientY);
      const cur = getNodePos(nodeId);
      dragNodeOffsetRef.current = {
        dx: world.x - cur.x,
        dy: world.y - cur.y,
        moved: false,
      };
      setDraggingNodeId(nodeId);
    }
  };

  const handleStartQuickWireFromNode = (
    e: React.PointerEvent<SVGGElement>,
    nodeId: string
  ) => {
    e.stopPropagation();
    if (!isGm) return;
    setConnectingSourceId(nodeId);
    setWireCursor(getNodePos(nodeId));
  };

  const handleNodePointerUp = (
    e: React.PointerEvent<SVGGElement>,
    nodeId: string
  ) => {
    if (connectingSourceId && connectingSourceId !== nodeId && isGm) {
      e.stopPropagation();
      setQuickLinkPair({ sourceId: connectingSourceId, targetId: nodeId });
      setEdgeLabel('');
      setConnectingSourceId(null);
      setWireCursor(null);
    }
  };

  // Import Active Party Character Sheets as Graph Nodes (1 click!)
  const unmappedPartySheets = useMemo(() => {
    const campaignSheets = characterSheets.filter(
      (cs) => cs.campaignId === activeCampaignId
    );
    return campaignSheets.filter(
      (cs) =>
        !manualGraphNodes.some(
          (mn) =>
            mn.category === 'player' &&
            mn.subtitle?.toLowerCase() === cs.name.toLowerCase()
        )
    );
  }, [characterSheets, activeCampaignId, manualGraphNodes]);

  const handleImportPartyNodes = async () => {
    for (let i = 0; i < unmappedPartySheets.length; i++) {
      const cs = unmappedPartySheets[i];
      const handle = `@${cs.name.replace(/\s+/g, '').slice(0, 14)}`;
      await addManualGraphNode({
        label: handle,
        subtitle: cs.name,
        category: 'player',
        x: GRAPH_CANVAS_CENTER.x + (i - 1) * 210,
        y: GRAPH_CANVAS_CENTER.y - 220,
      });
    }
  };

  const handleCreateManualNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeLabel.trim()) return;
    const vp = viewportRef.current;
    const centerWorld = vp
      ? {
          x: Math.round((vp.clientWidth / 2 - pan.x) / zoom),
          y: Math.round((vp.clientHeight / 2 - pan.y) / zoom),
        }
      : GRAPH_CANVAS_CENTER;

    const id = await addManualGraphNode({
      label: newNodeLabel.trim(),
      subtitle: newNodeSubtitle.trim() || newNodeLabel.trim(),
      category: newNodeCategory,
      x: centerWorld.x + Math.round((Math.random() - 0.5) * 80),
      y: centerWorld.y + Math.round((Math.random() - 0.5) * 80),
    });
    setNewNodeLabel('');
    setNewNodeSubtitle('');
    setShowAddNodeModal(false);
    if (id) setSelectedNodeId(id);
  };

  const handleCreateRelationship = async (
    e: React.FormEvent,
    overrideSrc?: string,
    overrideTgt?: string
  ) => {
    e.preventDefault();
    const sId = overrideSrc || sourceId;
    const tId = overrideTgt || targetId;
    if (!edgeLabel.trim() || !sId || !tId || sId === tId) return;
    await addRelationship({
      sourceId: sId,
      targetId: tId,
      label: edgeLabel.trim(),
      type: edgeType,
      notes: edgeNotes.trim() || undefined,
      isSecret: edgeIsSecret,
      isRevealed: !edgeIsSecret,
    });
    setEdgeLabel('');
    setEdgeNotes('');
    setQuickLinkPair(null);
  };

  // Export Graph as High-Resolution PNG
  const handleExportGraphPng = async () => {
    if (filteredNodes.length === 0 || !svgExportRef.current) return;
    try {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n of filteredNodes) {
        const p = getNodePos(n.id);
        minX = Math.min(minX, p.x - NODE_W);
        maxX = Math.max(maxX, p.x + NODE_W);
        minY = Math.min(minY, p.y - NODE_H);
        maxY = Math.max(maxY, p.y + NODE_H);
      }
      const w = Math.max(800, Math.round(maxX - minX + 120));
      const h = Math.max(600, Math.round(maxY - minY + 120));

      const clone = svgExportRef.current.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('width', String(w));
      clone.setAttribute('height', String(h));
      clone.setAttribute('viewBox', `${minX - 60} ${minY - 60} ${w} ${h}`);
      const innerG = clone.querySelector('[data-graph-world]');
      if (innerG) innerG.setAttribute('transform', 'translate(0,0) scale(1)');

      const xml = new XMLSerializer().serializeToString(clone);
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;

      const canvas = document.createElement('canvas');
      canvas.width = w * 1.5;
      canvas.height = h * 1.5;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#111216';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = url;
      });

      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `grafo-relacoes-${(activeCamp?.title || 'codex')
        .toLowerCase()
        .replace(/\s+/g, '-')}.png`;
      a.click();
      showToast('Grafo exportado como PNG.');
    } catch {
      showToast('Não foi possível exportar o grafo.');
    }
  };

  const selectedNode = allNodesMap.get(selectedNodeId);
  const selectedNodeEdges = useMemo(
    () =>
      visibleRelationships.filter(
        (r) => r.sourceId === selectedNodeId || r.targetId === selectedNodeId
      ),
    [visibleRelationships, selectedNodeId]
  );

  const wrapperClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-canvas p-3 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden'
    : 'grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-7.5rem)] min-h-[540px]';

  return (
    <div className={wrapperClass}>
      {/* =================================================================== */}
      {/* LEFT / MAIN COLUMN: INTERACTIVE GRAPH STUDIO CANVAS                 */}
      {/* =================================================================== */}
      <div className="lg:col-span-8 xl:col-span-9 card flex flex-col overflow-hidden relative min-h-[440px]">
        {/* Top Action Bar */}
        <div className="px-3.5 py-2.5 border-b border-line bg-surface flex flex-wrap items-center justify-between gap-2 z-20">
          {/* Search + Focus Filter */}
          <div className="flex items-center gap-2 min-w-0 flex-1 max-w-md">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="w-3.5 h-3.5 text-fg-subtle absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar personagem, facção ou @handle…"
                className="input h-8 pl-8 pr-7 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowFiltersBar((v) => !v)}
              className={`btn btn-sm h-8 px-2.5 text-xs ${
                showFiltersBar || categoryFilter !== 'all' || relTypeFilter !== 'all'
                  ? 'btn-primary'
                  : 'btn-secondary'
              }`}
              title="Filtrar categorias e tipos de relação"
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtros</span>
            </button>

            <button
              type="button"
              onClick={() => setEgoFocusOnly((v) => !v)}
              className={`btn btn-sm h-8 px-2.5 text-xs ${
                egoFocusOnly ? 'bg-accent-soft text-accent border border-accent/40' : 'btn-ghost'
              }`}
              title="Exibir apenas a vizinhança direta (1º grau) do nó selecionado"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Modo Foco</span>
            </button>
          </div>

          {/* Right Studio Actions: AI Architect, Auto-Layout, Add Node, Connect */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isGm && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAiModal(true)}
                  className="btn btn-primary btn-sm h-8 text-xs"
                  title="Descobrir vínculos ocultos no Códice ou gerar novas intrigas com IA"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Arquiteto IA</span>
                </button>

                {/* Auto-Organize Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowLayoutMenu((m) => !m)}
                    className="btn btn-secondary btn-sm h-8 text-xs"
                    title="Organizar automaticamente a disposição dos nós"
                  >
                    <Workflow className="w-3.5 h-3.5" />
                    <span>Organizar</span>
                  </button>

                  {showLayoutMenu && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1.5 w-64 p-1.5 rounded-xl bg-surface border border-line-strong shadow-elevated z-40 space-y-0.5"
                    >
                      <div className="px-2.5 py-1 text-[11px] font-semibold text-fg-subtle">
                        Algoritmos de organização
                      </div>
                      {(
                        [
                          {
                            id: 'force',
                            label: 'Força Orgânica & Ilhas',
                            desc: 'Comunidades naturais sem sobreposição',
                            icon: Network,
                          },
                          {
                            id: 'hierarchical',
                            label: 'Hierarquia de Poder',
                            desc: 'Facções no topo → NPCs → Secundários',
                            icon: GitBranch,
                          },
                          {
                            id: 'radial',
                            label: 'Anéis Radiais em Foco',
                            desc: 'Órbitas em torno do nó selecionado',
                            icon: Orbit,
                          },
                          {
                            id: 'clusters',
                            label: 'Setores por Categoria',
                            desc: 'Agrupa Facções, NPCs, Locais e PJs',
                            icon: LayoutGrid,
                          },
                        ] as const
                      ).map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => void handleRunAutoLayout(opt.id)}
                            className="w-full px-2.5 py-2 rounded-lg text-left hover:bg-surface-2 flex items-start gap-2.5 transition-colors"
                          >
                            <Icon className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-fg">
                                {opt.label}
                              </div>
                              <div className="text-[11px] text-fg-muted">
                                {opt.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsConnectMode((c) => !c);
                    setConnectingSourceId(null);
                    setWireCursor(null);
                  }}
                  className={`btn btn-sm h-8 text-xs ${
                    isConnectMode ? 'btn-primary' : 'btn-secondary'
                  }`}
                  title="Clique em dois nós (ou arraste a alça +) para conectá-los"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">
                    {isConnectMode
                      ? connectingSourceId
                        ? 'Clique no destino…'
                        : 'Clique na origem…'
                      : 'Conectar'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddNodeModal(true)}
                  className="btn btn-secondary btn-sm h-8 text-xs"
                  title="Adicionar nó avulso ao grafo"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Nó</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleExportGraphPng}
              className="btn btn-ghost btn-icon h-8 w-8"
              title="Exportar grafo como PNG"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((f) => !f)}
              className="btn btn-ghost btn-icon h-8 w-8"
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Category & Relation Nature Filter Strip */}
        {showFiltersBar && (
          <div className="px-3.5 py-2 border-b border-line bg-surface-2 flex flex-wrap items-center justify-between gap-2 text-xs z-20">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-fg-subtle mr-1">Nós:</span>
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`h-6 px-2 rounded-md font-medium ${
                  categoryFilter === 'all'
                    ? 'bg-fg text-canvas'
                    : 'text-fg-muted hover:bg-surface'
                }`}
              >
                Todos ({allNodes.length})
              </button>
              {(
                ['faction', 'npc', 'location', 'player', 'monster', 'item', 'lore'] as NodeCategory[]
              ).map((cat) => {
                const meta = NODE_CATEGORY_META[cat];
                const count = allNodes.filter((n) => n.category === cat).length;
                if (count === 0) return null;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setCategoryFilter(categoryFilter === cat ? 'all' : cat)
                    }
                    className={`h-6 px-2 rounded-md inline-flex items-center gap-1.5 font-medium ${
                      categoryFilter === cat
                        ? 'bg-surface border border-line-strong text-fg shadow-sm'
                        : 'text-fg-muted hover:bg-surface'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span>{meta.pluralLabel}</span>
                    <span className="opacity-65 tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <span className="text-fg-subtle mr-1">Relações:</span>
              <button
                type="button"
                onClick={() => setRelTypeFilter('all')}
                className={`h-6 px-2 rounded-md font-medium ${
                  relTypeFilter === 'all'
                    ? 'bg-fg text-canvas'
                    : 'text-fg-muted hover:bg-surface'
                }`}
              >
                Todas
              </button>
              {(Object.keys(RELATION_META) as RelationType[]).map((rt) => {
                const meta = RELATION_META[rt];
                return (
                  <button
                    key={rt}
                    type="button"
                    onClick={() =>
                      setRelTypeFilter(relTypeFilter === rt ? 'all' : rt)
                    }
                    className={`h-6 px-2 rounded-md inline-flex items-center gap-1.5 font-medium ${
                      relTypeFilter === rt
                        ? 'bg-surface border border-line-strong text-fg shadow-sm'
                        : 'text-fg-muted hover:bg-surface'
                    }`}
                  >
                    <span
                      className="w-2.5 h-0.5 rounded"
                      style={{ backgroundColor: meta.stroke }}
                    />
                    <span>{meta.label.split(' / ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Interactive Infinite SVG Viewport */}
        <div
          ref={viewportRef}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerUp}
          className="flex-1 relative overflow-hidden bg-surface-2 select-none cursor-grab active:cursor-grabbing"
        >
          {allNodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-11 h-11 rounded-xl bg-surface border border-line flex items-center justify-center text-fg-subtle">
                <Network className="w-5 h-5" />
              </div>
              <div className="max-w-sm space-y-1">
                <h3 className="section-title">Grafo ainda vazio</h3>
                <p className="text-xs text-fg-muted">
                  Crie entradas no Códice (NPCs, Facções, Locais) ou adicione nós manualmente para tecer as alianças e intrigas da campanha.
                </p>
              </div>
              {isGm && (
                <button
                  type="button"
                  onClick={() => setShowAddNodeModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Adicionar primeiro nó</span>
                </button>
              )}
            </div>
          ) : (
            <svg
              ref={svgExportRef}
              className="w-full h-full block"
            >
              <defs>
                <pattern
                  id="proGraphDots"
                  width={32 * zoom}
                  height={32 * zoom}
                  patternUnits="userSpaceOnUse"
                  x={pan.x % (32 * zoom)}
                  y={pan.y % (32 * zoom)}
                >
                  <circle
                    cx={1.5}
                    cy={1.5}
                    r={Math.max(0.8, 1.2 * Math.min(1.2, zoom))}
                    className="fill-line-strong"
                    opacity={0.75}
                  />
                </pattern>

                {/* Directional Arrowheads per RelationType */}
                {(Object.keys(RELATION_META) as RelationType[]).map((rt) => (
                  <marker
                    key={rt}
                    id={`rel-arrow-${rt}`}
                    viewBox="0 0 10 10"
                    refX="8.5"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={RELATION_META[rt].stroke} />
                  </marker>
                ))}
              </defs>

              <rect width="100%" height="100%" fill="url(#proGraphDots)" />

              <g
                data-graph-world="true"
                transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
              >
                {/* Live Drag-to-Connect Wire */}
                {connectingSourceId && wireCursor && (
                  <line
                    x1={getNodePos(connectingSourceId).x}
                    y1={getNodePos(connectingSourceId).y}
                    x2={wireCursor.x}
                    y2={wireCursor.y}
                    stroke="#6366f1"
                    strokeWidth={2.2}
                    strokeDasharray="6 4"
                  />
                )}

                {/* Curved Bezier Edges */}
                {renderedEdges.map((rel) => {
                  const srcPos = getNodePos(rel.sourceId);
                  const tgtPos = getNodePos(rel.targetId);
                  const meta = RELATION_META[rel.type] || RELATION_META.neutral;
                  const curveOffset = edgeCurveOffsets.get(rel.id) ?? 18;

                  const dx = tgtPos.x - srcPos.x;
                  const dy = tgtPos.y - srcPos.y;
                  const dist = Math.max(1, Math.hypot(dx, dy));
                  const nx = -dy / dist;
                  const ny = dx / dist;

                  const ctrlX = (srcPos.x + tgtPos.x) / 2 + nx * curveOffset;
                  const ctrlY = (srcPos.y + tgtPos.y) / 2 + ny * curveOffset;

                  const startPt = getCardPerimeterPoint(
                    srcPos.x,
                    srcPos.y,
                    ctrlX,
                    ctrlY
                  );
                  const endPt = getCardPerimeterPoint(
                    tgtPos.x,
                    tgtPos.y,
                    ctrlX,
                    ctrlY
                  );

                  // Quadratic Bezier midpoint at t = 0.5
                  const labelX = 0.25 * startPt.x + 0.5 * ctrlX + 0.25 * endPt.x;
                  const labelY = 0.25 * startPt.y + 0.5 * ctrlY + 0.25 * endPt.y;

                  const focusId = hoveredNodeId || selectedNodeId;
                  const isHighlighted =
                    !focusId ||
                    rel.sourceId === focusId ||
                    rel.targetId === focusId;
                  const isSecretUnrevealed = rel.isSecret && !rel.isRevealed;
                  const pillText =
                    rel.label.length > 24
                      ? `${rel.label.slice(0, 22)}…`
                      : rel.label;
                  const pillWidth = Math.max(72, pillText.length * 6.4 + 20);

                  return (
                    <g
                      key={rel.id}
                      opacity={isHighlighted ? 1 : 0.22}
                      className="transition-opacity duration-150 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(rel.sourceId);
                        setInspectorTab('node');
                      }}
                    >
                      <path
                        d={`M ${startPt.x} ${startPt.y} Q ${ctrlX} ${ctrlY} ${endPt.x} ${endPt.y}`}
                        fill="none"
                        stroke={meta.stroke}
                        strokeWidth={isHighlighted ? 2.1 : 1.4}
                        strokeDasharray={
                          meta.dashed || isSecretUnrevealed ? '6 4' : undefined
                        }
                        markerEnd={`url(#rel-arrow-${rel.type})`}
                      />

                      <g transform={`translate(${labelX}, ${labelY})`}>
                        <rect
                          x={-pillWidth / 2}
                          y={-11}
                          width={pillWidth}
                          height={22}
                          rx={6}
                          className="fill-surface"
                          stroke={meta.pillBorder}
                          strokeWidth={1.1}
                        />
                        <text
                          y={3.5}
                          textAnchor="middle"
                          className="fill-fg"
                          fontSize="10.5"
                          fontFamily="IBM Plex Sans, system-ui, sans-serif"
                          fontWeight="600"
                        >
                          {isSecretUnrevealed ? `🔒 ${pillText}` : pillText}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Professional Node Cards */}
                {filteredNodes.map((node) => {
                  const pos = getNodePos(node.id);
                  const catMeta =
                    NODE_CATEGORY_META[node.category] || NODE_CATEGORY_META.npc;
                  const isSelected = node.id === selectedNodeId;
                  const isHovered = node.id === hoveredNodeId;
                  const isWireSource = node.id === connectingSourceId;
                  const degree = nodeDegrees.get(node.id) || 0;
                  const dimmed =
                    Boolean(hoveredNodeId) &&
                    activeNeighborSet !== null &&
                    !activeNeighborSet.has(node.id);

                  const titleText =
                    node.subtitle.length > 19
                      ? `${node.subtitle.slice(0, 18)}…`
                      : node.subtitle;
                  const subText =
                    (node.roleOrTag || node.label).length > 22
                      ? `${(node.roleOrTag || node.label).slice(0, 21)}…`
                      : node.roleOrTag || node.label;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      opacity={dimmed ? 0.25 : 1}
                      onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                      onPointerUp={(e) => handleNodePointerUp(e, node.id)}
                      onPointerEnter={() => setHoveredNodeId(node.id)}
                      onPointerLeave={() =>
                        setHoveredNodeId((prev) => (prev === node.id ? null : prev))
                      }
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (node.entityId) {
                          setSelectedEntityId(node.entityId);
                          setWorldSubTab('wiki');
                        }
                      }}
                      className="cursor-pointer transition-opacity duration-150"
                    >
                      {/* Selection / Wire Glow Halo */}
                      {(isSelected || isWireSource || isHovered) && (
                        <rect
                          x={-NODE_W / 2 - 4}
                          y={-NODE_H / 2 - 4}
                          width={NODE_W + 8}
                          height={NODE_H + 8}
                          rx={13}
                          fill="none"
                          stroke={isWireSource ? '#6366f1' : catMeta.color}
                          strokeWidth={isSelected || isWireSource ? 2.2 : 1.3}
                          opacity={isSelected || isWireSource ? 0.85 : 0.45}
                        />
                      )}

                      {/* Card Body */}
                      <rect
                        x={-NODE_W / 2}
                        y={-NODE_H / 2}
                        width={NODE_W}
                        height={NODE_H}
                        rx={10}
                        className="fill-surface stroke-line-strong"
                        strokeWidth={isSelected ? 1.8 : 1.1}
                      />

                      {/* Left Category Color Stripe */}
                      <rect
                        x={-NODE_W / 2}
                        y={-NODE_H / 2}
                        width={5}
                        height={NODE_H}
                        rx={2.5}
                        fill={catMeta.color}
                      />

                      {/* Category Pill + Handle */}
                      <text
                        x={-NODE_W / 2 + 13}
                        y={-11}
                        fill={catMeta.color}
                        fontSize="9.5"
                        fontFamily="IBM Plex Sans, system-ui, sans-serif"
                        fontWeight="700"
                      >
                        {catMeta.badge.toUpperCase()}
                      </text>

                      {/* Degree Badge (top-right) */}
                      {degree > 0 && (
                        <g transform={`translate(${NODE_W / 2 - 18}, -15)`}>
                          <rect
                            x={-10}
                            y={-8}
                            width={20}
                            height={15}
                            rx={7}
                            className="fill-surface-2 stroke-line"
                            strokeWidth={0.8}
                          />
                          <text
                            y={3}
                            textAnchor="middle"
                            className="fill-fg-muted"
                            fontSize="9.5"
                            fontWeight="600"
                          >
                            {degree}
                          </text>
                        </g>
                      )}

                      {/* Node Primary Name */}
                      <text
                        x={-NODE_W / 2 + 13}
                        y={6}
                        className="fill-fg"
                        fontSize="12.5"
                        fontFamily="IBM Plex Sans, system-ui, sans-serif"
                        fontWeight="700"
                      >
                        {node.isHiddenFromPlayers && isGm ? `🔒 ${titleText}` : titleText}
                      </text>

                      {/* Subtitle / Handle */}
                      <text
                        x={-NODE_W / 2 + 13}
                        y={21}
                        className="fill-fg-muted"
                        fontSize="10"
                        fontFamily="IBM Plex Sans, system-ui, sans-serif"
                      >
                        {subText}
                      </text>

                      {/* Quick Drag-to-Connect Port (+) on right edge for GM */}
                      {isGm && (isHovered || isSelected) && (
                        <g
                          transform={`translate(${NODE_W / 2 + 2}, 0)`}
                          onPointerDown={(e) => handleStartQuickWireFromNode(e, node.id)}
                        >
                          <circle
                            r={9}
                            fill="#6366f1"
                            stroke="#ffffff"
                            strokeWidth={1.5}
                          />
                          <text
                            y={3.5}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="12"
                            fontWeight="700"
                          >
                            +
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {/* Bottom-Left Quick Party Import Pill (if player characters aren't on graph yet) */}
          {isGm && unmappedPartySheets.length > 0 && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute bottom-3 left-3 z-20"
            >
              <button
                type="button"
                onClick={() => void handleImportPartyNodes()}
                className="btn btn-secondary btn-sm shadow-card bg-surface/95 backdrop-blur text-xs"
              >
                <UserPlus className="w-3.5 h-3.5 text-accent" />
                <span>Incluir {unmappedPartySheets.length} PJ(s) do grupo no grafo</span>
              </button>
            </div>
          )}

          {/* Bottom-Right Zoom & Fit Controls + Legend Summary */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute bottom-3 right-3 z-20 flex items-center gap-1 p-1 rounded-xl bg-surface/95 backdrop-blur border border-line-strong shadow-card"
          >
            <span className="hidden sm:inline px-2 text-[11px] text-fg-muted tabular-nums">
              {filteredNodes.length} nós · {renderedEdges.length} elos
            </span>
            <span className="hidden sm:inline w-px h-4 bg-line" />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z / 1.2).toFixed(2)))}
              className="btn btn-ghost btn-icon h-7 w-7"
              title="Reduzir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => fitGraphToViewport()}
              className="btn btn-ghost h-7 px-1.5 text-xs tabular-nums min-w-[48px]"
              title="Ajustar todo o grafo à tela"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z * 1.2).toFixed(2)))}
              className="btn btn-ghost btn-icon h-7 w-7"
              title="Ampliar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* RIGHT COLUMN: PROFESSIONAL NODE & RELATIONSHIP INSPECTOR            */}
      {/* =================================================================== */}
      <div className="lg:col-span-4 xl:col-span-3 card flex flex-col overflow-hidden">
        {/* Inspector Tabs */}
        <div className="px-2 pt-2 border-b border-line bg-surface flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setInspectorTab('node')}
            className={`tab text-xs flex-1 justify-center ${
              inspectorTab === 'node' ? 'tab-active' : ''
            }`}
          >
            Foco
          </button>
          <button
            type="button"
            onClick={() => setInspectorTab('all')}
            className={`tab text-xs flex-1 justify-center ${
              inspectorTab === 'all' ? 'tab-active' : ''
            }`}
          >
            Elos ({visibleRelationships.length})
          </button>
          {isGm && (
            <button
              type="button"
              onClick={() => setInspectorTab('create')}
              className={`tab text-xs flex-1 justify-center ${
                inspectorTab === 'create' ? 'tab-active' : ''
              }`}
            >
              + Novo
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: SELECTED NODE INSPECTOR */}
          {inspectorTab === 'node' && (
            <>
              {!selectedNode ? (
                <p className="text-xs text-fg-subtle text-center py-8">
                  Clique em qualquer nó do grafo para inspecionar suas conexões.
                </p>
              ) : (
                <>
                  <div className="space-y-2.5 pb-3 border-b border-line">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                NODE_CATEGORY_META[selectedNode.category]?.color ||
                                '#818cf8',
                            }}
                          />
                          <span className="text-xs font-semibold text-fg-muted">
                            {NODE_CATEGORY_META[selectedNode.category]?.badge || 'Nó'}
                          </span>
                          <span className="text-xs font-mono text-fg-subtle truncate">
                            {selectedNode.label}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-fg leading-snug break-words">
                          {selectedNode.subtitle}
                        </h3>
                        {selectedNode.roleOrTag && (
                          <p className="text-xs text-fg-muted mt-0.5">
                            {selectedNode.roleOrTag}
                          </p>
                        )}
                      </div>

                      {selectedNode.isManual && isGm && (
                        <button
                          type="button"
                          onClick={() => void deleteManualGraphNode(selectedNode.id)}
                          className="btn btn-danger-ghost btn-icon h-7 w-7 shrink-0"
                          title="Excluir nó manual"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {selectedNode.summary && (
                      <p className="text-xs text-fg-muted line-clamp-3 leading-relaxed">
                        {selectedNode.summary}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => centerOnNode(selectedNode.id, 1.15)}
                        className="btn btn-secondary btn-sm h-7 text-xs"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>Centralizar</span>
                      </button>

                      {isGm && (
                        <button
                          type="button"
                          onClick={() => void handleRunAutoLayout('radial')}
                          className="btn btn-secondary btn-sm h-7 text-xs"
                          title="Organizar o grafo em anéis ao redor deste nó"
                        >
                          <Orbit className="w-3.5 h-3.5" />
                          <span>Órbita radial</span>
                        </button>
                      )}

                      {selectedNode.entityId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEntityId(selectedNode.entityId!);
                            setWorldSubTab('wiki');
                          }}
                          className="btn btn-secondary btn-sm h-7 text-xs"
                        >
                          <span>Códice</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Direct Connections of Selected Node */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-fg">
                        Conexões diretas ({selectedNodeEdges.length})
                      </span>
                      {isGm && allNodes.length >= 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSourceId(selectedNode.id);
                            const other = allNodes.find((n) => n.id !== selectedNode.id);
                            if (other) setTargetId(other.id);
                            setInspectorTab('create');
                          }}
                          className="text-xs text-accent hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Vincular
                        </button>
                      )}
                    </div>

                    {selectedNodeEdges.length === 0 ? (
                      <p className="text-xs text-fg-subtle py-4 text-center card-muted">
                        Nenhuma conexão ligada a este nó ainda.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedNodeEdges.map((rel) => {
                          const isOutgoing = rel.sourceId === selectedNode.id;
                          const otherId = isOutgoing ? rel.targetId : rel.sourceId;
                          const other = allNodesMap.get(otherId);
                          if (!other) return null;
                          const meta = RELATION_META[rel.type] || RELATION_META.neutral;
                          const isEditing = editingEdgeId === rel.id;

                          return (
                            <div
                              key={rel.id}
                              className="p-2.5 rounded-lg border border-line bg-surface-2/50 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedNodeId(other.id);
                                    centerOnNode(other.id);
                                  }}
                                  className="text-xs font-semibold text-fg hover:text-accent truncate text-left"
                                >
                                  {isOutgoing ? '→ ' : '← '}
                                  {other.subtitle}
                                </button>

                                {isGm && (
                                  <div className="flex items-center shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingEdgeId(rel.id);
                                        setEditEdgeDraft({
                                          label: rel.label,
                                          type: rel.type,
                                          notes: rel.notes || '',
                                        });
                                      }}
                                      className="btn btn-ghost btn-icon h-6 w-6"
                                      title="Editar vínculo"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void toggleRevealRelationship(rel.id)}
                                      className="btn btn-ghost btn-icon h-6 w-6"
                                      title="Alternar visibilidade aos jogadores"
                                    >
                                      {rel.isSecret && !rel.isRevealed ? (
                                        <EyeOff className="w-3 h-3 text-warning" />
                                      ) : (
                                        <Eye className="w-3 h-3" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void deleteRelationship(rel.id)}
                                      className="btn btn-danger-ghost btn-icon h-6 w-6"
                                      title="Remover vínculo"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {isEditing && editEdgeDraft ? (
                                <div className="space-y-1.5 pt-1">
                                  <input
                                    type="text"
                                    value={editEdgeDraft.label}
                                    onChange={(e) =>
                                      setEditEdgeDraft({
                                        ...editEdgeDraft,
                                        label: e.target.value,
                                      })
                                    }
                                    className="input h-7 text-xs"
                                  />
                                  <select
                                    value={editEdgeDraft.type}
                                    onChange={(e) =>
                                      setEditEdgeDraft({
                                        ...editEdgeDraft,
                                        type: e.target.value as RelationType,
                                      })
                                    }
                                    className="input h-7 text-xs"
                                  >
                                    {(Object.keys(RELATION_META) as RelationType[]).map(
                                      (rt) => (
                                        <option key={rt} value={rt}>
                                          {RELATION_META[rt].label}
                                        </option>
                                      )
                                    )}
                                  </select>
                                  <input
                                    type="text"
                                    value={editEdgeDraft.notes}
                                    onChange={(e) =>
                                      setEditEdgeDraft({
                                        ...editEdgeDraft,
                                        notes: e.target.value,
                                      })
                                    }
                                    placeholder="Nota de contexto (opcional)…"
                                    className="input h-7 text-xs"
                                  />
                                  <div className="flex justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingEdgeId(null)}
                                      className="btn btn-secondary btn-sm h-6 px-2 text-xs"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (editEdgeDraft.label.trim()) {
                                          void updateRelationshipLabel(
                                            rel.id,
                                            editEdgeDraft.label.trim(),
                                            editEdgeDraft.type,
                                            editEdgeDraft.notes.trim()
                                          );
                                        }
                                        setEditingEdgeId(null);
                                      }}
                                      className="btn btn-primary btn-sm h-6 px-2 text-xs"
                                    >
                                      <Check className="w-3 h-3" />
                                      Salvar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`badge text-[11px] ${meta.badge}`}>
                                      {rel.label}
                                    </span>
                                    {rel.isSecret && !rel.isRevealed && (
                                      <span className="badge text-[10px]">
                                        <Lock className="w-2.5 h-2.5" /> Oculto
                                      </span>
                                    )}
                                  </div>
                                  {rel.notes && (
                                    <p className="text-[11px] text-fg-muted leading-snug">
                                      {rel.notes}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* TAB 2: ALL RELATIONSHIPS */}
          {inspectorTab === 'all' && (
            <div className="space-y-2">
              {visibleRelationships.length === 0 ? (
                <p className="text-xs text-fg-subtle text-center py-8">
                  Nenhum vínculo registrado ainda. Use o <strong>Arquiteto IA</strong> no topo ou conecte nós manualmente.
                </p>
              ) : (
                visibleRelationships.map((rel) => {
                  const src = allNodesMap.get(rel.sourceId);
                  const tgt = allNodesMap.get(rel.targetId);
                  if (!src || !tgt) return null;
                  const meta = RELATION_META[rel.type] || RELATION_META.neutral;
                  return (
                    <div
                      key={rel.id}
                      onClick={() => {
                        setSelectedNodeId(src.id);
                        centerOnNode(src.id);
                      }}
                      className="p-2.5 rounded-lg border border-line hover:border-line-strong cursor-pointer space-y-1 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-fg font-medium">
                          {src.subtitle}{' '}
                          <span className="text-fg-subtle">→</span> {tgt.subtitle}
                        </span>
                        {isGm && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void deleteRelationship(rel.id);
                            }}
                            className="text-fg-subtle hover:text-danger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`badge text-[11px] ${meta.badge}`}>
                          {rel.label}
                        </span>
                        {rel.isSecret && !rel.isRevealed && (
                          <span className="badge text-[10px]">
                            <Lock className="w-2.5 h-2.5" /> Oculto
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: CREATE NEW RELATIONSHIP FORM */}
          {inspectorTab === 'create' && isGm && (
            <form
              onSubmit={(e) => void handleCreateRelationship(e)}
              className="space-y-3"
            >
              <div>
                <label className="label">Origem</label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="input text-xs"
                >
                  {allNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.subtitle} ({n.label})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Destino</label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="input text-xs"
                >
                  {allNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.subtitle} ({n.label})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Rótulo da relação</label>
                <input
                  type="text"
                  required
                  value={edgeLabel}
                  onChange={(e) => setEdgeLabel(e.target.value)}
                  placeholder="Ex.: Financia em segredo, Rival de sangue"
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label">Natureza</label>
                <select
                  value={edgeType}
                  onChange={(e) => setEdgeType(e.target.value as RelationType)}
                  className="input text-xs"
                >
                  {(Object.keys(RELATION_META) as RelationType[]).map((rt) => (
                    <option key={rt} value={rt}>
                      {RELATION_META[rt].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Notas de bastidores (opcional)</label>
                <textarea
                  rows={2}
                  value={edgeNotes}
                  onChange={(e) => setEdgeNotes(e.target.value)}
                  placeholder="Motivação, dívida ou gatilho de cena…"
                  className="input text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-fg-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={edgeIsSecret}
                  onChange={(e) => setEdgeIsSecret(e.target.checked)}
                />
                <span>Ocultar dos jogadores até ser revelado</span>
              </label>

              <button
                type="submit"
                disabled={sourceId === targetId || !edgeLabel.trim()}
                className="btn btn-primary w-full"
              >
                Criar vínculo
              </button>
            </form>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODAL: QUICK DRAG-TO-CONNECT POPOVER                                */}
      {/* =================================================================== */}
      {quickLinkPair && (
        <div className="modal-backdrop">
          <form
            onSubmit={(e) =>
              void handleCreateRelationship(
                e,
                quickLinkPair.sourceId,
                quickLinkPair.targetId
              )
            }
            className="modal max-w-md"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
              <h3 className="section-title text-sm">
                Conectar{' '}
                <span className="text-accent">
                  {allNodesMap.get(quickLinkPair.sourceId)?.subtitle}
                </span>{' '}
                →{' '}
                <span className="text-accent">
                  {allNodesMap.get(quickLinkPair.targetId)?.subtitle}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setQuickLinkPair(null)}
                className="btn btn-ghost btn-icon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5">
              <div>
                <label className="label">Descrição do vínculo</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={edgeLabel}
                  onChange={(e) => setEdgeLabel(e.target.value)}
                  placeholder="Ex.: Irmão traidor, Credor de, Espião em…"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Natureza</label>
                <select
                  value={edgeType}
                  onChange={(e) => setEdgeType(e.target.value as RelationType)}
                  className="input"
                >
                  {(Object.keys(RELATION_META) as RelationType[]).map((rt) => (
                    <option key={rt} value={rt}>
                      {RELATION_META[rt].label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={edgeIsSecret}
                  onChange={(e) => setEdgeIsSecret(e.target.checked)}
                />
                <span>Ocultar dos jogadores (Segredo)</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-line bg-surface-2">
              <button
                type="button"
                onClick={() => setQuickLinkPair(null)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Conectar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD MANUAL GRAPH NODE                                        */}
      {/* =================================================================== */}
      {showAddNodeModal && (
        <div className="modal-backdrop">
          <form onSubmit={(e) => void handleCreateManualNode(e)} className="modal max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="section-title">Novo nó no grafo</h3>
              <button
                type="button"
                onClick={() => setShowAddNodeModal(false)}
                className="btn btn-ghost btn-icon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="label">Categoria</label>
                <select
                  value={newNodeCategory}
                  onChange={(e) => setNewNodeCategory(e.target.value as NodeCategory)}
                  className="input"
                >
                  <option value="npc">Personagem (NPC)</option>
                  <option value="faction">Facção / Organização</option>
                  <option value="location">Local</option>
                  <option value="player">Personagem Jogador (PJ)</option>
                  <option value="monster">Ameaça / Chefe</option>
                  <option value="item">Relíquia / Item</option>
                  <option value="note">Nota / Pista</option>
                </select>
              </div>

              <div>
                <label className="label">Nome principal</label>
                <input
                  type="text"
                  required
                  value={newNodeSubtitle}
                  onChange={(e) => setNewNodeSubtitle(e.target.value)}
                  placeholder="Ex.: Conselho dos Mercadores"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Identificador (@Handle ou Rótulo curto)</label>
                <input
                  type="text"
                  required
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  placeholder="Ex.: @ConselhoMercantil"
                  className="input font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-line bg-surface-2">
              <button
                type="button"
                onClick={() => setShowAddNodeModal(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Adicionar ao grafo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: AI RELATIONSHIP & INTRIGUE ARCHITECT                         */}
      {/* =================================================================== */}
      <GraphAiModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        allNodes={allNodes}
        entities={entities}
        manualNodes={manualGraphNodes}
        existingRelationships={relationships}
        fronts={fronts}
        quests={quests}
        journal={journal}
        campaignName={activeCamp?.title || 'Campanha Atual'}
        campaignTone={activeCamp?.tone || 'Fantasia & Intriga'}
        worldContext={activeCamp?.worldContext}
        geminiApiKey={geminiApiKey}
        selectedNodeId={selectedNodeId}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onApplySuggestions={handleApplyAiSuggestions}
      />
    </div>
  );
};
