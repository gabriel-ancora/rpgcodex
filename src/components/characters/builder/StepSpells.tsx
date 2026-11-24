import React, { useMemo } from 'react';
import { ABILITY_NAME, SPELLS_BY_ID, formatModifier } from '../../../data/dnd2024';
import { spellsForLists, mysticArcanumMaxLevel } from '../../../rules/engine';

import { CountBadge, Section, SpellPicker, circleLabel } from '../ui';
import { toggleInList, type StepProps } from './shared';

export const StepSpells: React.FC<StepProps> = ({ build, c, update }) => {
  const granted = c.grantedSpells;
  const lockedMap = useMemo(() => Object.fromEntries(granted.map((g) => [g.spell.id, g.source])), [granted]);
  const grantedIds = new Set(granted.map((g) => g.spell.id));

  const cantripPool = useMemo(
    () => (c.cantripLimit > 0 ? spellsForLists(c.classSpellLists.slice(0, 1), 0, 0) : []),
    [c.cantripLimit, c.classSpellLists]
  );
  const leveledPool = useMemo(
    () => (c.maxSpellCircle > 0 ? spellsForLists(c.classSpellLists, c.maxSpellCircle, 1) : []),
    [c.maxSpellCircle, c.classSpellLists]
  );

  const cantrips = build.cantrips.filter((id) => !grantedIds.has(id));
  const prepared = build.prepared.filter((id) => !grantedIds.has(id));
  const isWizard = c.cls.id === 'wizard';
  const preparedPool = isWizard ? leveledPool.filter((s) => build.spellbook.includes(s.id)) : leveledPool;
  const arcanumMax = c.cls.id === 'warlock' ? mysticArcanumMaxLevel(c.level) : 0;
  const arcanum = build.options['mystic-arcanum'] || [];

  const slotSummary = useMemo(() => {
    const s = c.spellSlots;
    if (s.pactSlots) return `${s.pactSlots.max} espaço(s) de ${s.pactSlots.level}º círculo (recuperados em Descanso Curto)`;
    const parts = (['level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9'] as const)
      .map((k, i) => ({ n: s[k]?.max || 0, l: i + 1 }))
      .filter((x) => x.n > 0)
      .map((x) => `${x.l}º: ${x.n}`);
    return parts.join(' · ');
  }, [c.spellSlots]);

  const hasClassCasting = c.casterKind !== 'none';

  if (!hasClassCasting && granted.length === 0) {
    return (
      <p className="text-[13px] text-fg-subtle">
        Este personagem não conjura magias. Espécies, antecedentes e talentos que concedem magias aparecem aqui automaticamente.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {hasClassCasting && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card px-3 py-2.5">
            <div className="text-xs text-fg-subtle">Atributo</div>
            <div className="text-sm font-semibold text-fg">{c.spellcastingAbility ? ABILITY_NAME[c.spellcastingAbility] : '—'}</div>
          </div>
          <div className="card px-3 py-2.5">
            <div className="text-xs text-fg-subtle">CD de resistência</div>
            <div className="text-sm font-semibold text-fg tabular-nums">{c.spellSaveDc}</div>
          </div>
          <div className="card px-3 py-2.5">
            <div className="text-xs text-fg-subtle">Ataque mágico</div>
            <div className="text-sm font-semibold text-fg tabular-nums">{formatModifier(c.spellAttack || 0)}</div>
          </div>
          <div className="card px-3 py-2.5">
            <div className="text-xs text-fg-subtle">Espaços de magia</div>
            <div className="text-[13px] font-medium text-fg">{slotSummary || '—'}</div>
          </div>
        </div>
      )}

      {granted.length > 0 && (
        <Section
          title="Magias concedidas automaticamente"
          description="Vêm da espécie, do antecedente, da classe ou da subclasse. Ficam sempre preparadas e não contam no limite."
        >
          <ul className="card divide-y divide-line">
            {granted.map((g) => (
              <li key={g.spell.id} className="px-3 py-2 flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="text-sm text-fg">{g.spell.name}</span>
                  <span className="text-xs text-fg-subtle block">
                    {g.source}
                    {g.note ? ` · ${g.note}` : ''}
                  </span>
                </span>
                <span className="text-xs text-fg-muted shrink-0">{circleLabel(g.spell.level)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {c.cantripLimit > 0 && (
        <Section title="Truques" aside={<CountBadge value={cantrips.length} max={c.cantripLimit} />}>
          <SpellPicker
            spells={cantripPool}
            selected={cantrips}
            locked={lockedMap}
            max={c.cantripLimit}
            showLevelFilter={false}
            onToggle={(id) => update({ cantrips: toggleInList(cantrips, id, c.cantripLimit) })}
          />
        </Section>
      )}

      {isWizard && c.spellbookSize > 0 && (
        <Section
          title="Grimório"
          description="O Mago começa com 6 magias de 1º círculo e adiciona 2 a cada nível. Magias copiadas de pergaminhos podem ser incluídas com o Mestre."
          aside={<CountBadge value={build.spellbook.length} max={c.spellbookSize} />}
        >
          <SpellPicker
            spells={leveledPool}
            selected={build.spellbook}
            max={c.spellbookSize}
            onToggle={(id) =>
              update((b) => {
                const spellbook = toggleInList(b.spellbook, id, c.spellbookSize);
                return { spellbook, prepared: b.prepared.filter((p) => spellbook.includes(p)) };
              })
            }
          />
        </Section>
      )}

      {c.preparedLimit > 0 && (
        <Section
          title={isWizard ? 'Magias preparadas (do grimório)' : 'Magias preparadas'}
          description={
            c.cls.id === 'bard' && c.level >= 10
              ? 'Segredos Mágicos: você pode preparar magias das listas de Bardo, Clérigo, Druida e Mago.'
              : `Até o ${c.maxSpellCircle}º círculo. Você pode trocar magias preparadas conforme as regras da classe.`
          }
          aside={<CountBadge value={prepared.length} max={c.preparedLimit} />}
        >
          <SpellPicker
            spells={preparedPool}
            selected={prepared}
            locked={lockedMap}
            max={c.preparedLimit}
            emptyText={isWizard ? 'Adicione magias ao grimório primeiro.' : 'Nenhuma magia disponível.'}
            onToggle={(id) => update({ prepared: toggleInList(prepared, id, c.preparedLimit) })}
          />
        </Section>
      )}

      {arcanumMax >= 6 && (
        <Section
          title="Arcana Mística"
          description="Uma magia de cada círculo, do 6º até o liberado pelo seu nível, conjurável uma vez por Descanso Longo sem gastar espaço."
          aside={<CountBadge value={arcanum.length} max={arcanumMax - 5} />}
        >
          <SpellPicker
            spells={spellsForLists(['warlock'], arcanumMax, 6)}
            selected={arcanum}
            onToggle={(id) =>
              update((b) => {
                const current = b.options['mystic-arcanum'] || [];
                const lvl = SPELLS_BY_ID[id]?.level;
                const without = current.filter((x) => SPELLS_BY_ID[x]?.level !== lvl);
                const next = current.includes(id) ? without : [...without, id];
                return { options: { ...b.options, 'mystic-arcanum': next } };
              })
            }
          />
        </Section>
      )}
    </div>
  );
};
