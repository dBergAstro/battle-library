import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Upload, Eye, Users, Dog, Sparkles, Shield, Loader2, CheckCircle2, Gem } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { gasApi } from "@/lib/gasApi";
import { getHeroName } from "@/lib/heroNames";
import { useToast } from "@/hooks/use-toast";

export type EntityCategory = "all" | "heroes" | "creeps" | "titans" | "pets" | "spirits" | "talismans";

interface EntityData {
  id: number;
  name: string;
  icon?: string;
  category: EntityCategory;
  categoryLabel: string;
  description?: string;
}

interface EntityViewerProps {
  heroIcons: Array<{ heroId: number; iconUrl: string; category?: string | null }>;
  heroNames: Array<{ heroId: number; name: string }>;
  petIcons: Array<{ petId: number; iconUrl: string }>;
  spiritSkills: Array<{ skillId: number; name: string }>;
  spiritIcons: Array<{ skillId: number; iconUrl: string }>;
  talismans?: Array<{ talismanId: number; name: string; effectKey: string; description?: string | null; iconUrl?: string | null }>;
}

function getCategoryFromExplicitOrId(
  heroId: number,
  explicitCategory?: string | null
): EntityCategory {
  if (explicitCategory) {
    if (explicitCategory === "heroes") return "heroes";
    if (explicitCategory === "creeps") return "creeps";
    if (explicitCategory === "titans") return "titans";
  }
  if (heroId >= 1 && heroId <= 999) return "heroes";
  if ((heroId >= 1000 && heroId <= 3999) || (heroId >= 5000 && heroId <= 5999)) return "creeps";
  if (heroId >= 4000 && heroId <= 4999) return "titans";
  if (heroId >= 6000 && heroId <= 6999) return "pets";
  return "heroes";
}

function getCategoryLabel(category: EntityCategory): string {
  switch (category) {
    case "heroes": return "Герой";
    case "creeps": return "Крип";
    case "titans": return "Титан";
    case "pets": return "Питомец";
    case "spirits": return "Скил тотема";
    case "talismans": return "Талисман";
    default: return "Сущность";
  }
}

