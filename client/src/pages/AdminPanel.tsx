import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FolderOpen, 
  Database,
  Image,
  Shield,
  Users,
  Zap,
  Plus,
  ArrowUpDown,
  Flame
} from "lucide-react";
import {
  parseCSV,
  parseJSON,
  validateBossList,
  validateBossTeam,
  validateBossLevel,
  parseSortOrderText,
  parseTitanElementsText,
} from "@/lib/battleUtils";
import { apiRequest } from "@/lib/queryClient";

interface StatsResponse {
  bossList: number;
  bossTeam: number;
  bossLevel: number;
  heroIcons: number;
  heroNames: number;
  heroSortOrder: number;
  titanElements: number;
}

interface TableConfig {
  key: "bossList" | "bossTeam" | "bossLevel";
  title: string;
  description: string;
  endpoint: string;
}

const tables: TableConfig[] = [
  {
    key: "bossList",
    title: "Boss List",
    description: "invasion_boss_list-boss_list",
    endpoint: "/api/admin/boss-list",
  },
  {
    key: "bossTeam",
    title: "Boss Team",
    description: "invasion_boss_list-boss_team",
    endpoint: "/api/admin/boss-team",
  },
  {
    key: "bossLevel",
    title: "Boss Level",
    description: "invasion_boss_list-boss_level (powerLevel)",
    endpoint: "/api/admin/boss-level",
  },
];

interface IconFolderConfig {
  key: string;
  title: string;
  description: string;
  category: string;
}

