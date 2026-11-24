import React from 'react';
import { ARTISAN_TOOLS, MUSICAL_INSTRUMENTS, OTHER_TOOLS, SKILLS, SPELLS, SKILL_NAME } from '../../../data/dnd2024';
import type { SkillId } from '../../../data/dnd2024';
import type { FeatInstance } from '../../../rules/engine';
import { spellsForLists } from '../../../rules/engine';
import { ChoiceChip, CountBadge, Section, SpellPicker } from '../ui';
import { toggleInList, type StepProps } from './shared';

/**
 * Editor das escolhas mecânicas de um talento (perícia, Especialização, ferramentas,
 * truques de Guerreiro Abençoado/Druídico e magia de Tocado pelas Fadas/Sombras).
 * Iniciado em Magia e Habilidoso têm editores próprios na etapa Origem.
 */
export const FeatChoices: React.FC<StepProps & { instance: FeatInstance }> = ({ build, c, update, instance }) => {
  const eff = instance.feat.effects;
  if (!eff) return null;
  const key = instance.key;
  const ch = build.featChoices[key] || {};
  const set = (patch: Partial<typeof ch>) => update((b) => ({ featChoices: { ...b.featChoices, [key]: { ...(b.featChoices[key] || {}), ...patch } } }));

  const picks = ch.picks || [];
  const blocks: React.ReactNode[] = [];

  if (eff.skillChoice) {
    const options = (eff.skillChoice.options || SKILLS.map((s) => s.id)) as SkillId[];
    const max = eff.skillChoice.count;
    blocks.push(
      <Section key="skill" title="Perícia" aside={<CountBadge value={picks.length} max={max} />}>
        <div className="flex flex-wrap gap-2">
          {options.map((sid) => (
            <ChoiceChip
              key={sid}
              selected={picks.includes(sid)}
              disabled={picks.length >= max}
              onClick={() => set({ picks: toggleInList(picks, sid, max) })}
              title={eff.skillChoice?.expertiseIfProficient && c.fixedSkills.includes(sid) ? 'Já proficiente: vira Especialização' : undefined}
            >
              {SKILL_NAME[sid]}
              {eff.skillChoice?.expertiseIfProficient && c.fixedSkills.includes(sid) ? ' (Especialização)' : ''}
            </ChoiceChip>
          ))}
        </div>
      </Section>
    );
  }

  if (eff.expertiseChoice) {
    const exp = ch.expertise || [];
    blocks.push(
      <Section key="exp" title="Especialização" description="Escolha entre perícias em que você já é proficiente." aside={<CountBadge value={exp.length} max={eff.expertiseChoice} />}>
        <div className="flex flex-wrap gap-2">
          {SKILLS.filter((s) => c.skillProficiencies.includes(s.id)).map((s) => (
            <ChoiceChip
              key={s.id}
              selected={exp.includes(s.id)}
              disabled={exp.length >= eff.expertiseChoice!}
              onClick={() => set({ expertise: toggleInList(exp, s.id, eff.expertiseChoice) })}
            >
              {s.name}
            </ChoiceChip>
          ))}
        </div>
      </Section>
    );
  }

  if (eff.toolChoice) {
    const max = eff.toolChoice.count;
    const pool = eff.toolChoice.kind === 'artisan' ? ARTISAN_TOOLS : eff.toolChoice.kind === 'instrument' ? MUSICAL_INSTRUMENTS : [...ARTISAN_TOOLS, ...MUSICAL_INSTRUMENTS, ...OTHER_TOOLS];
    blocks.push(
      <Section key="tool" title="Ferramentas" aside={<CountBadge value={picks.length} max={max} />}>
        <div className="flex flex-wrap gap-2">
          {pool.map((t) => (
            <ChoiceChip key={t} selected={picks.includes(t)} disabled={picks.length >= max} onClick={() => set({ picks: toggleInList(picks, t, max) })}>
              {t}
            </ChoiceChip>
          ))}
        </div>
      </Section>
    );
  }

  if (eff.cantripChoice) {
    const max = eff.cantripChoice.count;
    blocks.push(
      <Section key="cantrip" title="Truques" aside={<CountBadge value={picks.length} max={max} />}>
        <SpellPicker spells={spellsForLists([eff.cantripChoice.list], 0, 0)} selected={picks} max={max} showLevelFilter={false} onToggle={(id) => set({ picks: toggleInList(picks, id, max) })} />
      </Section>
    );
  }

  if (eff.spellChoice) {
    const pool = SPELLS.filter((s) => s.level === eff.spellChoice!.level && eff.spellChoice!.schools.includes(s.school));
    blocks.push(
      <Section key="spell" title={`Magia de ${eff.spellChoice.level}º círculo (${eff.spellChoice.schools.join(' ou ')})`} aside={<CountBadge value={ch.spell ? 1 : 0} max={1} />}>
        <SpellPicker spells={pool} selected={ch.spell ? [ch.spell] : []} max={1} showLevelFilter={false} onToggle={(id) => set({ spell: ch.spell === id ? undefined : id })} />
      </Section>
    );
  }

  if (blocks.length === 0) return null;
  return <div className="card p-4 space-y-5">{blocks}</div>;
};
