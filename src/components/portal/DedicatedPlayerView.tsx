import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { Entity, EntityCategory } from '../../types/campaign';
import { QuestLogView } from './QuestLogView';
import { JournalInventoryView } from './JournalInventoryView';
import { InteractiveMapsView } from '../worldbuilding/InteractiveMapsView';
import { CharacterSheetModal } from '../characters/CharacterSheetModal';
import { PartySheetsView } from '../characters/PartySheetsView';
import { MentionText } from '../common/MentionText';
import { formatTime } from '../../utils/format';
import { firstPendingStepForSheet } from '../../rules/levelUp';
import type { BuildStep } from '../../rules/engine';
import {
  Shield,
  ArrowLeft,
  Plus,
  Minus,
  Unlock,
  Lock,
  FileText,
  Heart,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  SkipForward,
  Users,
  Sliders,
  Pencil,
  X,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

type Tab = 'quests' | 'map' | 'combat' | 'journals' | 'wiki' | 'party';

const CONDITIONS_LIST = [
  'Envenenado',
  'Caído',
  'Concentrando',
  'Amedrontado',
  'Sangrando',
  'Atordoado',
  'Invisível',
];

const CATEGORY_LABELS: Record<EntityCategory, string> = {
  npc: 'NPC',
  location: 'Local',
  faction: 'Facção',
  item: 'Item',
  monster: 'Criatura',
  lore: 'Lore',
};

const COMBATANT_TYPE_LABELS: Record<'pc' | 'npc' | 'monster', string> = {
  pc: 'PJ',
  npc: 'NPC',
  monster: 'Criatura',
};

export const DedicatedPlayerView: React.FC = () => {
  const currentUser = useCampaignStore((s) => s.currentUser);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const previewAsPlayer = useCampaignStore((s) => s.previewAsPlayer);
  const setPreviewAsPlayer = useCampaignStore((s) => s.setPreviewAsPlayer);

  const characterSheets = useCampaignStore((s) => s.characterSheets);
  const activeCharacterId = useCampaignStore((s) => s.activeCharacterId);
  const setActiveCharacterId = useCampaignStore((s) => s.setActiveCharacterId);
  const updateCharacterSheet = useCampaignStore((s) => s.updateCharacterSheet);
  const setCurrentRoute = useCampaignStore((s) => s.setCurrentRoute);

  const combatants = useCampaignStore((s) => s.combatants);
  const activeCombatTurnIndex = useCampaignStore((s) => s.activeCombatTurnIndex);
  const combatRound = useCampaignStore((s) => s.combatRound);
  const addCombatant = useCampaignStore((s) => s.addCombatant);
  const adjustCombatantHp = useCampaignStore((s) => s.adjustCombatantHp);
  const toggleCombatantCondition = useCampaignStore((s) => s.toggleCombatantCondition);
  const setCombatantHidden = useCampaignStore((s) => s.setCombatantHidden);
  const removeCombatant = useCampaignStore((s) => s.removeCombatant);
  const clearCombatants = useCampaignStore((s) => s.clearCombatants);
  const nextCombatTurn = useCampaignStore((s) => s.nextCombatTurn);
  const rollAllInitiatives = useCampaignStore((s) => s.rollAllInitiatives);

  const diceLogs = useCampaignStore((s) => s.diceLogs);
  const rollDice = useCampaignStore((s) => s.rollDice);
  const deleteDiceLog = useCampaignStore((s) => s.deleteDiceLog);
  const clearDiceLogs = useCampaignStore((s) => s.clearDiceLogs);

  const entities = useCampaignStore((s) => s.entities);
  const addEntity = useCampaignStore((s) => s.addEntity);
  const updateEntity = useCampaignStore((s) => s.updateEntity);
  const deleteEntity = useCampaignStore((s) => s.deleteEntity);
  const revealEntitySecret = useCampaignStore((s) => s.revealEntitySecret);
  const addEntitySecret = useCampaignStore((s) => s.addEntitySecret);
  const deleteEntitySecret = useCampaignStore((s) => s.deleteEntitySecret);

  const [activeTab, setActiveTab] = useState<Tab>('quests');
  const [sheetModal, setSheetModal] = useState<{
    id: string | null;
    initialEditStep?: BuildStep;
  } | null>(null);

  // Controles de combate para o Mestre na tela da mesa
  const [showAddCombatant, setShowAddCombatant] = useState(false);
  const [combName, setCombName] = useState('');
  const [combType, setCombType] = useState<'pc' | 'npc' | 'monster'>('monster');
  const [combInit, setCombInit] = useState(12);
  const [combHp, setCombHp] = useState(35);
  const [combAc, setCombAc] = useState(14);
  const [combHidden, setCombHidden] = useState(false);

  // Controles de dados
  const [diceCount, setDiceCount] = useState(1);
  const [diceMod, setDiceMod] = useState(0);
  const [diceCustomLabel, setDiceCustomLabel] = useState('');

  // Controles do Códice na visão da mesa
  const [wikiSearch, setWikiSearch] = useState('');
  const [wikiVisibilityFilter, setWikiVisibilityFilter] = useState<'all' | 'public' | 'hidden'>('all');
  const [showAddWikiModal, setShowAddWikiModal] = useState(false);
  const [editingWikiEntity, setEditingWikiEntity] = useState<Entity | null>(null);
  const [wName, setWName] = useState('');
  const [wCategory, setWCategory] = useState<EntityCategory>('npc');
  const [wSubtitle, setWSubtitle] = useState('');
  const [wContent, setWContent] = useState('');
  const [wPublic, setWPublic] = useState(true);
  const [secretDrafts, setSecretDrafts] = useState<Record<string, { title: string; content: string; open: boolean }>>({});

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId) || campaigns[0];
  const isCampaignDm = Boolean(activeCampaign?.isDm);
  // Modo de controle do Mestre: ativo quando é Mestre desta campanha e não está simulando o olhar restrito do jogador.
  const isDmControlMode = isCampaignDm && !previewAsPlayer;

  const campaignPartySheets = characterSheets.filter(
    (c) => !activeCampaign || c.campaignId === activeCampaign.id
  );
  // Apenas fichas do próprio jogador vinculadas a esta campanha.
  const mySheets = campaignPartySheets.filter((c) => c.playerId === currentUser?.id);
  const activeChar = mySheets.find((c) => c.id === activeCharacterId) || mySheets[0];

  const sortedCombatants = [...combatants]
    .filter((c) => isDmControlMode || !c.isHidden)
    .sort((a, b) => b.initiative - a.initiative);

  // Jogadores (e simulação de jogador) nunca enxergam rolagens feitas pelo Mestre.
  const visibleDiceLogs = isDmControlMode
    ? diceLogs
    : diceLogs.filter((r) => !r.isDmRoll);

  const visibleEntities = entities.filter((e) => {
    if (!isDmControlMode && !e.isPublicToPlayers) return false;
    if (isDmControlMode) {
      if (wikiVisibilityFilter === 'public' && !e.isPublicToPlayers) return false;
      if (wikiVisibilityFilter === 'hidden' && e.isPublicToPlayers) return false;
    }
    if (wikiSearch.trim()) {
      const q = wikiSearch.trim().toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.subtitle.toLowerCase().includes(q) ||
        e.publicContent.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAddCombatantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!combName.trim()) return;
    const maxHpVal = Math.max(1, Number(combHp) || 1);
    void addCombatant({
      name: combName.trim(),
      type: combType,
      initiative: Number(combInit) || 10,
      hp: maxHpVal,
      maxHp: maxHpVal,
      armorClass: Number(combAc) || 10,
      conditions: [],
      notes: '',
      isHidden: combHidden,
    });
    setCombName('');
    setCombHidden(false);
    setShowAddCombatant(false);
  };

  const openCreateWikiModal = () => {
    setEditingWikiEntity(null);
    setWName('');
    setWCategory('npc');
    setWSubtitle('');
    setWContent('');
    setWPublic(true);
    setShowAddWikiModal(true);
  };

  const openEditWikiModal = (ent: Entity) => {
    setEditingWikiEntity(ent);
    setWName(ent.name);
    setWCategory(ent.category);
    setWSubtitle(ent.subtitle);
    setWContent(ent.publicContent);
    setWPublic(ent.isPublicToPlayers);
    setShowAddWikiModal(true);
  };

  const handleSaveWikiModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wName.trim()) return;
    if (editingWikiEntity) {
      await updateEntity(editingWikiEntity.id, {
        name: wName.trim(),
        category: wCategory,
        subtitle: wSubtitle.trim(),
        summary: wContent.trim().slice(0, 140) || wSubtitle.trim(),
        publicContent: wContent.trim(),
        isPublicToPlayers: wPublic,
      });
    } else {
      await addEntity({
        name: wName.trim(),
        category: wCategory,
        subtitle: wSubtitle.trim() || CATEGORY_LABELS[wCategory],
        summary: wContent.trim().slice(0, 140) || wName.trim(),
        publicContent: wContent.trim() || 'Entrada publicada para a mesa.',
        isPublicToPlayers: wPublic,
      });
    }
    setShowAddWikiModal(false);
    setEditingWikiEntity(null);
  };

  const handleAddSecret = (entityId: string) => {
    const draft = secretDrafts[entityId];
    if (!draft || !draft.title.trim() || !draft.content.trim()) return;
    void addEntitySecret(entityId, draft.title.trim(), draft.content.trim());
    setSecretDrafts((prev) => ({
      ...prev,
      [entityId]: { title: '', content: '', open: false },
    }));
  };

  const tabs: { id: Tab; label: string }[] = [
    ...(isDmControlMode
      ? [{ id: 'party' as Tab, label: `Fichas do grupo (${campaignPartySheets.length})` }]
      : []),
    { id: 'quests', label: 'Missões' },
    { id: 'map', label: 'Mapas' },
    { id: 'combat', label: `Combate · rodada ${combatRound}` },
    { id: 'journals', label: 'Diário e inventário' },
    { id: 'wiki', label: 'Códice' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isCampaignDm) setPreviewAsPlayer(false);
                setCurrentRoute('/campaigns');
              }}
              className="btn btn-secondary btn-icon"
              aria-label="Voltar ao painel"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-xs text-fg-subtle">
                {isCampaignDm
                  ? isDmControlMode
                    ? 'Tela dos jogadores · Controle do Mestre'
                    : 'Tela dos jogadores · Simulando olhar do jogador'
                  : 'Visão do jogador'}
              </p>
              <h1 className="page-title">{activeCampaign?.title || 'Mesa'}</h1>
            </div>
          </div>

          {isCampaignDm ? (
            <div className="card px-3 py-2 flex flex-wrap items-center gap-2.5 text-[13px]">
              <div className="segmented">
                <button
                  type="button"
                  onClick={() => setPreviewAsPlayer(false)}
                  className={`segmented-item inline-flex items-center gap-1.5 ${
                    isDmControlMode ? 'segmented-item-active' : ''
                  }`}
                  title="Editar missões, mapas, combate, dados, inventário e códice diretamente na tela da mesa"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Gerenciar tela</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewAsPlayer(true)}
                  className={`segmented-item inline-flex items-center gap-1.5 ${
                    !isDmControlMode ? 'segmented-item-active' : ''
                  }`}
                  title="Ver exatamente como os jogadores enxergam (sem vida de monstros e sem dados do Mestre)"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Simular jogador</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPreviewAsPlayer(false);
                  setActiveTab('party');
                }}
                className={`btn btn-sm ${
                  activeTab === 'party' && isDmControlMode ? 'btn-primary' : 'btn-secondary'
                }`}
                title="Abrir a aba completa de Fichas do grupo com inventário e subida de nível"
              >
                <Users className="w-4 h-4" />
                <span>Fichas do grupo ({campaignPartySheets.length})</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setPreviewAsPlayer(false);
                  setCurrentRoute('/campaign/session');
                }}
              >
                Estúdio do Mestre
              </button>
            </div>
          ) : activeChar ? (
            <div className="card px-3 py-2 flex flex-wrap items-center gap-3">
              {mySheets.length > 1 ? (
                <select
                  value={activeChar.id}
                  onChange={(e) => setActiveCharacterId(e.target.value)}
                  className="input h-8 w-auto"
                  aria-label="Personagem ativo"
                >
                  {mySheets.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.name} ({cs.className} {cs.level})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-semibold text-fg">{activeChar.name}</span>
              )}
              <span className="flex items-center gap-3 text-[13px] tabular-nums text-fg-muted">
                <span className="inline-flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" />
                  <span className="text-fg font-medium">
                    {activeChar.hp}/{activeChar.maxHp}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  {activeChar.armorClass}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    void updateCharacterSheet(activeChar.id, {
                      hp: Math.max(0, activeChar.hp - 1),
                    })
                  }
                  className="btn btn-secondary btn-icon h-7 w-7"
                  aria-label="Perder 1 PV"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void updateCharacterSheet(activeChar.id, {
                      hp: Math.min(activeChar.maxHp, activeChar.hp + 1),
                    })
                  }
                  className="btn btn-secondary btn-icon h-7 w-7"
                  aria-label="Recuperar 1 PV"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </span>
              <button
                type="button"
                onClick={() => setSheetModal({ id: activeChar.id })}
                className="btn btn-primary btn-sm"
              >
                <FileText className="w-4 h-4" />
                Ficha
              </button>
            </div>
          ) : (
            <div className="card px-3 py-2 flex items-center gap-3 text-[13px]">
              <span className="text-fg-muted">Você não tem personagem nesta campanha.</span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setSheetModal({ id: null })}
              >
                Criar personagem
              </button>
            </div>
          )}
        </div>

        {isCampaignDm && !isDmControlMode && (
          <div className="card-muted px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <span className="text-fg-muted">
              Você está simulando a visão exata dos jogadores: a vida dos monstros, itens secretos e as rolagens do Mestre estão ocultos.
            </span>
            <button
              type="button"
              onClick={() => setPreviewAsPlayer(false)}
              className="btn btn-secondary btn-sm"
            >
              Voltar a gerenciar tela
            </button>
          </div>
        )}

        {/* Banner de Subida de Nível Pendente para o Jogador */}
        {!isCampaignDm && activeChar?.pendingLevelUp && (
          <div className="rounded-xl border border-warning/40 bg-warning-soft/30 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-warning shrink-0" />
                <span className="text-sm font-semibold text-fg">
                  {activeChar.name} subiu para o Nível {activeChar.pendingLevelUp.toLevel}!
                </span>
                <span className="badge badge-warning">
                  {activeChar.pendingLevelUp.pendingChoices.length > 0
                    ? `${activeChar.pendingLevelUp.pendingChoices.length} escolha(s) pendente(s)`
                    : 'Revisão pendente'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {activeChar.pendingLevelUp.pendingChoices.length > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSheetModal({
                        id: activeChar.id,
                        initialEditStep: firstPendingStepForSheet(activeChar),
                      })
                    }
                    className="btn btn-primary btn-sm"
                  >
                    <span>Selecionar escolhas do Nível {activeChar.pendingLevelUp.toLevel}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      void updateCharacterSheet(activeChar.id, { pendingLevelUp: null })
                    }
                    className="btn btn-primary btn-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar ganhos do Nível {activeChar.pendingLevelUp.toLevel}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-semibold text-fg flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span>O que você ganhou no Nível {activeChar.pendingLevelUp.toLevel}:</span>
                </div>
                <ul className="space-y-1 text-fg-muted">
                  {activeChar.pendingLevelUp.gains.map((g, idx) => (
                    <li key={idx}>
                      <strong className="text-fg">{g.title}:</strong> {g.description}
                    </li>
                  ))}
                </ul>
              </div>

              {activeChar.pendingLevelUp.pendingChoices.length > 0 && (
                <div className="space-y-1">
                  <div className="font-semibold text-fg flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-warning" />
                    <span>Escolhas que faltam selecionar:</span>
                  </div>
                  <ul className="list-disc list-inside text-fg space-y-0.5">
                    {activeChar.pendingLevelUp.pendingChoices.map((ch, idx) => (
                      <li key={idx}>{ch.text}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`tab ${activeTab === t.id ? 'tab-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'party' && isDmControlMode && <PartySheetsView />}
        {activeTab === 'quests' && <QuestLogView />}
        {activeTab === 'map' && (
          <div className="h-[70vh] min-h-[420px]">
            <InteractiveMapsView />
          </div>
        )}
        {activeTab === 'journals' && <JournalInventoryView />}

        {activeTab === 'combat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <section className="lg:col-span-7 card">
              <header className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="section-title">Ordem de iniciativa · Rodada {combatRound}</h2>
                  {isDmControlMode && (
                    <p className="text-xs text-fg-subtle">
                      Jogadores veem apenas os PVs dos PJs; a vida de criaturas e NPCs fica oculta.
                    </p>
                  )}
                </div>

                {isDmControlMode && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sortedCombatants.length > 0 && (
                      <button
                        type="button"
                        onClick={() => void clearCombatants()}
                        className="btn btn-danger-ghost btn-sm btn-icon"
                        title="Limpar encontro de combate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void rollAllInitiatives()}
                      className="btn btn-secondary btn-sm"
                      title="Rolar iniciativa para todos"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rolar inic.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCombatant((v) => !v)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Combatente</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void nextCombatTurn()}
                      className="btn btn-primary btn-sm"
                    >
                      <span>Próximo turno</span>
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </header>

              {isDmControlMode && showAddCombatant && (
                <form
                  onSubmit={handleAddCombatantSubmit}
                  className="p-4 bg-surface-2 border-b border-line space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="label">Nome</label>
                      <input
                        type="text"
                        required
                        value={combName}
                        onChange={(e) => setCombName(e.target.value)}
                        placeholder="Ex.: Dragão Jovem, Guarda…"
                        className="input h-8"
                      />
                    </div>
                    <div>
                      <label className="label">Tipo</label>
                      <select
                        value={combType}
                        onChange={(e) =>
                          setCombType(e.target.value as 'pc' | 'npc' | 'monster')
                        }
                        className="input h-8"
                      >
                        <option value="monster">Criatura / Monstro</option>
                        <option value="npc">NPC</option>
                        <option value="pc">PJ</option>
                      </select>
                    </div>
                    <div className="flex items-end pb-1.5">
                      <label className="inline-flex items-center gap-2 text-xs text-fg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={combHidden}
                          onChange={(e) => setCombHidden(e.target.checked)}
                        />
                        <span>Emboscada (oculto)</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5 items-end">
                    <div>
                      <label className="label">Iniciativa</label>
                      <input
                        type="number"
                        value={combInit}
                        onChange={(e) => setCombInit(Number(e.target.value))}
                        className="input h-8 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="label">PV máx.</label>
                      <input
                        type="number"
                        min={1}
                        value={combHp}
                        onChange={(e) => setCombHp(Number(e.target.value))}
                        className="input h-8 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="label">CA</label>
                      <input
                        type="number"
                        value={combAc}
                        onChange={(e) => setCombAc(Number(e.target.value))}
                        className="input h-8 tabular-nums"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowAddCombatant(false)}
                        className="btn btn-secondary btn-sm h-8"
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary btn-sm h-8">
                        Adicionar
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {sortedCombatants.length === 0 ? (
                <p className="p-4 text-[13px] text-fg-subtle">Nenhum combate em andamento.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {sortedCombatants.map((c, idx) => {
                    const isTurn = idx === activeCombatTurnIndex;
                    const isPc = c.type === 'pc';
                    const canSeeLife = isDmControlMode || isPc;
                    const hasExactHp =
                      canSeeLife && c.hp !== undefined && c.maxHp !== undefined;
                    const pct = hasExactHp
                      ? Math.max(
                          0,
                          Math.min(
                            100,
                            Math.round(((c.hp ?? 0) / Math.max(1, c.maxHp ?? 1)) * 100)
                          )
                        )
                      : 0;

                    return (
                      <li
                        key={c.id}
                        className={`px-4 py-3 space-y-2.5 border-l-2 ${
                          isTurn ? 'bg-accent-soft border-l-accent' : 'border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-8 h-8 rounded-md text-sm font-semibold flex items-center justify-center tabular-nums shrink-0 ${
                                isTurn
                                  ? 'bg-accent text-accent-fg'
                                  : 'bg-surface-2 text-fg-muted'
                              }`}
                            >
                              {c.initiative}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-fg flex items-center gap-1.5 flex-wrap">
                                <span className="truncate">{c.name}</span>
                                <span className="badge">{COMBATANT_TYPE_LABELS[c.type]}</span>
                                {isTurn && (
                                  <span className="badge badge-accent">Turno atual</span>
                                )}
                                {isDmControlMode && c.isHidden && (
                                  <span className="badge badge-warning">
                                    Oculto dos jogadores
                                  </span>
                                )}
                                {isDmControlMode && !isPc && (
                                  <span className="text-[11px] text-fg-subtle">
                                    (PV oculto p/ jogadores)
                                  </span>
                                )}
                              </div>
                              {c.conditions.length > 0 && !isDmControlMode && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {c.conditions.map((cond) => (
                                    <span key={cond} className="badge badge-warning">
                                      {cond}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Vida: exibida apenas para PJs ou para o Mestre */}
                          {hasExactHp ? (
                            <div className="text-right w-40 shrink-0">
                              <div className="text-[13px] text-fg-muted tabular-nums">
                                PV {c.hp}/{c.maxHp} · CA {c.armorClass ?? '—'}
                              </div>
                              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden mt-1.5">
                                <div
                                  className={`h-full ${
                                    pct > 50
                                      ? 'bg-success'
                                      : pct > 25
                                      ? 'bg-warning'
                                      : 'bg-danger'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {isDmControlMode && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex flex-wrap items-center gap-1">
                              {CONDITIONS_LIST.map((cond) => {
                                const active = c.conditions.includes(cond);
                                return (
                                  <button
                                    key={cond}
                                    type="button"
                                    onClick={() => void toggleCombatantCondition(c.id, cond)}
                                    className={`h-6 px-2 rounded text-xs border transition-colors ${
                                      active
                                        ? 'bg-warning-soft text-warning border-transparent font-medium'
                                        : 'text-fg-subtle border-line hover:text-fg hover:border-line-strong'
                                    }`}
                                  >
                                    {cond}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="flex items-center rounded-md border border-line overflow-hidden bg-surface">
                                {[-10, -5, -1, 1, 5, 10].map((delta) => (
                                  <button
                                    key={delta}
                                    type="button"
                                    onClick={() => void adjustCombatantHp(c.id, delta)}
                                    className="h-7 px-2 text-xs font-mono tabular-nums text-fg-muted hover:bg-surface-2 hover:text-fg border-r border-line last:border-r-0 transition-colors"
                                    title={delta > 0 ? `Curar ${delta} PV` : `Causar ${-delta} de dano`}
                                  >
                                    {delta > 0 ? `+${delta}` : delta}
                                  </button>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => void setCombatantHidden(c.id, !c.isHidden)}
                                className="btn btn-ghost btn-icon h-7 w-7"
                                title={
                                  c.isHidden
                                    ? 'Revelar combatente aos jogadores'
                                    : 'Ocultar combatente dos jogadores'
                                }
                              >
                                {c.isHidden ? (
                                  <EyeOff className="w-3.5 h-3.5 text-warning" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => void removeCombatant(c.id)}
                                className="btn btn-danger-ghost btn-icon h-7 w-7"
                                title="Remover combatente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="lg:col-span-5 card">
              <header className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
                <div>
                  <h2 className="section-title">Dados</h2>
                  {isCampaignDm && (
                    <p className="text-xs text-fg-subtle">
                      Suas rolagens como Mestre nunca aparecem para os jogadores.
                    </p>
                  )}
                </div>

                {isDmControlMode && visibleDiceLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void clearDiceLogs()}
                    className="btn btn-danger-ghost btn-sm"
                    title="Limpar todo o histórico de rolagens"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar tudo</span>
                  </button>
                )}
              </header>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-xs text-fg-subtle">
                    Qtd.
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={diceCount}
                      onChange={(e) => setDiceCount(Math.max(1, Number(e.target.value)))}
                      className="input h-8 mt-1 font-mono tabular-nums"
                    />
                  </label>
                  <label className="text-xs text-fg-subtle">
                    Mod.
                    <input
                      type="number"
                      value={diceMod}
                      onChange={(e) => setDiceMod(Number(e.target.value))}
                      className="input h-8 mt-1 font-mono tabular-nums"
                    />
                  </label>
                  <label className="text-xs text-fg-subtle">
                    Motivo (opcional)
                    <input
                      type="text"
                      value={diceCustomLabel}
                      onChange={(e) => setDiceCustomLabel(e.target.value)}
                      placeholder="Ex.: Percepção"
                      className="input h-8 mt-1"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {([4, 6, 8, 10, 12, 20, 100] as const).map((sides) => (
                    <button
                      key={sides}
                      type="button"
                      onClick={() =>
                        void rollDice(
                          sides,
                          diceCount,
                          diceMod,
                          diceCustomLabel.trim() ||
                            (isCampaignDm
                              ? `Rolagem do Mestre (d${sides})`
                              : `${activeChar?.name || 'Jogador'} rolou d${sides}`)
                        )
                      }
                      className={`btn btn-sm font-mono ${
                        sides === 20 ? 'btn-primary' : 'btn-secondary'
                      }`}
                    >
                      d{sides}
                    </button>
                  ))}
                </div>

                {visibleDiceLogs.length === 0 ? (
                  <p className="text-[13px] text-fg-subtle py-4 text-center">
                    Nenhuma rolagem registrada na mesa.
                  </p>
                ) : (
                  <ul className="divide-y divide-line max-h-80 overflow-y-auto">
                    {visibleDiceLogs.slice(0, 25).map((roll) => (
                      <li
                        key={roll.id}
                        className="py-2 flex items-center justify-between gap-3 text-[13px]"
                      >
                        <div className="min-w-0">
                          <div className="text-fg truncate flex items-center gap-1.5">
                            {roll.isDmRoll && (
                              <span className="badge badge-warning shrink-0">
                                Oculto (Mestre)
                              </span>
                            )}
                            <span className="truncate">
                              {roll.rollerName && (
                                <span className="font-medium">{roll.rollerName}: </span>
                              )}
                              {roll.label}
                            </span>
                          </div>
                          <div className="text-xs text-fg-subtle font-mono tabular-nums">
                            {formatTime(roll.timestamp)} · {roll.formula} · [
                            {roll.rolls.join(', ')}]
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-base font-semibold tabular-nums ${
                              roll.isCrit
                                ? 'text-success'
                                : roll.isFumble
                                ? 'text-danger'
                                : 'text-fg'
                            }`}
                          >
                            {roll.total}
                          </span>

                          {isDmControlMode && (
                            <button
                              type="button"
                              onClick={() => void deleteDiceLog(roll.id)}
                              className="btn btn-danger-ghost btn-icon h-7 w-7"
                              title="Excluir rolagem"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'wiki' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={wikiSearch}
                  onChange={(e) => setWikiSearch(e.target.value)}
                  placeholder="Buscar no códice…"
                  className="input pl-9"
                />
              </div>

              {isDmControlMode && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="segmented">
                    {(['all', 'public', 'hidden'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setWikiVisibilityFilter(f)}
                        className={`segmented-item ${
                          wikiVisibilityFilter === f ? 'segmented-item-active' : ''
                        }`}
                      >
                        {f === 'all'
                          ? `Todas (${entities.length})`
                          : f === 'public'
                          ? 'Visíveis'
                          : 'Ocultas'}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={openCreateWikiModal}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nova entrada</span>
                  </button>
                </div>
              )}
            </div>

            {visibleEntities.length === 0 ? (
              <div className="card py-12 px-6 text-center">
                <p className="text-sm text-fg-muted">
                  Nenhuma entrada disponível no códice para este filtro.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleEntities.map((ent) => {
                  const secretsToShow = isDmControlMode
                    ? ent.secrets
                    : ent.secrets.filter((b) => b.isRevealed);
                  const draft = secretDrafts[ent.id] || {
                    title: '',
                    content: '',
                    open: false,
                  };

                  return (
                    <article key={ent.id} className="card p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="badge">
                                {CATEGORY_LABELS[ent.category] ?? ent.category}
                              </span>
                              {isDmControlMode && !ent.isPublicToPlayers && (
                                <span className="badge badge-warning">
                                  Oculta dos jogadores
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-semibold text-fg mt-1.5">
                              {ent.name}
                            </h3>
                            <p className="text-[13px] text-fg-subtle">{ent.subtitle}</p>
                          </div>

                          {isDmControlMode && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  void updateEntity(ent.id, {
                                    isPublicToPlayers: !ent.isPublicToPlayers,
                                  })
                                }
                                className="btn btn-ghost btn-icon h-7 w-7"
                                title={
                                  ent.isPublicToPlayers
                                    ? 'Ocultar entrada dos jogadores'
                                    : 'Publicar entrada para os jogadores'
                                }
                              >
                                {ent.isPublicToPlayers ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4 text-warning" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditWikiModal(ent)}
                                className="btn btn-ghost btn-icon h-7 w-7"
                                title="Editar entrada"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteEntity(ent.id)}
                                className="btn btn-danger-ghost btn-icon h-7 w-7"
                                title="Excluir entrada"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="text-[13px] text-fg-muted leading-relaxed">
                          <MentionText text={ent.publicContent} />
                        </div>

                        {secretsToShow.length > 0 && (
                          <div className="space-y-2 pt-3 border-t border-line">
                            {secretsToShow.map((sec) => (
                              <div
                                key={sec.id}
                                className="text-[13px] space-y-1 rounded-md bg-surface-2 p-2.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-medium text-fg flex items-center gap-1.5">
                                    {sec.isRevealed ? (
                                      <Unlock className="w-3.5 h-3.5 text-success shrink-0" />
                                    ) : (
                                      <Lock className="w-3.5 h-3.5 text-warning shrink-0" />
                                    )}
                                    <span>{sec.title}</span>
                                  </div>

                                  {isDmControlMode && (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void revealEntitySecret(
                                            ent.id,
                                            sec.id,
                                            !sec.isRevealed
                                          )
                                        }
                                        className="btn btn-secondary btn-sm h-6 px-2 text-xs"
                                      >
                                        {sec.isRevealed ? 'Ocultar' : 'Revelar'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void deleteEntitySecret(ent.id, sec.id)
                                        }
                                        className="btn btn-danger-ghost btn-icon h-6 w-6"
                                        title="Excluir segredo"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="text-fg-muted leading-relaxed">
                                  <MentionText text={sec.content} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {isDmControlMode && (
                        <div className="pt-2 border-t border-line">
                          {draft.open ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={draft.title}
                                onChange={(e) =>
                                  setSecretDrafts((prev) => ({
                                    ...prev,
                                    [ent.id]: { ...draft, title: e.target.value },
                                  }))
                                }
                                placeholder="Título do segredo"
                                className="input h-8 text-xs"
                              />
                              <textarea
                                rows={2}
                                value={draft.content}
                                onChange={(e) =>
                                  setSecretDrafts((prev) => ({
                                    ...prev,
                                    [ent.id]: { ...draft, content: e.target.value },
                                  }))
                                }
                                placeholder="Conteúdo secreto…"
                                className="input text-xs"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSecretDrafts((prev) => ({
                                      ...prev,
                                      [ent.id]: { ...draft, open: false },
                                    }))
                                  }
                                  className="btn btn-secondary btn-sm h-7 text-xs"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddSecret(ent.id)}
                                  className="btn btn-primary btn-sm h-7 text-xs"
                                >
                                  Salvar segredo
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setSecretDrafts((prev) => ({
                                  ...prev,
                                  [ent.id]: { title: '', content: '', open: true },
                                }))
                              }
                              className="btn btn-ghost btn-sm h-7 text-xs w-full justify-center"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Adicionar segredo</span>
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de criação/edição rápida de entrada do Códice pelo Mestre */}
      {showAddWikiModal && isDmControlMode && (
        <div className="modal-backdrop">
          <form onSubmit={handleSaveWikiModal} className="modal max-w-md">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
              <h3 className="section-title">
                {editingWikiEntity ? 'Editar entrada do códice' : 'Nova entrada do códice'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddWikiModal(false);
                  setEditingWikiEntity(null);
                }}
                className="btn btn-ghost btn-sm btn-icon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="label">Nome</label>
                  <input
                    type="text"
                    required
                    value={wName}
                    onChange={(e) => setWName(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Categoria</label>
                  <select
                    value={wCategory}
                    onChange={(e) => setWCategory(e.target.value as EntityCategory)}
                    className="input"
                  >
                    <option value="npc">NPC</option>
                    <option value="location">Local</option>
                    <option value="faction">Facção</option>
                    <option value="item">Item</option>
                    <option value="monster">Criatura</option>
                    <option value="lore">Lore</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Subtítulo</label>
                <input
                  type="text"
                  value={wSubtitle}
                  onChange={(e) => setWSubtitle(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Conteúdo visível aos jogadores</label>
                <textarea
                  rows={4}
                  value={wContent}
                  onChange={(e) => setWContent(e.target.value)}
                  placeholder="Suporta menções @NPC e #Local"
                  className="input"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-[13px] text-fg cursor-pointer">
                <input
                  type="checkbox"
                  checked={wPublic}
                  onChange={(e) => setWPublic(e.target.checked)}
                />
                <span>Visível aos jogadores no códice</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-surface-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddWikiModal(false);
                  setEditingWikiEntity(null);
                }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {editingWikiEntity ? 'Salvar' : 'Criar entrada'}
              </button>
            </div>
          </form>
        </div>
      )}

      {sheetModal && !isCampaignDm && (
        <CharacterSheetModal
          sheetId={sheetModal.id}
          initialEditStep={sheetModal.initialEditStep}
          defaultCampaignId={activeCampaign?.id}
          isOpen
          onClose={() => setSheetModal(null)}
        />
      )}
    </div>
  );
};