const iconFolders: IconFolderConfig[] = [
  { key: "heroes", title: "Герои", description: "Иконки героев (id 1-99)", category: "heroes" },
  { key: "creeps", title: "Крипы", description: "Иконки крипов (id 1000-3999)", category: "creeps" },
  { key: "titans", title: "Титаны", description: "Иконки титанов (id 4000+)", category: "titans" },
];

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingStatus, setUploadingStatus] = useState<Record<string, boolean>>({});
  const [loadingProgress, setLoadingProgress] = useState<Record<string, { current: number; total: number } | null>>({});
  const [iconLoadingProgress, setIconLoadingProgress] = useState<Record<string, { current: number; total: number } | null>>({});
  const folderInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const iconFolderRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  // Hero names editing
  const [newHeroId, setNewHeroId] = useState("");
  const [newHeroName, setNewHeroName] = useState("");
  const [heroNamesUploading, setHeroNamesUploading] = useState(false);

  // Sort order input
  const [sortOrderText, setSortOrderText] = useState("");
  const [sortOrderUploading, setSortOrderUploading] = useState(false);

  // Titan elements input
  const [titanElementsText, setTitanElementsText] = useState("");
  const [titanElementsUploading, setTitanElementsUploading] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 5000,
  });

  const uploadToServer = async (endpoint: string, data: Record<string, unknown>[]) => {
    const response = await apiRequest("POST", endpoint, data);
    return response.json();
  };

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, config: TableConfig) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setUploadingStatus((prev) => ({ ...prev, [config.key]: true }));
        setErrors((prev) => { const n = { ...prev }; delete n[config.key]; return n; });

        const text = await file.text();
        let data: Record<string, unknown>[];

        if (file.name.endsWith(".json")) {
          data = parseJSON(text);
        } else if (file.name.endsWith(".csv")) {
          data = parseCSV(text);
        } else {
          setErrors((prev) => ({ ...prev, [config.key]: "Поддерживаются только CSV и JSON файлы" }));
          return;
        }

        if (data.length === 0) {
          setErrors((prev) => ({ ...prev, [config.key]: "Файл пустой или имеет неверный формат" }));
          return;
        }

        const validation = config.key === "bossList" 
          ? validateBossList(data) 
          : config.key === "bossTeam"
          ? validateBossTeam(data)
          : validateBossLevel(data);

        if (!validation.valid) {
          setErrors((prev) => ({ ...prev, [config.key]: validation.errors.join("; ") }));
          return;
        }

        await uploadToServer(config.endpoint, data);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
      } catch (err) {
        setErrors((prev) => ({ ...prev, [config.key]: err instanceof Error ? err.message : "Ошибка загрузки" }));
      } finally {
        setUploadingStatus((prev) => ({ ...prev, [config.key]: false }));
        e.target.value = "";
      }
    },
    [queryClient]
  );

  const handleFolderInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, config: TableConfig) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      try {
        setUploadingStatus((prev) => ({ ...prev, [config.key]: true }));
        setErrors((prev) => { const n = { ...prev }; delete n[config.key]; return n; });

        const jsonFiles = Array.from(files).filter((f) => f.name.endsWith(".json"));
        
        if (jsonFiles.length === 0) {
          setErrors((prev) => ({ ...prev, [config.key]: "В папке не найдены JSON файлы" }));
          return;
        }

        const total = jsonFiles.length;
        setLoadingProgress((prev) => ({ ...prev, [config.key]: { current: 0, total } }));

        const allRecords: Record<string, unknown>[] = [];
        const BATCH_SIZE = 50;
        
        for (let i = 0; i < jsonFiles.length; i += BATCH_SIZE) {
          const batch = jsonFiles.slice(i, i + BATCH_SIZE);
          
          const batchResults = await Promise.all(
            batch.map(async (file) => {
              try {
                const text = await file.text();
                return JSON.parse(text);
              } catch {
                return null;
              }
            })
          );

          for (const parsed of batchResults) {
            if (parsed === null) continue;
            if (Array.isArray(parsed)) {
              allRecords.push(...parsed);
            } else if (typeof parsed === "object" && parsed !== null) {
              allRecords.push(parsed);
            }
          }

          setLoadingProgress((prev) => ({
            ...prev,
            [config.key]: { current: Math.min(i + BATCH_SIZE, total), total },
          }));

          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        setLoadingProgress((prev) => ({ ...prev, [config.key]: null }));

        if (allRecords.length === 0) {
          setErrors((prev) => ({ ...prev, [config.key]: "Не удалось загрузить данные из папки" }));
          return;
        }

        const validation = config.key === "bossList" 
          ? validateBossList(allRecords) 
          : config.key === "bossTeam"
          ? validateBossTeam(allRecords)
          : validateBossLevel(allRecords);

        if (!validation.valid) {
          setErrors((prev) => ({ ...prev, [config.key]: validation.errors.join("; ") }));
          return;
        }

        await uploadToServer(config.endpoint, allRecords);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
      } catch (err) {
        setLoadingProgress((prev) => ({ ...prev, [config.key]: null }));
        setErrors((prev) => ({ ...prev, [config.key]: err instanceof Error ? err.message : "Ошибка загрузки" }));
      } finally {
        setUploadingStatus((prev) => ({ ...prev, [config.key]: false }));
        e.target.value = "";
      }
    },
    [queryClient]
  );

  const handleIconFolderInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, config: IconFolderConfig) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const folderKey = `icons_${config.key}`;
      
      try {
        setUploadingStatus((prev) => ({ ...prev, [folderKey]: true }));
        setErrors((prev) => { const n = { ...prev }; delete n[folderKey]; return n; });

        const imageFiles = Array.from(files).filter((f) => 
          f.type.startsWith("image/") || 
          f.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)
        );
        
        if (imageFiles.length === 0) {
          setErrors((prev) => ({ ...prev, [folderKey]: "В папке не найдены изображения" }));
          return;
        }

        setIconLoadingProgress((prev) => ({ ...prev, [config.key]: { current: 0, total: imageFiles.length } }));

        const icons: Array<{ heroId: number; iconUrl: string; category: string }> = [];
        
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const matches = baseName.match(/\d+/g);
          
          if (matches && matches.length > 0) {
            const heroId = parseInt(matches[matches.length - 1], 10);
            
            const buffer = await file.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            const mimeType = file.type || 'image/png';
            const iconUrl = `data:${mimeType};base64,${base64}`;
            
            icons.push({ heroId, iconUrl, category: config.category });
          }

          if ((i + 1) % 50 === 0 || i === imageFiles.length - 1) {
            setIconLoadingProgress((prev) => ({ ...prev, [config.key]: { current: i + 1, total: imageFiles.length } }));
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        setIconLoadingProgress((prev) => ({ ...prev, [config.key]: null }));

        if (icons.length === 0) {
          setErrors((prev) => ({ ...prev, [folderKey]: "Не удалось извлечь ID из имён файлов" }));
          return;
        }

        const BATCH_SIZE = 50;
        for (let i = 0; i < icons.length; i += BATCH_SIZE) {
          const batch = icons.slice(i, i + BATCH_SIZE);
          await apiRequest("POST", "/api/admin/hero-icons", batch);
        }

        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
      } catch (err) {
        setIconLoadingProgress((prev) => ({ ...prev, [config.key]: null }));
        setErrors((prev) => ({ ...prev, [folderKey]: err instanceof Error ? err.message : "Ошибка загрузки иконок" }));
      } finally {
        setUploadingStatus((prev) => ({ ...prev, [folderKey]: false }));
        e.target.value = "";
      }
    },
    [queryClient]
  );

  const handleAddHeroName = async () => {
    const heroIdVal = newHeroId.trim();
    const heroNameVal = newHeroName.trim();
    const heroId = parseInt(heroIdVal, 10);
    
    if (isNaN(heroId) || !heroNameVal) {
      setErrors((prev) => ({ ...prev, heroNames: "Введите корректный ID и имя" }));
      return;
    }

    setHeroNamesUploading(true);
    setErrors((prev) => { const n = { ...prev }; delete n.heroNames; return n; });

    try {
      await apiRequest("POST", "/api/admin/hero-names", [{ heroId, name: heroNameVal }]);
      
      setNewHeroId("");
      setNewHeroName("");
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
    } catch (err) {
      setErrors((prev) => ({ ...prev, heroNames: err instanceof Error ? err.message : "Ошибка сохранения" }));
    } finally {
      setHeroNamesUploading(false);
    }
  };

  const handleSaveSortOrder = async () => {
    const trimmed = sortOrderText.trim();
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, sortOrder: "Введите данные порядка сортировки" }));
      return;
    }

    const parsed = parseSortOrderText(trimmed);
    if (parsed.length === 0) {
      setErrors((prev) => ({ ...prev, sortOrder: "Не удалось распознать данные. Формат: ID порядок" }));
      return;
    }

    setSortOrderUploading(true);
    setErrors((prev) => { const n = { ...prev }; delete n.sortOrder; return n; });

    try {
      await apiRequest("POST", "/api/admin/hero-sort-order", parsed);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
    } catch (err) {
      setErrors((prev) => ({ ...prev, sortOrder: err instanceof Error ? err.message : "Ошибка сохранения" }));
    } finally {
      setSortOrderUploading(false);
    }
  };

  const handleSaveTitanElements = async () => {
    const trimmed = titanElementsText.trim();
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, titanElements: "Введите данные стихий титанов" }));
      return;
    }

    const parsed = parseTitanElementsText(trimmed);
    if (parsed.length === 0) {
      setErrors((prev) => ({ ...prev, titanElements: "Не удалось распознать данные. Формат: ID стихия очки" }));
      return;
    }

    setTitanElementsUploading(true);
    setErrors((prev) => { const n = { ...prev }; delete n.titanElements; return n; });

    try {
      await apiRequest("POST", "/api/admin/titan-elements", parsed);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
    } catch (err) {
      setErrors((prev) => ({ ...prev, titanElements: err instanceof Error ? err.message : "Ошибка сохранения" }));
    } finally {
      setTitanElementsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Панель администратора</h1>
            <p className="text-sm text-muted-foreground">
              Загрузка данных для библиотеки боёв
            </p>
          </div>
        </header>

        {/* Stats Card */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Статистика базы данных
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Загрузка...</span>
              </div>
            ) : stats ? (
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.bossList}</p>
                  <p className="text-xs text-muted-foreground">Боёв</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.bossTeam}</p>
                  <p className="text-xs text-muted-foreground">Команд</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.bossLevel}</p>
                  <p className="text-xs text-muted-foreground">Уровней</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.heroIcons}</p>
                  <p className="text-xs text-muted-foreground">Иконок</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.heroNames}</p>
                  <p className="text-xs text-muted-foreground">Имён</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.heroSortOrder}</p>
                  <p className="text-xs text-muted-foreground">Порядок</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.titanElements}</p>
                  <p className="text-xs text-muted-foreground">Стихии</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Нет данных</p>
            )}
          </CardContent>
        </Card>

        {/* Upload Tables */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileJson className="h-5 w-5 text-primary" />
              Загрузка таблиц данных
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {tables.map((config) => (
                <div
                  key={config.key}
                  className={`border rounded-md p-4 transition-all ${
                    (stats?.[config.key] ?? 0) > 0
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-border"
                  }`}
                  data-testid={`upload-${config.key}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">{config.title}</span>
                    {(stats?.[config.key] ?? 0) > 0 && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-muted-foreground">
                          ({stats?.[config.key]})
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {config.description}
                  </p>

                  <div className="flex gap-2 flex-wrap">
                    <label>
                      <input
                        type="file"
                        accept=".csv,.json"
                        className="hidden"
                        onChange={(e) => handleFileInput(e, config)}
                        disabled={uploadingStatus[config.key]}
                        data-testid={`input-file-${config.key}`}
                      />
                      <Button
                        size="sm"
                        variant="default"
                        className="cursor-pointer"
                        disabled={uploadingStatus[config.key]}
                        asChild
                      >
                        <span>
                          {uploadingStatus[config.key] ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3 mr-1" />
                          )}
                          Файл
                        </span>
                      </Button>
                    </label>
                    <input
                      type="file"
                      ref={(el) => (folderInputRefs.current[config.key] = el)}
                      className="hidden"
                      onChange={(e) => handleFolderInput(e, config)}
                      disabled={uploadingStatus[config.key]}
                      data-testid={`input-folder-${config.key}`}
                      {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => folderInputRefs.current[config.key]?.click()}
                      disabled={uploadingStatus[config.key]}
                      data-testid={`button-folder-${config.key}`}
                    >
                      <FolderOpen className="h-3 w-3 mr-1" />
                      Папка
                    </Button>
                  </div>

                  {loadingProgress[config.key] && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Загрузка...</span>
                        <span>{loadingProgress[config.key]!.current} / {loadingProgress[config.key]!.total}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-200"
                          style={{ width: `${(loadingProgress[config.key]!.current / loadingProgress[config.key]!.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {errors[config.key] && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span>{errors[config.key]}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upload Icons by Category */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Image className="h-5 w-5 text-primary" />
              Загрузка иконок по категориям
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {iconFolders.map((config) => {
                const folderKey = `icons_${config.key}`;
                return (
                  <div
                    key={config.key}
                    className="border rounded-md p-4 transition-all border-border"
                    data-testid={`upload-icons-${config.key}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">{config.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {config.description}
                    </p>

                    <input
                      type="file"
                      ref={(el) => (iconFolderRefs.current[config.key] = el)}
                      className="hidden"
                      onChange={(e) => handleIconFolderInput(e, config)}
                      disabled={uploadingStatus[folderKey]}
                      data-testid={`input-icons-${config.key}`}
                      {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                    />
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => iconFolderRefs.current[config.key]?.click()}
                      disabled={uploadingStatus[folderKey]}
                      data-testid={`button-icons-${config.key}`}
                    >
                      {uploadingStatus[folderKey] ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <FolderOpen className="h-3 w-3 mr-1" />
                      )}
                      Выбрать папку
                    </Button>

                    {iconLoadingProgress[config.key] && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Обработка...</span>
                          <span>{iconLoadingProgress[config.key]!.current} / {iconLoadingProgress[config.key]!.total}</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-200"
                            style={{ width: `${(iconLoadingProgress[config.key]!.current / iconLoadingProgress[config.key]!.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {errors[folderKey] && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{errors[folderKey]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Hero Names Editor */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Редактирование имён персонажей
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Добавьте или обновите имя персонажа по его ID. Имена из базы имеют приоритет над встроенными.
            </p>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[100px]">
                <label className="text-xs text-muted-foreground mb-1 block">ID персонажа</label>
                <Input
                  type="number"
                  placeholder="4003"
                  value={newHeroId}
                  onChange={(e) => setNewHeroId(e.target.value)}
                  className="h-9"
                  data-testid="input-hero-id"
                />
              </div>
              <div className="flex-[2] min-w-[150px]">
                <label className="text-xs text-muted-foreground mb-1 block">Имя</label>
                <Input
                  type="text"
                  placeholder="Название персонажа"
                  value={newHeroName}
                  onChange={(e) => setNewHeroName(e.target.value)}
                  className="h-9"
                  data-testid="input-hero-name"
                />
              </div>
              <Button
                size="sm"
                onClick={handleAddHeroName}
                disabled={heroNamesUploading}
                data-testid="button-add-hero-name"
              >
                {heroNamesUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить
                  </>
                )}
              </Button>
            </div>
            {errors.heroNames && (
              <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{errors.heroNames}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sort Order Editor */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowUpDown className="h-5 w-5 text-primary" />
              Порядок сортировки героев/титанов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Задайте порядок отображения персонажей в бою. Формат: ID порядок (поддерживаются дробные значения, например 4.5)
            </p>
            <Textarea
              placeholder={`11\t1\n1\t2\n24\t3\n7024\t4\n70\t4.5\n50\t5`}
              value={sortOrderText}
              onChange={(e) => setSortOrderText(e.target.value)}
              className="min-h-[150px] font-mono text-sm mb-3"
              data-testid="textarea-sort-order"
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveSortOrder}
                disabled={sortOrderUploading}
                data-testid="button-save-sort-order"
              >
                {sortOrderUploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Сохранить порядок
              </Button>
              {(stats?.heroSortOrder ?? 0) > 0 && (
                <Badge variant="secondary">
                  Загружено: {stats?.heroSortOrder} записей
                </Badge>
              )}
            </div>
            {errors.sortOrder && (
              <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{errors.sortOrder}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Titan Elements Editor */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="h-5 w-5 text-primary" />
              Стихии титанов (для тотемов)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Укажите стихию и количество очков для каждого титана.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Тотем активируется при 3+ очках воды/огня/земли или 2+ очках света/тьмы. Максимум 2 тотема на бой.
            </p>
            <Textarea
              placeholder={`4000 вода 1\n4001 вода 1\n4004 вода 2\n4010 огонь 1\n4030 тьма 1\n4040 свет 1`}
              value={titanElementsText}
              onChange={(e) => setTitanElementsText(e.target.value)}
              className="min-h-[150px] font-mono text-sm mb-3"
              data-testid="textarea-titan-elements"
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveTitanElements}
                disabled={titanElementsUploading}
                data-testid="button-save-titan-elements"
              >
                {titanElementsUploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Сохранить стихии
              </Button>
              {(stats?.titanElements ?? 0) > 0 && (
                <Badge variant="secondary">
                  Загружено: {stats?.titanElements} записей
                </Badge>
              )}
            </div>
            {errors.titanElements && (
              <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{errors.titanElements}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
