import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BattleCard } from "@/components/BattleCard";
import { ReplayCard } from "@/components/ReplayCard";
import { GroupedReplayCard } from "@/components/GroupedReplayCard";
import { BattleFilters, type SourceFilter, type SortMethod, type SortDirection } from "@/components/BattleFilters";
import { CollectionSidebar, type CollectedItem } from "@/components/CollectionSidebar";
import { AddToCollectionModal } from "@/components/AddToCollectionModal";
import { Library, Shield, AlertCircle, Loader2, PlayCircle } from "lucide-react";
import { 
  processBattlesFromServer, 
  type ServerBossList, 
  type ServerBossTeam, 
  type ServerBossLevel,
  type ServerHeroIcon,
  type ServerHeroName,
  type ServerHeroSortOrder,
  type ServerTitanElement
} from "@/lib/battleUtils";
import {
  processReplaysFromServer,
  groupReplays,
  type ServerAttackTeam,
  type ServerPetIcon,
  type ServerSpiritSkill,
  type ServerSpiritIcon
} from "@/lib/replayUtils";
import type { ProcessedBattle, ProcessedReplay, BattleType, BattleTag, ReplayGroup } from "@shared/schema";

interface TagsResponse {
  tags: BattleTag[];
  uniqueTags: string[];
}

interface BattlesResponse {
  bossList: ServerBossList[];
  bossTeam: ServerBossTeam[];
  bossLevel: ServerBossLevel[];
  heroIcons: ServerHeroIcon[];
  heroNames: ServerHeroName[];
  heroSortOrder: ServerHeroSortOrder[];
  titanElements: ServerTitanElement[];
  attackTeams: ServerAttackTeam[];
  petIcons: ServerPetIcon[];
  spiritSkills: ServerSpiritSkill[];
  spiritIcons: ServerSpiritIcon[];
  maxBossId: number;
}

type ListItem = 
  | { type: "battle"; data: ProcessedBattle; chapter: number; level: number }
  | { type: "replay"; data: ProcessedReplay; chapter: number; level: number }
  | { type: "replayGroup"; data: ReplayGroup; chapter: number; level: number };

