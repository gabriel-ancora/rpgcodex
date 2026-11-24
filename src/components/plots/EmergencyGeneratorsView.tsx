import React, { useState, useEffect, useMemo } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import {
  generateContextualEmergencyWithAI,
  buildContextualSystemPrompt,
  sanitizeGeneratedItemFields,
} from '../../services/geminiService';
import { MentionText, MentionTextarea } from '../common/MentionText';
import { WIKI_CONTEXT_WINDOW_ID } from '../worldbuilding/EntityWikiView';
import {
  Compass,
  UserPlus,
  MapPin,
  MessageSquare,
  Gem,
  BookMarked,
  Pin,
  FilePlus2,
  Lock,
  KeyRound,
  Code2,
  Loader2,
  FileText,
  Save,
  ArrowUpRight,
  Trash2,
  X,
} from 'lucide-react';

export const EmergencyGeneratorsView: React.FC = () => {
  const rawGeneratedItems = useCampaignStore((s) => s.recentGeneratedItems);
  const recordGeneratedItem = useCampaignStore((s) => s.recordGeneratedItem);
  const removeGeneratedItem = useCampaignStore((s) => s.removeGeneratedItem);
  const clearGeneratedItems = useCampaignStore((s) => s.clearGeneratedItems);
  const saveGeneratedItemToDatabase = useCampaignStore(
    (s) => s.saveGeneratedItemToDatabase
  );
  const addScratchpadLine = useCampaignStore((s) => s.addScratchpadLine);
  const showToast = useCampaignStore((s) => s.showToast);

  const entities = useCampaignStore((s) => s.entities);
  const fronts = useCampaignStore((s) => s.fronts);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const updateCampaign = useCampaignStore((s) => s.updateCampaign);
  const geminiApiKey = useCampaignStore((s) => s.geminiApiKey);
  const setIsSettingsModalOpen = useCampaignStore(
    (s) => s.setIsSettingsModalOpen
  );
  const setActiveModule = useCampaignStore((s) => s.setActiveModule);
  const setWorldSubTab = useCampaignStore((s) => s.setWorldSubTab);
  const setSelectedEntityId = useCampaignStore((s) => s.setSelectedEntityId);

  const activeCamp = campaigns.find((c) => c.id === activeCampaignId);
  const campaignName = activeCamp?.title || '';
  const campaignTone = activeCamp?.tone || 'Fantasia & Investigação';
  const locationEntities = entities.filter((e) => e.category === 'location');

  // Sanitiza itens já gerados para que títulos e handles fiquem sempre limpos
  const recentGeneratedItems = useMemo(
    () => rawGeneratedItems.map((item) => sanitizeGeneratedItemFields(item)),
    [rawGeneratedItems]
  );

  const [selectedLocationHandle, setSelectedLocationHandle] = useState<string>(
    locationEntities[0]
      ? `${locationEntities[0].mentionPrefix}${locationEntities[0].handle}`
      : ''
  );
  const [customHint, setCustomHint] = useState('');
  const [loadingType, setLoadingType] = useState<
    'npc' | 'tavern' | 'rumor' | 'loot' | null
  >(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [worldContextDraft, setWorldContextDraft] = useState(
    activeCamp?.worldContext || ''
  );

  useEffect(() => {
    setWorldContextDraft(activeCamp?.worldContext || '');
  }, [activeCampaignId, activeCamp?.worldContext]);

  const handleSaveInlineContext = () => {
    if (!activeCampaignId) return;
    updateCampaign(activeCampaignId, { worldContext: worldContextDraft });
    showToast('Janela de contexto atualizada.');
  };

  const handleOpenWikiContextWindow = () => {
    setSelectedEntityId(WIKI_CONTEXT_WINDOW_ID);
    setActiveModule('worldbuilding');
    setWorldSubTab('wiki');
  };

  const handleGenerate = async (type: 'npc' | 'tavern' | 'rumor' | 'loot') => {
    setLoadingType(type);
    try {
      if (activeCampaignId && worldContextDraft !== (activeCamp?.worldContext || '')) {
        updateCampaign(activeCampaignId, { worldContext: worldContextDraft });
      }

      const result = await generateContextualEmergencyWithAI(
        type,
        entities,
        fronts,
        campaignName,
        geminiApiKey,
        customHint.trim() || undefined,
        selectedLocationHandle || undefined,
        campaignTone,
        worldContextDraft.trim() || undefined
      );
      recordGeneratedItem(result.item);

      if (result.usedLiveGemini) {
        showToast('Gerado com Gemini.');
      } else if (geminiApiKey && result.fallbackReason === 'http_429') {
        showToast('Limite da API Gemini atingido (429). Gerado com o motor local.');
      } else if (
        geminiApiKey &&
        (result.fallbackReason === 'http_400' || result.fallbackReason === 'http_403')
      ) {
        showToast('Chave Gemini recusada. Verifique em Configurar API. Gerado com o motor local.');
      } else {
        showToast(
          geminiApiKey
            ? 'Gerado com o motor local.'
            : 'Gerado com o motor local. Configure uma chave de API para usar o Gemini.'
        );
      }
    } finally {
      setLoadingType(null);
    }
  };

  const previewPrompt = buildContextualSystemPrompt('npc', {
    campaignName: campaignName || 'Campanha Atual',
    campaignTone,
    worldContext: worldContextDraft.trim() || undefined,
    currentLocationHandle: selectedLocationHandle,
    activeFactions: entities
      .filter((e) => e.category === 'faction')
      .map((e) => `${e.mentionPrefix}${e.handle}`),
    existingNpcs: entities
      .filter((e) => e.category === 'npc')
      .map((e) => `${e.mentionPrefix}${e.handle}`),
    existingLocations: locationEntities.map(
      (e) => `${e.mentionPrefix}${e.handle}`
    ),
    activeFronts: fronts.map((f) => ({ name: f.name, doom: f.impendingDoom })),
    customPromptHint: customHint.trim() || undefined,
  });

  const generatorTiles: {
    type: 'npc' | 'tavern' | 'rumor' | 'loot';
    title: string;
    desc: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      type: 'npc',
      title: 'Personagem',
      desc: 'Nome, traço, segredo e vínculo',
      icon: UserPlus,
    },
    {
      type: 'tavern',
      title: 'Local',
      desc: 'Atmosfera, anfitrião e gancho',
      icon: MapPin,
    },
    {
      type: 'rumor',
      title: 'Rumor',
      desc: 'Boato e verdade oculta',
      icon: MessageSquare,
    },
    {
      type: 'loot',
      title: 'Item',
      desc: 'Objeto ligado às facções',
      icon: Gem,
    },
  ];

  const TYPE_LABELS: Record<string, string> = {
    npc: 'Personagem',
    tavern: 'Local',
    rumor: 'Rumor',
    loot: 'Item',
  };

  return (
    <div className="space-y-4 h-[calc(100vh-7.5rem)] overflow-y-auto pr-1">
      {/* Painel de contexto */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="section-title">Oráculo</h2>
              <span className={`badge ${geminiApiKey ? 'badge-success' : ''}`}>
                {geminiApiKey ? 'Gemini conectado' : 'Motor local'}
              </span>
            </div>
            <p className="text-[13px] text-fg-muted">
              Gera elementos com base na janela de contexto, facções, personagens e frentes ativas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {recentGeneratedItems.length > 0 && (
              <button
                type="button"
                onClick={clearGeneratedItems}
                className="btn btn-danger-ghost btn-sm"
                title="Remover os resultados desta sessão"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpar histórico</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenWikiContextWindow}
              className="btn btn-secondary btn-sm"
            >
              <FileText className="w-4 h-4" />
              <span>Abrir contexto na Wiki</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-fg-subtle" />
            </button>
            <button
              type="button"
              onClick={() => setShowPromptPreview(!showPromptPreview)}
              className="btn btn-secondary btn-sm"
            >
              <Code2 className="w-4 h-4" />
              <span>{showPromptPreview ? 'Ocultar contexto' : 'Editar contexto'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="btn btn-secondary btn-sm"
            >
              <KeyRound className="w-4 h-4" />
              <span>{geminiApiKey ? 'Chave configurada' : 'Configurar API'}</span>
            </button>
          </div>
        </div>

        {/* Parâmetros */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label className="label">Local de referência</label>
            <select
              value={selectedLocationHandle}
              onChange={(e) => setSelectedLocationHandle(e.target.value)}
              className="input"
            >
              <option value="">Contexto geral da campanha</option>
              {locationEntities.map((loc) => (
                <option key={loc.id} value={`${loc.mentionPrefix}${loc.handle}`}>
                  {loc.name} ({loc.mentionPrefix}
                  {loc.handle})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-8">
            <label className="label">Instrução adicional (opcional)</label>
            <input
              type="text"
              value={customHint}
              onChange={(e) => setCustomHint(e.target.value)}
              placeholder="Ex.: ferreiro veterano da Batalha do Vau"
              className="input"
            />
          </div>
        </div>

        {showPromptPreview && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 card-muted p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-fg">
                  Janela de contexto (sincronizada com a Wiki)
                </span>
                <button
                  type="button"
                  onClick={handleSaveInlineContext}
                  className="btn btn-primary btn-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar</span>
                </button>
              </div>
              <MentionTextarea
                value={worldContextDraft}
                onChange={setWorldContextDraft}
                rows={6}
                placeholder="Diretrizes canônicas, história da região, regras da casa e tom. Suporta @NPC e #Local."
              />
            </div>

            <div className="space-y-2">
              <div className="text-[13px] font-medium text-fg-muted">
                Prompt enviado ao Gemini
              </div>
              <pre className="p-3 rounded-md bg-surface border border-line text-xs font-mono text-fg-muted whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed">
                {previewPrompt}
              </pre>
            </div>
          </div>
        )}

        {/* Geradores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {generatorTiles.map((tile) => {
            const Icon = tile.icon;
            const isLoading = loadingType === tile.type;
            return (
              <button
                key={tile.type}
                disabled={loadingType !== null}
                onClick={() => handleGenerate(tile.type)}
                className="p-3 rounded-md bg-surface border border-line hover:border-line-strong hover:bg-surface-2 transition-colors flex items-start gap-3 text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-8 h-8 rounded-md bg-surface-2 border border-line text-fg-muted flex items-center justify-center shrink-0">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-fg">Gerar {tile.title.toLowerCase()}</div>
                  <div className="text-xs text-fg-subtle leading-snug">{tile.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resultados */}
      {recentGeneratedItems.length === 0 ? (
        <div className="card py-12 px-6 text-center">
          <Compass className="w-5 h-5 text-fg-subtle mx-auto mb-3" />
          <h3 className="text-sm font-medium text-fg">Nenhum resultado nesta sessão</h3>
          <p className="text-[13px] text-fg-muted max-w-md mx-auto mt-1">
            Escolha o local e uma categoria acima para gerar rascunhos que podem ser salvos no códice.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentGeneratedItems.map((item) => (
            <div
              key={item.id}
              className="card p-4 flex flex-col justify-between gap-4 overflow-hidden"
            >
              <div className="space-y-3 min-w-0">
                <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">
                      <span>
                        {TYPE_LABELS[item.type] || item.type} · {item.timestamp}
                      </span>
                      {item.aiGenerated && <span className="badge">Gemini</span>}
                    </div>
                    <h3 className="text-base font-semibold text-fg break-words leading-snug mt-0.5">
                      {item.title}
                    </h3>
                    <p className="text-[13px] text-fg-muted break-words">{item.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      title={`${item.type === 'npc' ? '@' : '#'}${item.rawHandle}`}
                      className="badge font-mono max-w-[155px] truncate"
                    >
                      {item.type === 'npc' ? '@' : '#'}
                      {item.rawHandle}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeGeneratedItem(item.id)}
                      className="btn btn-ghost btn-sm btn-icon"
                      title="Remover"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <dl className="space-y-3">
                  {item.details.map((d, idx) => (
                    <div key={idx}>
                      <dt className="flex items-center gap-1.5 text-xs font-medium text-fg-muted mb-0.5">
                        {d.isSecret && <Lock className="w-3.5 h-3.5 text-fg-subtle" />}
                        <span>{d.label}</span>
                        {d.isSecret && <span className="text-fg-subtle font-normal">· secreto</span>}
                      </dt>
                      <dd className="text-sm text-fg leading-relaxed break-words">
                        <MentionText text={d.value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-line">
                <button
                  onClick={() => saveGeneratedItemToDatabase(item, false)}
                  className="btn btn-primary btn-sm flex-1"
                >
                  <BookMarked className="w-4 h-4" />
                  <span>Salvar no códice</span>
                </button>

                <button
                  onClick={() => saveGeneratedItemToDatabase(item, true)}
                  className="btn btn-secondary btn-sm flex-1"
                >
                  <Pin className="w-4 h-4" />
                  <span>Fixar na sessão</span>
                </button>

                <button
                  onClick={() => {
                    addScratchpadLine(
                      `${item.title} (${item.subtitle}) — ${item.details[0]?.value}`
                    );
                    showToast(`"${item.title}" adicionado às notas rápidas.`);
                  }}
                  className="btn btn-secondary btn-sm btn-icon"
                  title="Enviar para notas rápidas"
                >
                  <FilePlus2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
