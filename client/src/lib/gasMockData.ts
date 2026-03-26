/**
 * gasMockData.ts — статические тестовые данные в точном GAS-формате
 *
 * Используется gasMock.ts когда VITE_MOCK_MODE=static.
 * Формат данных соответствует реальному GAS-бэкенду (gas-architecture/GAS_BACKEND.md).
 */

// ─── Общие вспомогательные данные ────────────────────────────────────────────

const heroIcons = [
  { id: "1", url: "https://placehold.co/48x48/4a90d9/ffffff?text=H1" },
  { id: "2", url: "https://placehold.co/48x48/e94040/ffffff?text=H2" },
  { id: "3", url: "https://placehold.co/48x48/50c878/ffffff?text=H3" },
];

const heroNames = [
  { id: "1", name: "Галахад" },
  { id: "2", name: "Корвус" },
  { id: "3", name: "Аурора" },
];

const heroSortOrder = [
  { heroId: "1", sortOrder: 1 },
  { heroId: "2", sortOrder: 2 },
  { heroId: "3", sortOrder: 3 },
];

const titanElements = [
  { heroId: "1", element: "земля" },
  { heroId: "2", element: "тьма" },
  { heroId: "3", element: "вода" },
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
    { id: 227, name: "Тёмный Владыка", element: "тьма", level: 150, defenders_fragments: "" },
    { id: 228, name: "Огненный Дракон", element: "огонь", level: 160, defenders_fragments: "" },
    { id: 229, name: "Ледяная Ведьма",  element: "вода", level: 170, defenders_fragments: "" },
  ],
  bossTeam: [
    { bossId: 227, heroId: "1", unitId: 1, position: 1 },
    { bossId: 227, heroId: "2", unitId: 2, position: 2 },
    { bossId: 228, heroId: "3", unitId: 1, position: 1 },
    { bossId: 228, heroId: "1", unitId: 2, position: 2 },
    { bossId: 229, heroId: "2", unitId: 1, position: 1 },
    { bossId: 229, heroId: "3", unitId: 2, position: 2 },
  ],
  bossLevel: [
    { id: 227, powerLevel: 120000 },
    { id: 228, powerLevel: 145000 },
    { id: 229, powerLevel: 168000 },
  ],
  heroIcons,
  heroNames,
  heroSortOrder,
  titanElements,
  attackTeams: [
    {
      id: "at_1001",
      bossId: 227,
      battle_game_id: "game_1001",
      defenders_fragments: "",
      hero1: "1", hero2: "2", hero3: "3",
      pet1: "101", pet2: "102", pet3: "103",
      spirit1: "201", spirit2: "202", spirit3: "203",
      result: "победа",
      enemy_type: "боссы",
    },
    {
      id: "at_1002",
      bossId: 228,
      battle_game_id: "game_1002",
      defenders_fragments: "",
      hero1: "3", hero2: "1", hero3: "2",
      pet1: "103", pet2: "101", pet3: "102",
      spirit1: "203", spirit2: "201", spirit3: "202",
      result: "победа",
      enemy_type: "боссы",
    },
    {
      id: "at_1003",
      bossId: 229,
      battle_game_id: "game_1003",
      defenders_fragments: "",
      hero1: "2", hero2: "3", hero3: "1",
      pet1: "102", pet2: "103", pet3: "101",
      spirit1: "202", spirit2: "203", spirit3: "201",
      result: "поражение",
      enemy_type: "боссы",
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
      id: "rp_2001",
      bossId: 227,
      battle_game_id: "game_2001",
      defenders_fragments: "frag_abc123",
      hero1: "1", hero2: "2", hero3: "3",
      pet1: "101", pet2: "102", pet3: "103",
      spirit1: "201", spirit2: "202", spirit3: "203",
      result: "победа",
      enemy_type: "герои",
    },
    {
      id: "rp_2002",
      bossId: 228,
      battle_game_id: "game_2002",
      defenders_fragments: "frag_def456",
      hero1: "3", hero2: "1", hero3: "2",
      pet1: "103", pet2: "101", pet3: "102",
      spirit1: "203", spirit2: "201", spirit3: "202",
      result: "победа",
      enemy_type: "титаны",
    },
    {
      id: "rp_2003",
      bossId: 229,
      battle_game_id: "game_2003",
      defenders_fragments: "frag_ghi789",
      hero1: "2", hero2: "3", hero3: "1",
      pet1: "102", pet2: "103", pet3: "101",
      spirit1: "202", spirit2: "203", spirit3: "201",
      result: "поражение",
      enemy_type: "герои",
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
    { battle_game_id: "game_1001", tag: "избранное" },
    { battle_game_id: "game_1001", tag: "топ" },
    { battle_game_id: "game_1002", tag: "проверено" },
  ],
};

// ─── getCollection ────────────────────────────────────────────────────────────

export const staticCollectionData = {
  items: [
    { itemId: "ch1-227", bossId: 227, heroId: "1", note: "Мой лучший бой" },
    { itemId: "ch2-228", bossId: 228, heroId: "3", note: "Нужно проверить" },
    { itemId: "ch3-229", bossId: 229, heroId: "2", note: "" },
  ],
};

// ─── getAdminStats ────────────────────────────────────────────────────────────

export const staticAdminStatsData = {
  bossList:       3,
  bossTeam:       6,
  bossLevel:      3,
  heroIcons:      3,
  heroNames:      3,
  heroSortOrder:  3,
  titanElements:  3,
  attackTeams:    3,
  heroicReplays:  2,
  titanicReplays: 1,
  petIcons:       3,
  spiritSkills:   3,
  spiritIcons:    3,
  mainBuffName:   "Бафф A",
  lastDataSync:   "2024-12-01T10:00:00Z",
  lastIconSync:   "2024-12-01T11:00:00Z",
};
