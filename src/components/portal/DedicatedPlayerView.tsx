import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { QuestLogView } from './QuestLogView';
import { JournalInventoryView } from './JournalInventoryView';
import { InteractiveMapsView } from '../worldbuilding/InteractiveMapsView';
import { CharacterSheetModal } from '../characters/CharacterSheetModal';
import { MentionText } from '../common/MentionText';
import {
  Shield,
  ScrollText,
  Map,
  Swords,
  BookMarked,
  BookOpen,
  Dices,
  ArrowLeft,
  Plus,
  Minus,
  Unlock,
  FileText,
} from 'lucide-react';

export const DedicatedPlayerView: React.FC = () => {
  const currentUser = useCampaignStore((s) => s.currentUser);
  const workspaceMode = useCampaignStore((s) => s.workspaceMode);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const characterSheets = useCampaignStore((s) => s.characterSheets);
  const activeCharacterId = useCampaignStore((s) => s.activeCharacterId);
  const setActiveCharacterId = useCampaignStore((s) => s.setActiveCharacterId);
  const updateCharacterSheet = useCampaignStore((s) => s.updateCharacterSheet);
  const setCurrentRoute = useCampaignStore((s) => s.setCurrentRoute);

  const combatants = useCampaignStore((s) => s.combatants);
  const activeCombatTurnIndex = useCampaignStore(
    (s) => s.activeCombatTurnIndex
  );
  const combatRound = useCampaignStore((s) => s.combatRound);
  const diceLogs = useCampaignStore((s) => s.diceLogs);
  const rollDice = useCampaignStore((s) => s.rollDice);
  const entities = useCampaignStore((s) => s.entities);

  const [activeTab, setActiveTab] = useState<
    'quests' | 'map' | 'combat' | 'journals' | 'wiki'
  >('quests');
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

  const activeCampaign =
    campaigns.find((c) => c.id === activeCampaignId) || campaigns[0];
  const myCampaignSheets = characterSheets.filter(
    (c) =>
      (!c.playerId || c.playerId === currentUser?.id) &&
      (!activeCampaign || !c.campaignId || c.campaignId === activeCampaign.id)
  );
  const selectableSheets =
    myCampaignSheets.length > 0 ? myCampaignSheets : characterSheets;
  const activeChar =
    selectableSheets.find((c) => c.id === activeCharacterId) ||
    selectableSheets[0];

  const sortedCombatants = [...combatants].sort(
    (a, b) => b.initiative - a.initiative
  );

  const tabs = [
    { id: 'quests' as const, label: 'Missões', icon: ScrollText },
    { id: 'map' as const, label: 'Cartografia', icon: Map },
    {
      id: 'combat' as const,
      label: `Combate (Rodada ${combatRound})`,
      icon: Swords,
    },
    {
      id: 'journals' as const,
      label: 'Crônicas & espólio',
      icon: BookMarked,
    },
    { id: 'wiki' as const, label: 'Códice conhecido', icon: BookOpen },
  ];

  return (
    <div className="h-[calc(100vh-3rem)] overflow-y-auto bg-[#0b0b0d] text-zinc-100 p-4 md:p-6 space-y-5">
      {/* Player Header & Active Character HUD */}
      <div className="p-4 rounded-xl surface-panel flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              setCurrentRoute(
                activeCampaign?.isDm !== false && workspaceMode === 'dm'
                  ? '/dm-dashboard'
                  : '/player-dashboard'
              )
            }
            className="btn-subtle p-2 rounded-lg"
            title="Voltar ao painel"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{activeCampaign?.title}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Visão do jogador
              </span>
            </div>
            <h1 className="text-xl font-serif font-medium text-zinc-100 mt-0.5">
              Mesa sincronizada
            </h1>
          </div>
        </div>

        {/* Active 5e Character Quick HUD */}
        {activeChar && (
          <div className="flex flex-wrap items-center gap-3 bg-[#0e0e11] px-3 py-2 rounded-xl border border-white/[0.06]">
            {activeChar.avatarUrl ? (
              <img
                src={activeChar.avatarUrl}
                alt={activeChar.name}
                className="w-9 h-9 rounded-lg object-cover border border-white/[0.10]"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center font-mono text-xs font-semibold text-zinc-300">
                {activeChar.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <select
                value={activeChar.id}
                onChange={(e) => setActiveCharacterId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-zinc-100 focus:outline-none cursor-pointer"
              >
                {selectableSheets.map((cs) => (
                  <option
                    key={cs.id}
                    value={cs.id}
                    className="bg-[#121215] text-zinc-100"
                  >
                    {cs.name} ({cs.className} nv. {cs.level})
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 mt-0.5 tabular-nums">
                <span className="text-zinc-200">
                  PV {activeChar.hp}/{activeChar.maxHp}
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-zinc-500" />
                  CA {activeChar.armorClass}
                </span>
                <span>Perc. {activeChar.passivePerception}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  updateCharacterSheet(activeChar.id, {
                    hp: Math.max(0, activeChar.hp - 1),
                  })
                }
                className="btn-subtle p-1.5 rounded-md"
                title="-1 PV"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() =>
                  updateCharacterSheet(activeChar.id, {
                    hp: Math.min(activeChar.maxHp, activeChar.hp + 1),
                  })
                }
                className="btn-subtle p-1.5 rounded-md"
                title="+1 PV"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <button
              onClick={() => setIsSheetModalOpen(true)}
              className="btn-solid px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ficha 5e</span>
            </button>
          </div>
        )}
      </div>

      {/* Underline Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium inline-flex items-center gap-2 border-b-2 -mb-px transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-zinc-100 text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      {activeTab === 'quests' && <QuestLogView />}

      {activeTab === 'map' && <InteractiveMapsView />}

      {activeTab === 'journals' && <JournalInventoryView />}

      {activeTab === 'combat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Live Turn Order */}
          <div className="lg:col-span-7 p-5 rounded-xl surface-panel space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Ordem de iniciativa · Rodada {combatRound}
                </h2>
              </div>
              <span className="text-xs text-zinc-500">Tempo real</span>
            </div>

            <div className="space-y-2">
              {sortedCombatants.map((c, idx) => {
                const isTurn = idx === activeCombatTurnIndex;
                const isPlayerOrAlly = c.type === 'pc';
                const hpPercent = Math.max(
                  0,
                  Math.min(100, Math.round((c.hp / c.maxHp) * 100))
                );
                return (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-xl border transition-colors flex items-center justify-between gap-4 ${
                      isTurn
                        ? 'bg-white/[0.05] border-white/[0.16] border-l-2 border-l-zinc-100'
                        : 'bg-[#0e0e11] border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg font-mono font-semibold text-xs flex items-center justify-center tabular-nums ${
                          isTurn
                            ? 'bg-zinc-100 text-zinc-950'
                            : 'bg-white/[0.05] text-zinc-300'
                        }`}
                      >
                        {c.initiative}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-100">
                            {c.name}
                          </span>
                          {isTurn && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-200">
                              Turno atual
                            </span>
                          )}
                        </div>
                        {c.conditions.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {c.conditions.map((cond) => (
                              <span
                                key={cond}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25"
                              >
                                {cond}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right min-w-[132px]">
                      {isPlayerOrAlly ? (
                        <div className="text-xs font-mono text-zinc-200 tabular-nums">
                          PV {c.hp}/{c.maxHp} · CA {c.armorClass}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-400">
                          {hpPercent > 60
                            ? 'Íntegro'
                            : hpPercent > 25
                            ? 'Ferido'
                            : hpPercent > 0
                            ? 'Gravemente ferido'
                            : 'Derrotado'}
                        </div>
                      )}
                      <div className="w-full h-1 rounded-full bg-white/[0.07] overflow-hidden mt-1.5">
                        <div
                          className={`h-full transition-all ${
                            isPlayerOrAlly ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                          style={{ width: `${hpPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Player Dice Tray */}
          <div className="lg:col-span-5 p-5 rounded-xl surface-panel space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <Dices className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-100">
                Bandeja de dados
              </h2>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {([4, 6, 8, 10, 12, 20, 100] as const).map((sides) => (
                <button
                  key={sides}
                  onClick={() =>
                    rollDice(
                      sides,
                      1,
                      0,
                      `${activeChar?.name || 'Jogador'} rolou d${sides}`
                    )
                  }
                  className={`py-2 px-2 rounded-lg text-xs font-mono font-medium transition-colors ${
                    sides === 20 ? 'btn-solid' : 'btn-subtle'
                  }`}
                >
                  d{sides}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {diceLogs.slice(0, 12).map((roll) => (
                <div
                  key={roll.id}
                  className={`p-2.5 rounded-xl bg-[#0e0e11] border flex items-center justify-between text-xs ${
                    roll.isCrit
                      ? 'border-emerald-500/35'
                      : roll.isFumble
                      ? 'border-rose-500/35'
                      : 'border-white/[0.06]'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-medium text-zinc-200 flex items-center gap-1.5 truncate">
                      {roll.rollerName && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-300">
                          {roll.rollerName}
                        </span>
                      )}
                      <span className="truncate">{roll.label}</span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 mt-0.5 tabular-nums">
                      {roll.timestamp} · {roll.formula} · [{roll.rolls.join(', ')}]
                    </div>
                  </div>
                  <div
                    className={`text-sm font-mono font-semibold px-2.5 py-1 rounded-lg border tabular-nums ${
                      roll.isCrit
                        ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                        : roll.isFumble
                        ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                        : 'text-zinc-100 bg-white/[0.04] border-white/[0.08]'
                    }`}
                  >
                    {roll.total}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wiki' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities
            .filter((e) => e.isPublicToPlayers)
            .map((ent) => {
              const visibleSecrets = ent.secrets.filter((b) => b.isRevealed);
              return (
                <div
                  key={ent.id}
                  className="p-5 rounded-xl surface-panel space-y-3"
                >
                  <div>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                      {ent.category}
                    </span>
                    <h3 className="text-lg font-serif font-medium text-zinc-100 mt-1.5">
                      {ent.name}
                    </h3>
                    <p className="text-xs text-zinc-500">{ent.subtitle}</p>
                  </div>

                  <div className="text-xs text-zinc-300 leading-relaxed">
                    <MentionText text={ent.publicContent} />
                  </div>

                  {visibleSecrets.length > 0 && (
                    <div className="space-y-1.5 pt-2.5 border-t border-white/[0.06]">
                      {visibleSecrets.map((sec) => (
                        <div
                          key={sec.id}
                          className="p-2.5 rounded-lg bg-amber-500/[0.05] border border-amber-500/25 text-xs space-y-1"
                        >
                          <div className="text-[11px] font-medium text-amber-300 flex items-center gap-1.5">
                            <Unlock className="w-3 h-3 shrink-0" />
                            <span>Descoberta: {sec.title}</span>
                          </div>
                          <div className="text-zinc-300 leading-relaxed">
                            <MentionText text={sec.content} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      <CharacterSheetModal
        sheetId={activeChar?.id}
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        isDmContext={false}
      />
    </div>
  );
};
