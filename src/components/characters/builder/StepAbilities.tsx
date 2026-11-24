import React from 'react';
import { Dices, Minus, Plus, Wand2 } from 'lucide-react';
import {
  ABILITIES,
  ABILITY_NAME,
  GENERAL_FEATS,
  ORIGIN_FEATS,
  EPIC_BOONS,
  FEATS_BY_ID,
  abilityModifier,
  formatModifier,
} from '../../../data/dnd2024';
import type { Ability } from '../../../data/dnd2024';
import type { AsiChoice } from '../../../rules/build';
import type { StatGenerationMethod } from '../../../types/campaign';
import { OptionPicker, Section, ChoiceChip } from '../ui';
import { OriginFeatConfig } from './StepOrigin';
import { FeatChoices } from './FeatChoices';
import type { StepProps } from './shared';

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const POINT_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const POINT_BUDGET = 27;

const METHODS: { id: StatGenerationMethod; label: string }[] = [
  { id: 'standard', label: 'Arranjo padrão' },
  { id: 'pointbuy', label: 'Compra de pontos' },
  { id: 'roll4d6', label: 'Rolagem 4d6' },
  { id: 'manual', label: 'Manual' },
];

function roll4d6(): number {
  const dice = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b);
  return dice[1] + dice[2] + dice[3];
}

/** Distribui um conjunto de valores priorizando os atributos principais da classe. */
function suggestAssignment(values: number[], priority: Ability[]): Record<Ability, number> {
  const sorted = [...values].sort((a, b) => b - a);
  const fallback: Ability[] = ['con', 'dex', 'wis', 'str', 'cha', 'int'];
  const order: Ability[] = [...priority, ...fallback].filter(
    (a, i, arr) => arr.indexOf(a) === i
  );
  const out = {} as Record<Ability, number>;
  order.forEach((a, i) => (out[a] = sorted[i] ?? 10));
  return out;
}

