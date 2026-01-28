import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Swords, Shield, Users, Zap } from "lucide-react";
import type { ProcessedBattle } from "@shared/schema";
import { ELEMENT_EMOJIS } from "@/lib/battleUtils";

interface BattleCardProps {
  battle: ProcessedBattle;
}

export function BattleCard({ battle }: BattleCardProps) {
  const isHeroic = battle.type === "heroic";

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
              <div className="flex items-center gap-1 mt-1">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span className="text-xs font-medium">
                  {battle.isMixedPowerLevel ? (
                    <span className="text-orange-500">Смешанный ({battle.powerLevel.toLocaleString()})</span>
                  ) : (
                    battle.powerLevel.toLocaleString()
                  )}
                </span>
              </div>
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
      </CardContent>
    </Card>
  );
}
