import type { 
  ProcessedReplay, 
  ProcessedReplayMember, 
  FragmentGrade,
  DefendersFragments,
  ProcessedTotem,
  ProcessedSpiritSkill,
  ProcessedTalisman,
  SpiritsData,
  ReplayGroup
} from "@shared/schema";
import { getHeroName as getDefaultHeroName } from "./heroNames";

// Ключи основных баффов — хранятся в коде, не в БД
export const MAIN_BUFF_KEY_A = "percentInOutDamageModAndEnergyIncrease_any_99_100_300_99_1000_30";
export const MAIN_BUFF_KEY_B = "allParamsValueIncrease_1_4_300";
export const MAIN_BUFF_DISPLAY_A = "Бафф урона";
export const MAIN_BUFF_DISPLAY_B = "Бафф параметров";

export interface ServerAttackTeam {
  id: number;
  gameId: number;
  invasionId: number | null;
  bossId: number | null;
  bossLevel: number | null;
  chapter: number | null;
  level: number | null;
  enemyType: string | null;
  mainBuff: number | null;
  comment: string | null;
  defendersFragments: string | null;
}

export interface ServerPetIcon {
  id: number;
  petId: number;
  iconUrl: string;
}

export interface ServerSpiritSkill {
  id: number;
  skillId: number;
  name: string;
}

export interface ServerSpiritIcon {
  id: number;
  skillId: number;
  iconUrl: string;
}

export interface ServerTalisman {
  id: number;
  talismanId: number;
  name: string;
  effectKey: string;
  description: string | null;
  iconUrl: string | null;
}

export interface ServerBoss {
  gameId: number;
  label: string | null;
  desc: string | null;
  heroId: number | null;
}

// Извлекает номер главы из label типа "Адвенчура Ашероны 3 глава"
function extractChapterFromLabel(label: string | null): number | null {
  if (!label) return null;
  const match = label.match(/(\d+)\s*глава/i);
  return match ? parseInt(match[1], 10) : null;
}

