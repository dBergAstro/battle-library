import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BattleCard } from "@/components/BattleCard";
import { ReplayCard } from "@/components/ReplayCard";
import { BattleFilters } from "@/components/BattleFilters";
import { Library, Swords, Shield, AlertCircle, Loader2, PlayCircle } from "lucide-react";
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

export default function BattleLibrary() {
  const [activeTab, setActiveTab] = useState<"battles" | "replays">("battles");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<BattleType | "all">("all");
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
    const uniqueChapters = Array.from(new Set(battles.map((b) => b.chapterNumber)));
    return uniqueChapters.sort((a, b) => a - b).map(n => n.toString());
  }, [battles]);

  const extractBattleNumber = (battleNumber: string): number | null => {
    const match = battleNumber.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const battleNumbers = useMemo(() => {
    const uniqueNumbers = new Set<number>();
    battles.forEach((b) => {
      const num = extractBattleNumber(b.battleNumber);
      if (num !== null) uniqueNumbers.add(num);
    });
    return Array.from(uniqueNumbers).sort((a, b) => a - b).map(n => n.toString());
  }, [battles]);

  const filteredBattles = useMemo(() => {
    let result = battles;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.gameId.toString().includes(query) ||
          b.team.some((t) => t.name.toLowerCase().includes(query))
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((b) => b.type === typeFilter);
    }

    if (chapterFilter !== "all") {
      result = result.filter((b) => b.chapterNumber.toString() === chapterFilter);
    }

    if (battleNumberFilter !== "all") {
      result = result.filter((b) => {
        const num = extractBattleNumber(b.battleNumber);
        return num !== null && num.toString() === battleNumberFilter;
      });
    }

    if (showOnlyWithCreeps) {
      result = result.filter((b) =>
        b.team.some((t) => t.heroId >= 1000 && t.heroId <= 2999)
      );
    }

    return result;
  }, [battles, searchQuery, typeFilter, chapterFilter, battleNumberFilter, showOnlyWithCreeps]);

  const filteredReplays = useMemo(() => {
    let result = replays;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.gameId.toString().includes(query) ||
          r.team.some((t) => t.name.toLowerCase().includes(query)) ||
          (r.comment && r.comment.toLowerCase().includes(query))
      );
    }

    if (typeFilter !== "all") {
      const enemyType = typeFilter === "heroic" ? "Герои" : "Титаны";
      result = result.filter((r) => r.enemyType === enemyType);
    }

    if (chapterFilter !== "all") {
      result = result.filter((r) => r.chapter.toString() === chapterFilter);
    }

    if (battleNumberFilter !== "all") {
      result = result.filter((r) => r.level.toString() === battleNumberFilter);
    }

    return result;
  }, [replays, searchQuery, typeFilter, chapterFilter, battleNumberFilter]);

  const stats = useMemo(() => {
    const heroicBattles = battles.filter((b) => b.type === "heroic").length;
    const titanicBattles = battles.filter((b) => b.type === "titanic").length;
    const totalReplays = replays.length;
    return { heroicBattles, titanicBattles, totalBattles: battles.length, totalReplays };
  }, [battles, replays]);

  const hasData = battles.length > 0;

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
      <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
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

        {hasData || replays.length > 0 ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "battles" | "replays")}>
            <TabsList className="mb-4" data-testid="tabs-list">
              <TabsTrigger value="battles" data-testid="tab-battles">
                <Swords className="h-4 w-4 mr-1.5" />
                Бои ({battles.length})
              </TabsTrigger>
              <TabsTrigger value="replays" data-testid="tab-replays">
                <PlayCircle className="h-4 w-4 mr-1.5" />
                Записи ({replays.length})
              </TabsTrigger>
            </TabsList>

            <Card className="border-card-border">
              <CardContent className="pt-6 space-y-4">
                <BattleFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  typeFilter={typeFilter}
                  onTypeChange={setTypeFilter}
                  chapterFilter={chapterFilter}
                  onChapterChange={setChapterFilter}
                  chapters={chapters}
                  battleNumberFilter={battleNumberFilter}
                  onBattleNumberChange={setBattleNumberFilter}
                  battleNumbers={battleNumbers}
                  showOnlyWithCreeps={showOnlyWithCreeps}
                  onShowOnlyWithCreepsChange={setShowOnlyWithCreeps}
                  totalCount={activeTab === "battles" ? battles.length : replays.length}
                  filteredCount={activeTab === "battles" ? filteredBattles.length : filteredReplays.length}
                />

                <TabsContent value="battles" className="mt-0">
                  {filteredBattles.length > 0 ? (
                    <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-4">
                        {filteredBattles.map((battle) => (
                          <BattleCard key={battle.id} battle={battle} />
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">
                        Нет боёв, соответствующих фильтрам
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="replays" className="mt-0">
                  {filteredReplays.length > 0 ? (
                    <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-4">
                        {filteredReplays.map((replay) => (
                          <ReplayCard key={replay.id} replay={replay} />
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">
                        Нет записей, соответствующих фильтрам
                      </p>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
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
