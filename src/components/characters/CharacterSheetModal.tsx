import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import {
  CharacterSheet,
  CharacterSpell,
  CharacterEquipmentItem,
  CharacterFeature,
  CharacterClassResource,
  CharacterSpellSlots,
  StatGenerationMethod,
} from '../../types/campaign';
import {
  DND_RACES_CATALOG,
  DND_ORIGINS_CATALOG,
  DND_CLASSES_CATALOG,
  STAT_KEYS,
  computeBaseStatsStandardArray,
  roll4d6DropLowestForBuild,
  rollRandom3d6ForBuild,
  applyOriginAndAsiToBaseStats,
  inferBaseStatsFromFinal,
  fetchCharacterProgression55e,
  getPermittedBuildChoices55e,
  fetchPermittedSpellsForBuild55e,
  searchDndSpells,
  searchDndEquipment,
  StatKey,
  DiceRoll4d6Detail,
  DiceRoll3d6Detail,
} from '../../services/dnd5eService';
import {
  BookOpen,
  Backpack,
  Search,
  Plus,
  Trash2,
  Swords,
  Loader2,
  Check,
  Sparkles,
  RefreshCw,
  Award,
  Dices,
  Lock,
  Unlock,
  ArrowLeftRight,
  Sliders,
} from 'lucide-react';

interface CharacterSheetModalProps {
  sheetId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Define explicitamente se o modal foi aberto em contexto de Mestre.
   * Somente o Mestre da campanha pode editar todos os campos numéricos manualmente.
   */
  isDmContext?: boolean;
}

function calcMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

const STAT_LABELS: Record<StatKey, string> = {
  str: 'Força',
  dex: 'Destreza',
  con: 'Constituição',
  int: 'Inteligência',
  wis: 'Sabedoria',
  cha: 'Carisma',
};

const EMPTY_SLOTS: CharacterSpellSlots = {
  level1: { used: 0, max: 0 },
  level2: { used: 0, max: 0 },
  level3: { used: 0, max: 0 },
  level4: { used: 0, max: 0 },
  level5: { used: 0, max: 0 },
  level6: { used: 0, max: 0 },
  level7: { used: 0, max: 0 },
  level8: { used: 0, max: 0 },
  level9: { used: 0, max: 0 },
};

