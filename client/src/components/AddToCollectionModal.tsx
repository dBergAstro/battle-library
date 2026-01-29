import { useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CollectedItem } from "./CollectionSidebar";

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToAdd: CollectedItem | null;
  collectedItems: Map<string, CollectedItem>;
  onAddItem: (chapterIndex: number, slotIndex: number, item: CollectedItem) => void;
}

const CHAPTERS = 7;
const SLOTS_PER_CHAPTER = 8;

export function AddToCollectionModal({
  isOpen,
  onClose,
  itemToAdd,
  collectedItems,
  onAddItem,
}: AddToCollectionModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<{ chapter: number; slot: number } | null>(null);

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

  const isItemAlreadyCollected = () => {
    if (!itemToAdd) return false;
    let found = false;
    collectedItems.forEach((item) => {
      if (item.id === itemToAdd.id) {
        found = true;
      }
    });
    return found;
  };

  const handleSave = () => {
    if (selectedSlot && itemToAdd) {
      onAddItem(selectedSlot.chapter, selectedSlot.slot, itemToAdd);
      setSelectedSlot(null);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedSlot(null);
    onClose();
  };

  const alreadyCollected = isItemAlreadyCollected();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Добавить в коллекцию
            {itemToAdd && (
              <Badge variant="outline">
                #{itemToAdd.gameId} - {itemToAdd.label} {itemToAdd.desc}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {alreadyCollected ? (
          <div className="py-8 text-center text-muted-foreground">
            Этот бой уже добавлен в коллекцию
          </div>
        ) : (
          <>
            {itemToAdd && (
              <div className="mb-4 p-3 bg-muted/30 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={itemToAdd.type === "replay" ? "default" : "secondary"}>
                    {itemToAdd.type === "replay" ? "Запись" : "Бой"}
                  </Badge>
                  <Badge variant={itemToAdd.battleType === "heroic" ? "default" : "outline"}>
                    {itemToAdd.battleType === "heroic" ? "Героический" : "Титанический"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {itemToAdd.team.slice(0, 5).map((member, idx) => (
                    <Tooltip key={`preview-member-${idx}`}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarImage src={member.icon} alt={member.name} />
                          <AvatarFallback className="text-xs">
                            {member.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {member.name}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}

            <ScrollArea className="w-full h-[300px]">
              <div className="flex gap-3 pb-4">
                {Array.from({ length: CHAPTERS }, (_, chapterIndex) => {
                  const itemCount = getChapterItemCount(chapterIndex);

                  return (
                    <div
                      key={chapterIndex}
                      className="flex-shrink-0 border border-border rounded-md overflow-hidden bg-background"
                      style={{ minWidth: "220px" }}
                    >
                      <div className="flex items-center justify-between px-2 py-1.5 bg-muted/50">
                        <span className="font-medium text-sm">Глава {chapterIndex + 1}</span>
                        <Badge 
                          variant={itemCount > 0 ? "default" : "secondary"} 
                          className="text-xs"
                        >
                          {itemCount}/{SLOTS_PER_CHAPTER}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 p-2">
                        {Array.from({ length: SLOTS_PER_CHAPTER }, (_, slotIndex) => {
                          const slotKey = getChapterSlotKey(chapterIndex, slotIndex);
                          const existingItem = collectedItems.get(slotKey);
                          const isSelected = selectedSlot?.chapter === chapterIndex && selectedSlot?.slot === slotIndex;
                          const isOccupied = !!existingItem;

                          return (
                            <button
                              key={slotIndex}
                              disabled={isOccupied}
                              onClick={() => setSelectedSlot({ chapter: chapterIndex, slot: slotIndex })}
                              className={cn(
                                "flex items-center justify-center rounded border min-h-[60px] transition-all",
                                isOccupied
                                  ? "border-border bg-muted/50 cursor-not-allowed opacity-60"
                                  : isSelected
                                  ? "border-primary bg-primary/20 ring-2 ring-primary"
                                  : "border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
                              )}
                              data-testid={`modal-slot-${chapterIndex + 1}-${slotIndex + 1}`}
                            >
                              {isOccupied ? (
                                <div className="flex flex-col items-center gap-0.5 p-1">
                                  <span className="text-[9px] font-mono">#{existingItem.gameId}</span>
                                  <div className="flex items-center gap-0.5">
                                    {existingItem.team.slice(0, 3).map((member, idx) => (
                                      <Avatar key={idx} className="h-4 w-4 border border-border">
                                        <AvatarImage src={member.icon} alt={member.name} />
                                        <AvatarFallback className="text-[6px]">
                                          {member.name.substring(0, 1)}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </div>
                                </div>
                              ) : isSelected ? (
                                <Check className="h-5 w-5 text-primary" />
                              ) : (
                                <span className="text-xs text-muted-foreground/50">
                                  {slotIndex + 1}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-add">
            Отмена
          </Button>
          {!alreadyCollected && (
            <Button 
              onClick={handleSave} 
              disabled={!selectedSlot}
              data-testid="button-save-add"
            >
              Сохранить
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
