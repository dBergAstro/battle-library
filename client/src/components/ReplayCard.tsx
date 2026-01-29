import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlayCircle, Copy, Check, Plus } from "lucide-react";
import type { ProcessedReplay } from "@shared/schema";
import { GRADE_COLORS } from "@/lib/replayUtils";
import { cn } from "@/lib/utils";
import type { CollectedItem } from "./CollectionSidebar";

interface ReplayCardProps {
  replay: ProcessedReplay;
  isCollected?: boolean;
  onAddToCollection?: (item: CollectedItem) => void;
}

export function ReplayCard({ replay, isCollected, onAddToCollection }: ReplayCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(replay.rawDefendersFragments);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleAddToCollection = () => {
    if (onAddToCollection && !isCollected) {
      const item: CollectedItem = {
        id: `replay-${replay.id}`,
        type: "replay",
        gameId: replay.gameId,
        label: `Глава ${replay.chapter}`,
        desc: `Бой ${replay.level}`,
        battleType: replay.enemyType === "Герои" ? "heroic" : "titanic",
        team: replay.team.map(m => ({ heroId: m.heroId, name: m.name, icon: m.icon })),
        rawDefendersFragments: replay.rawDefendersFragments,
      };
      onAddToCollection(item);
    }
  };

  return (
    <Card
      className={cn(
        "hover-elevate border-card-border",
        isCollected && "ring-2 ring-primary/50 bg-primary/5 opacity-60"
      )}
      data-testid={`card-replay-${replay.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <PlayCircle className="h-4 w-4 text-green-500" />
              <span className="font-mono text-base font-semibold text-foreground">
                #{replay.gameId}
              </span>
              <Badge
                variant="outline"
                className={
                  replay.enemyType === "Герои"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-amber-500 text-amber-600 dark:text-amber-400"
                }
              >
                {replay.enemyType === "Герои" ? "Героический" : "Титанический"}
              </Badge>
            </div>
            <h3 className="font-medium text-sm">
              Глава {replay.chapter}, Бой {replay.level}
            </h3>
          </div>
          
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  data-testid={`button-copy-${replay.id}`}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {copied ? "Скопировано!" : "Копировать defendersFragments"}
              </TooltipContent>
            </Tooltip>
            
            {onAddToCollection && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isCollected ? "secondary" : "outline"}
                    size="icon"
                    disabled={isCollected}
                    onClick={handleAddToCollection}
                    data-testid={`button-add-replay-${replay.id}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {isCollected ? "Уже в коллекции" : "Добавить в коллекцию"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {replay.totems && replay.totems.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {replay.totems.map((totem, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs bg-muted/50 rounded px-2 py-1">
                <span className="font-medium">{totem.elementRu}</span>
                <div className="flex items-center gap-1">
                  {totem.skills.map((skill, skillIdx) => (
                    <Tooltip key={skillIdx}>
                      <TooltipTrigger asChild>
                        {skill.icon ? (
                          <Avatar className={`h-5 w-5 ring-1 ${GRADE_COLORS[skill.grade]}`}>
                            <AvatarImage src={skill.icon} alt={skill.name} />
                            <AvatarFallback className="text-[6px]">{skill.name.slice(0, 1)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <span className={`${skill.grade === "red" ? "text-red-500" : skill.grade === "orange" ? "text-orange-500" : "text-purple-500"}`}>
                            {skill.skillId}
                          </span>
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">{skill.name}</p>
                        <p className="text-muted-foreground">Уровень: {skill.level}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-1">
          {replay.mainPetIcon && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mr-1 pt-0.5">
                  <Avatar className="h-10 w-10 ring-2 ring-green-500">
                    <AvatarImage src={replay.mainPetIcon} alt="Основной питомец" />
                    <AvatarFallback className="text-xs bg-green-500/20">P</AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-medium">{replay.mainPetName || `Питомец ${replay.mainPetId}`}</p>
                <p className="text-muted-foreground">Основной питомец</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          <div className="flex gap-1">
            {replay.team.map((member, idx) => (
              <div key={`${replay.id}-${member.heroId}-${idx}`} className="flex flex-col items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar
                      className={`h-11 w-11 border-2 border-card ring-2 ${GRADE_COLORS[member.grade]}`}
                      data-testid={`replay-avatar-${member.heroId}`}
                    >
                      {member.icon ? (
                        <AvatarImage src={member.icon} alt={member.name} />
                      ) : null}
                      <AvatarFallback className="text-xs font-medium bg-muted">
                        {member.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-muted-foreground">Фрагменты: {member.fragmentCount}</p>
                  </TooltipContent>
                </Tooltip>
                
                {replay.team.some(m => m.favorPetIcon) && (
                  member.favorPetIcon ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-6 w-6 ring-1 ring-blue-400">
                          <AvatarImage src={member.favorPetIcon} alt="Покровительство" />
                          <AvatarFallback className="text-[8px] bg-blue-500/20">F</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <p className="font-medium">{member.favorPetName || `Питомец ${member.favorPetId}`}</p>
                        <p className="text-muted-foreground">Покровительство</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="h-6 w-6 border border-dashed border-muted-foreground/30 rounded-full" />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
