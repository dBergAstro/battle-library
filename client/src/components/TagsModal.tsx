import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, X, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TagsModalProps {
  battleGameId: number;
  tags: string[];
  allTags: string[];
  // For external control (optional)
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function TagsModal({ battleGameId, tags, allTags, isOpen, onOpenChange, showTrigger = true }: TagsModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const queryClient = useQueryClient();
  
  // Use external control if provided, otherwise internal state
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const addTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      await apiRequest("POST", `/api/tags/${battleGameId}`, { tag });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setNewTag("");
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      await apiRequest("DELETE", `/api/tags/${battleGameId}/${encodeURIComponent(tag)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
  });

  const handleAddTag = () => {
    const tag = newTag.toLowerCase().trim();
    if (tag && !tags.includes(tag)) {
      addTagMutation.mutate(tag);
    }
  };

  const handleQuickAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      addTagMutation.mutate(tag);
    }
  };

  const suggestedTags = allTags.filter(t => !tags.includes(t)).slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            data-testid={`button-tags-${battleGameId}`}
          >
            <Tag className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md" style={{ pointerEvents: "auto", zIndex: 9999 }}>
        <DialogHeader>
          <DialogTitle>Теги для боя #{battleGameId}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Введите тег..."
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              data-testid="input-new-tag"
            />
            <Button
              onClick={handleAddTag}
              disabled={!newTag.trim() || addTagMutation.isPending}
              data-testid="button-add-tag"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Текущие теги:</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <button
                      onClick={() => removeTagMutation.mutate(tag)}
                      className="ml-1 hover:text-destructive"
                      data-testid={`button-remove-tag-${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {suggestedTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Быстрое добавление:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover-elevate"
                    onClick={() => handleQuickAddTag(tag)}
                    data-testid={`button-quick-tag-${tag}`}
                  >
                    + #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
