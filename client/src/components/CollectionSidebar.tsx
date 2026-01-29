import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

interface CollectionSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  collectedItems: Map<string, CollectedItem>;
  onRemoveItem: (chapterSlotKey: string) => void;
  onDropItem: (chapterIndex: number, slotIndex: number, item: CollectedItem) => void;
  draggedItem: CollectedItem | null;
}

const CHAPTERS = 7;
const SLOTS_PER_CHAPTER = 8;

function SlotContent({ item, slotKey, onRemove }: { 
  item: CollectedItem; 
  slotKey: string; 
  onRemove: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
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

  return (
    <div className="flex items-center gap-1.5 w-full">
      <span className="text-xs font-mono font-semibold text-foreground shrink-0">
        #{item.gameId}
      </span>
      
      <div className="flex items-center gap-0.5 flex-1 min-w-0">
        {item.team.slice(0, 5).map((member, idx) => (
          <Tooltip key={`${slotKey}-member-${idx}`}>
            <TooltipTrigger asChild>
              <Avatar className="h-5 w-5 border border-border">
                <AvatarImage src={member.icon} alt={member.name} />
                <AvatarFallback className="text-[8px]">
                  {member.name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {member.name}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {item.type === "replay" && item.rawDefendersFragments && (
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Копировать JSON
            </TooltipContent>
          </Tooltip>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5"
          onClick={onRemove}
          data-testid={`button-remove-${slotKey}`}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function CollectionSidebar({
  isOpen,
  onToggle,
  collectedItems,
  onRemoveItem,
  onDropItem,
  draggedItem,
}: CollectionSidebarProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set([0]));

  const toggleChapter = (index: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, chapterIndex: number, slotIndex: number) => {
    e.preventDefault();
    const slotKey = getChapterSlotKey(chapterIndex, slotIndex);
    
    if (collectedItems.has(slotKey)) {
      return;
    }
    
    let item = draggedItem;
    
    if (!item) {
      try {
        const data = e.dataTransfer.getData("application/json");
        if (data) {
          item = JSON.parse(data) as CollectedItem;
        }
      } catch (err) {
        console.error("Failed to parse drag data:", err);
      }
    }
    
    if (item) {
      let isAlreadyCollected = false;
      collectedItems.forEach((existingItem) => {
        if (existingItem.id === item!.id) {
          isAlreadyCollected = true;
        }
      });
      
      if (!isAlreadyCollected) {
        onDropItem(chapterIndex, slotIndex, item);
      }
    }
  };

  return (
    <>
      <Button
        size="icon"
        variant="outline"
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-[9999] rounded-l-none shadow-lg bg-card",
          isOpen ? "left-[320px]" : "left-0"
        )}
        onClick={onToggle}
        data-testid="button-toggle-sidebar"
      >
        {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      <div
        className={cn(
          "fixed left-0 top-0 h-full bg-card border-r border-border z-[9998] shadow-lg transition-transform duration-150",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width: "320px" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Коллекция боёв</h2>
          <Badge variant="secondary">{collectedItems.size}</Badge>
        </div>

        <ScrollArea className="h-[calc(100vh-65px)]">
          <div className="p-3 space-y-2">
            {Array.from({ length: CHAPTERS }, (_, chapterIndex) => {
              const isExpanded = expandedChapters.has(chapterIndex);
              const itemCount = getChapterItemCount(chapterIndex);

              return (
                <div
                  key={chapterIndex}
                  className="border border-border rounded-md overflow-hidden"
                >
                  <button
                    onClick={() => toggleChapter(chapterIndex)}
                    className="w-full flex items-center justify-between p-2 bg-muted/50 hover-elevate"
                    data-testid={`button-chapter-${chapterIndex + 1}`}
                  >
                    <span className="font-medium text-sm">Глава {chapterIndex + 1}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={itemCount > 0 ? "default" : "secondary"} className="text-xs">
                        {itemCount}/{SLOTS_PER_CHAPTER}
                      </Badge>
                      {isExpanded ? (
                        <ChevronLeft className="h-4 w-4 rotate-90" />
                      ) : (
                        <ChevronRight className="h-4 w-4 rotate-90" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-1.5 space-y-1 bg-background">
                      {Array.from({ length: SLOTS_PER_CHAPTER }, (_, slotIndex) => {
                        const slotKey = getChapterSlotKey(chapterIndex, slotIndex);
                        const item = collectedItems.get(slotKey);

                        return (
                          <div
                            key={slotIndex}
                            className={cn(
                              "flex items-center gap-1 p-1.5 rounded border border-dashed min-h-[32px] transition-all duration-150",
                              item
                                ? "border-border bg-muted/30 border-solid"
                                : draggedItem
                                ? "border-primary bg-primary/10 scale-[1.02]"
                                : "border-muted-foreground/30"
                            )}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, chapterIndex, slotIndex)}
                            data-testid={`slot-${chapterIndex + 1}-${slotIndex + 1}`}
                          >
                            {item ? (
                              <SlotContent 
                                item={item} 
                                slotKey={slotKey} 
                                onRemove={() => onRemoveItem(slotKey)} 
                              />
                            ) : (
                              <span className="text-[10px] text-muted-foreground/50 w-full text-center">
                                {slotIndex + 1}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[9997]"
          onClick={onToggle}
          data-testid="sidebar-overlay"
        />
      )}
    </>
  );
}
