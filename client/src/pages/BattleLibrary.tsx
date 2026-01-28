import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataUploader } from "@/components/DataUploader";
import { BattleCard } from "@/components/BattleCard";
import { BattleFilters } from "@/components/BattleFilters";
import { Library, Swords, Shield, AlertCircle } from "lucide-react";
import { processBattles } from "@/lib/battleUtils";
import type { BossList, BossTeam, BossLevel, HeroInfo, ProcessedBattle, BattleType } from "@shared/schema";

export default function BattleLibrary() {
  const [bossList, setBossList] = useState<BossList[]>([]);
  const [bossTeam, setBossTeam] = useState<BossTeam[]>([]);
  const [bossLevel, setBossLevel] = useState<BossLevel[]>([]);
  const [heroInfo, setHeroInfo] = useState<HeroInfo[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<BattleType | "all">("all");
  const [chapterFilter, setChapterFilter] = useState("all");

  const loadedStatus = {
    bossList: bossList.length > 0,
    bossTeam: bossTeam.length > 0,
    bossLevel: bossLevel.length > 0,
    heroInfo: heroInfo.length > 0,
  };

  const loadedCounts = {
    bossList: bossList.length,
    bossTeam: bossTeam.length,
    bossLevel: bossLevel.length,
    heroInfo: heroInfo.length,
  };

  const handleDataLoaded = useCallback(
    (type: "bossList" | "bossTeam" | "bossLevel" | "heroInfo", data: Record<string, unknown>[]) => {
      switch (type) {
        case "bossList":
          setBossList(data as unknown as BossList[]);
          break;
        case "bossTeam":
          setBossTeam(data as unknown as BossTeam[]);
          break;
        case "bossLevel":
          setBossLevel(data as unknown as BossLevel[]);
          break;
        case "heroInfo":
          setHeroInfo(data as unknown as HeroInfo[]);
          break;
      }
    },
    []
  );

  const battles = useMemo<ProcessedBattle[]>(() => {
    if (!loadedStatus.bossList) return [];
    return processBattles(bossList, bossTeam, heroInfo);
  }, [bossList, bossTeam, heroInfo, loadedStatus.bossList]);

  const chapters = useMemo(() => {
    const uniqueChapters = [...new Set(battles.map((b) => b.chapter))];
    return uniqueChapters.sort();
  }, [battles]);

  const filteredBattles = useMemo(() => {
    let result = battles;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.id.toString().includes(query) ||
          b.chapter.toLowerCase().includes(query) ||
          b.battleNumber.toLowerCase().includes(query) ||
          b.team.some((t) => t.name.toLowerCase().includes(query))
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((b) => b.type === typeFilter);
    }

    if (chapterFilter !== "all") {
      result = result.filter((b) => b.chapter === chapterFilter);
    }

    return result;
  }, [battles, searchQuery, typeFilter, chapterFilter]);

  const stats = useMemo(() => {
    const heroic = battles.filter((b) => b.type === "heroic").length;
    const titanic = battles.filter((b) => b.type === "titanic").length;
    return { heroic, titanic, total: battles.length };
  }, [battles]);

  const hasData = loadedStatus.bossList && loadedStatus.bossTeam;

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
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Героические:</span>
                <span className="font-medium">{stats.heroic}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Титанические:</span>
                <span className="font-medium">{stats.titanic}</span>
              </div>
            </div>
          )}
        </header>

        <DataUploader
          onDataLoaded={handleDataLoaded}
          loadedStatus={loadedStatus}
          loadedCounts={loadedCounts}
        />

        {hasData ? (
          <Card className="border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Swords className="h-5 w-5 text-primary" />
                Список боёв
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BattleFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                typeFilter={typeFilter}
                onTypeChange={setTypeFilter}
                chapterFilter={chapterFilter}
                onChapterChange={setChapterFilter}
                chapters={chapters}
                totalCount={battles.length}
                filteredCount={filteredBattles.length}
              />

              {filteredBattles.length > 0 ? (
                <ScrollArea className="h-[calc(100vh-480px)] min-h-[300px]">
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
            </CardContent>
          </Card>
        ) : (
          <Card className="border-card-border">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Загрузите данные для начала</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Загрузите таблицы Boss List и Boss Team чтобы увидеть библиотеку боёв.
                  Hero Info добавит имена и иконки героев.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