export function EntityViewer({
  heroIcons,
  heroNames,
  petIcons,
  spiritSkills,
  spiritIcons,
  talismans = [],
}: EntityViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<EntityCategory>("all");
  const [selectedEntity, setSelectedEntity] = useState<EntityData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const allEntities = useMemo<EntityData[]>(() => {
    const entities: EntityData[] = [];
    const processedIds = new Set<string>();

    const heroIconMap = new Map(heroIcons.map((h) => [h.heroId, h.iconUrl]));
    const heroCategoryMap = new Map(heroIcons.map((h) => [h.heroId, h.category]));
    const heroNameMap = new Map(heroNames.map((h) => [h.heroId, h.name]));

    const heroIds = new Set<number>();
    heroIcons.forEach((h) => heroIds.add(h.heroId));
    heroNames.filter(h => h.heroId < 6000).forEach((h) => heroIds.add(h.heroId));

    heroIds.forEach((id) => {
      if (id >= 6000) return;
      const explicitCategory = heroCategoryMap.get(id);
      const category = getCategoryFromExplicitOrId(id, explicitCategory);
      const key = `hero-${id}`;
      if (!processedIds.has(key)) {
        processedIds.add(key);
        entities.push({
          id,
          name: heroNameMap.get(id) || getHeroName(id),
          icon: heroIconMap.get(id),
          category,
          categoryLabel: getCategoryLabel(category),
        });
      }
    });

    const petIconMap = new Map(petIcons.map((p) => [p.petId, p.iconUrl]));
    const petIds = new Set<number>();
    petIcons.forEach((p) => petIds.add(p.petId));
    heroNames.filter(h => h.heroId >= 6000 && h.heroId < 7000).forEach(h => petIds.add(h.heroId));

    petIds.forEach((id) => {
      const key = `pet-${id}`;
      if (!processedIds.has(key)) {
        processedIds.add(key);
        entities.push({
          id,
          name: heroNameMap.get(id) || getHeroName(id) || `Питомец ${id}`,
          icon: petIconMap.get(id),
          category: "pets",
          categoryLabel: getCategoryLabel("pets"),
        });
      }
    });

    const spiritIconMap = new Map(spiritIcons.map((s) => [s.skillId, s.iconUrl]));
    const spiritNameMap = new Map(spiritSkills.map((s) => [s.skillId, s.name]));
    const spiritIds = new Set<number>();
    spiritIcons.forEach((s) => spiritIds.add(s.skillId));
    spiritSkills.forEach((s) => spiritIds.add(s.skillId));

    spiritIds.forEach((id) => {
      const key = `spirit-${id}`;
      if (!processedIds.has(key)) {
        processedIds.add(key);
        entities.push({
          id,
          name: spiritNameMap.get(id) || `Скил ${id}`,
          icon: spiritIconMap.get(id),
          category: "spirits",
          categoryLabel: getCategoryLabel("spirits"),
        });
      }
    });

    talismans.forEach((t) => {
      const key = `talisman-${t.talismanId}`;
      if (!processedIds.has(key)) {
        processedIds.add(key);
        entities.push({
          id: t.talismanId,
          name: t.name,
          icon: t.iconUrl ?? undefined,
          category: "talismans",
          categoryLabel: getCategoryLabel("talismans"),
          description: t.description ?? undefined,
        });
      }
    });

    return entities.sort((a, b) => {
      if (a.category === b.category) return a.id - b.id;
      return a.id - b.id;
    });
  }, [heroIcons, heroNames, petIcons, spiritSkills, spiritIcons, talismans]);

  const filteredEntities = useMemo(() => {
    let result = allEntities;

    if (categoryFilter !== "all") {
      result = result.filter((e) => e.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) => e.id.toString().includes(query) || e.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [allEntities, categoryFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = allEntities.length;
    const withIcon = allEntities.filter((e) => e.icon).length;
    const heroes = allEntities.filter((e) => e.category === "heroes").length;
    const creeps = allEntities.filter((e) => e.category === "creeps").length;
    const titans = allEntities.filter((e) => e.category === "titans").length;
    const pets = allEntities.filter((e) => e.category === "pets").length;
    const spirits = allEntities.filter((e) => e.category === "spirits").length;
    const talismanCount = allEntities.filter((e) => e.category === "talismans").length;
    return { total, withIcon, heroes, creeps, titans, pets, spirits, talismans: talismanCount };
  }, [allEntities]);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEntity) return;

    setUploading(true);
    setUploadSuccess(false);

    try {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const id = selectedEntity.id;
      const gasCategory =
        selectedEntity.category === "heroes"  ? "hero"   :
        selectedEntity.category === "creeps"  ? "creep"  :
        selectedEntity.category === "titans"  ? "titan"  :
        selectedEntity.category === "pets"    ? "pet"    :
        selectedEntity.category === "spirits" ? "spirit" :
        "talisman";
      const rawBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      const filename = `${gasCategory}_${id}.png`;

      if (selectedEntity.category === "talismans") {
        await gasApi.adminUpload("talisman-icons", [
          { talismanId: id, iconUrl: dataUrl }
        ]);
      } else {
        await gasApi.uploadIconsBatch(gasCategory, [
          { id, base64: rawBase64, filename }
        ]);
      }

      setSelectedEntity({ ...selectedEntity, icon: dataUrl });

      queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setUploadSuccess(true);
      toast({
        title: "Иконка загружена",
        description: `Иконка для ${selectedEntity.name} успешно обновлена`,
      });
      setTimeout(() => setUploadSuccess(false), 2000);
    } catch (error) {
      console.error("Error uploading icon:", error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить иконку. Попробуйте ещё раз.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="border-card-border" data-testid="card-entity-viewer">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Eye className="h-5 w-5 text-primary" />
          Просмотр сущностей
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs" data-testid="entity-stats">
          <Badge variant="outline" data-testid="badge-total">Всего: {stats.total}</Badge>
          <Badge variant="secondary" data-testid="badge-with-icons">С иконками: {stats.withIcon}</Badge>
          <Badge variant="outline" className="border-blue-500 text-blue-600" data-testid="badge-heroes">
            <Users className="h-3 w-3 mr-1" />
            Герои: {stats.heroes}
          </Badge>
          <Badge variant="outline" className="border-green-500 text-green-600" data-testid="badge-creeps">
            <Shield className="h-3 w-3 mr-1" />
            Крипы: {stats.creeps}
          </Badge>
          <Badge variant="outline" className="border-amber-500 text-amber-600" data-testid="badge-titans">
            <Shield className="h-3 w-3 mr-1" />
            Титаны: {stats.titans}
          </Badge>
          <Badge variant="outline" className="border-purple-500 text-purple-600" data-testid="badge-pets">
            <Dog className="h-3 w-3 mr-1" />
            Питомцы: {stats.pets}
          </Badge>
          <Badge variant="outline" className="border-pink-500 text-pink-600" data-testid="badge-spirits">
            <Sparkles className="h-3 w-3 mr-1" />
            Скилы: {stats.spirits}
          </Badge>
          {stats.talismans > 0 && (
            <Badge variant="outline" className="border-yellow-500 text-yellow-600" data-testid="badge-talismans">
              <Gem className="h-3 w-3 mr-1" />
              Талисманы: {stats.talismans}
            </Badge>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по ID или имени..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-entity-search"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as EntityCategory)}>
            <SelectTrigger className="w-[160px]" data-testid="select-entity-category">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="select-item-all">Все категории</SelectItem>
              <SelectItem value="heroes" data-testid="select-item-heroes">Герои</SelectItem>
              <SelectItem value="creeps" data-testid="select-item-creeps">Крипы</SelectItem>
              <SelectItem value="titans" data-testid="select-item-titans">Титаны</SelectItem>
              <SelectItem value="pets" data-testid="select-item-pets">Питомцы</SelectItem>
              <SelectItem value="spirits" data-testid="select-item-spirits">Скилы тотемов</SelectItem>
              {stats.talismans > 0 && (
                <SelectItem value="talismans" data-testid="select-item-talismans">Талисманы</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedEntity && (
          <div className="p-3 bg-muted/50 rounded-md flex items-center gap-3 flex-wrap" data-testid="selected-entity-panel">
            {selectedEntity.category === "talismans" ? (
              <div className="h-12 w-12 flex-shrink-0 flex items-center justify-center">
                {selectedEntity.icon ? (
                  <img src={selectedEntity.icon} alt={selectedEntity.name} className="h-12 w-12 object-contain" />
                ) : (
                  <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">Т</span>
                )}
              </div>
            ) : (
              <Avatar className="h-12 w-12 ring-2 ring-primary">
                {selectedEntity.icon ? (
                  <AvatarImage src={selectedEntity.icon} alt={selectedEntity.name} className="object-contain" />
                ) : null}
                <AvatarFallback className="text-sm bg-muted">
                  {selectedEntity.id}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" data-testid="selected-entity-name">#{selectedEntity.id} — {selectedEntity.name}</p>
              <p className="text-xs text-muted-foreground">{selectedEntity.categoryLabel}</p>
              {selectedEntity.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{selectedEntity.description}</p>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleIconUpload}
              data-testid="input-entity-icon-file"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              data-testid="button-upload-entity-icon"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : uploadSuccess ? (
                <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              {uploadSuccess ? "Загружено!" : "Загрузить иконку"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedEntity(null)}
              data-testid="button-cancel-selection"
            >
              Отмена
            </Button>
          </div>
        )}

        <ScrollArea className="h-[400px]" data-testid="entity-list-scroll">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {filteredEntities.map((entity) => (
              <Tooltip key={`${entity.category}-${entity.id}`}>
                <TooltipTrigger asChild>
                  <div
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                      selectedEntity?.id === entity.id && selectedEntity?.category === entity.category
                        ? "bg-primary/20 ring-1 ring-primary"
                        : "hover:bg-muted/50"
                    } ${!entity.icon ? "opacity-60" : ""}`}
                    onClick={() => setSelectedEntity(entity)}
                    data-testid={`entity-${entity.category}-${entity.id}`}
                  >
                    {entity.category === "talismans" ? (
                      <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center">
                        {entity.icon ? (
                          <img src={entity.icon} alt={entity.name} className="h-10 w-10 object-contain" />
                        ) : (
                          <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400">Т</span>
                        )}
                      </div>
                    ) : (
                      <Avatar className={`h-10 w-10 flex-shrink-0 ${!entity.icon ? "ring-1 ring-dashed ring-muted-foreground/50" : ""}`}>
                        {entity.icon ? (
                          <AvatarImage src={entity.icon} alt={entity.name} className="object-contain" />
                        ) : null}
                        <AvatarFallback className="text-[10px] bg-muted">{entity.id}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-mono text-muted-foreground">#{entity.id}</p>
                      <p className="text-xs font-medium truncate" title={entity.name}>{entity.name}</p>
                    </div>
                  </div>
                </TooltipTrigger>
                {entity.description && (
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    <p className="font-medium">{entity.name}</p>
                    <p className="text-muted-foreground mt-0.5">{entity.description}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
            {filteredEntities.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-8" data-testid="text-no-entities">
                Сущности не найдены
              </div>
            )}
          </div>
        </ScrollArea>

        <p className="text-xs text-muted-foreground" data-testid="text-entity-count">
          Найдено: {filteredEntities.length} из {allEntities.length}. Нажмите на сущность чтобы загрузить иконку.
        </p>
      </CardContent>
    </Card>
  );
}
