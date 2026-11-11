import React, { useState, useRef } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { RelationType } from '../../types/campaign';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Lock,
  Link2,
  Edit3,
  Check,
  X,
  UserPlus,
} from 'lucide-react';

const RELATION_STYLES: Record<
  RelationType,
  { stroke: string; badge: string; label: string }
> = {
  hostile: {
    stroke: '#e11d48',
    badge: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    label: 'Hostilidade',
  },
  allied: {
    stroke: '#10b981',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    label: 'Aliança',
  },
  secret: {
    stroke: '#d4a853',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    label: 'Conspiração',
  },
  patron: {
    stroke: '#a855f7',
    badge: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
    label: 'Domínio',
  },
  neutral: {
    stroke: '#71717a',
    badge: 'bg-white/[0.04] text-zinc-300 border-white/[0.08]',
    label: 'Comercial / Neutro',
  },
  blood: {
    stroke: '#ec4899',
    badge: 'bg-pink-500/10 text-pink-300 border-pink-500/25',
    label: 'Linhagem',
  },
};

const NODE_COLORS: Record<
  string,
  { fill: string; border: string; text: string; badge: string }
> = {
  npc: { fill: '#131317', border: '#d4a853', text: '#fcd34d', badge: 'NPC' },
  faction: { fill: '#131317', border: '#a855f7', text: '#d8b4fe', badge: 'FACÇÃO' },
  location: { fill: '#131317', border: '#10b981', text: '#6ee7b7', badge: 'LOCAL' },
  player: { fill: '#131317', border: '#6366f1', text: '#a5b4fc', badge: 'PJ' },
  item: { fill: '#131317', border: '#38bdf8', text: '#7dd3fc', badge: 'ITEM' },
  monster: { fill: '#131317', border: '#e11d48', text: '#fda4af', badge: 'AMEAÇA' },
  lore: { fill: '#131317', border: '#71717a', text: '#d4d4d8', badge: 'LORE' },
};

interface UnifiedGraphNode {
  id: string;
  label: string;
  subtitle: string;
  category: 'npc' | 'faction' | 'location' | 'player' | 'item' | 'monster' | 'lore';
  isManual: boolean;
  entityId?: string;
}

