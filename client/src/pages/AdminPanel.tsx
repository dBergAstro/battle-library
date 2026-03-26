import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowUpDown,
  Flame,
  Search,
  Eye,
  Swords,
  Settings,
  Dog,
  Sparkles,
  ScrollText,
  RefreshCw,
  Trash2
} from "lucide-react";
import {
  parseCSV,
  parseJSON,
  validateBossList,
  validateBossTeam,
  validateBossLevel,
  parseHeroNamesText,
  parseSortOrderText,
  parseTitanElementsText,
} from "@/lib/battleUtils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EntityViewer } from "@/components/EntityViewer";
import { subscribe as subscribeToLogs, getEntries, clearEntries, type LogEntry as ClientLogEntry } from "@/lib/gasLogger";
import { gasApi } from "@/lib/gasApi";

interface StatsResponse {
  bossList: number;
  bossTeam: number;
  bossLevel: number;
  heroIcons: number;
  heroNames: number;
  heroSortOrder: number;
  titanElements: number;
  attackTeams: number;
  heroicReplays: number;
  titanicReplays: number;
  petIcons: number;
  talismans: number;
  mainBuffNameA: string | null;
  mainBuffEffectKeyA: string | null;
  mainBuffNameB: string | null;
  mainBuffEffectKeyB: string | null;
  lastUpdated?: {
    bossList?: string | null;
    bossTeam?: string | null;
    bossLevel?: string | null;
    heroIcons?: string | null;
    heroNames?: string | null;
    heroSortOrder?: string | null;
    titanElements?: string | null;
    attackTeams?: string | null;
    petIcons?: string | null;
    talismans?: string | null;
    talismanIcons?: string | null;
    spiritSkills?: string | null;
    spiritIcons?: string | null;
  };
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
  { key: "heroes", title: "Герои", description: "Иконки героев (id 1-99)", category: "hero" },
  { key: "creeps", title: "Крипы", description: "Иконки крипов (id 1000-3999)", category: "creep" },
  { key: "titans", title: "Титаны", description: "Иконки титанов (id 4000+)", category: "titan" },
];