export const CharacterSheetModal: React.FC<CharacterSheetModalProps> = ({
  sheetId,
  isOpen,
  onClose,
  isDmContext,
}) => {
  const characterSheets = useCampaignStore((s) => s.characterSheets);
  const campaigns = useCampaignStore((s) => s.campaigns);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const currentUser = useCampaignStore((s) => s.currentUser);
  const workspaceMode = useCampaignStore((s) => s.workspaceMode);
  const createCharacterSheet = useCampaignStore((s) => s.createCharacterSheet);
  const updateCharacterSheet = useCampaignStore((s) => s.updateCharacterSheet);

  const existingSheet = characterSheets.find((c) => c.id === sheetId);

  const [activeTab, setActiveTab] = useState<
    'stats' | 'choices' | 'features' | 'grimoire' | 'inventory'
  >('stats');
  const [loadingApiTrait, setLoadingApiTrait] = useState(false);
  const [autoSyncBuild, setAutoSyncBuild] = useState(!existingSheet);

  // Sheet Form State (D&D 5.5e / 2024)
  const [name, setName] = useState('');
  const [raceIndex, setRaceIndex] = useState('human');
  const [raceLabel, setRaceLabel] = useState('Humano (5.5e)');
  const [lineageId, setLineageId] = useState('');
  const [racialTraits, setRacialTraits] = useState<string[]>([]);

  const [originIndex, setOriginIndex] = useState('soldier');
  const [background, setBackground] = useState('Soldado');
  const [originFeat, setOriginFeat] = useState('Atacante Selvagem (Savage Attacker)');

  const [classIndex, setClassIndex] = useState('fighter');
  const [classLabel, setClassLabel] = useState('Guerreiro (5.5e)');
  const [subclassIndex, setSubclassIndex] = useState('champion');
  const [subclass, setSubclass] = useState('');

  const [level, setLevel] = useState(1);
  const [alignment, setAlignment] = useState('Neutro');
  const [campaignId, setCampaignId] = useState(activeCampaignId || '');

  const [hp, setHp] = useState(12);
  const [maxHp, setMaxHp] = useState(12);
  const [tempHp, setTempHp] = useState(0);
  const [armorClass, setArmorClass] = useState(18);
  const [speed, setSpeed] = useState('9m (30 ft)');
  const [hitDice, setHitDice] = useState('1d10');
  const [hitDiceUsed, setHitDiceUsed] = useState(0);

  // Stat Generation Method & Base Scores
  const [statMethod, setStatMethod] = useState<StatGenerationMethod>('standard');
  const [baseStats, setBaseStats] = useState<Record<StatKey, number>>(() =>
    computeBaseStatsStandardArray('fighter')
  );
  const [roll4d6Details, setRoll4d6Details] = useState<DiceRoll4d6Detail[]>([]);
  const [roll3d6Details, setRoll3d6Details] = useState<DiceRoll3d6Detail[]>([]);
  const [swapSourceKey, setSwapSourceKey] = useState<StatKey | null>(null);

  const [stats, setStats] = useState<Record<StatKey, number>>({
    str: 17,
    dex: 13,
    con: 15,
    int: 8,
    wis: 12,
    cha: 10,
  });

  const [savingThrows, setSavingThrows] = useState<string[]>([]);
  const [selectedClassSkills, setSelectedClassSkills] = useState<string[]>([]);
  const [proficiencies, setProficiencies] = useState<string[]>([]);
  const [weaponMasteries, setWeaponMasteries] = useState<string[]>([]);
  const [classFeatures, setClassFeatures] = useState<CharacterFeature[]>([]);
  const [classResources, setClassResources] = useState<CharacterClassResource[]>([]);
  const [spellSlots, setSpellSlots] = useState<CharacterSpellSlots>(EMPTY_SLOTS);
  const [spells, setSpells] = useState<CharacterSpell[]>([]);
  const [equipment, setEquipment] = useState<CharacterEquipmentItem[]>([]);
  const [selectedEquipPackIds, setSelectedEquipPackIds] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');

  // Permitted Spells State (Auto-loaded based on class/species/origin/level)
  const [permittedSpells, setPermittedSpells] = useState<Omit<CharacterSpell, 'id'>[]>([]);
  const [loadingPermittedSpells, setLoadingPermittedSpells] = useState(false);

  // API Search State (Grimório & Equipamentos 5.5e)
  const [spellSearchQuery, setSpellSearchQuery] = useState('');
  const [filterByClassLevel, setFilterByClassLevel] = useState(true);
  const [spellSearchResults, setSpellSearchResults] = useState<
    Omit<CharacterSpell, 'id'>[]
  >([]);
  const [isSearchingSpells, setIsSearchingSpells] = useState(false);

  const [equipSearchQuery, setEquipSearchQuery] = useState('');
  const [equipSearchResults, setEquipSearchResults] = useState<
    Omit<CharacterEquipmentItem, 'id'>[]
  >([]);
  const [isSearchingEquip, setIsSearchingEquip] = useState(false);

  // Custom DM manual item / feature creator
  const [customItemName, setCustomItemName] = useState('');
  const [customItemCat, setCustomItemCat] = useState('Item Especial (Mestre)');
  const [customItemDmgOrAc, setCustomItemDmgOrAc] = useState('');

  // Permissão exclusiva do Mestre para edição manual de valores
  const targetCampaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId),
    [campaigns, campaignId]
  );

  const canManualEdit = useMemo(() => {
    if (isDmContext === false) return false;
    if (isDmContext === true) {
      return targetCampaign ? targetCampaign.isDm !== false : true;
    }
    return workspaceMode === 'dm' && (!targetCampaign || targetCampaign.isDm !== false);
  }, [isDmContext, workspaceMode, targetCampaign]);

  const permittedBuild = useMemo(
    () =>
      getPermittedBuildChoices55e({
        speciesIndex: raceIndex,
        originIndex,
        classIndex,
        subclassIndex,
        level,
      }),
    [raceIndex, originIndex, classIndex, subclassIndex, level]
  );

  // Carrega magias permitidas sempre que classe, espécie, origem, linhagem ou nível mudar
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoadingPermittedSpells(true);
    fetchPermittedSpellsForBuild55e({
      speciesIndex: raceIndex,
      originIndex,
      classIndex,
      subclassIndex,
      lineageId,
      level,
    }).then((res) => {
      if (active) {
        setPermittedSpells(res);
        setLoadingPermittedSpells(false);
      }
    });
    return () => {
      active = false;
    };
  }, [isOpen, raceIndex, originIndex, classIndex, subclassIndex, lineageId, level]);

  const apply55eProgression = useCallback(
    async (opts: {
      spIdx: string;
      orIdx: string;
      clIdx: string;
      subIdx?: string;
      lvl: number;
      customBaseStats?: Record<StatKey, number>;
      preserveCustomGearAndNotes?: boolean;
      overrideSkills?: string[];
      overrideLineageId?: string;
    }) => {
      setLoadingApiTrait(true);
      try {
        const prog = await fetchCharacterProgression55e({
          speciesIndex: opts.spIdx,
          originIndex: opts.orIdx,
          classIndex: opts.clIdx,
          subclassIndex: opts.subIdx,
          level: opts.lvl,
          baseStats: opts.customBaseStats,
        });

        const buildOpts = getPermittedBuildChoices55e({
          speciesIndex: opts.spIdx,
          originIndex: opts.orIdx,
          classIndex: opts.clIdx,
          subclassIndex: opts.subIdx,
          level: opts.lvl,
        });

        setRaceLabel(prog.speciesLabel);
        setSpeed(prog.speed);

        const activeLineage = buildOpts.lineageConfig?.options.find(
          (l) => l.id === opts.overrideLineageId
        ) || buildOpts.lineageConfig?.options[0];

        const nextTraits = activeLineage
          ? [`Variante/Linhagem: ${activeLineage.name}`, ...prog.racialTraits]
          : prog.racialTraits;
        setRacialTraits(nextTraits);

        setBackground(prog.originName);
        setOriginFeat(prog.originFeat);
        setClassLabel(prog.classLabel);
        setSubclass(prog.subclassLabel);
        setStats(prog.stats);
        setMaxHp(prog.maxHp);
        setHp(prog.maxHp);
        setArmorClass(prog.armorClass);
        setHitDice(prog.hitDice);
        setSavingThrows(prog.savingThrows);

        const chosenSkills =
          opts.overrideSkills && opts.overrideSkills.length > 0
            ? opts.overrideSkills
            : buildOpts.skillConfig.options.slice(0, buildOpts.skillConfig.count);
        if (!opts.overrideSkills) {
          setSelectedClassSkills(chosenSkills);
        }

        const originDef = DND_ORIGINS_CATALOG.find((o) => o.index === opts.orIdx);
        const clsDef = DND_CLASSES_CATALOG.find((c) => c.index === opts.clIdx);
        const mergedProfs = Array.from(
          new Set([
            ...(clsDef?.proficiencies.slice(0, 3) || []),
            ...chosenSkills,
            ...(originDef?.skills || []),
            ...(originDef?.tool ? [originDef.tool] : []),
          ])
        );
        setProficiencies(mergedProfs);
        setWeaponMasteries(prog.weaponMasteries);
        setClassFeatures(prog.classFeatures);
        setClassResources(prog.classResources);
        setSpellSlots(prog.spellSlots);

        if (!opts.preserveCustomGearAndNotes) {
          setSpells(prog.recommendedSpells);
          setEquipment(prog.startingEquipment);
        } else {
          setSpells((prev) => {
            const merged = [...prev];
            for (const sp of prog.recommendedSpells) {
              if (!merged.some((m) => m.index === sp.index)) {
                merged.push(sp);
              }
            }
            return merged;
          });
        }
      } finally {
        setLoadingApiTrait(false);
      }
    },
    []
  );

  // Inicializa o modal (Nova ficha vs Editar existente)
  useEffect(() => {
    if (!isOpen) return;
    setSwapSourceKey(null);
    setRoll4d6Details([]);
    setRoll3d6Details([]);

    if (existingSheet) {
      // Para Jogador, regras auto-calculadas permanecem sempre vinculadas às escolhas 5.5e
      setAutoSyncBuild(!canManualEdit);
      setName(existingSheet.name);
      setRaceLabel(existingSheet.race);
      const matchedRace = DND_RACES_CATALOG.find((r) =>
        existingSheet.race.toLowerCase().includes(r.name.split(' (')[0].toLowerCase())
      );
      if (matchedRace) setRaceIndex(matchedRace.index);
      setRacialTraits(existingSheet.racialTraits);

      const matchedClass = DND_CLASSES_CATALOG.find((c) =>
        existingSheet.className
          .toLowerCase()
          .includes(c.name.split(' (')[0].toLowerCase())
      );
      if (matchedClass) {
        setClassIndex(matchedClass.index);
        const matchedSub = matchedClass.subclasses.find(
          (sc) => sc.name.toLowerCase() === (existingSheet.subclass || '').toLowerCase()
        );
        setSubclassIndex(matchedSub?.index || matchedClass.subclasses[0]?.index || '');
        const skillCfg = getPermittedBuildChoices55e({
          speciesIndex: matchedRace?.index || 'human',
          originIndex: 'soldier',
          classIndex: matchedClass.index,
          level: existingSheet.level,
        }).skillConfig;
        const matchingSkills = existingSheet.proficiencies.filter((p) =>
          skillCfg.options.includes(p)
        );
        setSelectedClassSkills(
          matchingSkills.length > 0
            ? matchingSkills
            : skillCfg.options.slice(0, skillCfg.count)
        );
      }
      setClassLabel(existingSheet.className);
      setSubclass(existingSheet.subclass || '');

      const matchedOrigin = DND_ORIGINS_CATALOG.find(
        (o) => o.name.toLowerCase() === (existingSheet.background || '').toLowerCase()
      );
      if (matchedOrigin) setOriginIndex(matchedOrigin.index);
      setBackground(existingSheet.background);
      setOriginFeat(existingSheet.originFeat || '');

      setLevel(existingSheet.level);
      setAlignment(existingSheet.alignment);
      setCampaignId(existingSheet.campaignId);
      setHp(existingSheet.hp);
      setMaxHp(existingSheet.maxHp);
      setTempHp(existingSheet.tempHp);
      setArmorClass(existingSheet.armorClass);
      setSpeed(existingSheet.speed);
      setHitDice(existingSheet.hitDice);
      setHitDiceUsed(existingSheet.hitDiceUsed);
      setStatMethod(existingSheet.statGenerationMethod || 'standard');
      setStats(existingSheet.stats);
      setBaseStats(
        existingSheet.baseStats ||
          inferBaseStatsFromFinal(
            existingSheet.stats,
            matchedOrigin?.index || 'soldier',
            matchedClass?.index || 'fighter',
            existingSheet.level
          )
      );
      setSavingThrows(existingSheet.savingThrows || []);
      setProficiencies(existingSheet.proficiencies);
      setWeaponMasteries(existingSheet.weaponMasteries || []);
      setClassFeatures(existingSheet.classFeatures || []);
      setClassResources(existingSheet.classResources || []);
      setSpellSlots({ ...EMPTY_SLOTS, ...existingSheet.spellSlots });
      setSpells(existingSheet.spells);
      setEquipment(existingSheet.equipment);
      setNotes(existingSheet.notes);
      setSelectedEquipPackIds({});
    } else {
      setAutoSyncBuild(true);
      setName('');
      setRaceIndex('human');
      setLineageId('skilled');
      setOriginIndex('soldier');
      setClassIndex('fighter');
      setSubclassIndex('champion');
      setLevel(1);
      setAlignment('Neutro');
      setCampaignId(activeCampaignId || campaigns[0]?.id || '');
      setTempHp(0);
      setHitDiceUsed(0);
      setNotes('');
      setStatMethod('standard');
      const stdBase = computeBaseStatsStandardArray('fighter');
      setBaseStats(stdBase);
      setSelectedEquipPackIds({});
      const defaultSkills = getPermittedBuildChoices55e({
        speciesIndex: 'human',
        originIndex: 'soldier',
        classIndex: 'fighter',
        level: 1,
      }).skillConfig;
      const initSkills = defaultSkills.options.slice(0, defaultSkills.count);
      setSelectedClassSkills(initSkills);
      apply55eProgression({
        spIdx: 'human',
        orIdx: 'soldier',
        clIdx: 'fighter',
        subIdx: 'champion',
        lvl: 1,
        customBaseStats: stdBase,
        overrideSkills: initSkills,
        overrideLineageId: 'skilled',
      });
    }
  }, [existingSheet, isOpen, activeCampaignId, campaigns, apply55eProgression, canManualEdit]);

  // Círculo máximo liberado para filtro inteligente de magias
  const maxUnlockedSpellCircle = useMemo(() => {
    let maxC = permittedBuild.effectiveMaxCircle;
    const keys = [
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
    keys.forEach((k, idx) => {
      if ((spellSlots[k]?.max || 0) > 0) maxC = Math.max(maxC, idx + 1);
    });
    if (spellSlots.pactSlots?.max) {
      maxC = Math.max(maxC, spellSlots.pactSlots.level);
    }
    return maxC;
  }, [spellSlots, permittedBuild.effectiveMaxCircle]);

  // Busca de magias na API 2024 (5.5e)
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsSearchingSpells(true);
    const enforceClassFilter = !canManualEdit || filterByClassLevel;
    searchDndSpells(
      spellSearchQuery,
      enforceClassFilter
        ? {
            classIndex,
            maxLevel: Math.max(1, maxUnlockedSpellCircle),
          }
        : undefined
    ).then((res) => {
      if (active) {
        setSpellSearchResults(res);
        setIsSearchingSpells(false);
      }
    });
    return () => {
      active = false;
    };
  }, [
    spellSearchQuery,
    filterByClassLevel,
    canManualEdit,
    classIndex,
    maxUnlockedSpellCircle,
    isOpen,
  ]);

  // Busca de equipamentos na API 2024 (ou catálogo permitido para Jogador)
  useEffect(() => {
    if (!isOpen) return;
    if (!canManualEdit) {
      const q = equipSearchQuery.trim().toLowerCase();
      setEquipSearchResults(
        permittedBuild.permittedEquipment.filter(
          (eq) =>
            !q ||
            eq.name.toLowerCase().includes(q) ||
            eq.category.toLowerCase().includes(q) ||
            (eq.mastery || '').toLowerCase().includes(q)
        )
      );
      setIsSearchingEquip(false);
      return;
    }

    let active = true;
    setIsSearchingEquip(true);
    searchDndEquipment(equipSearchQuery).then((res) => {
      if (active) {
        setEquipSearchResults(res);
        setIsSearchingEquip(false);
      }
    });
    return () => {
      active = false;
    };
  }, [equipSearchQuery, isOpen, canManualEdit, permittedBuild.permittedEquipment]);

  if (!isOpen) return null;

  const selectedClassDef =
    DND_CLASSES_CATALOG.find((c) => c.index === classIndex) ||
    DND_CLASSES_CATALOG[0];

  const handleBuilderChange = (next: {
    spIdx?: string;
    orIdx?: string;
    clIdx?: string;
    subIdx?: string;
    lvl?: number;
    nextLineageId?: string;
  }) => {
    const spIdx = next.spIdx ?? raceIndex;
    const orIdx = next.orIdx ?? originIndex;
    const clIdx = next.clIdx ?? classIndex;
    const clsDef =
      DND_CLASSES_CATALOG.find((c) => c.index === clIdx) || DND_CLASSES_CATALOG[0];
    const subIdx =
      next.clIdx && next.clIdx !== classIndex
        ? clsDef.subclasses[0]?.index || ''
        : next.subIdx ?? subclassIndex;
    const lvl = Math.max(1, Math.min(20, next.lvl ?? level));

    const nextPermitted = getPermittedBuildChoices55e({
      speciesIndex: spIdx,
      originIndex: orIdx,
      classIndex: clIdx,
      subclassIndex: subIdx,
      level: lvl,
    });

    const nextLineage =
      next.nextLineageId ??
      (next.spIdx && next.spIdx !== raceIndex
        ? nextPermitted.lineageConfig?.options[0]?.id || ''
        : lineageId || nextPermitted.lineageConfig?.options[0]?.id || '');

    let nextBase = baseStats;
    if (next.clIdx && next.clIdx !== classIndex && statMethod === 'standard') {
      nextBase = computeBaseStatsStandardArray(clIdx);
      setBaseStats(nextBase);
    }

    let nextSkills = selectedClassSkills;
    if (next.clIdx && next.clIdx !== classIndex) {
      nextSkills = nextPermitted.skillConfig.options.slice(
        0,
        nextPermitted.skillConfig.count
      );
      setSelectedClassSkills(nextSkills);
      setSelectedEquipPackIds({});
    }

    setRaceIndex(spIdx);
    setLineageId(nextLineage);
    setOriginIndex(orIdx);
    setClassIndex(clIdx);
    setSubclassIndex(subIdx);
    setLevel(lvl);

    const shouldSync = !canManualEdit || autoSyncBuild;
    if (shouldSync) {
      apply55eProgression({
        spIdx,
        orIdx,
        clIdx,
        subIdx,
        lvl,
        customBaseStats: nextBase,
        preserveCustomGearAndNotes: Boolean(existingSheet) && !(next.clIdx && next.clIdx !== classIndex),
        overrideSkills: nextSkills,
        overrideLineageId: nextLineage,
      });
    }
  };

  // Troca de método de geração de atributos
  const handleSelectStatMethod = (method: StatGenerationMethod) => {
    setStatMethod(method);
    setSwapSourceKey(null);
    let nextBase = baseStats;

    if (method === 'standard') {
      nextBase = computeBaseStatsStandardArray(classIndex);
      setRoll4d6Details([]);
      setRoll3d6Details([]);
    } else if (method === 'roll4d6') {
      const rolled = roll4d6DropLowestForBuild(classIndex);
      nextBase = rolled.baseStats;
      setRoll4d6Details(rolled.details);
      setRoll3d6Details([]);
    } else {
      const rolled = rollRandom3d6ForBuild();
      nextBase = rolled.baseStats;
      setRoll3d6Details(rolled.details);
      setRoll4d6Details([]);
    }

    setBaseStats(nextBase);
    const updatedStats = applyOriginAndAsiToBaseStats(
      nextBase,
      originIndex,
      classIndex,
      level
    );
    setStats(updatedStats);
    apply55eProgression({
      spIdx: raceIndex,
      orIdx: originIndex,
      clIdx: classIndex,
      subIdx: subclassIndex,
      lvl: level,
      customBaseStats: nextBase,
      preserveCustomGearAndNotes: true,
      overrideSkills: selectedClassSkills,
      overrideLineageId: lineageId,
    });
  };

  const handleRerollAttributes = () => {
    handleSelectStatMethod(statMethod);
  };

  const handleSwapBaseStat = (targetKey: StatKey) => {
    if (!swapSourceKey) {
      setSwapSourceKey(targetKey);
      return;
    }
    if (swapSourceKey === targetKey) {
      setSwapSourceKey(null);
      return;
    }
    const nextBase: Record<StatKey, number> = {
      ...baseStats,
      [swapSourceKey]: baseStats[targetKey],
      [targetKey]: baseStats[swapSourceKey],
    };
    setSwapSourceKey(null);
    setBaseStats(nextBase);
    apply55eProgression({
      spIdx: raceIndex,
      orIdx: originIndex,
      clIdx: classIndex,
      subIdx: subclassIndex,
      lvl: level,
      customBaseStats: nextBase,
      preserveCustomGearAndNotes: true,
      overrideSkills: selectedClassSkills,
      overrideLineageId: lineageId,
    });
  };

  const handleToggleClassSkill = (skill: string) => {
    const { count } = permittedBuild.skillConfig;
    let next: string[];
    if (selectedClassSkills.includes(skill)) {
      next = selectedClassSkills.filter((s) => s !== skill);
    } else {
      if (selectedClassSkills.length >= count) {
        next = [...selectedClassSkills.slice(1), skill];
      } else {
        next = [...selectedClassSkills, skill];
      }
    }
    setSelectedClassSkills(next);
    const originDef = DND_ORIGINS_CATALOG.find((o) => o.index === originIndex);
    const mergedProfs = Array.from(
      new Set([
        ...selectedClassDef.proficiencies.slice(0, 3),
        ...next,
        ...(originDef?.skills || []),
        ...(originDef?.tool ? [originDef.tool] : []),
      ])
    );
    setProficiencies(mergedProfs);
  };

  const handleSelectEquipmentPack = (
    groupIdx: number,
    optionId: string,
    items: Omit<CharacterEquipmentItem, 'id'>[]
  ) => {
    setSelectedEquipPackIds((prev) => ({ ...prev, [groupIdx]: optionId }));
    setEquipment((prev) => {
      // Adiciona os itens do pacote escolhido evitando duplicação simples pelo nome
      const next = [...prev];
      for (const item of items) {
        if (!next.some((ex) => ex.name === item.name)) {
          next.unshift({
            ...item,
            id: `eq-pack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          });
        }
      }
      return next;
    });
  };

  const handleTogglePermittedSpell = (sp: Omit<CharacterSpell, 'id'>) => {
    const exists = spells.find((s) => s.index === sp.index);
    if (exists) {
      setSpells((prev) => prev.filter((s) => s.index !== sp.index));
    } else {
      const newSp: CharacterSpell = {
        ...sp,
        id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        prepared: true,
      };
      setSpells((prev) => [...prev, newSp].sort((a, b) => a.level - b.level));
    }
  };

  const handleAddSpellFromApi = (sp: Omit<CharacterSpell, 'id'>) => {
    if (spells.some((existing) => existing.index === sp.index)) return;
    const newSp: CharacterSpell = {
      ...sp,
      id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      prepared: true,
    };
    setSpells((prev) => [newSp, ...prev]);
  };

  const handleRemoveSpell = (id: string) => {
    setSpells((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddEquipFromApi = (eq: Omit<CharacterEquipmentItem, 'id'>) => {
    const newEq: CharacterEquipmentItem = {
      ...eq,
      id: `eq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setEquipment((prev) => [newEq, ...prev]);
  };

  const handleAddCustomItemDm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManualEdit || !customItemName.trim()) return;
    handleAddEquipFromApi({
      name: customItemName.trim(),
      category: customItemCat.trim() || 'Item Especial',
      damage: customItemDmgOrAc.trim() || undefined,
      quantity: 1,
      equipped: true,
    });
    setCustomItemName('');
    setCustomItemDmgOrAc('');
  };

  const handleRemoveEquip = (id: string) => {
    setEquipment((prev) => prev.filter((e) => e.id !== id));
  };

  const wisMod = Math.floor((stats.wis - 10) / 2);
  const profBonus = Math.ceil(level / 4) + 1;
  const hasPerceptionProf = proficiencies.some((p) =>
    p.toLowerCase().includes('percepção')
  );
  const passivePerception = 10 + wisMod + (hasPerceptionProf ? profBonus : 0);

  const handleSaveSheet = () => {
    const campObj = campaignId
      ? campaigns.find((c) => c.id === campaignId)
      : undefined;
    const payload: Omit<CharacterSheet, 'id' | 'updatedAt'> = {
      playerId: existingSheet?.playerId || currentUser?.id || '',
      playerName: existingSheet?.playerName || currentUser?.name || 'Jogador',
      campaignId: campObj?.id || '',
      campaignTitle: campObj?.title || 'Sem campanha vinculada',
      name: name.trim() || 'Personagem Sem Nome',
      race: raceLabel,
      racialTraits,
      className: classLabel,
      subclass: level >= 3 ? subclass : '',
      level,
      background,
      alignment,
      hp,
      maxHp,
      tempHp,
      armorClass,
      speed,
      hitDice,
      hitDiceUsed,
      proficiencyBonus: profBonus,
      passivePerception,
      statGenerationMethod: statMethod,
      baseStats,
      stats,
      proficiencies,
      originFeat,
      savingThrows,
      weaponMasteries,
      classFeatures,
      classResources,
      spellSlots,
      spells,
      equipment,
      notes,
    };

    if (existingSheet) {
      updateCharacterSheet(existingSheet.id, payload);
    } else {
      createCharacterSheet(payload);
    }
    onClose();
  };

  const spellSlotEntries = (
    [
      ['level1', '1º Círculo'],
      ['level2', '2º Círculo'],
      ['level3', '3º Círculo'],
      ['level4', '4º Círculo'],
      ['level5', '5º Círculo'],
      ['level6', '6º Círculo'],
      ['level7', '7º Círculo'],
      ['level8', '8º Círculo'],
      ['level9', '9º Círculo'],
    ] as const
  ).filter(([key, _], idx) => idx < 3 || (spellSlots[key]?.max || 0) > 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 lg:p-6">
      <div className="max-w-5xl w-full max-h-[92vh] rounded-xl bg-[#131317] border border-white/[0.1] shadow-elevated flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-100">
                {existingSheet ? name || 'Editar Ficha' : 'Criar Personagem D&D 5.5e (2024)'}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[10px] font-mono text-amber-300">
                SRD 5.2 · 2024
              </span>
              {canManualEdit ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-medium text-emerald-300">
                  <Unlock className="w-2.5 h-2.5" />
                  Mestre: Edição manual liberada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-white/[0.08] text-[10px] font-medium text-zinc-300">
                  <Lock className="w-2.5 h-2.5 text-zinc-400" />
                  Modo Jogador: Regras automáticas 5.5e
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {raceLabel} · {background} · {classLabel} Nv. {level}
              {level >= 3 && subclass ? ` (${subclass})` : ''} · Bônus Prof. +{profBonus}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManualEdit && (
              <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 mr-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSyncBuild}
                  onChange={(e) => setAutoSyncBuild(e.target.checked)}
                />
                <span>Auto-preencher ao mudar nível/classe</span>
              </label>
            )}

            {canManualEdit && !autoSyncBuild && (
              <button
                type="button"
                onClick={() =>
                  apply55eProgression({
                    spIdx: raceIndex,
                    orIdx: originIndex,
                    clIdx: classIndex,
                    subIdx: subclassIndex,
                    lvl: level,
                    customBaseStats: baseStats,
                    preserveCustomGearAndNotes: true,
                    overrideSkills: selectedClassSkills,
                    overrideLineageId: lineageId,
                  })
                }
                className="btn-subtle px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
                title="Puxar todas as habilidades, PV, espaços e magias do nível atual na API 5.5e"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Puxar tudo do Nv. {level}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="btn-subtle px-3.5 py-1.5 rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveSheet}
              className="btn-solid px-4 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar ficha</span>
            </button>
          </div>
        </div>

        {/* Underline Tabs */}
        <div className="px-6 border-b border-white/[0.06] flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-1 shrink-0">
            {[
              { id: 'stats' as const, label: 'Atributos & combate', icon: Swords },
              {
                id: 'choices' as const,
                label: 'Opções da Build (Itens, Magias & Perícias)',
                icon: Sliders,
              },
              {
                id: 'features' as const,
                label: `Habilidades Nv. 1–${level} (${classFeatures.length})`,
                icon: Award,
              },
              {
                id: 'grimoire' as const,
                label: `Grimório (${spells.length})`,
                icon: BookOpen,
              },
              {
                id: 'inventory' as const,
                label: `Inventário & Maestrias (${equipment.length})`,
                icon: Backpack,
              },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`relative inline-flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors shrink-0 ${
                    active ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 opacity-80" />
                  <span>{t.label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-zinc-100 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {loadingApiTrait && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-300 shrink-0 ml-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Sincronizando SRD 5.5e (Nível {level})...
            </span>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!canManualEdit && (
            <div className="px-3.5 py-2.5 rounded-lg bg-[#0e0e11] border border-white/[0.08] flex items-center gap-2.5 text-xs text-zinc-400">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Os valores numéricos (atributos finais, PV, CA, dados de vida e espaços) são calculados pelas regras 5.5e. Escolha seu método de atributos, opções da build, itens e magias permitidas — apenas o <strong className="text-zinc-200">Mestre</strong> pode editar valores manualmente.
              </span>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Row 1: Nome, Nível (1-20), Classe 5.5e, Subclasse 5.5e */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Nome do personagem
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Alaric Thorne"
                    className="input-clean w-full px-3 py-2 rounded-lg text-sm font-medium"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-amber-300/90 mb-1">
                    Nível (1–20)
                  </label>
                  <select
                    value={level}
                    onChange={(e) =>
                      handleBuilderChange({ lvl: Number(e.target.value) })
                    }
                    className="input-clean w-full px-3 py-2 rounded-lg text-xs font-mono font-semibold"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((lvlNum) => (
                      <option key={lvlNum} value={lvlNum}>
                        Nível {lvlNum} (Prof. +{Math.ceil(lvlNum / 4) + 1})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Classe (5.5e)
                  </label>
                  <select
                    value={classIndex}
                    onChange={(e) =>
                      handleBuilderChange({ clIdx: e.target.value })
                    }
                    className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                  >
                    {DND_CLASSES_CATALOG.map((c) => (
                      <option key={c.index} value={c.index}>
                        {c.name} (d{c.hitDie})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Subclasse {level < 3 ? '(Libera no Nv. 3)' : '(5.5e)'}
                  </label>
                  {level < 3 ? (
                    <div className="px-3 py-2 rounded-lg bg-[#0e0e11] border border-white/[0.06] text-xs text-zinc-500">
                      Desbloqueada no Nível 3
                    </div>
                  ) : (
                    <select
                      value={subclassIndex}
                      onChange={(e) =>
                        handleBuilderChange({ subIdx: e.target.value })
                      }
                      className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                    >
                      {selectedClassDef.subclasses.map((sc) => (
                        <option key={sc.index} value={sc.index}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Row 2: Espécie 5.5e, Origem 5.5e (+2/+1 + Talento), Campanha */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Espécie (5.5e)
                  </label>
                  <select
                    value={raceIndex}
                    onChange={(e) =>
                      handleBuilderChange({ spIdx: e.target.value })
                    }
                    className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                  >
                    {DND_RACES_CATALOG.map((r) => (
                      <option key={r.index} value={r.index}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Origem / Antecedente (5.5e)
                  </label>
                  <select
                    value={originIndex}
                    onChange={(e) =>
                      handleBuilderChange({ orIdx: e.target.value })
                    }
                    className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                  >
                    {DND_ORIGINS_CATALOG.map((o) => (
                      <option key={o.index} value={o.index}>
                        {o.name} (+2 {o.primaryBoost.toUpperCase()} / +1{' '}
                        {o.secondaryBoost.toUpperCase()} · {o.originFeat.split(' (')[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Campanha vinculada
                  </label>
                  <select
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                  >
                    <option value="">Sem campanha vinculada</option>
                    {campaigns.map((camp) => (
                      <option key={camp.id} value={camp.id}>
                        {camp.title} {camp.isDm === false ? '(Jogando)' : '(Mestre)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Inline Permitted Preview Callout */}
              <div className="p-3.5 rounded-xl bg-[#0e0e11] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5 text-xs">
                  <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      Opções Permitidas para {classLabel} · {raceLabel} · {background}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Escolha {permittedBuild.skillConfig.count} perícias da classe, selecione pacotes/itens permitidos ({permittedBuild.permittedEquipment.length} opções)
                    {permittedBuild.effectiveMaxCircle > 0
                      ? ` e escolha suas magias permitidas (até ${permittedBuild.effectiveMaxCircle}º círculo).`
                      : '.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('choices')}
                  className="btn-solid px-3.5 py-1.5 rounded-lg text-xs shrink-0"
                >
                  Configurar itens, magias & perícias permitidas
                </button>
              </div>

              {/* Combat Vitals Bar (Manual Edit Only for DM) */}
              <div className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.06] grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <span className="text-[11px] text-zinc-500 block">
                    PV Atual / Máx
                  </span>
                  {canManualEdit ? (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <input
                        type="number"
                        value={hp}
                        onChange={(e) => setHp(Number(e.target.value))}
                        className="input-clean w-16 px-2 py-1.5 rounded-lg text-sm font-mono font-semibold text-center"
                      />
                      <span className="text-zinc-600">/</span>
                      <input
                        type="number"
                        value={maxHp}
                        onChange={(e) => setMaxHp(Number(e.target.value))}
                        className="input-clean w-16 px-2 py-1.5 rounded-lg text-sm font-mono font-semibold text-center"
                      />
                    </div>
                  ) : (
                    <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-mono font-semibold text-zinc-200 inline-flex items-center gap-1.5">
                      <span>{hp} / {maxHp}</span>
                      <Lock className="w-3 h-3 text-zinc-500" />
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-zinc-500 block">
                    Classe de Armadura
                  </span>
                  {canManualEdit ? (
                    <input
                      type="number"
                      value={armorClass}
                      onChange={(e) => setArmorClass(Number(e.target.value))}
                      className="input-clean w-20 mt-1.5 px-2.5 py-1.5 rounded-lg text-sm font-mono font-semibold text-center block"
                    />
                  ) : (
                    <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm font-mono font-semibold text-zinc-200 inline-flex items-center gap-1.5">
                      <span>{armorClass}</span>
                      <Lock className="w-3 h-3 text-zinc-500" />
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-zinc-500 block">
                    Dados de Vida
                  </span>
                  {canManualEdit ? (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <input
                        type="text"
                        value={hitDice}
                        onChange={(e) => setHitDice(e.target.value)}
                        className="input-clean w-16 px-2 py-1.5 rounded-lg text-xs font-mono text-center"
                      />
                      <input
                        type="number"
                        min={0}
                        value={hitDiceUsed}
                        onChange={(e) => setHitDiceUsed(Number(e.target.value))}
                        title="Dados gastos"
                        className="input-clean w-12 px-1.5 py-1.5 rounded-lg text-xs font-mono text-center"
                      />
                    </div>
                  ) : (
                    <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-mono font-semibold text-zinc-200 inline-flex items-center gap-1.5">
                      <span>{hitDice} ({hitDiceUsed} gastos)</span>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-zinc-500 block">
                    Percepção Passiva
                  </span>
                  <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs font-mono font-semibold text-zinc-200 inline-block">
                    {passivePerception} (Prof. +{profBonus})
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-zinc-500 block">
                    Deslocamento
                  </span>
                  {canManualEdit ? (
                    <input
                      type="text"
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value)}
                      className="input-clean w-full mt-1.5 px-2.5 py-1.5 rounded-lg text-xs"
                    />
                  ) : (
                    <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-medium text-zinc-200">
                      {speed}
                    </div>
                  )}
                </div>
              </div>

              {/* Attribute Generation Mode Selector + 6 Ability Scores */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-300">
                      Método de Geração dos Atributos Base
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Escolha valores padrões recomendados, rolagem de 4d6 (descarta menor) ou aleatório puro. Depois clique em <ArrowLeftRight className="w-3 h-3 inline mx-0.5" /> para trocar os valores entre atributos.
                    </p>
                  </div>

                  {statMethod !== 'standard' && (
                    <button
                      type="button"
                      onClick={handleRerollAttributes}
                      className="btn-subtle px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 border border-amber-500/30 text-amber-200"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      <span>
                        {statMethod === 'roll4d6'
                          ? 'Rolar 4d6 novamente'
                          : 'Gerar aleatórios novamente'}
                      </span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'standard' as const,
                      title: 'Valores Padrões Base',
                      desc: 'Array recomendado (15, 14, 13, 12, 10, 8)',
                    },
                    {
                      id: 'roll4d6' as const,
                      title: 'Rolagem de 4d6',
                      desc: 'Rola 4d6 para cada atributo (descarta o menor)',
                    },
                    {
                      id: 'random' as const,
                      title: 'Aleatório (3d6)',
                      desc: 'Valores totalmente aleatórios (3–18 por atributo)',
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectStatMethod(m.id)}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        statMethod === m.id
                          ? 'bg-amber-500/10 border-amber-500/40 text-zinc-100'
                          : 'bg-[#0e0e11] border-white/[0.06] text-zinc-400 hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="text-xs font-semibold flex items-center justify-between">
                        <span>{m.title}</span>
                        {statMethod === m.id && (
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-400">
                    Valores finais incluem Bônus de Origem (+2 / +1) e ASI até o Nível {level}.
                  </span>
                  {savingThrows.length > 0 && (
                    <span className="text-[11px] text-zinc-500">
                      Salvaguardas proficientes: {savingThrows.join(', ')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {STAT_KEYS.map((key) => {
                    const label = STAT_LABELS[key];
                    const isSaveProf = savingThrows.some((s) =>
                      s.toLowerCase().startsWith(label.slice(0, 3).toLowerCase())
                    );
                    const rawMod = Math.floor((stats[key] - 10) / 2);
                    const saveVal = rawMod + (isSaveProf ? profBonus : 0);
                    const isSwappingThis = swapSourceKey === key;
                    const r4Detail = roll4d6Details.find((d) => d.statKey === key);
                    const r3Detail = roll3d6Details.find((d) => d.statKey === key);

                    return (
                      <div
                        key={key}
                        className={`p-3 rounded-xl bg-[#0e0e11] border text-center flex flex-col justify-between ${
                          isSwappingThis
                            ? 'border-amber-400 ring-1 ring-amber-400/50'
                            : isSaveProf
                            ? 'border-amber-500/30'
                            : 'border-white/[0.06]'
                        }`}
                      >
                        <div>
                          <span className="text-[11px] text-zinc-400 block mb-1.5">
                            {label}
                          </span>
                          {canManualEdit ? (
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={stats[key]}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setStats({ ...stats, [key]: v });
                                setBaseStats({ ...baseStats, [key]: v });
                              }}
                              className="input-clean w-16 mx-auto px-2 py-1 rounded-lg text-base font-mono font-semibold text-center block"
                            />
                          ) : (
                            <div className="w-16 mx-auto px-2 py-1 rounded-lg bg-[#141418] border border-white/[0.08] text-base font-mono font-semibold text-zinc-100 text-center">
                              {stats[key]}
                            </div>
                          )}

                          <div className="mt-1.5 flex items-center justify-center gap-2 text-[11px] font-mono">
                            <span className="text-zinc-200 font-semibold">
                              {calcMod(stats[key])}
                            </span>
                            <span
                              className={
                                isSaveProf ? 'text-amber-300' : 'text-zinc-500'
                              }
                              title="Salvaguarda"
                            >
                              SG {saveVal >= 0 ? `+${saveVal}` : saveVal}
                            </span>
                          </div>

                          <div className="text-[10px] font-mono text-zinc-500 mt-1">
                            Base: {baseStats[key]}
                          </div>

                          {r4Detail && (
                            <div className="text-[9px] font-mono text-zinc-500 mt-0.5">
                              [{r4Detail.dice.map((d, i) => (
                                <span
                                  key={i}
                                  className={
                                    i === r4Detail.droppedIndex
                                      ? 'line-through text-rose-400/70 mx-0.5'
                                      : 'text-zinc-300 mx-0.5'
                                  }
                                >
                                  {d}
                                </span>
                              ))}]
                            </div>
                          )}
                          {r3Detail && (
                            <div className="text-[9px] font-mono text-zinc-500 mt-0.5">
                              [{r3Detail.dice.join('+')}]
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSwapBaseStat(key)}
                          className={`mt-2 w-full py-1 rounded text-[10px] font-medium inline-flex items-center justify-center gap-1 transition-colors ${
                            isSwappingThis
                              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                              : swapSourceKey
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08]'
                          }`}
                        >
                          <ArrowLeftRight className="w-2.5 h-2.5" />
                          <span>
                            {isSwappingThis
                              ? 'Selecionado'
                              : swapSourceKey
                              ? 'Trocar aqui'
                              : 'Trocar'}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Class Resources Scaled to Level */}
              {classResources.length > 0 && (
                <div className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-2.5">
                  <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Recursos de Classe no Nível {level}</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {classResources.map((res, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-lg bg-[#141418] border border-white/[0.06]"
                      >
                        <div className="text-[10px] text-zinc-500 truncate">
                          {res.label}
                        </div>
                        <div className="text-xs font-mono font-semibold text-zinc-100 mt-0.5">
                          {res.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Origin Feat, Species Traits & Proficiencies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-2.5">
                  <h4 className="text-xs font-semibold text-zinc-300">
                    Traços de Espécie & Origem 5.5e
                  </h4>
                  {originFeat && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200">
                      <span className="font-semibold">Talento de Origem:</span>{' '}
                      {originFeat}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {racialTraits.map((tr, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs text-zinc-300"
                      >
                        {tr}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.06]">
                  <h4 className="text-xs font-semibold text-zinc-300 mb-2.5">
                    Proficiências ({classLabel} + {background})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {proficiencies.map((pr, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs text-zinc-300"
                      >
                        {pr}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NEW TAB: OPÇÕES PERMITIDAS PELA BUILD (PERÍCIAS, LINHAGEM, ITENS E MAGIAS PERMITIDAS) */}
          {activeTab === 'choices' && (
            <div className="space-y-6">
              {/* 1. Linhagem / Variante da Espécie */}
              {permittedBuild.lineageConfig && (
                <div className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-200">
                      {permittedBuild.lineageConfig.label}
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Selecione a variante da sua espécie ({raceLabel}) para atualizar traços e magias raciais permitidas.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {permittedBuild.lineageConfig.options.map((opt) => {
                      const active = lineageId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            handleBuilderChange({ nextLineageId: opt.id })
                          }
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            active
                              ? 'bg-amber-500/10 border-amber-500/40 text-zinc-100'
                              : 'bg-[#141418] border-white/[0.06] text-zinc-400 hover:border-white/[0.15]'
                          }`}
                        >
                          <div className="text-xs font-medium text-zinc-100">
                            {opt.name}
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            {opt.bonusSummary}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Perícias Permitidas pela Classe */}
              <div className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-200">
                      Perícias Permitidas para {classLabel}
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Selecione {permittedBuild.skillConfig.count} perícias permitidas pela classe (além das perícias da Origem {background}).
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-white/[0.05] text-xs font-mono text-amber-300">
                    {selectedClassSkills.length} / {permittedBuild.skillConfig.count}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {permittedBuild.skillConfig.options.map((skill) => {
                    const active = selectedClassSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleToggleClassSkill(skill)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                            : 'bg-[#141418] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {active ? '✓ ' : ''}
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Pacotes e Itens Permitidos pela Classe & Origem */}
              <div className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-200">
                    Opções de Equipamento Inicial Permitido ({classLabel})
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Escolha os pacotes de armas e armaduras permitidos para sua classe e adicione itens individuais autorizados.
                  </p>
                </div>

                {permittedBuild.equipmentChoices.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-2">
                    <div className="text-[11px] font-medium text-zinc-400">
                      {group.groupLabel}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {group.options.map((opt) => {
                        const selected = selectedEquipPackIds[gIdx] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              handleSelectEquipmentPack(gIdx, opt.id, opt.items)
                            }
                            className={`p-3 rounded-lg border text-left transition-colors ${
                              selected
                                ? 'bg-amber-500/10 border-amber-500/40 text-zinc-100'
                                : 'bg-[#141418] border-white/[0.06] text-zinc-300 hover:border-white/[0.15]'
                            }`}
                          >
                            <div className="text-xs font-medium">{opt.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <div className="text-[11px] font-medium text-zinc-400">
                    Todos os itens permitidos pelas proficiências de {classLabel} (clique para adicionar ao inventário):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                    {permittedBuild.permittedEquipment.map((eq, idx) => {
                      const inBag = equipment.some((ex) => ex.name === eq.name);
                      return (
                        <div
                          key={`${eq.name}-${idx}`}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                            inBag
                              ? 'bg-emerald-500/[0.07] border-emerald-500/30'
                              : 'bg-[#141418] border-white/[0.06]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-zinc-100 truncate">
                              {eq.name}
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate">
                              {eq.damage || eq.armorClass || eq.category}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddEquipFromApi(eq)}
                            className="btn-subtle px-2 py-1 rounded text-[11px] shrink-0"
                          >
                            {inBag ? '+1' : '+ Equipar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. Magias Permitidas pela Classe, Espécie e Origem */}
              <div className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-200">
                      Magias & Truques Permitidos (Nível {level})
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Lista filtrada automaticamente para {classLabel}, {raceLabel} e {background} até o{' '}
                      {permittedBuild.effectiveMaxCircle === 0
                        ? 'nível de truques'
                        : `${permittedBuild.effectiveMaxCircle}º círculo`}.
                      {permittedBuild.cantripsRecommended > 0 &&
                        ` Recomendado: ${permittedBuild.cantripsRecommended} truques e até ${permittedBuild.preparedSpellsRecommended} magias preparadas.`}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-white/[0.05] text-xs font-mono text-zinc-200">
                    {spells.length} selecionadas
                  </span>
                </div>

                {loadingPermittedSpells ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Carregando magias permitidas da API D&D 5.5e...</span>
                  </div>
                ) : permittedSpells.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[#141418] text-xs text-zinc-500">
                    Esta combinação de classe, espécie e origem não conjura magias no nível {level}. (Dica: origens como Acólito ou Guia liberam truques e magia de 1º círculo!).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {permittedSpells.map((sp) => {
                      const isSelected = spells.some((s) => s.index === sp.index);
                      return (
                        <div
                          key={sp.index}
                          className={`p-3 rounded-lg border flex items-start justify-between gap-2 transition-colors ${
                            isSelected
                              ? 'bg-emerald-500/[0.07] border-emerald-500/35'
                              : 'bg-[#141418] border-white/[0.06]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-zinc-100">
                              {sp.name}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                              {sp.level === 0 ? 'Truque' : `${sp.level}º Círculo`} · {sp.school}
                            </div>
                            <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1">
                              {sp.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTogglePermittedSpell(sp)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                                : 'btn-subtle'
                            }`}
                          >
                            {isSelected ? 'Selecionada ✓' : '+ Selecionar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Todas as habilidades desbloqueadas até o Nível {level}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Inclui Talento de Origem, dádivas de Espécie, Classe e Subclasse da revisão D&D 5.5e (2024).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    apply55eProgression({
                      spIdx: raceIndex,
                      orIdx: originIndex,
                      clIdx: classIndex,
                      subIdx: subclassIndex,
                      lvl: level,
                      customBaseStats: baseStats,
                      preserveCustomGearAndNotes: true,
                      overrideSkills: selectedClassSkills,
                      overrideLineageId: lineageId,
                    })
                  }
                  className="btn-subtle px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Atualizar habilidades da API 5.5e</span>
                </button>
              </div>

              {classFeatures.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#0e0e11] border border-white/[0.06] text-center text-xs text-zinc-500">
                  Clique em "Atualizar habilidades da API 5.5e" para carregar todas as características deste nível.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {classFeatures.map((feat, idx) => (
                    <div
                      key={`${feat.name}-${idx}`}
                      className="p-3.5 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-100">
                          {feat.name}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.07] text-[10px] font-mono text-zinc-400 shrink-0">
                          Nv. {feat.level} · {feat.source}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'grimoire' && (
            <div className="space-y-6">
              {/* Spell Slots Tracker (Max editable ONLY by DM) */}
              <div className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-zinc-300">
                    Espaços de Magia no Nível {level} (Tabela 5.5e)
                  </h3>
                  {spellSlots.pactSlots && spellSlots.pactSlots.max > 0 && (
                    <span className="px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/25 text-xs font-mono text-violet-300">
                      Magia de Pacto: {spellSlots.pactSlots.max} espaços de{' '}
                      {spellSlots.pactSlots.level}º Círculo (Descanso Curto)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {spellSlotEntries.map(([lvlKey, label]) => {
                    const slot = spellSlots[lvlKey] || { used: 0, max: 0 };
                    return (
                      <div
                        key={lvlKey}
                        className="p-2.5 rounded-lg bg-[#141418] border border-white/[0.06] flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-medium text-zinc-300">
                          {label}
                        </span>
                        {canManualEdit ? (
                          <div className="flex items-center gap-1 text-xs font-mono">
                            <input
                              type="number"
                              min={0}
                              value={slot.used}
                              onChange={(e) =>
                                setSpellSlots({
                                  ...spellSlots,
                                  [lvlKey]: {
                                    ...slot,
                                    used: Number(e.target.value),
                                  },
                                })
                              }
                              className="input-clean w-10 px-1.5 py-1 rounded text-center font-semibold"
                            />
                            <span className="text-zinc-600">/</span>
                            <input
                              type="number"
                              min={0}
                              value={slot.max}
                              onChange={(e) =>
                                setSpellSlots({
                                  ...spellSlots,
                                  [lvlKey]: {
                                    ...slot,
                                    max: Number(e.target.value),
                                  },
                                })
                              }
                              className="input-clean w-10 px-1.5 py-1 rounded text-center"
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-zinc-200 px-2 py-1 rounded bg-white/[0.04]">
                            {slot.used} / {slot.max}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Permitted Spell Catalog & API 2024 Spell Search */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-zinc-300">
                      {canManualEdit
                        ? 'Catálogo SRD 5.5e (2024)'
                        : 'Magias Permitidas para a Build'}
                    </label>
                    {canManualEdit && (
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={filterByClassLevel}
                          onChange={(e) => setFilterByClassLevel(e.target.checked)}
                        />
                        <span>Filtrar p/ classe & nível</span>
                      </label>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={spellSearchQuery}
                      onChange={(e) => setSpellSearchQuery(e.target.value)}
                      placeholder="Fireball, Cure Wounds, Wish, Shield..."
                      className="input-clean w-full pl-8 pr-3 py-2 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {isSearchingSpells && (
                      <div className="text-xs text-zinc-500 flex items-center gap-2 p-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Consultando API 2024...
                      </div>
                    )}
                    {spellSearchResults.map((sp) => (
                      <div
                        key={sp.index}
                        className="p-3 rounded-lg bg-[#0e0e11] border border-white/[0.06] hover:border-white/[0.14] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold text-zinc-100">
                              {sp.name}
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              {sp.level === 0 ? 'Truque' : `${sp.level}º Círculo`}{' '}
                              · {sp.school}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddSpellFromApi(sp)}
                            className="btn-subtle px-2.5 py-1 rounded-md text-xs flex items-center gap-1 shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Preparar</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1.5 line-clamp-2">
                          {sp.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Grimoire */}
                <div className="lg:col-span-7 space-y-3">
                  <h4 className="text-xs font-semibold text-zinc-300">
                    Magias preparadas & conhecidas ({spells.length})
                  </h4>

                  {spells.length === 0 ? (
                    <div className="p-8 rounded-xl bg-[#0e0e11] border border-white/[0.06] text-center text-xs text-zinc-500">
                      Nenhuma magia registrada para esta classe/nível. Selecione na coluna ao lado ou na aba Opções da Build.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {spells.map((sp) => (
                        <div
                          key={sp.id}
                          className="p-3.5 rounded-lg bg-[#0e0e11] border border-white/[0.06] space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-zinc-100">
                                {sp.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] font-mono text-zinc-400">
                                {sp.level === 0 ? 'Truque' : `${sp.level}º Círculo`}{' '}
                                · {sp.school}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSpell(sp.id)}
                              className="p-1 text-zinc-500 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500 font-mono">
                            <span>{sp.castingTime}</span>
                            <span>·</span>
                            <span>{sp.range}</span>
                            <span>·</span>
                            <span>{sp.duration}</span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {sp.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-5">
              {weaponMasteries.length > 0 && (
                <div className="p-4 rounded-xl bg-[#0e0e11] border border-white/[0.06] space-y-2">
                  <h4 className="text-xs font-semibold text-zinc-200">
                    Maestrias em Armas Ativas (D&D 5.5e)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {weaponMasteries.map((wm, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200"
                      >
                        {wm}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Equipment Search / Permitted Catalog */}
                <div className="lg:col-span-5 space-y-3">
                  <label className="block text-xs font-semibold text-zinc-300">
                    {canManualEdit
                      ? 'Buscar equipamento (API SRD 5.5e)'
                      : `Equipamentos Permitidos (${classLabel})`}
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={equipSearchQuery}
                      onChange={(e) => setEquipSearchQuery(e.target.value)}
                      placeholder="Espada, Armadura, Escudo, Sap, Vex..."
                      className="input-clean w-full pl-8 pr-3 py-2 rounded-lg text-xs"
                    />
                  </div>

                  {canManualEdit && (
                    <form
                      onSubmit={handleAddCustomItemDm}
                      className="p-3 rounded-lg bg-[#0e0e11] border border-white/[0.08] space-y-2"
                    >
                      <div className="text-[11px] font-medium text-emerald-300">
                        + Adicionar item customizado (exclusivo Mestre)
                      </div>
                      <input
                        type="text"
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        placeholder="Nome do item mágico / relíquia..."
                        className="input-clean w-full px-2.5 py-1.5 rounded text-xs"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customItemCat}
                          onChange={(e) => setCustomItemCat(e.target.value)}
                          placeholder="Categoria"
                          className="input-clean flex-1 px-2.5 py-1.5 rounded text-xs"
                        />
                        <input
                          type="text"
                          value={customItemDmgOrAc}
                          onChange={(e) => setCustomItemDmgOrAc(e.target.value)}
                          placeholder="Dano / Bônus"
                          className="input-clean flex-1 px-2.5 py-1.5 rounded text-xs"
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn-subtle w-full py-1.5 rounded text-xs"
                      >
                        Conceder item à ficha
                      </button>
                    </form>
                  )}

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {isSearchingEquip && (
                      <div className="text-xs text-zinc-500 flex items-center gap-2 p-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Consultando API 2024...
                      </div>
                    )}
                    {equipSearchResults.map((eq, i) => (
                      <div
                        key={`${eq.name}-${i}`}
                        className="p-3 rounded-lg bg-[#0e0e11] border border-white/[0.06] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-zinc-100 truncate">
                            {eq.name}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {eq.category} {eq.damage ? `· ${eq.damage}` : ''}{' '}
                            {eq.armorClass ? `· ${eq.armorClass}` : ''}
                          </div>
                          {eq.mastery && (
                            <div className="text-[10px] text-amber-300/90 mt-0.5">
                              {eq.mastery}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddEquipFromApi(eq)}
                          className="btn-subtle px-2.5 py-1 rounded-md text-xs flex items-center gap-1 shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Equipar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Character Inventory */}
                <div className="lg:col-span-7 space-y-3">
                  <h4 className="text-xs font-semibold text-zinc-300">
                    Itens equipados & mochila ({equipment.length})
                  </h4>

                  {equipment.length === 0 ? (
                    <div className="p-8 rounded-xl bg-[#0e0e11] border border-white/[0.06] text-center text-xs text-zinc-500">
                      Nenhum item registrado nesta ficha.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {equipment.map((eq) => (
                        <div
                          key={eq.id}
                          className="p-3 rounded-lg bg-[#0e0e11] border border-white/[0.06] flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="text-xs font-medium text-zinc-100">
                              {eq.name}{' '}
                              {eq.quantity > 1 && (
                                <span className="text-zinc-400 font-mono">
                                  ×{eq.quantity}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              {eq.category} {eq.damage ? `· ${eq.damage}` : ''}{' '}
                              {eq.armorClass ? `· ${eq.armorClass}` : ''} ·{' '}
                              {eq.weight || '1 kg'}
                            </div>
                            {(eq.mastery || eq.notes) && (
                              <div className="text-[11px] text-amber-300/85 mt-0.5">
                                {eq.mastery || eq.notes}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveEquip(eq.id)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Notas, vínculos & histórico pessoal
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Traços, juramentos, aliados e anotações de campanha..."
                      className="input-clean w-full px-3 py-2 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
