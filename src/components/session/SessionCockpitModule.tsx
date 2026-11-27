import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { MentionText, MentionTextarea } from '../common/MentionText';
import { formatTime } from '../../utils/format';
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
  PinOff,
  Plus,
  Trash2,
  SkipForward,
  Shield,
  NotebookPen,
  UserPlus,
  MapPin,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  RotateCcw,
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

const CATEGORY_LABELS: Record<string, string> = {
  npc: 'NPC',
  location: 'Local',
  faction: 'Facção',
  item: 'Item',
  creature: 'Criatura',
  monster: 'Criatura',
  lore: 'Lore',
  event: 'Evento',
  deity: 'Divindade',
};

/** Cabeçalho padrão dos painéis do cockpit. */
const PanelHeader: React.FC<{
  icon: React.FC<{ className?: string }>;
  title: string;
  meta?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ icon: Icon, title, meta, children }) => (
  <div className="h-12 px-3 border-b border-line flex items-center justify-between gap-2 shrink-0">
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="w-4 h-4 text-fg-muted shrink-0" />
      <h2 className="text-sm font-semibold text-fg truncate">{title}</h2>
      {meta && <span className="text-xs text-fg-subtle tabular-nums shrink-0">{meta}</span>}
    </div>
    {children && <div className="flex items-center gap-1 shrink-0">{children}</div>}
  </div>
);

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
  const setCombatantHidden = useCampaignStore((s) => s.setCombatantHidden);
  const removeCombatant = useCampaignStore((s) => s.removeCombatant);
  const clearCombatants = useCampaignStore((s) => s.clearCombatants);
  const rollDice = useCampaignStore((s) => s.rollDice);
  const deleteDiceLog = useCampaignStore((s) => s.deleteDiceLog);
  const clearDiceLogs = useCampaignStore((s) => s.clearDiceLogs);
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
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-4.75rem)]">
      {/* Três colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Coluna esquerda: iniciativa e dados */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
          {/* Iniciativa */}
          <section className="card flex-1 flex flex-col overflow-hidden min-h-[320px] lg:min-h-0">
            <PanelHeader icon={Swords} title="Iniciativa" meta={`Rodada ${combatRound}`}>
              {combatants.length > 0 && (
                <button
                  onClick={() => void clearCombatants()}
                  className="btn btn-danger-ghost btn-sm btn-icon"
                  title="Limpar combate"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={rollAllInitiatives}
                className="btn btn-ghost btn-sm btn-icon"
                title="Rolar iniciativa (d20) para todos"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowAddCombatant(!showAddCombatant)}
                className={`btn btn-ghost btn-sm btn-icon ${
                  showAddCombatant ? 'bg-surface-2 text-fg' : ''
                }`}
                title="Adicionar combatente"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={nextCombatTurn} className="btn btn-primary btn-sm">
                <span>Próximo turno</span>
                <SkipForward className="w-4 h-4" />
              </button>
            </PanelHeader>

            {showAddCombatant && (
              <form
                onSubmit={handleAddCombatant}
                className="p-3 bg-surface-2 border-b border-line space-y-2"
              >
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={combName}
                    onChange={(e) => setCombName(e.target.value)}
                    placeholder="Nome"
                    aria-label="Nome"
                    className="input h-8 col-span-2"
                  />
                  <select
                    value={combType}
                    onChange={(e) => setCombType(e.target.value as 'pc' | 'npc' | 'monster')}
                    aria-label="Tipo"
                    className="input h-8"
                  >
                    <option value="monster">Monstro</option>
                    <option value="pc">PJ</option>
                    <option value="npc">NPC</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 gap-2 items-end">
                  <label className="block">
                    <span className="text-xs text-fg-subtle">Inic.</span>
                    <input
                      type="number"
                      value={combInit}
                      onChange={(e) => setCombInit(Number(e.target.value))}
                      title="Iniciativa"
                      className="input h-8 tabular-nums"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-fg-subtle">PV</span>
                    <input
                      type="number"
                      value={combHp}
                      onChange={(e) => setCombHp(Number(e.target.value))}
                      title="Pontos de vida"
                      className="input h-8 tabular-nums"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-fg-subtle">CA</span>
                    <input
                      type="number"
                      value={combAc}
                      onChange={(e) => setCombAc(Number(e.target.value))}
                      title="Classe de armadura"
                      className="input h-8 tabular-nums"
                    />
                  </label>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Adicionar
                  </button>
                </div>
              </form>
            )}

            <div className="flex-1 overflow-y-auto">
              {combatants.length === 0 ? (
                <div className="py-10 px-4 text-center">
                  <Swords className="w-5 h-5 mx-auto text-fg-subtle mb-2" />
                  <p className="text-[13px] text-fg-muted">Nenhum combatente.</p>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {combatants.map((c, idx) => {
                    const isTurn = idx === activeCombatTurnIndex;
                    const hpPct = Math.round(((c.hp ?? 0) / Math.max(1, c.maxHp ?? 0)) * 100);
                    const isDead = (c.hp ?? 0) <= 0;
                    const barWidth = Math.max(0, Math.min(100, hpPct));
                    const hpFill =
                      hpPct > 50 ? 'bg-success' : hpPct > 25 ? 'bg-warning' : 'bg-danger';

                    return (
                      <li
                        key={c.id}
                        aria-current={isTurn ? 'true' : undefined}
                        className={`px-3 py-2.5 space-y-2 border-l-2 transition-colors ${
                          isTurn
                            ? 'bg-accent-soft border-l-accent'
                            : 'border-l-transparent'
                        } ${isDead && !isTurn ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-md font-mono text-[13px] font-semibold flex items-center justify-center shrink-0 tabular-nums border ${
                                isTurn
                                  ? 'bg-accent text-accent-fg border-accent'
                                  : 'bg-surface-2 text-fg border-line'
                              }`}
                              title="Iniciativa"
                            >
                              {c.initiative}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-fg truncate flex items-center gap-1.5">
                                <span className="truncate">{c.name}</span>
                                {c.isHidden && (
                                  <span className="badge badge-warning shrink-0">Oculto</span>
                                )}
                                {isDead && (
                                  <span className="text-xs font-normal text-danger shrink-0">
                                    Caído
                                  </span>
                                )}
                              </div>
                              {c.notes && (
                                <div className="text-xs text-fg-subtle truncate">{c.notes}</div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className="inline-flex items-center gap-1 text-[13px] text-fg-muted tabular-nums"
                              title="Classe de armadura"
                            >
                              <Shield className="w-3.5 h-3.5 text-fg-subtle" />
                              {c.armorClass}
                            </span>
                            <button
                              onClick={() => void setCombatantHidden(c.id, !c.isHidden)}
                              className="btn btn-ghost btn-icon h-7 w-7"
                              title={
                                c.isHidden
                                  ? 'Revelar combatente na tela dos jogadores'
                                  : 'Ocultar combatente da tela dos jogadores'
                              }
                            >
                              {c.isHidden ? (
                                <EyeOff className="w-3.5 h-3.5 text-warning" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => removeCombatant(c.id)}
                              className="btn btn-danger-ghost btn-icon h-7 w-7"
                              title="Remover combatente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* PV */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between text-xs tabular-nums">
                              <span className="text-fg">
                                <span className="font-semibold">{c.hp}</span>
                                <span className="text-fg-subtle"> / {c.maxHp} PV</span>
                              </span>
                              <span className="text-fg-subtle">{hpPct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                              <div
                                className={`h-full transition-all ${hpFill}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center rounded-md border border-line overflow-hidden shrink-0 bg-surface">
                            {[-5, -1, 1, 5].map((delta) => (
                              <button
                                key={delta}
                                onClick={() => adjustCombatantHp(c.id, delta)}
                                className="h-7 w-8 text-xs font-mono tabular-nums text-fg-muted hover:bg-surface-2 hover:text-fg border-r border-line last:border-r-0 transition-colors"
                                title={delta > 0 ? `Curar ${delta}` : `Dano ${-delta}`}
                              >
                                {delta > 0 ? `+${delta}` : delta}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Condições */}
                        <div className="flex flex-wrap items-center gap-1">
                          {CONDITIONS_LIST.map((cond) => {
                            const active = c.conditions.includes(cond);
                            return (
                              <button
                                key={cond}
                                onClick={() => toggleCombatantCondition(c.id, cond)}
                                aria-pressed={active}
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
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Dados */}
          <section className="card overflow-hidden shrink-0">
            <PanelHeader icon={Dices} title="Dados (oculto p/ jogadores)">
              <label className="flex items-center gap-1 text-xs text-fg-subtle">
                Qtd.
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={diceCount}
                  onChange={(e) => setDiceCount(Math.max(1, Number(e.target.value)))}
                  className="input h-7 w-11 px-1 text-center font-mono tabular-nums"
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-fg-subtle ml-1">
                Mod.
                <input
                  type="number"
                  value={diceMod}
                  onChange={(e) => setDiceMod(Number(e.target.value))}
                  className="input h-7 w-11 px-1 text-center font-mono tabular-nums"
                />
              </label>
              {diceLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => void clearDiceLogs()}
                  className="btn btn-danger-ghost btn-sm btn-icon h-7 w-7 ml-0.5"
                  title="Limpar todas as rolagens"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </PanelHeader>

            <div className="p-3 space-y-2.5">
              <div className="grid grid-cols-7 gap-1">
                {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
                  <button
                    key={sides}
                    onClick={() =>
                      rollDice(sides, diceCount, diceMod, diceLabel.trim() || `d${sides}`)
                    }
                    className={`btn btn-sm px-0 font-mono ${
                      sides === 20 ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    d{sides}
                  </button>
                ))}
              </div>

              {diceLogs.length > 0 && (
                <ul className="max-h-36 overflow-y-auto rounded-md border border-line divide-y divide-line">
                  {diceLogs.slice(0, 20).map((log) => (
                    <li
                      key={log.id}
                      className="px-2.5 py-1.5 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="truncate min-w-0">
                        <span className="text-fg-subtle tabular-nums mr-1.5">
                          {formatTime(log.timestamp)}
                        </span>
                        {log.isDmRoll ? (
                          <span className="badge badge-warning mr-1.5">Mestre</span>
                        ) : log.rollerName ? (
                          <span className="font-medium text-fg mr-1">{log.rollerName}:</span>
                        ) : null}
                        <span className="font-mono text-fg">{log.formula}</span>
                        <span className="font-mono text-fg-subtle ml-1.5">
                          [{log.rolls.join(', ')}]
                        </span>
                      </div>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {log.isCrit && <span className="badge badge-success">Crítico</span>}
                        {log.isFumble && <span className="badge badge-danger">Falha</span>}
                        <span
                          className={`font-mono text-sm font-semibold tabular-nums ${
                            log.isCrit ? 'text-success' : log.isFumble ? 'text-danger' : 'text-fg'
                          }`}
                        >
                          {log.total}
                        </span>
                        <button
                          type="button"
                          onClick={() => void deleteDiceLog(log.id)}
                          className="btn btn-danger-ghost btn-icon h-6 w-6"
                          title="Excluir rolagem"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* Coluna central: notas da sessão */}
        <section className="lg:col-span-4 card flex flex-col overflow-hidden min-h-[320px] lg:min-h-0">
          <PanelHeader icon={NotebookPen} title="Notas da sessão">
            <button
              onClick={() => handleQuickEmergencyGen('npc')}
              className="btn btn-ghost btn-sm"
              title="Gerar NPC e fixar"
            >
              <Plus className="w-3.5 h-3.5" />
              NPC
            </button>
            <button
              onClick={() => handleQuickEmergencyGen('tavern')}
              className="btn btn-ghost btn-sm"
              title="Gerar local e fixar"
            >
              <Plus className="w-3.5 h-3.5" />
              Local
            </button>
            <button
              onClick={() => handleQuickEmergencyGen('loot')}
              className="btn btn-ghost btn-sm"
              title="Gerar item e fixar"
            >
              <Plus className="w-3.5 h-3.5" />
              Item
            </button>
          </PanelHeader>

          <form onSubmit={handleAddNote} className="p-3 border-b border-line space-y-2 shrink-0">
            <MentionTextarea
              value={noteInput}
              onChange={setNoteInput}
              rows={2}
              placeholder="Registre um evento. Use @ para personagens e # para locais."
            />
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary btn-sm">
                Registrar
              </button>
            </div>
          </form>

          <div className="flex-1 overflow-y-auto">
            {scratchpad.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <NotebookPen className="w-5 h-5 mx-auto text-fg-subtle mb-2" />
                <p className="text-[13px] text-fg-muted">Nenhuma nota nesta sessão.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {scratchpad.map((line) => (
                  <li key={line.id} className="px-3 py-2.5 space-y-1 group">
                    <div className="flex items-center justify-between gap-2 text-xs text-fg-subtle min-h-[28px]">
                      <span className="tabular-nums">{line.timestamp}</span>
                      {line.convertedEntityHandle ? (
                        <span className="text-success">Salvo como {line.convertedEntityHandle}</span>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => convertScratchpadLineToEntity(line.id, 'npc')}
                            className="btn btn-ghost h-7 px-2 text-xs gap-1"
                            title="Criar entrada de NPC no códice"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>NPC</span>
                          </button>
                          <button
                            onClick={() => convertScratchpadLineToEntity(line.id, 'location')}
                            className="btn btn-ghost h-7 px-2 text-xs gap-1"
                            title="Criar entrada de local no códice"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Local</span>
                          </button>
                          <button
                            onClick={() => deleteScratchpadLine(line.id)}
                            className="btn btn-danger-ghost btn-icon h-7 w-7"
                            title="Excluir nota"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-fg leading-relaxed">
                      <MentionText text={line.text} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Coluna direita: referências fixadas */}
        <section className="lg:col-span-4 card flex flex-col overflow-hidden min-h-[320px] lg:min-h-0">
          <PanelHeader icon={Pin} title="Referências" meta={pinnedEntities.length}>
            {unpinnedEntities.length > 0 && (
              <select
                value={pinSelectId}
                onChange={(e) => {
                  if (e.target.value) {
                    togglePinEntity(e.target.value);
                    setPinSelectId('');
                  }
                }}
                aria-label="Fixar entrada"
                className="input h-8 w-auto max-w-[180px] text-[13px]"
              >
                <option value="">Fixar entrada…</option>
                {unpinnedEntities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.mentionPrefix}
                    {u.handle} ({u.name})
                  </option>
                ))}
              </select>
            )}
          </PanelHeader>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pinnedEntities.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Pin className="w-5 h-5 mx-auto text-fg-subtle mb-2" />
                <p className="text-[13px] text-fg-muted">Nenhuma referência fixada.</p>
                <p className="text-xs text-fg-subtle mt-0.5">
                  Fixe personagens, locais ou criaturas pelo menu acima.
                </p>
              </div>
            ) : (
              pinnedEntities.map((ent) => (
                <div key={ent.id} className="rounded-md border border-line">
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-fg truncate">{ent.name}</h3>
                          <span className="badge shrink-0">
                            {CATEGORY_LABELS[ent.category] ?? ent.category}
                          </span>
                        </div>
                        <p className="text-xs text-fg-subtle truncate">
                          <span className="font-mono">
                            {ent.mentionPrefix}
                            {ent.handle}
                          </span>
                          {ent.subtitle && <> · {ent.subtitle}</>}
                        </p>
                      </div>

                      <button
                        onClick={() => togglePinEntity(ent.id)}
                        className="btn btn-ghost btn-icon h-7 w-7 shrink-0"
                        title="Desafixar"
                      >
                        <PinOff className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {ent.attributes.length > 0 && (
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                        {ent.attributes.slice(0, 4).map((a) => (
                          <div key={a.id} className="flex items-baseline gap-1 min-w-0">
                            <dt className="text-fg-subtle shrink-0">{a.label}</dt>
                            <dd className="text-fg truncate tabular-nums">{a.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    <div className="text-[13px] text-fg-muted line-clamp-3 leading-relaxed">
                      <MentionText text={ent.summary} />
                    </div>
                  </div>

                  {ent.secrets.length > 0 && (
                    <ul className="border-t border-line divide-y divide-line bg-surface-2 rounded-b-md">
                      {ent.secrets.map((sec) => (
                        <li
                          key={sec.id}
                          className="px-3 py-2 text-xs flex items-start justify-between gap-2"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-medium text-fg flex items-center gap-1.5">
                              {sec.isRevealed ? (
                                <Unlock className="w-3.5 h-3.5 text-success shrink-0" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-fg-subtle shrink-0" />
                              )}
                              <span>{sec.title}</span>
                            </div>
                            <div className="text-fg-muted leading-relaxed">
                              <MentionText text={sec.content} />
                            </div>
                          </div>

                          <button
                            onClick={() => revealEntitySecret(ent.id, sec.id, !sec.isRevealed)}
                            className={`btn btn-sm h-7 shrink-0 ${
                              sec.isRevealed ? 'btn-ghost' : 'btn-secondary'
                            }`}
                          >
                            {sec.isRevealed ? 'Ocultar' : 'Revelar'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
