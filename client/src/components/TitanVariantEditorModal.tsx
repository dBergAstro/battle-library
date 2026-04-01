import { useState, useMemo, useEffect } from "react";
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
import { AlertTriangle, Copy, Download, Save, Wand2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ProcessedBattle } from "@shared/schema";
import { MAIN_BUFF_KEY_A, MAIN_BUFF_KEY_B, MAIN_BUFF_DISPLAY_A, MAIN_BUFF_DISPLAY_B } from "@/lib/replayUtils";
import type { CollectedItem } from "./CollectionSidebar";
import {
  HeroPicker,
  CHAPTER_GRADES,
  CHAPTER_DEFAULT_BUFF,
  BATTLE_BOSS_LEVEL,
  randomFragmentCount,
  gradeFromCount,
  GRADE_ORDER,
  recommendedMaxGrade,
} from "./VariantEditorModal";

// ─── Types ───────────────────────────────────────────────────────────────────

type Grade = "purple" | "orange" | "red";

interface TitanEntry {
  titanId: number;
  name: string;
  icon?: string;
  fragmentCount: number;
  grade: Grade;
}

interface HeroesData {
  heroIcons: Array<{ heroId: number; iconUrl: string }>;
  heroNames: Array<{ heroId: number; name: string }>;
}

interface SpiritSkillsData {
  spiritSkills: Array<{ id: number; skillId: number; name: string; skillType?: string | null }>;
  spiritIcons: Array<{ id: number; skillId: number; iconUrl: string }>;
}

interface TitanElementsData {
  titanId: number;
  element: string;
  points: number;
}

interface TotemSkillState {
  elementalSkillId?: number;
  elementalFragments: number;
  primalSkillId?: number;
  primalFragments: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ELEMENT_THRESHOLDS: Record<string, number> = {
  "вода": 3, "огонь": 3, "земля": 3, "тьма": 2, "свет": 2,
};

const ELEMENT_EN: Record<string, string> = {
  "вода": "water", "огонь": "fire", "земля": "earth", "тьма": "dark", "свет": "light",
};

const ELEMENT_RU: Record<string, string> = {
  "вода": "Вода", "огонь": "Огонь", "земля": "Земля", "тьма": "Тьма", "свет": "Свет",
};

const ELEMENT_EMOJI: Record<string, string> = {
  "вода": "💧", "огонь": "🔥", "земля": "🌍", "тьма": "🌑", "свет": "☀️",
};

const ALL_ELEMENTS = ["вода", "огонь", "земля", "тьма", "свет"];

const GRADE_LABELS: Record<Grade, string> = {
  purple: "Фиолетовый (1-2)",
  orange: "Оранжевый (3-6)",
  red: "Красный (7-10)",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildInitTitans(
  team: { heroId: number; name: string; icon?: string }[],
  chapter: number
): TitanEntry[] {
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
      return { titanId: m.heroId, name: m.name, icon: m.icon, fragmentCount: randomFragmentCount(grade), grade };
    }
    return { titanId: 0, name: "", icon: undefined, fragmentCount: randomFragmentCount(grade), grade };
  });
}

