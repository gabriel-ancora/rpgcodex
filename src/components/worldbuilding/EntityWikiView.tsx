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
  { label: string; shortLabel: string; icon: React.FC<{ className?: string }> }
> = {
  npc: { label: 'Personagem (NPC)', shortLabel: 'NPC', icon: User },
  faction: { label: 'Facção', shortLabel: 'Facção', icon: Shield },
  location: { label: 'Local', shortLabel: 'Local', icon: MapPin },
  item: { label: 'Item / Relíquia', shortLabel: 'Item', icon: Package },
  monster: { label: 'Criatura', shortLabel: 'Criatura', icon: Skull },
  lore: { label: 'Mito / Crônica', shortLabel: 'Lore', icon: BookOpen },
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
  const campaignName = campaigns.find((c) => c.id === activeCampaignId)?.title || '';
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
    showToast('Contexto salvo.');
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
    showToast('Resumo do códice inserido no contexto.');
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-7.5rem)]">
      {/* Diretório do códice */}
      <aside className="lg:col-span-4 xl:col-span-3 flex flex-col card overflow-hidden max-h-[70vh] lg:max-h-none">
        <div className="p-3 border-b border-line space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="section-title">Códice</h2>
              <span className="badge tabular-nums">{filteredEntities.length}</span>
            </div>
            {viewRole === 'gm' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowPdfImportModal(true)}
                  className="btn btn-ghost btn-icon"
                  title="Importar PDF para o códice"
                >
                  <FileUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova entrada</span>
                </button>
              </div>
            )}
          </div>

          {/* Atalho para a janela de contexto */}
          {viewRole === 'gm' && (
            <button
              type="button"
              onClick={() => setSelectedEntityId(WIKI_CONTEXT_WINDOW_ID)}
              className={`w-full px-3 py-2 rounded-md border text-left transition-colors flex items-center justify-between gap-2 ${
                isContextWindowOpen
                  ? 'bg-accent-soft border-accent/30'
                  : 'bg-surface border-line hover:border-line-strong hover:bg-surface-2'
              }`}
            >
              <div className="min-w-0 flex items-center gap-2.5">
                <FileText
                  className={`w-4 h-4 shrink-0 ${
                    isContextWindowOpen ? 'text-accent' : 'text-fg-subtle'
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-fg truncate">
                    Janela de contexto
                  </div>
                  <p className="text-xs text-fg-subtle truncate">
                    {contextDraft.trim()
                      ? `~${contextTokenEstimate} tokens`
                      : 'Cânone, tom e diretrizes'}
                  </p>
                </div>
              </div>
              <span className={`badge shrink-0 ${contextDraft.trim() ? 'badge-success' : ''}`}>
                {contextDraft.trim() ? 'Ativa' : 'Vazia'}
              </span>
            </button>
          )}

          <div className="relative">
            <Search className="w-4 h-4 text-fg-subtle absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, tag ou papel"
              className="input pl-8"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-accent-soft text-accent'
                  : 'text-fg-muted hover:text-fg hover:bg-surface-2'
              }`}
            >
              Todos
            </button>
            {(Object.keys(CATEGORY_META) as EntityCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-accent-soft text-accent'
                    : 'text-fg-muted hover:text-fg hover:bg-surface-2'
                }`}
              >
                {CATEGORY_META[cat].shortLabel}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-px">
          {filteredEntities.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <BookOpen className="w-5 h-5 mx-auto text-fg-subtle" />
              <p className="text-[13px] text-fg-muted">Nenhum registro encontrado.</p>
              {viewRole === 'gm' && (
                <button
                  onClick={() => setShowNewModal(true)}
                  className="btn btn-secondary btn-sm"
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
              const EntIcon = meta.icon;

              return (
                <button
                  key={ent.id}
                  onClick={() => {
                    setSelectedEntityId(ent.id);
                    setIsEditingPublic(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-md text-left transition-colors flex items-center justify-between gap-2 ${
                    isSelected ? 'bg-accent-soft' : 'hover:bg-surface-2'
                  }`}
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2.5">
                    <EntIcon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-accent' : 'text-fg-subtle'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-sm font-medium truncate ${
                            isSelected ? 'text-accent' : 'text-fg'
                          }`}
                        >
                          {ent.name}
                        </span>
                        {ent.pinnedInSession && (
                          <Pin className="w-3 h-3 text-fg-subtle shrink-0" />
                        )}
                      </div>
                      <div className="font-mono text-xs text-fg-subtle truncate">
                        {ent.mentionPrefix}
                        {ent.handle}
                      </div>
                    </div>
                  </div>

                  {viewRole === 'gm' && unrevealedCount > 0 && (
                    <span
                      title={`${unrevealedCount} segredo(s) oculto(s)`}
                      className="badge shrink-0 tabular-nums"
                    >
                      <Lock className="w-3 h-3" />
                      {unrevealedCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Painel principal: janela de contexto ou entrada */}
      <div className="lg:col-span-8 xl:col-span-9 flex flex-col card lg:overflow-y-auto">
        {isContextWindowOpen && viewRole === 'gm' ? (
          <div className="max-w-3xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
            <header className="space-y-4 border-b border-line pb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge">
                    <FileText className="w-3 h-3" />
                    Documento da campanha
                  </span>
                  <span className={`badge ${isContextDirty ? 'badge-warning' : 'badge-success'}`}>
                    {isContextDirty ? 'Salvando…' : 'Salvo'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="segmented">
                    <button
                      type="button"
                      onClick={() => setContextPreviewMode('edit')}
                      className={`segmented-item ${
                        contextPreviewMode === 'edit' ? 'segmented-item-active' : ''
                      }`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setContextPreviewMode('read')}
                      className={`segmented-item ${
                        contextPreviewMode === 'read' ? 'segmented-item-active' : ''
                      }`}
                    >
                      Visualizar
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveContextNow}
                    className="btn btn-primary btn-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <h1 className="page-title">Janela de contexto</h1>
                <p className="text-sm text-fg-muted leading-relaxed">
                  Cânone de <span className="font-medium text-fg">{campaignName || 'sua campanha'}</span>:
                  premissa, estado político, eventos recentes, regras da casa e diretrizes criativas.
                  Este texto é incluído automaticamente nas gerações do oráculo contextual.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleInsertEditorialStructure}
                  className="btn btn-secondary btn-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Inserir estrutura</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncFromWiki}
                  className="btn btn-secondary btn-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Importar resumo do códice</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModule('plots');
                    setPlotSubTab('generators');
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  <Compass className="w-4 h-4" />
                  <span>Abrir oráculo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="btn btn-ghost btn-sm"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{geminiApiKey ? 'API Gemini conectada' : 'Configurar API Gemini'}</span>
                </button>
              </div>
            </header>

            <section className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] text-fg-muted">
                  Use <span className="kbd">@</span> para NPCs e facções e{' '}
                  <span className="kbd">#</span> para locais e itens.
                </span>
                <div className="flex items-center gap-3 text-xs text-fg-subtle tabular-nums">
                  <span>{contextDraft.length} caracteres</span>
                  <span>~{contextTokenEstimate} tokens</span>
                  <span>{contextMentionCount} menções</span>
                </div>
              </div>

              {contextPreviewMode === 'edit' ? (
                <div className="rounded-lg border border-line bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 transition-colors">
                  <MentionTextarea
                    value={contextDraft}
                    onChange={setContextDraft}
                    rows={15}
                    placeholder="Reinos em guerra, segredos de bastidores, conquistas recentes do grupo, tom das sessões e restrições do mundo."
                    className="w-full bg-transparent border-0 focus:ring-0 text-sm leading-relaxed p-3.5"
                  />
                </div>
              ) : (
                <div className="p-5 rounded-lg bg-surface-2 border border-line text-sm text-fg leading-relaxed whitespace-pre-wrap min-h-[260px]">
                  {contextDraft.trim() ? (
                    <MentionText text={contextDraft} />
                  ) : (
                    <span className="text-fg-subtle">
                      Nenhum contexto definido. Volte para Editar ou use Inserir estrutura.
                    </span>
                  )}
                </div>
              )}
            </section>

            <section className="pt-5 border-t border-line space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <h3 className="section-title flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-fg-subtle" />
                    <span>Prompt final enviado ao modelo</span>
                  </h3>
                  <p className="text-[13px] text-fg-muted">
                    Inclui este contexto, {entities.length} entradas do códice e {fronts.length} frentes de ameaça.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCombinedPrompt(!showCombinedPrompt)}
                  className="btn btn-secondary btn-sm"
                >
                  {showCombinedPrompt ? 'Ocultar prompt' : 'Ver prompt'}
                </button>
              </div>

              {showCombinedPrompt && (
                <pre className="p-4 rounded-lg bg-surface-2 border border-line text-xs font-mono text-fg-muted whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
                  {combinedSystemPromptPreview}
                </pre>
              )}
            </section>
          </div>
        ) : !currentEntity ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
            <div className="w-10 h-10 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-fg-subtle">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="section-title">Códice vazio</h3>
              <p className="text-[13px] text-fg-muted leading-relaxed">
                Cadastre personagens (@), locais (#), facções ou itens para criar referências
                ao longo da campanha, ou configure a janela de contexto.
              </p>
            </div>
            {viewRole === 'gm' && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
                  <Plus className="w-4 h-4" />
                  <span>Criar entrada</span>
                </button>
                <button
                  onClick={() => setSelectedEntityId(WIKI_CONTEXT_WINDOW_ID)}
                  className="btn btn-secondary"
                >
                  <FileText className="w-4 h-4" />
                  <span>Abrir janela de contexto</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-3xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8">
            <header className="space-y-4 border-b border-line pb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="badge">
                    {CatIcon && <CatIcon className="w-3 h-3" />}
                    {CATEGORY_META[currentEntity.category].label}
                  </span>

                  <span className="badge font-mono">
                    {currentEntity.mentionPrefix}
                    {currentEntity.handle}
                  </span>

                  {currentEntity.tags.map((tag, i) => (
                    <span key={i} className="badge bg-transparent">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => togglePinEntity(currentEntity.id)}
                    className={`btn btn-sm ${
                      currentEntity.pinnedInSession
                        ? 'btn-secondary bg-accent-soft text-accent border-accent/30 hover:bg-accent-soft'
                        : 'btn-secondary'
                    }`}
                    title="Fixar como referência rápida no escudo do mestre"
                  >
                    <Pin className="w-4 h-4" />
                    <span>{currentEntity.pinnedInSession ? 'Fixado' : 'Fixar'}</span>
                  </button>

                  {viewRole === 'gm' && (
                    <>
                      <button
                        onClick={() => setIsEditingPublic(!isEditingPublic)}
                        className={`btn btn-sm ${isEditingPublic ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        {isEditingPublic ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Concluir</span>
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-4 h-4" />
                            <span>Editar</span>
                          </>
                        )}
                      </button>

                      {entities.length > 0 && (
                        <button
                          onClick={() => deleteEntity(currentEntity.id)}
                          className="btn btn-danger-ghost btn-icon"
                          title="Excluir entrada"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-fg tracking-tight">
                  {currentEntity.name}
                </h1>
                <p className="text-sm text-fg-muted">{currentEntity.subtitle}</p>
              </div>

              <div className="border-l-2 border-line-strong pl-4 py-0.5 text-sm text-fg-muted leading-relaxed">
                <MentionText text={currentEntity.summary} />
              </div>

              {linkedMapPins.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {linkedMapPins.map((mp) => (
                    <button
                      key={`${mp.mapId}-${mp.pinId}`}
                      type="button"
                      onClick={() => navigateToMapPin(mp.mapId, mp.pinId)}
                      className="btn btn-secondary btn-sm"
                    >
                      <MapIcon className="w-4 h-4 text-fg-subtle" />
                      <span>
                        {mp.mapName} <span className="text-fg-subtle">· {mp.pinLabel}</span>
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-fg-subtle" />
                    </button>
                  ))}
                </div>
              )}
            </header>

            {/* Propriedades */}
            {(currentEntity.attributes.length > 0 || viewRole === 'gm') && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="section-title">Propriedades</h3>
                  {viewRole === 'gm' && (
                    <button
                      onClick={() => setShowAddAttr(!showAddAttr)}
                      className="btn btn-ghost btn-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar</span>
                    </button>
                  )}
                </div>

                {showAddAttr && viewRole === 'gm' && (
                  <form
                    onSubmit={handleCreateAttribute}
                    className="card-muted p-3 flex flex-wrap items-center gap-2"
                  >
                    <input
                      type="text"
                      value={newAttrLabel}
                      onChange={(e) => setNewAttrLabel(e.target.value)}
                      placeholder="Propriedade (ex.: Alinhamento, CA)"
                      className="input flex-1 min-w-[160px]"
                    />
                    <input
                      type="text"
                      value={newAttrValue}
                      onChange={(e) => setNewAttrValue(e.target.value)}
                      placeholder="Valor"
                      className="input flex-1 min-w-[160px]"
                    />
                    <button type="submit" className="btn btn-primary">
                      Salvar
                    </button>
                  </form>
                )}

                {currentEntity.attributes.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {currentEntity.attributes.map((attr) => (
                      <div
                        key={attr.id}
                        className="card px-3 py-2.5 flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-fg-subtle truncate">{attr.label}</div>
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
                              className="input h-8 mt-1"
                            />
                          ) : (
                            <div className="text-sm font-medium text-fg mt-0.5 break-words tabular-nums">
                              {attr.value}
                            </div>
                          )}
                        </div>
                        {viewRole === 'gm' && isEditingPublic && (
                          <button
                            onClick={() =>
                              deleteEntityAttribute(currentEntity.id, attr.id)
                            }
                            className="btn btn-danger-ghost btn-icon h-7 w-7"
                            title="Remover propriedade"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Registro público */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="section-title flex items-center gap-2">
                  <Eye className="w-4 h-4 text-fg-subtle" />
                  Registro público
                </h3>
                <span className="text-xs text-fg-subtle">Visível aos jogadores</span>
              </div>

              {isEditingPublic && viewRole === 'gm' ? (
                <div className="card-muted p-4 space-y-4">
                  <div>
                    <label className="label">Resumo</label>
                    <input
                      type="text"
                      value={currentEntity.summary}
                      onChange={(e) =>
                        updateEntity(currentEntity.id, { summary: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Texto completo</label>
                    <MentionTextarea
                      value={currentEntity.publicContent}
                      onChange={(val) =>
                        updateEntity(currentEntity.id, { publicContent: val })
                      }
                      rows={6}
                    />
                    <p className="hint">Use @ para personagens e # para locais.</p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-fg leading-relaxed">
                  <MentionText text={currentEntity.publicContent} />
                </div>
              )}
            </section>

            {/* Segredos */}
            {(viewRole === 'gm' || visibleSecrets.length > 0) && (
              <section className="space-y-3 pt-6 border-t border-line">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="section-title flex items-center gap-2">
                    <Lock className="w-4 h-4 text-fg-subtle" />
                    {viewRole === 'gm' ? 'Segredos' : 'Descobertas reveladas'}
                  </h3>
                  {viewRole === 'gm' && (
                    <button
                      onClick={() => setShowAddSecret(!showAddSecret)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Novo segredo</span>
                    </button>
                  )}
                </div>

                {showAddSecret && viewRole === 'gm' && (
                  <form onSubmit={handleCreateSecret} className="card-muted p-4 space-y-3">
                    <div>
                      <label className="label">Título</label>
                      <input
                        type="text"
                        value={newSecretTitle}
                        onChange={(e) => setNewSecretTitle(e.target.value)}
                        placeholder="Ex.: Traição na ponte norte"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Conteúdo</label>
                      <MentionTextarea
                        value={newSecretContent}
                        onChange={setNewSecretContent}
                        rows={3}
                        placeholder="Descreva o segredo usando @NPC e #Local"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddSecret(false)}
                        className="btn btn-secondary"
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Salvar segredo
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {visibleSecrets.map((sec) => (
                    <div
                      key={sec.id}
                      className={`p-4 rounded-lg border ${
                        sec.isRevealed ? 'bg-surface border-line' : 'bg-surface-2 border-line'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          {sec.isRevealed ? (
                            <Unlock className="w-4 h-4 text-fg-subtle shrink-0" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-fg-subtle shrink-0" />
                          )}
                          <h4 className="text-sm font-medium text-fg">{sec.title}</h4>
                          <span className={`badge ${sec.isRevealed ? 'badge-success' : ''}`}>
                            {sec.isRevealed
                              ? `Revelado${sec.revealedAt ? ` · ${sec.revealedAt}` : ''}`
                              : 'Apenas mestre'}
                          </span>
                        </div>

                        {viewRole === 'gm' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                revealEntitySecret(
                                  currentEntity.id,
                                  sec.id,
                                  !sec.isRevealed
                                )
                              }
                              className="btn btn-secondary btn-sm"
                            >
                              {sec.isRevealed ? (
                                <>
                                  <EyeOff className="w-4 h-4" />
                                  <span>Ocultar</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-4 h-4" />
                                  <span>Revelar</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() =>
                                deleteEntitySecret(currentEntity.id, sec.id)
                              }
                              className="btn btn-danger-ghost btn-icon"
                              title="Remover segredo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="text-sm text-fg-muted leading-relaxed">
                        <MentionText text={sec.content} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Referências cruzadas */}
            <section className="pt-6 border-t border-line space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="section-title flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-fg-subtle" />
                  Referências
                </h3>
                <span className="text-xs text-fg-subtle tabular-nums">
                  {backlinks.length} {backlinks.length === 1 ? 'conexão' : 'conexões'}
                </span>
              </div>

              {backlinks.length === 0 ? (
                <div className="card-muted p-4 text-[13px] text-fg-muted">
                  Nenhuma referência encontrada. Cite{' '}
                  <code className="font-mono text-fg">
                    {currentEntity.mentionPrefix}
                    {currentEntity.handle}
                  </code>{' '}
                  em notas, missões ou outras entradas, ou vincule esta entrada a um marcador no mapa.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                      className="card p-3.5 cursor-pointer space-y-1.5 group transition-colors hover:border-line-strong hover:bg-surface-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`badge ${bl.isSecret ? 'badge-warning' : ''}`}>
                          {bl.sourceTypeLabel}
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-fg-subtle group-hover:text-fg transition-colors" />
                      </div>
                      <div className="text-sm font-medium text-fg">{bl.sourceTitle}</div>
                      <div className="text-[13px] text-fg-muted line-clamp-2">
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

      {/* Modal: nova entrada */}
      {showNewModal && (
        <div className="modal-backdrop">
          <form onSubmit={handleCreateEntity} className="modal max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="section-title">Nova entrada</h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="btn btn-ghost btn-icon"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="label">Categoria</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as EntityCategory)}
                  className="input"
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
                <label className="label">Nome</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex.: Capitão Vane, Cripta do Sol"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Subtítulo ou papel</label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="Ex.: Líder dos mercenários da ponte"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Resumo</label>
                <MentionTextarea value={newSummary} onChange={setNewSummary} rows={3} />
                <p className="hint">Aceita menções com @ e #.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-line bg-surface-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
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
