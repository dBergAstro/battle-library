import { useState } from "react";
import { ChevronUp, ChevronDown, X, Copy, Check, AlertCircle, Star, Trash2, ArrowUp, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface TeamMember {
  heroId: number;
  name: string;
  icon?: string;
}

export interface CollectedTotemSkill {
  skillId: number;
  name: string;
  icon?: string;
  grade: "purple" | "orange" | "red";
}

export interface CollectedTotem {
  element: "water" | "fire" | "earth" | "dark" | "light";
  elementRu: string;
  skills: CollectedTotemSkill[];
}

export interface CollectedItem {
  id: string;
  type: "battle" | "replay" | "variant";
  gameId: number;
  label: string;
  desc: string;
  battleType: "heroic" | "titanic";
  team: TeamMember[];
  rawDefendersFragments?: string;
  bossHeroId?: number; // ID главного героя боя
  mainBuff?: number; // Размер основного баффа
  totems?: CollectedTotem[]; // Тотемы для титанических боёв
  talisman?: { name: string; iconUrl?: string | null }; // Талисман (если есть)
}

interface CollectionSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  collectedItems: Map<string, CollectedItem>;
  onRemoveItem: (chapterSlotKey: string) => void;
  onClearCollection: () => void;
  maxBossId: number;
  onEmptySlotClick?: (chapter: number, slot: number, type: "heroic" | "titanic") => void;
}

const CHAPTERS = 7;
const SLOTS_PER_CHAPTER = 8;

