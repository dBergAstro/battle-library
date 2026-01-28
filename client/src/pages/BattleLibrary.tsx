import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BattleCard } from "@/components/BattleCard";
import { ReplayCard } from "@/components/ReplayCard";
import { BattleFilters, type SourceFilter } from "@/components/BattleFilters";
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
  type ServerAttackTeam,
  type ServerPetIcon,
  type ServerSpiritSkill,
  type ServerSpiritIcon
} from "@/lib/replayUtils";
import type { ProcessedBattle, ProcessedReplay, BattleType } from "@shared/schema";

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
}

type ListItem = 
  | { type: "battle"; data: ProcessedBattle; chapter: number; level: number }
  | { type: "replay"; data: ProcessedReplay; chapter: number; level: number };

export default function BattleLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<BattleType | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [battleNumberFilter, setBattleNumberFilter] = useState("all");
  const [showOnlyWithCreeps, setShowOnlyWithCreeps] = useState(false);

  const { data, isLoading, error } = useQuery<BattlesResponse>({
    queryKey: ["/api/battles"],
  });

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
      data.spiritIcons || []
    );
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
    const battleNums = battles.map((b) => extractBattleNumber(b.battleNumber)).filter((n): n is number => n !== null);
    const replayNums = replays.map((r) => r.level);
    const uniqueNumbers = new Set([...battleNums, ...replayNums]);
    return Array.from(uniqueNumbers).sort((a, b) => a - b).map(n => n.toString());
  }, [battles, replays]);

  // Объединённый и отсортированный список боёв и записей
  const combinedList = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    
    // Добавляем бои
    for (const battle of battles) {
      const level = extractBattleNumber(battle.battleNumber) ?? 0;
      items.push({
        type: "battle",
        data: battle,
        chapter: battle.chapterNumber,
        level,
      });
    }
    
    // Добавляем записи
    for (const replay of replays) {
      items.push({
        type: "replay",
        data: replay,
        chapter: replay.chapter,
        level: replay.level,
      });
    }
    
    // Сортируем по главе, затем по номеру боя
    return items.sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      if (a.level !== b.level) return a.level - b.level;
      // Бои перед записями при одинаковых chapter/level
      if (a.type !== b.type) return a.type === "battle" ? -1 : 1;
      return 0;
    });
  }, [battles, replays]);

  const filteredList = useMemo(() => {
    let result = combinedList;

    // Фильтр по источнику (бои/записи)
    if (sourceFilter === "battles") {
      result = result.filter((item) => item.type === "battle");
    } else if (sourceFilter === "replays") {
      result = result.filter((item) => item.type === "replay");
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        if (item.type === "battle") {
          const b = item.data;
          return b.gameId.toString().includes(query) ||
            b.team.some((t) => t.name.toLowerCase().includes(query));
        } else {
          const r = item.data;
          return r.gameId.toString().includes(query) ||
            r.team.some((t) => t.name.toLowerCase().includes(query)) ||
            (r.comment && r.comment.toLowerCase().includes(query));
        }
      });
    }

    if (typeFilter !== "all") {
      result = result.filter((item) => {
        if (item.type === "battle") {
          return item.data.type === typeFilter;
        } else {
          const enemyType = typeFilter === "heroic" ? "Герои" : "Титаны";
          return item.data.enemyType === enemyType;
        }
      });
    }

    if (chapterFilter !== "all") {
      result = result.filter((item) => item.chapter.toString() === chapterFilter);
    }

    if (battleNumberFilter !== "all") {
      result = result.filter((item) => item.level.toString() === battleNumberFilter);
    }

    if (showOnlyWithCreeps) {
      result = result.filter((item) => {
        if (item.type === "battle") {
          return item.data.team.some((t) => t.heroId >= 1000 && t.heroId <= 2999);
        }
        return true; // Записи не фильтруем по крипам
      });
    }

    return result;
  }, [combinedList, searchQuery, typeFilter, sourceFilter, chapterFilter, battleNumberFilter, showOnlyWithCreeps]);

  const stats = useMemo(() => {
    const heroicBattles = battles.filter((b) => b.type === "heroic").length;
    const titanicBattles = battles.filter((b) => b.type === "titanic").length;
    const totalReplays = replays.length;
    return { heroicBattles, titanicBattles, totalBattles: battles.length, totalReplays };
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
      <div className="container max-w-[1600px] mx-auto px-4 py-6 space-y-6">
        <header className="space-y-3">
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
                <span className="text-muted-foreground">Записи:</span>
                <span className="font-medium">{stats.totalReplays}</span>
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
                typeFilter={typeFilter}
                onTypeChange={setTypeFilter}
                sourceFilter={sourceFilter}
                onSourceChange={setSourceFilter}
                chapterFilter={chapterFilter}
                onChapterChange={setChapterFilter}
                chapters={chapters}
                battleNumberFilter={battleNumberFilter}
                onBattleNumberChange={setBattleNumberFilter}
                battleNumbers={battleNumbers}
                showOnlyWithCreeps={showOnlyWithCreeps}
                onShowOnlyWithCreepsChange={setShowOnlyWithCreeps}
                totalCount={combinedList.length}
                filteredCount={filteredList.length}
              />

              {filteredList.length > 0 ? (
                <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pr-4">
                    {filteredList.map((item) => 
                      item.type === "battle" ? (
                        <BattleCard key={`battle-${item.data.id}`} battle={item.data} />
                      ) : (
                        <ReplayCard key={`replay-${item.data.id}`} replay={item.data} />
                      )
                    )}
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
