import React, { useMemo, useState } from 'react';
import {
  BACKGROUNDS,
  BACKGROUNDS_BY_ID,
  SPECIES,
  SPECIES_BY_ID,
  FEATS_BY_ID,
  ORIGIN_FEATS,
  ABILITY_NAME,
  SKILLS,
  SKILL_NAME,
  STANDARD_LANGUAGES,
  RARE_LANGUAGES,
  ARTISAN_TOOLS,
  MUSICAL_INSTRUMENTS,
  GAMING_SETS,
  OTHER_TOOLS,
  SPELLS_BY_ID,
  feetToMeters,
  describeEquipmentOption,
} from '../../../data/dnd2024';
import type { Ability, SkillId } from '../../../data/dnd2024';
import { spellsForLists } from '../../../rules/engine';
import type { MagicInitiateChoice } from '../../../rules/build';
import { useConfirm } from '../../common/Modal';
import { ChoiceChip, CountBadge, MasterDetail, OptionCard, OptionPicker, Section, SpellPicker } from '../ui';
import { toggleInList, type StepProps } from './shared';
import { FeatChoices } from './FeatChoices';

type OriginTab = 'background' | 'species' | 'languages';

const LIST_LABEL = { cleric: 'Clérigo', druid: 'Druida', wizard: 'Mago' } as const;
const CASTING_ABILITIES: Ability[] = ['int', 'wis', 'cha'];

/** Configuração dos talentos de origem que exigem escolhas. */
export const OriginFeatConfig: React.FC<
  StepProps & { featId: string; sourceKey: string; fixedList?: 'cleric' | 'druid' | 'wizard' }
