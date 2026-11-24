import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, Minus, Plus, Trash2, X, Shield, Heart, Star } from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import type { CharacterSheet, CharacterEquipmentItem, CharacterCurrency } from '../../types/campaign';
import {
  ABILITIES,
  SKILLS,
  ITEMS,
  ITEMS_BY_ID,
  WEAPON_MASTERIES,
  abilityModifier,
  formatModifier,
  normalizeSearch,
  skillIdFromName,
} from '../../data/dnd2024';
import type { Ability, SkillId } from '../../data/dnd2024';
import { parseBuild } from '../../rules/build';
import { computeArmorClass, computeCharacter, inventoryItemFromCatalog, type BuildStep } from '../../rules/engine';
import { applyDamage, applyHealing } from '../../rules/hp';
import { FeatureList, SearchInput, SpellDescription, circleLabel } from './ui';

type Tab = 'abilities' | 'combat' | 'spells' | 'features' | 'inventory' | 'notes';

const TABS: { id: Tab; label: string }[] = [
  { id: 'abilities', label: 'Atributos e perícias' },
  { id: 'combat', label: 'Combate' },
  { id: 'spells', label: 'Magias' },
  { id: 'features', label: 'Características' },
  { id: 'inventory', label: 'Inventário' },
  { id: 'notes', label: 'Anotações' },
];

const SLOT_KEYS = ['level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9'] as const;
const SAVE_NAMES: Record<Ability, string> = {
  str: 'Força',
  dex: 'Destreza',
  con: 'Constituição',
  int: 'Inteligência',
  wis: 'Sabedoria',
  cha: 'Carisma',
};

function useDebounced<T>(value: T, delay: number, onSettle: (v: T) => void) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = window.setTimeout(() => onSettle(value), delay);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}

