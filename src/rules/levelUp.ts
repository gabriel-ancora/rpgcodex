import type {
  CharacterSheet,
  LevelUpGainItem,
  PendingLevelUp,
} from '../types/campaign';
import type { CharacterBuild } from './build';
import {
  buildIssues,
  computeCharacter,
  normalizeBuild,
  type BuildStep,
  type ComputedCharacter,
} from './engine';
import { buildFromSheet } from './legacy';
import { sheetFromBuild } from './toSheet';

const SLOT_LABELS: { key: keyof ComputedCharacter['spellSlots']; circle: number }[] = [
  { key: 'level1', circle: 1 },
  { key: 'level2', circle: 2 },
  { key: 'level3', circle: 3 },
  { key: 'level4', circle: 4 },
  { key: 'level5', circle: 5 },
  { key: 'level6', circle: 6 },
  { key: 'level7', circle: 7 },
  { key: 'level8', circle: 8 },
  { key: 'level9', circle: 9 },
];

/**
 * Filtra apenas as pendências que exigem seleção real de progressão/escolhas
 * (ignorando avisos estéticos de distribuição inicial de atributos em fichas antigas).
 */
export function collectPendingProgressionChoices(
  build: CharacterBuild,
  c: ComputedCharacter
): { step: BuildStep; text: string }[] {
  return buildIssues(build, c).filter((issue) => {
    // Avisos sobre arranjo padrão / compra de pontos / 4d6 dizem respeito apenas à criação inicial
    if (
      issue.step === 'abilities' &&
      (issue.text.includes('arranjo padrão') ||
        issue.text.includes('compra de pontos') ||
        issue.text.includes('valor rolado'))
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Calcula detalhadamente tudo que o personagem ganhou entre `fromLevel + 1` e `toLevel`,
 * além das escolhas que dependem do jogador.
 */
export function computeLevelUpSummary(
  baseBuild: CharacterBuild,
  fromLevel: number,
  toLevel: number
): {
  nextBuild: CharacterBuild;
  prevComputed: ComputedCharacter;
  nextComputed: ComputedCharacter;
  gains: LevelUpGainItem[];
  pendingChoices: { step: BuildStep; text: string }[];
} {
  const safeFrom = Math.max(1, Math.min(19, Math.round(fromLevel)));
  const safeTo = Math.max(safeFrom + 1, Math.min(20, Math.round(toLevel)));

  const prevBuild: CharacterBuild = { ...baseBuild, level: safeFrom };
  const nextBuild: CharacterBuild = { ...baseBuild, level: safeTo };

  const prevComputed = computeCharacter(prevBuild);
  const nextComputed = computeCharacter(nextBuild);

  const gains: LevelUpGainItem[] = [];

  // 1. Ganho de Pontos de Vida e Dados de Vida
  const hpGain = nextComputed.maxHp - prevComputed.maxHp;
  if (hpGain > 0) {
    gains.push({
      category: 'hp',
      title: `+${hpGain} Pontos de Vida máximos (${prevComputed.maxHp} → ${nextComputed.maxHp})`,
      description: `Dados de Vida passam para ${nextComputed.hitDice} (média automática aplicada; pode ajustar para rolado no editor).`,
      level: safeTo,
    });
  }

  // 2. Bônus de Proficiência
  if (nextComputed.proficiencyBonus > prevComputed.proficiencyBonus) {
    gains.push({
      category: 'proficiency',
      title: `Bônus de Proficiência aumentou (+${prevComputed.proficiencyBonus} → +${nextComputed.proficiencyBonus})`,
      description: 'Eleva ataques com proficiência, CD de magias, perícias e salvaguardas treinadas.',
      level: safeTo,
    });
  }

  // 3. Novas Características de Classe, Subclasse e Espécie desbloqueadas nos níveis (safeFrom + 1 .. safeTo)
  const prevFeatureKeys = new Set(
    prevComputed.features.map((f) => `${f.level}:${f.name}:${f.source}`)
  );
  for (const feat of nextComputed.features) {
    const key = `${feat.level}:${feat.name}:${feat.source}`;
    if (feat.level > safeFrom && feat.level <= safeTo && !prevFeatureKeys.has(key)) {
      gains.push({
        category: 'feature',
        title: `${feat.name} (${feat.source})`,
        description: feat.description,
        level: feat.level,
      });
    }
  }

  // 4. Espaços de Magia e Magia de Pacto
  if (nextComputed.spellSlots.pactSlots) {
    const prevPact = prevComputed.spellSlots.pactSlots;
    const nextPact = nextComputed.spellSlots.pactSlots;
    if (
      !prevPact ||
      prevPact.max !== nextPact.max ||
      prevPact.level !== nextPact.level
    ) {
      gains.push({
        category: 'slots',
        title: `Magia de Pacto: ${nextPact.max} espaço(s) de ${nextPact.level}º círculo`,
        description: prevPact
          ? `Antes: ${prevPact.max} espaço(s) de ${prevPact.level}º círculo.`
          : 'Espaços recuperados em Descanso Curto ou Longo.',
        level: safeTo,
      });
    }
  } else {
    const slotChanges: string[] = [];
    for (const { key, circle } of SLOT_LABELS) {
      const prevMax = prevComputed.spellSlots[key]?.max || 0;
      const nextMax = nextComputed.spellSlots[key]?.max || 0;
      if (nextMax > prevMax) {
        slotChanges.push(
          prevMax === 0
            ? `${circle}º círculo desbloqueado (${nextMax})`
            : `${circle}º círculo: ${prevMax} → ${nextMax}`
        );
      }
    }
    if (slotChanges.length > 0) {
      gains.push({
        category: 'slots',
        title: 'Novos espaços de magia desbloqueados',
        description: slotChanges.join(' · '),
        level: safeTo,
      });
    }
  }

  // 5. Novas magias sempre preparadas / concedidas automaticamente
  const prevGranted = new Set(prevComputed.grantedSpells.map((g) => g.spell.id));
  for (const g of nextComputed.grantedSpells) {
    if (!prevGranted.has(g.spell.id)) {
      gains.push({
        category: 'spells',
        title: `Magia concedida: ${g.spell.name} (${g.source})`,
        description: g.note || 'Sempre preparada, sem contar no limite de magias preparadas.',
        level: safeTo,
      });
    }
  }

  // 6. Evolução de recursos da tabela de classe (Fúria, Inspiração, Pontos de Foco, Ataque Furtivo, Maestrias...)
  const prevResMap = new Map(prevComputed.resources.map((r) => [r.label, r.value]));
  for (const res of nextComputed.resources) {
    const oldVal = prevResMap.get(res.label);
    if (oldVal !== res.value) {
      gains.push({
        category: 'resource',
        title: oldVal ? `${res.label}: ${oldVal} → ${res.value}` : `${res.label}: ${res.value}`,
        description: 'Recurso de classe atualizado automaticamente na ficha.',
        level: safeTo,
      });
    }
  }

  const pendingChoices = collectPendingProgressionChoices(nextBuild, nextComputed);

  return {
    nextBuild,
    prevComputed,
    nextComputed,
    gains,
    pendingChoices,
  };
}

/**
 * Monta o patch completo da ficha para subir um personagem para `targetLevel`
 * (padrão: `sheet.level + 1`), preservando escolhas já feitas e registrando
 * `pendingLevelUp` até o jogador selecionar/confirmar suas escolhas.
 */
export function buildLevelUpPatch(
  sheet: CharacterSheet,
  unlockedBy: string,
  targetLevel?: number
): {
  patch: Partial<CharacterSheet>;
  pendingLevelUp: PendingLevelUp;
} | null {
  const nextLvl = targetLevel ?? sheet.level + 1;
  if (nextLvl <= sheet.level || nextLvl > 20) return null;

  // Se já havia uma subida pendente ainda não concluída pelo jogador, acumula desde `fromLevel` original!
  const effectiveFromLevel = sheet.pendingLevelUp?.fromLevel ?? sheet.level;

  const { build: currentBuild } = buildFromSheet(sheet);
  const { nextBuild, gains, pendingChoices } = computeLevelUpSummary(
    currentBuild,
    effectiveFromLevel,
    nextLvl
  );

  const cleanBuild = normalizeBuild(nextBuild);
  const cleanComputed = computeCharacter(cleanBuild);

  const updatedFields = sheetFromBuild(
    cleanBuild,
    cleanComputed,
    {
      name: sheet.name,
      alignment: sheet.alignment,
      avatarUrl: sheet.avatarUrl || undefined,
      notes: sheet.notes,
      campaignId: sheet.campaignId,
      campaignTitle: sheet.campaignTitle,
    },
    sheet,
    false
  );

  const pendingLevelUp: PendingLevelUp = {
    fromLevel: effectiveFromLevel,
    toLevel: nextLvl,
    unlockedAt: new Date().toISOString(),
    unlockedBy: unlockedBy || 'Mestre',
    gains,
    pendingChoices: collectPendingProgressionChoices(cleanBuild, cleanComputed),
    acknowledgedByPlayer: false,
  };

  return {
    patch: {
      ...updatedFields,
      pendingLevelUp,
    },
    pendingLevelUp,
  };
}

/**
 * Retorna a primeira etapa do CharacterBuilder onde o jogador tem escolhas pendentes.
 */
export function firstPendingStepForSheet(sheet: CharacterSheet): BuildStep {
  const first = sheet.pendingLevelUp?.pendingChoices?.[0]?.step as BuildStep | undefined;
  if (
    first &&
    ['class', 'origin', 'abilities', 'choices', 'spells', 'equipment', 'details'].includes(first)
  ) {
    return first;
  }
  return 'class';
}
