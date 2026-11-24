import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { QuestLogView } from './QuestLogView';
import { JournalInventoryView } from './JournalInventoryView';
import { InteractiveMapsView } from '../worldbuilding/InteractiveMapsView';
import { CharacterSheetModal } from '../characters/CharacterSheetModal';
import { MentionText } from '../common/MentionText';
import { Shield, ArrowLeft, Plus, Minus, Unlock, FileText, Heart } from 'lucide-react';

type Tab = 'quests' | 'map' | 'combat' | 'journals' | 'wiki';

export const DedicatedPlayerView: React.FC = () => {
  const currentUser = useCampaignStore((s) => s.currentUser);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const characterSheets = useCampaignStore((s) => s.characterSheets);
  const activeCharacterId = useCampaignStore((s) => s.activeCharacterId);
  const setActiveCharacterId = useCampaignStore((s) => s.setActiveCharacterId);
  const updateCharacterSheet = useCampaignStore((s) => s.updateCharacterSheet);
  const setCurrentRoute = useCampaignStore((s) => s.setCurrentRoute);
  const combatants = useCampaignStore((s) => s.combatants);
  const activeCombatTurnIndex = useCampaignStore((s) => s.activeCombatTurnIndex);
  const combatRound = useCampaignStore((s) => s.combatRound);
  const diceLogs = useCampaignStore((s) => s.diceLogs);
  const rollDice = useCampaignStore((s) => s.rollDice);
  const entities = useCampaignStore((s) => s.entities);

  const [activeTab, setActiveTab] = useState<Tab>('quests');
  const [sheetModal, setSheetModal] = useState<{ id: string | null } | null>(null);

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId) || campaigns[0];
  // Apenas fichas do próprio jogador vinculadas a esta campanha.
  const mySheets = characterSheets.filter(
    (c) => c.playerId === currentUser?.id && (!activeCampaign || c.campaignId === activeCampaign.id)
  );
  const activeChar = mySheets.find((c) => c.id === activeCharacterId) || mySheets[0];
  const sortedCombatants = [...combatants].sort((a, b) => b.initiative - a.initiative);

  const tabs: { id: Tab; label: string }[] = [
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
              onClick={() => setCurrentRoute('/campaigns')}
              className="btn btn-secondary btn-icon"
              aria-label="Voltar ao painel"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-xs text-fg-subtle">Visão do jogador</p>
              <h1 className="page-title">{activeCampaign?.title || 'Mesa'}</h1>
            </div>
          </div>

          {activeCampaign?.isDm ? (
            <div className="card px-3 py-2 flex items-center gap-3 text-[13px]">
              <span className="text-fg-muted">Pré-visualização do Mestre (apenas jogadores criam fichas).</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentRoute('/campaign/session')}>
                Voltar ao gerenciamento
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
                  <span className="text-fg font-medium">{activeChar.hp}/{activeChar.maxHp}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  {activeChar.armorClass}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void updateCharacterSheet(activeChar.id, { hp: Math.max(0, activeChar.hp - 1) })}
                  className="btn btn-secondary btn-icon h-7 w-7"
                  aria-label="Perder 1 PV"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void updateCharacterSheet(activeChar.id, { hp: Math.min(activeChar.maxHp, activeChar.hp + 1) })}
                  className="btn btn-secondary btn-icon h-7 w-7"
                  aria-label="Recuperar 1 PV"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </span>
              <button type="button" onClick={() => setSheetModal({ id: activeChar.id })} className="btn btn-primary btn-sm">
                <FileText className="w-4 h-4" />
                Ficha
              </button>
            </div>
          ) : (
            <div className="card px-3 py-2 flex items-center gap-3 text-[13px]">
              <span className="text-fg-muted">Você não tem personagem nesta campanha.</span>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setSheetModal({ id: null })}>
                Criar personagem
              </button>
            </div>
          )}
        </div>

        <div className="tabs">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} className={`tab ${activeTab === t.id ? 'tab-active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

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
              <header className="px-4 py-3 border-b border-line">
                <h2 className="section-title">Ordem de iniciativa</h2>
              </header>
              {sortedCombatants.length === 0 ? (
                <p className="p-4 text-[13px] text-fg-subtle">Nenhum combate em andamento.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {sortedCombatants.map((c, idx) => {
                    const isTurn = idx === activeCombatTurnIndex;
                    const isPc = c.type === 'pc';
                    // NPCs/monstros chegam sem PV exatos: usa o estado aproximado do servidor.
                    const hasExactHp = c.hp !== undefined && c.maxHp !== undefined;
                    const pct = hasExactHp
                      ? Math.max(0, Math.min(100, Math.round(((c.hp ?? 0) / Math.max(1, c.maxHp ?? 0)) * 100)))
                      : c.healthState === 'healthy'
                      ? 100
                      : c.healthState === 'wounded'
                      ? 75
                      : c.healthState === 'bloodied'
                      ? 40
                      : c.healthState === 'down'
                      ? 0
                      : 100;
                    return (
                      <li
                        key={c.id}
                        className={`px-4 py-3 flex items-center justify-between gap-4 border-l-2 ${
                          isTurn ? 'bg-accent-soft border-l-accent' : 'border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-8 h-8 rounded-md text-sm font-semibold flex items-center justify-center tabular-nums shrink-0 ${
                              isTurn ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg-muted'
                            }`}
                          >
                            {c.initiative}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-fg truncate">
                              {c.name}
                              {isTurn && <span className="badge badge-accent ml-2">Turno atual</span>}
                            </div>
                            {c.conditions.length > 0 && (
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
                        <div className="text-right w-36 shrink-0">
                          <div className="text-[13px] text-fg-muted tabular-nums">
                            {isPc && hasExactHp
                              ? `PV ${c.hp}/${c.maxHp} · CA ${c.armorClass ?? '—'}`
                              : !hasExactHp && c.healthState
                              ? c.healthState === 'healthy'
                                ? 'Íntegro'
                                : c.healthState === 'wounded'
                                ? 'Ferido'
                                : c.healthState === 'bloodied'
                                ? 'Gravemente ferido'
                                : 'Derrotado'
                              : pct > 60
                              ? 'Íntegro'
                              : pct > 25
                              ? 'Ferido'
                              : pct > 0
                              ? 'Gravemente ferido'
                              : 'Derrotado'}
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden mt-1.5">
                            <div
                              className={`h-full ${pct > 50 ? 'bg-success' : pct > 25 ? 'bg-warning' : 'bg-danger'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="lg:col-span-5 card">
              <header className="px-4 py-3 border-b border-line">
                <h2 className="section-title">Dados</h2>
              </header>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {([4, 6, 8, 10, 12, 20, 100] as const).map((sides) => (
                    <button
                      key={sides}
                      type="button"
                      onClick={() => rollDice(sides, 1, 0, `${activeChar?.name || 'Jogador'} rolou d${sides}`)}
                      className={`btn btn-sm font-mono ${sides === 20 ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      d{sides}
                    </button>
                  ))}
                </div>
                <ul className="divide-y divide-line max-h-72 overflow-y-auto">
                  {diceLogs.slice(0, 12).map((roll) => (
                    <li key={roll.id} className="py-2 flex items-center justify-between gap-3 text-[13px]">
                      <div className="min-w-0">
                        <div className="text-fg truncate">
                          {roll.rollerName && <span className="font-medium">{roll.rollerName}: </span>}
                          {roll.label}
                        </div>
                        <div className="text-xs text-fg-subtle font-mono tabular-nums">
                          {roll.timestamp} · {roll.formula} · [{roll.rolls.join(', ')}]
                        </div>
                      </div>
                      <span
                        className={`text-base font-semibold tabular-nums ${
                          roll.isCrit ? 'text-success' : roll.isFumble ? 'text-danger' : 'text-fg'
                        }`}
                      >
                        {roll.total}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'wiki' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entities
              .filter((e) => e.isPublicToPlayers)
              .map((ent) => {
                const visibleSecrets = ent.secrets.filter((b) => b.isRevealed);
                return (
                  <article key={ent.id} className="card p-4 space-y-3">
                    <div>
                      <span className="badge">{ent.category}</span>
                      <h3 className="text-base font-semibold text-fg mt-1.5">{ent.name}</h3>
                      <p className="text-[13px] text-fg-subtle">{ent.subtitle}</p>
                    </div>
                    <div className="text-[13px] text-fg-muted leading-relaxed">
                      <MentionText text={ent.publicContent} />
                    </div>
                    {visibleSecrets.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-line">
                        {visibleSecrets.map((sec) => (
                          <div key={sec.id} className="text-[13px] space-y-1">
                            <div className="font-medium text-fg flex items-center gap-1.5">
                              <Unlock className="w-3.5 h-3.5 text-fg-subtle" />
                              {sec.title}
                            </div>
                            <div className="text-fg-muted leading-relaxed">
                              <MentionText text={sec.content} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
        )}
      </div>

      {sheetModal && (
        <CharacterSheetModal
          sheetId={sheetModal.id}
          defaultCampaignId={activeCampaign?.id}
          isOpen
          onClose={() => setSheetModal(null)}
        />
      )}
    </div>
  );
};
