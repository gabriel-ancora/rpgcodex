import type {
  CharacterSheet,
  CharacterSpell,
  CharacterEquipmentItem,
  CharacterSpellSlots,
} from '../types/campaign';

/**
 * O Convex rejeita a mutation inteira se o objeto tiver qualquer campo que o
 * validador não conheça. Estas funções montam o payload apenas com os campos
 * aceitos (ver convex/lib/characterValidators.ts), descartando extras.
 */

function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

const SPELL_KEYS = [
  'id', 'index', 'name', 'level', 'school', 'castingTime', 'range', 'components',
  'duration', 'description', 'prepared', 'alwaysPrepared', 'source', 'ritual',
  'concentration', 'higherLevels',
] as const;

const EQUIPMENT_KEYS = [
  'id', 'itemId', 'name', 'category', 'damage', 'armorClass', 'mastery', 'properties',
  'weight', 'quantity', 'equipped', 'notes',
] as const;

const CONTENT_KEYS = [
  'name', 'avatarUrl', 'race', 'racialTraits', 'className', 'subclass', 'level',
  'background', 'alignment', 'hp', 'maxHp', 'tempHp', 'armorClass', 'speed', 'hitDice',
  'hitDiceUsed', 'proficiencyBonus', 'passivePerception', 'statGenerationMethod',
  'baseStats', 'stats', 'proficiencies', 'originFeat', 'savingThrows', 'weaponMasteries',
  'classFeatures', 'classResources', 'spellSlots', 'spells', 'equipment', 'notes',
  'skillProficiencies', 'skillExpertise', 'toolProficiencies', 'languages', 'currency',
  'heroicInspiration', 'initiativeBonus', 'build',
] as const;

type ContentKey = (typeof CONTENT_KEYS)[number];

const num = (n: unknown, fallback = 0) =>
  typeof n === 'number' && Number.isFinite(n) ? n : fallback;

function cleanSpell(s: CharacterSpell): CharacterSpell {
  const out = pick(s, SPELL_KEYS) as CharacterSpell;
  out.level = num(out.level);
  out.index = out.index || out.id;
  out.school = out.school || '';
  out.castingTime = out.castingTime || '';
  out.range = out.range || '';
  out.components = out.components || '';
  out.duration = out.duration || '';
  out.description = out.description || '';
  return out;
}

function cleanEquipment(e: CharacterEquipmentItem): CharacterEquipmentItem {
  const out = pick(e, EQUIPMENT_KEYS) as CharacterEquipmentItem;
  out.quantity = Math.max(0, num(out.quantity, 1));
  out.equipped = Boolean(out.equipped);
  out.category = out.category || 'Equipamento';
  return out;
}

function cleanSlots(slots: CharacterSpellSlots): CharacterSpellSlots {
  const slot = (s?: { used: number; max: number }) =>
    s ? { used: num(s.used), max: num(s.max) } : undefined;
  const out: CharacterSpellSlots = {
    level1: slot(slots.level1) || { used: 0, max: 0 },
    level2: slot(slots.level2) || { used: 0, max: 0 },
    level3: slot(slots.level3) || { used: 0, max: 0 },
  };
  (['level4', 'level5', 'level6', 'level7', 'level8', 'level9'] as const).forEach((k) => {
    const v = slot(slots[k]);
    if (v) out[k] = v;
  });
  if (slots.pactSlots) {
    out.pactSlots = {
      level: num(slots.pactSlots.level),
      used: num(slots.pactSlots.used),
      max: num(slots.pactSlots.max),
    };
  }
  return out;
}

/** Converte valores que o Convex não aceita (undefined dentro de objetos, NaN) */
function toConvexValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? 0 : v)));
}

/** Campos de conteúdo da ficha, limpos para create/update. */
export function sheetContentPayload(
  sheet: Partial<CharacterSheet>
): Partial<Pick<CharacterSheet, ContentKey>> {
  const out = pick(sheet as CharacterSheet, CONTENT_KEYS) as Partial<Pick<CharacterSheet, ContentKey>>;
  if (out.spells) out.spells = out.spells.map(cleanSpell);
  if (out.equipment) out.equipment = out.equipment.map(cleanEquipment);
  if (out.spellSlots) out.spellSlots = cleanSlots(out.spellSlots);
  if (out.classFeatures) {
    out.classFeatures = out.classFeatures.map((f) => ({
      level: num(f.level, 1),
      name: f.name || '',
      source: f.source || '',
      description: f.description || '',
    }));
  }
  if (out.classResources) {
    out.classResources = out.classResources.map((r) => ({ label: r.label || '', value: String(r.value ?? '') }));
  }
  if (out.build !== undefined) out.build = toConvexValue(out.build);
  if (out.statGenerationMethod === undefined) delete out.statGenerationMethod;
  return out;
}

/** Extrai a mensagem legível de um erro do Convex. */
export function convexErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'data' in err &&
    typeof (err as { data?: unknown }).data === 'string'
  ) {
    return (err as { data: string }).data;
  }
  const raw = err instanceof Error ? err.message : String(err);
  // Erros de servidor chegam como "[CONVEX M(...)] [Request ID: …] Server Error\nUncaught Error: <mensagem>"
  const m = raw.match(/Uncaught (?:Convex)?Error:\s*([^\n]+)/);
  if (m) return m[1].trim();
  if (/ArgumentValidationError|Validator/i.test(raw)) {
    return 'Os dados da ficha não passaram na validação do servidor.';
  }
  if (/network|fetch|Failed to fetch|WebSocket/i.test(raw)) {
    return 'Sem conexão com o servidor.';
  }
  return raw.split('\n')[0].slice(0, 160);
}