function SlotContent({ item, slotKey, slotNumber, onRemove, recommendedId }: { 
  item: CollectedItem; 
  slotKey: string; 
  slotNumber: number;
  onRemove: () => void;
  recommendedId?: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.rawDefendersFragments) {
      try {
        await navigator.clipboard.writeText(item.rawDefendersFragments);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  return (
    <div className="flex flex-col items-center gap-1 w-full h-full p-1.5 relative">
      <span className="absolute top-0.5 left-1 text-[9px] text-muted-foreground/60 font-mono">
        {slotNumber}
      </span>
      <div className="flex items-center justify-between w-full">
        {item.type === "battle" ? (
          <span className="text-xs font-mono font-semibold text-foreground ml-3">
            #{item.gameId}
          </span>
        ) : item.type === "variant" ? (
          <div className="flex items-center gap-1 ml-3">
            <span className="text-xs font-mono font-semibold text-primary">
              #{recommendedId ?? item.gameId}
            </span>
            <span className="text-[9px] px-0.5 rounded bg-primary/15 text-primary font-semibold leading-none py-0.5">В</span>
            {item.mainBuff != null && item.mainBuff > 0 && (
              <span className="flex items-center text-[10px] text-muted-foreground gap-0.5">
                <ArrowUp className="h-2.5 w-2.5" />
                {item.mainBuff}%
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 ml-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-mono font-semibold text-amber-500 cursor-help flex items-center gap-0.5">
                  <AlertCircle className="h-3 w-3" />
                  #{recommendedId}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                Рекомендуемый ID. Создайте новый бой с этим ID и скопируйте defendersFragments
              </TooltipContent>
            </Tooltip>
            {item.mainBuff != null && item.mainBuff > 0 && (
              <span className="flex items-center text-[10px] text-muted-foreground gap-0.5">
                <ArrowUp className="h-2.5 w-2.5" />
                {item.mainBuff}%
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-0.5">
          {item.talisman && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center h-5 w-5 shrink-0 cursor-default">
                  {item.talisman.iconUrl
                    ? <img src={item.talisman.iconUrl} alt={item.talisman.name} className="h-4 w-4 object-contain" />
                    : <span className="text-[8px] px-0.5 rounded bg-yellow-500/20 text-yellow-600 font-bold leading-none py-0.5">Т</span>
                  }
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{item.talisman.name}</TooltipContent>
            </Tooltip>
          )}
          {(item.type === "replay" || item.type === "variant") && item.rawDefendersFragments && (
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5"
              onClick={handleCopy}
              data-testid={`button-copy-${slotKey}`}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={handleRemove}
            data-testid={`button-remove-${slotKey}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-0.5 flex-wrap">
        {item.team.slice(0, 5).map((member, idx) => {
          const isBossHero = item.type === "battle" && item.bossHeroId === member.heroId;
          return (
            <Tooltip key={`${slotKey}-member-${idx}`}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarImage src={member.icon} alt={member.name} />
                    <AvatarFallback className="text-[8px]">
                      {member.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {isBossHero && (
                    <Star className="absolute -top-0.5 -right-0.5 h-3 w-3 text-yellow-500 fill-yellow-500 drop-shadow" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div>{member.name}</div>
                <div className="text-muted-foreground">ID: {member.heroId}</div>
                {isBossHero && <span className="text-yellow-500">(Главный)</span>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      
      {item.battleType === "titanic" && item.totems && item.totems.length > 0 && (
        <div className="flex items-center justify-center gap-1 mt-0.5">
          {item.totems.map((totem, idx) => (
            <Tooltip key={`${slotKey}-totem-${idx}`}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-0.5 bg-muted/50 rounded px-1 py-0.5 cursor-help">
                  <span className="text-xs">{ELEMENT_EMOJIS[totem.element]}</span>
                  {totem.skills.map((skill, skillIdx) => (
                    skill.icon ? (
                      <Avatar key={skillIdx} className={`h-4 w-4 ring-1 ${GRADE_RING_COLORS[skill.grade]}`}>
                        <AvatarImage src={skill.icon} alt={skill.name} />
                        <AvatarFallback className="text-[5px]">{skill.skillId}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <span key={skillIdx} className="text-[8px] font-mono">{skill.skillId}</span>
                    )
                  ))}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium mb-1">{totem.elementRu}</p>
                {totem.skills.map((skill, skillIdx) => (
                  <div key={skillIdx} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${GRADE_BG_COLORS[skill.grade]}`} />
                    <span>{skill.name}</span>
                  </div>
                ))}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}

const ELEMENT_EMOJIS: Record<string, string> = {
  water: "💧",
  fire: "🔥",
  earth: "🌍",
  dark: "🌑",
  light: "☀️"
};

const GRADE_RING_COLORS: Record<string, string> = {
  purple: "ring-purple-500",
  orange: "ring-orange-500",
  red: "ring-red-500"
};

const GRADE_BG_COLORS: Record<string, string> = {
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  red: "bg-red-500"
};

export function CollectionSidebar({
  isOpen,
  onToggle,
  collectedItems,
  onRemoveItem,
  onClearCollection,
  maxBossId,
  onEmptySlotClick,
}: CollectionSidebarProps) {
  const getChapterSlotKey = (chapterIndex: number, slotIndex: number) => 
    `${chapterIndex}-${slotIndex}`;

  const getChapterItemCount = (chapterIndex: number) => {
    let count = 0;
    for (let i = 0; i < SLOTS_PER_CHAPTER; i++) {
      if (collectedItems.has(getChapterSlotKey(chapterIndex, i))) {
        count++;
      }
    }
    return count;
  };

  const isChapterTitanic = (chapterIndex: number): boolean => {
    for (let i = 0; i < SLOTS_PER_CHAPTER; i++) {
      const item = collectedItems.get(getChapterSlotKey(chapterIndex, i));
      if (item?.battleType === "titanic") {
        return true;
      }
    }
    return false;
  };

  // Calculate sequential IDs for replays AND variants in order of their position
  const getSequentialId = (slotKey: string): number => {
    let seqIndex = 0;
    for (let ch = 0; ch < CHAPTERS; ch++) {
      for (let sl = 0; sl < SLOTS_PER_CHAPTER; sl++) {
        const key = `${ch}-${sl}`;
        const item = collectedItems.get(key);
        if (item?.type === "replay" || item?.type === "variant") {
          if (key === slotKey) {
            return maxBossId + 1 + seqIndex;
          }
          seqIndex++;
        }
      }
    }
    return maxBossId + 1;
  };

  // Export collection to JSON format
  const handleExportCollection = () => {
    const result: Record<string, string | number> = {};
    let bossIndex = 1;
    
    for (let ch = 0; ch < CHAPTERS; ch++) {
      // Add chapter header
      result[`__VAR_CHAPTER_${ch + 1}`] = `Бои ${ch + 1} главы`;
      
      for (let sl = 0; sl < SLOTS_PER_CHAPTER; sl++) {
        const key = `${ch}-${sl}`;
        const item = collectedItems.get(key);
        
        if (item?.type === "replay" || item?.type === "variant") {
          // For replays and variants, use sequential ID
          result[`boss_${bossIndex}`] = getSequentialId(key);
        } else if (item) {
          // For battles, use gameId
          result[`boss_${bossIndex}`] = item.gameId;
        } else {
          // Empty slot - use 0 or skip
          result[`boss_${bossIndex}`] = 0;
        }
        bossIndex++;
      }
    }
    
    // Format JSON with proper indentation
    const jsonString = JSON.stringify(result, null, 3);
    
    // Copy to clipboard
    navigator.clipboard.writeText(jsonString).then(() => {
      // Could add a toast notification here
    }).catch(err => {
      console.error("Failed to copy:", err);
    });
    
    // Also download as file
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "collection_export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div 
        className="fixed left-1/2 -translate-x-1/2 z-[9999] flex gap-1 transition-[top] duration-200 ease-out"
        style={{ top: isOpen ? "280px" : "0" }}
      >
        <Button
          size="sm"
          variant="outline"
          className="rounded-t-none shadow-lg bg-card gap-1"
          onClick={onToggle}
          data-testid="button-toggle-collection"
        >
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="text-xs">Коллекция ({collectedItems.size})</span>
        </Button>
        {collectedItems.size > 0 && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-t-none shadow-lg bg-card"
                  onClick={handleExportCollection}
                  data-testid="button-export-collection"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Экспорт коллекции
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-t-none shadow-lg bg-card"
                  onClick={onClearCollection}
                  data-testid="button-clear-collection"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Очистить коллекцию
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      <div
        className="fixed left-0 right-0 top-0 bg-card border-b border-border z-[9998] shadow-lg transition-transform duration-200 ease-out"
        style={{ 
          height: "280px",
          transform: isOpen ? "translateY(0)" : "translateY(-100%)"
        }}
      >
        <ScrollArea className="w-full h-full">
          <div className="flex gap-2 p-2">
            {Array.from({ length: CHAPTERS }, (_, chapterIndex) => {
              const itemCount = getChapterItemCount(chapterIndex);

              const isTitanic = isChapterTitanic(chapterIndex);

              return (
                <div
                  key={chapterIndex}
                  className="flex-shrink-0 border border-border rounded-md overflow-hidden bg-background"
                  style={{ minWidth: "320px" }}
                >
                  <div className={cn(
                    "flex items-center justify-between px-2 py-1",
                    isTitanic ? "bg-amber-500/20" : "bg-muted/50"
                  )}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Глава {chapterIndex + 1}</span>
                      {itemCount > 0 && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            isTitanic ? "border-amber-500 text-amber-500" : "border-blue-500 text-blue-500"
                          )}
                        >
                          {isTitanic ? "Титаны" : "Герои"}
                        </Badge>
                      )}
                    </div>
                    <Badge 
                      variant={itemCount > 0 ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      {itemCount}/{SLOTS_PER_CHAPTER}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 p-1.5">
                    {Array.from({ length: SLOTS_PER_CHAPTER }, (_, slotIndex) => {
                      const slotKey = getChapterSlotKey(chapterIndex, slotIndex);
                      const item = collectedItems.get(slotKey);

                      return (
                        <div
                          key={slotIndex}
                          className={cn(
                            "flex items-center justify-center rounded border border-dashed min-h-[110px] transition-colors",
                            item
                              ? "border-border bg-muted/30 border-solid"
                              : onEmptySlotClick
                                ? "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                                : "border-muted-foreground/30"
                          )}
                          data-testid={`slot-${chapterIndex + 1}-${slotIndex + 1}`}
                          onClick={!item && onEmptySlotClick ? () => onEmptySlotClick(chapterIndex + 1, slotIndex + 1, isTitanic ? "titanic" : "heroic") : undefined}
                        >
                          {item ? (
                            <SlotContent 
                              item={item} 
                              slotKey={slotKey}
                              slotNumber={slotIndex + 1}
                              onRemove={() => onRemoveItem(slotKey)}
                              recommendedId={(item.type === "replay" || item.type === "variant") ? getSequentialId(slotKey) : undefined}
                            />
                          ) : onEmptySlotClick ? (
                            <div className="flex flex-col items-center gap-0.5 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors pointer-events-none">
                              <Plus className="h-4 w-4" />
                              <span className="text-[9px]">{slotIndex + 1}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">
                              {slotIndex + 1}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </>
  );
}
