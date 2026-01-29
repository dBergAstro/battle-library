import { useState } from "react";
import { ChevronLeft, ChevronRight, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface CollectedItem {
  id: string;
  type: "battle" | "replay";
  gameId: number;
  label: string;
  desc: string;
  battleType: "heroic" | "titanic";
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
      <div
        className={cn(
          "fixed left-0 top-0 h-full bg-card border-r border-border z-50 shadow-lg",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width: "320px" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Коллекция боёв</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggle}
            data-testid="button-close-sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-65px)]">
          <div className="p-4 space-y-3">
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
                    className="w-full flex items-center justify-between p-3 bg-muted/50 hover-elevate"
                    data-testid={`button-chapter-${chapterIndex + 1}`}
                  >
                    <span className="font-medium">Глава {chapterIndex + 1}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={itemCount > 0 ? "default" : "secondary"}>
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
                    <div className="p-2 space-y-1.5 bg-background">
                      {Array.from({ length: SLOTS_PER_CHAPTER }, (_, slotIndex) => {
                        const slotKey = getChapterSlotKey(chapterIndex, slotIndex);
                        const item = collectedItems.get(slotKey);

                        return (
                          <div
                            key={slotIndex}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-md border border-dashed min-h-[44px] transition-colors",
                              item
                                ? "border-border bg-muted/30"
                                : draggedItem
                                ? "border-primary/50 bg-primary/5"
                                : "border-muted-foreground/30"
                            )}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, chapterIndex, slotIndex)}
                            data-testid={`slot-${chapterIndex + 1}-${slotIndex + 1}`}
                          >
                            {item ? (
                              <>
                                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs",
                                        item.battleType === "heroic"
                                          ? "border-blue-500 text-blue-600"
                                          : "border-amber-500 text-amber-600"
                                      )}
                                    >
                                      {item.type === "battle" ? "Бой" : "Запись"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {item.label}, {item.desc}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 flex-shrink-0"
                                  onClick={() => onRemoveItem(slotKey)}
                                  data-testid={`button-remove-${slotKey}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground/60 w-full text-center">
                                Слот {slotIndex + 1}
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

      <Button
        variant="default"
        className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[60] shadow-lg px-4"
        onClick={onToggle}
        data-testid="button-toggle-sidebar"
      >
        {isOpen ? (
          <>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Скрыть коллекцию
          </>
        ) : (
          <>
            <ChevronRight className="h-4 w-4 mr-2" />
            Коллекция боёв ({collectedItems.size})
          </>
        )}
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onToggle}
          data-testid="sidebar-overlay"
        />
      )}
    </>
  );
}
