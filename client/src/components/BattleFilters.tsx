import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/MultiSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, X, Filter, ArrowUp, ArrowDown, Hash } from "lucide-react";
import type { BattleType } from "@shared/schema";

export type SourceFilter = "battles" | "replays";
export type SortMethod = "chapter" | "power";
export type SortDirection = "asc" | "desc";

interface BattleFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  typeFilters: BattleType[];
  onTypeFiltersChange: (values: BattleType[]) => void;
  sourceFilters: SourceFilter[];
  onSourceFiltersChange: (values: SourceFilter[]) => void;
  chapterFilters: string[];
  onChapterFiltersChange: (values: string[]) => void;
  chapters: string[];
  battleNumberFilters: string[];
  onBattleNumberFiltersChange: (values: string[]) => void;
  battleNumbers: string[];
  showOnlyWithCreeps: boolean;
  onShowOnlyWithCreepsChange: (value: boolean) => void;
  sortMethod: SortMethod;
  onSortMethodChange: (value: SortMethod) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (value: SortDirection) => void;
  allTags: string[];
  totalCount: number;
  filteredCount: number;
}

export function BattleFilters({
  searchQuery,
  onSearchChange,
  typeFilters,
  onTypeFiltersChange,
  sourceFilters,
  onSourceFiltersChange,
  chapterFilters,
  onChapterFiltersChange,
  chapters,
  battleNumberFilters,
  onBattleNumberFiltersChange,
  battleNumbers,
  showOnlyWithCreeps,
  onShowOnlyWithCreepsChange,
  sortMethod,
  onSortMethodChange,
  sortDirection,
  onSortDirectionChange,
  allTags,
  totalCount,
  filteredCount,
}: BattleFiltersProps) {
  const [tagsOpen, setTagsOpen] = useState(false);

  const ELEMENT_TAGS = ["#вода", "#огонь", "#земля", "#тьма", "#свет"];

  const handleTagClick = (tag: string) => {
    const hashtag = tag.startsWith("#") ? tag : `#${tag}`;
    if (!searchQuery.includes(hashtag)) {
      onSearchChange(searchQuery ? `${searchQuery} ${hashtag}` : hashtag);
    }
    setTagsOpen(false);
  };

  const hasFilters = searchQuery || 
    typeFilters.length > 0 || 
    sourceFilters.length > 0 || 
    chapterFilters.length > 0 || 
    battleNumberFilters.length > 0 || 
    showOnlyWithCreeps;

  const clearFilters = () => {
    onSearchChange("");
    onTypeFiltersChange([]);
    onSourceFiltersChange([]);
    onChapterFiltersChange([]);
    onBattleNumberFiltersChange([]);
    onShowOnlyWithCreepsChange(false);
  };

  const typeOptions = [
    { value: "heroic", label: "Героические" },
    { value: "titanic", label: "Титанические" },
  ];

  const sourceOptions = [
    { value: "battles", label: "Бои" },
    { value: "replays", label: "Записи" },
  ];

  const chapterOptions = chapters.map((ch) => ({
    value: ch,
    label: `Глава ${ch}`,
  }));

  const battleNumberOptions = battleNumbers.map((num) => ({
    value: num,
    label: `Бой ${num}`,
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени героя, ID, #тегу..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => onSearchChange("")}
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-show-tags">
                <Hash className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end" style={{ pointerEvents: "auto", zIndex: 9999 }}>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Стихии титанов</h4>
                  <div className="flex flex-wrap gap-1">
                    {ELEMENT_TAGS.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover-elevate"
                        onClick={() => handleTagClick(tag)}
                        data-testid={`tag-element-${tag}`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {allTags.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Пользовательские теги</h4>
                    <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                      {allTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer hover-elevate"
                          onClick={() => handleTagClick(tag)}
                          data-testid={`tag-user-${tag}`}
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {allTags.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Добавляйте теги к боям кнопкой тега на карточке
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <MultiSelect
          options={sourceOptions}
          selected={sourceFilters}
          onChange={(v) => {
            console.debug("[BattleFilters] onSourceFiltersChange:", v);
            onSourceFiltersChange(v as SourceFilter[]);
          }}
          placeholder="Источник"
          allLabel="Всё"
          className="w-full sm:w-auto"
          data-testid="multiselect-source"
        />

        <MultiSelect
          options={typeOptions}
          selected={typeFilters}
          onChange={(v) => onTypeFiltersChange(v as BattleType[])}
          placeholder="Тип"
          allLabel="Все типы"
          className="w-full sm:w-auto"
          data-testid="multiselect-type"
        />

        <MultiSelect
          options={chapterOptions}
          selected={chapterFilters}
          onChange={onChapterFiltersChange}
          placeholder="Глава"
          allLabel="Все главы"
          className="w-full sm:w-auto"
          data-testid="multiselect-chapter"
        />

        <MultiSelect
          options={battleNumberOptions}
          selected={battleNumberFilters}
          onChange={onBattleNumberFiltersChange}
          placeholder="Бой"
          allLabel="Все бои"
          className="w-full sm:w-auto"
          data-testid="multiselect-battle-number"
        />

        <div className="flex items-center gap-2">
          <Checkbox
            id="creeps-filter"
            checked={showOnlyWithCreeps}
            onCheckedChange={(checked) => onShowOnlyWithCreepsChange(checked === true)}
            data-testid="checkbox-creeps-filter"
          />
          <Label htmlFor="creeps-filter" className="text-sm cursor-pointer whitespace-nowrap">
            Только с крипами
          </Label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>
              Показано: <span className="font-medium text-foreground">{filteredCount}</span>
              {filteredCount !== totalCount && (
                <> из <span className="font-medium text-foreground">{totalCount}</span></>
              )}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc")}
              data-testid="button-toggle-sort-direction"
            >
              {sortDirection === "asc" ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </Button>
            <Select value={sortMethod} onValueChange={(v) => onSortMethodChange(v as SortMethod)}>
              <SelectTrigger className="h-8 w-[200px]" data-testid="select-sort-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chapter">По главе → бою → силе</SelectItem>
                <SelectItem value="power">По силе (Power Level)</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