function calcActiveTotems(
  titans: TitanEntry[],
  elementsMap: Map<number, { element: string; points: number }>
): string[] {
  const points: Record<string, number> = {};
  for (const t of titans) {
    const data = elementsMap.get(t.titanId);
    if (data) points[data.element] = (points[data.element] || 0) + data.points;
  }
  const candidates: { element: string; pts: number }[] = [];
  for (const [el, pts] of Object.entries(points)) {
    const threshold = ELEMENT_THRESHOLDS[el];
    if (threshold && pts >= threshold) candidates.push({ element: el, pts });
  }
  candidates.sort((a, b) => b.pts - a.pts);
  return candidates.slice(0, 2).map(c => c.element);
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface TitanVariantEditorModalProps {
  battle: ProcessedBattle;
  open: boolean;
  onClose: () => void;
  onAddToCollection?: (item: CollectedItem) => void;
  initialItem?: CollectedItem;
}

export function TitanVariantEditorModal({ battle, open, onClose, onAddToCollection, initialItem }: TitanVariantEditorModalProps) {
  const { toast } = useToast();

  // ─── Load data ─────────────────────────────────────────────────────────────

  const { data: heroesData } = useQuery<HeroesData>({ queryKey: ["/api/heroes"] });
  const { data: spiritData } = useQuery<SpiritSkillsData>({ queryKey: ["/api/spirit-skills"] });
  const { data: titanElementsRaw } = useQuery<TitanElementsData[]>({ queryKey: ["/api/titan-elements"] });
  const { data: battlesData } = useQuery<{
    attackTeams: Array<{ bossId: number | null; invasionId: number | null }>;
    battles: Array<{ gameId: number; chapterNumber: number; battleNumber: string; legacyBattleNum: number | null }>;
  }>({ queryKey: ["/api/battles"] });

  // ─── Derived info ──────────────────────────────────────────────────────────

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

  const titanPool = useMemo(() => {
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

  const titanIconMap = useMemo(() => {
    if (!heroesData) return new Map<number, string>();
    return new Map(heroesData.heroIcons.map(h => [h.heroId, h.iconUrl]));
  }, [heroesData]);

  const titanNameMap = useMemo(() => {
    if (!heroesData) return new Map<number, string>();
    return new Map(heroesData.heroNames.map(h => [h.heroId, h.name]));
  }, [heroesData]);

  const elementsMap = useMemo(() => {
    if (!titanElementsRaw) return new Map<number, { element: string; points: number }>();
    return new Map(titanElementsRaw.map(t => [t.titanId, { element: t.element, points: t.points }]));
  }, [titanElementsRaw]);

  const allSpiritSkills = useMemo(() => {
    if (!spiritData) return [];
    const iconMap = new Map(spiritData.spiritIcons.map(s => [s.skillId, s.iconUrl]));
    return spiritData.spiritSkills.map(s => ({
      skillId: s.skillId,
      name: s.name,
      skillType: s.skillType,
      icon: iconMap.get(s.skillId),
    })).sort((a, b) => a.skillId - b.skillId);
  }, [spiritData]);

  const elementalSkills = useMemo(() => allSpiritSkills.filter(s => !s.skillType || s.skillType === "elemental"), [allSpiritSkills]);
  const primalSkills = useMemo(() => allSpiritSkills.filter(s => !s.skillType || s.skillType === "primal"), [allSpiritSkills]);

  // ─── State ─────────────────────────────────────────────────────────────────

  const [selectedChapter, setSelectedChapter] = useState<number>(battle.chapterNumber);
  const [selectedBattle, setSelectedBattle] = useState<number>(initialBattleNum);
  const [titans, setTitans] = useState<TitanEntry[]>(() => buildInitTitans(battle.team, battle.chapterNumber));
  const [totemSkills, setTotemSkills] = useState<Record<string, TotemSkillState>>({});
  const [mainBuff, setMainBuff] = useState<number>(CHAPTER_DEFAULT_BUFF[battle.chapterNumber] ?? 0);
  const [mainBuffType, setMainBuffType] = useState<"A" | "B" | null>("A");
  const [generatedJson, setGeneratedJson] = useState<string | null>(null);
  const [totemWarnings, setTotemWarnings] = useState<string[]>([]);
  const [pickerOpenIdx, setPickerOpenIdx] = useState<number | null>(null);

  // ─── Active totems (recalculated on titan changes) ────────────────────────

  const activeTotems = useMemo(() => calcActiveTotems(titans, elementsMap), [titans, elementsMap]);

  // ─── Reset when modal opens ────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setSelectedChapter(battle.chapterNumber);
      setSelectedBattle(initialBattleNum);
      setTitans(buildInitTitans(battle.team, battle.chapterNumber));
      setTotemSkills({});
      setGeneratedJson(null);
      setPickerOpenIdx(null);
      if (initialItem) {
        const savedBuff = initialItem.mainBuff ?? 0;
        setMainBuff(savedBuff);
        setMainBuffType(savedBuff > 0 ? "A" : null);
      } else {
        setMainBuff(CHAPTER_DEFAULT_BUFF[battle.chapterNumber] ?? 0);
        setMainBuffType("A");
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Clear totem skill state for newly inactive totems ────────────────────

  useEffect(() => {
    setTotemSkills(prev => {
      const next: Record<string, TotemSkillState> = {};
      for (const el of activeTotems) {
        next[el] = prev[el] || { elementalFragments: 1, primalFragments: 1 };
      }
      return next;
    });
  }, [activeTotems.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── When chapter changes, update buff ────────────────────────────────────

  const handleChapterChange = (ch: number) => {
    setSelectedChapter(ch);
    setMainBuff(CHAPTER_DEFAULT_BUFF[ch] ?? 0);
  };

  // ─── Derived recommendations ───────────────────────────────────────────────

  const maxGrade = recommendedMaxGrade(selectedChapter);
  const recommendedBossLevel = BATTLE_BOSS_LEVEL[selectedBattle] ?? null;

  // ─── Titan editing helpers ─────────────────────────────────────────────────

  const replaceTitan = (idx: number, newTitanId: number) => {
    const name = titanNameMap.get(newTitanId) || `ID ${newTitanId}`;
    const icon = titanIconMap.get(newTitanId);
    setTitans(prev => prev.map((t, i) => i === idx ? { ...t, titanId: newTitanId, name, icon } : t));
  };

  const setTitanGrade = (idx: number, grade: Grade) => {
    const count = randomFragmentCount(grade);
    setTitans(prev => prev.map((t, i) => i === idx ? { ...t, grade, fragmentCount: count } : t));
  };

  const setTitanFragments = (idx: number, count: number) => {
    const grade = gradeFromCount(count);
    setTitans(prev => prev.map((t, i) => i === idx ? { ...t, fragmentCount: count, grade } : t));
  };

  const updateTotemSkill = (element: string, field: keyof TotemSkillState, value: number | undefined) => {
    setTotemSkills(prev => ({
      ...prev,
      [element]: { ...(prev[element] || { elementalFragments: 1, primalFragments: 1 }), [field]: value },
    }));
  };

  useEffect(() => { setTotemWarnings([]); }, [activeTotems, totemSkills]);

  // ─── Generate JSON ─────────────────────────────────────────────────────────

  const generateJson = () => {
    const warnings: string[] = [];
    for (const elRu of activeTotems) {
      const sk = totemSkills[elRu];
      if (!sk?.elementalSkillId) warnings.push(`Тотем "${elRu}": не выбран элементальный дух`);
      if (!sk?.primalSkillId) warnings.push(`Тотем "${elRu}": не выбран первичный дух`);
    }
    setTotemWarnings(warnings);

    const filledTitans = titans.filter(t => t.titanId !== 0);
    const units = filledTitans.map(t => t.titanId);
    const fragments: Record<string, number> = {};

    for (const t of filledTitans) {
      fragments[t.titanId.toString()] = t.fragmentCount;
    }

    // Build spirits object
    const spirits: Record<string, Record<string, number> | []> = {};
    for (const elRu of ALL_ELEMENTS) {
      const elEn = ELEMENT_EN[elRu];
      if (activeTotems.includes(elRu)) {
        const sk = totemSkills[elRu];
        const totemObj: Record<string, number> = {};
        if (sk?.elementalSkillId) {
          totemObj["elemental"] = sk.elementalSkillId;
          fragments[sk.elementalSkillId.toString()] = sk.elementalFragments || 1;
        }
        if (sk?.primalSkillId) {
          totemObj["primal"] = sk.primalSkillId;
          fragments[sk.primalSkillId.toString()] = sk.primalFragments || 1;
        }
        spirits[elEn] = totemObj;
      } else {
        // Only include inactive elements that had points (appeared in battle totems)
        const hasPoints = titans.some(t => {
          const data = elementsMap.get(t.titanId);
          return data?.element === elRu;
        });
        if (hasPoints) {
          spirits[elEn] = [];
        }
      }
    }

    const effects: Record<string, number> = {};
    if (mainBuff > 0 && mainBuffType === "A") {
      effects[`${MAIN_BUFF_KEY_A}_${mainBuff}`] = mainBuff;
    } else if (mainBuff > 0 && mainBuffType === "B") {
      effects[`${MAIN_BUFF_KEY_B}_${mainBuff}`] = mainBuff;
    }

    const result = {
      units,
      petId: null,
      favor: [],
      spirits,
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
    existing.push({
      id: Date.now(),
      battleGameId: battle.gameId,
      chapterNumber: selectedChapter,
      battleType: battle.type,
      label: battle.originalLabel,
      json: generatedJson,
      createdAt: new Date().toISOString(),
    });
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

  const handleAddToCollection = () => {
    if (!generatedJson || !onAddToCollection) return;
    const filledTitans = titans.filter(t => t.titanId !== 0);
    const recId = chapterBattleToGameId.get(`${selectedChapter}-${selectedBattle}`) ?? battle.gameId;
    const item: CollectedItem = {
      id: `variant-${battle.gameId}-${Date.now()}`,
      type: "variant",
      gameId: recId,
      label: `Вариант #${recId}`,
      desc: "",
      battleType: battle.type,
      team: filledTitans.map(t => ({
        heroId: t.titanId,
        name: titanNameMap.get(t.titanId) || t.name || `ID ${t.titanId}`,
        icon: titanIconMap.get(t.titanId) || t.icon,
      })),
      rawDefendersFragments: generatedJson,
      mainBuff: mainBuffType ? mainBuff : undefined,
    };
    onAddToCollection(item);
    onClose();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl" data-testid="dialog-titan-variant-editor">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-amber-500" />
            Редактор варианта (Титаны) — #{battle.gameId}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto pr-1">
        <div className="space-y-4">

          {/* ── Target chapter/battle selector ── */}
          <div className="flex items-center gap-3 flex-wrap bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
            <span className="text-xs font-semibold text-foreground">Создать вариант для:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Глава</span>
              <Select value={selectedChapter.toString()} onValueChange={(v) => handleChapterChange(parseInt(v))}>
                <SelectTrigger className="h-7 w-16 text-xs" data-testid="select-titan-chapter">
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
                <SelectTrigger className="h-7 w-16 text-xs" data-testid="select-titan-battle">
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

          {/* ── Titans ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Титаны</h3>
            {titans.map((titan, idx) => {
              const isEmpty = titan.titanId === 0;
              const isOverGrade = !isEmpty && GRADE_ORDER[titan.grade] > GRADE_ORDER[maxGrade];
              const elementData = !isEmpty ? elementsMap.get(titan.titanId) : undefined;

              if (isEmpty && pickerOpenIdx !== idx) {
                return (
                  <div key={idx} className="border border-dashed rounded-lg" data-testid={`titan-row-${idx}`}>
                    <button
                      className="w-full flex items-center gap-2 p-3 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors rounded-lg"
                      onClick={() => setPickerOpenIdx(idx)}
                      data-testid={`button-pick-titan-${idx}`}
                    >
                      <div className="h-10 w-10 border-2 border-dashed border-amber-400/30 rounded-full flex items-center justify-center">
                        <Plus className="h-4 w-4" />
                      </div>
                      <span className="text-sm">Слот {idx + 1} — нажмите для выбора титана</span>
                    </button>
                  </div>
                );
              }

              if (isEmpty && pickerOpenIdx === idx) {
                return (
                  <div key={idx} className="border border-dashed rounded-lg p-3 space-y-2" data-testid={`titan-row-${idx}`}>
                    <HeroPicker
                      isHeroic={false}
                      allHeroes={[]}
                      allTitans={titanPool}
                      currentHeroId={0}
                      onSelect={(id) => { replaceTitan(idx, id); setPickerOpenIdx(null); }}
                      onClose={() => setPickerOpenIdx(null)}
                    />
                  </div>
                );
              }

              return (
                <div key={idx} className="border rounded-lg p-3 space-y-2" data-testid={`titan-row-${idx}`}>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="focus:outline-none"
                          onClick={() => setPickerOpenIdx(pickerOpenIdx === idx ? null : idx)}
                          data-testid={`button-pick-titan-${idx}`}
                        >
                          <Avatar className="h-10 w-10 border-2 border-amber-400/50 hover:border-amber-400 transition-colors">
                            {titan.icon ? <AvatarImage src={titan.icon} alt={titan.name} /> : null}
                            <AvatarFallback className="text-xs">{titan.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">Нажмите для замены</TooltipContent>
                    </Tooltip>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{titan.name}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground">ID: {titan.titanId}</p>
                        {elementData && (
                          <span className="text-xs text-muted-foreground">
                            {ELEMENT_EMOJI[elementData.element]} {ELEMENT_RU[elementData.element]} ({elementData.points})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Select
                        value={titan.grade}
                        onValueChange={(v) => setTitanGrade(idx, v as Grade)}
                      >
                        <SelectTrigger className="h-8 w-[150px] text-xs" data-testid={`select-titan-grade-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="purple"><span className="text-purple-500">Фиолетовый (1-2)</span></SelectItem>
                          <SelectItem value="orange"><span className="text-orange-500">Оранжевый (3-6)</span></SelectItem>
                          <SelectItem value="red"><span className="text-red-500">Красный (7+)</span></SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={titan.fragmentCount}
                        onChange={(e) => setTitanFragments(idx, Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                        className="h-8 w-14 text-xs text-center"
                        data-testid={`input-titan-fragments-${idx}`}
                      />
                    </div>

                    {isOverGrade && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          Прокачка выше рекомендованной для главы {selectedChapter} (макс: {GRADE_LABELS[maxGrade]})
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {pickerOpenIdx === idx && (
                    <HeroPicker
                      isHeroic={false}
                      allHeroes={[]}
                      allTitans={titanPool}
                      currentHeroId={titan.titanId}
                      onSelect={(id) => { replaceTitan(idx, id); setPickerOpenIdx(null); }}
                      onClose={() => setPickerOpenIdx(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Totems ── */}
          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold flex-1">Тотемы духов</h3>
              <span className="text-xs text-muted-foreground">Активных: {activeTotems.length}/2</span>
            </div>

            {/* All elements status */}
            <div className="flex flex-wrap gap-2">
              {ALL_ELEMENTS.map(el => {
                const isActive = activeTotems.includes(el);
                const pts = titans.reduce((sum, t) => {
                  const d = elementsMap.get(t.titanId);
                  return d?.element === el ? sum + d.points : sum;
                }, 0);
                const threshold = ELEMENT_THRESHOLDS[el];
                return (
                  <div
                    key={el}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${isActive ? "border-amber-400 bg-amber-400/10 text-foreground" : "border-muted text-muted-foreground opacity-50"}`}
                    data-testid={`totem-status-${el}`}
                  >
                    <span>{ELEMENT_EMOJI[el]}</span>
                    <span>{ELEMENT_RU[el]}</span>
                    <span className="font-mono">{pts}/{threshold}</span>
                  </div>
                );
              })}
            </div>

            {/* Active totem skill pickers */}
            {activeTotems.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Ни один тотем не активирован. Измените состав команды.</p>
            )}
            {activeTotems.map(el => {
              const sk = totemSkills[el] || { elementalFragments: 1, primalFragments: 1 };
              return (
                <div key={el} className="border border-amber-400/30 rounded-lg p-3 space-y-3 bg-amber-400/5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{ELEMENT_EMOJI[el]}</span>
                    <span className="text-sm font-semibold">{ELEMENT_RU[el]}</span>
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">Активен</Badge>
                  </div>

                  {/* Elemental skill */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Стихийный скил (elemental)</span>
                    <div className="flex items-center gap-2">
                      <Select
                        value={sk.elementalSkillId?.toString() || "__none__"}
                        onValueChange={(v) => updateTotemSkill(el, "elementalSkillId", v === "__none__" ? undefined : parseInt(v))}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1" data-testid={`select-elemental-${el}`}>
                          <SelectValue placeholder="Выбрать скил..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Не выбран —</SelectItem>
                          {elementalSkills.map(s => (
                            <SelectItem key={s.skillId} value={s.skillId.toString()}>
                              {s.name} ({s.skillId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {sk.elementalSkillId && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">фр.</span>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={sk.elementalFragments}
                            onChange={(e) => updateTotemSkill(el, "elementalFragments", Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                            className="h-8 w-14 text-xs text-center"
                            data-testid={`input-elemental-frags-${el}`}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primal skill */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Исконный скил (primal)</span>
                    <div className="flex items-center gap-2">
                      <Select
                        value={sk.primalSkillId?.toString() || "__none__"}
                        onValueChange={(v) => updateTotemSkill(el, "primalSkillId", v === "__none__" ? undefined : parseInt(v))}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1" data-testid={`select-primal-${el}`}>
                          <SelectValue placeholder="Выбрать скил..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Не выбран —</SelectItem>
                          {primalSkills.map(s => (
                            <SelectItem key={s.skillId} value={s.skillId.toString()}>
                              {s.name} ({s.skillId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {sk.primalSkillId && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">фр.</span>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={sk.primalFragments}
                            onChange={(e) => updateTotemSkill(el, "primalFragments", Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                            className="h-8 w-14 text-xs text-center"
                            data-testid={`input-primal-frags-${el}`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Buff ── */}
          <div className="flex items-center gap-3 border rounded-lg p-3 flex-wrap">
            <h3 className="text-sm font-semibold flex-1">Основной бафф</h3>
            <Select
              value={mainBuffType ?? "__none__"}
              onValueChange={(v) => setMainBuffType(v === "__none__" ? null : v as "A" | "B")}
            >
              <SelectTrigger className="h-8 w-[180px] text-xs" data-testid="select-titan-buff-type">
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
                data-testid="input-titan-main-buff"
              />
            )}
            <Badge variant="outline" className="text-xs">
              Рек. Гл.{selectedChapter}: {CHAPTER_DEFAULT_BUFF[selectedChapter] ?? 0}
            </Badge>
          </div>

          {/* ── Generate ── */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={generateJson} data-testid="button-titan-generate-json">
              <Wand2 className="h-4 w-4 mr-1" />
              Сгенерировать JSON
            </Button>
            {generatedJson && (
              <>
                <Button variant="outline" onClick={copyJson} data-testid="button-titan-copy-json">
                  <Copy className="h-4 w-4 mr-1" />
                  Скопировать
                </Button>
                <Button variant="outline" onClick={saveToLibrary} data-testid="button-titan-save-library">
                  <Save className="h-4 w-4 mr-1" />
                  В библиотеку
                </Button>
                <Button variant="outline" onClick={downloadLibrary} data-testid="button-titan-download-library">
                  <Download className="h-4 w-4 mr-1" />
                  Скачать библиотеку
                </Button>
                {onAddToCollection && (
                  <Button variant="default" onClick={handleAddToCollection} data-testid="button-titan-add-to-collection">
                    <Plus className="h-4 w-4 mr-1" />
                    В коллекцию
                  </Button>
                )}
              </>
            )}
          </div>

          {/* ── Totem warnings ── */}
          {totemWarnings.length > 0 && (
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-3 py-2 space-y-0.5" data-testid="totem-warnings">
              {totemWarnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
            </div>
          )}

          {/* ── JSON Preview ── */}
          {generatedJson && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-1.5 text-xs font-mono text-muted-foreground">
                defendersFragments
              </div>
              <ScrollArea className="h-48">
                <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all" data-testid="text-titan-json-preview">
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
