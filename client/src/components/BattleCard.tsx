import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Swords, Shield, Users } from "lucide-react";
import type { ProcessedBattle } from "@shared/schema";

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
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-muted-foreground">
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
            </div>
            <h3 className="font-medium text-sm truncate" title={battle.chapter}>
              {battle.chapter}
            </h3>
            <p className="text-xs text-muted-foreground truncate" title={battle.battleNumber}>
              {battle.battleNumber}
            </p>
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
                    className="h-8 w-8 border-2 border-card ring-0"
                    data-testid={`avatar-hero-${member.heroId}`}
                  >
                    {member.icon ? (
                      <AvatarImage src={member.icon} alt={member.name} />
                    ) : null}
                    <AvatarFallback className="text-[10px] font-medium bg-muted">
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
