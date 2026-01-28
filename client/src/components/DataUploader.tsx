import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileJson, CheckCircle2, AlertCircle, AlertTriangle, X, FolderOpen } from "lucide-react";
import {
  parseCSV,
  parseJSON,
  validateBossList,
  validateBossTeam,
  validateHeroInfo,
  type ValidationResult,
} from "@/lib/battleUtils";

interface DataUploaderProps {
  onDataLoaded: (
    type: "bossList" | "bossTeam" | "bossLevel" | "heroInfo",
    data: Record<string, unknown>[]
  ) => void;
  loadedStatus: {
    bossList: boolean;
    bossTeam: boolean;
    bossLevel: boolean;
    heroInfo: boolean;
  };
  loadedCounts: {
    bossList: number;
    bossTeam: number;
    bossLevel: number;
    heroInfo: number;
  };
}

interface TableConfig {
  key: "bossList" | "bossTeam" | "bossLevel" | "heroInfo";
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
  {
    key: "heroInfo",
    title: "Hero Info",
    description: "Таблица имён и иконок героев",
  },
];

export function DataUploader({ onDataLoaded, loadedStatus, loadedCounts }: DataUploaderProps) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string[]>>({});
  const folderInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const validateData = (
    tableKey: "bossList" | "bossTeam" | "bossLevel" | "heroInfo",
    data: Record<string, unknown>[]
  ): ValidationResult => {
    switch (tableKey) {
      case "bossList":
        return validateBossList(data);
      case "bossTeam":
        return validateBossTeam(data);
      case "heroInfo":
        return validateHeroInfo(data);
      default:
        return { valid: true, errors: [], warnings: [] };
    }
  };

  const handleFile = useCallback(
    async (file: File, tableKey: "bossList" | "bossTeam" | "bossLevel" | "heroInfo") => {
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
    (e: React.DragEvent, tableKey: "bossList" | "bossTeam" | "bossLevel" | "heroInfo") => {
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
    (e: React.ChangeEvent<HTMLInputElement>, tableKey: "bossList" | "bossTeam" | "bossLevel" | "heroInfo") => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file, tableKey);
      }
      e.target.value = "";
    },
    [handleFile]
  );

  const handleFolderInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, tableKey: "bossList" | "bossTeam" | "bossLevel" | "heroInfo") => {
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

        const allRecords: Record<string, unknown>[] = [];
        
        for (const file of jsonFiles) {
          try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            
            if (Array.isArray(parsed)) {
              allRecords.push(...parsed);
            } else if (typeof parsed === "object" && parsed !== null) {
              allRecords.push(parsed);
            }
          } catch {
            console.warn(`Ошибка парсинга файла ${file.name}`);
          }
        }

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
        setErrors((prev) => ({
          ...prev,
          [tableKey]: "Ошибка чтения папки",
        }));
      }
      
      e.target.value = "";
    },
    [onDataLoaded]
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
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{table.title}</span>
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
                </div>
                <div className="flex gap-1">
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

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Загрузите файл (CSV/JSON) или папку с отдельными JSON-файлами для каждой записи.
          <br />
          <span className="text-primary">Boss List</span> и <span className="text-primary">Boss Team</span> обязательны.
        </p>
      </CardContent>
    </Card>
  );
}