> = ({ build, update, featId, sourceKey, fixedList }) => {
  if (featId === 'magic-initiate') {
    const current: MagicInitiateChoice = build.magicInitiate[sourceKey] || {
      list: fixedList || 'wizard',
      ability: fixedList === 'wizard' ? 'int' : fixedList ? 'wis' : 'int',
      cantrips: [],
      spell: '',
    };
    const list = fixedList || current.list;
    const set = (patch: Partial<MagicInitiateChoice>) =>
      update((b) => ({ magicInitiate: { ...b.magicInitiate, [sourceKey]: { ...current, list, ...patch } } }));
    const cantrips = spellsForLists([list], 0, 0);
    const level1 = spellsForLists([list], 1, 1);
    return (
      <div className="space-y-5 card p-4">
        <div className="flex flex-wrap items-end gap-4">
          {!fixedList && (
            <div>
              <span className="label">Lista de magias</span>
              <div className="segmented">
                {(['cleric', 'druid', 'wizard'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => set({ list: l, cantrips: [], spell: '' })}
                    className={`segmented-item ${list === l ? 'segmented-item-active' : ''}`}
                  >
                    {LIST_LABEL[l]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <span className="label">Atributo de conjuração</span>
            <div className="segmented">
              {CASTING_ABILITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => set({ ability: a })}
                  className={`segmented-item ${current.ability === a ? 'segmented-item-active' : ''}`}
                >
                  {ABILITY_NAME[a]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Section title={`Truques de ${LIST_LABEL[list]}`} aside={<CountBadge value={current.cantrips.length} max={2} />}>
          <SpellPicker
            spells={cantrips}
            selected={current.cantrips}
            max={2}
            showLevelFilter={false}
            onToggle={(id) => set({ cantrips: toggleInList(current.cantrips, id, 2) })}
          />
        </Section>
        <Section title="Magia de 1º círculo" aside={<CountBadge value={current.spell ? 1 : 0} max={1} />}>
          <SpellPicker
            spells={level1}
            selected={current.spell ? [current.spell] : []}
            max={1}
            showLevelFilter={false}
            onToggle={(id) => set({ spell: current.spell === id ? '' : id })}
          />
        </Section>
      </div>
    );
  }

  if (featId === 'skilled') {
    const chosen = build.skilledChoices[sourceKey] || [];
    const toggle = (v: string) =>
      update((b) => ({ skilledChoices: { ...b.skilledChoices, [sourceKey]: toggleInList(chosen, v, 3) } }));
    const tools = [...ARTISAN_TOOLS, ...MUSICAL_INSTRUMENTS, ...OTHER_TOOLS];
    return (
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-fg-muted">Escolha 3 perícias ou ferramentas em qualquer combinação.</span>
          <CountBadge value={chosen.length} max={3} />
        </div>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((s) => (
            <ChoiceChip key={s.id} selected={chosen.includes(s.id)} disabled={chosen.length >= 3} onClick={() => toggle(s.id)}>
              {s.name}
            </ChoiceChip>
          ))}
        </div>
        <details className="text-[13px]">
          <summary className="cursor-pointer text-fg-muted">Ferramentas e instrumentos</summary>
          <div className="flex flex-wrap gap-2 mt-3">
            {tools.map((t) => (
              <ChoiceChip key={t} selected={chosen.includes(t)} disabled={chosen.length >= 3} onClick={() => toggle(t)}>
                {t}
              </ChoiceChip>
            ))}
          </div>
        </details>
      </div>
    );
  }
  return null;
};

export const StepOrigin: React.FC<StepProps> = (props) => {
  const { build, c, update } = props;
  const [tab, setTab] = useState<OriginTab>('background');
  const confirm = useConfirm();
  const bg = c.background;
  const species = c.species;

  const toolOptions = useMemo(() => {
    if (!bg?.toolChoice) return [];
    return bg.toolChoice === 'artisan' ? ARTISAN_TOOLS : bg.toolChoice === 'instrument' ? MUSICAL_INSTRUMENTS : GAMING_SETS;
  }, [bg]);

  const selectBackground = async (id: string) => {
    if (id === build.backgroundId) return;
    if (build.backgroundId && (build.magicInitiate.background || (build.skilledChoices.background || []).length > 0)) {
      const ok = await confirm({ title: 'Trocar de antecedente?', message: 'As escolhas do talento de Origem atual serão descartadas.', confirmLabel: 'Trocar' });
      if (!ok) return;
    }
    const next = BACKGROUNDS_BY_ID[id];
    update((b) => ({
      backgroundId: id,
      abilityPlus2: next.abilities[0],
      abilityPlus1: next.abilities[1],
      backgroundToolChoice: undefined,
      backgroundEquipment: 'A',
      magicInitiate: { ...b.magicInitiate, background: undefined as unknown as MagicInitiateChoice },
      skilledChoices: { ...b.skilledChoices, background: [] },
    }));
  };

  const selectSpecies = async (id: string) => {
    if (id === build.speciesId) return;
    if (build.speciesId && (build.lineageId || build.speciesSkills.length > 0 || build.speciesFeat)) {
      const ok = await confirm({ title: 'Trocar de espécie?', message: 'A linhagem e as escolhas da espécie atual serão descartadas.', confirmLabel: 'Trocar' });
      if (!ok) return;
    }
    const next = SPECIES_BY_ID[id];
    update((b) => ({
      speciesId: id,
      lineageId: undefined,
      size: next.sizeOptions[0],
      speciesSkills: [],
      speciesFeat: undefined,
      speciesSpellAbility: next.lineage?.spellcastingAbilityChoice ? 'cha' : undefined,
      magicInitiate: { ...b.magicInitiate, species: undefined as unknown as MagicInitiateChoice },
      skilledChoices: { ...b.skilledChoices, species: [] },
    }));
  };

  const languagePool = [...STANDARD_LANGUAGES.filter((l) => l !== 'Comum'), ...RARE_LANGUAGES];

  return (
    <div className="space-y-6">
      <div className="tabs">
        {(
          [
            ['background', 'Antecedente'],
            ['species', 'Espécie'],
            ['languages', 'Idiomas'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`tab ${tab === id ? 'tab-active' : ''}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'background' && (
        <div className="space-y-8">
          <MasterDetail
            searchPlaceholder="Buscar antecedente"
            items={BACKGROUNDS.map((b) => ({
              id: b.id,
              title: b.name,
              subtitle: `${FEATS_BY_ID[b.feat]?.name} · ${b.abilities.map((a) => ABILITY_NAME[a].slice(0, 3)).join('/')}`,
              keywords: `${b.nameEn} ${b.skills.map((s) => SKILL_NAME[s]).join(' ')}`,
            }))}
            selectedId={build.backgroundId}
            emptyDetail={<p className="text-[13px] text-fg-subtle p-4">Selecione um antecedente para ver os detalhes.</p>}
            renderDetail={(id) => {
              const b = BACKGROUNDS_BY_ID[id];
              const feat = FEATS_BY_ID[b.feat];
              return (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-fg">{b.name}</h3>
                    <p className="text-[13px] text-fg-muted mt-1">{b.summary}</p>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
                    <div>
                      <dt className="text-xs text-fg-subtle">Valores de atributo</dt>
                      <dd className="text-fg">{b.abilities.map((a) => ABILITY_NAME[a]).join(', ')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-fg-subtle">Perícias</dt>
                      <dd className="text-fg">{b.skills.map((s) => SKILL_NAME[s]).join(', ')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-fg-subtle">Ferramenta</dt>
                      <dd className="text-fg">{b.tool}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-fg-subtle">Talento de Origem</dt>
                      <dd className="text-fg">
                        {feat?.name}
                        {b.magicInitiateList ? ` (${LIST_LABEL[b.magicInitiateList]})` : ''}
                      </dd>
                    </div>
                  </dl>
                  {feat && <p className="text-[13px] text-fg-muted leading-relaxed card-muted p-3">{feat.description}</p>}
                  <div className="text-[13px]">
                    <span className="text-xs text-fg-subtle block mb-1">Equipamento</span>
                    <p className="text-fg">A: {describeEquipmentOption(b.equipment[0])}</p>
                    <p className="text-fg">B: {b.equipment[1].gold} PO</p>
                  </div>
                  {id !== build.backgroundId && (
                    <button type="button" className="btn btn-primary" onClick={() => selectBackground(id)}>
                      Escolher {b.name}
                    </button>
                  )}
                </div>
              );
            }}
          />

          {bg && (
            <>
              <Section
                title="Aumento de atributos"
                description={`O antecedente aumenta ${bg.abilities.map((a) => ABILITY_NAME[a]).join(', ')}. Nenhum valor pode passar de 20.`}
              >
                <div className="segmented mb-3">
                  <button
                    type="button"
                    className={`segmented-item ${build.abilityBonusMode === '2-1' ? 'segmented-item-active' : ''}`}
                    onClick={() => update({ abilityBonusMode: '2-1' })}
                  >
                    +2 e +1
                  </button>
                  <button
                    type="button"
                    className={`segmented-item ${build.abilityBonusMode === '1-1-1' ? 'segmented-item-active' : ''}`}
                    onClick={() => update({ abilityBonusMode: '1-1-1' })}
                  >
                    +1 em cada
                  </button>
                </div>
                {build.abilityBonusMode === '2-1' ? (
                  <div className="space-y-2">
                    {([['abilityPlus2', '+2'], ['abilityPlus1', '+1']] as const).map(([key, label]) => (
                      <div key={key} className="flex flex-wrap items-center gap-2">
                        <span className="w-8 text-sm font-semibold text-fg tabular-nums">{label}</span>
                        {bg.abilities.map((a) => {
                          const other = key === 'abilityPlus2' ? build.abilityPlus1 : build.abilityPlus2;
                          return (
                            <ChoiceChip
                              key={a}
                              selected={build[key] === a}
                              onClick={() =>
                                update(
                                  other === a
                                    ? { [key]: a, [key === 'abilityPlus2' ? 'abilityPlus1' : 'abilityPlus2']: build[key] }
                                    : { [key]: a }
                                )
                              }
                            >
                              {ABILITY_NAME[a]}
                            </ChoiceChip>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-fg-muted">+1 em {bg.abilities.map((a) => ABILITY_NAME[a]).join(', ')}.</p>
                )}
              </Section>

              {bg.toolChoice && (
                <Section title="Proficiência em ferramenta">
                  <div className="flex flex-wrap gap-2">
                    {toolOptions.map((t) => (
                      <ChoiceChip key={t} selected={build.backgroundToolChoice === t} onClick={() => update({ backgroundToolChoice: t })}>
                        {t}
                      </ChoiceChip>
                    ))}
                  </div>
                </Section>
              )}

              {(bg.feat === 'magic-initiate' || bg.feat === 'skilled') && (
                <Section title={`Talento: ${FEATS_BY_ID[bg.feat].name}`}>
                  <OriginFeatConfig {...props} featId={bg.feat} sourceKey="background" fixedList={bg.magicInitiateList} />
                </Section>
              )}
              {c.featInstances
                .filter((f) => f.key === 'background' && f.feat.effects)
                .map((f) => (
                  <Section key={f.key} title={`Talento: ${f.feat.name}`}>
                    <FeatChoices {...props} instance={f} />
                  </Section>
                ))}
            </>
          )}
        </div>
      )}

      {tab === 'species' && (
        <div className="space-y-8">
          <MasterDetail
            searchPlaceholder="Buscar espécie"
            items={SPECIES.map((s) => ({
              id: s.id,
              title: s.name,
              subtitle: `${s.sizeOptions.join(' ou ')} · ${feetToMeters(s.speedFt)}`,
              keywords: s.nameEn,
            }))}
            selectedId={build.speciesId}
            emptyDetail={<p className="text-[13px] text-fg-subtle p-4">Selecione uma espécie para ver os traços.</p>}
            renderDetail={(id) => {
              const s = SPECIES_BY_ID[id];
              return (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-fg">{s.name}</h3>
                    <p className="text-[13px] text-fg-muted mt-1">{s.summary}</p>
                  </div>
                  <dl className="grid grid-cols-3 gap-4 text-[13px]">
                    <div>
                      <dt className="text-xs text-fg-subtle">Tipo</dt>
                      <dd className="text-fg">{s.creatureType}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-fg-subtle">Tamanho</dt>
                      <dd className="text-fg">{s.sizeOptions.join(' ou ')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-fg-subtle">Deslocamento</dt>
                      <dd className="text-fg">{feetToMeters(s.speedFt)}</dd>
                    </div>
                  </dl>
                  <ul className="card divide-y divide-line">
                    {s.traits.map((t) => (
                      <li key={t.name} className="px-3 py-2.5">
                        <div className="text-sm font-medium text-fg">
                          {t.name}
                          {t.level && t.level > 1 && <span className="text-xs text-fg-subtle font-normal ml-2">a partir do nível {t.level}</span>}
                        </div>
                        <p className="text-[13px] text-fg-muted leading-relaxed mt-0.5">{t.description}</p>
                      </li>
                    ))}
                  </ul>
                  {id !== build.speciesId && (
                    <button type="button" className="btn btn-primary" onClick={() => selectSpecies(id)}>
                      Escolher {s.name}
                    </button>
                  )}
                </div>
              );
            }}
          />

          {species && (
            <>
              {species.sizeOptions.length > 1 && (
                <Section title="Tamanho">
                  <div className="segmented">
                    {species.sizeOptions.map((sz) => (
                      <button key={sz} type="button" onClick={() => update({ size: sz })} className={`segmented-item ${(build.size || species.sizeOptions[0]) === sz ? 'segmented-item-active' : ''}`}>
                        {sz}
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {species.lineage && (
                <Section title={species.lineage.label}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {species.lineage.options.map((o) => (
                      <OptionCard
                        key={o.id}
                        selected={build.lineageId === o.id}
                        onClick={() => update({ lineageId: o.id })}
                        title={o.name}
                        subtitle={o.description}
                      >
                        {o.spells && build.lineageId === o.id && (
                          <p className="text-xs text-fg-subtle">
                            Magias: {o.spells.map((g) => `${SPELLS_BY_ID[g.spellId]?.name || g.spellId} (nv. ${g.level})`).join(', ')}
                          </p>
                        )}
                      </OptionCard>
                    ))}
                  </div>
                  {species.lineage.spellcastingAbilityChoice && (
                    <div className="mt-3">
                      <span className="label">Atributo de conjuração das magias da linhagem</span>
                      <div className="segmented">
                        {species.lineage.spellcastingAbilityChoice.map((a) => (
                          <button key={a} type="button" onClick={() => update({ speciesSpellAbility: a })} className={`segmented-item ${build.speciesSpellAbility === a ? 'segmented-item-active' : ''}`}>
                            {ABILITY_NAME[a]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {species.skillChoice && (
                <Section
                  title={`Perícia: ${species.skillChoice.label}`}
                  aside={<CountBadge value={build.speciesSkills.length} max={species.skillChoice.count} />}
                >
                  <div className="flex flex-wrap gap-2">
                    {(species.skillChoice.options === 'any' ? SKILLS.map((s) => s.id) : species.skillChoice.options).map((sid) => (
                      <ChoiceChip
                        key={sid}
                        selected={build.speciesSkills.includes(sid)}
                        onClick={() => update({ speciesSkills: toggleInList(build.speciesSkills, sid as SkillId, species.skillChoice!.count) })}
                      >
                        {SKILL_NAME[sid as SkillId]}
                      </ChoiceChip>
                    ))}
                  </div>
                </Section>
              )}

              {species.bonusOriginFeat && (
                <Section title="Talento de Origem (Versátil)" description="O Humano recebe um talento de Origem adicional.">
                  <OptionPicker
                    single
                    options={ORIGIN_FEATS.map((f) => ({ id: f.id, name: f.name, description: f.description }))}
                    selected={build.speciesFeat ? [build.speciesFeat] : []}
                    onToggle={(id) =>
                      update((b) => ({
                        speciesFeat: b.speciesFeat === id ? undefined : id,
                        skilledChoices: { ...b.skilledChoices, species: [] },
                      }))
                    }
                  />
                  {build.speciesFeat && (build.speciesFeat === 'magic-initiate' || build.speciesFeat === 'skilled') && (
                    <div className="mt-4">
                      <OriginFeatConfig {...props} featId={build.speciesFeat} sourceKey="species" />
                    </div>
                  )}
                  {c.featInstances.filter((f) => f.key === 'species' && f.feat.effects).map((f) => (
                    <div key={f.key} className="mt-4">
                      <FeatChoices {...props} instance={f} />
                    </div>
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'languages' && (
        <Section
          title="Idiomas"
          description={`Você conhece Comum e escolhe mais ${c.languageChoices}${c.cls.id === 'ranger' && c.level >= 2 ? ' (inclui 2 do Explorador Hábil)' : ''}. Idiomas raros dependem da aprovação do Mestre.`}
          aside={<CountBadge value={build.languages.length} max={c.languageChoices} />}
        >
          <div className="space-y-4">
            <div>
              <span className="label">Padrão</span>
              <div className="flex flex-wrap gap-2">
                {STANDARD_LANGUAGES.filter((l) => l !== 'Comum').map((l) => (
                  <ChoiceChip
                    key={l}
                    selected={build.languages.includes(l)}
                    disabled={build.languages.length >= c.languageChoices}
                    onClick={() => update({ languages: toggleInList(build.languages, l, c.languageChoices) })}
                  >
                    {l}
                  </ChoiceChip>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Raros</span>
              <div className="flex flex-wrap gap-2">
                {RARE_LANGUAGES.filter((l) => languagePool.includes(l)).map((l) => (
                  <ChoiceChip
                    key={l}
                    selected={build.languages.includes(l)}
                    disabled={build.languages.length >= c.languageChoices}
                    onClick={() => update({ languages: toggleInList(build.languages, l, c.languageChoices) })}
                  >
                    {l}
                  </ChoiceChip>
                ))}
              </div>
            </div>
            {c.languages.length > 1 && (
              <p className="text-[13px] text-fg-muted">Idiomas na ficha: {c.languages.join(', ')}.</p>
            )}
          </div>
        </Section>
      )}
    </div>
  );
};
