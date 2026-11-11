import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { MentionText, MentionTextarea } from '../common/MentionText';
import {
  soundEngine,
  AmbienceTrackId,
  OneShotSfxId,
} from '../../utils/audioEngine';
import {
  generateEmergencyNPC,
  generateEmergencyTavern,
  generateEmergencyRumor,
  generateEmergencyLoot,
} from '../../data/emergencyGenerators';
import {
  Swords,
  Dices,
  Pin,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  SkipForward,
  Shield,
  NotebookPen,
  UserPlus,
  MapPin,
  Lock,
  Unlock,
  Flame,
  CloudRain,
  Wind,
  Music,
  Beer,
  RotateCcw,
  CloudLightning,
  Bell,
  Wand2,
  Skull,
} from 'lucide-react';

const CONDITIONS_LIST = [
  'Envenenado',
  'Caído',
  'Concentrando',
  'Amedrontado',
  'Sangrando',
  'Atordoado',
  'Invisível',
];

const AMBIENCE_TRACKS: {
  id: AmbienceTrackId;
  label: string;
  icon: React.FC<{ className?: string }>;
  defaultVol: number;
}[] = [
  {
    id: 'combat_pulse',
    label: 'Combate',
    icon: Swords,
    defaultVol: 0.55,
  },
  {
    id: 'heavy_rain',
    label: 'Tempestade',
    icon: CloudRain,
    defaultVol: 0.5,
  },
  {
    id: 'campfire',
    label: 'Lareira',
    icon: Flame,
    defaultVol: 0.6,
  },
  {
    id: 'dungeon_wind',
    label: 'Catacumbas',
    icon: Wind,
    defaultVol: 0.45,
  },
  {
    id: 'tavern_murmur',
    label: 'Taverna',
    icon: Beer,
    defaultVol: 0.4,
  },
  {
    id: 'ritual_drone',
    label: 'Ritual',
    icon: Music,
    defaultVol: 0.45,
  },
];

const SFX_BUTTONS: {
  id: OneShotSfxId;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'thunder', label: 'Trovão', icon: CloudLightning },
  { id: 'sword_clash', label: 'Lâminas', icon: Swords },
  { id: 'funeral_bell', label: 'Sino', icon: Bell },
  { id: 'arcane_blast', label: 'Arcano', icon: Wand2 },
  { id: 'monster_roar', label: 'Rugido', icon: Skull },
];

