/**
 * gasMockData.ts — статические тестовые данные в точном GAS-формате
 *
 * Используется gasMock.ts когда VITE_MOCK_MODE=static.
 * Формат данных соответствует реальному GAS-бэкенду (gas-architecture/GAS_BACKEND.md).
 */

// ─── Общие вспомогательные данные ────────────────────────────────────────────

const heroIcons = [
  { id: 1, heroId: 1, iconUrl: "https://placehold.co/48x48/4a90d9/ffffff?text=H1", category: null },
  { id: 2, heroId: 2, iconUrl: "https://placehold.co/48x48/e94040/ffffff?text=H2", category: null },
  { id: 3, heroId: 3, iconUrl: "https://placehold.co/48x48/50c878/ffffff?text=H3", category: null },
];

const heroNames = [
  { id: 1, heroId: 1, name: "Галахад" },
  { id: 2, heroId: 2, name: "Корвус" },
  { id: 3, heroId: 3, name: "Аурора" },
];

const heroSortOrder = [
  { id: 1, heroId: 1, sortOrder: 1 },
  { id: 2, heroId: 2, sortOrder: 2 },
  { id: 3, heroId: 3, sortOrder: 3 },
];

const titanElements = [
  { id: 1, titanId: 1, element: "земля", points: 3 },
  { id: 2, titanId: 2, element: "тьма", points: 2 },
  { id: 3, titanId: 3, element: "вода", points: 3 },
];

const petIcons = [
  { id: "101", url: "https://placehold.co/48x48/f5a623/ffffff?text=P1" },
  { id: "102", url: "https://placehold.co/48x48/7b68ee/ffffff?text=P2" },
  { id: "103", url: "https://placehold.co/48x48/ff6347/ffffff?text=P3" },
];

const spiritSkills = [
  { id: "201", name: "Исцеление", effect: "heal_aoe" },
  { id: "202", name: "Удар", effect: "atk_boost" },
  { id: "203", name: "Щит", effect: "def_boost" },
];

const spiritIcons = [
  { id: "201", url: "https://placehold.co/48x48/00ced1/ffffff?text=S1" },
  { id: "202", url: "https://placehold.co/48x48/ff69b4/ffffff?text=S2" },
  { id: "203", url: "https://placehold.co/48x48/9acd32/ffffff?text=S3" },
];

// ─── getBattles ───────────────────────────────────────────────────────────────

export const staticBattlesData = {
  bossList: [
    { id: 1, gameId: 227, label: "Тёмный Владыка", desc: "тьма lv150", heroId: null },
    { id: 2, gameId: 228, label: "Огненный Дракон", desc: "огонь lv160", heroId: null },
    { id: 3, gameId: 229, label: "Ледяная Ведьма",  desc: "вода lv170",  heroId: null },
  ],
  bossTeam: [
    { id: 1, bossGameId: 227, heroId: 1, unitId: 1, bossLevelId: 1 },
    { id: 2, bossGameId: 227, heroId: 2, unitId: 2, bossLevelId: 1 },
    { id: 3, bossGameId: 228, heroId: 3, unitId: 1, bossLevelId: 2 },
    { id: 4, bossGameId: 228, heroId: 1, unitId: 2, bossLevelId: 2 },
    { id: 5, bossGameId: 229, heroId: 2, unitId: 1, bossLevelId: 3 },
    { id: 6, bossGameId: 229, heroId: 3, unitId: 2, bossLevelId: 3 },
  ],
  bossLevel: [
    { id: 1, gameId: 227, bossId: 1, powerLevel: 120000 },
    { id: 2, gameId: 228, bossId: 2, powerLevel: 145000 },
    { id: 3, gameId: 229, bossId: 3, powerLevel: 168000 },
  ],
  heroIcons,
  heroNames,
  heroSortOrder,
  titanElements,
  attackTeams: [
    {
      id: 1001,
      gameId: 227,
      invasionId: null,
      bossId: 227,
      bossLevel: null,
      chapter: 1,
      level: 1,
      enemyType: "боссы",
      mainBuff: null,
      comment: null,
      defendersFragments: JSON.stringify({ units: [1, 2, 3], fragments: { "1": 10, "2": 5, "3": 8 } }),
    },
    {
      id: 1002,
      gameId: 228,
      invasionId: null,
      bossId: 228,
      bossLevel: null,
      chapter: 1,
      level: 2,
      enemyType: "боссы",
      mainBuff: null,
      comment: null,
      defendersFragments: JSON.stringify({ units: [3, 1, 2], fragments: { "3": 7, "1": 12, "2": 3 } }),
    },
    {
      id: 1003,
      gameId: 229,
      invasionId: null,
      bossId: 229,
      bossLevel: null,
      chapter: 1,
      level: 3,
      enemyType: "боссы",
      mainBuff: null,
      comment: null,
      defendersFragments: JSON.stringify({ units: [2, 3, 1], fragments: { "2": 9, "3": 6, "1": 4 } }),
    },
  ],
  petIcons,
  spiritSkills,
  spiritIcons,
  maxBossId: 229,
};

