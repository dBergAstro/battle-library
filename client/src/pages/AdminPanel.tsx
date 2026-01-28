import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FolderOpen, 
  Database,
  Trash2,
  Image,
  Shield
} from "lucide-react";
import {
  parseCSV,
  parseJSON,
  validateBossList,
  validateBossTeam,
} from "@/lib/battleUtils";
import { apiRequest } from "@/lib/queryClient";

interface StatsResponse {
  bossList: number;
  bossTeam: number;
  heroIcons: number;
}

interface TableConfig {
  key: "bossList" | "bossTeam";
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
];

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingStatus, setUploadingStatus] = useState<Record<string, boolean>>({});
  const [loadingProgress, setLoadingProgress] = useState<Record<string, { current: number; total: number } | null>>({});
  const [iconLoadingProgress, setIconLoadingProgress] = useState<{ current: number; total: number } | null>(null);
  const folderInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const iconFolderRef = useRef<HTMLInputElement | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 5000,
  });

  const uploadToServer = async (endpoint: string, data: Record<string, unknown>[]) => {
    const response = await apiRequest("POST", endpoint, data);
    return response.json();
  };

  const uploadIconsToServer = async (icons: Array<{ heroId: number; iconUrl: string }>) => {
    const response = await apiRequest("POST", "/api/admin/hero-icons", icons);
    return response.json();
  };

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, config: TableConfig) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setUploadingStatus((prev) => ({ ...prev, [config.key]: true }));
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[config.key];
          return newErrors;
        });

        const text = await file.text();
        let data: Record<string, unknown>[];

        if (file.name.endsWith(".json")) {
          data = parseJSON(text);
        } else if (file.name.endsWith(".csv")) {
          data = parseCSV(text);
        } else {
          setErrors((prev) => ({
            ...prev,
            [config.key]: "Поддерживаются только CSV и JSON файлы",
          }));
          return;
        }

        if (data.length === 0) {
          setErrors((prev) => ({
            ...prev,
            [config.key]: "Файл пустой или имеет неверный формат",
          }));
          return;
        }

        const validation = config.key === "bossList" 
          ? validateBossList(data) 
          : validateBossTeam(data);

        if (!validation.valid) {
          setErrors((prev) => ({
            ...prev,
            [config.key]: validation.errors.join("; "),
          }));
          return;
        }

        await uploadToServer(config.endpoint, data);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          [config.key]: err instanceof Error ? err.message : "Ошибка загрузки",
        }));
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
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[config.key];
          return newErrors;
        });

        const jsonFiles = Array.from(files).filter((f) => f.name.endsWith(".json"));
        
        if (jsonFiles.length === 0) {
          setErrors((prev) => ({
            ...prev,
            [config.key]: "В папке не найдены JSON файлы",
          }));
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
          setErrors((prev) => ({
            ...prev,
            [config.key]: "Не удалось загрузить данные из папки",
          }));
          return;
        }

        const validation = config.key === "bossList" 
          ? validateBossList(allRecords) 
          : validateBossTeam(allRecords);

        if (!validation.valid) {
          setErrors((prev) => ({
            ...prev,
            [config.key]: validation.errors.join("; "),
          }));
          return;
        }

        await uploadToServer(config.endpoint, allRecords);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
      } catch (err) {
        setLoadingProgress((prev) => ({ ...prev, [config.key]: null }));
        setErrors((prev) => ({
          ...prev,
          [config.key]: err instanceof Error ? err.message : "Ошибка загрузки",
        }));
      } finally {
        setUploadingStatus((prev) => ({ ...prev, [config.key]: false }));
        e.target.value = "";
      }
    },
    [queryClient]
  );

  const handleIconFolderInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      try {
        setUploadingStatus((prev) => ({ ...prev, icons: true }));
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.icons;
          return newErrors;
        });

        const imageFiles = Array.from(files).filter((f) => 
          f.type.startsWith("image/") || 
          f.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)
        );
        
        if (imageFiles.length === 0) {
          setErrors((prev) => ({
            ...prev,
            icons: "В папке не найдены изображения",
          }));
          return;
        }

        setIconLoadingProgress({ current: 0, total: imageFiles.length });

        const icons: Array<{ heroId: number; iconUrl: string }> = [];
        
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const matches = baseName.match(/\d+/g);
          
          if (matches && matches.length > 0) {
            const heroId = parseInt(matches[matches.length - 1], 10);
            
            // Convert to base64 for storage
            const buffer = await file.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            const mimeType = file.type || 'image/png';
            const iconUrl = `data:${mimeType};base64,${base64}`;
            
            icons.push({ heroId, iconUrl });
          }

          if ((i + 1) % 50 === 0 || i === imageFiles.length - 1) {
            setIconLoadingProgress({ current: i + 1, total: imageFiles.length });
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        setIconLoadingProgress(null);

        if (icons.length === 0) {
          setErrors((prev) => ({
            ...prev,
            icons: "Не удалось извлечь ID из имён файлов",
          }));
          return;
        }

        // Upload in batches
        const BATCH_SIZE = 50;
        for (let i = 0; i < icons.length; i += BATCH_SIZE) {
          const batch = icons.slice(i, i + BATCH_SIZE);
          await uploadIconsToServer(batch);
        }

        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
      } catch (err) {
        setIconLoadingProgress(null);
        setErrors((prev) => ({
          ...prev,
          icons: err instanceof Error ? err.message : "Ошибка загрузки иконок",
        }));
      } finally {
        setUploadingStatus((prev) => ({ ...prev, icons: false }));
        e.target.value = "";
      }
    },
    [queryClient]
  );

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
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.bossList}</p>
                  <p className="text-xs text-muted-foreground">Боёв</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.bossTeam}</p>
                  <p className="text-xs text-muted-foreground">Записей команд</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.heroIcons}</p>
                  <p className="text-xs text-muted-foreground">Иконок</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          ({stats?.[config.key]} записей)
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
                        <span>Загрузка файлов...</span>
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

        {/* Upload Icons */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Image className="h-5 w-5 text-primary" />
              Загрузка иконок
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border rounded-md p-4 transition-all ${
                (stats?.heroIcons ?? 0) > 0
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">Иконки персонажей</span>
                {(stats?.heroIcons ?? 0) > 0 && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">
                      ({stats?.heroIcons} иконок)
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Загрузите папку с иконками (PNG, JPG, WebP). ID извлекается из имени файла.
              </p>

              <input
                type="file"
                ref={iconFolderRef}
                className="hidden"
                onChange={handleIconFolderInput}
                disabled={uploadingStatus.icons}
                data-testid="input-icons-folder"
                {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
              />
              <Button
                size="sm"
                variant="default"
                onClick={() => iconFolderRef.current?.click()}
                disabled={uploadingStatus.icons}
                data-testid="button-icons-folder"
              >
                {uploadingStatus.icons ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <FolderOpen className="h-3 w-3 mr-1" />
                )}
                Выбрать папку
              </Button>

              {iconLoadingProgress && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Обработка изображений...</span>
                    <span>{iconLoadingProgress.current} / {iconLoadingProgress.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${(iconLoadingProgress.current / iconLoadingProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {errors.icons && (
                <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span>{errors.icons}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Данные сохраняются на сервере и будут доступны всем пользователям.
        </p>
      </div>
    </div>
  );
}
