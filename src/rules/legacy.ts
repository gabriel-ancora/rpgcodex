import type { CharacterSheet } from '../types/campaign';
import {
  CLASSES,
  SPECIES,
  BACKGROUNDS,
  SPELLS,
  normalizeSearch,
  skillIdFromName,
} from '../data/dnd2024';
import type { ClassId, SkillId } from '../data/dnd2024';
import { createEmptyBuild, parseBuild, type CharacterBuild } from './build';

const norm = (s: string) => normalizeSearch(s || '');

function matchByName<T extends { name: string; nameEn: string; id: string }>(list: T[], text: string): T | undefined {
  const n = norm(text);
  return list.find((x) => n.includes(norm(x.name)) || n.includes(norm(x.nameEn)) || n.includes(x.id));
}

/**
 * Recupera o build de uma ficha. Fichas da versão anterior não têm `build`;
 * nesse caso inferimos o máximo possível pelos textos salvos.
 */
export function buildFromSheet(sheet: CharacterSheet): { build: CharacterBuild; inferred: boolean } {
  const parsed = parseBuild(sheet.build);
  if (parsed) return { build: parsed, inferred: false };

  const b = createEmptyBuild();
  const cls =
    matchByName(CLASSES, sheet.className) ||
    (norm(sheet.className).includes('ranger') || norm(sheet.className).includes('guardiao')
      ? CLASSES.find((c) => c.id === 'ranger')
      : undefined);
  if (cls) b.classId = cls.id as ClassId;
  b.level = Math.max(1, Math.min(20, sheet.level || 1));
  if (cls && sheet.subclass) {
    const sub = matchByName(cls.subclasses, sheet.subclass);
    if (sub) b.subclassId = sub.id;
  }
  const species = matchByName(SPECIES, sheet.race);
  if (species) {
    b.speciesId = species.id;
    const lineage = species.lineage?.options.find((o) => norm(sheet.race + ' ' + sheet.racialTraits.join(' ')).includes(norm(o.name)));
    if (lineage) b.lineageId = lineage.id;
  }
  const bg = matchByName(BACKGROUNDS, sheet.background);
  if (bg) b.backgroundId = bg.id;
  b.baseScores = { ...(sheet.baseStats || sheet.stats) };
  b.statMethod = 'manual';

  const skillIds = (sheet.skillProficiencies as SkillId[] | undefined) ||
    (sheet.proficiencies || []).map((p) => skillIdFromName(p)).filter((x): x is SkillId => Boolean(x));
  if (cls) b.classSkills = skillIds.filter((s) => cls.skillChoices.options.includes(s) && !bg?.skills.includes(s)).slice(0, cls.skillChoices.count);
  // Dados que a versão anterior já guardava na ficha e o criador novo também usa.
  b.expertise = ((sheet.skillExpertise as SkillId[] | undefined) || []).filter((s) => skillIds.includes(s));
  b.languages = (sheet.languages || []).filter((l) => l !== 'Comum');
  b.hpMethod = 'average';

  const byName = new Map(SPELLS.map((s) => [norm(s.name), s]));
  const byId = new Map(SPELLS.map((s) => [s.id, s]));
  for (const sp of sheet.spells || []) {
    const match = byId.get(sp.index) || byName.get(norm(sp.name.split(' (')[0]));
    if (!match) continue;
    if (match.level === 0) b.cantrips.push(match.id);
    else if (b.classId === 'wizard') {
      b.spellbook.push(match.id);
      if (sp.prepared !== false) b.prepared.push(match.id);
    } else b.prepared.push(match.id);
  }
  return { build: b, inferred: true };
}