export default function BattleLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilters, setTypeFilters] = useState<BattleType[]>([]);
  const [sourceFilters, setSourceFilters] = useState<SourceFilter[]>([]);
  const [chapterFilters, setChapterFilters] = useState<string[]>([]);
  const [battleNumberFilters, setBattleNumberFilters] = useState<string[]>([]);
  const [showOnlyWithCreeps, setShowOnlyWithCreeps] = useState(false);
  const [sortMethod, setSortMethod] = useState<SortMethod>("chapter");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [groupReplaysEnabled, setGroupReplaysEnabled] = useState(true);
  
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectedItems, setCollectedItems] = useState<Map<string, CollectedItem>>(new Map());
  const [modalOpen, setModalOpen] = useState(false);
  const [itemToAdd, setItemToAdd] = useState<CollectedItem | null>(null);

  interface ServerCollectionItem {
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

  const { data: collectionData } = useQuery<ServerCollectionItem[]>({
    queryKey: ["/api/collection"],
  });

  useEffect(() => {
    if (collectionData) {
      const map = new Map<string, CollectedItem>();
      for (const item of collectionData) {
        const slotKey = item.itemId.split(":")[0];
        map.set(slotKey, {
          id: item.itemId.split(":").slice(1).join(":"),
          type: item.itemType as "battle" | "replay",
          gameId: item.gameId,
          label: item.label || "",
          desc: item.desc || "",
          battleType: (item.battleType as "heroic" | "titanic") || "heroic",
          team: item.teamJson ? JSON.parse(item.teamJson) : [],
          rawDefendersFragments: item.rawDefendersFragments || undefined,
          mainBuff: item.mainBuff ?? undefined,
          totems: item.totemsJson ? JSON.parse(item.totemsJson) : undefined,
          bossHeroId: item.bossHeroId ?? undefined,
        });
      }
      setCollectedItems(map);
    }
  }, [collectionData]);

  const addToCollectionMutation = useMutation({
    mutationFn: async (data: { slotKey: string; item: CollectedItem }) => {
      await apiRequest("POST", "/api/collection", {
        itemId: `${data.slotKey}:${data.item.id}`,
        itemType: data.item.type,
        gameId: data.item.gameId,
        label: data.item.label,
        desc: data.item.desc,
        battleType: data.item.battleType,
        team: data.item.team,
        rawDefendersFragments: data.item.rawDefendersFragments,
        mainBuff: data.item.mainBuff,
        totems: data.item.totems,
        bossHeroId: data.item.bossHeroId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collection"] });
    },
  });

  const removeFromCollectionMutation = useMutation({
    mutationFn: async (slotKey: string) => {
      const item = collectedItems.get(slotKey);
      if (item) {
        await apiRequest("DELETE", `/api/collection/${encodeURIComponent(`${slotKey}:${item.id}`)}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collection"] });
    },
  });

  const clearCollectionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/collection");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collection"] });
    },
  });

  const collectedIds = useMemo(() => {
    const ids = new Set<string>();
    collectedItems.forEach((item) => ids.add(item.id));
    return ids;
  }, [collectedItems]);

  const handleAddToCollection = useCallback((item: CollectedItem) => {
    setItemToAdd(item);
    setModalOpen(true);
  }, []);

  const handleConfirmAdd = useCallback((chapterIndex: number, slotIndex: number, item: CollectedItem) => {
    const slotKey = `${chapterIndex}-${slotIndex}`;
    setCollectedItems((prev) => {
      const next = new Map(prev);
      next.set(slotKey, item);
      return next;
    });
    addToCollectionMutation.mutate({ slotKey, item });
  }, [addToCollectionMutation]);

  const handleRemoveItem = useCallback((slotKey: string) => {
    setCollectedItems((prev) => {
      const next = new Map(prev);
      next.delete(slotKey);
      return next;
    });
    removeFromCollectionMutation.mutate(slotKey);
  }, [removeFromCollectionMutation]);

  const handleClearCollection = useCallback(() => {
    setCollectedItems(new Map());
    clearCollectionMutation.mutate();
  }, [clearCollectionMutation]);

  const { data, isLoading, error } = useQuery<BattlesResponse>({
    queryKey: ["/api/battles"],
  });

  const { data: tagsData } = useQuery<TagsResponse>({
    queryKey: ["/api/tags"],
  });

  // Карта battleGameId -> tags[]
  const battleTagsMap = useMemo(() => {
    const map = new Map<number, string[]>();
    if (tagsData?.tags) {
      for (const tag of tagsData.tags) {
        const existing = map.get(tag.battleGameId) || [];
        existing.push(tag.tag);
        map.set(tag.battleGameId, existing);
      }
    }
    return map;
  }, [tagsData]);

  const allUniqueTags = useMemo(() => tagsData?.uniqueTags || [], [tagsData]);

  const battles = useMemo<ProcessedBattle[]>(() => {
    if (!data) return [];
    return processBattlesFromServer(
      data.bossList, 
      data.bossTeam, 
      data.bossLevel,
      data.heroIcons, 
      data.heroNames,
      data.heroSortOrder || [],
      data.titanElements || []
    );
  }, [data]);

  const replays = useMemo<ProcessedReplay[]>(() => {
    if (!data) return [];
    return processReplaysFromServer(
      data.attackTeams || [],
      data.heroIcons || [],
      data.heroNames || [],
      data.petIcons || [],
      data.spiritSkills || [],
      data.spiritIcons || [],
      data.bossList || []
    );
  }, [data]);

  // Карта titan ID -> element для фильтрации по хештегам стихий
  const titanElementsMap = useMemo(() => {
    if (!data?.titanElements) return new Map<number, string>();
    return new Map(data.titanElements.map(t => [t.titanId, t.element.toLowerCase()]));
  }, [data]);

  const chapters = useMemo(() => {
    const battleChapters = battles.map((b) => b.chapterNumber);
    const replayChapters = replays.map((r) => r.chapter);
    const uniqueChapters = Array.from(new Set([...battleChapters, ...replayChapters]));
    return uniqueChapters.sort((a, b) => a - b).map(n => n.toString());
  }, [battles, replays]);

  const extractBattleNumber = (battleNumber: string): number | null => {
    const match = battleNumber.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const battleNumbers = useMemo(() => {
    // Для legacy боёв используем legacyBattleNum, для новых - парсим из battleNumber
    const battleNums = battles.map((b) => b.legacyBattleNum ?? extractBattleNumber(b.battleNumber)).filter((n): n is number => n !== null);
    const replayNums = replays.map((r) => r.level);
    const uniqueNumbers = new Set([...battleNums, ...replayNums]);
    return Array.from(uniqueNumbers).sort((a, b) => a - b).map(n => n.toString());
  }, [battles, replays]);

  const replayGroups = useMemo(() => groupReplays(replays), [replays]);

  const combinedList = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    
    for (const battle of battles) {
      // Для legacy боёв (gameId < 338) используем вычисленный legacyBattleNum
      const level = battle.legacyBattleNum ?? extractBattleNumber(battle.battleNumber) ?? 0;
      items.push({
        type: "battle",
        data: battle,
        chapter: battle.chapterNumber,
        level,
      });
    }
    
    if (groupReplaysEnabled) {
      for (const group of replayGroups) {
        items.push({
          type: "replayGroup",
          data: group,
          chapter: group.displayReplay.chapter,
          level: group.minLevel,
        });
      }
    } else {
      for (const replay of replays) {
        items.push({
          type: "replay",
          data: replay,
          chapter: replay.chapter,
          level: replay.level,
        });
      }
    }
    
    return items.sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      if (a.level !== b.level) return a.level - b.level;
      if (a.type !== b.type) return a.type === "battle" ? -1 : 1;
      return 0;
    });
  }, [battles, replays, replayGroups, groupReplaysEnabled]);

  // Парсинг хештегов стихий из строки поиска
  const ELEMENT_HASHTAGS: Record<string, string> = {
    "#вода": "вода",
    "#огонь": "огонь",
    "#земля": "земля",
    "#тьма": "тьма",
    "#свет": "свет",
  };

  const filteredList = useMemo(() => {
    let result = combinedList;

    if (sourceFilters.length > 0) {
      result = result.filter((item) => {
        if (sourceFilters.includes("battles") && item.type === "battle") return true;
        if (sourceFilters.includes("replays") && (item.type === "replay" || item.type === "replayGroup")) return true;
        return false;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      // Извлекаем хештеги стихий, пользовательские теги и обычный текст поиска
      const elementHashtags: string[] = [];
      const userTags: string[] = [];
      let textQuery = query;
      
      // Разбираем хештеги
      const hashtagRegex = /#(\S+)/g;
      let match;
      while ((match = hashtagRegex.exec(query)) !== null) {
        const tagName = match[1].toLowerCase();
        const fullHashtag = `#${tagName}`;
        
        if (ELEMENT_HASHTAGS[fullHashtag]) {
          elementHashtags.push(ELEMENT_HASHTAGS[fullHashtag]);
        } else {
          userTags.push(tagName);
        }
        textQuery = textQuery.replace(fullHashtag, "").trim();
      }
      
      // Фильтруем по хештегам стихий (бои с титанами указанной стихии)
      if (elementHashtags.length > 0) {
        result = result.filter((item) => {
          const team = item.type === "battle" 
            ? item.data.team 
            : item.type === "replayGroup" 
              ? item.data.displayReplay.team 
              : item.data.team;
          return team.some((member) => {
            const titanElement = titanElementsMap.get(member.heroId);
            return titanElement && elementHashtags.includes(titanElement);
          });
        });
      }
      
      // Фильтруем по пользовательским тегам
      if (userTags.length > 0) {
        result = result.filter((item) => {
          const gameId = item.type === "battle" 
            ? item.data.gameId 
            : item.type === "replayGroup" 
              ? item.data.displayReplay.gameId 
              : item.data.gameId;
          const itemTags = battleTagsMap.get(gameId) || [];
          return userTags.every(tag => itemTags.includes(tag));
        });
      }
      
      // Фильтруем по текстовому запросу
      if (textQuery) {
        result = result.filter((item) => {
          if (item.type === "battle") {
            const b = item.data;
            return b.gameId.toString().includes(textQuery) ||
              b.team.some((t) => t.name.toLowerCase().includes(textQuery));
          } else if (item.type === "replayGroup") {
            const r = item.data.displayReplay;
            return r.gameId.toString().includes(textQuery) ||
              r.team.some((t) => t.name.toLowerCase().includes(textQuery)) ||
              (r.comment && r.comment.toLowerCase().includes(textQuery));
          } else {
            const r = item.data;
            return r.gameId.toString().includes(textQuery) ||
              r.team.some((t) => t.name.toLowerCase().includes(textQuery)) ||
              (r.comment && r.comment.toLowerCase().includes(textQuery));
          }
        });
      }
    }

    if (typeFilters.length > 0) {
      result = result.filter((item) => {
        if (item.type === "battle") {
          return typeFilters.includes(item.data.type);
        } else if (item.type === "replayGroup") {
          const battleType = item.data.displayReplay.enemyType === "Герои" ? "heroic" : "titanic";
          return typeFilters.includes(battleType as BattleType);
        } else {
          const battleType = item.data.enemyType === "Герои" ? "heroic" : "titanic";
          return typeFilters.includes(battleType as BattleType);
        }
      });
    }

    if (chapterFilters.length > 0) {
      result = result.filter((item) => {
        if (item.type === "replayGroup") {
          return item.data.replays.some(r => chapterFilters.includes(r.chapter.toString()));
        }
        return chapterFilters.includes(item.chapter.toString());
      });
    }

    if (battleNumberFilters.length > 0) {
      result = result.filter((item) => {
        if (item.type === "replayGroup") {
          return item.data.replays.some(r => battleNumberFilters.includes(r.level.toString()));
        }
        return battleNumberFilters.includes(item.level.toString());
      });
    }

    if (showOnlyWithCreeps) {
      result = result.filter((item) => {
        const team = item.type === "battle" 
          ? item.data.team 
          : item.type === "replayGroup" 
            ? item.data.displayReplay.team 
            : item.data.team;
        // Show only if ALL team members are creeps (ID 1000-3999), no heroes or titans
        return team.length > 0 && team.every((t) => t.heroId >= 1000 && t.heroId <= 3999);
      });
    }

    // Apply sorting
    const getPowerLevel = (item: ListItem): number => {
      if (item.type === "battle") {
        return item.data.powerLevel || 0;
      }
      return 0; // Replays don't have power level
    };

    const dir = sortDirection === "asc" ? 1 : -1;

    if (sortMethod === "power") {
      result.sort((a, b) => (getPowerLevel(b) - getPowerLevel(a)) * dir);
    } else {
      // Default: chapter -> level -> power
      result.sort((a, b) => {
        if (a.chapter !== b.chapter) return (a.chapter - b.chapter) * dir;
        if (a.level !== b.level) return (a.level - b.level) * dir;
        return (getPowerLevel(b) - getPowerLevel(a)) * dir;
      });
    }

    return result;
  }, [combinedList, searchQuery, typeFilters, sourceFilters, chapterFilters, battleNumberFilters, showOnlyWithCreeps, sortMethod, sortDirection, titanElementsMap, battleTagsMap]);

  const stats = useMemo(() => {
    const heroicBattles = battles.filter((b) => b.type === "heroic").length;
    const titanicBattles = battles.filter((b) => b.type === "titanic").length;
    const heroicReplays = replays.filter((r) => r.enemyType === "Герои").length;
    const titanicReplays = replays.filter((r) => r.enemyType === "Титаны").length;
    const totalReplays = replays.length;
    const grandTotal = battles.length + replays.length;
    return { heroicBattles, titanicBattles, totalBattles: battles.length, heroicReplays, titanicReplays, totalReplays, grandTotal };
  }, [battles, replays]);

  const hasData = battles.length > 0 || replays.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Загрузка библиотеки боёв...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p>Ошибка загрузки данных</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CollectionSidebar
        isOpen={collectionOpen}
        onToggle={() => setCollectionOpen(!collectionOpen)}
        collectedItems={collectedItems}
        onRemoveItem={handleRemoveItem}
        onClearCollection={handleClearCollection}
        maxBossId={data?.maxBossId || 0}
      />
      
      <AddToCollectionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setItemToAdd(null);
        }}
        itemToAdd={itemToAdd}
        collectedItems={collectedItems}
        onAddItem={handleConfirmAdd}
      />

      <div 
        className="container max-w-[1600px] mx-auto px-4 py-4 space-y-4 transition-[margin] duration-200 ease-out"
        style={{ marginTop: collectionOpen ? "200px" : "0" }}
      >
        <header 
          className="space-y-3 overflow-hidden transition-all duration-200 ease-out"
          style={{ 
            maxHeight: collectionOpen ? "0" : "120px",
            opacity: collectionOpen ? 0 : 1,
            marginBottom: collectionOpen ? "-16px" : "0"
          }}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Library className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Библиотека боёв</h1>
              <p className="text-sm text-muted-foreground">
                Инструмент для просмотра и анализа боёв Invasion
              </p>
            </div>
          </div>

          {hasData && (
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Героические:</span>
                <span className="font-medium">{stats.heroicBattles}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Титанические:</span>
                <span className="font-medium">{stats.titanicBattles}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <PlayCircle className="h-3 w-3 text-green-500" />
                <span className="text-muted-foreground">Записей героических:</span>
                <span className="font-medium">{stats.heroicReplays}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <PlayCircle className="h-3 w-3 text-amber-500" />
                <span className="text-muted-foreground">Записей титанических:</span>
                <span className="font-medium">{stats.titanicReplays}</span>
              </div>
              <div className="flex items-center gap-1.5 border-l pl-4 ml-2">
                <span className="text-muted-foreground">Всего:</span>
                <span className="font-medium">{stats.grandTotal}</span>
              </div>
            </div>
          )}
        </header>

        {hasData ? (
          <Card className="border-card-border">
            <CardContent className="pt-6 space-y-4">
              <BattleFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                typeFilters={typeFilters}
                onTypeFiltersChange={setTypeFilters}
                sourceFilters={sourceFilters}
                onSourceFiltersChange={setSourceFilters}
                chapterFilters={chapterFilters}
                onChapterFiltersChange={setChapterFilters}
                chapters={chapters}
                battleNumberFilters={battleNumberFilters}
                onBattleNumberFiltersChange={setBattleNumberFilters}
                battleNumbers={battleNumbers}
                showOnlyWithCreeps={showOnlyWithCreeps}
                onShowOnlyWithCreepsChange={setShowOnlyWithCreeps}
                sortMethod={sortMethod}
                onSortMethodChange={setSortMethod}
                sortDirection={sortDirection}
                onSortDirectionChange={setSortDirection}
                allTags={allUniqueTags}
                totalCount={combinedList.length}
                filteredCount={filteredList.length}
              />

              {filteredList.length > 0 ? (
                <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pr-4">
                    {filteredList.map((item) => {
                      if (item.type === "battle") {
                        return (
                          <BattleCard 
                            key={`battle-${item.data.id}`} 
                            battle={item.data} 
                            isCollected={collectedIds.has(`battle-${item.data.id}`)}
                            onAddToCollection={handleAddToCollection}
                            tags={battleTagsMap.get(item.data.gameId) || []}
                            allTags={allUniqueTags}
                          />
                        );
                      } else if (item.type === "replayGroup") {
                        return (
                          <GroupedReplayCard
                            key={`group-${item.data.groupKey}`}
                            group={item.data}
                            isCollected={(replayId) => collectedIds.has(`replay-${replayId}`)}
                            onAddToCollection={handleAddToCollection}
                            tags={battleTagsMap.get(item.data.displayReplay.gameId) || []}
                            allTags={allUniqueTags}
                          />
                        );
                      } else {
                        return (
                          <ReplayCard 
                            key={`replay-${item.data.id}`} 
                            replay={item.data} 
                            isCollected={collectedIds.has(`replay-${item.data.id}`)}
                            onAddToCollection={handleAddToCollection}
                            tags={battleTagsMap.get(item.data.gameId) || []}
                            allTags={allUniqueTags}
                          />
                        );
                      }
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    Нет элементов, соответствующих фильтрам
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-card-border">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Данные ещё не загружены</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Администратору необходимо загрузить данные боёв через панель управления.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