function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingStatus, setUploadingStatus] = useState<Record<string, boolean>>({});
  const [loadingProgress, setLoadingProgress] = useState<Record<string, { current: number; total: number } | null>>({});
  const [serverUploadStatus, setServerUploadStatus] = useState<Record<string, boolean>>({});
  const [iconLoadingProgress, setIconLoadingProgress] = useState<Record<string, { phase: "reading" | "uploading"; current: number; total: number } | null>>({});
  const folderInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const iconFolderRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  // Hero names editing
  const [heroNamesText, setHeroNamesText] = useState("");
  const [heroNamesUploading, setHeroNamesUploading] = useState(false);

  // Sort order input
  const [sortOrderText, setSortOrderText] = useState("");
  const [sortOrderUploading, setSortOrderUploading] = useState(false);

  // Titan elements input
  const [titanElementsText, setTitanElementsText] = useState("");
  const [titanElementsUploading, setTitanElementsUploading] = useState(false);

  // Attack teams (replays) input
  const [attackTeamsUploading, setAttackTeamsUploading] = useState(false);
  const attackTeamsInputRef = useRef<HTMLInputElement | null>(null);

  // Pet icons input
  const petIconsInputRef = useRef<HTMLInputElement | null>(null);

  // Main buff settings (A and B)
  const [mainBuffNameA, setMainBuffNameA] = useState("");
  const [mainBuffEffectKeyA, setMainBuffEffectKeyA] = useState("");
  const [mainBuffSavingA, setMainBuffSavingA] = useState(false);
  const [mainBuffNameB, setMainBuffNameB] = useState("");
  const [mainBuffEffectKeyB, setMainBuffEffectKeyB] = useState("");
  const [mainBuffSavingB, setMainBuffSavingB] = useState(false);

  // Talismans settings
  const [talismansText, setTalismansText] = useState("");
  const [talismansSaving, setTalismansSaving] = useState(false);
  const talismanIconsInputRef = useRef<HTMLInputElement | null>(null);
  const [talismanIconsUploading, setTalismanIconsUploading] = useState(false);

  // Spirit skills (totem skills) settings
  const [spiritSkillsText, setSpiritSkillsText] = useState("");
  const [spiritSkillsSaving, setSpiritSkillsSaving] = useState(false);
  const spiritIconsInputRef = useRef<HTMLInputElement | null>(null);
  const [spiritIconsUploading, setSpiritIconsUploading] = useState(false);

  const [heroSearchQuery, setHeroSearchQuery] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 60000,
  });

  interface HeroData {
    heroId: number;
    name: string;
    icon?: string;
  }

  const { data: battlesData } = useQuery<{
    heroIcons: Array<{ heroId: number; iconUrl: string }>;
    heroNames: Array<{ heroId: number; name: string }>;
    petIcons: Array<{ petId: number; iconUrl: string }>;
    spiritSkills: Array<{ skillId: number; name: string }>;
    spiritIcons: Array<{ skillId: number; iconUrl: string }>;
  }>({
    queryKey: ["/api/battles"],
  });

  const allHeroes = useMemo<HeroData[]>(() => {
    if (!battlesData) return [];
    
    const iconMap = new Map(battlesData.heroIcons.map((h) => [h.heroId, h.iconUrl]));
    const nameMap = new Map(battlesData.heroNames.map((h) => [h.heroId, h.name]));
    
    // Get all unique hero IDs from both icons and names
    const allIds = new Set<number>();
    battlesData.heroIcons.forEach((h) => allIds.add(h.heroId));
    battlesData.heroNames.forEach((h) => allIds.add(h.heroId));
    
    return Array.from(allIds)
      .map((heroId) => ({
        heroId,
        name: nameMap.get(heroId) || `ID ${heroId}`,
        icon: iconMap.get(heroId),
      }))
      .sort((a, b) => a.heroId - b.heroId);
  }, [battlesData]);

  const filteredHeroes = useMemo(() => {
    if (!heroSearchQuery) return allHeroes;
    const query = heroSearchQuery.toLowerCase();
    return allHeroes.filter(
      (h) => h.heroId.toString().includes(query) || h.name.toLowerCase().includes(query)
    );
  }, [allHeroes, heroSearchQuery]);

  // Питомцы - используем имена из heroNames (там уже есть питомцы с ID 6000+)
  const allPets = useMemo(() => {
    if (!battlesData) return [];
    const petIconMap = new Map(battlesData.petIcons?.map((p) => [p.petId, p.iconUrl]) || []);
    const nameMap = new Map(battlesData.heroNames.map((h) => [h.heroId, h.name]));
    
    // Собираем все ID питомцев (из иконок питомцев и из имён 6000-6999)
    const petIds = new Set<number>();
    battlesData.petIcons?.forEach((p) => petIds.add(p.petId));
    battlesData.heroNames.filter(h => h.heroId >= 6000 && h.heroId < 7000).forEach(h => petIds.add(h.heroId));
    
    return Array.from(petIds)
      .map((petId) => ({
        petId,
        name: nameMap.get(petId) || `Питомец ${petId}`,
        icon: petIconMap.get(petId),
      }))
      .sort((a, b) => a.petId - b.petId);
  }, [battlesData]);

  const filteredPets = useMemo(() => {
    if (!heroSearchQuery) return allPets;
    const query = heroSearchQuery.toLowerCase();
    return allPets.filter(
      (p) => p.petId.toString().includes(query) || p.name.toLowerCase().includes(query)
    );
  }, [allPets, heroSearchQuery]);

  // Тотемные скилы
  const allSpiritSkills = useMemo(() => {
    if (!battlesData) return [];
    const iconMap = new Map(battlesData.spiritIcons?.map((s) => [s.skillId, s.iconUrl]) || []);
    const nameMap = new Map(battlesData.spiritSkills?.map((s) => [s.skillId, s.name]) || []);
    
    // Собираем все ID скилов
    const skillIds = new Set<number>();
    battlesData.spiritIcons?.forEach((s) => skillIds.add(s.skillId));
    battlesData.spiritSkills?.forEach((s) => skillIds.add(s.skillId));
    
    return Array.from(skillIds)
      .map((skillId) => ({
        skillId,
        name: nameMap.get(skillId) || `Скилл ${skillId}`,
        icon: iconMap.get(skillId),
      }))
      .sort((a, b) => a.skillId - b.skillId);
  }, [battlesData]);

  const filteredSpiritSkills = useMemo(() => {
    if (!heroSearchQuery) return allSpiritSkills;
    const query = heroSearchQuery.toLowerCase();
    return allSpiritSkills.filter(
      (s) => s.skillId.toString().includes(query) || s.name.toLowerCase().includes(query)
    );
  }, [allSpiritSkills, heroSearchQuery]);

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

        setServerUploadStatus((prev) => ({ ...prev, [config.key]: true }));
        const result = await uploadToServer(config.endpoint, data);
        setServerUploadStatus((prev) => ({ ...prev, [config.key]: false }));
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
        toast({ title: `${config.title} загружен`, description: `Записей: ${result?.count ?? data.length}` });
      } catch (err) {
        setServerUploadStatus((prev) => ({ ...prev, [config.key]: false }));
        const msg = err instanceof Error ? err.message : "Ошибка загрузки";
        setErrors((prev) => ({ ...prev, [config.key]: msg }));
        toast({ title: "Ошибка загрузки", description: msg, variant: "destructive" });
      } finally {
        setUploadingStatus((prev) => ({ ...prev, [config.key]: false }));
        e.target.value = "";
      }
    },
    [queryClient, toast]
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

        setServerUploadStatus((prev) => ({ ...prev, [config.key]: true }));
        const result = await uploadToServer(config.endpoint, allRecords);
        setServerUploadStatus((prev) => ({ ...prev, [config.key]: false }));
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
        toast({ title: `${config.title} загружен`, description: `Записей: ${result?.count ?? allRecords.length}` });
      } catch (err) {
        setLoadingProgress((prev) => ({ ...prev, [config.key]: null }));
        setServerUploadStatus((prev) => ({ ...prev, [config.key]: false }));
        const msg = err instanceof Error ? err.message : "Ошибка загрузки";
        setErrors((prev) => ({ ...prev, [config.key]: msg }));
        toast({ title: "Ошибка загрузки", description: msg, variant: "destructive" });
      } finally {
        setUploadingStatus((prev) => ({ ...prev, [config.key]: false }));
        e.target.value = "";
      }
    },
    [queryClient, toast]
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

        // Build set of IDs that already have icons — skip them
        const existingIconIds = new Set<number>(
          (battlesData?.heroIcons ?? []).map((h) => h.heroId)
        );

        // Phase 1: reading files from disk
        setIconLoadingProgress((prev) => ({ ...prev, [config.key]: { phase: "reading", current: 0, total: imageFiles.length } }));

        const icons: Array<{ heroId: number; iconUrl: string; category: string }> = [];
        let skipped = 0;
        
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const matches = baseName.match(/\d+/g);
          
          if (matches && matches.length > 0) {
            const heroId = parseInt(matches[matches.length - 1], 10);

            if (existingIconIds.has(heroId)) {
              skipped++;
            } else {
              const buffer = await file.arrayBuffer();
              const base64 = btoa(
                new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
              );
              const mimeType = file.type || 'image/png';
              const iconUrl = `data:${mimeType};base64,${base64}`;
              icons.push({ heroId, iconUrl, category: config.category });
            }
          }

          setIconLoadingProgress((prev) => ({ ...prev, [config.key]: { phase: "reading", current: i + 1, total: imageFiles.length } }));
          if ((i + 1) % 20 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
        }

        if (icons.length === 0) {
          setIconLoadingProgress((prev) => ({ ...prev, [config.key]: null }));
          const msg = skipped > 0
            ? `Все ${skipped} иконок уже загружены — пропущено`
            : "Не удалось извлечь ID из имён файлов";
          setErrors((prev) => ({ ...prev, [folderKey]: msg }));
          return;
        }

        // Phase 2: upload 1 icon at a time so progress bar updates every step
        setIconLoadingProgress((prev) => ({ ...prev, [config.key]: { phase: "uploading", current: 0, total: icons.length } }));
        for (let i = 0; i < icons.length; i++) {
          await apiRequest("POST", `/api/admin/${config.category}-icons`, [icons[i]]);
          setIconLoadingProgress((prev) => ({
            ...prev,
            [config.key]: { phase: "uploading", current: i + 1, total: icons.length },
          }));
        }

        setIconLoadingProgress((prev) => ({ ...prev, [config.key]: null }));
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
        if (skipped > 0) {
          toast({ title: "Иконки загружены", description: `Загружено: ${icons.length}, пропущено (уже есть): ${skipped}` });
        }
      } catch (err) {
        setIconLoadingProgress((prev) => ({ ...prev, [config.key]: null }));
        setErrors((prev) => ({ ...prev, [folderKey]: err instanceof Error ? err.message : "Ошибка загрузки иконок" }));
      } finally {
        setUploadingStatus((prev) => ({ ...prev, [folderKey]: false }));
        e.target.value = "";
      }
    },
    [queryClient, battlesData]
  );

  const handleSaveHeroNames = async () => {
    const trimmed = heroNamesText.trim();
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, heroNames: "Введите данные имён персонажей" }));
      return;
    }

    const parsed = parseHeroNamesText(trimmed);
    if (parsed.length === 0) {
      setErrors((prev) => ({ ...prev, heroNames: "Не удалось распознать данные. Формат: ID имя" }));
      return;
    }

    setHeroNamesUploading(true);
    setErrors((prev) => { const n = { ...prev }; delete n.heroNames; return n; });

    try {
      await apiRequest("POST", "/api/admin/hero-names", parsed);
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
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Панель администратора</h1>
              <p className="text-sm text-muted-foreground">
                Загрузка данных для библиотеки боёв
              </p>
            </div>
          </div>
          {typeof __GAS_BUILD_TIME__ !== "undefined" && (
            <div className="text-[10px] font-mono text-muted-foreground/50 bg-muted/40 border border-border/40 rounded px-2 py-1 leading-tight text-right" title="Время сборки GAS-версии">
              <span className="text-muted-foreground/70">GAS build</span><br/>
              {new Date(__GAS_BUILD_TIME__).toLocaleString("ru-RU", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit" })}
            </div>
          )}
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
                  <p className="text-xs text-muted-foreground mb-1">
                    {config.description}
                  </p>
                  {fmtDate(stats?.lastUpdated?.[config.key as keyof NonNullable<StatsResponse['lastUpdated']>]) && (
                    <p className="text-[11px] text-muted-foreground/50 mb-2">
                      Обновлено: {fmtDate(stats?.lastUpdated?.[config.key as keyof NonNullable<StatsResponse['lastUpdated']>])}
                    </p>
                  )}
                  {!fmtDate(stats?.lastUpdated?.[config.key as keyof NonNullable<StatsResponse['lastUpdated']>]) && <div className="mb-3" />}

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
                        <span>Чтение файлов...</span>
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

                  {serverUploadStatus[config.key] && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      <span>Отправка данных на сервер...</span>
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
                    <p className="text-xs text-muted-foreground mb-1">
                      {config.description}
                    </p>
                    {fmtDate(stats?.lastUpdated?.heroIcons) && (
                      <p className="text-[11px] text-muted-foreground/50 mb-2">
                        Обновлено: {fmtDate(stats?.lastUpdated?.heroIcons)}
                      </p>
                    )}
                    {!fmtDate(stats?.lastUpdated?.heroIcons) && <div className="mb-3" />}

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

                    {iconLoadingProgress[config.key] && (() => {
                      const prog = iconLoadingProgress[config.key]!;
                      const pct = prog.total > 0 ? Math.round((prog.current / prog.total) * 100) : 0;
                      return (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>
                              {prog.phase === "reading" ? "Чтение файлов..." : "Отправка в GAS..."}
                            </span>
                            <span className="font-mono">{prog.current} / {prog.total} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${prog.phase === "reading" ? "bg-blue-500" : "bg-primary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {prog.phase === "reading"
                              ? "Считываем файлы с диска..."
                              : `Иконка ${prog.current} из ${prog.total} — ждём ответа GAS...`}
                          </p>
                        </div>
                      );
                    })()}

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
              Добавьте или обновите имена персонажей. Формат: ID[tab]имя на каждой строке. Имена из базы имеют приоритет над встроенными.
            </p>
            <Textarea
              placeholder={`1\tАврора\n2\tГалахад\n3\tКира\n4000\tСигурд`}
              value={heroNamesText}
              onChange={(e) => setHeroNamesText(e.target.value)}
              className="min-h-[200px] font-mono text-sm mb-3"
              data-testid="textarea-hero-names"
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveHeroNames}
                disabled={heroNamesUploading}
                data-testid="button-save-hero-names"
              >
                {heroNamesUploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Сохранить имена
              </Button>
              {(stats?.heroNames ?? 0) > 0 && (
                <Badge variant="secondary">
                  Загружено: {stats?.heroNames} имён
                </Badge>
              )}
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

        {/* Entity Viewer - Unified viewer for all entities with icon upload */}
        {battlesData && (
          <EntityViewer
            heroIcons={battlesData.heroIcons}
            heroNames={battlesData.heroNames}
            petIcons={battlesData.petIcons || []}
            spiritSkills={battlesData.spiritSkills || []}
            spiritIcons={battlesData.spiritIcons || []}
            talismans={battlesData.talismans || []}
          />
        )}

        {/* Attack Teams (Replays) Upload */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Swords className="h-5 w-5 text-primary" />
              Записи (Replays)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Загрузите таблицу invasion_testAttackTeams (папка с JSON файлами)
            </p>
            {fmtDate(stats?.lastUpdated?.attackTeams) && (
              <p className="text-[11px] text-muted-foreground/50">
                Обновлено: {fmtDate(stats?.lastUpdated?.attackTeams)}
              </p>
            )}
            <input
              type="file"
              ref={attackTeamsInputRef}
              className="hidden"
              {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
              onChange={async (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                
                setAttackTeamsUploading(true);
                setErrors((prev) => ({ ...prev, attackTeams: "" }));
                
                try {
                  let allData: Record<string, unknown>[] = [];
                  const jsonFiles = Array.from(files).filter(f => f.name.endsWith('.json'));
                  const total = jsonFiles.length;

                  setLoadingProgress((prev) => ({ ...prev, attackTeams: { current: 0, total } }));

                  for (let i = 0; i < jsonFiles.length; i++) {
                    const file = jsonFiles[i];
                    const text = await file.text();
                    const parsed = parseJSON(text);
                    const dataRows = parsed.filter((row) => !("columns" in row) && !("table" in row));
                    allData = allData.concat(dataRows);
                    setLoadingProgress((prev) => ({ ...prev, attackTeams: { current: i + 1, total } }));
                  }

                  setLoadingProgress((prev) => ({ ...prev, attackTeams: null }));
                  
                  if (allData.length === 0) {
                    throw new Error("Нет данных для загрузки (JSON файлы не найдены)");
                  }
                  
                  setServerUploadStatus((prev) => ({ ...prev, attackTeams: true }));
                  await uploadToServer("/api/admin/attack-teams", allData);
                  setServerUploadStatus((prev) => ({ ...prev, attackTeams: false }));
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
                  toast({ title: "Записи загружены", description: `Записей: ${allData.length}` });
                } catch (error) {
                  setLoadingProgress((prev) => ({ ...prev, attackTeams: null }));
                  setServerUploadStatus((prev) => ({ ...prev, attackTeams: false }));
                  setErrors((prev) => ({ 
                    ...prev, 
                    attackTeams: error instanceof Error ? error.message : "Ошибка загрузки" 
                  }));
                } finally {
                  setAttackTeamsUploading(false);
                  if (attackTeamsInputRef.current) {
                    attackTeamsInputRef.current.value = "";
                  }
                }
              }}
              data-testid="input-attack-teams"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => attackTeamsInputRef.current?.click()}
                disabled={attackTeamsUploading}
                data-testid="button-upload-attack-teams"
              >
                {attackTeamsUploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FolderOpen className="h-4 w-4 mr-1" />
                )}
                Загрузить записи (папка)
              </Button>
              {(stats?.attackTeams ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">
                    Всего: {stats?.attackTeams}
                  </Badge>
                  <Badge variant="outline" className="border-blue-500 text-blue-600">
                    Героических: {stats?.heroicReplays ?? 0}
                  </Badge>
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    Титанических: {stats?.titanicReplays ?? 0}
                  </Badge>
                </div>
              )}
            </div>
            {loadingProgress.attackTeams && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Чтение файлов...
                  </span>
                  <span>{loadingProgress.attackTeams.current} / {loadingProgress.attackTeams.total}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-200"
                    style={{ width: `${(loadingProgress.attackTeams.current / loadingProgress.attackTeams.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            {serverUploadStatus.attackTeams && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                Отправка данных на сервер...
              </div>
            )}
            {errors.attackTeams && (
              <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{errors.attackTeams}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pet Icons Upload */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Dog className="h-5 w-5 text-primary" />
              Иконки питомцев
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Загрузите папку с иконками питомцев (ID извлекается из имени файла)
            </p>
            {fmtDate(stats?.lastUpdated?.petIcons) && (
              <p className="text-[11px] text-muted-foreground/50">
                Обновлено: {fmtDate(stats?.lastUpdated?.petIcons)}
              </p>
            )}
            <input
              type="file"
              ref={petIconsInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                
                setErrors((prev) => ({ ...prev, petIcons: "" }));
                
                try {
                  const iconData: { petId: number; iconUrl: string }[] = [];
                  
                  for (const file of Array.from(files)) {
                    // Extract ID from filename (e.g., pet_6001.png -> 6001)
                    const match = file.name.match(/(\d+)/);
                    if (!match) continue;
                    
                    const petId = parseInt(match[1], 10);
                    if (isNaN(petId)) continue;
                    
                    // Convert to base64
                    const base64 = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result as string);
                      reader.readAsDataURL(file);
                    });
                    
                    iconData.push({ petId, iconUrl: base64 });
                  }
                  
                  if (iconData.length === 0) {
                    throw new Error("Не удалось извлечь ID питомцев из имён файлов");
                  }
                  
                  await uploadToServer("/api/admin/pet-icons", iconData);
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/replays"] });
                } catch (error) {
                  setErrors((prev) => ({ 
                    ...prev, 
                    petIcons: error instanceof Error ? error.message : "Ошибка загрузки" 
                  }));
                } finally {
                  if (petIconsInputRef.current) {
                    petIconsInputRef.current.value = "";
                  }
                }
              }}
              data-testid="input-pet-icons"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => petIconsInputRef.current?.click()}
                data-testid="button-upload-pet-icons"
              >
                <FolderOpen className="h-4 w-4 mr-1" />
                Загрузить иконки
              </Button>
              {(stats?.petIcons ?? 0) > 0 && (
                <Badge variant="secondary">
                  Загружено: {stats?.petIcons} иконок
                </Badge>
              )}
            </div>
            {errors.petIcons && (
              <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{errors.petIcons}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Buff Settings (A and B) */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5 text-primary" />
              Настройки баффов
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-xs text-muted-foreground">
              Укажите название и ключ эффекта для каждого баффа. Ключ эффекта — это префикс из поля effects в записи (например: allParamsValueIncrease). Каждая запись содержит не более одного баффа из этих двух.
            </p>

            {/* Бафф А */}
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Бафф А</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Название</label>
                  <Input
                    placeholder="Атака"
                    value={mainBuffNameA}
                    onChange={(e) => setMainBuffNameA(e.target.value)}
                    data-testid="input-main-buff-name-a"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Ключ эффекта (префикс)</label>
                  <Input
                    placeholder="allParamsValueIncrease"
                    value={mainBuffEffectKeyA}
                    onChange={(e) => setMainBuffEffectKeyA(e.target.value)}
                    data-testid="input-main-buff-key-a"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!mainBuffNameA.trim()) return;
                    setMainBuffSavingA(true);
                    try {
                      await apiRequest("POST", "/api/admin/settings/main-buff", {
                        name: mainBuffNameA.trim(),
                        effectKey: mainBuffEffectKeyA.trim(),
                        slot: "A",
                      });
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
                    } catch (error) {
                      console.error("Error saving buff A:", error);
                    } finally {
                      setMainBuffSavingA(false);
                    }
                  }}
                  disabled={mainBuffSavingA || !mainBuffNameA.trim()}
                  data-testid="button-save-buff-a"
                >
                  {mainBuffSavingA ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Сохранить бафф А
                </Button>
                {stats?.mainBuffNameA && (
                  <Badge variant="secondary" className="text-xs">
                    Текущий: {stats.mainBuffNameA}
                    {stats.mainBuffEffectKeyA ? ` (${stats.mainBuffEffectKeyA.slice(0, 20)}...)` : ""}
                  </Badge>
                )}
              </div>
            </div>

            {/* Бафф Б */}
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">Бафф Б</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Название</label>
                  <Input
                    placeholder="Защита"
                    value={mainBuffNameB}
                    onChange={(e) => setMainBuffNameB(e.target.value)}
                    data-testid="input-main-buff-name-b"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Ключ эффекта (префикс)</label>
                  <Input
                    placeholder="allParamsDefenseIncrease"
                    value={mainBuffEffectKeyB}
                    onChange={(e) => setMainBuffEffectKeyB(e.target.value)}
                    data-testid="input-main-buff-key-b"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!mainBuffNameB.trim()) return;
                    setMainBuffSavingB(true);
                    try {
                      await apiRequest("POST", "/api/admin/settings/main-buff", {
                        name: mainBuffNameB.trim(),
                        effectKey: mainBuffEffectKeyB.trim(),
                        slot: "B",
                      });
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
                    } catch (error) {
                      console.error("Error saving buff B:", error);
                    } finally {
                      setMainBuffSavingB(false);
                    }
                  }}
                  disabled={mainBuffSavingB || !mainBuffNameB.trim()}
                  data-testid="button-save-buff-b"
                >
                  {mainBuffSavingB ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Сохранить бафф Б
                </Button>
                {stats?.mainBuffNameB && (
                  <Badge variant="secondary" className="text-xs">
                    Текущий: {stats.mainBuffNameB}
                    {stats.mainBuffEffectKeyB ? ` (${stats.mainBuffEffectKeyB.slice(0, 20)}...)` : ""}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Talismans */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-yellow-500" />
              Талисманы
              {stats?.talismans !== undefined && (
                <Badge variant="secondary" className="ml-auto text-xs">{stats.talismans} записей</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Определения талисманов</label>
              {fmtDate(stats?.lastUpdated?.talismans) && (
                <p className="text-[11px] text-muted-foreground/50 mb-1">
                  Обновлено: {fmtDate(stats?.lastUpdated?.talismans)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mb-2">
                Формат: <code className="bg-muted px-1 rounded">ID Название talismanXxx_params Описание эффекта</code> (каждый на новой строке).<br />
                Токен, начинающийся с <code className="bg-muted px-1 rounded">talisman</code>, автоматически определяется как ключ эффекта. Всё до него — название, всё после — описание. Например:<br />
                <code className="bg-muted px-1 rounded text-xs">8002 Талисман вампира talismanLifesteal_100 Герои получают N% вампиризм</code><br />
                <code className="bg-muted px-1 rounded text-xs">8003 Талисман ярости talismanFireRage_1_20 Герои постоянно получают N% урон</code>
              </p>
              <Textarea
                placeholder={"8002 Талисман вампира talismanLifesteal_100 Герои получают N% вампиризм\n8003 Талисман ярости talismanFireRage_1_20 Герои постоянно получают N% урон"}
                value={talismansText}
                onChange={(e) => setTalismansText(e.target.value)}
                className="min-h-[100px] font-mono text-sm mb-2"
                data-testid="input-talismans"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!talismansText.trim()) return;
                  setTalismansSaving(true);
                  try {
                    await apiRequest("POST", "/api/admin/talismans", { text: talismansText });
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
                  } catch (error) {
                    console.error("Error saving talismans:", error);
                  } finally {
                    setTalismansSaving(false);
                  }
                }}
                disabled={talismansSaving || !talismansText.trim()}
                data-testid="button-save-talismans"
              >
                {talismansSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Сохранить талисманы
              </Button>
            </div>

            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-2 block">Иконки талисманов</label>
              <p className="text-xs text-muted-foreground mb-2">
                Папка с иконками. Имя файла должно содержать ID талисмана в конце (например: talisman_8002.png → ID 8002).
              </p>
              <input
                type="file"
                ref={talismanIconsInputRef}
                className="hidden"
                multiple
                accept="image/*"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  setTalismanIconsUploading(true);
                  try {
                    const icons: Array<{ talismanId: number; iconUrl: string }> = [];
                    for (const file of files) {
                      const match = file.name.match(/(\d+)\.[^.]+$/);
                      if (!match) continue;
                      const talismanId = parseInt(match[1], 10);
                      if (isNaN(talismanId)) continue;
                      const iconUrl = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                      });
                      icons.push({ talismanId, iconUrl });
                    }
                    if (icons.length > 0) {
                      await apiRequest("POST", "/api/admin/talisman-icons", { icons });
                      queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                    }
                  } catch (error) {
                    console.error("Error uploading talisman icons:", error);
                  } finally {
                    setTalismanIconsUploading(false);
                    if (talismanIconsInputRef.current) talismanIconsInputRef.current.value = "";
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => talismanIconsInputRef.current?.click()}
                disabled={talismanIconsUploading}
                data-testid="button-upload-talisman-icons"
              >
                {talismanIconsUploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                {talismanIconsUploading ? "Загрузка..." : "Выбрать папку с иконками"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="h-5 w-5 text-primary" />
              Скилы тотемов
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Названия скилов
              </label>
              {fmtDate(stats?.lastUpdated?.spiritSkills) && (
                <p className="text-[11px] text-muted-foreground/50 mb-1">
                  Обновлено: {fmtDate(stats?.lastUpdated?.spiritSkills)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mb-2">
                Формат: ID название (каждый скил на новой строке). Пример: 4503 Огненный удар
              </p>
              <Textarea
                placeholder="4503 Огненный удар&#10;4506 Пламенный шквал&#10;4509 Водная стена"
                value={spiritSkillsText}
                onChange={(e) => setSpiritSkillsText(e.target.value)}
                className="min-h-[100px] font-mono text-sm mb-2"
                data-testid="input-spirit-skills"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!spiritSkillsText.trim()) return;
                  setSpiritSkillsSaving(true);
                  try {
                    const lines = spiritSkillsText.trim().split("\n");
                    const skills: Array<{ skillId: number; name: string }> = [];
                    for (const line of lines) {
                      const trimmed = line.trim();
                      if (!trimmed) continue;
                      const match = trimmed.match(/^(\d+)\s+(.+)$/);
                      if (match) {
                        skills.push({
                          skillId: parseInt(match[1]),
                          name: match[2].trim(),
                        });
                      }
                    }
                    if (skills.length > 0) {
                      await apiRequest("POST", "/api/admin/spirit-skills", skills);
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/replays"] });
                    }
                  } catch (error) {
                    console.error("Error saving spirit skills:", error);
                  } finally {
                    setSpiritSkillsSaving(false);
                  }
                }}
                disabled={spiritSkillsSaving || !spiritSkillsText.trim()}
                data-testid="button-save-spirit-skills"
              >
                {spiritSkillsSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Сохранить названия
              </Button>
            </div>

            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-2 block">
                Иконки скилов
              </label>
              {fmtDate(stats?.lastUpdated?.spiritIcons) && (
                <p className="text-[11px] text-muted-foreground/50 mb-1">
                  Обновлено: {fmtDate(stats?.lastUpdated?.spiritIcons)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mb-2">
                Загрузите папку с иконками скилов. ID извлекается из имени файла.
              </p>
              <input
                type="file"
                ref={spiritIconsInputRef}
                className="hidden"
                {...{ webkitdirectory: "true", directory: "true" } as any}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  
                  const imageFiles = Array.from(files).filter((f) =>
                    /\.(png|jpg|jpeg|webp|svg)$/i.test(f.name)
                  );
                  
                  if (imageFiles.length === 0) {
                    setErrors((prev) => ({ ...prev, spiritIcons: "Не найдены файлы изображений" }));
                    return;
                  }
                  
                  setErrors((prev) => ({ ...prev, spiritIcons: "" }));
                  setSpiritIconsUploading(true);

                  // Build set of already-uploaded spirit icon IDs — skip them
                  const existingSpiritIds = new Set<number>(
                    (battlesData?.spiritIcons ?? []).map((s) => s.skillId)
                  );

                  // Phase 1: reading files
                  setIconLoadingProgress((prev) => ({ ...prev, spiritIcons: { phase: "reading", current: 0, total: imageFiles.length } }));
                  
                  const icons: Array<{ skillId: number; iconUrl: string }> = [];
                  let spiritSkipped = 0;
                  
                  for (let i = 0; i < imageFiles.length; i++) {
                    const file = imageFiles[i];
                    // Use LAST number in filename (same as hero icons — e.g. "spirit_4509.png" → 4509)
                    const baseName = file.name.replace(/\.[^.]+$/, "");
                    const matches = baseName.match(/\d+/g);
                    if (!matches || matches.length === 0) continue;
                    
                    const skillId = parseInt(matches[matches.length - 1], 10);

                    if (existingSpiritIds.has(skillId)) {
                      spiritSkipped++;
                    } else {
                      const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                      });
                      icons.push({ skillId, iconUrl: base64 });
                    }

                    setIconLoadingProgress((prev) => ({ ...prev, spiritIcons: { phase: "reading", current: i + 1, total: imageFiles.length } }));
                  }
                  
                  if (icons.length > 0) {
                    try {
                      // Phase 2: upload 1 icon at a time so progress bar updates every step
                      setIconLoadingProgress((prev) => ({ ...prev, spiritIcons: { phase: "uploading", current: 0, total: icons.length } }));
                      for (let i = 0; i < icons.length; i++) {
                        await apiRequest("POST", "/api/admin/spirit-icons", [icons[i]]);
                        setIconLoadingProgress((prev) => ({
                          ...prev,
                          spiritIcons: { phase: "uploading", current: i + 1, total: icons.length },
                        }));
                      }
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
                      const desc = spiritSkipped > 0
                        ? `Загружено: ${icons.length}, пропущено (уже есть): ${spiritSkipped}`
                        : `Загружено: ${icons.length}`;
                      toast({ title: "Иконки скилов загружены", description: desc });
                    } catch (error) {
                      console.error("Error uploading spirit icons:", error);
                      setErrors((prev) => ({ ...prev, spiritIcons: "Ошибка загрузки" }));
                    }
                  } else {
                    const msg = spiritSkipped > 0
                      ? `Все ${spiritSkipped} иконок уже загружены — пропущено`
                      : "Не удалось извлечь ID из имён файлов";
                    setErrors((prev) => ({ ...prev, spiritIcons: msg }));
                  }
                  
                  setSpiritIconsUploading(false);
                  setIconLoadingProgress((prev) => ({ ...prev, spiritIcons: null }));
                  if (spiritIconsInputRef.current) spiritIconsInputRef.current.value = "";
                }}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => spiritIconsInputRef.current?.click()}
                  disabled={spiritIconsUploading}
                  data-testid="button-upload-spirit-icons"
                >
                  {spiritIconsUploading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <FolderOpen className="h-4 w-4 mr-1" />
                  )}
                  {spiritIconsUploading ? "Загрузка..." : "Загрузить папку"}
                </Button>
                {iconLoadingProgress.spiritIcons && (() => {
                  const prog = iconLoadingProgress.spiritIcons!;
                  const pct = prog.total > 0 ? Math.round((prog.current / prog.total) * 100) : 0;
                  return (
                    <div className="w-full mt-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{prog.phase === "reading" ? "Чтение файлов..." : "Отправка в GAS..."}</span>
                        <span className="font-mono">{prog.current} / {prog.total} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${prog.phase === "reading" ? "bg-blue-500" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {prog.phase === "reading"
                          ? "Считываем файлы с диска..."
                          : `Иконка ${prog.current} из ${prog.total} — ждём ответа GAS...`}
                      </p>
                    </div>
                  );
                })()}
                {allSpiritSkills.length > 0 && !spiritIconsUploading && (
                  <Badge variant="secondary">
                    Загружено: {allSpiritSkills.filter(s => s.icon).length} иконок
                  </Badge>
                )}
              </div>
              {errors.spiritIcons && (
                <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span>{errors.spiritIcons}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <LogViewer />
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  if (isNaN(date.getTime())) return "—";
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 1000) return "только что";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}с назад`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}м назад`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}ч назад`;
  return date.toLocaleString("ru-RU");
}

function parseTimestamp(raw: unknown): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const d = new Date(raw as string | number);
  return isNaN(d.getTime()) ? null : d;
}

function levelColor(level: string): string {
  switch (level) {
    case "DEBUG": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    case "INFO": return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "WARN": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "ERROR": return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    default: return "bg-gray-100 text-gray-600";
  }
}

interface ServerLogEntry {
  timestamp: string;
  level: string;
  function: string;
  message: string;
  data?: string;
}

function LogViewer() {
  const [clientLogs, setClientLogs] = useState<ClientLogEntry[]>(getEntries);
  const [activeTab, setActiveTab] = useState<"client" | "server">("client");

  useEffect(() => {
    return subscribeToLogs((entries) => {
      setClientLogs(entries);
    });
  }, []);

  const {
    data: serverLogsData,
    isLoading: serverLoading,
    refetch: refetchServerLogs,
  } = useQuery<{ logs: ServerLogEntry[] }>({
    queryKey: ["server-logs"],
    queryFn: () => gasApi.getLogs(),
    enabled: activeTab === "server",
    refetchOnWindowFocus: false,
  });

  const serverLogs = serverLogsData?.logs ?? [];

  return (
    <Card className="border-card-border" data-testid="card-logs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-primary" />
          Логи
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "client" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("client")}
            data-testid="button-tab-client-logs"
          >
            Client Logs ({clientLogs.length})
          </Button>
          <Button
            variant={activeTab === "server" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("server")}
            data-testid="button-tab-server-logs"
          >
            Server Logs ({serverLogs.length})
          </Button>
        </div>

        {activeTab === "client" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                Логи вызовов GAS/REST из браузера (в памяти)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearEntries();
                  setClientLogs([]);
                }}
                data-testid="button-clear-client-logs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Очистить
              </Button>
            </div>
            <ScrollArea className="h-[400px] border rounded-md">
              {clientLogs.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Нет записей
                </div>
              ) : (
                <div className="divide-y">
                  {clientLogs.map((entry) => (
                    <div key={entry.id} className="px-3 py-2 text-xs font-mono" data-testid={`log-client-${entry.id}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(entry.timestamp)}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${levelColor(entry.level)}`}>
                          {entry.level}
                        </span>
                        <span className="text-muted-foreground/70 text-[10px]">[{entry.category}]</span>
                        <span className="font-medium text-foreground">{entry.method}</span>
                        {entry.durationMs !== undefined && (
                          <span className="text-muted-foreground">{entry.durationMs}ms</span>
                        )}
                        {entry.responseSize !== undefined && (
                          <Badge variant="outline" className="text-[10px] py-0 h-4">
                            {entry.responseSize} записей
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 text-muted-foreground">
                        {entry.message}
                        {entry.error && (
                          <span className="text-red-500 ml-1">— {entry.error}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {activeTab === "server" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                Серверные логи из листа 'logs' в Google Sheets
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchServerLogs()}
                disabled={serverLoading}
                data-testid="button-refresh-server-logs"
              >
                {serverLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Обновить
              </Button>
            </div>
            <ScrollArea className="h-[400px] border rounded-md">
              {serverLoading && serverLogs.length === 0 ? (
                <div className="p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загрузка...
                </div>
              ) : serverLogs.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Нет серверных логов
                </div>
              ) : (
                <div className="divide-y">
                  {serverLogs.map((entry, idx) => (
                    <div key={idx} className="px-3 py-2 text-xs font-mono" data-testid={`log-server-${idx}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-muted-foreground whitespace-nowrap">
                          {(() => { const d = parseTimestamp(entry.timestamp); return d ? formatRelativeTime(d) : "—"; })()}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${levelColor(entry.level)}`}>
                          {entry.level}
                        </span>
                        <span className="font-medium text-foreground">{entry.function}</span>
                      </div>
                      <div className="mt-0.5 text-muted-foreground">
                        {entry.message}
                        {entry.data && (
                          <span className="ml-1 text-muted-foreground/70">| {entry.data}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
