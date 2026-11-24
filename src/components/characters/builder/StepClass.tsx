import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { CLASSES, CLASSES_BY_ID, ABILITY_NAME, SKILL_NAME } from '../../../data/dnd2024';
import type { ClassId } from '../../../data/dnd2024';
import { casterKind } from '../../../rules/engine';
import { useConfirm } from '../../common/Modal';
import { MasterDetail, OptionCard, Section, FeatureList } from '../ui';
import type { StepProps } from './shared';

const CASTER_LABEL: Record<string, string> = {
  full: 'Conjurador completo',
  half: 'Meio-conjurador',
  pact: 'Magia de Pacto',
  none: 'Não conjurador',
};

export const StepClass: React.FC<StepProps> = ({ build, c, update }) => {
  const confirm = useConfirm();
  const hasClassChoices =
    build.classSkills.length + build.cantrips.length + build.prepared.length + build.spellbook.length + build.weaponMasteries.length + build.asi.length + Object.keys(build.options).length > 0;
  const setLevel = (lvl: number) => update({ level: Math.max(1, Math.min(20, lvl)) });

  const selectClass = async (id: string) => {
    if (id === build.classId) return;
    if (hasClassChoices) {
      const ok = await confirm({
        title: `Trocar para ${CLASSES_BY_ID[id as ClassId].name}?`,
        message: 'As escolhas de perícias, magias, maestrias e talentos da classe atual serão descartadas.',
        confirmLabel: 'Trocar de classe',
      });
      if (!ok) return;
    }
    // Trocar de classe invalida escolhas específicas da classe anterior.
    update({
      classId: id as ClassId,
      subclassId: undefined,
      classSkills: [],
      expertise: [],
      options: {},
      fightingStyles: [],
      weaponMasteries: [],
      classToolChoices: [],
      cantrips: [],
      prepared: [],
      spellbook: [],
      asi: [],
      classEquipment: 'A',
    });
  };

  return (
    <div className="space-y-8">
      <Section
        title="Nível"
        description="Personagens novos normalmente começam no nível 1. O Mestre pode autorizar um nível maior."
      >
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-secondary btn-icon" onClick={() => setLevel(build.level - 1)} aria-label="Diminuir nível">
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="number"
            min={1}
            max={20}
            value={build.level}
            onChange={(e) => setLevel(Number(e.target.value) || 1)}
            className="input w-20 text-center tabular-nums"
            aria-label="Nível do personagem"
          />
          <button type="button" className="btn btn-secondary btn-icon" onClick={() => setLevel(build.level + 1)} aria-label="Aumentar nível">
            <Plus className="w-4 h-4" />
          </button>
          <span className="text-[13px] text-fg-muted ml-2">Bônus de Proficiência +{c.proficiencyBonus}</span>
        </div>
      </Section>

      <Section title="Classe">
        <MasterDetail
          searchPlaceholder="Buscar classe"
          items={CLASSES.map((cl) => ({
            id: cl.id,
            title: cl.name,
            subtitle: `d${cl.hitDie} · ${cl.primaryAbilities.map((a) => ABILITY_NAME[a]).join(' ou ')}`,
            keywords: cl.nameEn,
          }))}
          selectedId={build.classId}
          renderDetail={(id) => {
            const cl = CLASSES_BY_ID[id as ClassId];
            const kind = casterKind(cl.id);
            const preview = cl.features.filter((f) => f.level <= Math.max(build.level, 1));
            return (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-fg">{cl.name}</h3>
                    <span className="badge">{CASTER_LABEL[kind]}</span>
                  </div>
                  <p className="text-[13px] text-fg-muted mt-1 leading-relaxed">{cl.summary}</p>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
                  <div>
                    <dt className="text-xs text-fg-subtle">Dado de Vida</dt>
                    <dd className="text-fg">d{cl.hitDie}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-fg-subtle">Atributo principal</dt>
                    <dd className="text-fg">{cl.primaryAbilities.map((a) => ABILITY_NAME[a]).join(' ou ')}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-fg-subtle">Testes de resistência</dt>
                    <dd className="text-fg">{cl.savingThrows.map((a) => ABILITY_NAME[a]).join(', ')}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-fg-subtle">Perícias</dt>
                    <dd className="text-fg">
                      Escolha {cl.skillChoices.count}: {cl.skillChoices.options.length >= 18 ? 'qualquer perícia' : cl.skillChoices.options.map((s) => SKILL_NAME[s]).join(', ')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-fg-subtle">Armaduras</dt>
                    <dd className="text-fg">{cl.armorTraining.join(', ') || 'Nenhuma'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-fg-subtle">Armas</dt>
                    <dd className="text-fg">{cl.weaponProficiencies.join(', ')}</dd>
                  </div>
                </dl>
                <div className="space-y-2">
                  <h4 className="text-[13px] font-medium text-fg-muted">
                    Características até o nível {build.level}
                  </h4>
                  <FeatureList features={preview} />
                </div>
                {id !== build.classId && (
                  <button type="button" className="btn btn-primary" onClick={() => selectClass(id)}>
                    Escolher {cl.name}
                  </button>
                )}
              </div>
            );
          }}
        />
      </Section>

      {build.level >= 3 ? (
        <Section title="Subclasse" description={`Disponível a partir do nível 3.`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {c.cls.subclasses.map((sc) => (
              <OptionCard
                key={sc.id}
                selected={build.subclassId === sc.id}
                onClick={() => update({ subclassId: sc.id })}
                title={sc.name}
                subtitle={sc.summary}
              >
                {build.subclassId === sc.id && (
                  <ul className="text-[13px] text-fg-muted space-y-0.5">
                    {sc.features
                      .filter((f) => f.level <= build.level)
                      .map((f) => (
                        <li key={f.name}>
                          <span className="text-fg-subtle tabular-nums">Nv. {f.level}</span> · {f.name}
                        </li>
                      ))}
                  </ul>
                )}
              </OptionCard>
            ))}
          </div>
        </Section>
      ) : (
        <p className="text-[13px] text-fg-subtle">A subclasse é escolhida no nível 3.</p>
      )}
    </div>
  );
};