export const RelationshipGraphView: React.FC = () => {
  const entities = useCampaignStore((s) => s.entities);
  const manualGraphNodes = useCampaignStore((s) => s.manualGraphNodes);
  const relationships = useCampaignStore((s) => s.relationships);
  const graphPositions = useCampaignStore((s) => s.graphPositions);
  const viewRole = useCampaignStore((s) => s.viewRole);
  const updateGraphNodePosition = useCampaignStore((s) => s.updateGraphNodePosition);
  const addManualGraphNode = useCampaignStore((s) => s.addManualGraphNode);
  const deleteManualGraphNode = useCampaignStore((s) => s.deleteManualGraphNode);
  const addRelationship = useCampaignStore((s) => s.addRelationship);
  const updateRelationshipLabel = useCampaignStore((s) => s.updateRelationshipLabel);
  const deleteRelationship = useCampaignStore((s) => s.deleteRelationship);
  const toggleRevealRelationship = useCampaignStore((s) => s.toggleRevealRelationship);
  const setSelectedEntityId = useCampaignStore((s) => s.setSelectedEntityId);
  const setWorldSubTab = useCampaignStore((s) => s.setWorldSubTab);

  const allNodes: UnifiedGraphNode[] = [
    ...entities.map((e) => ({
      id: e.id,
      label: `${e.mentionPrefix}${e.handle}`,
      subtitle: e.name,
      category: e.category,
      isManual: false,
      entityId: e.id,
    })),
    ...manualGraphNodes.map((m) => ({
      id: m.id,
      label: m.label,
      subtitle: m.subtitle || 'Nó manual',
      category: m.category,
      isManual: true,
      entityId: m.entityId,
    })),
  ];

  const [selectedNodeId, setSelectedNodeId] = useState<string>(allNodes[0]?.id || '');
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const [isConnectMode, setIsConnectMode] = useState(false);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeSubtitle, setNewNodeSubtitle] = useState('');
  const [newNodeCategory, setNewNodeCategory] = useState<'npc' | 'faction' | 'location' | 'player'>('npc');

  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [editingEdgeLabel, setEditingEdgeLabel] = useState('');

  const [sourceId, setSourceId] = useState<string>(allNodes[0]?.id || '');
  const [targetId, setTargetId] = useState<string>(allNodes[1]?.id || allNodes[0]?.id || '');
  const [edgeLabel, setEdgeLabel] = useState<string>('');
  const [edgeType, setEdgeType] = useState<RelationType>('secret');
  const [edgeIsSecret, setEdgeIsSecret] = useState<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const visibleRelationships = relationships.filter(
    (r) => viewRole === 'gm' || !r.isSecret || r.isRevealed
  );

  const getPos = (nodeId: string, idx: number) => {
    const manualMatch = manualGraphNodes.find((n) => n.id === nodeId);
    if (manualMatch) return { entityId: nodeId, x: manualMatch.x, y: manualMatch.y };

    const found = graphPositions.find((p) => p.entityId === nodeId);
    if (found) return found;
    const angle = (idx / Math.max(1, allNodes.length)) * Math.PI * 2;
    return {
      entityId: nodeId,
      x: Math.round(480 + Math.cos(angle) * 230),
      y: Math.round(290 + Math.sin(angle) * 185),
    };
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * (960 / zoom);
    const y = ((e.clientY - rect.top) / rect.height) * (600 / zoom);

    if (connectingSourceId) {
      setMousePos({ x: Math.round(x), y: Math.round(y) });
    }

    if (draggingNodeId) {
      updateGraphNodePosition(
        draggingNodeId,
        Math.max(70, Math.min(890, Math.round(x))),
        Math.max(50, Math.min(550, Math.round(y)))
      );
    }
  };

  const handleNodeClickOrDrop = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    if (isConnectMode) {
      if (!connectingSourceId) {
        setConnectingSourceId(nodeId);
      } else if (connectingSourceId !== nodeId) {
        setSourceId(connectingSourceId);
        setTargetId(nodeId);
        setEdgeLabel('Vínculo direto');
        addRelationship({
          sourceId: connectingSourceId,
          targetId: nodeId,
          label: edgeLabel.trim() || 'Vínculo direto',
          type: edgeType,
          isSecret: edgeIsSecret,
          isRevealed: !edgeIsSecret,
        });
        setConnectingSourceId(null);
        setMousePos(null);
      }
    }
  };

  const handleCreateManualNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeLabel.trim()) return;
    addManualGraphNode({
      label: newNodeLabel.trim(),
      subtitle: newNodeSubtitle.trim() || 'Nó manual',
      category: newNodeCategory,
      x: 340 + Math.floor(Math.random() * 280),
      y: 180 + Math.floor(Math.random() * 220),
    });
    setNewNodeLabel('');
    setNewNodeSubtitle('');
    setShowAddNodeModal(false);
  };

  const handleCreateRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!edgeLabel.trim() || sourceId === targetId) return;
    addRelationship({
      sourceId,
      targetId,
      label: edgeLabel.trim(),
      type: edgeType,
      isSecret: edgeIsSecret,
      isRevealed: !edgeIsSecret,
    });
    setEdgeLabel('');
  };

  const selectedNode = allNodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-7.5rem)]">
      {/* Left: Network Canvas */}
      <div className="lg:col-span-8 surface-panel rounded-xl flex flex-col overflow-hidden relative">
        <div className="px-4 py-3 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2 z-10">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Grafo de relações
            </h2>
            <p className="text-xs text-zinc-500">
              Mapeie alianças, dívidas e intrigas entre personagens e facções.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {viewRole === 'gm' && (
              <>
                <button
                  onClick={() => setShowAddNodeModal(true)}
                  className="btn-subtle px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Novo nó</span>
                </button>

                <button
                  onClick={() => {
                    setIsConnectMode(!isConnectMode);
                    setConnectingSourceId(null);
                    setMousePos(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isConnectMode ? 'btn-solid' : 'btn-subtle'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>
                    {isConnectMode
                      ? connectingSourceId
                        ? 'Selecione o destino...'
                        : 'Selecione a origem...'
                      : 'Conectar nós'}
                  </span>
                </button>
              </>
            )}

            <div className="flex items-center bg-[#0e0e11] border border-white/[0.06] rounded-lg p-0.5">
              <button
                onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.1).toFixed(1)))}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                title="Diminuir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(1)))}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                title="Redefinir zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="flex-1 relative overflow-hidden bg-[#0b0b0d] select-none">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${960 / zoom} ${600 / zoom}`}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={() => setDraggingNodeId(null)}
            onMouseLeave={() => setDraggingNodeId(null)}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          >
            <defs>
              <pattern id="graphGrid" width="36" height="36" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#232329" />
              </pattern>
            </defs>
            <rect width="2000" height="2000" fill="url(#graphGrid)" />

            {isConnectMode && connectingSourceId && mousePos && (
              <line
                x1={getPos(connectingSourceId, 0).x}
                y1={getPos(connectingSourceId, 0).y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#e4e4e7"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
            )}

            {/* Edges */}
            {visibleRelationships.map((rel) => {
              const srcIdx = allNodes.findIndex((n) => n.id === rel.sourceId);
              const tgtIdx = allNodes.findIndex((n) => n.id === rel.targetId);
              if (srcIdx === -1 || tgtIdx === -1) return null;

              const srcPos = getPos(rel.sourceId, srcIdx);
              const tgtPos = getPos(rel.targetId, tgtIdx);
              const style = RELATION_STYLES[rel.type] || RELATION_STYLES.neutral;
              const midX = (srcPos.x + tgtPos.x) / 2;
              const midY = (srcPos.y + tgtPos.y) / 2;

              return (
                <g key={rel.id}>
                  <line
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    stroke={style.stroke}
                    strokeWidth={rel.isSecret ? 1.75 : 1.5}
                    strokeDasharray={rel.isSecret ? '5 4' : undefined}
                    opacity={0.75}
                  />
                  <rect
                    x={midX - 62}
                    y={midY - 11}
                    width="124"
                    height="20"
                    rx="5"
                    fill="#111114"
                    stroke="#27272a"
                    strokeWidth="1"
                  />
                  <text
                    x={midX}
                    y={midY + 3}
                    textAnchor="middle"
                    fill="#d4d4d8"
                    fontSize="9.5"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fontWeight="500"
                  >
                    {rel.label.length > 20 ? `${rel.label.slice(0, 18)}…` : rel.label}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {allNodes.map((node, idx) => {
              const pos = getPos(node.id, idx);
              const palette = NODE_COLORS[node.category] || NODE_COLORS.npc;
              const isSelected = node.id === selectedNodeId;
              const isSourceConnect = node.id === connectingSourceId;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (!isConnectMode) {
                      setDraggingNodeId(node.id);
                    }
                    handleNodeClickOrDrop(node.id);
                  }}
                  className="cursor-pointer"
                >
                  {(isSelected || isSourceConnect) && (
                    <circle
                      r="35"
                      fill="none"
                      stroke={isSourceConnect ? '#10b981' : '#e4e4e7'}
                      strokeWidth="1.25"
                      strokeDasharray="3 3"
                      opacity="0.7"
                    />
                  )}
                  <circle
                    r="26"
                    fill={palette.fill}
                    stroke={palette.border}
                    strokeWidth={isSelected ? '2' : '1.5'}
                  />
                  <text
                    y="-3"
                    textAnchor="middle"
                    fill={palette.text}
                    fontSize="8"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="600"
                  >
                    {palette.badge}
                  </text>
                  <text
                    y="9"
                    textAnchor="middle"
                    fill="#f4f4f5"
                    fontSize="9.5"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fontWeight="600"
                  >
                    {node.label.slice(0, 10)}
                  </text>
                  <rect
                    x="-60"
                    y="31"
                    width="120"
                    height="18"
                    rx="4"
                    fill="#0e0e11"
                    stroke="#232329"
                  />
                  <text
                    y="43"
                    textAnchor="middle"
                    fill="#d4d4d8"
                    fontSize="9.5"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fontWeight="500"
                  >
                    {node.subtitle.length > 18
                      ? `${node.subtitle.slice(0, 16)}…`
                      : node.subtitle}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Right Column: Inspector & Edge Builder */}
      <div className="lg:col-span-4 flex flex-col gap-3.5 overflow-y-auto pr-1">
        {selectedNode && (
          <div className="surface-panel rounded-xl p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-zinc-500">
                  {NODE_COLORS[selectedNode.category]?.badge || 'NÓ'} · {selectedNode.label}
                </span>
                <h3 className="text-base font-serif font-medium text-zinc-100 truncate">
                  {selectedNode.subtitle}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {selectedNode.entityId && (
                  <button
                    onClick={() => {
                      setSelectedEntityId(selectedNode.entityId!);
                      setWorldSubTab('wiki');
                    }}
                    className="btn-subtle px-2.5 py-1 rounded-md text-xs inline-flex items-center gap-1"
                  >
                    <span>Códice</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                {selectedNode.isManual && viewRole === 'gm' && (
                  <button
                    onClick={() => deleteManualGraphNode(selectedNode.id)}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Excluir nó manual"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Edges */}
        <div className="surface-panel rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-zinc-200">
              Vínculos ativos
            </h4>
            <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
              {visibleRelationships.length}
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {visibleRelationships.map((rel) => {
              const src = allNodes.find((n) => n.id === rel.sourceId);
              const tgt = allNodes.find((n) => n.id === rel.targetId);
              if (!src || !tgt) return null;
              const style = RELATION_STYLES[rel.type] || RELATION_STYLES.neutral;
              const isEditing = editingEdgeId === rel.id;

              return (
                <div
                  key={rel.id}
                  className="p-2.5 rounded-lg bg-[#0e0e11] border border-white/[0.06] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[11px] text-zinc-300 truncate">
                      {src.label} → {tgt.label}
                    </span>

                    {viewRole === 'gm' && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingEdgeId(rel.id);
                            setEditingEdgeLabel(rel.label);
                          }}
                          className="p-1 rounded hover:bg-white/[0.05] text-zinc-500 hover:text-zinc-200"
                          title="Editar rótulo"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => toggleRevealRelationship(rel.id)}
                          className="p-1 rounded hover:bg-white/[0.05] text-zinc-500 hover:text-zinc-200"
                          title={
                            rel.isSecret && !rel.isRevealed
                              ? 'Revelar aos jogadores'
                              : 'Ocultar vínculo'
                          }
                        >
                          {rel.isSecret && !rel.isRevealed ? (
                            <EyeOff className="w-3 h-3 text-rose-400" />
                          ) : (
                            <Eye className="w-3 h-3 text-zinc-400" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteRelationship(rel.id)}
                          className="p-1 rounded hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400"
                          title="Excluir vínculo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        value={editingEdgeLabel}
                        onChange={(e) => setEditingEdgeLabel(e.target.value)}
                        className="input-clean flex-1 px-2 py-1 rounded text-xs"
                      />
                      <button
                        onClick={() => {
                          if (editingEdgeLabel.trim()) {
                            updateRelationshipLabel(rel.id, editingEdgeLabel.trim());
                          }
                          setEditingEdgeId(null);
                        }}
                        className="btn-solid p-1 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingEdgeId(null)}
                        className="btn-subtle p-1 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${style.badge}`}
                      >
                        {rel.label}
                      </span>
                      {rel.isSecret && !rel.isRevealed && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-400/90 font-mono">
                          <Lock className="w-2.5 h-2.5" /> Oculto
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form to Create Manual Connection */}
        {viewRole === 'gm' && (
          <form
            onSubmit={handleCreateRelationship}
            className="surface-panel rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              <h4 className="text-xs font-medium text-zinc-200">
                Novo vínculo
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Origem</label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                >
                  {allNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label} ({n.subtitle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Destino</label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                >
                  {allNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label} ({n.subtitle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Descrição da relação
                </label>
                <input
                  type="text"
                  value={edgeLabel}
                  onChange={(e) => setEdgeLabel(e.target.value)}
                  placeholder='Ex: "Irmão traidor", "Credor de"...'
                  className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Natureza</label>
                <select
                  value={edgeType}
                  onChange={(e) => setEdgeType(e.target.value as RelationType)}
                  className="input-clean w-full px-2.5 py-1.5 rounded-lg"
                >
                  <option value="secret">Conspiração / Segredo</option>
                  <option value="hostile">Hostilidade / Rivalidade</option>
                  <option value="allied">Aliança / Lealdade</option>
                  <option value="patron">Domínio / Cobrança</option>
                  <option value="blood">Sangue / Família</option>
                  <option value="neutral">Comercial / Neutro</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-zinc-400 cursor-pointer pt-0.5 select-none">
                <input
                  type="checkbox"
                  checked={edgeIsSecret}
                  onChange={(e) => setEdgeIsSecret(e.target.checked)}
                />
                <span>Vínculo oculto dos jogadores</span>
              </label>

              <button
                type="submit"
                className="btn-solid w-full py-2 rounded-lg text-xs"
              >
                Conectar nós
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Modal: Add Manual Node */}
      {showAddNodeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateManualNode}
            className="max-w-md w-full rounded-2xl bg-[#121215] border border-white/[0.09] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-semibold text-zinc-100">
                Novo nó avulso no grafo
              </h3>
              <button
                type="button"
                onClick={() => setShowAddNodeModal(false)}
                className="p-1 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Categoria
                </label>
                <select
                  value={newNodeCategory}
                  onChange={(e) =>
                    setNewNodeCategory(
                      e.target.value as 'npc' | 'faction' | 'location' | 'player'
                    )
                  }
                  className="input-clean w-full px-3 py-2 rounded-lg"
                >
                  <option value="npc">Personagem (NPC)</option>
                  <option value="faction">Facção / Organização</option>
                  <option value="location">Local</option>
                  <option value="player">Personagem jogador</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Identificador curto
                </label>
                <input
                  type="text"
                  required
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  placeholder="Ex: @ConselhoReal, #FortalezaNorte"
                  className="input-clean w-full px-3 py-2 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Nome completo ou papel
                </label>
                <input
                  type="text"
                  value={newNodeSubtitle}
                  onChange={(e) => setNewNodeSubtitle(e.target.value)}
                  placeholder="Ex: Capitão da Guarda Real"
                  className="input-clean w-full px-3 py-2 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddNodeModal(false)}
                className="btn-subtle px-3.5 py-2 rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-solid px-4 py-2 rounded-lg text-xs"
              >
                Inserir nó
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
