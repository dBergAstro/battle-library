import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileJson, CheckCircle2, AlertCircle, AlertTriangle, X, FolderOpen, FileText, Image } from "lucide-react";
import {
  parseCSV,
  parseJSON,
  validateBossList,
  validateBossTeam,
  type ValidationResult,
} from "@/lib/battleUtils";

interface DataUploaderProps {
  onDataLoaded: (
    type: "bossList" | "bossTeam" | "bossLevel",
    data: Record<string, unknown>[]
  ) => void;
  onIconsLoaded: (icons: Map<number, string>) => void;
  loadedStatus: {
    bossList: boolean;
    bossTeam: boolean;
    bossLevel: boolean;
    heroIcons: boolean;
  };
  loadedCounts: {
    bossList: number;
    bossTeam: number;
    bossLevel: number;
    heroIcons: number;
  };
}

interface TableConfig {
  key: "bossList" | "bossTeam" | "bossLevel";
  title: string;
  description: string;
}

const tables: TableConfig[] = [
  {
    key: "bossList",
    title: "Boss List",
    description: "invasion_boss_list-boss_list",
  },
  {
    key: "bossTeam",
    title: "Boss Team",
    description: "invasion_boss_list-boss_team",
  },
  {
    key: "bossLevel",
    title: "Boss Level",
    description: "invasion_boss_list-boss_level",
  },
];

interface IconFolderConfig {
  key: string;
  title: string;
  description: string;
}

const iconFolders: IconFolderConfig[] = [
  { key: "heroes", title: "Герои", description: "Иконки героев (id 1-99)" },
  { key: "creeps", title: "Крипы", description: "Иконки крипов (id 1000-3999)" },
  { key: "titans", title: "Титаны", description: "Иконки титанов (id 4000+)" },
];

