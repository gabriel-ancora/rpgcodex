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

// Tipo de vínculo: o traço da aresta é sempre neutro; a natureza aparece no
// selo da lista (cor semântica) e no padrão do traço (segredo = tracejado).
const RELATION_STYLES: Record<RelationType, { badge: string; label: string }> = {
  hostile: { badge: 'badge-danger', label: 'Hostilidade' },
  allied: { badge: 'badge-success', label: 'Aliança' },
  secret: { badge: 'badge-warning', label: 'Conspiração' },
  patron: { badge: 'badge-info', label: 'Domínio' },
  neutral: { badge: '', label: 'Comercial / Neutro' },
  blood: { badge: 'badge-accent', label: 'Linhagem' },
};

const NODE_COLORS: Record<string, { badge: string }> = {
  npc: { badge: 'NPC' },
  faction: { badge: 'Facção' },
  location: { badge: 'Local' },
  player: { badge: 'PJ' },
  item: { badge: 'Item' },
  monster: { badge: 'Ameaça' },
  lore: { badge: 'Lore' },
  note: { badge: 'Nota' },
};

interface UnifiedGraphNode {
  id: string;
  label: string;
  subtitle: string;
  category: 'npc' | 'faction' | 'location' | 'player' | 'item' | 'monster' | 'lore' | 'note';
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-7.5rem)]">
      {/* Canvas do grafo */}
      <div className="lg:col-span-8 card flex flex-col overflow-hidden relative min-h-[420px]">
        <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="section-title">Grafo de relações</h2>
            <p className="text-[13px] text-fg-muted">
              Alianças, dívidas e intrigas entre personagens e facções.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {viewRole === 'gm' && (
              <>
                <button
                  onClick={() => setShowAddNodeModal(true)}
                  className="btn btn-secondary btn-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Novo nó</span>
                </button>

                <button
                  onClick={() => {
                    setIsConnectMode(!isConnectMode);
                    setConnectingSourceId(null);
                    setMousePos(null);
                  }}
                  className={`btn btn-sm ${isConnectMode ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <Link2 className="w-4 h-4" />
                  <span>
                    {isConnectMode
                      ? connectingSourceId
                        ? 'Selecione o destino'
                        : 'Selecione a origem'
                      : 'Conectar nós'}
                  </span>
                </button>
              </>
            )}

            <div className="flex items-center rounded-md border border-line bg-surface p-0.5">
              <button
                onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.1).toFixed(1)))}
                className="btn btn-ghost btn-icon h-7 w-7"
                title="Diminuir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(1)))}
                className="btn btn-ghost btn-icon h-7 w-7"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="btn btn-ghost btn-icon h-7 w-7"
                title="Redefinir zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* SVG */}
        <div className="flex-1 relative overflow-hidden bg-surface-2 select-none">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${960 / zoom} ${600 / zoom}`}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={() => setDraggingNodeId(null)}
            onMouseLeave={() => setDraggingNodeId(null)}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          >
            <defs>
              <pattern id="graphGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" className="fill-line-strong" />
              </pattern>
            </defs>
            <rect width="2000" height="2000" fill="url(#graphGrid)" />

            {isConnectMode && connectingSourceId && mousePos && (
              <line
                x1={getPos(connectingSourceId, 0).x}
                y1={getPos(connectingSourceId, 0).y}
                x2={mousePos.x}
                y2={mousePos.y}
                className="stroke-accent"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
            )}

            {/* Arestas */}
            {visibleRelationships.map((rel) => {
              const srcIdx = allNodes.findIndex((n) => n.id === rel.sourceId);
              const tgtIdx = allNodes.findIndex((n) => n.id === rel.targetId);
              if (srcIdx === -1 || tgtIdx === -1) return null;

              const srcPos = getPos(rel.sourceId, srcIdx);
              const tgtPos = getPos(rel.targetId, tgtIdx);
              const midX = (srcPos.x + tgtPos.x) / 2;
              const midY = (srcPos.y + tgtPos.y) / 2;
              const touchesSelection =
                rel.sourceId === selectedNodeId || rel.targetId === selectedNodeId;

              return (
                <g key={rel.id}>
                  <line
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    className={touchesSelection ? 'stroke-fg-muted' : 'stroke-fg-subtle'}
                    strokeWidth={touchesSelection ? 1.75 : 1.25}
                    strokeDasharray={rel.isSecret ? '5 4' : undefined}
                  />
                  <rect
                    x={midX - 64}
                    y={midY - 11}
                    width="128"
                    height="22"
                    rx="5"
                    className="fill-surface stroke-line"
                    strokeWidth="1"
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    className="fill-fg-muted"
                    fontSize="11"
                    fontFamily="IBM Plex Sans, sans-serif"
                    fontWeight="500"
                  >
                    {rel.label.length > 20 ? `${rel.label.slice(0, 18)}…` : rel.label}
                  </text>
                </g>
              );
            })}

            {/* Nós */}
            {allNodes.map((node, idx) => {
              const pos = getPos(node.id, idx);
              const palette = NODE_COLORS[node.category] || NODE_COLORS.npc;
              const isSelected = node.id === selectedNodeId;
              const isSourceConnect = node.id === connectingSourceId;
              const highlighted = isSelected || isSourceConnect;

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
                  {highlighted && (
                    <circle
                      r="32"
                      fill="none"
                      className="stroke-accent"
                      strokeWidth="2"
                      opacity={isSourceConnect ? 1 : 0.35}
                    />
                  )}
                  <circle
                    r="27"
                    className={
                      highlighted ? 'fill-accent-soft stroke-accent' : 'fill-surface stroke-line-strong'
                    }
                    strokeWidth={highlighted ? 1.5 : 1}
                  />
                  <text
                    y="-3"
                    textAnchor="middle"
                    className={highlighted ? 'fill-accent' : 'fill-fg-subtle'}
                    fontSize="10"
                    fontFamily="IBM Plex Sans, sans-serif"
                    fontWeight="500"
                  >
                    {palette.badge}
                  </text>
                  <text
                    y="11"
                    textAnchor="middle"
                    className="fill-fg"
                    fontSize="11"
                    fontFamily="IBM Plex Sans, sans-serif"
                    fontWeight="600"
                  >
                    {node.label.slice(0, 10)}
                  </text>
                  <rect
                    x="-62"
                    y="33"
                    width="124"
                    height="20"
                    rx="4"
                    className="fill-surface stroke-line"
                  />
                  <text
                    y="47"
                    textAnchor="middle"
                    className="fill-fg-muted"
                    fontSize="11"
                    fontFamily="IBM Plex Sans, sans-serif"
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

      {/* Inspetor e criação de vínculos */}
      <div className="lg:col-span-4 flex flex-col gap-4 lg:overflow-y-auto">
        {selectedNode && (
          <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge">
                    {NODE_COLORS[selectedNode.category]?.badge || 'Nó'}
                  </span>
                  <span className="text-xs font-mono text-fg-subtle truncate">
                    {selectedNode.label}
                  </span>
                </div>
                <h3 className="section-title truncate">{selectedNode.subtitle}</h3>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {selectedNode.entityId && (
                  <button
                    onClick={() => {
                      setSelectedEntityId(selectedNode.entityId!);
                      setWorldSubTab('wiki');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    <span>Abrir no códice</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
                {selectedNode.isManual && viewRole === 'gm' && (
                  <button
                    onClick={() => deleteManualGraphNode(selectedNode.id)}
                    className="btn btn-danger-ghost btn-icon"
                    title="Excluir nó manual"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Vínculos ativos */}
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <h4 className="section-title">Vínculos</h4>
            <span className="badge tabular-nums">{visibleRelationships.length}</span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-line">
            {visibleRelationships.length === 0 && (
              <p className="px-4 py-6 text-[13px] text-fg-subtle text-center">
                Nenhum vínculo registrado.
              </p>
            )}
            {visibleRelationships.map((rel) => {
              const src = allNodes.find((n) => n.id === rel.sourceId);
              const tgt = allNodes.find((n) => n.id === rel.targetId);
              if (!src || !tgt) return null;
              const style = RELATION_STYLES[rel.type] || RELATION_STYLES.neutral;
              const isEditing = editingEdgeId === rel.id;

              return (
                <div key={rel.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-fg truncate">
                      <span className="font-medium">{src.label}</span>
                      <span className="text-fg-subtle"> → </span>
                      <span className="font-medium">{tgt.label}</span>
                    </span>

                    {viewRole === 'gm' && (
                      <div className="flex items-center shrink-0">
                        <button
                          onClick={() => {
                            setEditingEdgeId(rel.id);
                            setEditingEdgeLabel(rel.label);
                          }}
                          className="btn btn-ghost btn-icon h-7 w-7"
                          title="Editar rótulo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleRevealRelationship(rel.id)}
                          className="btn btn-ghost btn-icon h-7 w-7"
                          title={
                            rel.isSecret && !rel.isRevealed
                              ? 'Revelar aos jogadores'
                              : 'Ocultar vínculo'
                          }
                        >
                          {rel.isSecret && !rel.isRevealed ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteRelationship(rel.id)}
                          className="btn btn-danger-ghost btn-icon h-7 w-7"
                          title="Excluir vínculo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingEdgeLabel}
                        onChange={(e) => setEditingEdgeLabel(e.target.value)}
                        className="input h-8 flex-1"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (editingEdgeLabel.trim()) {
                            updateRelationshipLabel(rel.id, editingEdgeLabel.trim());
                          }
                          setEditingEdgeId(null);
                        }}
                        className="btn btn-primary btn-icon"
                        title="Salvar"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingEdgeId(null)}
                        className="btn btn-secondary btn-icon"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`badge ${style.badge}`} title={style.label}>
                        {rel.label}
                      </span>
                      {rel.isSecret && !rel.isRevealed && (
                        <span className="badge">
                          <Lock className="w-3 h-3" /> Oculto
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Novo vínculo */}
        {viewRole === 'gm' && (
          <form onSubmit={handleCreateRelationship} className="card">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
              <Plus className="w-4 h-4 text-fg-subtle" />
              <h4 className="section-title">Novo vínculo</h4>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="label">Origem</label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="input"
                >
                  {allNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label} ({n.subtitle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Destino</label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="input"
                >
                  {allNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label} ({n.subtitle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Descrição</label>
                <input
                  type="text"
                  value={edgeLabel}
                  onChange={(e) => setEdgeLabel(e.target.value)}
                  placeholder="Ex.: Irmão traidor, Credor de"
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
                  <option value="secret">Conspiração / Segredo</option>
                  <option value="hostile">Hostilidade / Rivalidade</option>
                  <option value="allied">Aliança / Lealdade</option>
                  <option value="patron">Domínio / Cobrança</option>
                  <option value="blood">Sangue / Família</option>
                  <option value="neutral">Comercial / Neutro</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={edgeIsSecret}
                  onChange={(e) => setEdgeIsSecret(e.target.checked)}
                />
                <span>Ocultar dos jogadores</span>
              </label>

              <button type="submit" className="btn btn-primary w-full">
                Criar vínculo
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Modal: novo nó manual */}
      {showAddNodeModal && (
        <div className="modal-backdrop">
          <form onSubmit={handleCreateManualNode} className="modal max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="section-title">Novo nó</h3>
              <button
                type="button"
                onClick={() => setShowAddNodeModal(false)}
                className="btn btn-ghost btn-icon"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="label">Categoria</label>
                <select
                  value={newNodeCategory}
                  onChange={(e) =>
                    setNewNodeCategory(
                      e.target.value as 'npc' | 'faction' | 'location' | 'player'
                    )
                  }
                  className="input"
                >
                  <option value="npc">Personagem (NPC)</option>
                  <option value="faction">Facção / Organização</option>
                  <option value="location">Local</option>
                  <option value="player">Personagem jogador</option>
                </select>
              </div>

              <div>
                <label className="label">Identificador</label>
                <input
                  type="text"
                  required
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  placeholder="Ex.: @ConselhoReal, #FortalezaNorte"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Nome ou papel</label>
                <input
                  type="text"
                  value={newNodeSubtitle}
                  onChange={(e) => setNewNodeSubtitle(e.target.value)}
                  placeholder="Ex.: Capitão da Guarda Real"
                  className="input"
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
                Adicionar nó
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
