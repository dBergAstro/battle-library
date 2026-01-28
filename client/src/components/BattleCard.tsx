import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Swords, Shield, Users, Zap, PlayCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { ProcessedBattle, ProcessedReplay } from "@shared/schema";
import { ELEMENT_EMOJIS } from "@/lib/battleUtils";
import { GRADE_COLORS } from "@/lib/replayUtils";

interface BattleCardProps {
  battle: ProcessedBattle;
  replays?: ProcessedReplay[];
}

export function BattleCard({ battle, replays = [] }: BattleCardProps) {
  const isHeroic = battle.type === "heroic";
  const [isReplaysOpen, setIsReplaysOpen] = useState(false);

  return (
    <Card
      className="hover-elevate border-card-border transition-all"
      data-testid={`card-battle-${battle.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-base font-semibold text-foreground">
                #{battle.gameId}
              </span>
              <Badge
                variant={isHeroic ? "default" : "secondary"}
                className={
                  isHeroic
                    ? "bg-blue-600 hover:bg-blue-600"
                    : "bg-amber-600 hover:bg-amber-600 text-white"
                }
              >
                {isHeroic ? (
                  <>
                    <Swords className="h-3 w-3 mr-1" />
                    Героический
                  </>
                ) : (
                  <>
                    <Shield className="h-3 w-3 mr-1" />
                    Титанический
                  </>
                )}
              </Badge>
              {battle.totems && battle.totems.length > 0 && (
                <div className="flex items-center gap-1" data-testid={`totems-${battle.id}`}>
                  {battle.totems.map((totem, idx) => (
                    <Tooltip key={`totem-${idx}`}>
                      <TooltipTrigger asChild>
                        <span className="text-lg cursor-default" data-testid={`totem-${totem.element}`}>
                          {ELEMENT_EMOJIS[totem.element] || totem.element}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">Тотем {totem.element}</p>
                        <p className="text-muted-foreground">{totem.points} очков</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
            <h3 className="font-medium text-sm truncate" title={`${battle.adventureName} - Глава ${battle.chapterNumber}`}>
              Глава {battle.chapterNumber} ({battle.adventureName})
            </h3>
            <p className="text-xs text-muted-foreground truncate" title={battle.originalLabel || battle.battleNumber}>
              {battle.battleNumber}
            </p>
            {battle.powerLevel != null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 mt-1 cursor-default">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs font-medium">
                      {battle.isMixedPowerLevel ? (
                        <span className="text-orange-500">Смешанный ({battle.powerLevel.toLocaleString()})</span>
                      ) : (
                        battle.powerLevel.toLocaleString()
                      )}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" sideOffset={4} className="text-xs z-[100]">
                  <p className="font-medium">Power Level</p>
                  {battle.isMixedPowerLevel && (
                    <p className="text-muted-foreground">Разные уровни сложности в команде</p>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
            <Users className="h-3 w-3" />
            <span>{battle.team.length}</span>
          </div>
          <div className="flex -space-x-2">
            {battle.team.map((member, idx) => (
              <Tooltip key={`${battle.id}-${member.heroId}-${idx}`}>
                <TooltipTrigger asChild>
                  <Avatar
                    className="h-12 w-12 border-2 border-card ring-0"
                    data-testid={`avatar-hero-${member.heroId}`}
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
                  <p className="text-muted-foreground">ID: {member.heroId}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          {battle.team.length === 0 && (
            <span className="text-xs text-muted-foreground italic">
              Нет данных о команде
            </span>
          )}
        </div>

        {replays.length > 0 && (
          <Collapsible open={isReplaysOpen} onOpenChange={setIsReplaysOpen} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 w-full justify-center"
                data-testid={`toggle-replays-${battle.id}`}
              >
                <PlayCircle className="h-3.5 w-3.5" />
                <span className="font-medium">Записи ({replays.length})</span>
                {isReplaysOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {replays.map((replay) => (
                <ReplayItem key={replay.id} replay={replay} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

interface ReplayItemProps {
  replay: ProcessedReplay;
}

function ReplayItem({ replay }: ReplayItemProps) {
  return (
    <div 
      className="p-2 rounded-md bg-muted/30 border border-border/50"
      data-testid={`replay-item-${replay.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs">
          {replay.enemyType}
        </Badge>
        {replay.comment && (
          <span className="text-xs text-muted-foreground truncate" title={replay.comment}>
            {replay.comment}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {replay.mainPetIcon && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative mr-1">
                <Avatar className="h-8 w-8 ring-2 ring-green-500">
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
        
        <div className="flex -space-x-1.5">
          {replay.team.map((member, idx) => (
            <Tooltip key={`${replay.id}-${member.heroId}-${idx}`}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar
                    className={`h-9 w-9 ring-2 ${GRADE_COLORS[member.grade]}`}
                    data-testid={`replay-avatar-${member.heroId}`}
                  >
                    {member.icon ? (
                      <AvatarImage src={member.icon} alt={member.name} />
                    ) : null}
                    <AvatarFallback className="text-xs font-medium bg-muted">
                      {member.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {member.favorPetIcon && (
                    <Avatar className="h-4 w-4 absolute -bottom-0.5 -right-0.5 ring-1 ring-card">
                      <AvatarImage src={member.favorPetIcon} alt="Покровительство" />
                      <AvatarFallback className="text-[6px] bg-blue-500/20">F</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-medium">{member.name}</p>
                <p className="text-muted-foreground">Фрагменты: {member.fragmentCount}</p>
                {member.favorPetId && (
                  <p className="text-muted-foreground">Покровительство: {member.favorPetId}</p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {replay.totems && replay.totems.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {replay.totems.map((totem, idx) => (
            <div key={idx} className="flex items-center gap-1 text-xs bg-background/50 rounded px-1.5 py-0.5">
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
    </div>
  );
}
