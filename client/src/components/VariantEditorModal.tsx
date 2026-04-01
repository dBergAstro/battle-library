import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Copy, Download, Save, Wand2, X, Search, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ProcessedBattle } from "@shared/schema";
import { MAIN_BUFF_KEY_A, MAIN_BUFF_KEY_B, MAIN_BUFF_DISPLAY_A, MAIN_BUFF_DISPLAY_B } from "@/lib/replayUtils";
import type { CollectedItem } from "./CollectionSidebar";

// ─── Types ───────────────────────────────────────────────────────────────────

type Grade = "purple" | "orange" | "red";

interface HeroEntry {
  heroId: number;
  name: string;
  icon?: string;
  fragmentCount: number;
  grade: Grade;
  favorPetId?: number;
}

interface HeroesData {
  heroIcons: Array<{ heroId: number; iconUrl: string }>;
  heroNames: Array<{ heroId: number; name: string }>;
}

interface PetsData {
  petIcons: Array<{ petId: number; iconUrl: string }>;
  heroNames: Array<{ heroId: number; name: string }>;
}

type TalismansData = Array<{ talismanId: number; name: string; effectKey: string; iconUrl?: string | null; description?: string | null }>;

interface HeroFavorPetRow {
  id: number;
  heroId: number;
  allowedPetIds: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const BATTLE_BOSS_LEVEL: Record<number, number> = {
  1: 80, 2: 85, 3: 90, 4: 100, 5: 110, 6: 120, 7: 130, 8: 130,
};

const GRADE_LABELS: Record<Grade, string> = {
  purple: "Фиолетовый (1-2)",
  orange: "Оранжевый (3-6)",
  red: "Красный (7-10)",
};

// Рекомендуемые грейды по главам: [purple, orange, red]
export const CHAPTER_GRADES: Record<number, [number, number, number]> = {
  1: [5, 0, 0],
  2: [4, 1, 0],
  3: [3, 2, 0],
  4: [2, 3, 0],
  5: [1, 4, 0],
  6: [0, 5, 0],
  7: [0, 2, 3],
};

// Дефолтный бафф по главе
export const CHAPTER_DEFAULT_BUFF: Record<number, number> = {
  1: 0, 2: 0, 3: 50, 4: 100, 5: 150, 6: 200, 7: 250,
};

// Случайное количество фрагментов по грейду
export function randomFragmentCount(grade: Grade): number {
  if (grade === "purple") return Math.floor(Math.random() * 2) + 1;  // 1-2
  if (grade === "orange") return Math.floor(Math.random() * 4) + 3;  // 3-6
  return Math.floor(Math.random() * 4) + 7;                           // 7-10
}

// Грейд по количеству фрагментов
export function gradeFromCount(n: number): Grade {
  if (n >= 7) return "red";
  if (n >= 3) return "orange";
  return "purple";
}

// Числовой порядок грейда
export const GRADE_ORDER: Record<Grade, number> = { purple: 1, orange: 2, red: 3 };

// Рекомендованный максимальный грейд по главе (для предупреждения)
export function recommendedMaxGrade(chapter: number): Grade {
  const dist = CHAPTER_GRADES[chapter] || CHAPTER_GRADES[7];
  if (dist[2] > 0) return "red";
  if (dist[1] > 0) return "orange";
  return "purple";
}

// ─── Hero Picker Sub-component (exported for reuse) ───────────────────────────

export interface HeroPickerProps {
  isHeroic: boolean;
  allHeroes: Array<{ heroId: number; name: string; icon?: string }>;
  allTitans: Array<{ heroId: number; name: string; icon?: string }>;
  currentHeroId: number;
  onSelect: (heroId: number) => void;
  onClose: () => void;
}

export function HeroPicker({ isHeroic, allHeroes, allTitans, currentHeroId, onSelect, onClose }: HeroPickerProps) {
  const [search, setSearch] = useState("");
  const pool = isHeroic ? allHeroes : allTitans;
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? pool.filter(h => h.heroId.toString().includes(q) || h.name.toLowerCase().includes(q)) : pool;
  }, [pool, search]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-7 h-8 text-sm"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-hero-search"
          />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="h-48 border rounded">
        <div className="grid grid-cols-4 gap-1 p-2">
          {filtered.map((h) => (
            <Tooltip key={h.heroId}>
              <TooltipTrigger asChild>
                <button
                  className={`flex flex-col items-center gap-0.5 p-1 rounded hover:bg-muted transition-colors ${h.heroId === currentHeroId ? "ring-2 ring-primary" : ""}`}
                  onClick={() => { onSelect(h.heroId); onClose(); }}
                  data-testid={`hero-pick-${h.heroId}`}
                >
                  <Avatar className="h-9 w-9">
                    {h.icon ? <AvatarImage src={h.icon} alt={h.name} /> : null}
                    <AvatarFallback className="text-[10px]">{h.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="text-[9px] text-center leading-tight truncate w-full">{h.name}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs"><p>{h.name}</p><p className="text-muted-foreground">ID: {h.heroId}</p></TooltipContent>
            </Tooltip>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-4 py-4 text-center text-xs text-muted-foreground">Не найдено</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Pet Picker Sub-component ─────────────────────────────────────────────────

interface PetPickerProps {
  pets: Array<{ petId: number; name: string; icon?: string }>;
  currentPetId?: number;
  onSelect: (petId: number | undefined) => void;
  onClose: () => void;
  label?: string;
}

function PetPicker({ pets, currentPetId, onSelect, onClose, label }: PetPickerProps) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? pets.filter(p => p.petId.toString().includes(q) || p.name.toLowerCase().includes(q)) : pets;
  }, [pets, search]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium flex-1">{label || "Выбор питомца"}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="pl-7 h-7 text-xs"
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <ScrollArea className="h-36 border rounded">
        <div className="grid grid-cols-5 gap-1 p-1.5">
          <button
            className={`flex flex-col items-center gap-0.5 p-1 rounded hover:bg-muted text-muted-foreground transition-colors ${!currentPetId ? "ring-2 ring-primary" : ""}`}
            onClick={() => { onSelect(undefined); onClose(); }}
          >
            <div className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center">
              <X className="h-3 w-3" />
            </div>
            <span className="text-[9px]">Нет</span>
          </button>
          {filtered.map((p) => (
            <Tooltip key={p.petId}>
              <TooltipTrigger asChild>
                <button
                  className={`flex flex-col items-center gap-0.5 p-1 rounded hover:bg-muted transition-colors ${p.petId === currentPetId ? "ring-2 ring-primary" : ""}`}
                  onClick={() => { onSelect(p.petId); onClose(); }}
                  data-testid={`pet-pick-${p.petId}`}
                >
                  <Avatar className="h-7 w-7">
                    {p.icon ? <AvatarImage src={p.icon} alt={p.name} /> : null}
                    <AvatarFallback className="text-[9px]">{p.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="text-[9px] text-center leading-tight truncate w-full">{p.name}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs"><p>{p.name}</p><p className="text-muted-foreground">ID: {p.petId}</p></TooltipContent>
            </Tooltip>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-5 py-3 text-center text-xs text-muted-foreground">Нет доступных питомцев</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Helper: build initial heroes list from a team + chapter ─────────────────

export function buildInitHeroes(
  team: { heroId: number; name: string; icon?: string }[],
  chapter: number
): HeroEntry[] {
  const dist = CHAPTER_GRADES[chapter] || CHAPTER_GRADES[7];
  const grades: Grade[] = [];
  for (let i = 0; i < dist[0]; i++) grades.push("purple");
  for (let i = 0; i < dist[1]; i++) grades.push("orange");
  for (let i = 0; i < dist[2]; i++) grades.push("red");
  for (let i = grades.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [grades[i], grades[j]] = [grades[j], grades[i]];
  }
  return Array.from({ length: 5 }, (_, idx) => {
    const m = team[idx];
    const grade = grades[idx] || "purple";
    if (m) {
      return { heroId: m.heroId, name: m.name, icon: m.icon, fragmentCount: randomFragmentCount(grade), grade, favorPetId: undefined };
    }
    return { heroId: 0, name: "", icon: undefined, fragmentCount: randomFragmentCount(grade), grade, favorPetId: undefined };
  });
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface VariantEditorModalProps {
  battle: ProcessedBattle;
  open: boolean;
  onClose: () => void;
  onAddToCollection?: (item: CollectedItem) => void;
}

export function VariantEditorModal({ battle, open, onClose, onAddToCollection }: VariantEditorModalProps) {
  const { toast } = useToast();

  // ─── Load data ─────────────────────────────────────────────────────────────

  const { data: heroesData } = useQuery<HeroesData>({ queryKey: ["/api/heroes"] });
  const { data: petsData } = useQuery<PetsData>({ queryKey: ["/api/pets"] });
  const { data: talismansData } = useQuery<TalismansData>({ queryKey: ["/api/talismans"] });
  const { data: favorPetsData } = useQuery<HeroFavorPetRow[]>({ queryKey: ["/api/hero-favor-pets"] });
  const { data: battlesData } = useQuery<{
    attackTeams: Array<{ bossId: number | null; invasionId: number | null }>;
    battles: Array<{ gameId: number; chapterNumber: number; battleNumber: string; legacyBattleNum: number | null }>;
  }>({ queryKey: ["/api/battles"] });

  // ─── Derived battle info ────────────────────────────────────────────────────

  const invasionId = useMemo(() => {
    if (!battlesData?.attackTeams) return null;
    const match = battlesData.attackTeams.find(t => t.bossId === battle.gameId);
    return match?.invasionId ?? null;
  }, [battlesData, battle.gameId]);

  const initialBattleNum = useMemo(() => {
    if (battle.legacyBattleNum != null) return battle.legacyBattleNum;
    const m = battle.battleNumber.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 1;
  }, [battle.legacyBattleNum, battle.battleNumber]);

  // Map (chapter-battleNum) → gameId for recommended recording ID
  const chapterBattleToGameId = useMemo(() => {
    if (!battlesData?.battles) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const b of battlesData.battles) {
      let bNum: number | null = b.legacyBattleNum;
      if (bNum == null) {
        const m = b.battleNumber.match(/(\d+)/);
        bNum = m ? parseInt(m[1], 10) : null;
      }
      if (bNum != null) map.set(`${b.chapterNumber}-${bNum}`, b.gameId);
    }
    return map;
  }, [battlesData]);

  const allHeroPool = useMemo(() => {
    if (!heroesData) return [];
    const iconMap = new Map(heroesData.heroIcons.map(h => [h.heroId, h.iconUrl]));
    const nameMap = new Map(heroesData.heroNames.map(h => [h.heroId, h.name]));
    const ids = new Set<number>();
    heroesData.heroIcons.forEach(h => { if (h.heroId >= 1 && h.heroId <= 99) ids.add(h.heroId); });
    heroesData.heroNames.forEach(h => { if (h.heroId >= 1 && h.heroId <= 99) ids.add(h.heroId); });
    return Array.from(ids).map(heroId => ({
      heroId, name: nameMap.get(heroId) || `ID ${heroId}`, icon: iconMap.get(heroId),
    })).sort((a, b) => a.heroId - b.heroId);
  }, [heroesData]);

  const allTitanPool = useMemo(() => {
    if (!heroesData) return [];
    const iconMap = new Map(heroesData.heroIcons.map(h => [h.heroId, h.iconUrl]));
    const nameMap = new Map(heroesData.heroNames.map(h => [h.heroId, h.name]));
    const ids = new Set<number>();
    heroesData.heroIcons.forEach(h => { if (h.heroId >= 4000 && h.heroId <= 4999) ids.add(h.heroId); });
    heroesData.heroNames.forEach(h => { if (h.heroId >= 4000 && h.heroId <= 4999) ids.add(h.heroId); });
    return Array.from(ids).map(heroId => ({
      heroId, name: nameMap.get(heroId) || `ID ${heroId}`, icon: iconMap.get(heroId),
    })).sort((a, b) => a.heroId - b.heroId);
  }, [heroesData]);

  const allPets = useMemo(() => {
    if (!petsData) return [];
    const petIconMap = new Map(petsData.petIcons?.map(p => [p.petId, p.iconUrl]) || []);
    const nameMap = new Map(petsData.heroNames.map(h => [h.heroId, h.name]));
    const ids = new Set<number>();
    petsData.petIcons?.forEach(p => ids.add(p.petId));
    petsData.heroNames.filter(h => h.heroId >= 6000 && h.heroId < 7000).forEach(h => ids.add(h.heroId));
    return Array.from(ids).map(petId => ({
      petId, name: nameMap.get(petId) || `Питомец ${petId}`, icon: petIconMap.get(petId),
    })).sort((a, b) => a.petId - b.petId);
  }, [petsData]);

  const favorMap = useMemo(() => {
    if (!favorPetsData) return new Map<number, number[]>();
    const m = new Map<number, number[]>();
    for (const row of favorPetsData) {
      try { m.set(row.heroId, JSON.parse(row.allowedPetIds)); } catch { /* ignore */ }
    }
    return m;
  }, [favorPetsData]);

  const petIconMap = useMemo(() => new Map(allPets.map(p => [p.petId, p.icon])), [allPets]);
  const petNameMap = useMemo(() => new Map(allPets.map(p => [p.petId, p.name])), [allPets]);
  const heroIconMap = useMemo(() => {
    if (!heroesData) return new Map<number, string>();
    return new Map(heroesData.heroIcons.map(h => [h.heroId, h.iconUrl]));
  }, [heroesData]);
  const heroNameMap = useMemo(() => {
    if (!heroesData) return new Map<number, string>();
    return new Map(heroesData.heroNames.map(h => [h.heroId, h.name]));
  }, [heroesData]);

  // ─── State ─────────────────────────────────────────────────────────────────

  const [selectedChapter, setSelectedChapter] = useState<number>(battle.chapterNumber);
  const [selectedBattle, setSelectedBattle] = useState<number>(initialBattleNum);
  const [heroes, setHeroes] = useState<HeroEntry[]>(() => buildInitHeroes(battle.team, battle.chapterNumber));
  const [mainPetId, setMainPetId] = useState<number | undefined>(undefined);
  const [mainBuff, setMainBuff] = useState<number>(CHAPTER_DEFAULT_BUFF[battle.chapterNumber] ?? 0);
  const [mainBuffType, setMainBuffType] = useState<"A" | "B" | null>("A");
  const [talismanId, setTalismanId] = useState<number | undefined>(undefined);
  const [generatedJson, setGeneratedJson] = useState<string | null>(null);
  const [pickerOpenIdx, setPickerOpenIdx] = useState<number | null>(null);
  const [favorPickerIdx, setFavorPickerIdx] = useState<number | null>(null);
  const [petPickerOpen, setPetPickerOpen] = useState(false);

  // ─── Reset state when modal opens ──────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setSelectedChapter(battle.chapterNumber);
      setSelectedBattle(initialBattleNum);
      setHeroes(buildInitHeroes(battle.team, battle.chapterNumber));
      setMainPetId(undefined);
      setMainBuff(CHAPTER_DEFAULT_BUFF[battle.chapterNumber] ?? 0);
      setMainBuffType("A");
      setTalismanId(undefined);
      setGeneratedJson(null);
      setPickerOpenIdx(null);
      setFavorPickerIdx(null);
      setPetPickerOpen(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── When chapter changes, update buff default ──────────────────────────────

  const handleChapterChange = (ch: number) => {
    setSelectedChapter(ch);
    setMainBuff(CHAPTER_DEFAULT_BUFF[ch] ?? 0);
  };

  // ─── Derived from selected chapter/battle ─────────────────────────────────

  const maxGrade = recommendedMaxGrade(selectedChapter);
  const recommendedBossLevel = BATTLE_BOSS_LEVEL[selectedBattle] ?? null;
  const talismans = talismansData || [];
  const selectedTalisman = talismans.find(t => t.talismanId === talismanId);

  // ─── Hero editing helpers ──────────────────────────────────────────────────

  const updateHeroField = (idx: number, field: keyof HeroEntry, value: unknown) => {
    setHeroes(prev => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };

  const replaceHero = (idx: number, newHeroId: number) => {
    const name = heroNameMap.get(newHeroId) || `ID ${newHeroId}`;
    const icon = heroIconMap.get(newHeroId);
    setHeroes(prev => prev.map((h, i) => i === idx ? { ...h, heroId: newHeroId, name, icon, favorPetId: undefined } : h));
  };

  const setHeroGrade = (idx: number, grade: Grade) => {
    const count = randomFragmentCount(grade);
    setHeroes(prev => prev.map((h, i) => i === idx ? { ...h, grade, fragmentCount: count } : h));
  };

  const setHeroFragments = (idx: number, count: number) => {
    const grade = gradeFromCount(count);
    setHeroes(prev => prev.map((h, i) => i === idx ? { ...h, fragmentCount: count, grade } : h));
  };

  // ─── Generate JSON ─────────────────────────────────────────────────────────

  const generateJson = () => {
    const filledHeroes = heroes.filter(h => h.heroId !== 0);
    const units = filledHeroes.map(h => h.heroId);
    const fragments: Record<string, number> = {};
    const favor: Record<string, number> = {};

    for (const h of filledHeroes) {
      fragments[h.heroId.toString()] = h.fragmentCount;
      if (h.favorPetId) {
        favor[h.heroId.toString()] = h.favorPetId;
        fragments[h.favorPetId.toString()] = 1;
      }
    }

    if (mainPetId) {
      fragments[mainPetId.toString()] = 1;
    }

    const effects: Record<string, number> = {};
    if (mainBuff > 0 && mainBuffType === "A") {
      effects[`${MAIN_BUFF_KEY_A}_${mainBuff}`] = mainBuff;
    } else if (mainBuff > 0 && mainBuffType === "B") {
      effects[`${MAIN_BUFF_KEY_B}_${mainBuff}`] = mainBuff;
    }
    if (selectedTalisman) {
      effects[`${selectedTalisman.effectKey}_1`] = 1;
    }

    const result = {
      units,
      petId: mainPetId,
      favor: Object.keys(favor).length > 0 ? favor : {},
      spirits: [],
      fragments,
      effects: Object.keys(effects).length > 0 ? effects : {},
    };

    setGeneratedJson(JSON.stringify(result, null, 2));
  };

  // ─── Copy / Save / Download ────────────────────────────────────────────────

  const copyJson = async () => {
    if (!generatedJson) return;
    try {
      await navigator.clipboard.writeText(generatedJson);
      toast({ title: "Скопировано в буфер обмена" });
    } catch {
      toast({ title: "Ошибка копирования", variant: "destructive" });
    }
  };

  const saveToLibrary = () => {
    if (!generatedJson) return;
    let existing: unknown[] = [];
    try {
      const raw = localStorage.getItem("variantLibrary");
      const parsed = raw ? JSON.parse(raw) : [];
      existing = Array.isArray(parsed) ? parsed : [];
    } catch {
      existing = [];
    }
    const entry = {
      id: Date.now(),
      battleGameId: battle.gameId,
      chapterNumber: selectedChapter,
      battleType: battle.type,
      label: battle.originalLabel,
      json: generatedJson,
      createdAt: new Date().toISOString(),
    };
    existing.push(entry);
    localStorage.setItem("variantLibrary", JSON.stringify(existing));
    toast({ title: "Сохранено в библиотеку вариантов" });
  };

  const downloadLibrary = () => {
    let existing: string;
    try {
      const raw = localStorage.getItem("variantLibrary");
      const parsed = raw ? JSON.parse(raw) : [];
      existing = JSON.stringify(Array.isArray(parsed) ? parsed : [], null, 2);
    } catch {
      existing = "[]";
    }
    const blob = new Blob([existing], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "variant_library.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddVariantToCollection = () => {
    if (!generatedJson || !onAddToCollection) return;
    const filledHeroes = heroes.filter(h => h.heroId !== 0);
    const recId = chapterBattleToGameId.get(`${selectedChapter}-${selectedBattle}`) ?? battle.gameId;
    const variantItem: CollectedItem = {
      id: `variant-${battle.gameId}-${Date.now()}`,
      type: "variant",
      gameId: recId,
      label: `Вариант #${recId}`,
      desc: "",
      battleType: battle.type,
      team: filledHeroes.map(h => ({
        heroId: h.heroId,
        name: heroNameMap.get(h.heroId) || h.name || `ID ${h.heroId}`,
        icon: heroIconMap.get(h.heroId) || h.icon,
      })),
      rawDefendersFragments: generatedJson,
      mainBuff: mainBuffType ? mainBuff : undefined,
    };
    onAddToCollection(variantItem);
    onClose();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl" data-testid="dialog-variant-editor">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Редактор варианта — #{battle.gameId}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto pr-1">
        <div className="space-y-4">

          {/* ── Target chapter/battle selector ── */}
          <div className="flex items-center gap-3 flex-wrap bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
            <span className="text-xs font-semibold text-foreground">Создать вариант для:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Глава</span>
              <Select value={selectedChapter.toString()} onValueChange={(v) => handleChapterChange(parseInt(v))}>
                <SelectTrigger className="h-7 w-16 text-xs" data-testid="select-target-chapter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7].map(ch => (
                    <SelectItem key={ch} value={ch.toString()}>{ch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Бой</span>
              <Select value={selectedBattle.toString()} onValueChange={(v) => setSelectedBattle(parseInt(v))}>
                <SelectTrigger className="h-7 w-16 text-xs" data-testid="select-target-battle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8].map(b => (
                    <SelectItem key={b} value={b.toString()}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 ml-auto flex-wrap">
              <Badge variant="outline" className="text-xs">
                Макс. грейд: <span className={`ml-1 font-semibold ${maxGrade === "red" ? "text-red-500" : maxGrade === "orange" ? "text-orange-500" : "text-purple-500"}`}>{maxGrade === "red" ? "Красный" : maxGrade === "orange" ? "Оранжевый" : "Фиолетовый"}</span>
              </Badge>
              {recommendedBossLevel != null && (
                <Badge variant="outline" className="text-xs">bossLevel: {recommendedBossLevel}</Badge>
              )}
            </div>
          </div>

          {/* ── Battle info ── */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
            <span><span className="font-medium text-foreground">bossId:</span> {battle.gameId}</span>
            {invasionId != null && (
              <span><span className="font-medium text-foreground">invasionId:</span> {invasionId}</span>
            )}
          </div>

          {/* ── Heroes ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Герои</h3>
            {heroes.map((hero, idx) => {
              const isEmpty = hero.heroId === 0;
              const isOverGrade = !isEmpty && GRADE_ORDER[hero.grade] > GRADE_ORDER[maxGrade];
              const heroAllowedIds = !isEmpty ? favorMap.get(hero.heroId) : undefined;
              const allowedPets = heroAllowedIds
                ? allPets.filter(p => heroAllowedIds.includes(p.petId))
                : allPets;

              if (isEmpty && pickerOpenIdx !== idx) {
                return (
                  <div key={idx} className="border border-dashed rounded-lg" data-testid={`hero-row-${idx}`}>
                    <button
                      className="w-full flex items-center gap-2 p-3 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors rounded-lg"
                      onClick={() => setPickerOpenIdx(idx)}
                      data-testid={`button-pick-hero-${idx}`}
                    >
                      <div className="h-10 w-10 border-2 border-dashed border-muted-foreground/40 rounded-full flex items-center justify-center">
                        <Plus className="h-4 w-4" />
                      </div>
                      <span className="text-sm">Слот {idx + 1} — нажмите для выбора героя</span>
                    </button>
                    {pickerOpenIdx === idx && (
                      <div className="p-3 pt-0">
                        <HeroPicker
                          isHeroic={true}
                          allHeroes={allHeroPool}
                          allTitans={allTitanPool}
                          currentHeroId={0}
                          onSelect={(id) => replaceHero(idx, id)}
                          onClose={() => setPickerOpenIdx(null)}
                        />
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={idx} className="border rounded-lg p-3 space-y-2" data-testid={`hero-row-${idx}`}>
                  {/* Hero row */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="focus:outline-none"
                            onClick={() => setPickerOpenIdx(pickerOpenIdx === idx ? null : idx)}
                            data-testid={`button-pick-hero-${idx}`}
                          >
                            <Avatar className="h-10 w-10 border-2 border-primary/40 hover:border-primary transition-colors">
                              {hero.icon ? <AvatarImage src={hero.icon} alt={hero.name} /> : null}
                              <AvatarFallback className="text-xs">{hero.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Нажмите для замены</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{hero.name}</p>
                      <p className="text-xs text-muted-foreground">ID: {hero.heroId}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Select
                        value={hero.grade}
                        onValueChange={(v) => setHeroGrade(idx, v as Grade)}
                      >
                        <SelectTrigger className="h-8 w-[150px] text-xs" data-testid={`select-grade-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="purple">
                            <span className="text-purple-500">Фиолетовый</span>
                          </SelectItem>
                          <SelectItem value="orange">
                            <span className="text-orange-500">Оранжевый</span>
                          </SelectItem>
                          <SelectItem value="red">
                            <span className="text-red-500">Красный</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={hero.fragmentCount}
                        onChange={(e) => setHeroFragments(idx, Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                        className="h-8 w-14 text-xs text-center"
                        data-testid={`input-fragments-${idx}`}
                      />
                    </div>

                    {isOverGrade && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" data-testid={`warn-grade-${idx}`} />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          Прокачка выше рекомендованной для главы {selectedChapter} (макс: {GRADE_LABELS[maxGrade]})
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* Hero picker */}
                  {pickerOpenIdx === idx && (
                    <HeroPicker
                      isHeroic={true}
                      allHeroes={allHeroPool}
                      allTitans={allTitanPool}
                      currentHeroId={hero.heroId}
                      onSelect={(id) => replaceHero(idx, id)}
                      onClose={() => setPickerOpenIdx(null)}
                    />
                  )}

                  {/* Favor pet */}
                  <div className="flex items-center gap-2 pl-12">
                    <span className="text-xs text-muted-foreground">Покровитель:</span>
                    {hero.favorPetId ? (
                      <div className="flex items-center gap-1">
                        <Avatar className="h-6 w-6">
                          {petIconMap.get(hero.favorPetId) ? (
                            <AvatarImage src={petIconMap.get(hero.favorPetId)} />
                          ) : null}
                          <AvatarFallback className="text-[9px]">П</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{petNameMap.get(hero.favorPetId) || `ID ${hero.favorPetId}`}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Нет</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setFavorPickerIdx(favorPickerIdx === idx ? null : idx)}
                      data-testid={`button-favor-pet-${idx}`}
                    >
                      {hero.favorPetId ? "Сменить" : "Выбрать"}
                    </Button>
                  </div>

                  {/* Favor pet picker */}
                  {favorPickerIdx === idx && (
                    <div className="pl-12">
                      <PetPicker
                        pets={allowedPets}
                        currentPetId={hero.favorPetId}
                        onSelect={(petId) => updateHeroField(idx, "favorPetId", petId)}
                        onClose={() => setFavorPickerIdx(null)}
                        label="Питомец-покровитель"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Main Pet ── */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold flex-1">Основной питомец</h3>
              {mainPetId && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-6 w-6">
                    {petIconMap.get(mainPetId) ? <AvatarImage src={petIconMap.get(mainPetId)} /> : null}
                    <AvatarFallback className="text-[9px]">П</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{petNameMap.get(mainPetId) || `ID ${mainPetId}`}</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPetPickerOpen(!petPickerOpen)}
                data-testid="button-main-pet"
              >
                {mainPetId ? "Сменить" : "Выбрать"}
              </Button>
            </div>
            {petPickerOpen && (
              <PetPicker
                pets={allPets}
                currentPetId={mainPetId}
                onSelect={setMainPetId}
                onClose={() => setPetPickerOpen(false)}
                label="Основной питомец"
              />
            )}
          </div>

          {/* ── Buff ── */}
          <div className="flex items-center gap-3 border rounded-lg p-3 flex-wrap">
            <h3 className="text-sm font-semibold flex-1">Основной бафф</h3>
            <Select
              value={mainBuffType ?? "__none__"}
              onValueChange={(v) => setMainBuffType(v === "__none__" ? null : v as "A" | "B")}
            >
              <SelectTrigger className="h-8 w-[180px] text-xs" data-testid="select-buff-type">
                <SelectValue placeholder="Без баффа" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Без баффа</SelectItem>
                <SelectItem value="A">{MAIN_BUFF_DISPLAY_A}</SelectItem>
                <SelectItem value="B">{MAIN_BUFF_DISPLAY_B}</SelectItem>
              </SelectContent>
            </Select>
            {mainBuffType && (
              <Input
                type="number"
                min={0}
                step={50}
                value={mainBuff}
                onChange={(e) => setMainBuff(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-8 w-24 text-sm text-center"
                data-testid="input-main-buff"
              />
            )}
            <Badge variant="outline" className="text-xs">
              Рек. Гл.{selectedChapter}: {CHAPTER_DEFAULT_BUFF[selectedChapter] ?? 0}
            </Badge>
          </div>

          {/* ── Talisman ── */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold flex-1">Талисман</h3>
              <Select
                value={talismanId?.toString() || "__none__"}
                onValueChange={(v) => setTalismanId(v === "__none__" ? undefined : parseInt(v))}
              >
                <SelectTrigger className="h-8 w-[200px] text-xs" data-testid="select-talisman">
                  <SelectValue placeholder="Без талисмана" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Без талисмана</SelectItem>
                  {talismans.map(t => (
                    <SelectItem key={t.talismanId} value={t.talismanId.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Generate ── */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={generateJson} data-testid="button-generate-json">
              <Wand2 className="h-4 w-4 mr-1" />
              Сгенерировать JSON
            </Button>
            {generatedJson && (
              <>
                <Button variant="outline" onClick={copyJson} data-testid="button-copy-json">
                  <Copy className="h-4 w-4 mr-1" />
                  Скопировать
                </Button>
                <Button variant="outline" onClick={saveToLibrary} data-testid="button-save-library">
                  <Save className="h-4 w-4 mr-1" />
                  В библиотеку
                </Button>
                <Button variant="outline" onClick={downloadLibrary} data-testid="button-download-library">
                  <Download className="h-4 w-4 mr-1" />
                  Скачать библиотеку
                </Button>
                {onAddToCollection && (
                  <Button
                    variant="default"
                    onClick={handleAddVariantToCollection}
                    data-testid="button-add-variant-to-collection"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    В коллекцию
                  </Button>
                )}
              </>
            )}
          </div>

          {/* ── JSON Preview ── */}
          {generatedJson && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-1.5 text-xs font-mono text-muted-foreground">
                defendersFragments
              </div>
              <ScrollArea className="h-48">
                <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all" data-testid="text-json-preview">
                  {generatedJson}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
