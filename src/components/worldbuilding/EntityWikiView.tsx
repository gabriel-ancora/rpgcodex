import React, { useState, useMemo, useEffect } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { EntityCategory } from '../../types/campaign';
import { MentionText, MentionTextarea } from '../common/MentionText';
import { computeBacklinksForEntity } from '../../utils/backlinks';
import { buildContextualSystemPrompt } from '../../services/geminiService';
import { PdfWikiImportModal } from './PdfWikiImportModal';
import {
  Search,
  Plus,
  Pin,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Edit3,
  Check,
  Trash2,
  Link2,
  User,
  Shield,
  MapPin,
  Package,
  Skull,
  BookOpen,
  ArrowUpRight,
  X,
  FileText,
  FileUp,
  Save,
  RefreshCw,
  Compass,
  KeyRound,
  Map as MapIcon,
  Code2,
} from 'lucide-react';

export const WIKI_CONTEXT_WINDOW_ID = '__context_window__';

const CATEGORY_META: Record<
  EntityCategory,
  { label: string; shortLabel: string; icon: React.FC<{ className?: string }>; dot: string }
> = {
  npc: {
    label: 'Personagem (NPC)',
    shortLabel: 'NPC',
    icon: User,
    dot: 'bg-amber-400/80',
  },
  faction: {
    label: 'Facção',
    shortLabel: 'Facção',
    icon: Shield,
    dot: 'bg-violet-400/80',
  },
  location: {
    label: 'Local',
    shortLabel: 'Local',
    icon: MapPin,
    dot: 'bg-emerald-400/80',
  },
  item: {
    label: 'Item & Relíquia',
    shortLabel: 'Item',
    icon: Package,
    dot: 'bg-sky-400/80',
  },
  monster: {
    label: 'Criatura & Chefe',
    shortLabel: 'Criatura',
    icon: Skull,
    dot: 'bg-rose-400/80',
  },
  lore: {
    label: 'Mito & Crônica',
    shortLabel: 'Lore',
    icon: BookOpen,
    dot: 'bg-zinc-400',
  },
};