export const StepAbilities: React.FC<StepProps> = ({ build, c, update }) => {
  const pool = build.statMethod === 'roll4d6' ? build.rolledScores || [] : STANDARD_ARRAY;
  const pointsSpent = ABILITIES.reduce((sum, a) => sum + (POINT_COST[build.baseScores[a.id]] ?? 99), 0);

  const setMethod = (m: StatGenerationMethod) => {
    if (m === 'standard') {
      update({ statMethod: m, baseScores: suggestAssignment(STANDARD_ARRAY, c.cls.primaryAbilities) });
    } else if (m === 'pointbuy') {
      update({ statMethod: m, baseScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 } });
    } else if (m === 'roll4d6') {
      const rolled = Array.from({ length: 6 }, roll4d6);
      update({ statMethod: m, rolledScores: rolled, baseScores: suggestAssignment(rolled, c.cls.primaryAbilities) });
    } else {
      update({ statMethod: m });
    }
  };

  /** Atribui um valor do conjunto a um atributo; se outro atributo já o usa, troca. */
  const assign = (ability: Ability, value: number) => {
    const current = build.baseScores[ability];
    const holder = ABILITIES.find((a) => a.id !== ability && build.baseScores[a.id] === value);
    const next = { ...build.baseScores, [ability]: value };
    if (holder) next[holder.id] = current;
    update({ baseScores: next });
  };

  const stepPoint = (ability: Ability, delta: number) => {
    const v = build.baseScores[ability] + delta;
    if (v < 8 || v > 15) return;
    const next = { ...build.baseScores, [ability]: v };
    const cost = ABILITIES.reduce((s, a) => s + POINT_COST[next[a.id]], 0);
    if (cost > POINT_BUDGET) return;
    update({ baseScores: next });
  };

  const setAsi = (level: number, patch: Partial<AsiChoice>) =>
    update((b) => {
      const existing = b.asi.find((a) => a.level === level) || { level, type: level === 19 ? 'feat' : 'asi', increases: {} };
      const merged = { ...existing, ...patch } as AsiChoice;
      return { asi: [...b.asi.filter((a) => a.level !== level), merged].sort((x, y) => x.level - y.level) };
    });

  return (
    <div className="space-y-8">
      <Section title="Método de geração" description="Combine o método com o Mestre antes de começar.">
        <div className="flex flex-wrap items-center gap-3">
          <div className="segmented">
            {METHODS.map((m) => (
              <button key={m.id} type="button" onClick={() => setMethod(m.id)} className={`segmented-item ${build.statMethod === m.id ? 'segmented-item-active' : ''}`}>
                {m.label}
              </button>
            ))}
          </div>
          {build.statMethod === 'roll4d6' && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMethod('roll4d6')}>
              <Dices className="w-4 h-4" />
              Rolar novamente
            </button>
          )}
          {(build.statMethod === 'standard' || build.statMethod === 'roll4d6') && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => update({ baseScores: suggestAssignment(pool, c.cls.primaryAbilities) })}
            >
              <Wand2 className="w-4 h-4" />
              Sugerir para {c.cls.name}
            </button>
          )}
          {build.statMethod === 'pointbuy' && (
            <span className={`badge ${pointsSpent > POINT_BUDGET ? 'badge-danger' : 'badge'}`}>
              {POINT_BUDGET - pointsSpent} de {POINT_BUDGET} pontos restantes
            </span>
          )}
        </div>
        {build.statMethod === 'roll4d6' && pool.length > 0 && (
          <p className="text-[13px] text-fg-muted">Valores rolados: {pool.join(', ')}</p>
        )}
      </Section>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Atributo</th>
              <th className="w-40">Base</th>
              <th className="text-center">Antecedente</th>
              <th className="text-center">Aumentos</th>
              <th className="text-center">Total</th>
              <th className="text-center">Modificador</th>
            </tr>
          </thead>
          <tbody>
            {ABILITIES.map((a) => {
              const base = build.baseScores[a.id];
              const bg = c.backgroundBonus[a.id] || 0;
              const total = c.scores[a.id];
              const other = total - base - bg;
              const isPrimary = c.cls.primaryAbilities.includes(a.id);
              return (
                <tr key={a.id}>
                  <td>
                    <span className="font-medium">{a.name}</span>
                    {isPrimary && <span className="badge badge-accent ml-2">Principal</span>}
                  </td>
                  <td>
                    {build.statMethod === 'standard' || build.statMethod === 'roll4d6' ? (
                      <select value={base} onChange={(e) => assign(a.id, Number(e.target.value))} className="input h-8 w-24" aria-label={`Valor base de ${a.name}`}>
                        {pool.map((v, i) => (
                          <option key={`${v}-${i}`} value={v}>
                            {v}
                          </option>
                        ))}
                        {!pool.includes(base) && <option value={base}>{base}</option>}
                      </select>
                    ) : build.statMethod === 'pointbuy' ? (
                      <div className="flex items-center gap-1">
                        <button type="button" className="btn btn-secondary btn-icon h-7 w-7" onClick={() => stepPoint(a.id, -1)} aria-label={`Diminuir ${a.name}`}>
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center tabular-nums">{base}</span>
                        <button type="button" className="btn btn-secondary btn-icon h-7 w-7" onClick={() => stepPoint(a.id, 1)} aria-label={`Aumentar ${a.name}`}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={base}
                        onChange={(e) => update({ baseScores: { ...build.baseScores, [a.id]: Math.max(1, Math.min(30, Number(e.target.value) || 1)) } })}
                        className="input h-8 w-20"
                        aria-label={`Valor base de ${a.name}`}
                      />
                    )}
                  </td>
                  <td className="text-center tabular-nums text-fg-muted">{bg ? `+${bg}` : '—'}</td>
                  <td className="text-center tabular-nums text-fg-muted">{other > 0 ? `+${other}` : '—'}</td>
                  <td className="text-center tabular-nums font-semibold">{total}</td>
                  <td className="text-center tabular-nums">{formatModifier(abilityModifier(total))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {c.asiLevels.length > 0 && (
        <Section
          title="Aumentos de atributo e talentos"
          description={`Nos níveis ${c.asiLevels.join(', ')} você escolhe Aumento no Valor de Atributo (+2 em um ou +1 em dois) ou um talento.`}
        >
          <div className="space-y-4">
            {c.asiLevels.map((lvl) => {
              const choice = build.asi.find((a) => a.level === lvl);
              const isEpic = lvl === 19;
              const type = choice?.type || (isEpic ? 'feat' : 'asi');
              const total = choice ? Object.values(choice.increases).reduce((s, v) => s + (v || 0), 0) : 0;
              const general = GENERAL_FEATS.filter((f) => f.id !== 'ability-score-improvement');
              const featList = isEpic ? [...EPIC_BOONS, ...general] : [...general, ...ORIGIN_FEATS];
              const instance = c.featInstances.find((f) => f.key === `asi-${lvl}`);
              const feat = choice?.featId ? FEATS_BY_ID[choice.featId] : undefined;
              return (
                <div key={lvl} className="card p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-fg">Nível {lvl}{isEpic ? ' — Dádiva Épica' : ''}</span>
                    {!isEpic && (
                      <div className="segmented">
                        <button type="button" onClick={() => setAsi(lvl, { type: 'asi', featId: undefined, increases: {} })} className={`segmented-item ${type === 'asi' ? 'segmented-item-active' : ''}`}>
                          Aumento de atributo
                        </button>
                        <button type="button" onClick={() => setAsi(lvl, { type: 'feat', increases: {} })} className={`segmented-item ${type === 'feat' ? 'segmented-item-active' : ''}`}>
                          Talento
                        </button>
                      </div>
                    )}
                  </div>
                  {type === 'asi' ? (
                    <div className="space-y-2">
                      <p className="text-[13px] text-fg-muted">Distribua 2 pontos ({total}/2). Clique novamente para remover.</p>
                      <div className="flex flex-wrap gap-2">
                        {ABILITIES.map((a) => {
                          const inc = choice?.increases[a.id] || 0;
                          return (
                            <ChoiceChip
                              key={a.id}
                              selected={inc > 0}
                              onClick={() => {
                                const incs = { ...(choice?.increases || {}) };
                                const cur = incs[a.id] || 0;
                                if (total >= 2 && cur === 0) return;
                                const nextVal = total < 2 ? cur + 1 : 0;
                                if (nextVal === 0 || cur >= 2) delete incs[a.id];
                                else incs[a.id] = nextVal;
                                setAsi(lvl, { type: 'asi', increases: incs });
                              }}
                            >
                              {a.name}
                              {inc > 0 ? ` +${inc}` : ''}
                            </ChoiceChip>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <OptionPicker
                        single
                        options={featList.map((f) => ({ id: f.id, name: f.name, description: f.description, prerequisite: f.prerequisite }))}
                        selected={choice?.featId ? [choice.featId] : []}
                        onToggle={(id) => setAsi(lvl, { type: 'feat', featId: choice?.featId === id ? undefined : id, increases: {} })}
                      />
                      {feat && (feat.id === 'magic-initiate' || feat.id === 'skilled') && (
                        <OriginFeatConfig {...{ build, c, update }} featId={feat.id} sourceKey={`asi-${lvl}`} />
                      )}
                      {instance && instance.feat.effects && <FeatChoices {...{ build, c, update }} instance={instance} />}
                      {feat?.abilityIncrease && (
                        <div>
                          <span className="label">Aumento de +1 do talento</span>
                          <div className="flex flex-wrap gap-2">
                            {feat.abilityIncrease.map((ab) => (
                              <ChoiceChip key={ab} selected={Boolean(choice?.increases[ab])} onClick={() => setAsi(lvl, { increases: { [ab]: 1 } })}>
                                {ABILITY_NAME[ab]}
                              </ChoiceChip>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
};