export const CharacterSheetView: React.FC<{
  sheet: CharacterSheet;
  onClose: () => void;
  onEdit: (step?: BuildStep) => void;
  canEdit: boolean;
}> = ({ sheet, onClose, onEdit, canEdit }) => {
  const updateCharacterSheet = useCampaignStore((s) => s.updateCharacterSheet);
  const [tab, setTab] = useState<Tab>('abilities');
  const build = useMemo(() => parseBuild(sheet.build), [sheet.build]);
  const pb = sheet.proficiencyBonus;
  const mods = useMemo(
    () => Object.fromEntries(ABILITIES.map((a) => [a.id, abilityModifier(sheet.stats[a.id])])) as Record<Ability, number>,
    [sheet.stats]
  );

  const save = (patch: Partial<CharacterSheet>) => {
    if (!canEdit) return;
    void updateCharacterSheet(sheet.id, patch);
  };

  // --------------------------------------------------------------- Perícias e salvaguardas
  // O motor de regras é a única fonte destes cálculos; fichas sem build usam o valor salvo.
  const computed = useMemo(() => (build ? computeCharacter(build) : null), [build]);
  const isBard2 = Boolean(computed?.jackOfAllTrades);
  const legacyProfs = new Set<SkillId>(
    (sheet.proficiencies || []).map((p) => skillIdFromName(p)).filter((x): x is SkillId => Boolean(x))
  );
  const skillRows = SKILLS.map((s) => {
    const fromEngine = computed?.skills.find((x) => x.id === s.id);
    if (fromEngine) return { ...s, prof: fromEngine.proficient, exp: fromEngine.expertise, half: fromEngine.halfProficiency, bonus: fromEngine.bonus };
    const prof = legacyProfs.has(s.id);
    return { ...s, prof, exp: false, half: false, bonus: mods[s.ability] + (prof ? pb : 0) };
  });
  const saveRows = ABILITIES.map((a) => {
    if (computed) return { ...a, prof: computed.saveProficiencies.includes(a.id), bonus: computed.saves[a.id] };
    const prof = (sheet.savingThrows || []).some((n) => n.toLowerCase() === a.name.toLowerCase());
    return { ...a, prof, bonus: mods[a.id] + (prof ? pb : 0) };
  });
  const initiative = computed?.initiative ?? sheet.initiativeBonus ?? mods.dex;

  // --------------------------------------------------------------- PV
  const [hpDelta, setHpDelta] = useState('');
  const applyHp = (sign: 1 | -1) => {
    const n = Math.abs(parseInt(hpDelta, 10));
    if (!n) return;
    save(sign === -1 ? applyDamage(sheet, n) : applyHealing(sheet, n));
    setHpDelta('');
  };

  // --------------------------------------------------------------- Inventário
  const setEquipment = (equipment: CharacterEquipmentItem[]) => {
    const patch: Partial<CharacterSheet> = { equipment };
    if (build) patch.armorClass = computeArmorClass(build, mods, equipment);
    save(patch);
  };

  const attacks = useMemo(() => {
    const isMartialProf = (sheet.proficiencies || []).some((p) => /marciais/i.test(p));
    return sheet.equipment
      .filter((e) => e.equipped && e.itemId && ITEMS_BY_ID[e.itemId]?.damage)
      .map((e) => {
        const item = ITEMS_BY_ID[e.itemId!];
        const ranged = item.kind.endsWith('ranged');
        const finesse = (item.properties || '').includes('Acuidade');
        const ability: Ability = ranged ? 'dex' : finesse && mods.dex > mods.str ? 'dex' : 'str';
        const martial = item.kind.startsWith('martial');
        const proficient = !martial || isMartialProf;
        const toHit = mods[ability] + (proficient ? pb : 0);
        const [dice, ...type] = (item.damage || '').split(' ');
        const mod = mods[ability];
        return {
          id: e.id,
          name: e.name,
          toHit,
          damage: `${dice}${mod ? (mod > 0 ? ` + ${mod}` : ` − ${Math.abs(mod)}`) : ''} ${type.join(' ')}`,
          notes: item.properties,
          mastery: (sheet.weaponMasteries || []).some((m) => m.startsWith(item.name)) ? item.mastery : undefined,
        };
      });
  }, [sheet.equipment, sheet.proficiencies, sheet.weaponMasteries, mods, pb]);

  // --------------------------------------------------------------- Magias
  const spellsByLevel = useMemo(() => {
    const groups = new Map<number, typeof sheet.spells>();
    for (const sp of [...sheet.spells].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'pt-BR'))) {
      if (!groups.has(sp.level)) groups.set(sp.level, []);
      groups.get(sp.level)!.push(sp);
    }
    return Array.from(groups.entries());
  }, [sheet.spells]);
  const [openSpell, setOpenSpell] = useState<string | null>(null);
  const isWizard = build?.classId === 'wizard';

  const toggleSlot = (key: (typeof SLOT_KEYS)[number] | 'pactSlots', index: number) => {
    const slot = sheet.spellSlots[key];
    if (!slot) return;
    const used = index < slot.used ? index : index + 1;
    save({ spellSlots: { ...sheet.spellSlots, [key]: { ...slot, used: Math.max(0, Math.min(slot.max, used)) } } });
  };

  const toggleWizardPrepared = (spellIndex: string) => {
    if (!build) return;
    const target = sheet.spells.find((s) => s.index === spellIndex);
    const preparedNow = sheet.spells.filter((s) => s.prepared && !s.alwaysPrepared && s.level > 0 && s.source === 'Grimório').length;
    if (target && !target.prepared && computed && preparedNow >= computed.preparedLimit) return;
    const spells = sheet.spells.map((s) => (s.index === spellIndex && !s.alwaysPrepared ? { ...s, prepared: !s.prepared } : s));
    const prepared = spells.filter((s) => s.prepared && !s.alwaysPrepared && s.level > 0 && s.source === 'Grimório').map((s) => s.index);
    save({ spells, build: { ...build, prepared } });
  };

  // --------------------------------------------------------------- Notas
  const [notes, setNotes] = useState(sheet.notes);
  useDebounced(notes, 700, (v) => v !== sheet.notes && save({ notes: v }));
  // Grava anotações pendentes ao fechar a ficha.
  const pendingNotes = useRef({ notes, saved: sheet.notes, save });
  pendingNotes.current = { notes, saved: sheet.notes, save };
  useEffect(
    () => () => {
      const p = pendingNotes.current;
      if (p.notes !== p.saved) p.save({ notes: p.notes });
    },
    []
  );

  const longRest = () => {
    const slots = { ...sheet.spellSlots };
    SLOT_KEYS.forEach((k) => {
      if (slots[k]) slots[k] = { ...slots[k]!, used: 0 };
    });
    if (slots.pactSlots) slots.pactSlots = { ...slots.pactSlots, used: 0 };
    save({
      hp: sheet.maxHp,
      tempHp: 0,
      spellSlots: slots,
      hitDiceUsed: 0, // 2024: o Descanso Longo restaura todos os Dados de Vida
      heroicInspiration: build?.speciesId === 'human' ? true : sheet.heroicInspiration,
    });
  };

  // Descanso Curto: espaços de Magia de Pacto voltam; Dados de Vida são gastos manualmente.
  const shortRest = () => {
    if (!sheet.spellSlots.pactSlots) return;
    save({ spellSlots: { ...sheet.spellSlots, pactSlots: { ...sheet.spellSlots.pactSlots, used: 0 } } });
  };

  const hpPct = Math.round((sheet.hp / Math.max(1, sheet.maxHp)) * 100);

  return (
    <div className="modal-backdrop p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div className="modal max-w-5xl h-full sm:h-[92vh] rounded-none sm:rounded-xl">
        {/* Cabeçalho */}
        <header className="px-4 sm:px-6 py-4 border-b border-line flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {sheet.avatarUrl ? (
              <img src={sheet.avatarUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-line shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-base font-semibold text-fg-muted shrink-0">
                {sheet.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 id="sheet-title" className="text-lg font-semibold text-fg truncate">
                {sheet.name}
              </h2>
              <p className="text-[13px] text-fg-muted truncate">
                {[sheet.race, `${sheet.className} ${sheet.level}`, sheet.subclass, sheet.background].filter(Boolean).join(' · ')}
              </p>
              <p className="text-xs text-fg-subtle truncate">
                {sheet.playerName}
                {sheet.campaignTitle ? ` · ${sheet.campaignTitle}` : ' · sem campanha'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit()}>
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">Editar personagem</span>
              </button>
            )}
            <button type="button" onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Barra de estado */}
          <div className="px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 border-b border-line bg-surface-2/40">
            <div className="card px-3 py-2.5 col-span-2 sm:col-span-3 lg:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-subtle inline-flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" /> Pontos de Vida
                </span>
                {sheet.tempHp > 0 && <span className="badge badge-info">+{sheet.tempHp} temp.</span>}
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-semibold tabular-nums text-fg">{sheet.hp}</span>
                <span className="text-sm text-fg-subtle tabular-nums">/ {sheet.maxHp}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden mt-1.5">
                <div
                  className={`h-full ${hpPct > 50 ? 'bg-success' : hpPct > 25 ? 'bg-warning' : 'bg-danger'}`}
                  style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
                />
              </div>
              {canEdit && (
                <div className="flex items-center gap-1.5 mt-2">
                  <input
                    type="number"
                    min={0}
                    value={hpDelta}
                    onChange={(e) => setHpDelta(e.target.value)}
                    className="input h-8 w-20"
                    placeholder="Valor"
                    aria-label="Valor de dano ou cura"
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyHp(-1)}>
                    Dano
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyHp(1)}>
                    Cura
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const n = Math.abs(parseInt(hpDelta, 10));
                      if (n) save({ tempHp: n });
                      setHpDelta('');
                    }}
                    title="Definir PV temporários"
                  >
                    Temp.
                  </button>
                </div>
              )}
            </div>
            <div className="card px-3 py-2.5">
              <div className="text-xs text-fg-subtle inline-flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Classe de Armadura
              </div>
              <div className="text-2xl font-semibold tabular-nums">{sheet.armorClass}</div>
            </div>
            <div className="card px-3 py-2.5">
              <div className="text-xs text-fg-subtle">Iniciativa</div>
              <div className="text-2xl font-semibold tabular-nums">{formatModifier(initiative)}</div>
            </div>
            <div className="card px-3 py-2.5">
              <div className="text-xs text-fg-subtle">Deslocamento</div>
              <div className="text-base font-semibold leading-tight mt-1">{sheet.speed.split(' (')[0]}</div>
            </div>
            <div className="card px-3 py-2.5">
              <div className="text-xs text-fg-subtle">Proficiência · Percepção</div>
              <div className="text-base font-semibold tabular-nums mt-1">
                +{pb} · {sheet.passivePerception}
              </div>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => save({ heroicInspiration: !sheet.heroicInspiration })}
                className={`mt-1 inline-flex items-center gap-1 text-xs ${sheet.heroicInspiration ? 'text-accent font-medium' : 'text-fg-subtle'}`}
              >
                <Star className={`w-3.5 h-3.5 ${sheet.heroicInspiration ? 'fill-current' : ''}`} />
                Inspiração Heroica
              </button>
            </div>
          </div>

          <div className="px-4 sm:px-6">
            <div className="tabs">
              {TABS.map((t) => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`tab ${tab === t.id ? 'tab-active' : ''}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 sm:px-6 py-5">
            {tab === 'abilities' && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-2">
                    {ABILITIES.map((a) => (
                      <div key={a.id} className="card px-2 py-3 text-center">
                        <div className="text-xs text-fg-subtle">{a.name}</div>
                        <div className="text-2xl font-semibold tabular-nums">{formatModifier(mods[a.id])}</div>
                        <div className="text-xs text-fg-muted tabular-nums">{sheet.stats[a.id]}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="section-title mb-2">Testes de resistência</h4>
                    <ul className="card divide-y divide-line">
                      {saveRows.map((a) => (
                        <li key={a.id} className="px-3 py-2 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${a.prof ? "bg-accent" : "border border-line-strong"}`} />
                            {a.name}
                          </span>
                          <span className="tabular-nums font-medium">{formatModifier(a.bonus)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-[13px] space-y-1.5">
                    {(sheet.toolProficiencies?.length || 0) > 0 && (
                      <p>
                        <span className="text-fg-subtle">Ferramentas: </span>
                        {sheet.toolProficiencies!.join(', ')}
                      </p>
                    )}
                    {(sheet.languages?.length || 0) > 0 && (
                      <p>
                        <span className="text-fg-subtle">Idiomas: </span>
                        {sheet.languages!.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="section-title">Perícias</h4>
                    <span className="text-xs text-fg-subtle flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" />Proficiente</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent ring-2 ring-accent/30" />Especialização</span>
                      {isBard2 && <span>½ Versatilidade</span>}
                    </span>
                  </div>
                  <ul className="card divide-y divide-line">
                    {skillRows.map((s) => (
                      <li key={s.id} className="px-3 py-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              s.exp ? 'bg-accent ring-2 ring-accent/30' : s.prof ? 'bg-accent' : s.half ? 'bg-accent/40' : 'border border-line-strong'
                            }`}
                          />
                          <span className="truncate">{s.name}</span>
                          <span className="text-xs text-fg-subtle">{ABILITIES.find((a) => a.id === s.ability)?.short}</span>
                          {s.half && <span className="text-xs text-fg-subtle">½</span>}
                        </span>
                        <span className="tabular-nums font-medium">{formatModifier(s.bonus)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {tab === 'combat' && (
              <div className="space-y-6">
                <div>
                  <h4 className="section-title mb-2">Ataques</h4>
                  {attacks.length === 0 ? (
                    <p className="text-[13px] text-fg-subtle">Equipe armas no inventário para ver os ataques.</p>
                  ) : (
                    <div className="card overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Arma</th>
                            <th>Ataque</th>
                            <th>Dano</th>
                            <th className="hidden md:table-cell">Propriedades</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attacks.map((a) => (
                            <tr key={a.id}>
                              <td className="font-medium">
                                {a.name}
                                {a.mastery && (
                                  <span className="badge badge-accent ml-2" title={WEAPON_MASTERIES[a.mastery]}>
                                    {a.mastery}
                                  </span>
                                )}
                              </td>
                              <td className="tabular-nums">{formatModifier(a.toHit)}</td>
                              <td className="tabular-nums">{a.damage}</td>
                              <td className="hidden md:table-cell text-fg-muted text-[13px]">{a.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card p-4">
                    <h4 className="section-title mb-2">Dados de Vida</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-fg-muted">
                        {sheet.hitDice} · usados {sheet.hitDiceUsed}
                      </span>
                      {canEdit && (
                        <div className="flex gap-1">
                          <button type="button" className="btn btn-secondary btn-icon" onClick={() => save({ hitDiceUsed: Math.max(0, sheet.hitDiceUsed - 1) })} aria-label="Recuperar Dado de Vida">
                            <Minus className="w-4 h-4" />
                          </button>
                          <button type="button" className="btn btn-secondary btn-icon" onClick={() => save({ hitDiceUsed: Math.min(sheet.level, sheet.hitDiceUsed + 1) })} aria-label="Gastar Dado de Vida">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="card p-4">
                    <h4 className="section-title mb-2">Recursos da classe</h4>
                    {(sheet.classResources || []).length === 0 ? (
                      <p className="text-[13px] text-fg-subtle">Nenhum recurso.</p>
                    ) : (
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                        {sheet.classResources!.map((r) => (
                          <div key={r.label} className="flex justify-between gap-2">
                            <dt className="text-fg-muted">{r.label}</dt>
                            <dd className="font-medium tabular-nums">{r.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </div>
                {(sheet.weaponMasteries || []).length > 0 && (
                  <div>
                    <h4 className="section-title mb-2">Maestria em Armas</h4>
                    <ul className="card divide-y divide-line text-[13px]">
                      {sheet.weaponMasteries!.map((m) => (
                        <li key={m} className="px-3 py-2 text-fg-muted">
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-secondary" onClick={shortRest} disabled={!sheet.spellSlots.pactSlots}>
                      Descanso Curto
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={longRest}>
                      Descanso Longo
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === 'spells' && (
              <div className="space-y-6">
                {(() => {
                  const keys = SLOT_KEYS.filter((k) => (sheet.spellSlots[k]?.max || 0) > 0);
                  const pact = sheet.spellSlots.pactSlots;
                  if (keys.length === 0 && !pact) return null;
                  return (
                    <div>
                      <h4 className="section-title mb-2">Espaços de magia</h4>
                      <div className="flex flex-wrap gap-3">
                        {pact && pact.max > 0 && (
                          <div className="card px-3 py-2">
                            <div className="text-xs text-fg-subtle mb-1">Pacto ({pact.level}º círculo)</div>
                            <div className="flex gap-1">
                              {Array.from({ length: pact.max }, (_, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  disabled={!canEdit}
                                  onClick={() => toggleSlot('pactSlots', i)}
                                  className={`w-5 h-5 rounded border ${i < pact.used ? 'bg-fg-subtle border-fg-subtle' : 'bg-surface border-line-strong'}`}
                                  aria-label={`Espaço ${i + 1} ${i < pact.used ? 'gasto' : 'disponível'}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        {keys.map((k, idx) => {
                          const slot = sheet.spellSlots[k]!;
                          return (
                            <div key={k} className="card px-3 py-2">
                              <div className="text-xs text-fg-subtle mb-1">{SLOT_KEYS.indexOf(k) + 1}º círculo</div>
                              <div className="flex gap-1">
                                {Array.from({ length: slot.max }, (_, i) => (
                                  <button
                                    key={`${idx}-${i}`}
                                    type="button"
                                    disabled={!canEdit}
                                    onClick={() => toggleSlot(k, i)}
                                    className={`w-5 h-5 rounded border ${i < slot.used ? 'bg-fg-subtle border-fg-subtle' : 'bg-surface border-line-strong'}`}
                                    aria-label={`Espaço ${i + 1} ${i < slot.used ? 'gasto' : 'disponível'}`}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-fg-subtle mt-2">Clique para marcar um espaço como gasto.</p>
                    </div>
                  );
                })()}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="section-title">Magias ({sheet.spells.length})</h4>
                  {canEdit && build && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit('spells')}>
                      Alterar magias
                    </button>
                  )}
                </div>
                {spellsByLevel.length === 0 && <p className="text-[13px] text-fg-subtle">Nenhuma magia.</p>}
                {spellsByLevel.map(([level, list]) => (
                  <div key={level}>
                    <h5 className="text-[13px] font-medium text-fg-muted mb-1.5">{level === 0 ? 'Truques' : `${level}º círculo`}</h5>
                    <ul className="card divide-y divide-line">
                      {list.map((sp) => {
                        const open = openSpell === sp.id;
                        const canToggle = isWizard && canEdit && !sp.alwaysPrepared && sp.level > 0 && sp.source === 'Grimório';
                        return (
                          <li key={sp.id}>
                            <div className="px-3 py-2 flex items-center gap-3">
                              {sp.level > 0 && (
                                <button
                                  type="button"
                                  disabled={!canToggle}
                                  onClick={() => toggleWizardPrepared(sp.index)}
                                  title={sp.alwaysPrepared ? 'Sempre preparada' : sp.prepared ? 'Preparada' : 'Não preparada'}
                                  className={`w-3 h-3 rounded-full shrink-0 ${sp.prepared ? 'bg-accent' : 'border border-line-strong'} ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
                                  aria-label={sp.prepared ? 'Preparada' : 'Não preparada'}
                                />
                              )}
                              <button type="button" onClick={() => setOpenSpell(open ? null : sp.id)} className="flex-1 min-w-0 text-left flex items-center justify-between gap-3">
                                <span className="min-w-0">
                                  <span className="text-sm text-fg">{sp.name}</span>
                                  {sp.source && <span className="text-xs text-fg-subtle ml-2 hidden sm:inline">{sp.source}</span>}
                                </span>
                                <span className="flex items-center gap-1.5 shrink-0 text-xs text-fg-subtle">
                                  {sp.concentration && <span className="badge">C</span>}
                                  {sp.ritual && <span className="badge">R</span>}
                                  <span className="hidden sm:inline">{sp.castingTime}</span>
                                </span>
                              </button>
                            </div>
                            {open && (
                              <div className="px-4 pb-4 space-y-2">
                                <p className="text-xs text-fg-subtle">
                                  {circleLabel(sp.level)} · {sp.school} · {sp.castingTime} · {sp.range} · {sp.components} · {sp.duration}
                                </p>
                                <SpellDescription spell={{ description: sp.description, higherLevels: sp.higherLevels, level: sp.level }} />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {tab === 'features' && (
              <div className="space-y-4">
                {(sheet.classFeatures || []).length > 0 ? (
                  <FeatureList features={sheet.classFeatures!} />
                ) : (
                  <ul className="card divide-y divide-line">
                    {sheet.racialTraits.map((t) => (
                      <li key={t} className="px-3 py-2 text-[13px] text-fg-muted">
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === 'inventory' && (
              <InventoryTab
                equipment={sheet.equipment}
                currency={sheet.currency || { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 }}
                canEdit={canEdit}
                onEquipment={setEquipment}
                onCurrency={(currency) => save({ currency })}
              />
            )}

            {tab === 'notes' && (
              <textarea
                className="input min-h-[320px]"
                value={notes}
                disabled={!canEdit}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anotações do personagem"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const COINS: { key: keyof CharacterCurrency; label: string }[] = [
  { key: 'pp', label: 'PL' },
  { key: 'gp', label: 'PO' },
  { key: 'ep', label: 'PE' },
  { key: 'sp', label: 'PP' },
  { key: 'cp', label: 'PC' },
];

const InventoryTab: React.FC<{
  equipment: CharacterEquipmentItem[];
  currency: CharacterCurrency;
  canEdit: boolean;
  onEquipment: (e: CharacterEquipmentItem[]) => void;
  onCurrency: (c: CharacterCurrency) => void;
}> = ({ equipment, currency, canEdit, onEquipment, onCurrency }) => {
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');
  const q = normalizeSearch(query.trim());
  const results = q.length >= 2 ? ITEMS.filter((i) => normalizeSearch(i.name).includes(q)).slice(0, 8) : [];

  const addItem = (itemId: string) => {
    const existing = equipment.find((e) => e.itemId === itemId);
    if (existing) {
      onEquipment(equipment.map((e) => (e.id === existing.id ? { ...e, quantity: e.quantity + 1 } : e)));
    } else {
      const item = inventoryItemFromCatalog(itemId, { equipped: false });
      if (item) onEquipment([...equipment, item]);
    }
    setQuery('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="section-title mb-2">Moedas</h4>
        <div className="grid grid-cols-5 gap-2 max-w-lg">
          {COINS.map((coin) => (
            <label key={coin.key} className="card px-2 py-2 text-center">
              <span className="text-xs text-fg-subtle block">{coin.label}</span>
              <input
                type="number"
                min={0}
                disabled={!canEdit}
                value={currency[coin.key]}
                onChange={(e) => onCurrency({ ...currency, [coin.key]: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full bg-transparent text-center text-base font-semibold tabular-nums focus:outline-none"
                aria-label={coin.label}
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="section-title mb-2">Itens</h4>
        {equipment.length === 0 ? (
          <p className="text-[13px] text-fg-subtle">Inventário vazio.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-20">Equipado</th>
                  <th>Item</th>
                  <th className="hidden md:table-cell">Detalhes</th>
                  <th className="w-28 text-center">Qtd.</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {equipment.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={e.equipped}
                        disabled={!canEdit}
                        onChange={() => onEquipment(equipment.map((x) => (x.id === e.id ? { ...x, equipped: !x.equipped } : x)))}
                        aria-label={`Equipar ${e.name}`}
                      />
                    </td>
                    <td>
                      <div className="font-medium">{e.name}</div>
                      <div className="text-xs text-fg-subtle">{e.category}</div>
                    </td>
                    <td className="hidden md:table-cell text-[13px] text-fg-muted">
                      {[e.damage, e.armorClass, e.properties, e.mastery && `Maestria: ${e.mastery}`, e.weight].filter(Boolean).join(' · ') || e.notes || '—'}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={!canEdit}
                          className="btn btn-ghost btn-icon h-7 w-7"
                          onClick={() => onEquipment(equipment.map((x) => (x.id === e.id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x)))}
                          aria-label="Diminuir quantidade"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center tabular-nums">{e.quantity}</span>
                        <button
                          type="button"
                          disabled={!canEdit}
                          className="btn btn-ghost btn-icon h-7 w-7"
                          onClick={() => onEquipment(equipment.map((x) => (x.id === e.id ? { ...x, quantity: x.quantity + 1 } : x)))}
                          aria-label="Aumentar quantidade"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td>
                      {canEdit && (
                        <button
                          type="button"
                          className="btn btn-danger-ghost btn-icon h-7 w-7"
                          onClick={() => onEquipment(equipment.filter((x) => x.id !== e.id))}
                          aria-label={`Remover ${e.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canEdit && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="label">Adicionar do catálogo</span>
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar arma, armadura ou equipamento" />
            {results.length > 0 && (
              <ul className="card divide-y divide-line">
                {results.map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => addItem(i.id)} className="w-full text-left px-3 py-2 hover:bg-surface-2 flex justify-between gap-3 text-sm">
                      <span>{i.name}</span>
                      <span className="text-xs text-fg-subtle">{i.damage || (i.ac ? `CA ${i.ac.base}` : `${i.cost} PO`)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!custom.trim()) return;
              onEquipment([
                ...equipment,
                { id: `eq-${Date.now().toString(36)}`, name: custom.trim(), category: 'Item', quantity: 1, equipped: false },
              ]);
              setCustom('');
            }}
          >
            <label className="label" htmlFor="custom-item">Item personalizado</label>
            <div className="flex gap-2">
              <input id="custom-item" className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ex.: Anel de família" />
              <button type="submit" className="btn btn-secondary">Adicionar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