export function DataUploader({ onDataLoaded, onIconsLoaded, loadedStatus, loadedCounts }: DataUploaderProps) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string[]>>({});
  const [schemas, setSchemas] = useState<Record<string, Record<string, unknown>>>({});
  const [iconCounts, setIconCounts] = useState<Record<string, number>>({});
  const [loadingProgress, setLoadingProgress] = useState<Record<string, { current: number; total: number } | null>>({});
  const folderInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const schemaInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const iconFolderInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const validateData = (
    tableKey: "bossList" | "bossTeam" | "bossLevel",
    data: Record<string, unknown>[]
  ): ValidationResult => {
    switch (tableKey) {
      case "bossList":
        return validateBossList(data);
      case "bossTeam":
        return validateBossTeam(data);
      default:
        return { valid: true, errors: [], warnings: [] };
    }
  };

  const handleFile = useCallback(
    async (file: File, tableKey: "bossList" | "bossTeam" | "bossLevel") => {
      try {
        const text = await file.text();
        let data: Record<string, unknown>[];

        if (file.name.endsWith(".json")) {
          data = parseJSON(text);
        } else if (file.name.endsWith(".csv")) {
          data = parseCSV(text);
        } else {
          setErrors((prev) => ({
            ...prev,
            [tableKey]: "Поддерживаются только CSV и JSON файлы",
          }));
          return;
        }

        if (data.length === 0) {
          setErrors((prev) => ({
            ...prev,
            [tableKey]: "Файл пустой или имеет неверный формат",
          }));
          return;
        }

        const validation = validateData(tableKey, data);

        if (!validation.valid) {
          setErrors((prev) => ({
            ...prev,
            [tableKey]: validation.errors.join("; "),
          }));
          return;
        }

        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[tableKey];
          return newErrors;
        });

        if (validation.warnings.length > 0) {
          setWarnings((prev) => ({
            ...prev,
            [tableKey]: validation.warnings,
          }));
        } else {
          setWarnings((prev) => {
            const newWarnings = { ...prev };
            delete newWarnings[tableKey];
            return newWarnings;
          });
        }

        onDataLoaded(tableKey, data);
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          [tableKey]: "Ошибка чтения файла",
        }));
      }
    },
    [onDataLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, tableKey: "bossList" | "bossTeam" | "bossLevel") => {
      e.preventDefault();
      setDragOver(null);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file, tableKey);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, tableKey: "bossList" | "bossTeam" | "bossLevel") => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file, tableKey);
      }
      e.target.value = "";
    },
    [handleFile]
  );

  const handleSchemaInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, tableKey: "bossList" | "bossTeam" | "bossLevel") => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (typeof parsed === "object" && parsed !== null && "columns" in parsed) {
          setSchemas((prev) => ({
            ...prev,
            [tableKey]: parsed,
          }));
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[tableKey];
            return newErrors;
          });
        } else {
          setErrors((prev) => ({
            ...prev,
            [tableKey]: "Файл не содержит описание структуры (columns)",
          }));
        }
      } catch {
        setErrors((prev) => ({
          ...prev,
          [tableKey]: "Ошибка чтения файла структуры",
        }));
      }

      e.target.value = "";
    },
    []
  );

  const handleFolderInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, tableKey: "bossList" | "bossTeam" | "bossLevel") => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      try {
        const jsonFiles = Array.from(files).filter((f) => f.name.endsWith(".json"));
        
        if (jsonFiles.length === 0) {
          setErrors((prev) => ({
            ...prev,
            [tableKey]: "В папке не найдены JSON файлы",
          }));
          return;
        }

        const total = jsonFiles.length;
        setLoadingProgress((prev) => ({ ...prev, [tableKey]: { current: 0, total } }));

        const allRecords: Record<string, unknown>[] = [];
        const BATCH_SIZE = 50;
        
        for (let i = 0; i < jsonFiles.length; i += BATCH_SIZE) {
          const batch = jsonFiles.slice(i, i + BATCH_SIZE);
          
          const batchResults = await Promise.all(
            batch.map(async (file) => {
              try {
                const text = await file.text();
                const parsed = JSON.parse(text);
                return parsed;
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
            [tableKey]: { current: Math.min(i + BATCH_SIZE, total), total },
          }));

          // Даём UI обновиться
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        setLoadingProgress((prev) => ({ ...prev, [tableKey]: null }));

        if (allRecords.length === 0) {
          setErrors((prev) => ({
            ...prev,
            [tableKey]: "Не удалось загрузить данные из папки",
          }));
          return;
        }

        const validation = validateData(tableKey, allRecords);

        if (!validation.valid) {
          setErrors((prev) => ({
            ...prev,
            [tableKey]: validation.errors.join("; "),
          }));
          return;
        }

        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[tableKey];
          return newErrors;
        });

        if (validation.warnings.length > 0) {
          setWarnings((prev) => ({
            ...prev,
            [tableKey]: validation.warnings,
          }));
        } else {
          setWarnings((prev) => {
            const newWarnings = { ...prev };
            delete newWarnings[tableKey];
            return newWarnings;
          });
        }

        onDataLoaded(tableKey, allRecords);
      } catch (err) {
        setLoadingProgress((prev) => ({ ...prev, [tableKey]: null }));
        setErrors((prev) => ({
          ...prev,
          [tableKey]: "Ошибка чтения папки",
        }));
      }
      
      e.target.value = "";
    },
    [onDataLoaded]
  );

  const handleIconFolderInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, folderKey: string) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      try {
        const imageFiles = Array.from(files).filter((f) => 
          f.type.startsWith("image/") || 
          f.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)
        );
        
        if (imageFiles.length === 0) {
          setErrors((prev) => ({
            ...prev,
            [`icons_${folderKey}`]: "В папке не найдены изображения",
          }));
          return;
        }

        const icons = new Map<number, string>();
        
        for (const file of imageFiles) {
          // Извлекаем последнее число из имени файла (например titan_big_4003 -> 4003)
          const baseName = file.name.replace(/\.[^.]+$/, ""); // убираем расширение
          const matches = baseName.match(/\d+/g);
          if (matches && matches.length > 0) {
            const heroId = parseInt(matches[matches.length - 1], 10);
            const url = URL.createObjectURL(file);
            icons.set(heroId, url);
          }
        }

        if (icons.size === 0) {
          setErrors((prev) => ({
            ...prev,
            [`icons_${folderKey}`]: "Не удалось извлечь ID из имён файлов",
          }));
          return;
        }

        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[`icons_${folderKey}`];
          return newErrors;
        });

        setIconCounts((prev) => ({
          ...prev,
          [folderKey]: icons.size,
        }));

        onIconsLoaded(icons);
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          [`icons_${folderKey}`]: "Ошибка чтения папки с иконками",
        }));
      }
      
      e.target.value = "";
    },
    [onIconsLoaded]
  );

  const requiredLoaded = loadedStatus.bossList && loadedStatus.bossTeam;

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileJson className="h-5 w-5 text-primary" />
            Загрузка данных
          </CardTitle>
          {requiredLoaded && (
            <Badge variant="default" className="bg-green-600 hover:bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Основные данные загружены
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tables.map((table) => (
            <div
              key={table.key}
              className={`relative border rounded-md p-4 transition-all ${
                dragOver === table.key
                  ? "border-primary bg-primary/5"
                  : loadedStatus[table.key]
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(table.key);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, table.key)}
              data-testid={`dropzone-${table.key}`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm">{table.title}</span>
                  {schemas[table.key] && (
                    <Badge variant="outline" className="text-xs py-0">
                      <FileText className="h-3 w-3 mr-1" />
                      Структура
                    </Badge>
                  )}
                  {loadedStatus[table.key] && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        ({loadedCounts[table.key]} записей)
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {table.description}
                </p>
                <div className="flex gap-1 flex-wrap mt-1">
                  <input
                    type="file"
                    accept=".json"
                    ref={(el) => (schemaInputRefs.current[table.key] = el)}
                    className="hidden"
                    onChange={(e) => handleSchemaInput(e, table.key)}
                    data-testid={`input-schema-${table.key}`}
                  />
                  <Button
                    size="sm"
                    variant={schemas[table.key] ? "secondary" : "outline"}
                    className="cursor-pointer"
                    onClick={() => schemaInputRefs.current[table.key]?.click()}
                    data-testid={`button-schema-${table.key}`}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Структура
                  </Button>
                  <label>
                    <input
                      type="file"
                      accept=".csv,.json"
                      className="hidden"
                      onChange={(e) => handleFileInput(e, table.key)}
                      data-testid={`input-file-${table.key}`}
                    />
                    <Button
                      size="sm"
                      variant={loadedStatus[table.key] ? "secondary" : "default"}
                      className="cursor-pointer"
                      asChild
                    >
                      <span>
                        <Upload className="h-3 w-3 mr-1" />
                        Файл
                      </span>
                    </Button>
                  </label>
                  <input
                    type="file"
                    ref={(el) => (folderInputRefs.current[table.key] = el)}
                    className="hidden"
                    onChange={(e) => handleFolderInput(e, table.key)}
                    data-testid={`input-folder-${table.key}`}
                    {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => folderInputRefs.current[table.key]?.click()}
                    data-testid={`button-folder-${table.key}`}
                  >
                    <FolderOpen className="h-3 w-3 mr-1" />
                    Папка
                  </Button>
                </div>
              </div>

              {loadingProgress[table.key] && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Загрузка файлов...</span>
                    <span>{loadingProgress[table.key]!.current} / {loadingProgress[table.key]!.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${(loadingProgress[table.key]!.current / loadingProgress[table.key]!.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {errors[table.key] && (
                <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span className="flex-1">{errors[table.key]}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-4 w-4 flex-shrink-0"
                    onClick={() =>
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors[table.key];
                        return newErrors;
                      })
                    }
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {warnings[table.key] && warnings[table.key].length > 0 && (
                <div className="mt-2 space-y-1">
                  {warnings[table.key].map((warning, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" />
            Иконки персонажей
            {loadedStatus.heroIcons && (
              <span className="text-xs text-muted-foreground font-normal">
                ({loadedCounts.heroIcons} загружено)
              </span>
            )}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {iconFolders.map((folder) => (
              <div
                key={folder.key}
                className={`relative border rounded-md p-3 transition-all ${
                  iconCounts[folder.key]
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{folder.title}</span>
                      {iconCounts[folder.key] && (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">
                            ({iconCounts[folder.key]})
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{folder.description}</p>
                  </div>
                  <input
                    type="file"
                    ref={(el) => (iconFolderInputRefs.current[folder.key] = el)}
                    className="hidden"
                    onChange={(e) => handleIconFolderInput(e, folder.key)}
                    data-testid={`input-icons-${folder.key}`}
                    {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                  />
                  <Button
                    size="sm"
                    variant={iconCounts[folder.key] ? "secondary" : "outline"}
                    className="cursor-pointer"
                    onClick={() => iconFolderInputRefs.current[folder.key]?.click()}
                    data-testid={`button-icons-${folder.key}`}
                  >
                    <FolderOpen className="h-3 w-3 mr-1" />
                    Папка
                  </Button>
                </div>

                {errors[`icons_${folder.key}`] && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    <span className="flex-1">{errors[`icons_${folder.key}`]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          <span className="text-primary">Boss List</span> и <span className="text-primary">Boss Team</span> обязательны. 
          Имена героев встроены. Иконки загружаются из папок по ID в имени файла.
        </p>
      </CardContent>
    </Card>
  );
}