// Извлекает номер боя из desc типа "Бой 1"
function extractLevelFromDesc(desc: string | null): number | null {
  if (!desc) return null;
  const match = desc.match(/(?:Бой|бой)\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

export function getFragmentGrade(fragments: number): FragmentGrade {
  if (fragments >= 7) return "red";
  if (fragments >= 3) return "orange";
  return "purple";
}

export const GRADE_COLORS: Record<FragmentGrade, string> = {
  purple: "ring-purple-500",
  orange: "ring-orange-500",
  red: "ring-red-500",
};

export const GRADE_BG_COLORS: Record<FragmentGrade, string> = {
  purple: "bg-purple-500/20",
  orange: "bg-orange-500/20",
  red: "bg-red-500/20",
};

export const GRADE_ORDER: Record<FragmentGrade, number> = {
  purple: 1,
  orange: 2,
  red: 3,
};

const ELEMENT_NAMES: Record<string, string> = {
  water: "Вода",
  fire: "Огонь",
  earth: "Земля",
  dark: "Тьма",
  light: "Свет",
};

function processSpirits(
  spirits: SpiritsData | undefined,
  skillNameMap: Map<number, string>,
  skillIconMap: Map<number, string>
): ProcessedTotem[] {
  if (!spirits) return [];
  
  const totems: ProcessedTotem[] = [];
  const elements = ["water", "fire", "earth", "dark", "light"] as const;
  
  for (const element of elements) {
    const totem = spirits[element];
    if (!totem) continue;
    
    const skills: ProcessedSpiritSkill[] = [];
    
    if (totem.elemental) {
      const level = totem.elementalLevel ?? 1;
      skills.push({
        skillId: totem.elemental,
        name: skillNameMap.get(totem.elemental) || `Скил ${totem.elemental}`,
        icon: skillIconMap.get(totem.elemental),
        level,
        grade: getFragmentGrade(level),
      });
    }
    
    if (totem.primal) {
      const level = totem.primalLevel ?? 1;
      skills.push({
        skillId: totem.primal,
        name: skillNameMap.get(totem.primal) || `Скил ${totem.primal}`,
        icon: skillIconMap.get(totem.primal),
        level,
        grade: getFragmentGrade(level),
      });
    }
    
    if (skills.length > 0) {
      totems.push({
        element,
        elementRu: ELEMENT_NAMES[element] || element,
        skills,
      });
    }
  }
  
  return totems;
}

export function processReplaysFromServer(
  attackTeams: ServerAttackTeam[],
  heroIcons: Array<{ heroId: number; iconUrl: string }>,
  heroNames: Array<{ heroId: number; name: string }>,
  petIcons: ServerPetIcon[],
  spiritSkills: ServerSpiritSkill[] = [],
  spiritIcons: ServerSpiritIcon[] = [],
  bossList: ServerBoss[] = [],
  talismanList: ServerTalisman[] = []
): ProcessedReplay[] {
  const safeHeroIcons = heroIcons ?? [];
  const safeHeroNames = heroNames ?? [];
  const safePetIcons = petIcons ?? [];
  const safeSpiritsSkills = spiritSkills ?? [];
  const safeSpiritIcons = spiritIcons ?? [];
  const safeBossList = bossList ?? [];
  const safeTalismanList = talismanList ?? [];
  const safeAttackTeams = attackTeams ?? [];

  const iconMap = new Map(safeHeroIcons.map((h) => [h.heroId, h.iconUrl]));
  const nameMap = new Map(safeHeroNames.map((h) => [h.heroId, h.name]));
  const petIconMap = new Map(safePetIcons.map((p) => [p.petId, p.iconUrl]));
  const skillNameMap = new Map(safeSpiritsSkills.map((s) => [s.skillId, s.name]));
  const skillIconMap = new Map(safeSpiritIcons.map((s) => [s.skillId, s.iconUrl]));
  
  // Создаём мап для быстрого поиска боя по gameId (bossId)
  const bossMap = new Map(safeBossList.map((b) => [b.gameId, b]));
  
  // Создаём функцию для определения талисмана по effects
  const findTalisman = (effects?: Record<string, number>): ProcessedTalisman | undefined => {
    if (!effects || safeTalismanList.length === 0) return undefined;
    for (const [effectKey] of Object.entries(effects)) {
      // Пропускаем ключи основных баффов (хардкод, меняется редко)
      if (effectKey.startsWith(MAIN_BUFF_KEY_A)) continue;
      if (effectKey.startsWith(MAIN_BUFF_KEY_B)) continue;
      const found = safeTalismanList.find(t => effectKey.startsWith(t.effectKey));
      if (found) {
        return {
          talismanId: found.talismanId,
          name: found.name,
          icon: found.iconUrl ?? undefined,
          effectKey: found.effectKey,
          description: found.description ?? undefined,
        };
      }
    }
    return undefined;
  };

  // Функция для определения имени активного баффа
  const findBuffName = (effects?: Record<string, number>): string | undefined => {
    if (!effects) return undefined;
    if (Object.keys(effects).some(k => k.startsWith(MAIN_BUFF_KEY_A))) return MAIN_BUFF_DISPLAY_A;
    if (Object.keys(effects).some(k => k.startsWith(MAIN_BUFF_KEY_B))) return MAIN_BUFF_DISPLAY_B;
    return undefined;
  };

  const getHeroNameFn = (heroId: number): string => {
    return nameMap.get(heroId) || getDefaultHeroName(heroId);
  };

  const replays: ProcessedReplay[] = safeAttackTeams
    .filter((team) => team.defendersFragments && team.bossId)
    .map((team) => {
      let defenders: DefendersFragments;
      try {
        defenders = JSON.parse(team.defendersFragments!) as DefendersFragments;
      } catch {
        return null;
      }

      if (!defenders.units || defenders.units.length === 0) {
        return null;
      }

      const teamMembers: ProcessedReplayMember[] = defenders.units.map((heroId) => {
        const fragmentCount = defenders.fragments?.[heroId.toString()] ?? 0;
        const favorPetId = defenders.favor?.[heroId.toString()];
        
        return {
          heroId,
          name: getHeroNameFn(heroId),
          icon: iconMap.get(heroId),
          fragmentCount,
          grade: getFragmentGrade(fragmentCount),
          favorPetId,
          favorPetIcon: favorPetId ? petIconMap.get(favorPetId) : undefined,
          favorPetName: favorPetId ? getHeroNameFn(favorPetId) : undefined,
        };
      });

      const mainPetId = defenders.petId;
      const mainPetIcon = mainPetId ? petIconMap.get(mainPetId) : undefined;
      const mainPetName = mainPetId ? getHeroNameFn(mainPetId) : undefined;
      
      // Обработка тотемов со скилами
      const totems = processSpirits(defenders.spirits, skillNameMap, skillIconMap);
      
      // Определяем chapter и level: сначала из team, потом из bossMap по bossId
      let chapter = team.chapter;
      let level = team.level;
      
      if ((!chapter || !level) && team.bossId) {
        const boss = bossMap.get(team.bossId);
        if (boss) {
          if (!chapter) {
            chapter = extractChapterFromLabel(boss.label);
          }
          if (!level) {
            level = extractLevelFromDesc(boss.desc);
          }
        }
      }
      
      // Пропускаем записи без chapter или level
      if (!chapter || !level) {
        return null;
      }

      const talisman = findTalisman(defenders.effects);
      const mainBuffName = findBuffName(defenders.effects);

      return {
        id: team.id,
        gameId: team.gameId,
        chapter,
        level,
        enemyType: defenders.units.some(id => id >= 4000 && id <= 4999) ? "Титаны" : "Герои",
        mainBuff: team.mainBuff ?? undefined,
        mainBuffName,
        comment: team.comment ?? undefined,
        mainPetId,
        mainPetIcon,
        mainPetName,
        team: teamMembers,
        totems: totems.length > 0 ? totems : undefined,
        talisman,
        rawDefendersFragments: team.defendersFragments!,
      } as ProcessedReplay;
    })
    .filter((r): r is ProcessedReplay => r !== null);

  // Сортировка как в обычных боях - по gameId в обратном порядке
  return replays.sort((a, b) => b.gameId - a.gameId);
}

// Создаёт ключ группировки из отсортированных units
function createGroupKey(replay: ProcessedReplay): string {
  const unitIds = replay.team.map(m => m.heroId).sort((a, b) => a - b);
  return unitIds.join("-");
}

// Группирует записи с одинаковым составом
export function groupReplays(replays: ProcessedReplay[]): ReplayGroup[] {
  const groupMap = new Map<string, ProcessedReplay[]>();
  
  for (const replay of replays) {
    const key = createGroupKey(replay);
    const existing = groupMap.get(key) || [];
    existing.push(replay);
    groupMap.set(key, existing);
  }
  
  const groups: ReplayGroup[] = [];
  
  groupMap.forEach((groupReplays, groupKey) => {
    // Сортируем по level внутри группы
    groupReplays.sort((a: ProcessedReplay, b: ProcessedReplay) => a.level - b.level);
    
    const minLevel = groupReplays[0].level;
    const maxLevel = groupReplays[groupReplays.length - 1].level;
    
    // Формируем строку диапазона
    const levelRange = minLevel === maxLevel 
      ? String(minLevel) 
      : `${minLevel}...${maxLevel}`;
    
    // Берём запись с максимальным грейдом как представительную
    const displayReplay = groupReplays.reduce((best: ProcessedReplay, current: ProcessedReplay) => {
      const bestMaxGrade = getMaxGrade(best);
      const currentMaxGrade = getMaxGrade(current);
      return currentMaxGrade > bestMaxGrade ? current : best;
    }, groupReplays[0]);
    
    groups.push({
      groupKey,
      replays: groupReplays,
      levelRange,
      minLevel,
      maxLevel,
      displayReplay,
    });
  });
  
  // Сортируем группы по gameId первой записи (по убыванию)
  return groups.sort((a, b) => b.displayReplay.gameId - a.displayReplay.gameId);
}

// Возвращает числовое значение максимального грейда в записи
function getMaxGrade(replay: ProcessedReplay): number {
  let maxGrade = 0;
  for (const member of replay.team) {
    const grade = member.grade === "red" ? 3 : member.grade === "orange" ? 2 : 1;
    if (grade > maxGrade) maxGrade = grade;
  }
  return maxGrade;
}