export const EntityWikiView: React.FC = () => {
  const entities = useCampaignStore((s) => s.entities);
  const quests = useCampaignStore((s) => s.quests);
  const timeline = useCampaignStore((s) => s.timeline);
  const fronts = useCampaignStore((s) => s.fronts);
  const journal = useCampaignStore((s) => s.journal);
  const scratchpad = useCampaignStore((s) => s.scratchpad);
  const maps = useCampaignStore((s) => s.maps);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const campaignName = useCampaignStore((s) => s.campaignName);
  const geminiApiKey = useCampaignStore((s) => s.geminiApiKey);
  const updateCampaign = useCampaignStore((s) => s.updateCampaign);
  const showToast = useCampaignStore((s) => s.showToast);
  const setIsSettingsModalOpen = useCampaignStore((s) => s.setIsSettingsModalOpen);
  const navigateToMapPin = useCampaignStore((s) => s.navigateToMapPin);

  const selectedEntityId = useCampaignStore((s) => s.selectedEntityId);
  const setSelectedEntityId = useCampaignStore((s) => s.setSelectedEntityId);
  const viewRole = useCampaignStore((s) => s.viewRole);
  const addEntity = useCampaignStore((s) => s.addEntity);
  const updateEntity = useCampaignStore((s) => s.updateEntity);
  const deleteEntity = useCampaignStore((s) => s.deleteEntity);
  const togglePinEntity = useCampaignStore((s) => s.togglePinEntity);
  const revealEntitySecret = useCampaignStore((s) => s.revealEntitySecret);
  const addEntitySecret = useCampaignStore((s) => s.addEntitySecret);
  const deleteEntitySecret = useCampaignStore((s) => s.deleteEntitySecret);
  const addEntityAttribute = useCampaignStore((s) => s.addEntityAttribute);
  const updateEntityAttribute = useCampaignStore((s) => s.updateEntityAttribute);
  const deleteEntityAttribute = useCampaignStore((s) => s.deleteEntityAttribute);
  const setActiveModule = useCampaignStore((s) => s.setActiveModule);
  const setWorldSubTab = useCampaignStore((s) => s.setWorldSubTab);
  const setPlotSubTab = useCampaignStore((s) => s.setPlotSubTab);
  const setPortalSubTab = useCampaignStore((s) => s.setPortalSubTab);

  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.id === activeCampaignId),
    [campaigns, activeCampaignId]
  );

  const isContextWindowOpen = selectedEntityId === WIKI_CONTEXT_WINDOW_ID;

  const [contextDraft, setContextDraft] = useState<string>(
    activeCampaign?.worldContext || ''
  );
  const [contextPreviewMode, setContextPreviewMode] = useState<'edit' | 'read'>('edit');
  const [showCombinedPrompt, setShowCombinedPrompt] = useState(false);
  const [showPdfImportModal, setShowPdfImportModal] = useState(false);

  // Sync draft when switching campaigns or loading from cloud
  useEffect(() => {
    setContextDraft(activeCampaign?.worldContext || '');
  }, [activeCampaignId, activeCampaign?.worldContext]);

  const isContextDirty = contextDraft !== (activeCampaign?.worldContext || '');

  // Debounced auto-save for the Context Window
  useEffect(() => {
    if (!activeCampaignId || viewRole !== 'gm') return;
    if (contextDraft === (activeCampaign?.worldContext || '')) return;
    const timer = window.setTimeout(() => {
      updateCampaign(activeCampaignId, { worldContext: contextDraft });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [contextDraft, activeCampaignId, activeCampaign?.worldContext, updateCampaign, viewRole]);

  const handleSaveContextNow = () => {
    if (!activeCampaignId || viewRole !== 'gm') return;
    updateCampaign(activeCampaignId, { worldContext: contextDraft });
    showToast('Janela de Contexto salva e sincronizada na campanha.');
  };

  const handleInsertEditorialStructure = () => {
    const template = [
      `## Premissa & Atmosfera`,
      `Tom central: ${activeCampaign?.tone || 'Fantasia sombria & investigação'}.`,
      `${activeCampaign?.synopsis || 'Descreva aqui o conflito central, época e estado político da região.'}`,
      ``,
      `## Verdades Canônicas do Cenário`,
      `- O que todos os habitantes sabem sobre o mundo e a magia.`,
      `- Tabus, leis locais ou perigos recorrentes nas estradas.`,
      ``,
      `## Situação Atual da Mesa`,
      `- Últimos acontecimentos relevantes causados pelo grupo.`,
      `- Ganchos ativos, dívidas e alianças em aberto (cite @NPCs e #Locais).`,
      ``,
      `## Diretrizes para Improviso & IA`,
      `- Evite clichês genéricos; priorize intriga faccional, consequências materiais e nomes coesos com o cenário.`,
    ].join('\n');

    setContextDraft((prev) => (prev.trim() ? `${prev.trim()}\n\n${template}` : template));
  };

  const handleSyncFromWiki = () => {
    const npcs = entities.filter((e) => e.category === 'npc');
    const factions = entities.filter((e) => e.category === 'faction');
    const locations = entities.filter((e) => e.category === 'location');

    const snapshotLines: string[] = [`## Resumo Sincronizado do Códice`];
    if (factions.length > 0) {
      snapshotLines.push(
        `**Facções Ativas:** ${factions
          .map((f) => `${f.mentionPrefix}${f.handle} (${f.name} — ${f.subtitle})`)
          .join('; ')}`
      );
    }
    if (locations.length > 0) {
      snapshotLines.push(
        `**Locais Mapeados:** ${locations
          .map((l) => `${l.mentionPrefix}${l.handle} (${l.name})`)
          .join(', ')}`
      );
    }
    if (npcs.length > 0) {
      snapshotLines.push(
        `**NPCs de Destaque:** ${npcs
          .slice(0, 12)
          .map((n) => `${n.mentionPrefix}${n.handle} (${n.name})`)
          .join(', ')}`
      );
    }
    if (fronts.length > 0) {
      snapshotLines.push(
        `**Frentes de Ameaça:** ${fronts
          .map((f) => `${f.name} [ Destino: ${f.impendingDoom} ]`)
          .join(' | ')}`
      );
    }
    if (snapshotLines.length === 1) {
      snapshotLines.push('Nenhuma entidade ou frente cadastrada ainda no códice.');
    }

    const block = snapshotLines.join('\n');
    setContextDraft((prev) => (prev.trim() ? `${prev.trim()}\n\n${block}` : block));
    showToast('Resumo vivo do Códice inserido na Janela de Contexto.');
  };

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EntityCategory | 'all'>('all');
  const [isEditingPublic, setIsEditingPublic] = useState(false);

  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newCategory, setNewCategory] = useState<EntityCategory>('npc');
  const [newSummary, setNewSummary] = useState('');

  const [newSecretTitle, setNewSecretTitle] = useState('');
  const [newSecretContent, setNewSecretContent] = useState('');
  const [showAddSecret, setShowAddSecret] = useState(false);

  const [newAttrLabel, setNewAttrLabel] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [showAddAttr, setShowAddAttr] = useState(false);

  const filteredEntities = useMemo(() => {
    return entities.filter((e) => {
      if (viewRole === 'player' && !e.isPublicToPlayers) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.handle.toLowerCase().includes(q) ||
        e.subtitle.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [entities, categoryFilter, search, viewRole]);

  const currentEntity = isContextWindowOpen
    ? undefined
    : entities.find((e) => e.id === selectedEntityId) || filteredEntities[0] || entities[0];

  // Direct map pins linked to currentEntity
  const linkedMapPins = useMemo(() => {
    if (!currentEntity) return [];
    const found: { mapId: string; mapName: string; pinId: string; pinLabel: string }[] = [];
    for (const m of maps) {
      for (const p of m.pins) {
        if (viewRole === 'player' && p.isSecret && !p.isRevealed) continue;
        if (
          p.entityId === currentEntity.id ||
          (p.linkedEntityIds && p.linkedEntityIds.includes(currentEntity.id))
        ) {
          found.push({
            mapId: m.id,
            mapName: m.name,
            pinId: p.id,
            pinLabel: p.label,
          });
        }
      }
    }
    return found;
  }, [currentEntity, maps, viewRole]);

  const backlinks = useMemo(() => {
    if (!currentEntity) return [];
    return computeBacklinksForEntity(
      currentEntity,
      { entities, quests, timeline, fronts, journal, scratchpad, maps },
      viewRole
    );
  }, [currentEntity, entities, quests, timeline, fronts, journal, scratchpad, maps, viewRole]);

  const combinedSystemPromptPreview = useMemo(() => {
    return buildContextualSystemPrompt('npc', {
      campaignName: campaignName || activeCampaign?.title || 'Campanha Atual',
      campaignTone: activeCampaign?.tone || 'Fantasia & Investigação',
      worldContext: contextDraft.trim() || undefined,
      currentLocationHandle: '',
      activeFactions: entities
        .filter((e) => e.category === 'faction')
        .map((e) => `${e.mentionPrefix}${e.handle} (${e.name})`),
      existingNpcs: entities
        .filter((e) => e.category === 'npc')
        .map((e) => `${e.mentionPrefix}${e.handle} (${e.name})`),
      existingLocations: entities
        .filter((e) => e.category === 'location')
        .map((e) => `${e.mentionPrefix}${e.handle} (${e.name})`),
      activeFronts: fronts.map((f) => ({ name: f.name, doom: f.impendingDoom })),
    });
  }, [campaignName, activeCampaign, contextDraft, entities, fronts]);

  const contextTokenEstimate = Math.max(0, Math.ceil(contextDraft.length / 4));
  const contextMentionCount = useMemo(() => {
    const matches = contextDraft.match(/[@#][\wÀ-ÿ-]+/g);
    return matches ? matches.length : 0;
  }, [contextDraft]);

  const handleCreateEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addEntity({
      name: newName.trim(),
      subtitle: newSubtitle.trim() || 'Registro do códice',
      category: newCategory,
      summary: newSummary.trim() || `Notas sobre ${newName.trim()}.`,
    });
    setNewName('');
    setNewSubtitle('');
    setNewSummary('');
    setShowNewModal(false);
  };

  const handleCreateSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEntity || !newSecretTitle.trim() || !newSecretContent.trim()) return;
    addEntitySecret(currentEntity.id, newSecretTitle.trim(), newSecretContent.trim());
    setNewSecretTitle('');
    setNewSecretContent('');
    setShowAddSecret(false);
  };

  const handleCreateAttribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEntity || !newAttrLabel.trim() || !newAttrValue.trim()) return;
    addEntityAttribute(currentEntity.id, newAttrLabel.trim(), newAttrValue.trim());
    setNewAttrLabel('');
    setNewAttrValue('');
    setShowAddAttr(false);
  };

  const CatIcon = currentEntity ? CATEGORY_META[currentEntity.category].icon : null;
  const visibleSecrets = currentEntity
    ? viewRole === 'gm'
      ? currentEntity.secrets
      : currentEntity.secrets.filter((s) => s.isRevealed)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-7.5rem)]">
      {/* Left Pane: Codex Directory */}
      <aside className="lg:col-span-4 xl:col-span-3 flex flex-col surface-panel rounded-xl overflow-hidden">
        <div className="p-3.5 border-b border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Códice
              </h2>
              <span className="text-xs font-mono text-zinc-500 tabular-nums">
                {filteredEntities.length}
              </span>
            </div>
            {viewRole === 'gm' && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowPdfImportModal(true)}
                  className="btn-subtle px-2 py-1 rounded-md text-xs inline-flex items-center gap-1"
                  title="Ler um PDF com a IA cadastrada e preencher a Wiki"
                >
                  <FileUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => setSelectedEntityId(WIKI_CONTEXT_WINDOW_ID)}
                  className={`px-2 py-1 rounded-md text-xs inline-flex items-center gap-1 border transition-colors ${
                    isContextWindowOpen
                      ? 'bg-amber-500/15 text-amber-200 border-amber-500/35'
                      : 'btn-subtle'
                  }`}
                  title="Editar a Janela de Contexto da Campanha"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Contexto</span>
                </button>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="btn-solid px-2.5 py-1 rounded-md text-xs inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova</span>
                </button>
              </div>
            )}
          </div>

          {/* Pinned Context Window Card inside Wiki Sidebar */}
          {viewRole === 'gm' && (
            <button
              type="button"
              onClick={() => setSelectedEntityId(WIKI_CONTEXT_WINDOW_ID)}
              className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-start justify-between gap-2 ${
                isContextWindowOpen
                  ? 'bg-amber-500/[0.09] border-amber-400/40 text-zinc-100'
                  : 'bg-[#0e0e11] border-white/[0.07] hover:border-white/[0.16] text-zinc-300'
              }`}
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-100 truncate">
                    Janela de Contexto
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-snug line-clamp-1">
                  {contextDraft.trim()
                    ? `${contextTokenEstimate} tokens · Memória ativa do mundo & IA`
                    : 'Defina cânone, tom e diretrizes da campanha'}
                </p>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                  contextDraft.trim()
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                    : 'bg-white/[0.04] text-zinc-500 border-white/[0.07]'
                }`}
              >
                {contextDraft.trim() ? 'Ativa' : 'Vazia'}
              </span>
            </button>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por nome, @tag ou papel..."
              className="input-clean w-full pl-8 pr-3 py-1.5 rounded-lg text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              Todos
            </button>
            {(Object.keys(CATEGORY_META) as EntityCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                {CATEGORY_META[cat].shortLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {filteredEntities.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <BookOpen className="w-5 h-5 mx-auto text-zinc-600" />
              <p className="text-xs text-zinc-500">Nenhum registro encontrado.</p>
              {viewRole === 'gm' && (
                <button
                  onClick={() => setShowNewModal(true)}
                  className="text-xs text-zinc-300 hover:text-white underline underline-offset-4"
                >
                  Criar entrada
                </button>
              )}
            </div>
          ) : (
            filteredEntities.map((ent) => {
              const isSelected = !isContextWindowOpen && ent.id === currentEntity?.id;
              const unrevealedCount = ent.secrets.filter((s) => !s.isRevealed).length;
              const meta = CATEGORY_META[ent.category];

              return (
                <button
                  key={ent.id}
                  onClick={() => {
                    setSelectedEntityId(ent.id);
                    setIsEditingPublic(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-lg text-left transition-colors flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-white/[0.07] text-zinc-100'
                      : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                      <span className="text-xs font-medium text-zinc-100 truncate">
                        {ent.name}
                      </span>
                      {ent.pinnedInSession && (
                        <Pin className="w-3 h-3 text-zinc-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 pl-3">
                      <span className="font-mono text-[10px] text-zinc-500 truncate">
                        {ent.mentionPrefix}
                        {ent.handle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {viewRole === 'gm' && unrevealedCount > 0 && (
                      <span
                        title={`${unrevealedCount} segredo(s) oculto(s)`}
                        className="inline-flex items-center gap-0.5 text-[10px] font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.07] px-1.5 py-0.5 rounded"
                      >
                        <Lock className="w-2.5 h-2.5 text-rose-400/80" />
                        {unrevealedCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Right Pane: Context Window Editor OR Editorial Entity View */}
      <div className="lg:col-span-8 xl:col-span-9 flex flex-col surface-panel rounded-xl overflow-y-auto">
        {isContextWindowOpen && viewRole === 'gm' ? (
          <div className="max-w-4xl w-full mx-auto px-6 sm:px-10 py-8 space-y-6">
            {/* Header */}
            <header className="space-y-4 border-b border-white/[0.06] pb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25">
                    <FileText className="w-3 h-3" />
                    Documento Mestre da Campanha
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono text-zinc-400 bg-[#0e0e11] border border-white/[0.06]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isContextDirty ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                      }`}
                    />
                    {isContextDirty ? 'Salvando alterações...' : 'Sincronizado na nuvem'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setContextPreviewMode(contextPreviewMode === 'edit' ? 'read' : 'edit')
                    }
                    className="btn-subtle px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
                  >
                    {contextPreviewMode === 'edit' ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visualizar menções</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Voltar à edição</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveContextNow}
                    className="btn-solid px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar contexto</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <h1 className="text-3xl sm:text-4xl font-serif font-medium text-zinc-100 tracking-tight">
                  Janela de Contexto
                </h1>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Edite o cânone vivo de <strong className="text-zinc-200">{campaignName || 'sua campanha'}</strong>: premissa, estado político, eventos recentes, regras da casa e diretrizes criativas. Tudo o que estiver escrito aqui é injetado automaticamente nas gerações do Oráculo Contextual (Gemini).
                </p>
              </div>

              {/* Helper Toolbar */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleInsertEditorialStructure}
                  className="btn-subtle px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Inserir estrutura base</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncFromWiki}
                  className="btn-subtle px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Importar resumo vivo da Wiki</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModule('plots');
                    setPlotSubTab('generators');
                  }}
                  className="btn-subtle px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Abrir Oráculo Contextual</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="btn-subtle px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{geminiApiKey ? 'API Gemini conectada' : 'Configurar API Gemini'}</span>
                </button>
              </div>
            </header>

            {/* Editable Context Body */}
            <section className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-zinc-400">
                  Use <code className="font-mono text-zinc-200">@</code> para referenciar NPCs/Facções e{' '}
                  <code className="font-mono text-zinc-200">#</code> para Locais/Relíquias do Códice.
                </span>
                <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500 tabular-nums">
                  <span>{contextDraft.length} caracteres</span>
                  <span>~{contextTokenEstimate} tokens</span>
                  <span>{contextMentionCount} vínculos @/#</span>
                </div>
              </div>

              {contextPreviewMode === 'edit' ? (
                <div className="p-1 rounded-xl bg-[#0b0b0d] border border-white/[0.08]">
                  <MentionTextarea
                    value={contextDraft}
                    onChange={setContextDraft}
                    rows={15}
                    placeholder="Escreva aqui o contexto vivo da campanha: reinos em guerra, segredos de bastidores, conquistas recentes dos jogadores, clima das sessões e restrições de mundo..."
                    className="w-full bg-transparent border-0 focus:ring-0 text-sm leading-relaxed p-3.5"
                  />
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-[#0e0e11] border border-white/[0.08] text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap min-h-[260px]">
                  {contextDraft.trim() ? (
                    <MentionText text={contextDraft} />
                  ) : (
                    <span className="text-zinc-500">
                      Nenhum contexto personalizado definido ainda. Clique em "Voltar à edição" ou "Inserir estrutura base".
                    </span>
                  )}
                </div>
              )}
            </section>

            {/* Live Combined Context Inspector */}
            <section className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Injeção combinada no modelo (Janela de Contexto + Códice)</span>
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Além do texto editável acima, o sistema anexa automaticamente {entities.length} entradas do Códice e {fronts.length} frentes de ameaça.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCombinedPrompt(!showCombinedPrompt)}
                  className="btn-subtle px-2.5 py-1 rounded-md text-xs"
                >
                  {showCombinedPrompt ? 'Ocultar prompt final' : 'Inspecionar prompt final'}
                </button>
              </div>

              {showCombinedPrompt && (
                <pre className="p-4 rounded-xl bg-[#0b0b0d] border border-white/[0.07] text-[11px] font-mono text-zinc-400 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
                  {combinedSystemPromptPreview}
                </pre>
              )}
            </section>
          </div>
        ) : !currentEntity ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
            <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-semibold text-zinc-100">
                Códice vazio
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Cadastre personagens (@), locais (#), facções ou relíquias para conectar referências automáticas ao longo da campanha, ou configure a Janela de Contexto.
              </p>
            </div>
            {viewRole === 'gm' && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setShowNewModal(true)}
                  className="btn-solid px-4 py-2 rounded-lg text-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar primeira entrada</span>
                </button>
                <button
                  onClick={() => setSelectedEntityId(WIKI_CONTEXT_WINDOW_ID)}
                  className="btn-subtle px-4 py-2 rounded-lg text-xs inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Abrir Janela de Contexto</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl w-full mx-auto px-6 sm:px-10 py-8 space-y-8">
            {/* Editorial Header */}
            <header className="space-y-4 border-b border-white/[0.06] pb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs text-zinc-300 bg-white/[0.05] border border-white/[0.07]">
                    {CatIcon && <CatIcon className="w-3 h-3 text-zinc-400" />}
                    {CATEGORY_META[currentEntity.category].label}
                  </span>

                  <span className="px-2 py-0.5 rounded-md text-xs font-mono text-zinc-400 bg-[#0e0e11] border border-white/[0.06]">
                    {currentEntity.mentionPrefix}
                    {currentEntity.handle}
                  </span>

                  {currentEntity.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md text-[11px] text-zinc-500 bg-white/[0.03]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Action Bar */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => togglePinEntity(currentEntity.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      currentEntity.pinnedInSession
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                        : 'btn-subtle'
                    }`}
                    title="Fixar como referência rápida no escudo do mestre"
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span>{currentEntity.pinnedInSession ? 'Fixado' : 'Fixar'}</span>
                  </button>

                  {viewRole === 'gm' && (
                    <>
                      <button
                        onClick={() => setIsEditingPublic(!isEditingPublic)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          isEditingPublic
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'btn-subtle'
                        }`}
                      >
                        {isEditingPublic ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Concluir</span>
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </>
                        )}
                      </button>

                      {entities.length > 0 && (
                        <button
                          onClick={() => deleteEntity(currentEntity.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Excluir entrada"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-serif font-medium text-zinc-100 tracking-tight">
                  {currentEntity.name}
                </h1>
                <p className="text-sm text-zinc-400">{currentEntity.subtitle}</p>
              </div>

              <div className="border-l-2 border-white/[0.14] pl-4 py-0.5 text-sm text-zinc-300 leading-relaxed">
                <MentionText text={currentEntity.summary} />
              </div>

              {/* Direct Map Pin Jump Buttons */}
              {linkedMapPins.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {linkedMapPins.map((mp) => (
                    <button
                      key={`${mp.mapId}-${mp.pinId}`}
                      type="button"
                      onClick={() => navigateToMapPin(mp.mapId, mp.pinId)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 transition-colors"
                    >
                      <MapIcon className="w-3.5 h-3.5" />
                      <span>
                        Ver no Mapa: <strong>{mp.mapName}</strong> ({mp.pinLabel})
                      </span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </header>

            {/* Properties Grid */}
            {(currentEntity.attributes.length > 0 || viewRole === 'gm') && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-zinc-400">
                    Propriedades & descritores
                  </h3>
                  {viewRole === 'gm' && (
                    <button
                      onClick={() => setShowAddAttr(!showAddAttr)}
                      className="text-xs text-zinc-400 hover:text-zinc-100 inline-flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  )}
                </div>

                {showAddAttr && viewRole === 'gm' && (
                  <form
                    onSubmit={handleCreateAttribute}
                    className="p-3 rounded-lg bg-[#0e0e11] border border-white/[0.08] flex flex-wrap items-center gap-2"
                  >
                    <input
                      type="text"
                      value={newAttrLabel}
                      onChange={(e) => setNewAttrLabel(e.target.value)}
                      placeholder="Propriedade (ex: Alinhamento, Riqueza, CA)"
                      className="input-clean flex-1 min-w-[160px] px-2.5 py-1.5 rounded-md text-xs"
                    />
                    <input
                      type="text"
                      value={newAttrValue}
                      onChange={(e) => setNewAttrValue(e.target.value)}
                      placeholder="Valor"
                      className="input-clean flex-1 min-w-[160px] px-2.5 py-1.5 rounded-md text-xs"
                    />
                    <button
                      type="submit"
                      className="btn-solid px-3 py-1.5 rounded-md text-xs"
                    >
                      Salvar
                    </button>
                  </form>
                )}

                {currentEntity.attributes.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {currentEntity.attributes.map((attr) => (
                      <div
                        key={attr.id}
                        className="px-3 py-2.5 rounded-lg bg-[#0e0e11] border border-white/[0.06] flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] text-zinc-500 truncate">
                            {attr.label}
                          </div>
                          {isEditingPublic && viewRole === 'gm' ? (
                            <input
                              type="text"
                              value={attr.value}
                              onChange={(e) =>
                                updateEntityAttribute(
                                  currentEntity.id,
                                  attr.id,
                                  e.target.value
                                )
                              }
                              className="input-clean mt-1 w-full px-2 py-0.5 rounded text-xs font-mono"
                            />
                          ) : (
                            <div className="text-xs font-mono font-medium text-zinc-200 mt-0.5 break-words tabular-nums">
                              {attr.value}
                            </div>
                          )}
                        </div>
                        {viewRole === 'gm' && isEditingPublic && (
                          <button
                            onClick={() =>
                              deleteEntityAttribute(currentEntity.id, attr.id)
                            }
                            className="text-zinc-600 hover:text-rose-400 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Public Lore Section */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-zinc-400" />
                  <h3 className="text-xs font-medium text-zinc-300">
                    Registro público
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-500">
                  Visível aos jogadores
                </span>
              </div>

              {isEditingPublic && viewRole === 'gm' ? (
                <div className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.08] space-y-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Resumo curto
                    </label>
                    <input
                      type="text"
                      value={currentEntity.summary}
                      onChange={(e) =>
                        updateEntity(currentEntity.id, { summary: e.target.value })
                      }
                      className="input-clean w-full px-3 py-1.5 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Texto completo (use @ para personagens e # para locais)
                    </label>
                    <MentionTextarea
                      value={currentEntity.publicContent}
                      onChange={(val) =>
                        updateEntity(currentEntity.id, { publicContent: val })
                      }
                      rows={6}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-zinc-300 leading-relaxed">
                  <MentionText text={currentEntity.publicContent} />
                </div>
              )}
            </section>

            {/* GM Confidential / Secrets Section */}
            {(viewRole === 'gm' || visibleSecrets.length > 0) && (
              <section className="space-y-3 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-zinc-400" />
                    <h3 className="text-xs font-medium text-zinc-300">
                      {viewRole === 'gm'
                        ? 'Notas confidenciais & segredos'
                        : 'Descobertas reveladas'}
                    </h3>
                  </div>
                  {viewRole === 'gm' && (
                    <button
                      onClick={() => setShowAddSecret(!showAddSecret)}
                      className="btn-subtle px-2.5 py-1 rounded-md text-xs inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Novo segredo</span>
                    </button>
                  )}
                </div>

                {showAddSecret && viewRole === 'gm' && (
                  <form
                    onSubmit={handleCreateSecret}
                    className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.08] space-y-3"
                  >
                    <div className="text-xs font-medium text-zinc-300">
                      Adicionar nota confidencial
                    </div>
                    <input
                      type="text"
                      value={newSecretTitle}
                      onChange={(e) => setNewSecretTitle(e.target.value)}
                      placeholder="Título (ex: Traição na ponte norte)"
                      className="input-clean w-full px-3 py-1.5 rounded-lg text-xs"
                    />
                    <MentionTextarea
                      value={newSecretContent}
                      onChange={setNewSecretContent}
                      rows={3}
                      placeholder="Descreva o segredo usando @NPC e #Local..."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddSecret(false)}
                        className="btn-subtle px-3 py-1.5 rounded-lg text-xs"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="btn-solid px-3 py-1.5 rounded-lg text-xs"
                      >
                        Salvar segredo
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2.5">
                  {visibleSecrets.map((sec) => (
                    <div
                      key={sec.id}
                      className={`p-4 rounded-xl border transition-colors ${
                        sec.isRevealed
                          ? 'bg-amber-500/[0.04] border-amber-500/25'
                          : 'bg-[#0e0e11] border-white/[0.07]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {sec.isRevealed ? (
                            <Unlock className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-rose-400/80" />
                          )}
                          <h4 className="text-sm font-medium text-zinc-100">
                            {sec.title}
                          </h4>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              sec.isRevealed
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                                : 'bg-white/[0.04] text-zinc-400 border-white/[0.08]'
                            }`}
                          >
                            {sec.isRevealed
                              ? `Revelado${sec.revealedAt ? ` · ${sec.revealedAt}` : ''}`
                              : 'Apenas mestre'}
                          </span>
                        </div>

                        {viewRole === 'gm' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                revealEntitySecret(
                                  currentEntity.id,
                                  sec.id,
                                  !sec.isRevealed
                                )
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                sec.isRevealed ? 'btn-subtle' : 'btn-solid'
                              }`}
                            >
                              {sec.isRevealed ? (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  <span>Ocultar</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  <span>Revelar</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() =>
                                deleteEntitySecret(currentEntity.id, sec.id)
                              }
                              className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                              title="Remover segredo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-zinc-300 leading-relaxed">
                        <MentionText text={sec.content} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Bidirectional Backlinks */}
            <section className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-zinc-400" />
                  <h3 className="text-xs font-medium text-zinc-300">
                    Referências cruzadas & mapas
                  </h3>
                </div>
                <span className="text-xs font-mono text-zinc-500 tabular-nums">
                  {backlinks.length} conexões com {currentEntity.mentionPrefix}
                  {currentEntity.handle}
                </span>
              </div>

              {backlinks.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.05] text-xs text-zinc-500">
                  Nenhuma referência encontrada. Cite{' '}
                  <code className="text-zinc-300 font-mono">
                    {currentEntity.mentionPrefix}
                    {currentEntity.handle}
                  </code>{' '}
                  em notas, missões, outras entradas ou vincule esta entidade em um marcador no Mapa Interativo.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {backlinks.map((bl) => (
                    <div
                      key={bl.id}
                      onClick={() => {
                        if (bl.sourceType === 'entity') {
                          setSelectedEntityId(bl.sourceId);
                        } else if (bl.sourceType === 'map' && bl.mapId) {
                          navigateToMapPin(bl.mapId, bl.pinId || '');
                        } else if (bl.sourceType === 'quest') {
                          setActiveModule('portal');
                          setPortalSubTab('quests');
                        } else if (bl.sourceType === 'timeline') {
                          setWorldSubTab('timeline');
                        } else if (bl.sourceType === 'front') {
                          setActiveModule('plots');
                          setPlotSubTab('fronts');
                        } else if (bl.sourceType === 'journal') {
                          setActiveModule('portal');
                          setPortalSubTab('journal');
                        } else if (bl.sourceType === 'scratchpad') {
                          setActiveModule('session');
                        }
                      }}
                      className="p-3.5 rounded-xl surface-card cursor-pointer space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            bl.isSecret
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                              : bl.sourceType === 'map'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              : 'bg-white/[0.04] text-zinc-400 border-white/[0.07]'
                          }`}
                        >
                          {bl.sourceTypeLabel}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-200 transition-colors" />
                      </div>
                      <div className="text-xs font-medium text-zinc-200 group-hover:text-white">
                        {bl.sourceTitle}
                      </div>
                      <div className="text-xs text-zinc-500 line-clamp-2">
                        <MentionText text={bl.excerpt} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Modal: Create New Entity */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateEntity}
            className="w-full max-w-md rounded-2xl bg-[#121215] border border-white/[0.09] shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-semibold text-zinc-100">
                Nova entrada no códice
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1 text-zinc-500 hover:text-zinc-200 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Categoria
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as EntityCategory)}
                  className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                >
                  <option value="npc">Personagem (NPC) — @menção</option>
                  <option value="faction">Facção — @menção</option>
                  <option value="monster">Criatura / Ameaça — @menção</option>
                  <option value="location">Local — #menção</option>
                  <option value="item">Item / Relíquia — #menção</option>
                  <option value="lore">Mito / Evento — #menção</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Capitão Vane ou Cripta do Sol"
                  className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Subtítulo ou papel
                </label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="Ex: Líder dos mercenários da ponte"
                  className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Resumo inicial (suporta @ e #)
                </label>
                <MentionTextarea
                  value={newSummary}
                  onChange={setNewSummary}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="btn-subtle px-3.5 py-2 rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-solid px-4 py-2 rounded-lg text-xs"
              >
                Criar entrada
              </button>
            </div>
          </form>
        </div>
      )}

      <PdfWikiImportModal
        isOpen={showPdfImportModal}
        onClose={() => setShowPdfImportModal(false)}
      />
    </div>
  );
};