export const SessionCockpitModule: React.FC = () => {
  const entities = useCampaignStore((s) => s.entities);
  const fronts = useCampaignStore((s) => s.fronts);
  const scratchpad = useCampaignStore((s) => s.scratchpad);
  const combatants = useCampaignStore((s) => s.combatants);
  const activeCombatTurnIndex = useCampaignStore((s) => s.activeCombatTurnIndex);
  const combatRound = useCampaignStore((s) => s.combatRound);
  const diceLogs = useCampaignStore((s) => s.diceLogs);

  const addScratchpadLine = useCampaignStore((s) => s.addScratchpadLine);
  const deleteScratchpadLine = useCampaignStore((s) => s.deleteScratchpadLine);
  const convertScratchpadLineToEntity = useCampaignStore(
    (s) => s.convertScratchpadLineToEntity
  );
  const adjustCombatantHp = useCampaignStore((s) => s.adjustCombatantHp);
  const toggleCombatantCondition = useCampaignStore(
    (s) => s.toggleCombatantCondition
  );
  const nextCombatTurn = useCampaignStore((s) => s.nextCombatTurn);
  const rollAllInitiatives = useCampaignStore((s) => s.rollAllInitiatives);
  const addCombatant = useCampaignStore((s) => s.addCombatant);
  const removeCombatant = useCampaignStore((s) => s.removeCombatant);
  const rollDice = useCampaignStore((s) => s.rollDice);
  const togglePinEntity = useCampaignStore((s) => s.togglePinEntity);
  const revealEntitySecret = useCampaignStore((s) => s.revealEntitySecret);
  const saveGeneratedItemToDatabase = useCampaignStore(
    (s) => s.saveGeneratedItemToDatabase
  );

  const [noteInput, setNoteInput] = useState('');

  const [diceCount, setDiceCount] = useState(1);
  const [diceMod, setDiceMod] = useState(0);
  const [diceLabel] = useState('');

  const [showAddCombatant, setShowAddCombatant] = useState(false);
  const [combName, setCombName] = useState('');
  const [combInit, setCombInit] = useState(12);
  const [combHp, setCombHp] = useState(35);
  const [combAc, setCombAc] = useState(15);
  const [combType, setCombType] = useState<'pc' | 'npc' | 'monster'>('monster');

  const [pinSelectId, setPinSelectId] = useState('');

  const [activeTracks, setActiveTracks] = useState<Record<string, boolean>>({});
  const [trackVolumes, setTrackVolumes] = useState<Record<string, number>>({
    combat_pulse: 0.55,
    heavy_rain: 0.5,
    campfire: 0.6,
    dungeon_wind: 0.45,
    tavern_murmur: 0.4,
    ritual_drone: 0.45,
  });
  const [isMasterMuted, setIsMasterMuted] = useState(false);

  const pinnedEntities = entities.filter((e) => e.pinnedInSession);
  const unpinnedEntities = entities.filter((e) => !e.pinnedInSession);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    addScratchpadLine(noteInput.trim());
    setNoteInput('');
  };

  const handleAddCombatant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!combName.trim()) return;
    addCombatant({
      name: combName.trim(),
      type: combType,
      initiative: Number(combInit),
      hp: Number(combHp),
      maxHp: Number(combHp),
      armorClass: Number(combAc),
      conditions: [],
      notes: 'Adicionado em sessão',
    });
    setCombName('');
    setShowAddCombatant(false);
  };

  const handleToggleTrack = (id: AmbienceTrackId) => {
    const vol = trackVolumes[id] ?? 0.5;
    const nowPlaying = soundEngine.toggleTrack(id, vol);
    setActiveTracks((prev) => ({ ...prev, [id]: nowPlaying }));
  };

  const handleVolumeChange = (id: AmbienceTrackId, val: number) => {
    setTrackVolumes((prev) => ({ ...prev, [id]: val }));
    soundEngine.setTrackVolume(id, val);
  };

  const handleQuickEmergencyGen = (type: 'npc' | 'tavern' | 'rumor' | 'loot') => {
    const ctx = { entities, fronts };
    const item =
      type === 'npc'
        ? generateEmergencyNPC(ctx)
        : type === 'tavern'
        ? generateEmergencyTavern(ctx)
        : type === 'rumor'
        ? generateEmergencyRumor(ctx)
        : generateEmergencyLoot(ctx);
    saveGeneratedItemToDatabase(item, true);
    addScratchpadLine(
      `[Improviso] ${item.type === 'npc' ? '@' : '#'}${item.rawHandle} (${item.title}): ${item.details[0]?.value}`
    );
  };

  return (
    <div className="flex flex-col justify-between h-[calc(100vh-4.75rem)] gap-3">
      {/* 3-Column Tabletop Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* LEFT COLUMN: Initiative & Dice Tray */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
          {/* Combat Tracker */}
          <div className="flex-1 flex flex-col surface-panel rounded-xl overflow-hidden min-h-0">
            <div className="px-3.5 py-2.5 border-b border-white/[0.06] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Swords className="w-3.5 h-3.5 text-zinc-400" />
                <div className="flex items-baseline gap-2">
                  <h2 className="text-xs font-semibold text-zinc-100">
                    Iniciativa
                  </h2>
                  <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                    Rodada {combatRound}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={rollAllInitiatives}
                  className="btn-subtle p-1.5 rounded-md"
                  title="Rolar iniciativa (d20) para todos"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowAddCombatant(!showAddCombatant)}
                  className="btn-subtle p-1.5 rounded-md"
                  title="Adicionar combatente"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={nextCombatTurn}
                  className="btn-solid px-2.5 py-1 rounded-md text-xs inline-flex items-center gap-1"
                >
                  <span>Turno</span>
                  <SkipForward className="w-3 h-3" />
                </button>
              </div>
            </div>

            {showAddCombatant && (
              <form
                onSubmit={handleAddCombatant}
                className="p-2.5 bg-[#0e0e11] border-b border-white/[0.06] space-y-2 text-xs"
              >
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    required
                    value={combName}
                    onChange={(e) => setCombName(e.target.value)}
                    placeholder="Nome..."
                    className="input-clean col-span-2 px-2 py-1 rounded"
                  />
                  <select
                    value={combType}
                    onChange={(e) =>
                      setCombType(e.target.value as 'pc' | 'npc' | 'monster')
                    }
                    className="input-clean px-2 py-1 rounded"
                  >
                    <option value="monster">Monstro</option>
                    <option value="pc">PJ</option>
                    <option value="npc">NPC</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 gap-1.5 items-center">
                  <input
                    type="number"
                    value={combInit}
                    onChange={(e) => setCombInit(Number(e.target.value))}
                    placeholder="Inic"
                    title="Iniciativa"
                    className="input-clean px-2 py-1 rounded font-mono"
                  />
                  <input
                    type="number"
                    value={combHp}
                    onChange={(e) => setCombHp(Number(e.target.value))}
                    placeholder="PV"
                    title="Pontos de vida"
                    className="input-clean px-2 py-1 rounded font-mono"
                  />
                  <input
                    type="number"
                    value={combAc}
                    onChange={(e) => setCombAc(Number(e.target.value))}
                    placeholder="CA"
                    title="Classe de armadura"
                    className="input-clean px-2 py-1 rounded font-mono"
                  />
                  <button
                    type="submit"
                    className="btn-solid py-1 rounded text-xs"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            )}

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {combatants.length === 0 ? (
                <div className="py-10 px-4 text-center space-y-1.5 text-zinc-500">
                  <Swords className="w-5 h-5 mx-auto text-zinc-600" />
                  <p className="text-xs">Sem combatentes ativos.</p>
                </div>
              ) : (
                combatants.map((c, idx) => {
                  const isTurn = idx === activeCombatTurnIndex;
                  const hpPct = Math.round((c.hp / Math.max(1, c.maxHp)) * 100);
                  const isDead = c.hp <= 0;

                  return (
                    <div
                      key={c.id}
                      className={`p-2.5 rounded-xl border transition-colors space-y-2 ${
                        isTurn
                          ? 'bg-white/[0.05] border-white/[0.16] border-l-2 border-l-zinc-100'
                          : isDead
                          ? 'bg-[#0e0e11]/50 border-white/[0.04] opacity-50'
                          : 'bg-[#0e0e11] border-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-md font-mono text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums ${
                              isTurn
                                ? 'bg-zinc-100 text-zinc-950'
                                : 'bg-white/[0.05] text-zinc-300'
                            }`}
                          >
                            {c.initiative}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-zinc-100 truncate flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {isTurn && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-white/[0.08] text-zinc-200 rounded">
                                  Turno
                                </span>
                              )}
                            </div>
                            {c.notes && (
                              <div className="text-[10px] text-zinc-500 truncate">
                                {c.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-zinc-300 tabular-nums">
                            <Shield className="w-2.5 h-2.5 text-zinc-500" />
                            {c.armorClass}
                          </span>
                          <button
                            onClick={() => removeCombatant(c.id)}
                            className="text-zinc-600 hover:text-rose-400 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* HP Bar & Controls */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                            <span className="text-zinc-300">
                              {c.hp} / {c.maxHp} PV
                            </span>
                            <span className="text-zinc-500">{hpPct}%</span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-white/[0.07] overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                hpPct > 50
                                  ? 'bg-emerald-400'
                                  : hpPct > 25
                                  ? 'bg-amber-400'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${hpPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 font-mono text-[10px] tabular-nums">
                          {[-5, -1, 1, 5].map((delta) => (
                            <button
                              key={delta}
                              onClick={() => adjustCombatantHp(c.id, delta)}
                              className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.06] text-zinc-300"
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Conditions */}
                      <div className="flex flex-wrap items-center gap-1">
                        {CONDITIONS_LIST.map((cond) => {
                          const active = c.conditions.includes(cond);
                          return (
                            <button
                              key={cond}
                              onClick={() => toggleCombatantCondition(c.id, cond)}
                              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors border ${
                                active
                                  ? 'bg-amber-500/15 text-amber-200 border-amber-500/35 font-medium'
                                  : 'bg-transparent text-zinc-500 border-white/[0.05] hover:text-zinc-300'
                              }`}
                            >
                              {cond}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Dice Tray */}
          <div className="surface-panel rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Dices className="w-3.5 h-3.5 text-zinc-400" />
                <span>Dados</span>
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="text-zinc-500">Qtd</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={diceCount}
                  onChange={(e) => setDiceCount(Math.max(1, Number(e.target.value)))}
                  className="input-clean w-10 px-1.5 py-0.5 rounded text-center tabular-nums"
                />
                <span className="text-zinc-500">Mod</span>
                <input
                  type="number"
                  value={diceMod}
                  onChange={(e) => setDiceMod(Number(e.target.value))}
                  className="input-clean w-11 px-1.5 py-0.5 rounded text-center tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
                <button
                  key={sides}
                  onClick={() =>
                    rollDice(
                      sides,
                      diceCount,
                      diceMod,
                      diceLabel.trim() || `d${sides}`
                    )
                  }
                  className={`py-1.5 rounded-lg font-mono text-xs font-medium transition-colors ${
                    sides === 20 ? 'btn-solid' : 'btn-subtle'
                  }`}
                >
                  d{sides}
                </button>
              ))}
            </div>

            {diceLogs.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                {diceLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between font-mono tabular-nums ${
                      log.isCrit
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : log.isFumble
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                        : 'bg-[#0e0e11] border-white/[0.05] text-zinc-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="text-zinc-500 text-[10px] mr-1.5">
                        {log.timestamp}
                      </span>
                      <span className="text-zinc-200">{log.formula}</span>
                      <span className="text-zinc-500 text-[10px] ml-1.5">
                        [{log.rolls.join(', ')}]
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-100 shrink-0">
                      {log.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Session Scratchpad */}
        <div className="lg:col-span-4 flex flex-col surface-panel rounded-xl overflow-hidden min-h-0">
          <div className="px-3.5 py-2.5 border-b border-white/[0.06] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <NotebookPen className="w-3.5 h-3.5 text-zinc-400" />
              <h2 className="text-xs font-semibold text-zinc-100">
                Notas da sessão
              </h2>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleQuickEmergencyGen('npc')}
                className="btn-subtle px-2 py-0.5 rounded text-[11px] font-mono"
                title="Gerar NPC rápido e fixar"
              >
                +NPC
              </button>
              <button
                onClick={() => handleQuickEmergencyGen('tavern')}
                className="btn-subtle px-2 py-0.5 rounded text-[11px] font-mono"
                title="Gerar local rápido e fixar"
              >
                +Local
              </button>
              <button
                onClick={() => handleQuickEmergencyGen('loot')}
                className="btn-subtle px-2 py-0.5 rounded text-[11px] font-mono"
                title="Gerar relíquia rápida"
              >
                +Item
              </button>
            </div>
          </div>

          <form
            onSubmit={handleAddNote}
            className="p-3 border-b border-white/[0.06] bg-[#0e0e11]/60 space-y-2"
          >
            <MentionTextarea
              value={noteInput}
              onChange={setNoteInput}
              rows={2}
              placeholder="Registre eventos da mesa... Use @ para personagens e # para locais."
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="btn-solid px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar nota</span>
              </button>
            </div>
          </form>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {scratchpad.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-1.5 text-zinc-500">
                <NotebookPen className="w-5 h-5 mx-auto text-zinc-600" />
                <p className="text-xs">Nenhuma nota registrada nesta sessão.</p>
              </div>
            ) : (
              scratchpad.map((line) => (
                <div
                  key={line.id}
                  className="p-3 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>{line.timestamp}</span>
                    {line.convertedEntityHandle ? (
                      <span className="text-emerald-400">
                        Salvo como {line.convertedEntityHandle}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            convertScratchpadLineToEntity(line.id, 'npc')
                          }
                          className="btn-subtle px-1.5 py-0.5 rounded inline-flex items-center gap-1 text-[10px]"
                          title="Transformar em entrada @NPC no códice"
                        >
                          <UserPlus className="w-2.5 h-2.5" />
                          <span>@NPC</span>
                        </button>
                        <button
                          onClick={() =>
                            convertScratchpadLineToEntity(line.id, 'location')
                          }
                          className="btn-subtle px-1.5 py-0.5 rounded inline-flex items-center gap-1 text-[10px]"
                          title="Transformar em entrada #Local no códice"
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          <span>#Local</span>
                        </button>
                        <button
                          onClick={() => deleteScratchpadLine(line.id)}
                          className="p-0.5 text-zinc-600 hover:text-rose-400 ml-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-zinc-200 leading-relaxed">
                    <MentionText text={line.text} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Pinned Reference Cards */}
        <div className="lg:col-span-4 flex flex-col surface-panel rounded-xl overflow-hidden min-h-0">
          <div className="px-3.5 py-2.5 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Pin className="w-3.5 h-3.5 text-zinc-400" />
              <h2 className="text-xs font-semibold text-zinc-100">
                Referências fixadas ({pinnedEntities.length})
              </h2>
            </div>

            {unpinnedEntities.length > 0 && (
              <select
                value={pinSelectId}
                onChange={(e) => {
                  if (e.target.value) {
                    togglePinEntity(e.target.value);
                    setPinSelectId('');
                  }
                }}
                className="input-clean px-2 py-1 rounded-md text-[11px]"
              >
                <option value="">+ Fixar entrada...</option>
                {unpinnedEntities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.mentionPrefix}
                    {u.handle} ({u.name})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {pinnedEntities.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-1.5 text-zinc-500">
                <Pin className="w-5 h-5 mx-auto text-zinc-600" />
                <p className="text-xs">Nenhum cartão fixado.</p>
                <p className="text-[11px] text-zinc-600">
                  Fixe personagens, locais ou criaturas pelo menu acima.
                </p>
              </div>
            ) : (
              pinnedEntities.map((ent) => (
                <div
                  key={ent.id}
                  className="p-3.5 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-zinc-400">
                          {ent.mentionPrefix}
                          {ent.handle}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400">
                          {ent.category}
                        </span>
                      </div>
                      <h3 className="text-base font-serif font-medium text-zinc-100 truncate mt-0.5">
                        {ent.name}
                      </h3>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {ent.subtitle}
                      </p>
                    </div>

                    <button
                      onClick={() => togglePinEntity(ent.id)}
                      className="btn-subtle p-1.5 rounded-md"
                      title="Desafixar da cena"
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                  </div>

                  {ent.attributes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ent.attributes.slice(0, 4).map((a) => (
                        <span
                          key={a.id}
                          className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-zinc-300"
                        >
                          <span className="text-zinc-500">{a.label}:</span> {a.value}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                    <MentionText text={ent.summary} />
                  </div>

                  {ent.secrets.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                      {ent.secrets.map((sec) => (
                        <div
                          key={sec.id}
                          className={`p-2.5 rounded-lg border text-[11px] flex items-start justify-between gap-2 ${
                            sec.isRevealed
                              ? 'bg-amber-500/[0.05] border-amber-500/25'
                              : 'bg-[#121216] border-white/[0.06]'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-medium text-zinc-200 flex items-center gap-1">
                              {sec.isRevealed ? (
                                <Unlock className="w-3 h-3 text-amber-400 shrink-0" />
                              ) : (
                                <Lock className="w-3 h-3 text-rose-400/80 shrink-0" />
                              )}
                              <span>{sec.title}</span>
                            </div>
                            <div className="text-zinc-400 leading-relaxed">
                              <MentionText text={sec.content} />
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              revealEntitySecret(ent.id, sec.id, !sec.isRevealed)
                            }
                            className={`px-2 py-0.5 rounded text-[10px] shrink-0 ${
                              sec.isRevealed ? 'btn-subtle' : 'btn-solid'
                            }`}
                          >
                            {sec.isRevealed ? 'Ocultar' : 'Revelar'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM AUDIO MIXER DOCK */}
      <div className="surface-panel rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const nextMute = !isMasterMuted;
              setIsMasterMuted(nextMute);
              soundEngine.setMasterMute(nextMute);
            }}
            className={`p-1.5 rounded-lg border transition-colors ${
              isMasterMuted
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'btn-subtle'
            }`}
            title={isMasterMuted ? 'Reativar áudio' : 'Silenciar áudio'}
          >
            {isMasterMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <span className="text-xs font-medium text-zinc-300 hidden sm:inline">
            Ambiência
          </span>
        </div>

        {/* Multi-Track Faders */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1 justify-center">
          {AMBIENCE_TRACKS.map((tr) => {
            const Icon = tr.icon;
            const isPlaying = Boolean(activeTracks[tr.id]);
            const vol = trackVolumes[tr.id] ?? tr.defaultVol;

            return (
              <div
                key={tr.id}
                className={`px-2 py-1 rounded-lg border flex items-center gap-2 transition-colors ${
                  isPlaying
                    ? 'bg-white/[0.07] border-white/[0.16]'
                    : 'bg-[#0e0e11] border-white/[0.06]'
                }`}
              >
                <button
                  onClick={() => handleToggleTrack(tr.id)}
                  className={`p-1 rounded-md transition-colors ${
                    isPlaying
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
                <div className="min-w-[82px]">
                  <div className="text-[10px] font-medium text-zinc-200 leading-tight flex items-center gap-1">
                    <span>{tr.label}</span>
                    {isPlaying && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={vol}
                    onChange={(e) =>
                      handleVolumeChange(tr.id, parseFloat(e.target.value))
                    }
                    className="w-16 h-1 accent-zinc-200 cursor-pointer block mt-1"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Clean One-Shot SFX Triggers */}
        <div className="flex flex-wrap items-center gap-1">
          {SFX_BUTTONS.map((sfx) => {
            const Icon = sfx.icon;
            return (
              <button
                key={sfx.id}
                onClick={() => soundEngine.playOneShot(sfx.id)}
                className="btn-subtle px-2 py-1 rounded-lg text-[11px] inline-flex items-center gap-1.5 active:scale-95"
              >
                <Icon className="w-3 h-3 text-zinc-400" />
                <span>{sfx.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
