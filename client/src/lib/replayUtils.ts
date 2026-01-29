import type { 
  ProcessedReplay, 
  ProcessedReplayMember, 
  FragmentGrade,
  DefendersFragments,
  ProcessedTotem,
  ProcessedSpiritSkill,
  SpiritsData
} from "@shared/schema";
import { getHeroName as getDefaultHeroName } from "./heroNames";

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
  spiritIcons: ServerSpiritIcon[] = []
): ProcessedReplay[] {
  const iconMap = new Map(heroIcons.map((h) => [h.heroId, h.iconUrl]));
  const nameMap = new Map(heroNames.map((h) => [h.heroId, h.name]));
  const petIconMap = new Map(petIcons.map((p) => [p.petId, p.iconUrl]));
  const skillNameMap = new Map(spiritSkills.map((s) => [s.skillId, s.name]));
  const skillIconMap = new Map(spiritIcons.map((s) => [s.skillId, s.iconUrl]));

  const getHeroNameFn = (heroId: number): string => {
    return nameMap.get(heroId) || getDefaultHeroName(heroId);
  };

  const replays: ProcessedReplay[] = attackTeams
    .filter((team) => team.defendersFragments && team.chapter && team.level)
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
      
      // Обработка тотемов со скилами
      const totems = processSpirits(defenders.spirits, skillNameMap, skillIconMap);

      return {
        id: team.id,
        gameId: team.gameId,
        chapter: team.chapter ?? 0,
        level: team.level ?? 0,
        enemyType: (team.enemyType as "Герои" | "Титаны") || "Герои",
        mainBuff: team.mainBuff ?? undefined,
        comment: team.comment ?? undefined,
        mainPetId,
        mainPetIcon,
        team: teamMembers,
        totems: totems.length > 0 ? totems : undefined,
        rawDefendersFragments: team.defendersFragments!,
      } as ProcessedReplay;
    })
    .filter((r): r is ProcessedReplay => r !== null);

  // Сортировка как в обычных боях - по gameId в обратном порядке
  return replays.sort((a, b) => b.gameId - a.gameId);
}