// ─── getReplays ───────────────────────────────────────────────────────────────

export const staticReplaysData = {
  attackTeams: [
    {
      id: 2001,
      gameId: 227,
      invasionId: null,
      bossId: 227,
      bossLevel: null,
      chapter: 1,
      level: 1,
      enemyType: "герои",
      mainBuff: null,
      comment: null,
      defendersFragments: JSON.stringify({ units: [1, 2, 3], fragments: { "1": 10, "2": 5, "3": 8 } }),
    },
    {
      id: 2002,
      gameId: 228,
      invasionId: null,
      bossId: 228,
      bossLevel: null,
      chapter: 1,
      level: 2,
      enemyType: "титаны",
      mainBuff: null,
      comment: null,
      defendersFragments: JSON.stringify({ units: [4001, 4002, 4003], fragments: { "4001": 7, "4002": 12, "4003": 3 } }),
    },
    {
      id: 2003,
      gameId: 229,
      invasionId: null,
      bossId: 229,
      bossLevel: null,
      chapter: 1,
      level: 3,
      enemyType: "герои",
      mainBuff: null,
      comment: null,
      defendersFragments: JSON.stringify({ units: [2, 3, 1], fragments: { "2": 9, "3": 6, "1": 4 } }),
    },
  ],
  heroIcons,
  heroNames,
  petIcons,
  spiritSkills,
  spiritIcons,
  mainBuffName: "Бафф A",
};

// ─── getTags ──────────────────────────────────────────────────────────────────

export const staticTagsData = {
  tags: [
    { id: 1, battleGameId: 227, tag: "избранное" },
    { id: 2, battleGameId: 227, tag: "топ" },
    { id: 3, battleGameId: 228, tag: "проверено" },
  ],
  uniqueTags: ["избранное", "проверено", "топ"],
};

// ─── getCollection ────────────────────────────────────────────────────────────

interface GasCollectionItem {
  id: number;
  itemId: string;
  itemType: string;
  gameId: number;
  label: string | null;
  desc: string | null;
  battleType: string | null;
  teamJson: string | null;
  rawDefendersFragments: string | null;
  mainBuff: number | null;
  totemsJson: string | null;
  createdAt: number;
}

export const staticCollectionData: { items: GasCollectionItem[] } = {
  items: [
    {
      id: 1,
      itemId: "0-0:battle-abc123",
      itemType: "battle",
      gameId: 227,
      label: "Мой лучший бой",
      desc: null,
      battleType: "heroic",
      teamJson: null,
      rawDefendersFragments: null,
      mainBuff: null,
      totemsJson: null,
      createdAt: 1700000001,
    },
    {
      id: 2,
      itemId: "1-0:battle-def456",
      itemType: "battle",
      gameId: 228,
      label: "Нужно проверить",
      desc: null,
      battleType: "heroic",
      teamJson: null,
      rawDefendersFragments: null,
      mainBuff: null,
      totemsJson: null,
      createdAt: 1700000002,
    },
    {
      id: 3,
      itemId: "2-0:replay-ghi789",
      itemType: "replay",
      gameId: 229,
      label: null,
      desc: null,
      battleType: "titanic",
      teamJson: null,
      rawDefendersFragments: null,
      mainBuff: null,
      totemsJson: null,
      createdAt: 1700000003,
    },
  ],
};

// ─── getAdminStats ────────────────────────────────────────────────────────────

export const staticAdminStatsData = {
  bossList:          3,
  bossTeam:          6,
  bossLevel:         3,
  heroIcons:         3,
  heroNames:         3,
  heroSortOrder:     3,
  titanElements:     3,
  attackTeams:       3,
  heroicReplays:     2,
  titanicReplays:    1,
  petIcons:          3,
  talismans:         0,
  mainBuffNameA:     null,
  mainBuffEffectKeyA: null,
  mainBuffNameB:     null,
  mainBuffEffectKeyB: null,
};
