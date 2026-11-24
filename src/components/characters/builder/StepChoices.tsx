import React from 'react';
import {
  SKILL_NAME,
  SKILLS,
  ITEMS,
  FIGHTING_STYLE_FEATS,
  MUSICAL_INSTRUMENTS,
  ARTISAN_TOOLS,
  WEAPON_MASTERIES,
  isWeapon,
} from '../../../data/dnd2024';
import type { SkillId } from '../../../data/dnd2024';
import { classToolChoiceRule } from '../../../rules/engine';
import { ChoiceChip, CountBadge, OptionPicker, Section } from '../ui';
import { toggleInList, type StepProps } from './shared';
import { FeatChoices } from './FeatChoices';

/** Armas elegíveis para Maestria conforme a classe. */
function masteryWeapons(classId: string) {
  return ITEMS.filter((i) => {
    if (!isWeapon(i) || !i.mastery) return false;
    if (classId === 'barbarian') return i.kind.endsWith('melee');
    if (classId === 'rogue') {
      const simple = i.kind.startsWith('simple');
      const props = i.properties || '';
      return simple || props.includes('Acuidade') || props.includes('Leve');
    }
    return true;
  });
}

export const StepChoices: React.FC<StepProps> = ({ build, c, update }) => {
  const fixedSkills = new Set<SkillId>(c.fixedSkills);
  const classSkillsChosen = build.classSkills.filter((s) => c.skillChoiceOptions.includes(s));
  const toolRule = classToolChoiceRule(c.cls.id);
  const groups = c.optionGroups;
  const weapons = masteryWeapons(c.cls.id);

  return (
    <div className="space-y-8">
      <Section
        title="Perícias da classe"
        description={`Escolha ${c.skillChoiceCount}. Perícias já concedidas pelo antecedente ou espécie aparecem travadas.`}
        aside={<CountBadge value={classSkillsChosen.length} max={c.skillChoiceCount} />}
      >
        <div className="flex flex-wrap gap-2">
          {c.skillChoiceOptions.map((sid) => {
            const locked = fixedSkills.has(sid);
            const selected = build.classSkills.includes(sid);
            return (
              <ChoiceChip
                key={sid}
                selected={selected || locked}
                locked={locked}
                title={locked ? 'Já concedida pelo antecedente ou espécie' : undefined}
                disabled={!selected && classSkillsChosen.length >= c.skillChoiceCount}
                onClick={() => update({ classSkills: toggleInList(build.classSkills, sid, c.skillChoiceCount) })}
              >
                {SKILL_NAME[sid]}
              </ChoiceChip>
            );
          })}
        </div>
      </Section>

      {c.expertise.count > 0 && (
        <Section
          title="Especialização"
          description="Dobra o bônus de proficiência. Escolha entre perícias em que você já é proficiente."
          aside={<CountBadge value={c.skillExpertise.length} max={c.expertise.count} />}
        >
          <div className="flex flex-wrap gap-2">
            {SKILLS.filter((s) => c.skillProficiencies.includes(s.id))
              .filter((s) => !c.expertise.options || c.expertise.options.includes(s.id))
              .map((s) => {
                const selected = build.expertise.includes(s.id);
                return (
                  <ChoiceChip
                    key={s.id}
                    selected={selected}
                    disabled={!selected && c.skillExpertise.length >= c.expertise.count}
                    onClick={() => update({ expertise: toggleInList(build.expertise, s.id, c.expertise.count) })}
                  >
                    {s.name}
                  </ChoiceChip>
                );
              })}
          </div>
          {c.skillProficiencies.length === 0 && <p className="text-[13px] text-fg-subtle">Escolha as perícias primeiro.</p>}
        </Section>
      )}

      {c.jackOfAllTrades && (
        <div className="card-muted p-3 text-[13px] text-fg-muted">
          <span className="font-medium text-fg">Versatilidade.</span> Você soma metade do Bônus de Proficiência (arredondado para baixo) a qualquer teste
          de atributo que não use a sua proficiência, incluindo Iniciativa. Isso já está aplicado na ficha.
        </div>
      )}

      {c.fightingStyleCount > 0 && (
        <Section
          title="Estilo de Luta"
          description="Talento de Estilo de Luta concedido pela classe."
          aside={<CountBadge value={build.fightingStyles.length} max={c.fightingStyleCount} />}
        >
          <OptionPicker
            options={FIGHTING_STYLE_FEATS.filter((f) => !f.classes || f.classes.includes(c.cls.id)).map((f) => ({ id: f.id, name: f.name, description: f.description }))}
            selected={build.fightingStyles}
            max={c.fightingStyleCount}
            single={c.fightingStyleCount === 1}
            onToggle={(id) => update({ fightingStyles: toggleInList(build.fightingStyles, id, c.fightingStyleCount) })}
          />
        </Section>
      )}

      {c.featInstances
        .filter((f) => f.key.startsWith('style-') && f.feat.effects)
        .map((f) => (
          <Section key={f.key} title={`Estilo de Luta: ${f.feat.name}`}>
            <FeatChoices {...{ build, c, update }} instance={f} />
          </Section>
        ))}

      {c.weaponMasteryCount > 0 && (
        <Section
          title="Maestria em Armas"
          description="Você usa a propriedade de Maestria das armas escolhidas. Pode trocar uma ao terminar um Descanso Longo."
          aside={<CountBadge value={build.weaponMasteries.length} max={c.weaponMasteryCount} />}
        >
          <OptionPicker
            options={weapons.map((w) => ({
              id: w.id,
              name: `${w.name} — ${w.mastery}`,
              description: `${w.damage}${w.properties ? ` · ${w.properties}` : ''}. ${WEAPON_MASTERIES[w.mastery || ''] || ''}`,
            }))}
            selected={build.weaponMasteries}
            max={c.weaponMasteryCount}
            onToggle={(id) => update({ weaponMasteries: toggleInList(build.weaponMasteries, id, c.weaponMasteryCount) })}
          />
        </Section>
      )}

      {groups.map((g) => {
        const max = g.countByLevel[c.level - 1] || 0;
        if (max <= 0) return null;
        const chosen = build.options[g.id] || [];
        return (
          <Section key={g.id} title={g.name} aside={<CountBadge value={chosen.length} max={max} />}>
            <OptionPicker
              single={max === 1}
              max={max}
              options={g.options.map((o) => ({
                ...o,
                disabled: typeof o.minLevel === 'number' && o.minLevel > c.level,
              }))}
              selected={chosen}
              onToggle={(id) => update((b) => ({ options: { ...b.options, [g.id]: toggleInList(b.options[g.id] || [], id, max) } }))}
            />
          </Section>
        );
      })}

      {toolRule && (
        <Section
          title={toolRule.kind === 'instrument' ? 'Instrumentos musicais' : 'Ferramenta ou instrumento'}
          aside={<CountBadge value={build.classToolChoices.length} max={toolRule.count} />}
        >
          <div className="flex flex-wrap gap-2">
            {(toolRule.kind === 'instrument' ? MUSICAL_INSTRUMENTS : [...ARTISAN_TOOLS, ...MUSICAL_INSTRUMENTS]).map((t) => {
              const selected = build.classToolChoices.includes(t);
              return (
                <ChoiceChip
                  key={t}
                  selected={selected}
                  disabled={!selected && build.classToolChoices.length >= toolRule.count}
                  onClick={() => update({ classToolChoices: toggleInList(build.classToolChoices, t, toolRule.count) })}
                >
                  {t}
                </ChoiceChip>
              );
            })}
          </div>
        </Section>
      )}

      {c.fightingStyleCount === 0 && c.weaponMasteryCount === 0 && groups.length === 0 && c.expertise.count === 0 && !toolRule && (
        <p className="text-[13px] text-fg-subtle">Esta classe não tem outras escolhas neste nível além das perícias.</p>
      )}
    </div>
  );
};
