import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Swords, Shield, Search, Users, Zap, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { processReplaysFromServer, GRADE_COLORS, GRADE_BG_COLORS, type ServerAttackTeam, type ServerPetIcon } from "@/lib/replayUtils";
import type { ProcessedReplay } from "@shared/schema";

interface ReplaysResponse {
  attackTeams: ServerAttackTeam[];
  heroIcons: Array<{ heroId: number; iconUrl: string }>;
  heroNames: Array<{ heroId: number; name: string }>;
  petIcons: ServerPetIcon[];
  mainBuffName: string | null;
}

export default function ReplayLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [chapterFilter, setChapterFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery<ReplaysResponse>({
    queryKey: ["/api/replays"],
  });

  const replays = useMemo(() => {
    if (!data) return [];
    return processReplaysFromServer(
      data.attackTeams,
      data.heroIcons,
      data.heroNames,
      data.petIcons
    );
  }, [data]);

  const chapters = useMemo(() => {
    const uniqueChapters = Array.from(new Set(replays.map((r) => r.chapter))).sort((a, b) => a - b);
    return uniqueChapters;
  }, [replays]);

  const filteredReplays = useMemo(() => {
    return replays.filter((replay) => {
      if (chapterFilter !== "all" && replay.chapter !== parseInt(chapterFilter)) {
        return false;
      }
      if (typeFilter !== "all" && replay.enemyType !== typeFilter) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTeam = replay.team.some(
          (m) => m.name.toLowerCase().includes(query) || m.heroId.toString().includes(query)
        );
        const matchesComment = replay.comment?.toLowerCase().includes(query);
        if (!matchesTeam && !matchesComment) {
          return false;
        }
      }
      return true;
    });
  }, [replays, chapterFilter, typeFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Ошибка загрузки данных</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">Записи</h1>
              <nav className="flex gap-2">
                <Link href="/">
                  <Badge variant="outline" className="cursor-pointer hover-elevate" data-testid="link-battles">Бои</Badge>
                </Link>
                <Badge variant="default" data-testid="badge-replays-active">Записи</Badge>
                <Link href="/admin">
                  <Badge variant="outline" className="cursor-pointer hover-elevate" data-testid="link-admin">Админ</Badge>
                </Link>
              </nav>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени персонажа или комментарию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-replay-search"
            />
          </div>

          <Select value={chapterFilter} onValueChange={setChapterFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-chapter">
              <SelectValue placeholder="Глава" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все главы</SelectItem>
              {chapters.map((ch) => (
                <SelectItem key={ch} value={ch.toString()}>
                  Глава {ch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-type">
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="Герои">Герои</SelectItem>
              <SelectItem value="Титаны">Титаны</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4 text-sm text-muted-foreground">
          Найдено записей: {filteredReplays.length}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReplays.map((replay) => (
            <ReplayCard key={replay.id} replay={replay} />
          ))}
        </div>

        {filteredReplays.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {replays.length === 0 
              ? "Записи не загружены. Загрузите данные в панели администратора."
              : "Записи не найдены по заданным фильтрам."
            }
          </div>
        )}
      </main>
    </div>
  );
}

function ReplayCard({ replay }: { replay: ProcessedReplay }) {
  const isHeroic = replay.enemyType === "Герои";

  return (
    <Card
      className="hover-elevate border-card-border transition-all"
      data-testid={`card-replay-${replay.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-base font-semibold text-foreground">
                Глава {replay.chapter}, Бой {replay.level}
              </span>
              <Badge
                variant={isHeroic ? "default" : "secondary"}
                className={isHeroic ? "bg-blue-600" : "bg-amber-600 text-white"}
                data-testid={`badge-type-${replay.id}`}
              >
                {isHeroic ? (
                  <>
                    <Swords className="h-3 w-3 mr-1" />
                    Герои
                  </>
                ) : (
                  <>
                    <Shield className="h-3 w-3 mr-1" />
                    Титаны
                  </>
                )}
              </Badge>
            </div>
            {replay.comment && (
              <p className="text-xs text-muted-foreground truncate" title={replay.comment}>
                {replay.comment}
              </p>
            )}
            {replay.mainBuff != null && (
              <div className="flex items-center gap-1 mt-1">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span className="text-xs font-medium">Бафф: {replay.mainBuff}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 mb-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
            <Users className="h-3 w-3" />
            <span>{replay.team.length}</span>
          </div>
          <div className="flex -space-x-2">
            {replay.team.map((member, idx) => (
              <Tooltip key={`${replay.id}-${member.heroId}-${idx}`}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center">
                    <Avatar
                      className={`h-12 w-12 border-2 border-card ring-2 ${GRADE_COLORS[member.grade]}`}
                      data-testid={`avatar-hero-${member.heroId}`}
                    >
                      {member.icon ? (
                        <AvatarImage src={member.icon} alt={member.name} />
                      ) : null}
                      <AvatarFallback className={`text-xs font-medium ${GRADE_BG_COLORS[member.grade]}`}>
                        {member.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {member.favorPetIcon && (
                      <Avatar
                        className="h-6 w-6 -mt-2 border border-card"
                        data-testid={`avatar-favor-pet-${member.favorPetId}`}
                      >
                        <AvatarImage src={member.favorPetIcon} alt={`Pet ${member.favorPetId}`} />
                        <AvatarFallback className="text-[8px] bg-muted">P</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs z-[100]">
                  <p className="font-medium">{member.name}</p>
                  <p className="text-muted-foreground">ID: {member.heroId}</p>
                  <p className="text-muted-foreground">Фрагменты: {member.fragmentCount}</p>
                  {member.favorPetId && (
                    <p className="text-muted-foreground">Покровитель: {member.favorPetId}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {replay.mainPetIcon && isHeroic && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground">Питомец:</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border border-card" data-testid={`avatar-main-pet-${replay.mainPetId}`}>
                  <AvatarImage src={replay.mainPetIcon} alt={`Pet ${replay.mainPetId}`} />
                  <AvatarFallback className="text-xs bg-muted">P</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs z-[100]">
                <p className="font-medium">Основной питомец</p>
                <p className="text-muted-foreground">ID: {replay.mainPetId}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
