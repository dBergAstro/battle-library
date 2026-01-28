import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlayCircle, Users, Copy, Check } from "lucide-react";
import type { ProcessedReplay } from "@shared/schema";
import { GRADE_COLORS } from "@/lib/replayUtils";

interface ReplayCardProps {
  replay: ProcessedReplay;
}

export function ReplayCard({ replay }: ReplayCardProps) {
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

  return (
    <Card
      className="hover-elevate border-card-border"
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
                {replay.enemyType}
              </Badge>
            </div>
            <h3 className="font-medium text-sm">
              Глава {replay.chapter}, Бой {replay.level}
            </h3>
            {replay.comment && (
              <p className="text-xs text-muted-foreground truncate" title={replay.comment}>
                {replay.comment}
              </p>
            )}
          </div>
          
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
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
              <Users className="h-3 w-3" />
              <span>{replay.team.length}</span>
            </div>
            
            {replay.mainPetIcon && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mr-1">
                    <Avatar className="h-10 w-10 ring-2 ring-green-500">
                      <AvatarImage src={replay.mainPetIcon} alt="Основной питомец" />
                      <AvatarFallback className="text-xs bg-green-500/20">P</AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">Основной питомец</p>
                  <p className="text-muted-foreground">ID: {replay.mainPetId}</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <div className="flex gap-1">
              {replay.team.map((member, idx) => (
                <Tooltip key={`${replay.id}-${member.heroId}-${idx}`}>
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
              ))}
            </div>
          </div>

          {/* Ряд покровительства питомцев под героями */}
          {replay.team.some(m => m.favorPetIcon) && (
            <div className="flex items-center gap-1 ml-[52px]">
              {replay.mainPetIcon && <div className="w-10 mr-1" />}
              <div className="flex gap-1">
                {replay.team.map((member, idx) => (
                  <div key={`favor-${replay.id}-${idx}`} className="w-11 flex justify-center">
                    {member.favorPetIcon ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="h-6 w-6 ring-1 ring-blue-400">
                            <AvatarImage src={member.favorPetIcon} alt="Покровительство" />
                            <AvatarFallback className="text-[8px] bg-blue-500/20">F</AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          <p className="font-medium">Покровительство</p>
                          <p className="text-muted-foreground">Питомец: {member.favorPetId}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div className="h-6 w-6 border border-dashed border-muted-foreground/30 rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {replay.totems && replay.totems.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {replay.totems.map((totem, idx) => (
              <div key={idx} className="flex items-center gap-1 text-xs bg-muted/50 rounded px-1.5 py-0.5">
                <span className="font-medium">{totem.elementRu}</span>
                <div className="flex items-center gap-0.5">
                  {totem.skills.map((skill, skillIdx) => (
                    <Tooltip key={skillIdx}>
                      <TooltipTrigger asChild>
                        {skill.icon ? (
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={skill.icon} alt={skill.name} />
                            <AvatarFallback className="text-[6px]">{skill.name.slice(0, 1)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <span className="text-muted-foreground">{skill.skillId}</span>
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">{skill.name}</p>
                        <p className="text-muted-foreground">ID: {skill.skillId}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
