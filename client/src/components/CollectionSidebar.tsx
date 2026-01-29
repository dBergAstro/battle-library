import { useState } from "react";
import { ChevronUp, ChevronDown, X, Copy, Check, AlertCircle, Star, Trash2 } from "lucide-react";
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

export interface CollectedItem {
  id: string;
  type: "battle" | "replay";
  gameId: number;
  label: string;
  desc: string;
  battleType: "heroic" | "titanic";
  team: TeamMember[];
  rawDefendersFragments?: string;
  bossHeroId?: number; // ID главного героя боя
}

interface CollectionSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  collectedItems: Map<string, CollectedItem>;
  onRemoveItem: (chapterSlotKey: string) => void;
  onClearCollection: () => void;
  maxBossId: number;
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
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs font-mono font-semibold text-amber-500 ml-3 cursor-help flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                #{recommendedId}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-xs">
              Рекомендуемый ID. Создайте новый бой с этим ID и скопируйте defendersFragments
            </TooltipContent>
          </Tooltip>
        )}
        <div className="flex items-center gap-0.5">
          {item.type === "replay" && item.rawDefendersFragments && (
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
          const isBossHero = item.bossHeroId === member.heroId;
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
                {member.name}
                {isBossHero && <span className="text-yellow-500 ml-1">(Главный)</span>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

export function CollectionSidebar({
  isOpen,
  onToggle,
  collectedItems,
  onRemoveItem,
  onClearCollection,
  maxBossId,
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

  // Calculate recommended IDs for replays in order of their position
  const getReplayRecommendedId = (slotKey: string): number => {
    let replayIndex = 0;
    for (let ch = 0; ch < CHAPTERS; ch++) {
      for (let sl = 0; sl < SLOTS_PER_CHAPTER; sl++) {
        const key = `${ch}-${sl}`;
        const item = collectedItems.get(key);
        if (item?.type === "replay") {
          if (key === slotKey) {
            return maxBossId + 1 + replayIndex;
          }
          replayIndex++;
        }
      }
    }
    return maxBossId + 1;
  };

  return (
    <>
      <div 
        className="fixed left-1/2 -translate-x-1/2 z-[9999] flex gap-1 transition-[top] duration-200 ease-out"
        style={{ top: isOpen ? "200px" : "0" }}
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
        )}
      </div>

      <div
        className="fixed left-0 right-0 top-0 bg-card border-b border-border z-[9998] shadow-lg transition-transform duration-200 ease-out"
        style={{ 
          height: "200px",
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
                            "flex items-center justify-center rounded border border-dashed min-h-[70px] transition-colors",
                            item
                              ? "border-border bg-muted/30 border-solid"
                              : "border-muted-foreground/30"
                          )}
                          data-testid={`slot-${chapterIndex + 1}-${slotIndex + 1}`}
                        >
                          {item ? (
                            <SlotContent 
                              item={item} 
                              slotKey={slotKey}
                              slotNumber={slotIndex + 1}
                              onRemove={() => onRemoveItem(slotKey)}
                              recommendedId={item.type === "replay" ? getReplayRecommendedId(slotKey) : undefined}
                            />
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
