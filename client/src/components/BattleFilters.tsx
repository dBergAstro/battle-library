import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Filter } from "lucide-react";
import type { BattleType } from "@shared/schema";

interface BattleFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  typeFilter: BattleType | "all";
  onTypeChange: (value: BattleType | "all") => void;
  chapterFilter: string;
  onChapterChange: (value: string) => void;
  chapters: string[];
  battleNumberFilter: string;
  onBattleNumberChange: (value: string) => void;
  battleNumbers: string[];
  totalCount: number;
  filteredCount: number;
}

export function BattleFilters({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
  chapterFilter,
  onChapterChange,
  chapters,
  battleNumberFilter,
  onBattleNumberChange,
  battleNumbers,
  totalCount,
  filteredCount,
}: BattleFiltersProps) {
  const hasFilters = searchQuery || typeFilter !== "all" || chapterFilter !== "all" || battleNumberFilter !== "all";

  const clearFilters = () => {
    onSearchChange("");
    onTypeChange("all");
    onChapterChange("all");
    onBattleNumberChange("all");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по ID, главе или бою..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
          {searchQuery && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchChange("")}
              data-testid="button-clear-search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Select value={typeFilter} onValueChange={(v) => onTypeChange(v as BattleType | "all")}>
          <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-type">
            <SelectValue placeholder="Тип боя" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="heroic">Героические</SelectItem>
            <SelectItem value="titanic">Титанические</SelectItem>
          </SelectContent>
        </Select>

        <Select value={chapterFilter} onValueChange={onChapterChange}>
          <SelectTrigger className="w-full sm:w-[140px]" data-testid="select-chapter">
            <SelectValue placeholder="Глава" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все главы</SelectItem>
            {chapters.map((chapter) => (
              <SelectItem key={`chapter-${chapter}`} value={chapter}>
                Глава {chapter}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={battleNumberFilter} onValueChange={onBattleNumberChange}>
          <SelectTrigger className="w-full sm:w-[120px]" data-testid="select-battle-number">
            <SelectValue placeholder="Бой" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все бои</SelectItem>
            {battleNumbers.map((num) => (
              <SelectItem key={`battle-${num}`} value={num}>
                Бой {num}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>
            Показано: <span className="font-medium text-foreground">{filteredCount}</span>
            {filteredCount !== totalCount && (
              <> из <span className="font-medium text-foreground">{totalCount}</span></>
            )}
          </span>
        </div>

        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={clearFilters}
            data-testid="button-clear-filters"
          >
            <X className="h-3 w-3 mr-1" />
            Сбросить фильтры
          </Button>
        )}
      </div>
    </div>
  );
}
