import React, { useMemo, useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import type {
  CharacterCurrency,
  CharacterEquipmentItem,
  CharacterSheet,
} from '../../types/campaign';
import {
  ABILITIES,
  ITEMS,
  ITEMS_BY_ID,
  SKILLS,
  WEAPON_MASTERIES,
  abilityModifier,
  formatModifier,
  normalizeSearch,
  skillIdFromName,
  type Ability,
  type SkillId,
} from '../../data/dnd2024';
import { parseBuild } from '../../rules/build';
import {
  computeArmorClass,
  computeCharacter,
  inventoryItemFromCatalog,
  type BuildStep,
} from '../../rules/engine';
import { applyDamage, applyHealing } from '../../rules/hp';
import { buildLevelUpPatch } from '../../rules/levelUp';
import { CharacterSheetModal } from './CharacterSheetModal';
import { SearchInput, SpellDescription, circleLabel } from './ui';
import {
  Users,
  ArrowUpCircle,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Heart,
  Shield,
  Plus,
  Minus,
  Trash2,
  Edit3,
  Backpack,
  Coins,
  BookOpen,
  Swords,
  Star,
  ChevronDown,
  ChevronUp,
  X,
  Moon,
  Sun,
} from 'lucide-react';

const COINS: { key: keyof CharacterCurrency; label: string }[] = [
  { key: 'pp', label: 'PL' },
  { key: 'gp', label: 'PO' },
  { key: 'ep', label: 'PE' },
  { key: 'sp', label: 'PP' },
  { key: 'cp', label: 'PC' },
];

const SLOT_KEYS = [
  'level1',
  'level2',
  'level3',
  'level4',
  'level5',
  'level6',
  'level7',
  'level8',
  'level9',
] as const;

export const PartySheetsView: React.FC = () => {
  const characterSheets = useCampaignStore((s) => s.characterSheets);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const currentUser = useCampaignStore((s) => s.currentUser);
  const inspectingCharacterId = useCampaignStore((s) => s.inspectingCharacterId);
  const updateCharacterSheet = useCampaignStore((s) => s.updateCharacterSheet);
  const levelUpCharacter = useCampaignStore((s) => s.levelUpCharacter);
  const levelUpParty = useCampaignStore((s) => s.levelUpParty);

  const activeCamp = campaigns.find((c) => c.id === activeCampaignId);
  const partySheets = useMemo(
    () => characterSheets.filter((c) => c.campaignId === activeCampaignId),
    [characterSheets, activeCampaignId]
  );

  const [selectedId, setSelectedId] = useState<string | null>(inspectingCharacterId);
  const [viewLayout, setViewLayout] = useState<'focused' | 'all'>('focused');
  const [modalState, setModalState] = useState<{
    id: string;
    initialEditStep?: BuildStep;
  } | null>(null);

  // Modal de prévia/confirmação de subida de nível (individual ou grupo inteiro)
  const [levelUpConfirm, setLevelUpConfirm] = useState<{
    mode: 'single' | 'party';
    sheetId?: string;
    targetLevel?: number;
  } | null>(null);
  const [isLevelingUp, setIsLevelingUp] = useState(false);

  const activeSheet =
    partySheets.find((s) => s.id === selectedId) ||
    partySheets.find((s) => s.id === inspectingCharacterId) ||
    partySheets[0];

  const pendingSheetsCount = partySheets.filter((s) => Boolean(s.pendingLevelUp)).length;
  const avgLevel =
    partySheets.length > 0
      ? (
          partySheets.reduce((sum, s) => sum + s.level, 0) / partySheets.length
        ).toFixed(1)
      : '—';

  const levelUpPreviewItems = useMemo(() => {
    if (!levelUpConfirm) return [];
    const dmName = currentUser?.name || 'Mestre';
    const targets =
      levelUpConfirm.mode === 'party'
        ? partySheets.filter((s) => s.level < 20)
        : partySheets.filter((s) => s.id === levelUpConfirm.sheetId);

    return targets
      .map((sheet) => {
        const nextLvl =
          levelUpConfirm.mode === 'single' && levelUpConfirm.targetLevel
            ? levelUpConfirm.targetLevel
            : sheet.level + 1;
        const preview = buildLevelUpPatch(sheet, dmName, nextLvl);
        if (!preview) return null;
        return {
          sheet,
          nextLevel: nextLvl,
          pendingLevelUp: preview.pendingLevelUp,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [levelUpConfirm, partySheets, currentUser?.name]);

  const handleConfirmLevelUp = async () => {
    if (!levelUpConfirm || isLevelingUp) return;
    setIsLevelingUp(true);
    try {
      if (levelUpConfirm.mode === 'party') {
        await levelUpParty(activeCampaignId);
      } else if (levelUpConfirm.sheetId) {
        await levelUpCharacter(levelUpConfirm.sheetId, levelUpConfirm.targetLevel);
      }
      setLevelUpConfirm(null);
    } finally {
      setIsLevelingUp(false);
    }
  };

  if (partySheets.length === 0) {
    return (
      <div className="space-y-4 h-full overflow-y-auto pb-6">
        <div>
          <h2 className="section-title">Fichas do grupo</h2>
          <p className="text-[13px] text-fg-muted">
            Visualização detalhada, inventário, recursos e progressão de nível dos personagens da campanha.
          </p>
        </div>

        <div className="card py-16 px-6 text-center space-y-2">
          <Users className="w-6 h-6 text-fg-subtle mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-fg">
            Nenhuma ficha criada pelos jogadores ainda
          </h3>
          <p className="text-[13px] text-fg-muted max-w-md mx-auto">
            Compartilhe o código de convite da campanha{activeCamp?.inviteCode ? ` (${activeCamp.inviteCode})` : ''} para que os jogadores entrem e criem suas fichas. Assim que criadas, todas aparecerão aqui com ficha detalhada, inventário completo e controle de subida de nível.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 h-full overflow-y-auto pr-1 pb-8">
      {/* Cabeçalho Geral e Subida de Nível do Grupo */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="section-title">Fichas do grupo ({partySheets.length})</h2>
          <p className="text-[13px] text-fg-muted">
            Nível médio {avgLevel}
            {pendingSheetsCount > 0 && (
              <span className="text-warning font-medium">
                {' '}
                · {pendingSheetsCount} personagem(ns) com escolhas de nível pendentes
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="segmented">
            <button
              type="button"
              onClick={() => setViewLayout('focused')}
              className={`segmented-item text-xs ${
                viewLayout === 'focused' ? 'segmented-item-active' : ''
              }`}
            >
              Ficha em foco
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('all')}
              className={`segmented-item text-xs ${
                viewLayout === 'all' ? 'segmented-item-active' : ''
              }`}
            >
              Todas expandidas ({partySheets.length})
            </button>
          </div>

          <button
            type="button"
            disabled={partySheets.every((s) => s.level >= 20)}
            onClick={() => setLevelUpConfirm({ mode: 'party' })}
            className="btn btn-primary btn-sm"
            title="Subir todos os personagens do grupo em +1 nível e mostrar ganhos e escolhas pendentes"
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Subir grupo todo de nível (+1)</span>
          </button>
        </div>
      </div>

      {/* Barra de seleção rápida dos membros do grupo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {partySheets.map((cs) => {
          const isSelected = viewLayout === 'focused' && activeSheet?.id === cs.id;
          const hpPct = Math.max(0, Math.min(100, Math.round((cs.hp / Math.max(1, cs.maxHp)) * 100)));
          const pending = cs.pendingLevelUp;

          return (
            <div
              key={cs.id}
              onClick={() => {
                setSelectedId(cs.id);
                if (viewLayout !== 'focused') setViewLayout('focused');
              }}
              className={`card p-3.5 cursor-pointer transition-all space-y-2.5 ${
                isSelected
                  ? 'ring-2 ring-accent border-accent bg-surface'
                  : 'hover:border-line-strong'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-fg truncate">{cs.name}</h3>
                    <span className="badge badge-accent shrink-0">Nv. {cs.level}</span>
                  </div>
                  <p className="text-xs text-fg-muted truncate">
                    {cs.race} · {cs.className}
                    {cs.subclass ? ` (${cs.subclass})` : ''}
                  </p>
                  <p className="text-[11px] text-fg-subtle truncate">
                    Jogador: {cs.playerName}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={cs.level >= 20}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLevelUpConfirm({
                      mode: 'single',
                      sheetId: cs.id,
                      targetLevel: cs.level + 1,
                    });
                  }}
                  className="btn btn-secondary btn-sm h-7 px-2 text-xs shrink-0"
                  title={`Subir ${cs.name} para o nível ${cs.level + 1}`}
                >
                  <ArrowUpCircle className="w-3.5 h-3.5 text-accent" />
                  <span>+1 Nv.</span>
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="text-fg-muted">
                    PV <strong className="text-fg">{cs.hp}</strong>/{cs.maxHp}
                    {cs.tempHp > 0 ? ` (+${cs.tempHp})` : ''}
                  </span>
                  <span className="text-fg-subtle">
                    CA {cs.armorClass} · PP {cs.passivePerception}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className={`h-full ${
                      hpPct > 50 ? 'bg-success' : hpPct > 25 ? 'bg-warning' : 'bg-danger'
                    }`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>

              {pending && (
                <div className="rounded-md bg-warning-soft px-2.5 py-1.5 text-[11px] text-warning font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Nv. {pending.toLevel}:{' '}
                    {pending.pendingChoices.length > 0
                      ? `${pending.pendingChoices.length} escolha(s) pendente(s)`
                      : 'Aguardando confirmação'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Conteúdo detalhado da(s) ficha(s) */}
      {viewLayout === 'focused' && activeSheet ? (
        <DetailedPartyMemberPanel
          key={activeSheet.id}
          sheet={activeSheet}
          onUpdate={(patch) => void updateCharacterSheet(activeSheet.id, patch)}
          onOpenModal={(step) => setModalState({ id: activeSheet.id, initialEditStep: step })}
          onRequestLevelUp={(targetLevel) =>
            setLevelUpConfirm({
              mode: 'single',
              sheetId: activeSheet.id,
              targetLevel,
            })
          }
        />
      ) : (
        <div className="space-y-6">
          {partySheets.map((sheet) => (
            <DetailedPartyMemberPanel
              key={sheet.id}
              sheet={sheet}
              onUpdate={(patch) => void updateCharacterSheet(sheet.id, patch)}
              onOpenModal={(step) => setModalState({ id: sheet.id, initialEditStep: step })}
              onRequestLevelUp={(targetLevel) =>
                setLevelUpConfirm({
                  mode: 'single',
                  sheetId: sheet.id,
                  targetLevel,
                })
              }
            />
          ))}
        </div>
      )}

      {/* Modal de Pré-visualização e Confirmação de Subida de Nível */}
      {levelUpConfirm && (
        <div className="modal-backdrop">
          <div className="modal max-w-2xl max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line shrink-0">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-accent" />
                <h3 className="section-title">
                  {levelUpConfirm.mode === 'party'
                    ? `Subir grupo todo de nível (${levelUpPreviewItems.length} personagens)`
                    : `Subir nível de ${levelUpPreviewItems[0]?.sheet.name || 'personagem'}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLevelUpConfirm(null)}
                className="btn btn-ghost btn-sm btn-icon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              <p className="text-[13px] text-fg-muted">
                Os ganhos automáticos (PV máximo, bônus de proficiência, novas características e espaços de magia) serão aplicados agora, e as novidades ficarão visíveis e <strong>pendentes para cada jogador selecionar</strong> em sua ficha.
              </p>

              {levelUpConfirm.mode === 'single' && levelUpPreviewItems[0] && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-fg-muted">Nível de destino:</label>
                  <select
                    value={levelUpPreviewItems[0].nextLevel}
                    onChange={(e) =>
                      setLevelUpConfirm({
                        ...levelUpConfirm,
                        targetLevel: Number(e.target.value),
                      })
                    }
                    className="input h-8 w-auto text-xs font-semibold"
                  >
                    {Array.from(
                      { length: 20 - levelUpPreviewItems[0].sheet.level },
                      (_, i) => levelUpPreviewItems[0]!.sheet.level + i + 1
                    ).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Nível {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-3">
                {levelUpPreviewItems.map(({ sheet, nextLevel, pendingLevelUp }) => (
                  <div key={sheet.id} className="card p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-fg">
                          {sheet.name}{' '}
                          <span className="text-fg-muted font-normal">
                            ({sheet.className}) · Jogador: {sheet.playerName}
                          </span>
                        </h4>
                      </div>
                      <span className="badge badge-accent font-mono">
                        Nível {sheet.level} → Nível {nextLevel}
                      </span>
                    </div>

                    {pendingLevelUp.gains.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-success flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Ganhos desbloqueados no nível {nextLevel}:</span>
                        </div>
                        <ul className="space-y-1 text-xs text-fg-muted pl-1">
                          {pendingLevelUp.gains.map((g, idx) => (
                            <li key={idx}>
                              <strong className="text-fg">{g.title}:</strong> {g.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-1.5 pt-2 border-t border-line">
                      <div className="text-xs font-semibold text-warning flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>
                          {pendingLevelUp.pendingChoices.length > 0
                            ? `Escolhas que ficarão pendentes para ${sheet.playerName} (${pendingLevelUp.pendingChoices.length}):`
                            : `Nenhuma escolha obrigatória pendente (${sheet.playerName} receberá o resumo para confirmar)`}
                        </span>
                      </div>
                      {pendingLevelUp.pendingChoices.length > 0 && (
                        <ul className="list-disc list-inside text-xs text-fg space-y-0.5">
                          {pendingLevelUp.pendingChoices.map((ch, idx) => (
                            <li key={idx}>{ch.text}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-line bg-surface-2 shrink-0">
              <button
                type="button"
                onClick={() => setLevelUpConfirm(null)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isLevelingUp || levelUpPreviewItems.length === 0}
                onClick={() => void handleConfirmLevelUp()}
                className="btn btn-primary"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>
                  {isLevelingUp
                    ? 'Aplicando…'
                    : levelUpConfirm.mode === 'party'
                    ? 'Confirmar subida do grupo'
                    : 'Confirmar subida de nível'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {modalState && (
        <CharacterSheetModal
          sheetId={modalState.id}
          initialEditStep={modalState.initialEditStep}
          isOpen
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// Painel Completo e Detalhado de um Personagem do Grupo
// ============================================================================

const DetailedPartyMemberPanel: React.FC<{
  sheet: CharacterSheet;
  onUpdate: (patch: Partial<CharacterSheet>) => void;
  onOpenModal: (editStep?: BuildStep) => void;
  onRequestLevelUp: (targetLevel?: number) => void;
}> = ({ sheet, onUpdate, onOpenModal, onRequestLevelUp }) => {
  const [hpInput, setHpInput] = useState('');
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [expandedSpellId, setExpandedSpellId] = useState<string | null>(null);
  const [expandedFeatures, setExpandedFeatures] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemCategory, setCustomItemCategory] = useState('Item');

  const build = useMemo(() => parseBuild(sheet.build), [sheet.build]);
  const computed = useMemo(() => (build ? computeCharacter(build) : null), [build]);
  const pb = sheet.proficiencyBonus;

  const mods = useMemo(
    () =>
      Object.fromEntries(
        ABILITIES.map((a) => [a.id, abilityModifier(sheet.stats[a.id])])
      ) as Record<Ability, number>,
    [sheet.stats]
  );

  const legacyProfs = useMemo(
    () =>
      new Set<SkillId>(
        (sheet.proficiencies || [])
          .map((p) => skillIdFromName(p))
          .filter((x): x is SkillId => Boolean(x))
      ),
    [sheet.proficiencies]
  );

  const skillRows = useMemo(
    () =>
      SKILLS.map((s) => {
        const fromEngine = computed?.skills.find((x) => x.id === s.id);
        if (fromEngine) {
          return {
            ...s,
            prof: fromEngine.proficient,
            exp: fromEngine.expertise,
            half: fromEngine.halfProficiency,
            bonus: fromEngine.bonus,
          };
        }
        const prof = legacyProfs.has(s.id);
        return {
          ...s,
          prof,
          exp: false,
          half: false,
          bonus: mods[s.ability] + (prof ? pb : 0),
        };
      }),
    [computed, legacyProfs, mods, pb]
  );

  const saveRows = useMemo(
    () =>
      ABILITIES.map((a) => {
        if (computed) {
          return {
            ...a,
            prof: computed.saveProficiencies.includes(a.id),
            bonus: computed.saves[a.id],
          };
        }
        const prof = (sheet.savingThrows || []).some(
          (n) => n.toLowerCase() === a.name.toLowerCase()
        );
        return { ...a, prof, bonus: mods[a.id] + (prof ? pb : 0) };
      }),
    [computed, sheet.savingThrows, mods, pb]
  );

  const attacks = useMemo(() => {
    const isMartialProf = (sheet.proficiencies || []).some((p) => /marciais/i.test(p));
    return sheet.equipment
      .filter((e) => e.equipped && e.itemId && ITEMS_BY_ID[e.itemId]?.damage)
      .map((e) => {
        const item = ITEMS_BY_ID[e.itemId!];
        const ranged = item.kind.endsWith('ranged');
        const finesse = (item.properties || '').includes('Acuidade');
        const ability: Ability = ranged
          ? 'dex'
          : finesse && mods.dex > mods.str
          ? 'dex'
          : 'str';
        const martial = item.kind.startsWith('martial');
        const proficient = !martial || isMartialProf;
        const toHit = mods[ability] + (proficient ? pb : 0);
        const [dice, ...type] = (item.damage || '').split(' ');
        const mod = mods[ability];
        return {
          id: e.id,
          name: e.name,
          toHit,
          damage: `${dice}${
            mod ? (mod > 0 ? ` + ${mod}` : ` − ${Math.abs(mod)}`) : ''
          } ${type.join(' ')}`,
          properties: item.properties,
          mastery: (sheet.weaponMasteries || []).some((m) => m.startsWith(item.name))
            ? item.mastery
            : undefined,
        };
      });
  }, [sheet.equipment, sheet.proficiencies, sheet.weaponMasteries, mods, pb]);

  const setEquipment = (equipment: CharacterEquipmentItem[]) => {
    const patch: Partial<CharacterSheet> = { equipment };
    if (build) patch.armorClass = computeArmorClass(build, mods, equipment);
    onUpdate(patch);
  };

  const currency = sheet.currency || { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };

  const applyHpChange = (mode: 'damage' | 'heal' | 'temp') => {
    const n = Math.abs(parseInt(hpInput, 10));
    if (!n) return;
    if (mode === 'damage') onUpdate(applyDamage(sheet, n));
    else if (mode === 'heal') onUpdate(applyHealing(sheet, n));
    else onUpdate({ tempHp: n });
    setHpInput('');
  };

  const triggerLongRest = () => {
    const slots = { ...sheet.spellSlots };
    SLOT_KEYS.forEach((k) => {
      if (slots[k]) slots[k] = { ...slots[k]!, used: 0 };
    });
    if (slots.pactSlots) slots.pactSlots = { ...slots.pactSlots, used: 0 };
    onUpdate({
      hp: sheet.maxHp,
      tempHp: 0,
      spellSlots: slots,
      hitDiceUsed: 0,
    });
  };

  const triggerShortRest = () => {
    if (sheet.spellSlots.pactSlots) {
      onUpdate({
        spellSlots: {
          ...sheet.spellSlots,
          pactSlots: { ...sheet.spellSlots.pactSlots, used: 0 },
        },
      });
    }
  };

  const qNorm = normalizeSearch(catalogQuery.trim());
  const catalogResults =
    qNorm.length >= 2
      ? ITEMS.filter((i) => normalizeSearch(i.name).includes(qNorm)).slice(0, 6)
      : [];

  const addCatalogItem = (itemId: string) => {
    const existing = sheet.equipment.find((e) => e.itemId === itemId);
    if (existing) {
      setEquipment(
        sheet.equipment.map((e) =>
          e.id === existing.id ? { ...e, quantity: e.quantity + 1 } : e
        )
      );
    } else {
      const item = inventoryItemFromCatalog(itemId, { equipped: false });
      if (item) setEquipment([...sheet.equipment, item]);
    }
    setCatalogQuery('');
  };

  const hpPct = Math.max(0, Math.min(100, Math.round((sheet.hp / Math.max(1, sheet.maxHp)) * 100)));
  const initiative = computed?.initiative ?? sheet.initiativeBonus ?? mods.dex;
  const pending = sheet.pendingLevelUp;

  const activeSlots = SLOT_KEYS.map((k, idx) => ({
    key: k,
    circle: idx + 1,
    slot: sheet.spellSlots[k],
  })).filter((s) => (s.slot?.max || 0) > 0);

  return (
    <section className="card overflow-hidden">
      {/* Cabeçalho rico da ficha */}
      <header className="px-5 py-4 border-b border-line bg-surface-2/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {sheet.avatarUrl ? (
            <img
              src={sheet.avatarUrl}
              alt=""
              className="w-14 h-14 rounded-xl object-cover border border-line shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-lg font-semibold text-fg-muted shrink-0">
              {sheet.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-fg truncate">{sheet.name}</h3>
              <span className="badge badge-accent">Nível {sheet.level}</span>
              <button
                type="button"
                onClick={() =>
                  onUpdate({ heroicInspiration: !sheet.heroicInspiration })
                }
                className={`badge cursor-pointer transition-colors ${
                  sheet.heroicInspiration ? 'badge-warning' : 'text-fg-subtle'
                }`}
                title="Alternar Inspiração Heroica"
              >
                <Star className="w-3 h-3" />
                <span>
                  {sheet.heroicInspiration ? 'Inspirado' : 'Sem inspiração'}
                </span>
              </button>
            </div>
            <p className="text-[13px] text-fg-muted">
              {[
                sheet.race,
                `${sheet.className} ${sheet.level}`,
                sheet.subclass,
                sheet.background,
                sheet.alignment,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p className="text-xs text-fg-subtle">
              Jogador: <strong className="text-fg">{sheet.playerName}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={triggerShortRest}
            className="btn btn-secondary btn-sm"
            title="Descanso Curto (recupera espaços de Pacto)"
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Descanso curto</span>
          </button>
          <button
            type="button"
            onClick={triggerLongRest}
            className="btn btn-secondary btn-sm"
            title="Descanso Longo (restaura PV totais, espaços de magia e Dados de Vida)"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Descanso longo</span>
          </button>
          <button
            type="button"
            disabled={sheet.level >= 20}
            onClick={() => onRequestLevelUp(sheet.level + 1)}
            className="btn btn-primary btn-sm"
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Subir p/ Nível {Math.min(20, sheet.level + 1)}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenModal()}
            className="btn btn-secondary btn-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Modal / Editor</span>
          </button>
        </div>
      </header>

      {/* Painel de Subida de Nível & Pendências (visível para Mestre e Jogador) */}
      {pending && (
        <div className="mx-5 mt-4 rounded-xl border border-warning/40 bg-warning-soft/30 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-warning shrink-0" />
              <span className="text-sm font-semibold text-fg">
                Subida de Nível ativa: Nível {pending.fromLevel} → Nível {pending.toLevel}
              </span>
              <span className="badge badge-warning">
                {pending.pendingChoices.length > 0
                  ? `Pendente até ${sheet.playerName} selecionar (${pending.pendingChoices.length})`
                  : `Aguardando confirmação de ${sheet.playerName}`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <div className="font-semibold text-fg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span>Novidades ganhas neste nível</span>
              </div>
              {pending.gains.length === 0 ? (
                <p className="text-fg-muted">Atributos derivados atualizados para o nível {pending.toLevel}.</p>
              ) : (
                <ul className="space-y-1.5">
                  {pending.gains.map((g, idx) => (
                    <li key={idx} className="rounded-md bg-surface/80 border border-line p-2">
                      <div className="font-medium text-fg">{g.title}</div>
                      <div className="text-fg-muted mt-0.5 leading-relaxed line-clamp-3">
                        {g.description}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="font-semibold text-fg flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-warning" />
                <span>Escolhas pendentes do jogador ({pending.pendingChoices.length})</span>
              </div>
              {pending.pendingChoices.length === 0 ? (
                <p className="text-fg-muted">
                  Todas as escolhas obrigatórias já estão preenchidas; o aviso permanece até o jogador confirmar em sua tela.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {pending.pendingChoices.map((ch, idx) => (
                    <li
                      key={idx}
                      className="rounded-md bg-surface/80 border border-line px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <span className="text-fg">{ch.text}</span>
                      <span className="badge text-[10px] uppercase">{ch.step}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-5 space-y-6">
        {/* Linha 1: Indicadores vitais e de combate */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="card px-3.5 py-2.5 col-span-2">
            <div className="flex items-center justify-between text-xs text-fg-subtle">
              <span className="inline-flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-danger" /> Pontos de Vida
              </span>
              {sheet.tempHp > 0 && (
                <span className="badge badge-info">+{sheet.tempHp} temp.</span>
              )}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-semibold tabular-nums text-fg">
                {sheet.hp}
              </span>
              <span className="text-sm text-fg-subtle tabular-nums">
                / {sheet.maxHp}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden mt-1.5">
              <div
                className={`h-full ${
                  hpPct > 50 ? 'bg-success' : hpPct > 25 ? 'bg-warning' : 'bg-danger'
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <input
                type="number"
                min={0}
                value={hpInput}
                onChange={(e) => setHpInput(e.target.value)}
                placeholder="Valor"
                className="input h-7 w-16 text-xs tabular-nums"
              />
              <button
                type="button"
                onClick={() => applyHpChange('damage')}
                className="btn btn-secondary btn-sm h-7 px-2 text-xs"
              >
                Dano
              </button>
              <button
                type="button"
                onClick={() => applyHpChange('heal')}
                className="btn btn-secondary btn-sm h-7 px-2 text-xs"
              >
                Cura
              </button>
              <button
                type="button"
                onClick={() => applyHpChange('temp')}
                className="btn btn-ghost btn-sm h-7 px-2 text-xs"
                title="Definir PV temporários"
              >
                Temp
              </button>
            </div>
          </div>

          <div className="card px-3 py-2.5">
            <div className="text-xs text-fg-subtle inline-flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> CA
            </div>
            <div className="text-2xl font-semibold tabular-nums mt-0.5">
              {sheet.armorClass}
            </div>
          </div>

          <div className="card px-3 py-2.5">
            <div className="text-xs text-fg-subtle">Iniciativa</div>
            <div className="text-2xl font-semibold tabular-nums mt-0.5">
              {formatModifier(initiative)}
            </div>
          </div>

          <div className="card px-3 py-2.5">
            <div className="text-xs text-fg-subtle">Proficiência</div>
            <div className="text-2xl font-semibold tabular-nums mt-0.5">
              +{sheet.proficiencyBonus}
            </div>
          </div>

          <div className="card px-3 py-2.5">
            <div className="text-xs text-fg-subtle">Percepção Passiva</div>
            <div className="text-2xl font-semibold tabular-nums mt-0.5">
              {sheet.passivePerception}
            </div>
          </div>

          <div className="card px-3 py-2.5">
            <div className="text-xs text-fg-subtle">Deslocamento / DV</div>
            <div className="text-sm font-semibold text-fg mt-1 truncate" title={sheet.speed}>
              {sheet.speed}
            </div>
            <div className="text-xs text-fg-subtle font-mono mt-0.5">
              DV: {sheet.level - (sheet.hitDiceUsed || 0)}/{sheet.hitDice}
            </div>
          </div>
        </div>

        {/* Linha 2: 3 Colunas Detalhadas (Atributos/Perícias · Combate/Magias/Características · Inventário Completo) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Coluna 1: Atributos, Salvaguardas, Perícias e Proficiências */}
          <div className="xl:col-span-4 space-y-4">
            <div>
              <h4 className="section-title mb-2">Atributos e Salvaguardas</h4>
              <div className="grid grid-cols-3 gap-2">
                {ABILITIES.map((ab) => {
                  const sv = saveRows.find((r) => r.id === ab.id)!;
                  return (
                    <div key={ab.id} className="card p-2.5 text-center space-y-0.5">
                      <div className="text-[11px] font-semibold text-fg-subtle uppercase">
                        {ab.short}
                      </div>
                      <div className="text-lg font-bold tabular-nums text-fg">
                        {formatModifier(mods[ab.id])}
                      </div>
                      <div className="text-xs text-fg-muted tabular-nums">
                        Valor {sheet.stats[ab.id]}
                      </div>
                      <div
                        className={`text-[11px] pt-1 border-t border-line tabular-nums ${
                          sv.prof ? 'text-accent font-semibold' : 'text-fg-subtle'
                        }`}
                        title="Teste de Resistência"
                      >
                        TR {formatModifier(sv.bonus)}
                        {sv.prof ? ' ●' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-fg">Perícias</h4>
                <button
                  type="button"
                  onClick={() => setShowAllSkills((v) => !v)}
                  className="text-xs text-accent hover:underline inline-flex items-center gap-1"
                >
                  <span>{showAllSkills ? 'Apenas treinadas' : 'Ver todas (18)'}</span>
                  {showAllSkills ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <ul className="divide-y divide-line text-xs">
                {(showAllSkills
                  ? skillRows
                  : skillRows.filter((s) => s.prof || s.exp || s.half)
                ).map((sk) => (
                  <li key={sk.id} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          sk.exp
                            ? 'bg-accent'
                            : sk.prof
                            ? 'bg-success'
                            : 'bg-surface-3'
                        }`}
                        title={
                          sk.exp
                            ? 'Especialização'
                            : sk.prof
                            ? 'Proficiente'
                            : 'Sem proficiência'
                        }
                      />
                      <span className="text-fg truncate">{sk.name}</span>
                      <span className="text-fg-subtle uppercase text-[10px]">
                        ({sk.ability})
                      </span>
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-fg">
                      {formatModifier(sk.bonus)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {((sheet.languages && sheet.languages.length > 0) ||
              sheet.proficiencies.length > 0) && (
              <div className="card p-3.5 space-y-2 text-xs">
                {sheet.languages && sheet.languages.length > 0 && (
                  <div>
                    <span className="font-semibold text-fg">Idiomas: </span>
                    <span className="text-fg-muted">{sheet.languages.join(', ')}</span>
                  </div>
                )}
                {sheet.originFeat && (
                  <div>
                    <span className="font-semibold text-fg">Talento de Origem: </span>
                    <span className="text-fg-muted">{sheet.originFeat}</span>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-fg">Proficiências: </span>
                  <span className="text-fg-muted">{sheet.proficiencies.join(', ')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Coluna 2: Ataques, Recursos, Magias e Características */}
          <div className="xl:col-span-4 space-y-4">
            {/* Ataques e Maestrias */}
            <div className="card p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-fg-subtle" />
                <h4 className="text-sm font-semibold text-fg">Ataques equipados e Recursos</h4>
              </div>

              {attacks.length === 0 ? (
                <p className="text-xs text-fg-subtle">Nenhuma arma equipada no momento.</p>
              ) : (
                <ul className="divide-y divide-line text-xs">
                  {attacks.map((atk) => (
                    <li key={atk.id} className="py-2 space-y-0.5">
                      <div className="flex items-center justify-between font-medium text-fg">
                        <span>{atk.name}</span>
                        <span className="font-mono tabular-nums">
                          {formatModifier(atk.toHit)} · {atk.damage}
                        </span>
                      </div>
                      {(atk.properties || atk.mastery) && (
                        <div className="text-[11px] text-fg-subtle">
                          {[
                            atk.properties,
                            atk.mastery
                              ? `Maestria (${atk.mastery}): ${
                                  WEAPON_MASTERIES[atk.mastery] || ''
                                }`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {sheet.classResources && sheet.classResources.length > 0 && (
                <div className="pt-2 border-t border-line flex flex-wrap gap-1.5">
                  {sheet.classResources.map((res) => (
                    <span key={res.label} className="badge">
                      <span className="text-fg-subtle">{res.label}:</span>{' '}
                      <strong className="text-fg">{res.value}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Espaços de Magia e Magias */}
            {(activeSlots.length > 0 ||
              sheet.spellSlots.pactSlots ||
              sheet.spells.length > 0) && (
              <div className="card p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-fg-subtle" />
                    <h4 className="text-sm font-semibold text-fg">
                      Magias ({sheet.spells.length})
                    </h4>
                  </div>
                  {computed?.spellSaveDc && (
                    <span className="text-xs text-fg-muted font-mono">
                      CD {computed.spellSaveDc} · Atq{' '}
                      {formatModifier(computed.spellAttack || 0)}
                    </span>
                  )}
                </div>

                {(activeSlots.length > 0 || sheet.spellSlots.pactSlots) && (
                  <div className="flex flex-wrap gap-2">
                    {sheet.spellSlots.pactSlots && sheet.spellSlots.pactSlots.max > 0 && (
                      <div className="rounded-md bg-surface-2 px-2.5 py-1.5 text-xs">
                        <span className="text-fg-subtle">
                          Pacto ({sheet.spellSlots.pactSlots.level}º):{' '}
                        </span>
                        <strong className="font-mono">
                          {sheet.spellSlots.pactSlots.max -
                            sheet.spellSlots.pactSlots.used}
                          /{sheet.spellSlots.pactSlots.max}
                        </strong>
                      </div>
                    )}
                    {activeSlots.map(({ key, circle, slot }) => (
                      <div
                        key={key}
                        className="rounded-md bg-surface-2 px-2.5 py-1.5 text-xs"
                      >
                        <span className="text-fg-subtle">{circle}º: </span>
                        <strong className="font-mono">
                          {(slot?.max || 0) - (slot?.used || 0)}/{slot?.max || 0}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

                {sheet.spells.length > 0 && (
                  <ul className="divide-y divide-line max-h-60 overflow-y-auto text-xs">
                    {sheet.spells.map((sp) => {
                      const isOpen = expandedSpellId === sp.id;
                      return (
                        <li key={sp.id} className="py-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSpellId(isOpen ? null : sp.id)
                            }
                            className="w-full text-left flex items-center justify-between gap-2 hover:text-accent"
                          >
                            <span className="truncate font-medium text-fg">
                              {sp.name}
                            </span>
                            <span className="text-[11px] text-fg-subtle shrink-0">
                              {sp.level === 0 ? 'Truque' : `${sp.level}º`}
                              {sp.prepared ? ' · Prep.' : ''}
                            </span>
                          </button>
                          {isOpen && (
                            <div className="mt-1.5 p-2 rounded bg-surface-2 space-y-1">
                              <div className="text-[11px] text-fg-subtle">
                                {circleLabel(sp.level)} · {sp.castingTime} ·{' '}
                                {sp.range} · {sp.duration}
                              </div>
                              <SpellDescription
                                spell={{
                                  description: sp.description,
                                  higherLevels: sp.higherLevels,
                                  level: sp.level,
                                }}
                              />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* Características de Classe, Subclasse, Espécie e Talentos */}
            <div className="card p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-fg">
                  Características ({(sheet.classFeatures || []).length})
                </h4>
                {(sheet.classFeatures || []).length > 4 && (
                  <button
                    type="button"
                    onClick={() => setExpandedFeatures((v) => !v)}
                    className="text-xs text-accent hover:underline"
                  >
                    {expandedFeatures ? 'Recolher' : 'Mostrar todas'}
                  </button>
                )}
              </div>

              {(sheet.classFeatures || []).length === 0 ? (
                <p className="text-xs text-fg-subtle">
                  {sheet.racialTraits.join(' · ') || 'Nenhuma característica listada.'}
                </p>
              ) : (
                <ul className="divide-y divide-line text-xs max-h-72 overflow-y-auto">
                  {(expandedFeatures
                    ? sheet.classFeatures || []
                    : (sheet.classFeatures || []).slice(0, 5)
                  ).map((feat, idx) => (
                    <li key={`${feat.name}-${idx}`} className="py-2 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-fg">{feat.name}</span>
                        <span className="text-[11px] text-fg-subtle shrink-0">
                          Nv. {feat.level} · {feat.source}
                        </span>
                      </div>
                      <p className="text-fg-muted leading-relaxed line-clamp-3">
                        {feat.description}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Coluna 3: Inventário Completo e Moedas do Personagem */}
          <div className="xl:col-span-4 space-y-4">
            <div className="card p-3.5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Backpack className="w-4 h-4 text-fg-subtle" />
                  <h4 className="text-sm font-semibold text-fg">
                    Inventário e Moedas ({sheet.equipment.length} itens)
                  </h4>
                </div>
              </div>

              {/* Moedas */}
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-fg-subtle flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" /> Carteira individual
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {COINS.map((c) => (
                    <label
                      key={c.key}
                      className="rounded-md border border-line bg-surface-2/50 px-1.5 py-1.5 text-center"
                    >
                      <span className="text-[10px] text-fg-subtle block">{c.label}</span>
                      <input
                        type="number"
                        min={0}
                        value={currency[c.key]}
                        onChange={(e) =>
                          onUpdate({
                            currency: {
                              ...currency,
                              [c.key]: Math.max(0, Number(e.target.value) || 0),
                            },
                          })
                        }
                        className="w-full bg-transparent text-center text-xs font-semibold tabular-nums focus:outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Lista completa de equipamentos */}
              {sheet.equipment.length === 0 ? (
                <p className="text-xs text-fg-subtle py-3 text-center">
                  Inventário vazio.
                </p>
              ) : (
                <ul className="divide-y divide-line border border-line rounded-md max-h-72 overflow-y-auto">
                  {sheet.equipment.map((eq) => (
                    <li
                      key={eq.id}
                      className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={eq.equipped}
                          onChange={() =>
                            setEquipment(
                              sheet.equipment.map((x) =>
                                x.id === eq.id ? { ...x, equipped: !x.equipped } : x
                              )
                            )
                          }
                          title="Equipado / Vestido"
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-fg truncate">
                            {eq.name}
                            {eq.equipped && (
                              <span className="badge ml-1.5 text-[10px]">Equipado</span>
                            )}
                          </div>
                          <div className="text-[11px] text-fg-subtle truncate">
                            {[eq.category, eq.damage, eq.armorClass, eq.weight]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setEquipment(
                              sheet.equipment.map((x) =>
                                x.id === eq.id
                                  ? { ...x, quantity: Math.max(0, x.quantity - 1) }
                                  : x
                              )
                            )
                          }
                          className="btn btn-ghost btn-icon h-6 w-6"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-mono tabular-nums">
                          {eq.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEquipment(
                              sheet.equipment.map((x) =>
                                x.id === eq.id ? { ...x, quantity: x.quantity + 1 } : x
                              )
                            )
                          }
                          className="btn btn-ghost btn-icon h-6 w-6"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEquipment(sheet.equipment.filter((x) => x.id !== eq.id))
                          }
                          className="btn btn-danger-ghost btn-icon h-6 w-6"
                          title="Remover item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Adicionar item do catálogo ou personalizado */}
              <div className="space-y-2.5 pt-2 border-t border-line">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-fg-muted">
                    Entregar item do catálogo D&D 2024
                  </span>
                  <SearchInput
                    value={catalogQuery}
                    onChange={setCatalogQuery}
                    placeholder="Buscar espada, poção, armadura…"
                  />
                  {catalogResults.length > 0 && (
                    <ul className="rounded-md border border-line divide-y divide-line bg-surface">
                      {catalogResults.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => addCatalogItem(item.id)}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-surface-2 flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-fg">{item.name}</span>
                            <span className="text-fg-subtle">
                              {item.damage ||
                                (item.ac ? `CA ${item.ac.base}` : `${item.cost} PO`)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!customItemName.trim()) return;
                    setEquipment([
                      ...sheet.equipment,
                      {
                        id: `eq-${Date.now().toString(36)}`,
                        name: customItemName.trim(),
                        category: customItemCategory,
                        quantity: 1,
                        equipped: false,
                      },
                    ]);
                    setCustomItemName('');
                  }}
                  className="flex gap-1.5"
                >
                  <input
                    type="text"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    placeholder="Item customizado / relíquia…"
                    className="input h-8 text-xs flex-1"
                  />
                  <select
                    value={customItemCategory}
                    onChange={(e) => setCustomItemCategory(e.target.value)}
                    className="input h-8 w-auto text-xs"
                  >
                    <option value="Item">Item</option>
                    <option value="Relíquia">Relíquia</option>
                    <option value="Consumível">Consumível</option>
                    <option value="Tesouro">Tesouro</option>
                  </select>
                  <button type="submit" className="btn btn-secondary btn-sm h-8">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {sheet.notes && (
              <div className="card p-3.5 space-y-1">
                <h4 className="text-xs font-semibold text-fg-subtle uppercase">
                  Anotações da ficha
                </h4>
                <p className="text-xs text-fg-muted whitespace-pre-line line-clamp-5">
                  {sheet.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
