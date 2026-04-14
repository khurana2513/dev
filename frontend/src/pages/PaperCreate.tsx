import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, FileDown, XCircle, GripVertical, Copy, ChevronUp, ChevronDown, Play, ChevronDown as ChevronDownIcon, Save, Pencil, BookmarkPlus, Check, Share2, Link as LinkIcon, MessageCircle, Clock } from "lucide-react";
import { previewPaper, createPaper, generatePdf, PaperConfig, BlockConfig, GeneratedBlock, getUserPaperTemplates, createUserPaperTemplate, updateUserPaperTemplate, deleteUserPaperTemplate, UserPaperTemplate, sharePaper, SharedPaper } from "@/lib/api";
import { buildApiUrl, looksLikeHtmlDocument } from "@/lib/apiBase";
import { useAuth } from "@/contexts/AuthContext";
import MathQuestion from "@/components/MathQuestion";

// Helper function to generate section name based on block settings
function generateSectionName(block: BlockConfig): string {
  if (block.type === "addition") {
    return `Addition ${block.constraints.digits || 2}D ${block.constraints.rows || 2}R`;
  } else if (block.type === "subtraction") {
    return `Subtraction ${block.constraints.digits || 2}D ${block.constraints.rows || 2}R`;
  } else if (block.type === "add_sub") {
    return `Add/Sub ${block.constraints.digits || 2}D ${block.constraints.rows || 2}R`;
  } else if (block.type === "multiplication") {
    const multiplicand = block.constraints.multiplicandDigits || block.constraints.digits || 2;
    const multiplier = block.constraints.multiplierDigits || block.constraints.digits || 1;
    return `Multiplication ${multiplicand}X${multiplier}`;
  } else if (block.type === "division") {
    const dividend = block.constraints.dividendDigits || block.constraints.digits || 2;
    const divisor = block.constraints.divisorDigits || block.constraints.digits || 1;
    return `Division ${dividend}÷${divisor}`;
  } else if (block.type === "square_root") {
    const digits = block.constraints.rootDigits ?? 4;  // Default: 4
    return `Square Root (${digits} digits)`;
  } else if (block.type === "cube_root") {
    const digits = block.constraints.rootDigits ?? 5;  // Default: 5
    return `Cube Root (${digits} digits)`;
  } else if (block.type === "decimal_multiplication") {
    const multiplicand = block.constraints.multiplicandDigits || 2;
    const multiplier = block.constraints.multiplierDigits ?? 1;
    const multiplierLabel = multiplier === 0 ? "Whole" : multiplier;
    return `Decimal Multiplication (${multiplicand}×${multiplierLabel})`;
  } else if (block.type === "lcm") {
    const first = block.constraints.multiplicandDigits ?? 2;  // LCM first default: 2
    const second = block.constraints.multiplierDigits ?? 2;  // LCM second default: 2
    return `LCM (${first}×${second} digits)`;
  } else if (block.type === "gcd") {
    const first = block.constraints.multiplicandDigits ?? 3;  // GCD first default: 3
    const second = block.constraints.multiplierDigits ?? 2;  // GCD second default: 2
    return `GCD (${first}×${second} digits)`;
  } else if (block.type === "integer_add_sub") {
    return `Integer Add/Sub ${block.constraints.digits || 2}D ${block.constraints.rows || 3}R`;
  } else if (block.type === "decimal_add_sub") {
    return `Decimal Add/Sub ${block.constraints.digits || 2}D ${block.constraints.rows || 3}R`;
  } else if (block.type === "intl_add_sub") {
    const preset = block.constraints.intlAddSubPreset || "1_2";
    const presetLabel = preset === "1_2" ? "1&2D" : "2&3D";
    return `Intl Add/Sub Beta ${presetLabel} ${block.constraints.rows || 3}R`;
  } else if (block.type === "decimal_division") {
    const dividend = block.constraints.dividendDigits ?? 2;
    const divisor = block.constraints.divisorDigits ?? 1;
    return `Decimal Division (${dividend}÷${divisor})`;
  } else if (block.type === "direct_add_sub") {
    return `Direct Add/Sub ${block.constraints.digits || 1}D ${block.constraints.rows || 3}R`;
  } else if (block.type === "small_friends_add_sub") {
    return `Small Friends Add/Sub ${block.constraints.digits || 1}D ${block.constraints.rows || 3}R`;
  } else if (block.type === "big_friends_add_sub") {
    return `Big Friends Add/Sub ${block.constraints.digits || 1}D ${block.constraints.rows || 3}R`;
  } else if (block.type === "mix_friends_add_sub") {
    return `Mix Friends Add/Sub ${block.constraints.digits || 1}D ${block.constraints.rows || 3}R`;
  } else if (block.type === "percentage") {
    const pctMin = block.constraints.percentageMin ?? 1;
    const pctMax = block.constraints.percentageMax ?? 100;
    const numDigits = block.constraints.numberDigits ?? 4;
    return `Percentage (${pctMin}-${pctMax}%, ${numDigits} digits)`;
  } else if (block.type === "vedic_multiply_by_11") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 11 (${digits}D)`;
  } else if (block.type === "vedic_multiply_by_101") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 101 (${digits}D)`;
  } else if (block.type === "vedic_subtraction_complement") {
    const base = block.constraints.base ?? 100;
    return `Subtraction Complement (base ${base})`;
  } else if (block.type === "vedic_subtraction_normal") {
    const base = block.constraints.base ?? 100;
    return `Subtraction (base ${base})`;
  } else if (block.type === "vedic_multiply_by_12_19") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 12-19 (${digits}D)`;
  } else if (block.type === "vedic_special_products_base_100") {
    return `Special Products (Base 100)`;
  } else if (block.type === "vedic_special_products_base_50") {
    return `Special Products (Base 50)`;
  } else if (block.type === "vedic_multiply_by_21_91") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 21-91 (${digits}D)`;
  } else if (block.type === "vedic_addition") {
    const first = block.constraints.firstDigits ?? 2;
    const second = block.constraints.secondDigits ?? 2;
    return `Addition (${first}D + ${second}D)`;
  } else if (block.type === "vedic_multiply_by_2") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 2 (${digits}D)`;
  } else if (block.type === "vedic_multiply_by_4") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 4 (${digits}D)`;
  } else if (block.type === "vedic_divide_by_2") {
    const digits = block.constraints.digits ?? 2;
    return `Divide by 2 (${digits}D)`;
  } else if (block.type === "vedic_divide_by_4") {
    const digits = block.constraints.digits ?? 2;
    return `Divide by 4 (${digits}D)`;
  } else if (block.type === "vedic_divide_single_digit") {
    const digits = block.constraints.digits ?? 2;
    return `Divide Single Digit (${digits}D)`;
  } else if (block.type === "vedic_multiply_by_6") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 6 (${digits}D)`;
  } else if (block.type === "vedic_divide_by_11") {
    const digits = block.constraints.digits ?? 2;
    return `Divide by 11 (${digits}D)`;
  } else if (block.type === "vedic_squares_base_10") {
    return `Squares (Base 10)`;
  } else if (block.type === "vedic_squares_base_100") {
    return `Squares (Base 100)`;
  } else if (block.type === "vedic_squares_base_1000") {
    return `Squares (Base 1000)`;
  } else if (block.type === "vedic_tables") {
    const table = block.constraints.tableNumber ?? "111-999";
    return `Tables (${table})`;
  }
  // Vedic Maths Level 2 operations
  else if (block.type === "vedic_tables_large") {
    const table = block.constraints.tableNumberLarge ?? "1111-9999";
    return `Tables Large (${table})`;
  }
  else if (block.type === "vedic_fun_with_9_equal") {
    return `Fun with 9 (Equal)`;
  } else if (block.type === "vedic_fun_with_9_less_than") {
    return `Fun with 9 (Less Than)`;
  } else if (block.type === "vedic_fun_with_9_greater_than") {
    return `Fun with 9 (Greater Than)`;
  } else if (block.type === "vedic_fun_with_5") {
    return `Fun with 5`;
  } else if (block.type === "vedic_fun_with_10") {
    return `Fun with 10`;
  } else if (block.type === "vedic_multiply_by_1001") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 1001 (${digits}D)`;
  } else if (block.type === "vedic_multiply_by_5_25_125") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 5, 25, 125 (${digits}D)`;
  } else if (block.type === "vedic_divide_by_5_25_125") {
    const digits = block.constraints.digits ?? 2;
    return `Divide by 5, 25, 125 (${digits}D)`;
  } else if (block.type === "vedic_multiply_by_5_50_500") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 5, 50, 500 (${digits}D)`;
  } else if (block.type === "vedic_divide_by_5_50_500") {
    const digits = block.constraints.digits ?? 2;
    return `Divide by 5, 50, 500 (${digits}D)`;
  } else if (block.type === "vedic_subtraction_powers_of_10") {
    const power = block.constraints.powerOf10 ?? 2;
    return `Subtraction (Powers of 10, ${10**power})`;
  } else if (block.type === "vedic_special_products_base_1000") {
    return `Special Products (Base 1000)`;
  } else if (block.type === "vedic_special_products_cross_multiply") {
    return `Special Products (Cross Multiply)`;
  } else if (block.type === "vedic_special_products_cross_base") {
    return `Special Products (Cross Base)`;
  } else if (block.type === "vedic_special_products_cross_base_50") {
    return `Special Products (Cross Base 50)`;
  } else if (block.type === "vedic_duplex") {
    const digits = block.constraints.digits ?? 2;
    return `Find the Duplex (${digits}D)`;
  } else if (block.type === "vedic_squares_duplex") {
    const digits = block.constraints.digits ?? 2;
    return `Squares (Duplex Method, ${digits}D)`;
  } else if (block.type === "vedic_divide_with_remainder") {
    const digits = block.constraints.digits ?? 2;
    return `Divide (with remainder, ${digits}D)`;
  } else if (block.type === "vedic_divide_by_9s_repetition_equal") {
    return `Divide by 9's Repetition (Equal)`;
  } else if (block.type === "vedic_divide_by_9s_repetition_less_than") {
    return `Divide by 9's Repetition (Less Than)`;
  } else if (block.type === "vedic_divide_by_11s_repetition_equal") {
    return `Divide by 11's Repetition (Equal)`;
  } else if (block.type === "vedic_divide_by_11s_repetition_less_than") {
    return `Divide by 11's Repetition (Less Than)`;
  } else if (block.type === "vedic_divide_by_7") {
    const digits = block.constraints.digits ?? 2;
    return `Divide by 7 (${digits}D)`;
  } else if (block.type === "vedic_dropping_10_method") {
    return `Dropping 10 Method`;
  } else if (block.type === "vedic_vinculum") {
    return `Vinculum (Coming Soon)`;
  } else if (block.type === "vedic_devinculum") {
    return `DeVinculum (Coming Soon)`;
  }
  // Vedic Maths Level 3 operations
  else if (block.type === "vedic_multiply_by_111_999") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 111-999 (${digits}D)`;
  } else if (block.type === "vedic_multiply_by_102_109") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 102-109 (${digits}D)`;
  } else if (block.type === "vedic_multiply_by_112_119") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 112-119 (${digits}D)`;
  } else if (block.type === "vedic_multiplication") {
    const caseType = block.constraints.multiplicationCase || "mix";
    return `Multiplication (${caseType})`;
  } else if (block.type === "vedic_mix_multiplication") {
    return `Mix Multiplication (2x2x2)`;
  } else if (block.type === "vedic_combined_operation") {
    return `Combined Operation`;
  } else if (block.type === "vedic_fraction_simplification") {
    return `Fraction (Simplification)`;
  } else if (block.type === "vedic_fraction_addition") {
    const caseType = block.constraints.fractionCase || "mix";
    return `Fraction (Addition, ${caseType})`;
  } else if (block.type === "vedic_fraction_subtraction") {
    const caseType = block.constraints.fractionCase || "mix";
    return `Fraction (Subtraction, ${caseType})`;
  } else if (block.type === "vedic_squares_level3") {
    const digits = block.constraints.digits ?? 2;
    return `Squares (Repeating Digits, ${digits}D)`;
  } else if (block.type === "vedic_percentage_level3") {
    const pctMin = block.constraints.percentageMin ?? 1;
    const pctMax = block.constraints.percentageMax ?? 100;
    const numDigits = block.constraints.numberDigits ?? 4;
    return `Percentage (${pctMin}-${pctMax}%, ${numDigits} digits)`;
  } else if (block.type === "vedic_squares_addition") {
    const digits = block.constraints.digits ?? 2;
    return `Squares Addition (${digits}D)`;
  } else if (block.type === "vedic_squares_subtraction") {
    const digits = block.constraints.digits ?? 2;
    return `Squares Subtraction (${digits}D)`;
  } else if (block.type === "vedic_squares_deviation") {
    const digits = block.constraints.digits ?? 2;
    return `Squares (Deviation Method, ${digits}D)`;
  } else if (block.type === "vedic_cubes") {
    const digits = block.constraints.digits ?? 2;
    return `Cubes (${digits}D)`;
  } else if (block.type === "vedic_check_divisibility") {
    const divisor = block.constraints.divisorCheck ?? 2;
    return `Check The Divisibility (by ${divisor})`;
  } else if (block.type === "vedic_missing_numbers") {
    return `Missing Numbers`;
  } else if (block.type === "vedic_duplex_level3") {
    const digits = block.constraints.digits ?? 2;
    return `Find The Duplex (${digits}D)`;
  } else if (block.type === "vedic_squares_large") {
    const digits = block.constraints.digits ?? 5;
    return `Squares (Large Numbers, ${digits}D)`;
  } else if (block.type === "vedic_multiply_by_10001") {
    const digits = block.constraints.digits ?? 2;
    return `Multiply by 10001 (${digits}D)`;
  } else if (block.type === "vedic_box_multiply") {
    return `Box Multiply (Coming Soon)`;
  }
  // Vedic Maths Level 4 operations
  else if (block.type === "vedic_multiplication_level4") {
    const multiplicand = block.constraints.multiplicandDigits ?? 3;
    const multiplier = block.constraints.multiplierDigits ?? 2;
    return `Multiplication (${multiplicand}×${multiplier})`;
  } else if (block.type === "vedic_multiply_by_111_999_level4") {
    const multiplicand = block.constraints.multiplicandDigits ?? 3;
    const multiplier = block.constraints.multiplierDigits ?? 4;
    return `Multiplication (111-999, ${multiplicand}×${multiplier}D)`;
  } else if (block.type === "vedic_decimal_add_sub") {
    const digits = block.constraints.digits ?? 2;
    return `Decimal Add/Sub (${digits}D)`;
  } else if (block.type === "vedic_fun_with_5_level4") {
    const caseType = block.constraints.funWith5Case || "mix";
    return `Fun with Five (${caseType})`;
  } else if (block.type === "vedic_fun_with_10_level4") {
    const caseType = block.constraints.funWith10Case || "mix";
    return `Fun with Ten (${caseType})`;
  } else if (block.type === "vedic_find_x") {
    return `Find The Value of X`;
  } else if (block.type === "vedic_hcf") {
    const first = block.constraints.multiplicandDigits ?? 2;
    const second = block.constraints.multiplierDigits ?? 2;
    return `HCF (${first}×${second} digits)`;
  } else if (block.type === "vedic_lcm_level4") {
    const first = block.constraints.multiplicandDigits ?? 2;
    const second = block.constraints.multiplierDigits ?? 2;
    return `LCM (${first}×${second} digits)`;
  } else if (block.type === "vedic_bar_add_sub") {
    return `Bar Addition/Subtraction (Coming Soon)`;
  } else if (block.type === "vedic_fraction_multiplication") {
    return `Fraction (Multiplication)`;
  } else if (block.type === "vedic_fraction_division") {
    return `Fraction (Division)`;
  } else if (block.type === "vedic_check_divisibility_level4") {
    const caseType = block.constraints.divisibilityCase || "random";
    return `Check The Divisibility (${caseType})`;
  } else if (block.type === "vedic_division_without_remainder") {
    const dividend = block.constraints.dividendDigits ?? 2;
    const divisor = block.constraints.divisorDigits ?? 1;
    return `Division (without remainder, ${dividend}÷${divisor})`;
  } else if (block.type === "vedic_division_with_remainder") {
    const dividend = block.constraints.dividendDigits ?? 3;
    const divisor = block.constraints.divisorDigits ?? 1;
    return `Division (with remainder, ${dividend}÷${divisor})`;
  } else if (block.type === "vedic_divide_by_11_99") {
    const dividend = block.constraints.dividendDigits ?? 4;
    return `Divide By 11-99 (${dividend}D)`;
  } else if (block.type === "vedic_division_9_8_7_6") {
    const caseType = block.constraints.division9_8_7_6Case || "mix";
    return `Division (9, 8, 7, 6, case: ${caseType})`;
  } else if (block.type === "vedic_division_91_121") {
    const caseType = block.constraints.division91_121Case || "mix";
    return `Division (91, 121, case: ${caseType})`;
  } else if (block.type === "vedic_digital_sum") {
    const digits = block.constraints.digits ?? 4;
    return `Digital Sum (${digits}D)`;
  } else if (block.type === "vedic_cubes_base_method") {
    return `Cubes (Base Method)`;
  } else if (block.type === "vedic_check_perfect_cube") {
    const digits = block.constraints.digits ?? 4;
    return `Check The Perfect Cube (${digits}D)`;
  } else if (block.type === "vedic_cube_root_level4") {
    const digits = block.constraints.cubeRootDigits ?? 5;
    return `Cube Root (${digits} digits)`;
  } else if (block.type === "vedic_bodmas") {
    const difficulty = block.constraints.bodmasDifficulty || "medium";
    return `BODMAS (${difficulty})`;
  } else if (block.type === "vedic_square_root_level4") {
    const digits = block.constraints.rootDigits ?? 4;
    return `Square Root (${digits} digits)`;
  } else if (block.type === "vedic_magic_square") {
    return `Magic Square (Coming Soon)`;
  }
  return `Section`;
}

export default function PaperCreate() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const isJuniorPage = location === "/create/junior";
  const isAdvancedPage = location === "/create/advanced";
  const isBasicPage = location === "/create/basic";
  const isVedicLevel1 = location === "/vedic-maths/level-1";
  const isVedicLevel2 = location === "/vedic-maths/level-2";
  const isVedicLevel3 = location === "/vedic-maths/level-3";
  const isVedicLevel4 = location === "/vedic-maths/level-4";
  const isVedicPage = isVedicLevel1 || isVedicLevel2 || isVedicLevel3 || isVedicLevel4;
  
  // Check if Vedic Level 1 operations should be shown (route OR selected level)
  // Vedic operations are available for Custom mode and Vedic-Level-1 only
  
  // Redirect old /create route to /create/basic
  useEffect(() => {
    if (location === "/create") {
      setLocation("/create/basic");
    }
  }, [location, setLocation]);
  
  const [title, setTitle] = useState("Practice Paper");
  const [level, setLevel] = useState<PaperConfig["level"]>("Custom");
  const [blocks, setBlocks] = useState<BlockConfig[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);

  // ── Template state ────────────────────────────────────────────────────────
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalMode, setSaveModalMode] = useState<"create" | "update">("create");
  const [saveModalName, setSaveModalName] = useState("");
  const [saveModalError, setSaveModalError] = useState("");
  // Inline rename state
  const [renamingTemplateId, setRenamingTemplateId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  // Toast notification
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevents the level-change useEffect from firing preset loads when loading a template
  const skipPresetLoadRef = useRef(false);

  // Share paper state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareResult, setShareResult] = useState<SharedPaper | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const showToast = (msg: string, ok = true) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, ok });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  // Load templates (only when authenticated)
  const { data: templates = [] } = useQuery<UserPaperTemplate[]>({
    queryKey: ["userPaperTemplates"],
    queryFn: getUserPaperTemplates,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const MAX_TEMPLATES = 5;
  const atTemplateLimit = templates.length >= MAX_TEMPLATES;

  // Mutation: create template
  const createTemplateMutation = useMutation({
    mutationFn: createUserPaperTemplate,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["userPaperTemplates"] });
      setActiveTemplateId(created.id);
      setShowSaveModal(false);
      setSaveModalError("");
      showToast("Template saved!");
    },
    onError: (err: any) => {
      const raw = err instanceof Error ? err.message : String(err);
      const msg = raw.toLowerCase().includes("already exists")
        ? "A template with this name already exists — please choose a different name."
        : raw || "Failed to save template.";
      setSaveModalError(msg);
    },
  });

  // Mutation: update template
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateUserPaperTemplate>[1] }) =>
      updateUserPaperTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPaperTemplates"] });
      if (showSaveModal) {
        setShowSaveModal(false);
        setSaveModalError("");
        showToast("Template updated!");
      } else {
        setRenamingTemplateId(null);
        setRenameError("");
        showToast("Template renamed!");
      }
    },
    onError: (err: any) => {
      const raw = err instanceof Error ? err.message : String(err);
      const msg = raw.toLowerCase().includes("already exists")
        ? "A template with this name already exists — please choose a different name."
        : raw || "Failed to update template.";
      setSaveModalError(msg);
      setRenameError(msg);
    },
  });

  // Mutation: delete template
  const deleteTemplateMutation = useMutation({
    mutationFn: deleteUserPaperTemplate,
    onSuccess: (_v, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["userPaperTemplates"] });
      if (activeTemplateId === deletedId) setActiveTemplateId(null);
      showToast("Template deleted.");
    },
  });

  // Mutation: save paper for exams
  const savePaperMutation = useMutation({
    mutationFn: createPaper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      showToast("Paper saved for exams!");
    },
    onError: (err: any) => {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || "Failed to save paper.", false);
    },
  });

  // Mutation: share paper
  const shareMutation = useMutation({
    mutationFn: sharePaper,
    onSuccess: (result) => {
      setShareResult(result);
      setShareCopied(false);
    },
    onError: (err: any) => {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || "Failed to share paper.", false);
      setShowShareModal(false);
    },
  });

  const handleSharePaper = () => {
    if (!previewData) return;
    setShareResult(null);
    setShareCopied(false);
    setShowShareModal(true);
    shareMutation.mutate({
      paper_title: title || "Practice Paper",
      paper_level: level || "Custom",
      paper_config: {
        level: level || "Custom",
        title: title || "Practice Paper",
        totalQuestions: "20",
        blocks,
        orientation: "portrait",
      },
      generated_blocks: previewData.blocks,
      seed: previewData.seed,
    });
  };

  const handleSavePaper = () => {
    savePaperMutation.mutate({
      level: level || "Custom",
      title: title || "Practice Paper",
      totalQuestions: "20",
      blocks,
      orientation: "portrait",
    });
  };

  const getShareLink = () => {
    if (!shareResult) return "";
    return `${window.location.origin}/paper/shared/${shareResult.code}`;
  };

  const handleCopyShareLink = async () => {
    const link = getShareLink();
    try {
      await navigator.clipboard.writeText(link);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const link = getShareLink();
    const text = `Hey! Try this math paper I made on TalentHub: ${shareResult?.paper_title || "Practice Paper"}\n\nCode: ${shareResult?.code}\n\n${link}\n\nValid for 24 hours!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Load blocks from a saved template
  const handleLoadTemplate = (tplId: number) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    const shouldReplace =
      blocks.length === 0 ||
      window.confirm(
        "Loading a template will replace your current blocks. Continue?"
      );
    if (!shouldReplace) return;
    // Prevent the level-change useEffect from fetching preset blocks and overwriting template blocks
    skipPresetLoadRef.current = true;
    setActiveTemplateId(tpl.id);
    const tplLevel = (tpl.level as PaperConfig["level"]) || "Custom";
    setLevel(tplLevel);
    setTitle(tpl.name);
    // Convert raw JSON blocks back to BlockConfig[]
    const converted: BlockConfig[] = (tpl.blocks as any[]).map((b: any) => ({
      id: b.id || `block-${Date.now()}-${Math.random()}`,
      type: b.type,
      count: b.count ?? 10,
      constraints: b.constraints ?? {},
      title: b.title || "",
    }));
    setBlocks(converted);
    setStep(1);
    setPreviewData(null);
    setValidationErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Open save modal for new template
  const handleOpenSaveModal = () => {
    if (!isAuthenticated) return;
    setSaveModalMode("create");
    setSaveModalName(title || "");
    setSaveModalError("");
    setShowSaveModal(true);
  };

  // Open save modal targeted at updating existing template
  const handleOpenUpdateModal = () => {
    if (!activeTemplateId) return;
    const tpl = templates.find((t) => t.id === activeTemplateId);
    setSaveModalMode("update");
    setSaveModalName(tpl?.name || title || "");
    setSaveModalError("");
    setShowSaveModal(true);
  };

  // Submit the save modal
  const handleSaveModalSubmit = () => {
    const name = saveModalName.trim();
    if (!name) { setSaveModalError("Please enter a template name."); return; }
    if (name.length > 60) { setSaveModalError("Name must be 60 characters or fewer."); return; }
    if (blocks.length < 1) { setSaveModalError("Add at least 1 block before saving."); return; }
    const totalQ = blocks.reduce((s, b) => s + b.count, 0);
    if (totalQ < 10) { setSaveModalError("Template needs at least 10 questions in total."); return; }

    if (saveModalMode === "update" && activeTemplateId) {
      updateTemplateMutation.mutate({
        id: activeTemplateId,
        data: { name, level: level === "Custom" ? null : level, blocks },
      });
    } else {
      createTemplateMutation.mutate({
        name,
        level: level === "Custom" ? null : level,
        blocks,
      });
    }
  };

  // ── Track previous location to detect page changes ────────────────────────
  const previousLocationRef = useRef<string>(location);
  const isInitialMount = useRef<boolean>(true);
  const previousLevelRef = useRef<PaperConfig["level"] | null>(null);
  
  // Clear blocks when switching between different pages
  useEffect(() => {
    // Skip clearing on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousLocationRef.current = location;
      return;
    }
    
    // If location changed to a different page, clear everything
    if (previousLocationRef.current !== location) {
      console.log(`🔄 Clearing blocks: ${previousLocationRef.current} -> ${location}`);
      setBlocks([]);
      setStep(1);
      setPreviewData(null);
      setValidationErrors({});
      setLevel("Custom"); // Reset level to Custom when switching pages
      setActiveTemplateId(null);
    }
    
    previousLocationRef.current = location;
  }, [location]);
  
  // Reset level to Custom when switching to Vedic pages (level selection is now manual via dropdown)
  // No automatic level setting - users select level via dropdown
  
  // Load preset blocks when level changes (but not on initial mount if Custom)
  useEffect(() => {
    // Skip when level was changed by a template load — template already set its own blocks
    if (skipPresetLoadRef.current) {
      skipPresetLoadRef.current = false;
      return;
    }
    // Check if level has presets: AB-1 through AB-10, Junior, Advanced, Vedic-Level-1, Vedic-Level-2
    const hasPresets = level.startsWith("AB-") || level === "Junior" || level === "Advanced" || level === "Vedic-Level-1" || level === "Vedic-Level-2";
    
    // AbortController to cancel in-flight requests when level changes
    const abortController = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (hasPresets && level !== "Custom") {
      console.log(`🟦 [PRESETS] Loading preset blocks for level: ${level}`);
      setLoadingPresets(true);
      setBlocks([]); // Clear blocks while loading

      // On native Android/iOS use the public backend URL; on web nginx proxies /api
      const loadPresets = async () => {
        const url = buildApiUrl(`/presets/${encodeURIComponent(level)}`);
        console.log(`🟦 [PRESETS] Fetching from: ${url}`);

        timeoutId = setTimeout(() => {
          console.log(`⏱️ [PRESETS] Request timeout after 10s, aborting...`);
          abortController.abort();
        }, 10000);

        return fetch(url, { signal: abortController.signal });
      };

      loadPresets()
        .then(async res => {
          if (timeoutId) clearTimeout(timeoutId);
          console.log(`🟦 [PRESETS] Response status: ${res.status} ${res.statusText}`);
          const text = await res.text();
          console.log(`🟦 [PRESETS] Response text (first 200 chars):`, text.substring(0, 200));
          if (!res.ok) {
            throw new Error(`Failed to load presets: ${res.status} ${res.statusText} - ${text}`);
          }
          if (!text) {
            throw new Error("Empty response from server");
          }
          if (looksLikeHtmlDocument(text)) {
            throw new Error(`Preset request returned HTML instead of JSON from ${url}`);
          }
          return JSON.parse(text);
        })
        .then(data => {
          // Check if request was aborted
          if (abortController.signal.aborted) {
            console.log(`🟦 [PRESETS] Request was aborted, ignoring response`);
            return;
          }
          
          console.log(`🟦 [PRESETS] Received data:`, data);
          console.log(`🟦 [PRESETS] Received ${data?.length || 0} blocks`);
          if (data && Array.isArray(data) && data.length > 0) {
            // Convert backend format to frontend format
            const convertedBlocks: BlockConfig[] = data.map((block: any) => ({
              id: block.id || `block-${Date.now()}-${Math.random()}`,
              type: block.type,
              count: block.count || 10,
              constraints: {
                // Use nullish coalescing to handle null/undefined values properly
                digits: block.constraints?.digits ?? undefined,
                rows: block.constraints?.rows ?? undefined,
                allowBorrow: block.constraints?.allowBorrow ?? undefined,
                allowCarry: block.constraints?.allowCarry ?? undefined,
                minAnswer: block.constraints?.minAnswer ?? undefined,
                maxAnswer: block.constraints?.maxAnswer ?? undefined,
                dividendDigits: block.constraints?.dividendDigits ?? undefined,
                divisorDigits: block.constraints?.divisorDigits ?? undefined,
                multiplicandDigits: block.constraints?.multiplicandDigits ?? undefined,
                multiplierDigits: block.constraints?.multiplierDigits ?? undefined,
                rootDigits: block.constraints?.rootDigits ?? undefined,
                percentageMin: block.constraints?.percentageMin ?? undefined,
                percentageMax: block.constraints?.percentageMax ?? undefined,
                numberDigits: block.constraints?.numberDigits ?? undefined,
                // Vedic Maths constraints
                base: block.constraints?.base ?? undefined,
                firstDigits: block.constraints?.firstDigits ?? undefined,
                secondDigits: block.constraints?.secondDigits ?? undefined,
                multiplier: block.constraints?.multiplier ?? undefined,
                multiplierRange: block.constraints?.multiplierRange ?? undefined,
                divisor: block.constraints?.divisor ?? undefined,
                tableNumber: block.constraints?.tableNumber ?? undefined,
              },
              title: block.title || "",
            }));
            console.log(`🟦 [PRESETS] Converted ${convertedBlocks.length} blocks, setting state...`);
            console.log(`🟦 [PRESETS] First block:`, convertedBlocks[0]);
            setBlocks(convertedBlocks);
            console.log(`✅ [PRESETS] Successfully loaded ${convertedBlocks.length} preset blocks`);
          } else {
            console.warn(`⚠️ [PRESETS] No blocks received or empty array for level: ${level}`);
            setBlocks([]);
          }
        })
        .catch(err => {
          if (timeoutId) clearTimeout(timeoutId);
          // Ignore abort errors (they're expected when level changes)
          if (err.name === 'AbortError') {
            console.log(`🟦 [PRESETS] Request aborted (level changed)`);
            return;
          }
          console.error("❌ [PRESETS] Failed to load preset blocks:", err);
          console.error("❌ [PRESETS] Error details:", err.message, err.stack);
          // On error, just keep current blocks (likely empty for first load)
          setBlocks([]);
        })
        .finally(() => {
          if (timeoutId) clearTimeout(timeoutId);
          // Only update loading state if request wasn't aborted
          if (!abortController.signal.aborted) {
            console.log(`🟦 [PRESETS] Loading complete, setting loadingPresets to false`);
            setLoadingPresets(false);
          }
        });
    } else if (level === "Custom") {
      // Clear blocks when switching to Custom
      console.log(`🟦 [PRESETS] Custom level selected, clearing blocks`);
      setBlocks([]);
      setLoadingPresets(false);
    } else {
      setLoadingPresets(false);
    }
    
    // Reset to Custom if level doesn't match the page:
    // - Junior page: only allow "Junior"
    // - Advanced page: allow "Advanced" and "AB-7" through "AB-10"
    // - Basic page: allow "AB-1" through "AB-6"
    if (isJuniorPage && level !== "Junior") {
      setLevel("Custom");
      setBlocks([]);
      setLoadingPresets(false);
    } else if (isAdvancedPage) {
      // On Advanced page, allow "Advanced" and "AB-7" through "AB-10"
      if (level !== "Advanced" && level !== "Custom") {
        if (level.startsWith("AB-")) {
          const abNumber = parseInt(level.split("-")[1]);
          if (abNumber < 7 || abNumber > 10) {
            // Reset if AB-1 through AB-6
            setLevel("Custom");
            setBlocks([]);
            setLoadingPresets(false);
          }
        } else {
          // Reset if not Advanced, not Custom, and not AB-X
          setLevel("Custom");
          setBlocks([]);
          setLoadingPresets(false);
        }
      }
    } else if (isBasicPage && level.startsWith("AB-")) {
      // On Basic page, only allow AB-1 through AB-6
      const abNumber = parseInt(level.split("-")[1]);
      if (abNumber > 6) {
        // Reset if AB-7 or higher
        setLevel("Custom");
        setBlocks([]);
        setLoadingPresets(false);
      }
    }
    // Note: Each page allows its respective preset levels
    
    // Cleanup: abort request if level changes
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [level, isBasicPage, isJuniorPage, isAdvancedPage]);

  // Helper function to get level display name
  const getLevelDisplayName = (level: PaperConfig["level"]): string => {
    if (level === "Custom") return "";
    if (level.startsWith("AB-")) {
      const levelNum = parseInt(level.split("-")[1]);
      if (levelNum >= 1 && levelNum <= 6) {
        return `Basic Level ${levelNum}`;
      } else if (levelNum >= 7 && levelNum <= 10) {
        return `Advanced Level ${levelNum}`;
      }
    }
    return "";
  };

  // Update title when level changes (for preset levels)
  useEffect(() => {
    if (level !== "Custom") {
      const levelDisplayName = getLevelDisplayName(level);
      if (levelDisplayName) {
        setTitle(prevTitle => {
          // Remove any existing level name from title
          const baseTitle = prevTitle.replace(/\s*-\s*(Basic|Advanced)\s+Level\s+\d+/, "").trim();
          // Add level name if not already present
          if (!baseTitle.includes(levelDisplayName)) {
            return `${baseTitle} - ${levelDisplayName}`;
          }
          return prevTitle; // Keep as is if level name already present
        });
      }
    } else {
      // Remove level name when switching to Custom
      setTitle(prevTitle => {
        return prevTitle.replace(/\s*-\s*(Basic|Advanced)\s+Level\s+\d+/, "").trim();
      });
    }
  }, [level]); // Only depend on level, not title to avoid loops

  // Update block types and titles when Vedic level changes
  useEffect(() => {
    // Skip on initial mount or if level hasn't actually changed
    if (previousLevelRef.current === null) {
      previousLevelRef.current = level;
      return;
    }

    // Only update if level actually changed, we're on a Vedic page, have blocks, and level is a Vedic level
    if (previousLevelRef.current === level || !isVedicPage || blocks.length === 0 || !level.startsWith("Vedic-Level-")) {
      previousLevelRef.current = level;
      return;
    }

    // Determine the first operation for the new level
    let defaultType: BlockConfig["type"];
    let defaultConstraints: any = {
      digits: 2,
      rows: 5,
      multiplicandDigits: 2,
      multiplierDigits: 1,
      dividendDigits: 2,
      divisorDigits: 1
    };

    if (level === "Vedic-Level-2") {
      defaultType = "vedic_fun_with_9_equal";
    } else if (level === "Vedic-Level-3") {
      defaultType = "vedic_multiply_by_111_999";
      defaultConstraints.digits = 2;
    } else if (level === "Vedic-Level-4") {
      defaultType = "vedic_multiplication_level4";
      defaultConstraints.multiplicandDigits = 3;
      defaultConstraints.multiplierDigits = 2;
    } else if (level === "Vedic-Level-1") {
      defaultType = "vedic_multiply_by_11";
      defaultConstraints.digits = 2;
    } else {
      previousLevelRef.current = level;
      return; // Unknown level, don't update
    }

    // Update all blocks to use the new level's first operation
    setBlocks(prevBlocks => {
      const updatedBlocks = prevBlocks.map(block => {
        const updatedBlock: BlockConfig = {
          ...block,
          type: defaultType,
          constraints: defaultConstraints,
          title: generateSectionName({ ...block, type: defaultType, constraints: defaultConstraints } as BlockConfig),
        };
        return updatedBlock;
      });
      return updatedBlocks;
    });

    previousLevelRef.current = level;
  }, [level, isVedicPage, blocks.length]); // Include blocks.length to detect when blocks are added/removed

  const [previewData, setPreviewData] = useState<{ blocks: GeneratedBlock[]; seed: number } | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState(false);
  // Validation errors: { blockIndex: { fieldName: errorMessage } }
  const [validationErrors, setValidationErrors] = useState<Record<number, Record<string, string>>>({});


  const previewMutation = useMutation({
    mutationFn: previewPaper,
    onSuccess: (data) => {
      try {
        console.log("✅ [PREVIEW] Preview generation successful:", data);
        if (!data || !data.blocks || !Array.isArray(data.blocks)) {
          throw new Error("Invalid preview data received from server");
        }
      setPreviewData(data);
      setStep(2);
      setShowAnswers(false); // Reset answers visibility when generating new preview
      // Scroll to top when preview is generated
      window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error("❌ [PREVIEW] Error processing preview data:", err);
        // Don't change step, show error
      }
    },
    onError: (error) => {
      console.error("❌ [PREVIEW] Preview generation failed:", error);
      // Keep step at 1 so user can fix and retry
      setStep(1);
      // Error will be displayed in the UI via previewMutation.error
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async ({ withAnswers, answersOnly, includeSeparateAnswerKey }: { withAnswers: boolean; answersOnly?: boolean; includeSeparateAnswerKey?: boolean }) => {
      if (!previewData) throw new Error("No preview data");
      const config: PaperConfig = {
        level: level || "Custom",
        title: title || "Math Paper",
        totalQuestions: "20",
        blocks,
        orientation: "portrait",
      };
      const blob = await generatePdf(config, withAnswers, previewData.seed, previewData.blocks, answersOnly, includeSeparateAnswerKey);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let filename = title || "paper";
      if (answersOnly) {
        filename += "_answers_only";
      } else if (withAnswers) {
        filename += "_with_answers";
      } else if (includeSeparateAnswerKey) {
        filename += "_with_answer_key";
      }
      a.download = `${filename}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const addBlock = () => {
    // Determine default type based on page/level
    let defaultType: BlockConfig["type"];
    
    if (isVedicPage) {
      // Check the selected level state first (user's selection takes priority)
      if (level === "Vedic-Level-2") {
        // Vedic Level 2: first operation is "vedic_fun_with_9_equal"
        defaultType = "vedic_fun_with_9_equal";
      } else if (level === "Vedic-Level-3") {
        // Vedic Level 3: first operation is "vedic_multiply_by_111_999"
        defaultType = "vedic_multiply_by_111_999";
      } else if (level === "Vedic-Level-4") {
        // Vedic Level 4: first operation is "vedic_multiplication_level4"
        defaultType = "vedic_multiplication_level4";
      } else if (level === "Vedic-Level-1" || isVedicLevel1 || (level === "Custom" && isVedicLevel1)) {
        // Vedic Level 1: first operation is "vedic_multiply_by_11"
        defaultType = "vedic_multiply_by_11";
      } else if (level === "Custom" && isVedicLevel2) {
        // Custom mode on Level 2 route
        defaultType = "vedic_fun_with_9_equal";
      } else if (level === "Custom" && isVedicLevel3) {
        // Custom mode on Level 3 route
        defaultType = "vedic_multiply_by_111_999";
      } else if (level === "Custom" && isVedicLevel4) {
        // Custom mode on Level 4 route
        defaultType = "vedic_multiplication_level4";
      } else {
        // Fallback: default to Level 1 operation
        defaultType = "vedic_multiply_by_11";
      }
    } else if (isJuniorPage) {
      defaultType = "direct_add_sub";
    } else {
      defaultType = "add_sub";
    }
    
    // Set default constraints based on block type
    const defaultConstraints: any = {
      digits: isJuniorPage ? 1 : 2,
      rows: isJuniorPage ? 3 : 5,
      multiplicandDigits: 2,
      multiplierDigits: 1,
      dividendDigits: 2,
      divisorDigits: 1
    };
    
    // Type-specific defaults
    if (defaultType === "vedic_multiply_by_11") {
      defaultConstraints.digits = 2;
    } else if (defaultType === "vedic_multiply_by_111_999") {
      defaultConstraints.digits = 2;
    } else if (defaultType === "vedic_multiplication_level4") {
      defaultConstraints.multiplicandDigits = 3;
      defaultConstraints.multiplierDigits = 2;
    }
    
    const newBlock: BlockConfig = {
      id: `block-${Date.now()}`,
      type: defaultType,
      count: 10,
      constraints: defaultConstraints,
      title: generateSectionName({ type: defaultType, constraints: defaultConstraints, count: 10, id: "", title: "" } as BlockConfig),
    };
    setBlocks([...blocks, newBlock]);
  };

  const addBlockAfter = (index: number) => {
    let defaultType: BlockConfig["type"];
    if (isVedicPage) {
      if (level === "Vedic-Level-2") defaultType = "vedic_fun_with_9_equal";
      else if (level === "Vedic-Level-3") defaultType = "vedic_multiply_by_111_999";
      else if (level === "Vedic-Level-4") defaultType = "vedic_multiplication_level4";
      else defaultType = "vedic_multiply_by_11";
    } else if (isJuniorPage) {
      defaultType = "direct_add_sub";
    } else {
      defaultType = "add_sub";
    }
    const defaultConstraints: any = {
      digits: isJuniorPage ? 1 : 2,
      rows: isJuniorPage ? 3 : 5,
      multiplicandDigits: 2,
      multiplierDigits: 1,
      dividendDigits: 2,
      divisorDigits: 1,
    };
    const newBlock: BlockConfig = {
      id: `block-${Date.now()}`,
      type: defaultType,
      count: 10,
      constraints: defaultConstraints,
      title: generateSectionName({ type: defaultType, constraints: defaultConstraints, count: 10, id: "", title: "" } as BlockConfig),
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
  };


  const updateBlock = (index: number, updates: Partial<BlockConfig>) => {
    const newBlocks = [...blocks];
    const oldBlock = newBlocks[index];
    const updatedBlock = { ...oldBlock, ...updates };
    
    // Auto-set default constraints when type changes
    if (updates.type !== undefined && updates.type !== oldBlock.type) {
      // Initialize constraints if not present
      if (!updatedBlock.constraints) {
        updatedBlock.constraints = {};
      }
      
      // Set default constraints based on block type
      // Always reset rootDigits when switching to/from square_root or cube_root
      if (updates.type === "square_root") {
        updatedBlock.constraints.rootDigits = 4;  // Square root default: 4
      } else if (updates.type === "cube_root") {
        updatedBlock.constraints.rootDigits = 5;  // Cube root default: 5
      } else if (updates.type === "lcm") {
        // Always reset to LCM defaults when switching to LCM
        updatedBlock.constraints.multiplicandDigits = 2;  // LCM first: 2
        updatedBlock.constraints.multiplierDigits = 2;  // LCM second: 2
      } else if (updates.type === "gcd") {
        // Always reset to GCD defaults when switching to GCD
        updatedBlock.constraints.multiplicandDigits = 3;  // GCD first: 3
        updatedBlock.constraints.multiplierDigits = 2;  // GCD second: 2
      } else if (updates.type === "percentage") {
        // Always reset to percentage default when switching to percentage
        updatedBlock.constraints.percentageMin = 1;  // Percentage min: 1
        updatedBlock.constraints.percentageMax = 100;  // Percentage max: 100
        updatedBlock.constraints.numberDigits = 4;  // Percentage numberDigits: 4
      } else if (updates.type === "vedic_tables") {
        // Always reset to vedic_tables default when switching to vedic_tables (111-999 only)
        updatedBlock.constraints.rows = 10;  // Vedic tables rows: 10
        updatedBlock.constraints.tableNumberLarge = undefined;  // Clear large table number
      } else if (updates.type === "vedic_tables_large") {
        // Always reset to vedic_tables_large default when switching to vedic_tables_large (1111-9999 only)
        updatedBlock.constraints.rows = 10;  // Vedic tables large rows: 10
        updatedBlock.constraints.tableNumber = undefined;  // Clear regular table number
      } else if (updates.type === "vedic_divide_by_11") {
        // Always reset to vedic_divide_by_11 default when switching to it
        updatedBlock.constraints.digits = 3;  // Divide by 11 default: 3
      } else if (updates.type === "vedic_subtraction_powers_of_10") {
        // Always reset to vedic_subtraction_powers_of_10 default when switching to it
        updatedBlock.constraints.powerOf10 = 2;  // Power of 10 default: 2
      } else if (updates.type === "vedic_duplex") {
        // Always reset to vedic_duplex default when switching to it
        updatedBlock.constraints.digits = 2;  // Duplex default: 2
      } else if (updates.type === "intl_add_sub") {
        updatedBlock.constraints.intlAddSubPreset = "1_2";
        updatedBlock.constraints.rows = 3;
      } else if (["direct_add_sub", "small_friends_add_sub", "big_friends_add_sub", "mix_friends_add_sub"].includes(updates.type)) {
        // Junior types default to 3 rows and 1 digit
        if (!updatedBlock.constraints.rows || updatedBlock.constraints.rows > 10) {
          updatedBlock.constraints.rows = 3;
        }
        if (!updatedBlock.constraints.digits || updatedBlock.constraints.digits > 4) {
          updatedBlock.constraints.digits = 1;
        }
      }
    }
    
    // Auto-generate title when type or constraints change (but preserve user's custom title)
    const oldAutoTitle = generateSectionName(oldBlock);
    const newAutoTitle = generateSectionName(updatedBlock);
    
    // Check if type or constraints changed (excluding title change)
    const typeChanged = updates.type !== undefined && updates.type !== oldBlock.type;
    const constraintsChanged = updates.constraints !== undefined;
    
    // Check if constraints actually changed (not just the object reference)
    let constraintsActuallyChanged = false;
    if (constraintsChanged) {
      // Compare key constraint values between old and updated block
      const oldConstraints = oldBlock.constraints || {};
      const newConstraints = updatedBlock.constraints || {};
      const constraintKeys = ['digits', 'rows', 'multiplicandDigits', 'multiplierDigits', 
                              'dividendDigits', 'divisorDigits', 'rootDigits', 'percentageMin', 
                              'percentageMax', 'numberDigits', 'base', 'firstDigits', 'secondDigits',
                              'multiplier', 'multiplierRange', 'divisor', 'tableNumber', 'tableNumberLarge',
                              'powerOf10', 'intlAddSubPreset',
                              'multiplicationCase', 'fractionCase', 'divisorCheck',
                              'funWith5Case', 'funWith10Case', 'divisibilityCase',
                              'division9_8_7_6Case', 'division91_121Case', 'bodmasDifficulty',
                              'cubeRootDigits'];
      constraintsActuallyChanged = constraintKeys.some(key => {
        const oldVal = oldConstraints[key as keyof typeof oldConstraints];
        const newVal = newConstraints[key as keyof typeof newConstraints];
        return oldVal !== newVal;
      });
    }
    
    // Handle title updates
    if (updates.title !== undefined) {
      // User is explicitly setting the title
      updatedBlock.title = updates.title;
    } else if (typeChanged || constraintsActuallyChanged) {
      // Type or constraints changed - auto-regenerate if title was auto-generated
      // Always update title if it was empty, matches old auto title, or if type changed (user is selecting a new operation)
      if (typeChanged || oldBlock.title === oldAutoTitle || !oldBlock.title || oldBlock.title.trim() === "") {
        updatedBlock.title = newAutoTitle;
      }
      // Otherwise, keep the existing custom title
    }
    
    newBlocks[index] = updatedBlock;
    setBlocks(newBlocks);
  };

  const removeBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
    // Clear active template when all blocks are removed — loaded state no longer valid
    if (newBlocks.length === 0) setActiveTemplateId(null);
  };

  const duplicateBlock = (index: number) => {
    const blockToDuplicate = blocks[index];
    const newBlock: BlockConfig = {
      ...blockToDuplicate,
      id: `block-${Date.now()}-${Math.random()}`,
      title: "", // Will be auto-generated by generateSectionName
    };
    // Auto-generate title based on block configuration
    newBlock.title = generateSectionName(newBlock);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
  };

  const moveBlockUp = (index: number) => {
    if (index === 0) return; // Already at top
    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(index, 1);
    newBlocks.splice(index - 1, 0, movedBlock);
    setBlocks(newBlocks);
  };

  const moveBlockDown = (index: number) => {
    if (index === blocks.length - 1) return; // Already at bottom
    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(index, 1);
    newBlocks.splice(index + 1, 0, movedBlock);
    setBlocks(newBlocks);
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDeleteBlock = (index: number) => {
    removeBlock(index);
  };

  const handleDuplicateBlock = (index: number) => {
    duplicateBlock(index);
  };


  // Set validation error for a specific field
  const setFieldError = (blockIndex: number, fieldName: string, error: string | null) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      if (!newErrors[blockIndex]) {
        newErrors[blockIndex] = {};
      }
      if (error) {
        newErrors[blockIndex][fieldName] = error;
      } else {
        delete newErrors[blockIndex][fieldName];
        if (Object.keys(newErrors[blockIndex]).length === 0) {
          delete newErrors[blockIndex];
        }
      }
      return newErrors;
    });
  };

  // Get validation error for a specific field
  const getFieldError = (blockIndex: number, fieldName: string): string | null => {
    return validationErrors[blockIndex]?.[fieldName] || null;
  };

  const handleAttemptPaper = () => {
    if (!previewData) {
      alert("Please generate a preview first");
      return;
    }
    
    console.log("🟢 [PAPER CREATE] Preparing to attempt paper...");
    console.log("🟢 [PAPER CREATE] Preview data:", {
      blocksCount: previewData.blocks.length,
      seed: previewData.seed
    });
    
    // Store paper data in sessionStorage for PaperAttempt page
    const paperData = {
      config: {
        level: level || "Custom",
        title: title || "Math Paper",
        totalQuestions: "20",
        blocks,
        orientation: "portrait" as const
      },
      blocks: previewData.blocks,
      seed: previewData.seed
    };
    
    try {
      const dataString = JSON.stringify(paperData);
      console.log("🟢 [PAPER CREATE] Storing paper data, size:", dataString.length);
      sessionStorage.setItem("paperAttemptData", dataString);
      
      // Verify it was stored
      const stored = sessionStorage.getItem("paperAttemptData");
      if (stored) {
        console.log("✅ [PAPER CREATE] Data stored successfully, navigating...");
        setLocation("/paper/attempt");
      } else {
        console.error("❌ [PAPER CREATE] Failed to store data in sessionStorage");
        alert("Failed to prepare paper. Please try again.");
      }
    } catch (e) {
      console.error("❌ [PAPER CREATE] Error storing paper data:", e);
      alert("Failed to prepare paper. The data might be too large. Please try again.");
    }
  };

  const handlePreview = () => {
    // Title now has a default, so we can skip this check or use the default
    const finalTitle = title.trim() || "Practice Paper";
    
    // For Custom level, require blocks. For preset levels, backend will load them if empty
    if (level === "Custom" && blocks.length === 0) {
      alert("Please add at least one question block");
      return;
    }
    
    // Show loading message if presets are still loading
    if (loadingPresets) {
      alert("Please wait while preset blocks are loading...");
      return;
    }
    
    // For preset levels with empty blocks, skip validation - backend will load presets
    const isPresetLevel = level !== "Custom" && (level.startsWith("AB-") || level === "Junior" || level === "Advanced");
    const shouldValidate = !isPresetLevel || blocks.length > 0;
    
    // Validate all blocks (only if we have blocks to validate)
    const errors: Record<number, Record<string, string>> = {};
    let hasErrors = false;
    
    if (shouldValidate && blocks.length > 0) {
    blocks.forEach((block, index) => {
      const blockErrors: Record<string, string> = {};
      
      // Validate count (questions) - except for vedic_tables and vedic_tables_large which use rows
      if (block.type !== "vedic_tables" && block.type !== "vedic_tables_large") {
        if (block.count === undefined || block.count === null || isNaN(block.count)) {
          blockErrors.count = "Questions is required";
          hasErrors = true;
        } else if (block.count < 1 || block.count > 200) {
          blockErrors.count = block.count < 1 ? "Minimum value for Questions is 1" : "Maximum value for Questions is 200";
          hasErrors = true;
        }
      } else {
        // For vedic_tables and vedic_tables_large, validate rows
        const rows = block.constraints.rows;
        if (rows === undefined || rows === null || rows === -1) {
          blockErrors.rows = "Rows is required";
          hasErrors = true;
        } else if (rows < 2 || rows > 100) {
          blockErrors.rows = rows < 2 ? "Minimum value for Rows is 2" : "Maximum value for Rows is 100";
          hasErrors = true;
        }
      }
      
      // Validate based on block type
      if (block.type === "addition" || block.type === "subtraction" || block.type === "add_sub" || 
          block.type === "integer_add_sub" || block.type === "decimal_add_sub" || 
          block.type === "direct_add_sub" || block.type === "small_friends_add_sub" || 
          block.type === "big_friends_add_sub" || block.type === "mix_friends_add_sub") {
        const isJuniorFriendType = block.type === "direct_add_sub" || block.type === "small_friends_add_sub" || block.type === "big_friends_add_sub" || block.type === "mix_friends_add_sub";
        const maxDigitsAllowed = isJuniorFriendType ? 4 : 10;
        const maxRowsAllowed = isJuniorFriendType ? 10 : 30;
        const digits = block.constraints.digits;
        if (digits !== undefined && digits !== -1) {
          if (digits < 1 || digits > maxDigitsAllowed) {
            blockErrors.digits = digits < 1 ? "Minimum value for Digits is 1" : `Maximum value for Digits is ${maxDigitsAllowed}`;
            hasErrors = true;
          }
        }
        const rows = block.constraints.rows;
        if (rows !== undefined && rows !== -1) {
          if (rows < 3 || rows > maxRowsAllowed) {
            blockErrors.rows = rows < 3 ? "Minimum value for Rows is 3" : `Maximum value for Rows is ${maxRowsAllowed}`;
            hasErrors = true;
          }
        }
      } else if (block.type === "intl_add_sub") {
        const rows = block.constraints.rows;
        if (rows !== undefined && rows !== -1) {
          if (rows < 3 || rows > 30) {
            blockErrors.rows = rows < 3 ? "Minimum value for Rows is 3" : "Maximum value for Rows is 30";
            hasErrors = true;
          }
        }
        if (block.constraints.intlAddSubPreset && !["1_2", "2_3"].includes(block.constraints.intlAddSubPreset)) {
          blockErrors.intlAddSubPreset = "Select a valid digit range";
          hasErrors = true;
        }
      } else if (block.type === "multiplication" || block.type === "division") {
        const multiplicandDigits = block.type === "multiplication" ? block.constraints.multiplicandDigits : block.constraints.dividendDigits;
        const fieldName = block.type === "multiplication" ? "Multiplicand Digits" : "Dividend Digits";
        if (multiplicandDigits !== undefined && multiplicandDigits !== -1) {
          const minVal = block.type === "multiplication" ? 2 : 2;  // Min 2 for multiplication, 2 for division
          if (multiplicandDigits < minVal || multiplicandDigits > 20) {
            blockErrors[block.type === "multiplication" ? "multiplicandDigits" : "dividendDigits"] = 
              multiplicandDigits < minVal ? `Minimum value for ${fieldName} is ${minVal}` : `Maximum value for ${fieldName} is 20`;
            hasErrors = true;
          }
        }
        const multiplierDigits = block.type === "multiplication" ? block.constraints.multiplierDigits : block.constraints.divisorDigits;
        const fieldName2 = block.type === "multiplication" ? "Multiplier Digits" : "Divisor Digits";
        if (multiplierDigits !== undefined && multiplierDigits !== -1) {
          const min = block.type === "multiplication" ? 1 : 1;
          if (multiplierDigits < min || multiplierDigits > 20) {
            blockErrors[block.type === "multiplication" ? "multiplierDigits" : "divisorDigits"] = 
              multiplierDigits < min ? `Minimum value for ${fieldName2} is ${min}` : `Maximum value for ${fieldName2} is 20`;
            hasErrors = true;
          }
        }
      } else if (block.type === "decimal_multiplication") {
        const multiplicandDigits = block.constraints.multiplicandDigits;
        const fieldName = "Multiplicand Digits (Before Decimal)";
        if (multiplicandDigits !== undefined && multiplicandDigits !== -1) {
          if (multiplicandDigits < 2 || multiplicandDigits > 20) {
            blockErrors.multiplicandDigits = multiplicandDigits < 2 ? `Minimum value for ${fieldName} is 2` : `Maximum value for ${fieldName} is 20`;
            hasErrors = true;
          }
        }
        const multiplierDigits = block.constraints.multiplierDigits;
        const fieldName2 = "Multiplier Digits";
        if (multiplierDigits !== undefined && multiplierDigits !== -1) {
          const min = 0;
          if (multiplierDigits < min || multiplierDigits > 20) {
            blockErrors.multiplierDigits = multiplierDigits < min ? `Minimum value for ${fieldName2} is ${min}` : `Maximum value for ${fieldName2} is 20`;
            hasErrors = true;
          }
        }
      } else if (block.type === "decimal_division") {
        const dividendDigits = block.constraints.dividendDigits;
        const fieldName = "Dividend Digits";
        if (dividendDigits !== undefined && dividendDigits !== -1) {
          if (dividendDigits < 2 || dividendDigits > 20) {
            blockErrors.dividendDigits = dividendDigits < 2 ? `Minimum value for ${fieldName} is 2` : `Maximum value for ${fieldName} is 20`;
            hasErrors = true;
          }
        }
        const divisorDigits = block.constraints.divisorDigits;
        const fieldName2 = "Divisor Digits";
        if (divisorDigits !== undefined && divisorDigits !== -1) {
          const min = 1;
          if (divisorDigits < min || divisorDigits > 20) {
            blockErrors.divisorDigits = divisorDigits < min ? `Minimum value for ${fieldName2} is ${min}` : `Maximum value for ${fieldName2} is 20`;
            hasErrors = true;
          }
        }
      } else if (block.type === "square_root" || block.type === "cube_root") {
        const rootDigits = block.constraints.rootDigits;
        if (rootDigits !== undefined && rootDigits !== -1) {
          const max = block.type === "square_root" ? 30 : 30;
          if (rootDigits < 1 || rootDigits > max) {
            blockErrors.rootDigits = rootDigits < 1 ? "Minimum value for Root Digits is 1" : `Maximum value for Root Digits is ${max}`;
            hasErrors = true;
          }
        }
      } else if (block.type === "lcm" || block.type === "gcd") {
        const multiplicandDigits = block.constraints.multiplicandDigits;
        if (multiplicandDigits !== undefined && multiplicandDigits !== -1) {
          if (multiplicandDigits < 1 || multiplicandDigits > 10) {
            blockErrors.multiplicandDigits = multiplicandDigits < 1 ? "Minimum value for First Number Digits is 1" : "Maximum value for First Number Digits is 10";
            hasErrors = true;
          }
        }
        const multiplierDigits = block.constraints.multiplierDigits;
        if (multiplierDigits !== undefined && multiplierDigits !== -1) {
          if (multiplierDigits < 1 || multiplierDigits > 10) {
            blockErrors.multiplierDigits = multiplierDigits < 1 ? "Minimum value for Second Number Digits is 1" : "Maximum value for Second Number Digits is 10";
            hasErrors = true;
          }
        }
      } else if (block.type === "percentage") {
        const percentageMin = block.constraints.percentageMin;
        if (percentageMin !== undefined && percentageMin !== -1) {
          if (percentageMin < 1 || percentageMin > 100) {
            blockErrors.percentageMin = percentageMin < 1 ? "Minimum value for Percentage Min is 1" : "Maximum value for Percentage Min is 100";
            hasErrors = true;
          }
        }
        const percentageMax = block.constraints.percentageMax;
        if (percentageMax !== undefined && percentageMax !== -1) {
          if (percentageMax < 1 || percentageMax > 100) {
            blockErrors.percentageMax = percentageMax < 1 ? "Minimum value for Percentage Max is 1" : "Maximum value for Percentage Max is 100";
            hasErrors = true;
          }
        }
        // Validate min <= max
        if (percentageMin !== undefined && percentageMin !== -1 && percentageMax !== undefined && percentageMax !== -1 && percentageMin > percentageMax) {
          blockErrors.percentageMin = "Percentage Min cannot be greater than Percentage Max";
          hasErrors = true;
        }
        const numberDigits = block.constraints.numberDigits;
        if (numberDigits !== undefined && numberDigits !== -1) {
          if (numberDigits < 1 || numberDigits > 10) {
            blockErrors.numberDigits = numberDigits < 1 ? "Minimum value for Number Digits is 1" : "Maximum value for Number Digits is 10";
            hasErrors = true;
          }
        }
      }
      
      if (Object.keys(blockErrors).length > 0) {
        errors[index] = blockErrors;
      }
    });
    }
    
    if (hasErrors) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    
    const config: PaperConfig = {
      level: level || "Custom",
      title: finalTitle,
      totalQuestions: "20",
      blocks: blocks.length > 0 ? blocks.map(b => {
        // Build constraints object with all fields
        // Convert -1 (empty value) to undefined so backend can use defaults
        const constraints: any = {
          rows: b.constraints.rows === -1 ? undefined : b.constraints.rows,
          allowBorrow: b.constraints.allowBorrow,
          allowCarry: b.constraints.allowCarry,
          minAnswer: b.constraints.minAnswer === -1 ? undefined : b.constraints.minAnswer,
          maxAnswer: b.constraints.maxAnswer === -1 ? undefined : b.constraints.maxAnswer,
          multiplicandDigits: b.constraints.multiplicandDigits === -1 ? undefined : b.constraints.multiplicandDigits,
          multiplierDigits: b.constraints.multiplierDigits === -1 ? undefined : b.constraints.multiplierDigits,
          dividendDigits: b.constraints.dividendDigits === -1 ? undefined : b.constraints.dividendDigits,
          divisorDigits: b.constraints.divisorDigits === -1 ? undefined : b.constraints.divisorDigits,
          rootDigits: b.constraints.rootDigits === -1 ? undefined : b.constraints.rootDigits,
          percentageMin: b.constraints.percentageMin === -1 ? undefined : b.constraints.percentageMin,
          percentageMax: b.constraints.percentageMax === -1 ? undefined : b.constraints.percentageMax,
          numberDigits: b.constraints.numberDigits === -1 ? undefined : b.constraints.numberDigits,
          // Vedic Maths constraints
          digits: b.constraints.digits === -1 ? undefined : b.constraints.digits,
          intlAddSubPreset: b.constraints.intlAddSubPreset,
          base: b.constraints.base,
          firstDigits: b.constraints.firstDigits,
          secondDigits: b.constraints.secondDigits,
          multiplier: b.constraints.multiplier,
          multiplierRange: b.constraints.multiplierRange,
          divisor: b.constraints.divisor,
          tableNumber: b.constraints.tableNumber,
          powerOf10: b.constraints.powerOf10,
          // Vedic Maths Level 3 constraints
          multiplicationCase: b.constraints.multiplicationCase,
          fractionCase: b.constraints.fractionCase,
          divisorCheck: b.constraints.divisorCheck,
          // Vedic Maths Level 4 constraints
          funWith5Case: b.constraints.funWith5Case,
          funWith10Case: b.constraints.funWith10Case,
          divisibilityCase: b.constraints.divisibilityCase,
          division9_8_7_6Case: b.constraints.division9_8_7_6Case,
          division91_121Case: b.constraints.division91_121Case,
          bodmasDifficulty: b.constraints.bodmasDifficulty,
          cubeRootDigits: b.constraints.cubeRootDigits,
        };
        
        // Add digits based on question type (for non-vedic operations)
        if (b.type === "addition" || b.type === "subtraction" || b.type === "add_sub" || b.type === "integer_add_sub" || b.type === "direct_add_sub" || b.type === "small_friends_add_sub" || b.type === "big_friends_add_sub" || b.type === "mix_friends_add_sub") {
          constraints.digits = b.constraints.digits || 2;
        } else if (b.type === "intl_add_sub") {
          constraints.rows = b.constraints.rows === -1 ? undefined : (b.constraints.rows || 3);
          constraints.intlAddSubPreset = b.constraints.intlAddSubPreset || "1_2";
        } else {
          // For multiplication/division, digits is optional but provide default for backend
          constraints.digits = b.constraints.digits ?? 2;
        }
        
        return {
          ...b,
          constraints
        };
      }) : [],
      orientation: "portrait",
    };
    
    console.log("🚀 [PREVIEW] Sending preview request:", {
      level: config.level,
      title: config.title,
      blocksCount: config.blocks.length,
      blocks: config.blocks
    });
    
    previewMutation.mutate(config);
  };

  return (
    <div style={{minHeight:'100vh',background:'#07070F',paddingBottom:80}}>
      <style>{`
        @keyframes pc-fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pc-scale-in{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        @keyframes pc-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes pc-spin{to{transform:rotate(360deg)}}
        .pc-input{background:#141729;border:1.5px solid rgba(255,255,255,0.08);border-radius:12px;color:#F0F2FF;font-family:'DM Sans',sans-serif;font-size:15px;padding:12px 16px;width:100%;outline:none;transition:all 0.2s;-webkit-appearance:none;appearance:none}
        .pc-input:focus{border-color:#7B5CE5;box-shadow:0 0 0 3px rgba(123,92,229,0.12)}
        .pc-input option{background:#141729;color:#F0F2FF}
        .pc-label{font-size:12px;font-weight:600;color:#c8cce0;font-family:'DM Sans',sans-serif;letter-spacing:0.06em;text-transform:uppercase;display:block;margin-bottom:8px}
        .pc-block-card{background:#0F1120;border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:24px 28px;transition:all 0.25s;animation:pc-fade-up 0.4s ease both;position:relative;overflow:hidden}
        .pc-block-card:hover{border-color:rgba(123,92,229,0.3);box-shadow:0 8px 40px rgba(123,92,229,0.12)}
        .pc-block-card.dragging{opacity:0.45;transform:scale(0.97)}
        .pc-action-btn{width:32px;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:#141729;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.18s;flex-shrink:0}
        .pc-action-btn:hover.up,.pc-action-btn:hover.down{background:rgba(123,92,229,0.2);border-color:rgba(123,92,229,0.4);color:#9D7FF0}
        .pc-action-btn:hover.dup{background:rgba(16,185,129,0.15);border-color:rgba(16,185,129,0.35);color:#10B981}
        .pc-action-btn:hover.del{background:rgba(239,68,68,0.15);border-color:rgba(239,68,68,0.35);color:#EF4444}
        .pc-action-btn:hover.add{background:rgba(123,92,229,0.2);border-color:rgba(123,92,229,0.4);color:#9D7FF0}
        .pc-action-btn:disabled{opacity:0.3;cursor:not-allowed}
        .pc-section-label{font-size:11px;font-weight:700;color:#7B5CE5;font-family:'JetBrains Mono',monospace;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px}
        .pc-field-label{font-size:12px;color:#c8cce0;font-family:'DM Sans',sans-serif;font-weight:500;margin-bottom:6px;display:block}
        .pc-error-text{font-size:12px;color:#EF4444;font-family:'DM Sans',sans-serif;margin-top:4px}
        .pc-block-card label{font-size:12px!important;color:#c8cce0!important;font-family:'DM Sans',sans-serif!important;font-weight:500!important}
        .pc-block-card input[type="text"],.pc-block-card input[type="number"]{background:#141729!important;border:1.5px solid rgba(255,255,255,0.08)!important;border-radius:10px!important;color:#F0F2FF!important;font-family:'DM Sans',sans-serif!important;font-size:14px!important;padding:10px 14px!important;outline:none!important;transition:all 0.2s!important;ring:none!important;box-shadow:none!important}
        .pc-block-card input:focus{border-color:#7B5CE5!important;box-shadow:0 0 0 3px rgba(123,92,229,0.12)!important}
        .pc-block-card select{background:#141729!important;border:1.5px solid rgba(255,255,255,0.08)!important;border-radius:10px!important;color:#F0F2FF!important;font-family:'DM Sans',sans-serif!important;font-size:14px!important;padding:10px 14px!important;outline:none!important;-webkit-appearance:none;appearance:none!important;transition:all 0.2s!important}
        .pc-block-card select:focus{border-color:#7B5CE5!important;box-shadow:0 0 0 3px rgba(123,92,229,0.12)!important}
        .pc-block-card select option,.pc-block-card select optgroup{background:#141729!important;color:#F0F2FF!important}
        .pc-block-card p.text-red-600,.pc-block-card .text-red-600{color:#EF4444!important;font-size:11px!important}
        .pc-block-card .grid{display:grid!important}
        .pc-drag-handle{display:flex;align-items:center;justify-content:center;padding:12px 0 0;margin-top:12px;border-top:1px solid rgba(255,255,255,0.05);cursor:grab;color:#525870;gap:6px;font-size:12px;font-family:'DM Sans',sans-serif}
        .pc-drag-handle:active{cursor:grabbing}
        @media(max-width:768px){
          .pc-block-card{padding:18px 16px!important;border-radius:16px!important}
        }
        @media(max-width:480px){
          .pc-block-card{padding:14px 12px!important;border-radius:14px!important}
          .pc-block-card input[type="text"],.pc-block-card input[type="number"]{padding:8px 12px!important;font-size:13px!important}
          .pc-block-card select{padding:8px 12px!important;font-size:13px!important}
          .pc-label{font-size:11px!important;margin-bottom:6px!important}
          .pc-action-btn{width:28px!important;height:28px!important;border-radius:6px!important}
        }
      `}</style>

      {/* Sticky header */}
      {/* Hero banner */}
      <div className="pc-hero-banner" style={{ position:"relative", overflow:"hidden", borderRadius:"0 0 28px 28px", padding:"clamp(32px,5vw,52px) clamp(16px,4vw,32px) clamp(36px,5vw,56px)", background:"linear-gradient(145deg,#0E0C2A 0%,#130F38 40%,#0A0820 100%)", borderBottom:"1px solid rgba(123,92,229,.2)" }}>
        {/* Atmospheric glow */}
        <div style={{ position:"absolute", top:"-20%", left:"50%", transform:"translateX(-50%)", width:500, height:400, background:"radial-gradient(ellipse at center, rgba(123,92,229,.15) 0%, rgba(123,92,229,.04) 50%, transparent 70%)", pointerEvents:"none" }} />
        {/* Grid pattern */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(123,92,229,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(123,92,229,.05) 1px, transparent 1px)", backgroundSize:"48px 48px", WebkitMaskImage:"radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)" } as React.CSSProperties} />
        {/* Bottom fade */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:44, background:"linear-gradient(to bottom, transparent, #07070F)" }} />
        <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
          <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:60, height:60, borderRadius:18, background:"rgba(123,92,229,.2)", marginBottom:20, boxShadow:"0 8px 32px rgba(123,92,229,.15)" }}>
            <FileDown style={{ width:28, height:28, color:"#9D7FF0" }} />
          </div>
          <h1 style={{ fontFamily:"'Playfair Display', Georgia, serif", fontSize:"clamp(28px,4vw,44px)", fontWeight:800, color:"#F0F2FF", margin:"0 0 10px", letterSpacing:"-.03em" }}>Abacus Paper Generator</h1>
          <p style={{ fontFamily:"'DM Sans', sans-serif", fontSize:16, fontWeight:300, color:"rgba(255,255,255,.5)", margin:0 }}>Build custom practice papers · Print-ready PDF · Live Attempt</p>
        </div>
      </div>

      {/* ── Sticky nav bar: back + mode toggles + block count ── */}
      <div style={{
        position:'sticky', top:0, zIndex:40,
        background:'rgba(6,7,15,0.92)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        padding:'0 clamp(12px,3vw,28px)',
      }}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',alignItems:'center',gap:8,padding:'10px 0',flexWrap:'wrap'}}>
          {/* Back */}
          <Link href="/">
            <button style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,color:'#B8BDD8',cursor:'pointer',fontFamily:'DM Sans, sans-serif',fontWeight:500,fontSize:13,flexShrink:0,marginRight:8}}>
              <ArrowLeft style={{width:14,height:14}} />
              Back
            </button>
          </Link>

          <div style={{width:1,height:18,background:'rgba(255,255,255,0.1)',flexShrink:0,marginRight:8}} />

          {/* Abacus group */}
          <span style={{fontSize:10,fontWeight:700,color:'#7B5CE5',fontFamily:"'JetBrains Mono',monospace",letterSpacing:'0.12em',textTransform:'uppercase',marginRight:2,flexShrink:0}}>Abacus</span>
          <button
            onClick={() => setLocation('/create/junior')}
            style={{display:'flex',alignItems:'center',gap:5,padding:'5px 13px',borderRadius:999,fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",background:isJuniorPage?'rgba(123,92,229,0.22)':'rgba(255,255,255,0.04)',border:isJuniorPage?'1.5px solid rgba(123,92,229,0.55)':'1.5px solid rgba(255,255,255,0.07)',color:isJuniorPage?'#C4A8FF':'#9DA3BC',cursor:'pointer',transition:'all 0.18s',outline:'none'}}
          >Junior</button>
          <button
            onClick={() => setLocation('/create/basic')}
            style={{display:'flex',alignItems:'center',gap:5,padding:'5px 13px',borderRadius:999,fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",background:isBasicPage?'rgba(123,92,229,0.22)':'rgba(255,255,255,0.04)',border:isBasicPage?'1.5px solid rgba(123,92,229,0.55)':'1.5px solid rgba(255,255,255,0.07)',color:isBasicPage?'#C4A8FF':'#9DA3BC',cursor:'pointer',transition:'all 0.18s',outline:'none'}}
          >Basic</button>
          <button
            onClick={() => setLocation('/create/advanced')}
            style={{display:'flex',alignItems:'center',gap:5,padding:'5px 13px',borderRadius:999,fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",background:isAdvancedPage?'rgba(123,92,229,0.22)':'rgba(255,255,255,0.04)',border:isAdvancedPage?'1.5px solid rgba(123,92,229,0.55)':'1.5px solid rgba(255,255,255,0.07)',color:isAdvancedPage?'#C4A8FF':'#9DA3BC',cursor:'pointer',transition:'all 0.18s',outline:'none'}}
          >Advanced</button>

          <div style={{width:1,height:18,background:'rgba(255,255,255,0.10)',margin:'0 4px',flexShrink:0}} />

          {/* Vedic Maths group */}
          <span style={{fontSize:10,fontWeight:700,color:'#7B5CE5',fontFamily:"'JetBrains Mono',monospace",letterSpacing:'0.12em',textTransform:'uppercase',marginRight:2,flexShrink:0}}>Vedic Maths</span>
          <button
            onClick={() => setLocation('/vedic-maths/level-1')}
            style={{display:'flex',alignItems:'center',padding:'5px 13px',borderRadius:999,fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",background:isVedicPage?'rgba(123,92,229,0.22)':'rgba(255,255,255,0.04)',border:isVedicPage?'1.5px solid rgba(123,92,229,0.55)':'1.5px solid rgba(255,255,255,0.07)',color:isVedicPage?'#C4A8FF':'#9DA3BC',cursor:'pointer',transition:'all 0.18s',outline:'none'}}
          >Vedic Maths</button>

          {/* Block count + guide — pushed to right */}
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <button
              onClick={() => setShowGuide(true)}
              style={{display:'flex',alignItems:'center',gap:5,padding:'5px 13px',borderRadius:20,fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",background:'rgba(123,92,229,0.08)',border:'1px solid rgba(123,92,229,0.25)',color:'#9D7FF0',cursor:'pointer',transition:'all 0.18s',outline:'none'}}
            >
              How to Use
            </button>
            {blocks.length > 0 && (
              <div style={{padding:'5px 12px',background:'rgba(123,92,229,0.1)',border:'1px solid rgba(123,92,229,0.25)',borderRadius:20,fontSize:12,color:'#9D7FF0',fontFamily:'JetBrains Mono, monospace',fontWeight:600}}>
                {blocks.length} block{blocks.length!==1?'s':''} · {blocks.reduce((s,b)=>s+b.count,0)} Qs
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'clamp(20px,4vw,32px) clamp(12px,3vw,24px)'}}>

        {step === 1 && (
          <div style={{background:'#0F1120',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:'clamp(20px,4vw,32px) clamp(16px,3vw,36px)',animation:'pc-scale-in 0.4s ease'}}>
            {/* Page sub‑heading */}
            {isBasicPage && (
              <div style={{marginBottom:28,paddingBottom:24,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="pc-section-label">Basic Operations</div>
                <h2 style={{fontSize:26,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",margin:'4px 0 6px'}}>Basic Operations</h2>
                <p style={{color:'#525870',fontFamily:'DM Sans, sans-serif',fontSize:14,margin:0}}>Create math papers with basic operations: Addition, Subtraction, Multiplication, and Division</p>
              </div>
            )}
            {isJuniorPage && (
              <div style={{marginBottom:28,paddingBottom:24,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="pc-section-label">Junior Operations</div>
                <h2 style={{fontSize:26,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",margin:'4px 0 6px'}}>Junior Operations</h2>
                <p style={{color:'#525870',fontFamily:'DM Sans, sans-serif',fontSize:14,margin:0}}>Create math papers for junior level abacus training: Direct Add/Sub, Small Friends, Big Friends, and Mix Friends</p>
              </div>
            )}
            {isAdvancedPage && (
              <div style={{marginBottom:28,paddingBottom:24,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="pc-section-label">Advanced Operations</div>
                <h2 style={{fontSize:26,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",margin:'4px 0 6px'}}>Advanced Operations</h2>
                <p style={{color:'#525870',fontFamily:'DM Sans, sans-serif',fontSize:14,margin:0}}>Create math papers with advanced operations: Decimal operations, LCM, GCD, Square Root, Cube Root, and more</p>
              </div>
            )}
            {isVedicPage && (
              <div style={{marginBottom:28,paddingBottom:24,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="pc-section-label">Vedic Maths</div>
                <h2 style={{fontSize:26,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",margin:'4px 0 6px'}}>
                  {level === "Custom" 
                    ? "Vedic Maths Operations" 
                    : level === "Vedic-Level-1" 
                      ? "Vedic Maths Level 1"
                      : level === "Vedic-Level-2"
                        ? "Vedic Maths Level 2"
                        : level === "Vedic-Level-3"
                          ? "Vedic Maths Level 3"
                          : level === "Vedic-Level-4"
                            ? "Vedic Maths Level 4"
                            : "Vedic Maths Operations"
                  }
                </h2>
                <p style={{color:'#525870',fontFamily:'DM Sans, sans-serif',fontSize:14,margin:0}}>
                  {level === "Custom"
                    ? "Create math papers with Vedic Maths operations: Multiplication tricks, division tricks, squares, and special products"
                    : level === "Vedic-Level-1"
                      ? "Create math papers with Vedic Maths Level 1 operations: Multiplication tricks, division tricks, squares, and special products"
                      : level === "Vedic-Level-2"
                        ? "Create math papers with Vedic Maths Level 2 operations: Fun with 9, multiplication and division by 5/25/125, duplex, squares, and division tricks"
                        : level === "Vedic-Level-3"
                          ? "Create math papers with Vedic Maths Level 3 operations: Multiplication by 111-999, fraction operations, squares, cubes, and advanced techniques"
                          : level === "Vedic-Level-4"
                            ? "Create math papers with Vedic Maths Level 4 operations: Advanced multiplication, LCM, divisibility checks, square roots, cube roots, and complex calculations"
                            : "Create math papers with Vedic Maths operations"
                  }
                </p>
              </div>
            )}
            
            {/* Paper Info */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',gap:20,marginBottom:28}}>
              <div>
                <label className="pc-label">Paper Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    if (newTitle.length <= 40) {
                      setTitle(newTitle);
                    }
                  }}
                  maxLength={40}
                  className="pc-input"
                  placeholder="Practice Paper"
                />
              </div>

              <div>
                <label className="pc-label">Level</label>
                <select
                  value={activeTemplateId ? `__tpl__${activeTemplateId}` : level}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith("__tpl__")) {
                      const tplId = parseInt(val.replace("__tpl__", ""), 10);
                      handleLoadTemplate(tplId);
                    } else {
                      setActiveTemplateId(null);
                      setLevel(val as PaperConfig["level"]);
                    }
                  }}
                  className="pc-input"
                >
                  <option value="Custom">Custom</option>
                  {isBasicPage && (
                    <>
                      <option value="AB-1">Abacus-1</option>
                      <option value="AB-2">Abacus-2</option>
                      <option value="AB-3">Abacus-3</option>
                      <option value="AB-4">Abacus-4</option>
                      <option value="AB-5">Abacus-5</option>
                      <option value="AB-6">Abacus-6</option>
                    </>
                  )}
                  {isAdvancedPage && (
                    <>
                      <option value="AB-7">Abacus-7</option>
                      <option value="AB-8">Abacus-8</option>
                      <option value="AB-9">Abacus-9</option>
                      <option value="AB-10">Abacus-10</option>
                    </>
                  )}
                  {isVedicPage && (
                    <>
                      <option value="Vedic-Level-1">Vedic Maths-1</option>
                      <option value="Vedic-Level-2">Vedic Maths-2</option>
                      <option value="Vedic-Level-3">Vedic Maths-3</option>
                      <option value="Vedic-Level-4">Vedic Maths-4</option>
                    </>
                  )}
                  {templates.length > 0 && (
                    <optgroup label="─── My Templates ───">
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={`__tpl__${tpl.id}`}>
                          ⭐ {tpl.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            {/* ── My Templates panel ─────────────────────────────────────── */}
            {templates.length > 0 && (
              <div style={{marginBottom:24,padding:'16px 18px',background:'rgba(123,92,229,0.05)',border:'1px solid rgba(123,92,229,0.18)',borderRadius:14}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <BookmarkPlus style={{width:14,height:14,color:'#9D7FF0'}} />
                  <span style={{fontSize:12,fontWeight:700,color:'#9D7FF0',fontFamily:"'JetBrains Mono',monospace",letterSpacing:'0.08em',textTransform:'uppercase'}}>
                    My Templates
                  </span>
                  <span style={{fontSize:11,color:'#525870',fontFamily:'DM Sans, sans-serif'}}>
                    {templates.length}/{MAX_TEMPLATES}
                  </span>
                  {atTemplateLimit && (
                    <span style={{fontSize:11,color:'rgba(239,68,68,0.7)',fontFamily:'DM Sans, sans-serif'}}>
                      · max reached
                    </span>
                  )}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {templates.map((tpl) => {
                    const isActive = activeTemplateId === tpl.id;
                    const isRenaming = renamingTemplateId === tpl.id;
                    const tplTotalQ = (tpl.blocks as any[]).reduce((s: number, b: any) => s + (b.count ?? 0), 0);
                    return (
                      <div
                        key={tpl.id}
                        style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:isActive?'rgba(123,92,229,0.12)':'rgba(15,17,32,0.6)',border:`1px solid ${isActive?'rgba(123,92,229,0.4)':'rgba(255,255,255,0.06)'}`,borderRadius:10,transition:'all 0.18s'}}
                      >
                        {/* Active indicator */}
                        <div style={{width:6,height:6,borderRadius:'50%',background:isActive?'#9D7FF0':'rgba(255,255,255,0.12)',flexShrink:0}} />

                        {/* Name / rename input */}
                        <div style={{flex:1,minWidth:0}}>
                          {isRenaming ? (
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => { setRenameValue(e.target.value); setRenameError(""); }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    if (!renameValue.trim()) { setRenameError("Name cannot be empty."); return; }
                                    if (renameValue.trim().length > 60) { setRenameError("Max 60 characters."); return; }
                                    updateTemplateMutation.mutate({ id: tpl.id, data: { name: renameValue.trim() } });
                                  }
                                  if (e.key === "Escape") { setRenamingTemplateId(null); setRenameError(""); }
                                }}
                                maxLength={60}
                                style={{flex:1,background:'#141729',border:`1.5px solid ${renameError?'#EF4444':'rgba(123,92,229,0.4)'}`,borderRadius:6,color:'#F0F2FF',fontFamily:'DM Sans, sans-serif',fontSize:13,padding:'4px 8px',outline:'none'}}
                              />
                              <button
                                onClick={() => {
                                  if (!renameValue.trim()) { setRenameError("Name cannot be empty."); return; }
                                  updateTemplateMutation.mutate({ id: tpl.id, data: { name: renameValue.trim() } });
                                }}
                                style={{width:24,height:24,borderRadius:6,background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',color:'#10B981',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                              >
                                <Check style={{width:12,height:12}} />
                              </button>
                              <button
                                onClick={() => { setRenamingTemplateId(null); setRenameError(""); }}
                                style={{width:24,height:24,borderRadius:6,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',color:'#EF4444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                              >
                                <XCircle style={{width:12,height:12}} />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <span style={{fontSize:13,fontWeight:600,color:isActive?'#E0D4FF':'#D4D8F0',fontFamily:'DM Sans, sans-serif',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tpl.name}</span>
                              <span style={{fontSize:11,color:'#525870',fontFamily:'JetBrains Mono, monospace'}}>
                                {(tpl.blocks as any[]).length} blocks · {tplTotalQ} questions
                                {tpl.level ? ` · ${tpl.level}` : ""}
                              </span>
                            </div>
                          )}
                          {renameError && renamingTemplateId === tpl.id && (
                            <p style={{fontSize:11,color:'#EF4444',margin:'2px 0 0',fontFamily:'DM Sans, sans-serif'}}>{renameError}</p>
                          )}
                        </div>

                        {/* Action buttons */}
                        {!isRenaming && (
                          <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                            {/* Load */}
                            <button
                              onClick={() => handleLoadTemplate(tpl.id)}
                              title="Load this template"
                              style={{padding:'4px 10px',background:isActive?'rgba(123,92,229,0.25)':'rgba(123,92,229,0.1)',border:`1px solid ${isActive?'rgba(123,92,229,0.5)':'rgba(123,92,229,0.2)'}`,borderRadius:6,color:'#C4A8FF',fontFamily:'DM Sans, sans-serif',fontSize:11,fontWeight:600,cursor:'pointer',transition:'all 0.15s'}}
                            >
                              {isActive ? "Loaded" : "Load"}
                            </button>
                            {/* Update (only if this is the active template) */}
                            {isActive && (
                              <button
                                onClick={handleOpenUpdateModal}
                                title="Update this template with current blocks"
                                style={{width:26,height:26,borderRadius:6,background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)',color:'#10B981',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                              >
                                <Save style={{width:12,height:12}} />
                              </button>
                            )}
                            {/* Rename */}
                            <button
                              onClick={() => { setRenamingTemplateId(tpl.id); setRenameValue(tpl.name); setRenameError(""); }}
                              title="Rename template"
                              style={{width:26,height:26,borderRadius:6,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'#8A90A8',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                            >
                              <Pencil style={{width:11,height:11}} />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete template "${tpl.name}"? This cannot be undone.`)) {
                                  deleteTemplateMutation.mutate(tpl.id);
                                }
                              }}
                              title="Delete template"
                              style={{width:26,height:26,borderRadius:6,background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.2)',color:'#EF4444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                            >
                              <Trash2 style={{width:11,height:11}} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Blocks Section */}
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:20}}>
                <div>
                  <h2 style={{fontSize:20,fontWeight:700,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",margin:'0 0 4px'}}>Question Blocks</h2>
                  {blocks.length > 0 && (
                    <p style={{fontSize:12,color:'#525870',fontFamily:'JetBrains Mono, monospace',margin:0}}>
                      Total: <span style={{color:'#9D7FF0',fontWeight:700}}>{blocks.reduce((sum, block) => sum + block.count, 0)}</span> questions
                    </p>
                  )}
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button
                    onClick={() => {
                      if (blocks.length === 0) return;
                      if (confirm("Are you sure you want to clear all blocks? This action cannot be undone.")) {
                        setBlocks([]);
                      }
                    }}
                    disabled={blocks.length === 0}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'10px 18px',background:blocks.length>0?'rgba(239,68,68,0.1)':'rgba(255,255,255,0.04)',border:`1px solid ${blocks.length>0?'rgba(239,68,68,0.3)':'rgba(255,255,255,0.06)'}`,color:blocks.length>0?'#EF4444':'#525870',borderRadius:10,fontWeight:600,fontFamily:'DM Sans, sans-serif',fontSize:13,cursor:blocks.length>0?'pointer':'not-allowed',transition:'all 0.2s'}}
                    title={blocks.length > 0 ? "Clear all blocks" : "No blocks to clear"}
                  >
                    <Trash2 style={{width:15,height:15}} />
                    Clear All
                  </button>
                  <button
                    onClick={addBlock}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'10px 18px',background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',color:'white',borderRadius:10,fontWeight:700,fontFamily:'DM Sans, sans-serif',fontSize:13,border:'none',cursor:'pointer',boxShadow:'0 4px 16px rgba(123,92,229,0.3)',transition:'all 0.2s'}}
                  >
                    <Plus style={{width:15,height:15}} />
                    Add Block
                  </button>
                </div>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                {blocks.map((block, index) => (
                  <div
                    key={block.id}
                    data-block-index={index}
                    draggable
                    onDragStart={() => setDraggedIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedIndex !== null && draggedIndex !== index) {
                        const newBlocks = [...blocks];
                        const [dragged] = newBlocks.splice(draggedIndex, 1);
                        newBlocks.splice(index, 0, dragged);
                        setBlocks(newBlocks);
                      }
                      setDraggedIndex(null);
                    }}
                    onDragEnd={() => setDraggedIndex(null)}
                    className={`pc-block-card${draggedIndex === index ? ' dragging' : ''}`}
                    style={{animationDelay:`${index*0.06}s`}}
                  >
                    {/* Block content */}
                    <div style={{position:'relative',zIndex:1}}>
                      {/* Block header: badge + title + action buttons */}
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <div style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 12px rgba(123,92,229,0.35)'}}>
                            <span style={{fontSize:16,fontWeight:800,color:'white',fontFamily:'JetBrains Mono, monospace'}}>{index + 1}</span>
                          </div>
                          <div>
                            <h3 style={{fontSize:16,fontWeight:700,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",margin:0}}>
                              {generateSectionName(block)}
                            </h3>
                          </div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <button
                            onClick={() => moveBlockUp(index)}
                            disabled={index === 0}
                            className="pc-action-btn up"
                            title="Move Up"
                          >
                            <ChevronUp style={{width:14,height:14,color:'#B8BDD8'}} />
                          </button>
                          <button
                            onClick={() => moveBlockDown(index)}
                            disabled={index === blocks.length - 1}
                            className="pc-action-btn down"
                            title="Move Down"
                          >
                            <ChevronDown style={{width:14,height:14,color:'#B8BDD8'}} />
                          </button>
                          <button
                            onClick={() => handleDuplicateBlock(index)}
                            className="pc-action-btn dup"
                            title="Duplicate Block"
                          >
                            <Copy style={{width:14,height:14,color:'#10B981'}} />
                          </button>
                          <button
                            onClick={() => handleDeleteBlock(index)}
                            className="pc-action-btn del"
                            title="Delete Block"
                          >
                            <Trash2 style={{width:14,height:14,color:'#EF4444'}} />
                          </button>
                          <button
                            onClick={() => addBlockAfter(index)}
                            className="pc-action-btn add"
                            title="Add Block Below"
                          >
                            <Plus style={{width:14,height:14,color:'#9D7FF0'}} />
                          </button>
                        </div>
                      </div>
                      <div style={{marginBottom:16}}>
                        <label className="pc-field-label">Type</label>
                        <select
                          value={block.type}
                          onChange={(e) => {
                            const newType = e.target.value as BlockConfig["type"];
                            updateBlock(index, { type: newType });
                          }}
                        >
                          {/* Show operations based on page route and selected level */}
                          {/* Abacus operations: show when on Abacus pages (Junior, Basic, Advanced) */}
                          {(isJuniorPage || isBasicPage || isAdvancedPage) ? (
                            <>
                              {isJuniorPage ? (
                                <optgroup label="Junior Operations">
                                  <option value="direct_add_sub">Direct Add/Sub</option>
                                  <option value="small_friends_add_sub">Small Friends Add/Sub</option>
                                  <option value="big_friends_add_sub">Big Friends Add/Sub</option>
                                  <option value="mix_friends_add_sub">Mix Friends Add/Sub</option>
                                </optgroup>
                              ) : isAdvancedPage ? (
                                <>
                                  <optgroup label="Basic Operations">
                                    <option value="add_sub">Add/Sub</option>
                                    <option value="intl_add_sub">Intl Add/Sub - Beta</option>
                                    <option value="multiplication">Multiplication</option>
                                    <option value="division">Division</option>
                                  </optgroup>
                                  <optgroup label="Advanced Operations">
                                    <option value="decimal_add_sub">Decimal Add/Sub</option>
                                    <option value="decimal_multiplication">Decimal Multiplication</option>
                                    <option value="decimal_division">Decimal Division</option>
                                    <option value="integer_add_sub">Integer Add/Sub</option>
                                    <option value="lcm">LCM</option>
                                    <option value="gcd">GCD</option>
                                    <option value="square_root">Square Root</option>
                                    <option value="cube_root">Cube Root</option>
                                    <option value="percentage">Percentage (%)</option>
                                  </optgroup>
                                </>
                              ) : (
                                <optgroup label="Basic Operations">
                                  <option value="add_sub">Add/Sub</option>
                                  <option value="intl_add_sub">Intl Add/Sub - Beta</option>
                                  <option value="multiplication">Multiplication</option>
                                  <option value="division">Division</option>
                                </optgroup>
                              )}
                            </>
                          ) : ((isVedicLevel1 || level === "Vedic-Level-1" || (level === "Custom" && isVedicPage)) && !(level === "Vedic-Level-2" || level === "Vedic-Level-3" || level === "Vedic-Level-4")) ? (
                            <>
                              <optgroup label="Level 1 - Multiplication">
                                <option value="vedic_multiply_by_11">Multiply by 11</option>
                                <option value="vedic_multiply_by_101">Multiply by 101</option>
                                <option value="vedic_multiply_by_12_19">Multiply by 12-19</option>
                                <option value="vedic_multiply_by_21_91">Multiply by 21-91</option>
                                <option value="vedic_multiply_by_2">Multiply by 2</option>
                                <option value="vedic_multiply_by_4">Multiply by 4</option>
                                <option value="vedic_multiply_by_6">Multiply by 6</option>
                              </optgroup>
                              <optgroup label="Level 1 - Division">
                                <option value="vedic_divide_by_2">Divide by 2</option>
                                <option value="vedic_divide_by_4">Divide by 4</option>
                                <option value="vedic_divide_single_digit">Divide Single Digit</option>
                                <option value="vedic_divide_by_11">Divide by 11</option>
                              </optgroup>
                              <optgroup label="Level 1 - Subtraction">
                                <option value="vedic_subtraction_complement">Subtraction (Complements)</option>
                                <option value="vedic_subtraction_normal">Subtraction (Normal)</option>
                              </optgroup>
                              <optgroup label="Level 1 - Special Products">
                                <option value="vedic_special_products_base_100">Special Products (Base 100)</option>
                                <option value="vedic_special_products_base_50">Special Products (Base 50)</option>
                              </optgroup>
                              <optgroup label="Level 1 - Other">
                                <option value="vedic_addition">Addition</option>
                                <option value="vedic_squares_base_10">Squares (Base 10)</option>
                                <option value="vedic_squares_base_100">Squares (Base 100)</option>
                                <option value="vedic_squares_base_1000">Squares (Base 1000)</option>
                                <option value="vedic_tables">Tables</option>
                              </optgroup>
                              {/* Show Level 2 operations in Custom mode */}
                              {level === "Custom" && (
                                <>
                                  <optgroup label="Level 2 - Fun with Numbers">
                                    <option value="vedic_fun_with_9_equal">Fun with 9 (Equal)</option>
                                    <option value="vedic_fun_with_9_less_than">Fun with 9 (Less Than)</option>
                                    <option value="vedic_fun_with_9_greater_than">Fun with 9 (Greater Than)</option>
                                    <option value="vedic_fun_with_5">Fun with 5</option>
                                    <option value="vedic_fun_with_10">Fun with 10</option>
                                  </optgroup>
                                  <optgroup label="Level 2 - Multiplication">
                                    <option value="vedic_multiply_by_1001">Multiply by 1001</option>
                                    <option value="vedic_multiply_by_5_25_125">Multiply by 5, 25, 125</option>
                                    <option value="vedic_multiply_by_5_50_500">Multiply by 5, 50, 500</option>
                                  </optgroup>
                                  <optgroup label="Level 2 - Division">
                                    <option value="vedic_divide_by_5_25_125">Divide by 5, 25, 125</option>
                                    <option value="vedic_divide_by_5_50_500">Divide by 5, 50, 500</option>
                                    <option value="vedic_divide_with_remainder">Divide (with remainder)</option>
                                    <option value="vedic_divide_by_9s_repetition_equal">Divide by 9's Repetition (Equal)</option>
                                    <option value="vedic_divide_by_9s_repetition_less_than">Divide by 9's Repetition (Less Than)</option>
                                    <option value="vedic_divide_by_11s_repetition_equal">Divide by 11's Repetition (Equal)</option>
                                    <option value="vedic_divide_by_11s_repetition_less_than">Divide by 11's Repetition (Less Than)</option>
                                    <option value="vedic_divide_by_7">Divide by 7</option>
                                  </optgroup>
                                  <optgroup label="Level 2 - Subtraction">
                                    <option value="vedic_subtraction_powers_of_10">Subtraction (Powers of 10)</option>
                                  </optgroup>
                                  <optgroup label="Level 2 - Special Products">
                                    <option value="vedic_special_products_base_1000">Special Products (Base 1000)</option>
                                    <option value="vedic_special_products_cross_multiply">Special Products (Cross Multiply)</option>
                                    <option value="vedic_special_products_cross_base">Special Products (Cross Base)</option>
                                    <option value="vedic_special_products_cross_base_50">Special Products (Cross Base 50)</option>
                                  </optgroup>
                                  <optgroup label="Level 2 - Duplex & Squares">
                                    <option value="vedic_duplex">Find the Duplex</option>
                                    <option value="vedic_squares_duplex">Squares (Duplex Method)</option>
                                  </optgroup>
                                  <optgroup label="Level 2 - Other">
                                    <option value="vedic_dropping_10_method">Dropping 10 Method</option>
                                    <option value="vedic_tables_large">Tables (1111-9999)</option>
                                    <option value="vedic_vinculum">Vinculum (Coming Soon)</option>
                                    <option value="vedic_devinculum">DeVinculum (Coming Soon)</option>
                              </optgroup>
                            </>
                              )}
                              {/* Show Level 3 operations in Custom mode */}
                              {level === "Custom" && (
                                <>
                                  <optgroup label="Level 3 - Multiplication">
                                    <option value="vedic_multiply_by_111_999">Multiply by 111-999</option>
                                    <option value="vedic_multiply_by_102_109">Multiply by 102-109</option>
                                    <option value="vedic_multiply_by_112_119">Multiply by 112-119</option>
                                    <option value="vedic_multiplication">Multiplication (2x2, 3x2, etc.)</option>
                                    <option value="vedic_mix_multiplication">Mix Multiplication (2x2x2)</option>
                                    <option value="vedic_combined_operation">Combined Operation</option>
                                    <option value="vedic_multiply_by_10001">Multiply by 10001</option>
                            </optgroup>
                                  <optgroup label="Level 3 - Fractions">
                                    <option value="vedic_fraction_simplification">Fraction (Simplification)</option>
                                    <option value="vedic_fraction_addition">Fraction (Addition)</option>
                                    <option value="vedic_fraction_subtraction">Fraction (Subtraction)</option>
                            </optgroup>
                                  <optgroup label="Level 3 - Squares">
                                    <option value="vedic_squares_level3">Squares (Repeating Digits)</option>
                                    <option value="vedic_squares_addition">Squares Addition</option>
                                    <option value="vedic_squares_subtraction">Squares Subtraction</option>
                                    <option value="vedic_squares_deviation">Squares (Deviation Method)</option>
                                    <option value="vedic_squares_large">Squares (Large Numbers)</option>
                                  </optgroup>
                                  <optgroup label="Level 3 - Other">
                                    <option value="vedic_percentage_level3">Percentage</option>
                                    <option value="vedic_cubes">Cubes</option>
                                    <option value="vedic_check_divisibility">Check The Divisibility</option>
                                    <option value="vedic_missing_numbers">Missing Numbers</option>
                                    <option value="vedic_duplex_level3">Find The Duplex</option>
                                    <option value="vedic_box_multiply">Box Multiply (Coming Soon)</option>
                                  </optgroup>
                                </>
                              )}
                              {/* Show Level 4 operations in Custom mode */}
                              {level === "Custom" && (
                                <>
                                  <optgroup label="Level 4 - Multiplication">
                                    <option value="vedic_multiplication_level4">Multiplication</option>
                                    <option value="vedic_multiply_by_111_999_level4">Multiplication (111-999)</option>
                              </optgroup>
                                  <optgroup label="Level 4 - Addition/Subtraction">
                                    <option value="vedic_decimal_add_sub">Addition/Subtraction</option>
                                    <option value="vedic_bar_add_sub">Bar Addition/Subtraction (Coming Soon)</option>
                                  </optgroup>
                                  <optgroup label="Level 4 - Fun with Numbers">
                                    <option value="vedic_fun_with_5_level4">Fun with Five</option>
                                    <option value="vedic_fun_with_10_level4">Fun with Ten</option>
                                  </optgroup>
                                  <optgroup label="Level 4 - Algebra">
                                    <option value="vedic_find_x">Find The Value of X</option>
                                  </optgroup>
                                  <optgroup label="Level 4 - Division">
                                    <option value="vedic_division_without_remainder">Division (without remainder)</option>
                                    <option value="vedic_division_with_remainder">Division (with remainder)</option>
                                    <option value="vedic_divide_by_11_99">Divide By 11-99</option>
                                    <option value="vedic_division_9_8_7_6">Division (9, 8, 7, 6)</option>
                                    <option value="vedic_division_91_121">Division (91, 121)</option>
                                  </optgroup>
                                  <optgroup label="Level 4 - Fractions">
                                    <option value="vedic_fraction_multiplication">Fraction (Multiplication)</option>
                                    <option value="vedic_fraction_division">Fraction (Division)</option>
                                  </optgroup>
                                  <optgroup label="Level 4 - HCF &amp; LCM">
                                    <option value="vedic_hcf">HCF</option>
                                    <option value="vedic_lcm_level4">LCM</option>
                                  </optgroup>
                                  <optgroup label="Level 4 - Divisibility &amp; Digital">
                                    <option value="vedic_check_divisibility_level4">Check The Divisibility</option>
                                    <option value="vedic_digital_sum">Digital Sum</option>
                                  </optgroup>
                                  <optgroup label="Level 4 - Cubes &amp; Cube Root">
                                    <option value="vedic_cubes_base_method">Cubes (Base Method)</option>
                                    <option value="vedic_check_perfect_cube">Check The Perfect Cube</option>
                                    <option value="vedic_cube_root_level4">Cube Root</option>
                                  </optgroup>
                                  <optgroup label="Level 4 - Other">
                                    <option value="vedic_square_root_level4">Square Root</option>
                                    <option value="vedic_bodmas">BODMAS</option>
                                    <option value="vedic_magic_square">Magic Square (Coming Soon)</option>
                                  </optgroup>
                                </>
                              )}
                            </>
                          ) : (level === "Vedic-Level-2") ? (
                            <>
                              <optgroup label="Fun with Numbers">
                                <option value="vedic_fun_with_9_equal">Fun with 9 (Equal)</option>
                                <option value="vedic_fun_with_9_less_than">Fun with 9 (Less Than)</option>
                                <option value="vedic_fun_with_9_greater_than">Fun with 9 (Greater Than)</option>
                                <option value="vedic_fun_with_5">Fun with 5</option>
                                <option value="vedic_fun_with_10">Fun with 10</option>
                              </optgroup>
                              <optgroup label="Multiplication">
                                <option value="vedic_multiply_by_1001">Multiply by 1001</option>
                                <option value="vedic_multiply_by_5_25_125">Multiply by 5, 25, 125</option>
                                <option value="vedic_multiply_by_5_50_500">Multiply by 5, 50, 500</option>
                              </optgroup>
                              <optgroup label="Division">
                                <option value="vedic_divide_by_5_25_125">Divide by 5, 25, 125</option>
                                <option value="vedic_divide_by_5_50_500">Divide by 5, 50, 500</option>
                                <option value="vedic_divide_with_remainder">Divide (with remainder)</option>
                                <option value="vedic_divide_by_9s_repetition_equal">Divide by 9's Repetition (Equal)</option>
                                <option value="vedic_divide_by_9s_repetition_less_than">Divide by 9's Repetition (Less Than)</option>
                                <option value="vedic_divide_by_11s_repetition_equal">Divide by 11's Repetition (Equal)</option>
                                <option value="vedic_divide_by_11s_repetition_less_than">Divide by 11's Repetition (Less Than)</option>
                                <option value="vedic_divide_by_7">Divide by 7</option>
                              </optgroup>
                              <optgroup label="Subtraction">
                                <option value="vedic_subtraction_powers_of_10">Subtraction (Powers of 10)</option>
                              </optgroup>
                              <optgroup label="Special Products">
                                <option value="vedic_special_products_base_1000">Special Products (Base 1000)</option>
                                <option value="vedic_special_products_cross_multiply">Special Products (Cross Multiply)</option>
                                <option value="vedic_special_products_cross_base">Special Products (Cross Base)</option>
                                <option value="vedic_special_products_cross_base_50">Special Products (Cross Base 50)</option>
                              </optgroup>
                              <optgroup label="Duplex & Squares">
                                <option value="vedic_duplex">Find the Duplex</option>
                                <option value="vedic_squares_duplex">Squares (Duplex Method)</option>
                              </optgroup>
                              <optgroup label="Other">
                                <option value="vedic_dropping_10_method">Dropping 10 Method</option>
                                <option value="vedic_vinculum">Vinculum (Coming Soon)</option>
                                <option value="vedic_devinculum">DeVinculum (Coming Soon)</option>
                              </optgroup>
                            </>
                          ) : (level === "Vedic-Level-3") ? (
                            <>
                              <optgroup label="Multiplication">
                                <option value="vedic_multiply_by_111_999">Multiply by 111-999</option>
                                <option value="vedic_multiply_by_102_109">Multiply by 102-109</option>
                                <option value="vedic_multiply_by_112_119">Multiply by 112-119</option>
                                <option value="vedic_multiplication">Multiplication (2x2, 3x2, etc.)</option>
                                <option value="vedic_mix_multiplication">Mix Multiplication (2x2x2)</option>
                                <option value="vedic_combined_operation">Combined Operation</option>
                                <option value="vedic_multiply_by_10001">Multiply by 10001</option>
                              </optgroup>
                              <optgroup label="Fractions">
                                <option value="vedic_fraction_simplification">Fraction (Simplification)</option>
                                <option value="vedic_fraction_addition">Fraction (Addition)</option>
                                <option value="vedic_fraction_subtraction">Fraction (Subtraction)</option>
                              </optgroup>
                              <optgroup label="Squares">
                                <option value="vedic_squares_level3">Squares (Repeating Digits)</option>
                                <option value="vedic_squares_addition">Squares Addition</option>
                                <option value="vedic_squares_subtraction">Squares Subtraction</option>
                                <option value="vedic_squares_deviation">Squares (Deviation Method)</option>
                                <option value="vedic_squares_large">Squares (Large Numbers)</option>
                              </optgroup>
                              <optgroup label="Other">
                                <option value="vedic_percentage_level3">Percentage</option>
                                <option value="vedic_cubes">Cubes</option>
                                <option value="vedic_check_divisibility">Check The Divisibility</option>
                                <option value="vedic_missing_numbers">Missing Numbers</option>
                                <option value="vedic_duplex_level3">Find The Duplex</option>
                                <option value="vedic_box_multiply">Box Multiply (Coming Soon)</option>
                              </optgroup>
                            </>
                          ) : level === "Vedic-Level-4" ? (
                            <>
                              <optgroup label="Multiplication">
                                <option value="vedic_multiplication_level4">Multiplication</option>
                                <option value="vedic_multiply_by_111_999_level4">Multiplication (111-999)</option>
                              </optgroup>
                              <optgroup label="Addition/Subtraction">
                                <option value="vedic_decimal_add_sub">Addition/Subtraction</option>
                                <option value="vedic_bar_add_sub">Bar Addition/Subtraction (Coming Soon)</option>
                              </optgroup>
                              <optgroup label="Fun with Numbers">
                                <option value="vedic_fun_with_5_level4">Fun with Five</option>
                                <option value="vedic_fun_with_10_level4">Fun with Ten</option>
                              </optgroup>
                              <optgroup label="Algebra">
                                <option value="vedic_find_x">Find The Value of X</option>
                              </optgroup>
                              <optgroup label="Division">
                                <option value="vedic_division_without_remainder">Division (without remainder)</option>
                                <option value="vedic_division_with_remainder">Division (with remainder)</option>
                                <option value="vedic_divide_by_11_99">Divide By 11-99</option>
                                <option value="vedic_division_9_8_7_6">Division (9, 8, 7, 6)</option>
                                <option value="vedic_division_91_121">Division (91, 121)</option>
                              </optgroup>
                              <optgroup label="Fractions">
                                <option value="vedic_fraction_multiplication">Fraction (Multiplication)</option>
                                <option value="vedic_fraction_division">Fraction (Division)</option>
                              </optgroup>
                              <optgroup label="HCF &amp; LCM">
                                <option value="vedic_hcf">HCF</option>
                                <option value="vedic_lcm_level4">LCM</option>
                              </optgroup>
                              <optgroup label="Divisibility &amp; Digital">
                                <option value="vedic_check_divisibility_level4">Check The Divisibility</option>
                                <option value="vedic_digital_sum">Digital Sum</option>
                              </optgroup>
                              <optgroup label="Cubes &amp; Cube Root">
                                <option value="vedic_cubes_base_method">Cubes (Base Method)</option>
                                <option value="vedic_check_perfect_cube">Check The Perfect Cube</option>
                                <option value="vedic_cube_root_level4">Cube Root</option>
                              </optgroup>
                              <optgroup label="Other">
                                <option value="vedic_square_root_level4">Square Root</option>
                                <option value="vedic_bodmas">BODMAS</option>
                                <option value="vedic_magic_square">Magic Square (Coming Soon)</option>
                              </optgroup>
                            </>
                          ) : (
                            <optgroup label="Basic Operations">
                              <option value="add_sub">Add/Sub</option>
                              <option value="multiplication">Multiplication</option>
                              <option value="division">Division</option>
                            </optgroup>
                          )}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 mt-2" style={{gap:12}}>
                      <div>
                        <label className="block text-sm font-medium  text-white mb-1">
                          {block.type === "vedic_tables" || block.type === "vedic_tables_large" ? "Rows" : "Questions (1-200)"}
                        </label>
                        <input
                          type="text"
                          value={block.type === "vedic_tables" || block.type === "vedic_tables_large"
                            ? (block.constraints.rows === -1 ? "" : String(block.constraints.rows ?? 10))
                            : (block.count === -1 ? "" : String(block.count ?? 1))}
                          onChange={(e) => {
                            const val = e.target.value;
                            const fieldName = block.type === "vedic_tables" || block.type === "vedic_tables_large" ? "rows" : "count";
                            
                            if (block.type === "vedic_tables" || block.type === "vedic_tables_large") {
                              // For tables, use rows instead of count
                              if (val === "" || /^\d+$/.test(val)) {
                                if (val === "") {
                                  setFieldError(index, fieldName, null);
                                  updateBlock(index, { constraints: { ...block.constraints, rows: -1 as any } });
                                } else {
                                  const numVal = parseInt(val);
                                  updateBlock(index, { constraints: { ...block.constraints, rows: numVal } });
                                  // Real-time validation
                                  if (numVal < 2) {
                                    setFieldError(index, fieldName, "Minimum value for Rows is 3");
                                  } else if (numVal > 100) {
                                    setFieldError(index, fieldName, "Maximum value for Rows is 100");
                                  } else {
                                    setFieldError(index, fieldName, null);
                                  }
                                }
                              }
                            } else {
                              // Allow empty string, or numbers that are either incomplete (like "1" when typing "10") or valid
                              if (val === "" || /^\d+$/.test(val)) {
                                if (val === "") {
                                  setFieldError(index, fieldName, null);
                                  updateBlock(index, { count: -1 as any });
                                } else {
                                  const numVal = parseInt(val);
                                  updateBlock(index, { count: numVal });
                                  // Real-time validation
                                  if (numVal < 1) {
                                    setFieldError(index, fieldName, "Minimum value for Questions is 1");
                                  } else if (numVal > 200) {
                                    setFieldError(index, fieldName, "Maximum value for Questions is 200");
                                  } else {
                                    setFieldError(index, fieldName, null);
                                  }
                                }
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val !== "" && block.type !== "vedic_tables" && block.type !== "vedic_tables_large") {
                              const numVal = parseInt(val);
                              if (numVal < 1 || numVal > 200) {
                                // Error already shown from onChange, just ensure value is clamped on blur
                                updateBlock(index, { count: Math.max(1, Math.min(200, numVal)) });
                              }
                            }
                          }}
                          className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white ${
                            getFieldError(index, block.type === "vedic_tables" || block.type === "vedic_tables_large" ? "rows" : "count")
                              ? "focus:ring-red-200"
                              : "focus:ring-blue-200"
                          }`}
                        />
                        {getFieldError(index, block.type === "vedic_tables" || block.type === "vedic_tables_large" ? "rows" : "count") && (
                          <p className="mt-1 text-sm text-red-600">{getFieldError(index, block.type === "vedic_tables" || block.type === "vedic_tables_large" ? "rows" : "count")}</p>
                        )}
                      </div>

                      {block.type === "intl_add_sub" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">Digit Range</label>
                            <select
                              value={block.constraints.intlAddSubPreset || "1_2"}
                              onChange={(e) => {
                                setFieldError(index, "intlAddSubPreset", null);
                                updateBlock(index, {
                                  constraints: {
                                    ...block.constraints,
                                    intlAddSubPreset: e.target.value as "1_2" | "2_3",
                                  },
                                });
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white ${
                                getFieldError(index, "intlAddSubPreset")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            >
                              <option value="1_2">1 & 2 Digits</option>
                              <option value="2_3">2 & 3 Digits</option>
                            </select>
                            {getFieldError(index, "intlAddSubPreset") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "intlAddSubPreset")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">Rows (3-30)</label>
                            <input
                              type="text"
                              maxLength={10}
                              value={block.constraints.rows === -1 || block.constraints.rows === undefined ? "" : String(block.constraints.rows)}
                              placeholder="3"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                  setFieldError(index, "rows", null);
                                  updateBlock(index, {
                                    constraints: { ...block.constraints, rows: -1 as any },
                                  });
                                } else if (/^\d+$/.test(val)) {
                                  const numVal = parseInt(val);
                                  updateBlock(index, {
                                    constraints: { ...block.constraints, rows: numVal },
                                  });
                                  if (numVal < 3) {
                                    setFieldError(index, "rows", "Minimum value for Rows is 3");
                                  } else if (numVal > 30) {
                                    setFieldError(index, "rows", "Maximum value for Rows is 30");
                                  } else {
                                    setFieldError(index, "rows", null);
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "rows")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "rows") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "rows")}</p>
                            )}
                          </div>
                        </>
                      )}

                      {(block.type === "addition" || block.type === "subtraction" || block.type === "add_sub" || block.type === "integer_add_sub" || block.type === "decimal_add_sub" || block.type === "direct_add_sub" || block.type === "small_friends_add_sub" || block.type === "big_friends_add_sub" || block.type === "mix_friends_add_sub") && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              {block.type === "decimal_add_sub" ? "Digits (Before Decimal) (1-10)" : (block.type === "direct_add_sub" || block.type === "small_friends_add_sub" || block.type === "big_friends_add_sub" || block.type === "mix_friends_add_sub") ? "Digits (1-4)" : "Digits (1-10)"}
                            </label>
                            <input
                              type="text"
                              maxLength={10}
                              value={block.constraints.digits === -1 || block.constraints.digits === undefined ? "" : String(block.constraints.digits)}
                              placeholder="1"
                              onChange={(e) => {
                                const val = e.target.value;
                                // Allow any numeric input (digits only) - validate and show errors for out-of-range values
                                  if (val === "") {
                                    setFieldError(index, "digits", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, digits: -1 as any },
                                    });
                                } else if (/^\d+$/.test(val)) {
                                  // Allow any numeric value, even if outside range
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, digits: numVal },
                                    });
                                  // Real-time validation - show error if outside range
                                    const _maxD = (block.type === "direct_add_sub" || block.type === "small_friends_add_sub" || block.type === "big_friends_add_sub" || block.type === "mix_friends_add_sub") ? 4 : 10;
                                    if (numVal < 1) {
                                      setFieldError(index, "digits", "Minimum value for Digits is 1");
                                    } else if (numVal > _maxD) {
                                      setFieldError(index, "digits", `Maximum value for Digits is ${_maxD}`);
                                    } else {
                                      setFieldError(index, "digits", null);
                                    }
                                  }
                                // If input contains non-numeric characters, don't update (prevent typing letters/symbols)
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "digits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "digits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "digits")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">{(block.type === "direct_add_sub" || block.type === "small_friends_add_sub" || block.type === "big_friends_add_sub" || block.type === "mix_friends_add_sub") ? "Rows (3-10)" : "Rows (3-30)"}</label>
                            <input
                              type="text"
                              maxLength={10}
                              value={block.constraints.rows === -1 || block.constraints.rows === undefined ? "" : String(block.constraints.rows)}
                              placeholder="3"
                              onChange={(e) => {
                                const val = e.target.value;
                                // Allow any numeric input (digits only) - validate and show errors for out-of-range values
                                  if (val === "") {
                                    setFieldError(index, "rows", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, rows: -1 as any },
                                    });
                                } else if (/^\d+$/.test(val)) {
                                  // Allow any numeric value, even if outside range
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, rows: numVal },
                                    });
                                  // Real-time validation - show error if outside range
                                    const _maxR = (block.type === "direct_add_sub" || block.type === "small_friends_add_sub" || block.type === "big_friends_add_sub" || block.type === "mix_friends_add_sub") ? 10 : 30;
                                    if (numVal < 3) {
                                      setFieldError(index, "rows", "Minimum value for Rows is 3");
                                    } else if (numVal > _maxR) {
                                      setFieldError(index, "rows", `Maximum value for Rows is ${_maxR}`);
                                    } else {
                                      setFieldError(index, "rows", null);
                                    }
                                  }
                                // If input contains non-numeric characters, don't update (prevent typing letters/symbols)
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "rows")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "rows") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "rows")}</p>
                            )}
                          </div>
                        </>
                      )}

                      {(block.type === "multiplication" || block.type === "division" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              {(block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") ? "Multiplicand Digits (1-20)" : "Dividend Digits (1-20)"}
                            </label>
                            <input
                              type="text"
                              maxLength={10}
                              value={
                                (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4")
                                  ? block.constraints.multiplicandDigits === -1 || block.constraints.multiplicandDigits === undefined ? "" : String(block.constraints.multiplicandDigits)
                                  : block.constraints.dividendDigits === -1 || block.constraints.dividendDigits === undefined ? "" : String(block.constraints.dividendDigits)
                              }
                              placeholder={
                                (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4")
                                  ? String(block.type === "vedic_multiplication_level4" ? 3 : block.type === "vedic_multiply_by_111_999_level4" ? 3 : 2)
                                  : "2"  // Min 2 for dividendDigits
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                const fieldName = (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") ? "multiplicandDigits" : "dividendDigits";
                                const fieldLabel = (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") ? "Multiplicand Digits" : "Dividend Digits";
                                
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, fieldName, null);
                                    if (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") {
                                      updateBlock(index, {
                                        constraints: { ...block.constraints, multiplicandDigits: -1 as any },
                                      });
                                    } else {
                                      updateBlock(index, {
                                        constraints: { ...block.constraints, dividendDigits: -1 as any },
                                      });
                                    }
                                  } else {
                                    const numVal = parseInt(val);
                                    if (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") {
                                      updateBlock(index, {
                                        constraints: { ...block.constraints, multiplicandDigits: numVal },
                                      });
                                    } else {
                                      updateBlock(index, {
                                        constraints: { ...block.constraints, dividendDigits: numVal },
                                      });
                                    }
                                    // Real-time validation
                                    const minVal = (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") ? 2 : 2;  // Min 2 for both
                                    if (numVal < minVal) {
                                      setFieldError(index, fieldName, `Minimum value for ${fieldLabel} is ${minVal}`);
                                    } else if (numVal > 20) {
                                      setFieldError(index, fieldName, `Maximum value for ${fieldLabel} is 20`);
                                    } else {
                                      setFieldError(index, fieldName, null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") ? "multiplicandDigits" : "dividendDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") ? "multiplicandDigits" : "dividendDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") ? "multiplicandDigits" : "dividendDigits")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              {(block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") ? "Multiplier Digits (1-20)" : "Divisor Digits (1-20)"}
                            </label>
                            <input
                              type="text"
                              maxLength={10}
                              value={
                                (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4")
                                  ? block.constraints.multiplierDigits === -1 || block.constraints.multiplierDigits === undefined ? "" : String(block.constraints.multiplierDigits)
                                  : block.constraints.divisorDigits === -1 || block.constraints.divisorDigits === undefined ? "" : String(block.constraints.divisorDigits)
                              }
                              placeholder={
                                (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4")
                                  ? String(block.type === "vedic_multiplication_level4" ? 2 : block.type === "vedic_multiply_by_111_999_level4" ? 4 : 1)
                                  : "1"
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                const fieldName = (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") ? "multiplierDigits" : "divisorDigits";
                                const fieldLabel = (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") ? "Multiplier Digits" : "Divisor Digits";
                                
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, fieldName, null);
                                    if (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") {
                                      updateBlock(index, {
                                        constraints: { ...block.constraints, multiplierDigits: -1 as any },
                                      });
                                    } else {
                                      updateBlock(index, {
                                        constraints: { ...block.constraints, divisorDigits: -1 as any },
                                      });
                                    }
                                  } else {
                                    const numVal = parseInt(val);
                                    if (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") {
                                      updateBlock(index, {
                                        constraints: { ...block.constraints, multiplierDigits: numVal },
                                      });
                                    } else {
                                      updateBlock(index, {
                                        constraints: { ...block.constraints, divisorDigits: numVal },
                                      });
                                    }
                                    // Real-time validation
                                    if (numVal < 1) {
                                      setFieldError(index, fieldName, `Minimum value for ${fieldLabel} is 1`);
                                    } else if (numVal > 20) {
                                      setFieldError(index, fieldName, `Maximum value for ${fieldLabel} is 20`);
                                    } else {
                                      setFieldError(index, fieldName, null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") ? "multiplierDigits" : "divisorDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") ? "multiplierDigits" : "divisorDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, (block.type === "multiplication" || block.type === "vedic_multiplication_level4" || block.type === "vedic_multiply_by_111_999_level4") ? "multiplierDigits" : "divisorDigits")}</p>
                            )}
                          </div>
                        </>
                      )}

                      {(block.type === "square_root" || block.type === "cube_root") && (
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              Root Digits (1-30)
                            </label>
                            <input
                              type="text"
                              maxLength={10}
                              value={
                                block.constraints.rootDigits === -1 || block.constraints.rootDigits === undefined ? "" : String(block.constraints.rootDigits)
                              }
                              placeholder={block.type === "square_root" ? "4" : "5"}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "rootDigits", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, rootDigits: -1 as any },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, rootDigits: numVal },
                                    });
                                    // Real-time validation
                                    if (numVal < 1) {
                                      setFieldError(index, "rootDigits", "Minimum value for Root Digits is 1");
                                    } else if (numVal > 30) {
                                      setFieldError(index, "rootDigits", "Maximum value for Root Digits is 30");
                                    } else {
                                      setFieldError(index, "rootDigits", null);
                                    }
                                  }
                                }
                              }}
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white ${
                              getFieldError(index, "rootDigits")
                                ? "focus:ring-red-200"
                                : "focus:ring-blue-200"
                            }`}
                          />
                          {getFieldError(index, "rootDigits") && (
                            <p className="mt-1 text-sm text-red-600">{getFieldError(index, "rootDigits")}</p>
                          )}
                        </div>
                      )}

                      {block.type === "decimal_multiplication" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              Multiplicand Digits (Before Decimal) (2-20)
                            </label>
                            <input
                              type="text"
                              value={
                                block.constraints.multiplicandDigits === -1 || block.constraints.multiplicandDigits === undefined ? "" : String(block.constraints.multiplicandDigits)
                              }
                              placeholder="3"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "multiplicandDigits", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, multiplicandDigits: -1 as any },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, multiplicandDigits: numVal },
                                    });
                                    // Real-time validation
                                    if (numVal < 2) {
                                      setFieldError(index, "multiplicandDigits", "Minimum value for Multiplicand Digits (Before Decimal) is 2");
                                    } else if (numVal > 20) {
                                      setFieldError(index, "multiplicandDigits", "Maximum value for Multiplicand Digits (Before Decimal) is 20");
                                    } else {
                                      setFieldError(index, "multiplicandDigits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "multiplicandDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "multiplicandDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "multiplicandDigits")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              Multiplier Digits (0 = Whole, 1-20 = Before Decimal)
                            </label>
                            <input
                              type="text"
                              value={
                                block.constraints.multiplierDigits === -1 || block.constraints.multiplierDigits === undefined ? "" : String(block.constraints.multiplierDigits)
                              }
                              placeholder="1"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "multiplierDigits", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, multiplierDigits: -1 as any },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, multiplierDigits: numVal },
                                    });
                                    // Real-time validation
                                    if (numVal < 0) {
                                      setFieldError(index, "multiplierDigits", "Minimum value for Multiplier Digits is 0");
                                    } else if (numVal > 20) {
                                      setFieldError(index, "multiplierDigits", "Maximum value for Multiplier Digits is 20");
                                    } else {
                                      setFieldError(index, "multiplierDigits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "multiplierDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "multiplierDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "multiplierDigits")}</p>
                            )}
                          </div>
                        </>
                      )}

                      {block.type === "decimal_division" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              Dividend Digits (2-20)
                            </label>
                            <input
                              type="text"
                              value={
                                block.constraints.dividendDigits === -1 || block.constraints.dividendDigits === undefined ? "" : String(block.constraints.dividendDigits)
                              }
                              placeholder="3"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "dividendDigits", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, dividendDigits: -1 as any },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, dividendDigits: numVal },
                                    });
                                    // Real-time validation
                                    if (numVal < 2) {
                                      setFieldError(index, "dividendDigits", "Minimum value for Dividend Digits is 2");
                                    } else if (numVal > 20) {
                                      setFieldError(index, "dividendDigits", "Maximum value for Dividend Digits is 20");
                                    } else {
                                      setFieldError(index, "dividendDigits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "dividendDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "dividendDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "dividendDigits")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              Divisor Digits (1-20)
                            </label>
                            <input
                              type="text"
                              value={
                                block.constraints.divisorDigits === -1 || block.constraints.divisorDigits === undefined ? "" : String(block.constraints.divisorDigits)
                              }
                              placeholder="1"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "divisorDigits", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, divisorDigits: -1 as any },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, divisorDigits: numVal },
                                    });
                                    // Real-time validation
                                    if (numVal < 1) {
                                      setFieldError(index, "divisorDigits", "Minimum value for Divisor Digits is 1");
                                    } else if (numVal > 20) {
                                      setFieldError(index, "divisorDigits", "Maximum value for Divisor Digits is 20");
                                    } else {
                                      setFieldError(index, "divisorDigits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "divisorDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "divisorDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "divisorDigits")}</p>
                            )}
                          </div>
                        </>
                      )}

                      {(block.type === "percentage") && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              Percentage Min (1-100)
                              {block.constraints.percentageMin !== undefined && block.constraints.percentageMax !== undefined && block.constraints.percentageMin > block.constraints.percentageMax && (
                                <span className="text-red-500 text-xs ml-2">⚠ Min &gt; Max</span>
                              )}
                            </label>
                            <input
                              type="text"
                              maxLength={10}
                              value={
                                block.constraints.percentageMin === undefined ? "" : String(block.constraints.percentageMin)
                              }
                              placeholder="1"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "percentageMin", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, percentageMin: undefined },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, percentageMin: numVal },
                                    });
                                    // Real-time validation
                                    if (numVal < 1) {
                                      setFieldError(index, "percentageMin", "Minimum value for Percentage Min is 1");
                                    } else if (numVal > 100) {
                                      setFieldError(index, "percentageMin", "Maximum value for Percentage Min is 100");
                                    } else if (block.constraints.percentageMax !== undefined && numVal > block.constraints.percentageMax) {
                                      setFieldError(index, "percentageMin", "Percentage Min cannot be greater than Percentage Max");
                                    } else {
                                      setFieldError(index, "percentageMin", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "percentageMin") || (block.constraints.percentageMin !== undefined && block.constraints.percentageMax !== undefined && block.constraints.percentageMin > block.constraints.percentageMax)
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "percentageMin") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "percentageMin")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              Percentage Max (1-100)
                              {block.constraints.percentageMin !== undefined && block.constraints.percentageMax !== undefined && block.constraints.percentageMin > block.constraints.percentageMax && (
                                <span className="text-red-500 text-xs ml-2">⚠ Min &gt; Max</span>
                              )}
                            </label>
                            <input
                              type="text"
                              maxLength={10}
                              value={
                                block.constraints.percentageMax === undefined ? "" : String(block.constraints.percentageMax)
                              }
                              placeholder="100"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "percentageMax", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, percentageMax: undefined },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, percentageMax: numVal },
                                    });
                                    // Real-time validation
                                    if (numVal < 1) {
                                      setFieldError(index, "percentageMax", "Minimum value for Percentage Max is 1");
                                    } else if (numVal > 100) {
                                      setFieldError(index, "percentageMax", "Maximum value for Percentage Max is 100");
                                    } else if (block.constraints.percentageMin !== undefined && numVal < block.constraints.percentageMin) {
                                      setFieldError(index, "percentageMax", "Percentage Max cannot be less than Percentage Min");
                                    } else {
                                      setFieldError(index, "percentageMax", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "percentageMax") || (block.constraints.percentageMin !== undefined && block.constraints.percentageMax !== undefined && block.constraints.percentageMin > block.constraints.percentageMax)
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "percentageMax") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "percentageMax")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              Number Digits (1-10)
                            </label>
                            <input
                              type="text"
                              maxLength={10}
                              value={
                                block.constraints.numberDigits === undefined ? "" : String(block.constraints.numberDigits)
                              }
                              placeholder="4"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "numberDigits", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, numberDigits: undefined },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, numberDigits: numVal },
                                    });
                                    // Real-time validation
                                    if (numVal < 1) {
                                      setFieldError(index, "numberDigits", "Minimum value for Number Digits is 1");
                                    } else if (numVal > 10) {
                                      setFieldError(index, "numberDigits", "Maximum value for Number Digits is 10");
                                    } else {
                                      setFieldError(index, "numberDigits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "numberDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "numberDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "numberDigits")}</p>
                            )}
                          </div>
                        </>
                      )}

                      {/* Vedic Maths Level 1 Constraints */}
                      {(block.type.startsWith("vedic_") && (block.type === "vedic_multiply_by_11" || block.type === "vedic_multiply_by_101" || block.type === "vedic_multiply_by_2" || block.type === "vedic_multiply_by_4" || block.type === "vedic_multiply_by_6" || block.type === "vedic_divide_by_2" || block.type === "vedic_divide_by_4" || block.type === "vedic_divide_by_11")) && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Digits (2-30)</label>
                          <input
                            type="text"
                            maxLength={10}
                            value={block.constraints.digits === -1 || block.constraints.digits === undefined ? "" : String(block.constraints.digits)}
                            placeholder={block.type === "vedic_divide_by_11" ? "3" : "2"}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Allow any numeric input (digits only) - validate and show errors for out-of-range values
                                if (val === "") {
                                  setFieldError(index, "digits", null);
                                  updateBlock(index, { constraints: { ...block.constraints, digits: -1 as any } });
                              } else if (/^\d+$/.test(val)) {
                                // Allow any numeric value, even if outside range
                                  const numVal = parseInt(val);
                                  updateBlock(index, { constraints: { ...block.constraints, digits: numVal } });
                                // Real-time validation - show error if outside range
                                  if (numVal < 2) {
                                    setFieldError(index, "digits", "Minimum value for Digits is 2");
                                  } else if (numVal > 30) {
                                    setFieldError(index, "digits", "Maximum value for Digits is 30");
                                  } else {
                                    setFieldError(index, "digits", null);
                                  }
                                }
                              // If input contains non-numeric characters, don't update (prevent typing letters/symbols)
                            }}
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white ${
                              getFieldError(index, "digits")
                                ? "focus:ring-red-200"
                                : "focus:ring-blue-200"
                            }`}
                          />
                          {getFieldError(index, "digits") && (
                            <p className="mt-1 text-sm text-red-600">{getFieldError(index, "digits")}</p>
                          )}
                        </div>
                      )}

                      {(block.type === "vedic_subtraction_complement" || block.type === "vedic_subtraction_normal") && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Base (100, 1000, etc)</label>
                          <input
                            type="text"
                            maxLength={10}
                            value={block.constraints.base === undefined ? "" : String(block.constraints.base)}
                            placeholder="100"
                            onChange={(e) => {
                              const val = e.target.value;
                              // Allow any numeric input (digits only) - validate and show errors for out-of-range values
                                if (val === "") {
                                  updateBlock(index, { constraints: { ...block.constraints, base: undefined } });
                              } else if (/^\d+$/.test(val)) {
                                // Allow any numeric value, even if outside range
                                  const numVal = parseInt(val);
                                    updateBlock(index, { constraints: { ...block.constraints, base: numVal } });
                                // Real-time validation - show error if invalid
                                if (numVal <= 0) {
                                  setFieldError(index, "base", "Base must be greater than 0");
                                } else {
                                  setFieldError(index, "base", null);
                                }
                              }
                              // If input contains non-numeric characters, don't update (prevent typing letters/symbols)
                            }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2  focus:ring-blue-900/30 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500"
                          />
                        </div>
                      )}

                      {(block.type === "vedic_multiply_by_12_19" || block.type === "vedic_multiply_by_21_91") && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">Digits (2-30)</label>
                            <input
                              type="text"
                              value={block.constraints.digits === -1 || block.constraints.digits === undefined ? "" : String(block.constraints.digits)}
                              placeholder="3"
                              maxLength={10}
                              onChange={(e) => {
                                const val = e.target.value;
                                // Allow any numeric input (digits only) - validate and show errors for out-of-range values
                                  if (val === "") {
                                    setFieldError(index, "digits", null);
                                    updateBlock(index, { constraints: { ...block.constraints, digits: -1 as any } });
                                } else if (/^\d+$/.test(val)) {
                                  // Allow any numeric value, even if outside range
                                    const numVal = parseInt(val);
                                    updateBlock(index, { constraints: { ...block.constraints, digits: numVal } });
                                  // Real-time validation - show error if outside range
                                    if (numVal < 2) {
                                      setFieldError(index, "digits", "Minimum value for Digits is 2");
                                    } else if (numVal > 30) {
                                      setFieldError(index, "digits", "Maximum value for Digits is 30");
                                    } else {
                                      setFieldError(index, "digits", null);
                                    }
                                  }
                                // If input contains non-numeric characters, don't update (prevent typing letters/symbols)
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "digits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "digits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "digits")}</p>
                            )}
                          </div>
                          {block.type === "vedic_multiply_by_12_19" && (
                            <div>
                              <label className="block text-sm font-medium  text-white mb-1">Multiplier (12-19, optional)</label>
                              <input
                                type="text"
                                maxLength={10}
                                value={block.constraints.multiplier === undefined ? "" : String(block.constraints.multiplier)}
                                placeholder="12-19 (optional)"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Allow any numeric input (digits only) - validate and show errors for out-of-range values
                                    if (val === "") {
                                      setFieldError(index, "multiplier", null);
                                      updateBlock(index, { constraints: { ...block.constraints, multiplier: undefined } });
                                  } else if (/^\d+$/.test(val)) {
                                    // Allow any numeric value, even if outside range
                                      const numVal = parseInt(val);
                                      updateBlock(index, { constraints: { ...block.constraints, multiplier: numVal } });
                                    // Real-time validation - show error if outside range
                                      if (numVal < 12) {
                                        setFieldError(index, "multiplier", "Minimum value for Multiplier is 12");
                                      } else if (numVal > 19) {
                                        setFieldError(index, "multiplier", "Maximum value for Multiplier is 19");
                                      } else {
                                        setFieldError(index, "multiplier", null);
                                      }
                                    }
                                  // If input contains non-numeric characters, don't update (prevent typing letters/symbols)
                                }}
                                className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                  getFieldError(index, "multiplier")
                                    ? "focus:ring-red-200"
                                    : "focus:ring-blue-200"
                                }`}
                              />
                              {getFieldError(index, "multiplier") && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError(index, "multiplier")}</p>
                              )}
                            </div>
                          )}
                          {block.type === "vedic_multiply_by_21_91" && (
                            <div>
                              <label className="block text-sm font-medium  text-white mb-1">Multiplier (21-91, optional)</label>
                              <input
                                type="text"
                                value={block.constraints.multiplierRange === undefined ? "" : String(block.constraints.multiplierRange)}
                                placeholder="21-91 (optional)"
                                maxLength={10}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Allow any numeric input (digits only) - validate and show errors for out-of-range values
                                    if (val === "") {
                                      setFieldError(index, "multiplierRange", null);
                                      updateBlock(index, { constraints: { ...block.constraints, multiplierRange: undefined } });
                                  } else if (/^\d+$/.test(val)) {
                                    // Allow any numeric value, even if outside range
                                      const numVal = parseInt(val);
                                      updateBlock(index, { constraints: { ...block.constraints, multiplierRange: numVal } });
                                    // Real-time validation - show error if outside range
                                      if (numVal < 21) {
                                        setFieldError(index, "multiplierRange", "Minimum value for Multiplier is 21");
                                      } else if (numVal > 91) {
                                        setFieldError(index, "multiplierRange", "Maximum value for Multiplier is 91");
                                      } else {
                                        setFieldError(index, "multiplierRange", null);
                                      }
                                    }
                                  // If input contains non-numeric characters, don't update (prevent typing letters/symbols)
                                }}
                                className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                  getFieldError(index, "multiplierRange")
                                    ? "focus:ring-red-200"
                                    : "focus:ring-blue-200"
                                }`}
                              />
                              {getFieldError(index, "multiplierRange") && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError(index, "multiplierRange")}</p>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {block.type === "vedic_addition" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">First Number Digits (1-30)</label>
                            <input
                              type="text"
                              value={block.constraints.firstDigits === undefined ? "" : String(block.constraints.firstDigits)}
                              placeholder="3"
                              maxLength={10}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "firstDigits", null);
                                    updateBlock(index, { constraints: { ...block.constraints, firstDigits: undefined } });
                                  } else {
                                    const numVal = parseInt(val);
                                    // Allow any numeric value, even if outside range
                                    updateBlock(index, { constraints: { ...block.constraints, firstDigits: numVal } });
                                    // Real-time validation - show error if outside range
                                    if (numVal < 1) {
                                      setFieldError(index, "firstDigits", "Minimum value for First Number Digits is 1");
                                    } else if (numVal > 30) {
                                      setFieldError(index, "firstDigits", "Maximum value for First Number Digits is 30");
                                    } else {
                                      setFieldError(index, "firstDigits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "firstDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "firstDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "firstDigits")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">Second Number Digits (1-30)</label>
                            <input
                              type="text"
                              maxLength={10}
                              value={block.constraints.secondDigits === undefined ? "" : String(block.constraints.secondDigits)}
                              placeholder="3"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "secondDigits", null);
                                    updateBlock(index, { constraints: { ...block.constraints, secondDigits: undefined } });
                                  } else {
                                    const numVal = parseInt(val);
                                    // Allow any numeric value, even if outside range
                                    updateBlock(index, { constraints: { ...block.constraints, secondDigits: numVal } });
                                    // Real-time validation - show error if outside range
                                    if (numVal < 1) {
                                      setFieldError(index, "secondDigits", "Minimum value for Second Number Digits is 1");
                                    } else if (numVal > 30) {
                                      setFieldError(index, "secondDigits", "Maximum value for Second Number Digits is 30");
                                    } else {
                                      setFieldError(index, "secondDigits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "secondDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "secondDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "secondDigits")}</p>
                            )}
                          </div>
                        </>
                      )}

                      {block.type === "vedic_divide_single_digit" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">Digits (2-30)</label>
                            <input
                              type="text"
                              value={block.constraints.digits === -1 || block.constraints.digits === undefined ? "" : String(block.constraints.digits)}
                              placeholder="3"
                              maxLength={10}
                              onChange={(e) => {
                                const val = e.target.value;
                                // Allow any numeric input (digits only) - validate and show errors for out-of-range values
                                  if (val === "") {
                                    setFieldError(index, "digits", null);
                                    updateBlock(index, { constraints: { ...block.constraints, digits: -1 as any } });
                                } else if (/^\d+$/.test(val)) {
                                  // Allow any numeric value, even if outside range
                                    const numVal = parseInt(val);
                                    updateBlock(index, { constraints: { ...block.constraints, digits: numVal } });
                                  // Real-time validation - show error if outside range
                                    if (numVal < 2) {
                                      setFieldError(index, "digits", "Minimum value for Digits is 2");
                                    } else if (numVal > 30) {
                                      setFieldError(index, "digits", "Maximum value for Digits is 30");
                                    } else {
                                      setFieldError(index, "digits", null);
                                    }
                                  }
                                // If input contains non-numeric characters, don't update (prevent typing letters/symbols)
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "digits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "digits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "digits")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">Divisor (2-9, optional)</label>
                            <input
                              type="text"
                              maxLength={10}
                              value={block.constraints.divisor === undefined ? "" : String(block.constraints.divisor)}
                              placeholder="2-9 (optional)"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "divisor", null);
                                    updateBlock(index, { constraints: { ...block.constraints, divisor: undefined } });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, { constraints: { ...block.constraints, divisor: numVal } });
                                    // Real-time validation
                                    if (numVal < 2) {
                                      setFieldError(index, "divisor", "Minimum value for Divisor is 2");
                                    } else if (numVal > 9) {
                                      setFieldError(index, "divisor", "Maximum value for Divisor is 9");
                                    } else {
                                      setFieldError(index, "divisor", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "divisor")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "divisor") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "divisor")}</p>
                            )}
                          </div>
                        </>
                      )}

                      {block.type === "vedic_tables" && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Table Number (111-999, optional)</label>
                          <input
                            type="text"
                            value={block.constraints.tableNumber === undefined ? "" : String(block.constraints.tableNumber)}
                            placeholder="111-999 (optional)"
                            maxLength={10}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                if (val === "") {
                                  setFieldError(index, "tableNumber", null);
                                  updateBlock(index, { constraints: { ...block.constraints, tableNumber: undefined } });
                                } else {
                                  const numVal = parseInt(val);
                                  updateBlock(index, { constraints: { ...block.constraints, tableNumber: numVal } });
                                  // Real-time validation
                                  if (numVal < 111) {
                                    setFieldError(index, "tableNumber", "Minimum value for Table Number is 111");
                                  } else if (numVal > 999) {
                                    setFieldError(index, "tableNumber", "Maximum value for Table Number is 999");
                                  } else {
                                    setFieldError(index, "tableNumber", null);
                                  }
                                }
                              }
                            }}
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white ${
                              getFieldError(index, "tableNumber")
                                ? "focus:ring-red-200"
                                : "focus:ring-blue-200"
                            }`}
                          />
                          {getFieldError(index, "tableNumber") && (
                            <p className="mt-1 text-sm text-red-600">{getFieldError(index, "tableNumber")}</p>
                          )}
                        </div>
                      )}

                      {block.type === "vedic_tables_large" && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Table Number (1111-9999, optional)</label>
                          <input
                            type="text"
                            value={block.constraints.tableNumberLarge === undefined ? "" : String(block.constraints.tableNumberLarge)}
                            placeholder="1111-9999 (optional)"
                            maxLength={10}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                if (val === "") {
                                  setFieldError(index, "tableNumberLarge", null);
                                  updateBlock(index, { constraints: { ...block.constraints, tableNumberLarge: undefined } });
                                } else {
                                  const numVal = parseInt(val);
                                  updateBlock(index, { constraints: { ...block.constraints, tableNumberLarge: numVal } });
                                  // Real-time validation
                                  if (numVal < 1111) {
                                    setFieldError(index, "tableNumberLarge", "Minimum value for Table Number is 1111");
                                  } else if (numVal > 9999) {
                                    setFieldError(index, "tableNumberLarge", "Maximum value for Table Number is 9999");
                                  } else {
                                    setFieldError(index, "tableNumberLarge", null);
                                  }
                                }
                              }
                            }}
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white ${
                              getFieldError(index, "tableNumberLarge")
                                ? "focus:ring-red-200"
                                : "focus:ring-blue-200"
                            }`}
                          />
                          {getFieldError(index, "tableNumberLarge") && (
                            <p className="mt-1 text-sm text-red-600">{getFieldError(index, "tableNumberLarge")}</p>
                          )}
                        </div>
                      )}

                      {/* Vedic Maths Level 2 Constraints */}
                      {(block.type === "vedic_fun_with_9_equal" || block.type === "vedic_fun_with_9_less_than" || 
                        block.type === "vedic_fun_with_9_greater_than" || block.type === "vedic_multiply_by_1001" || block.type === "vedic_multiply_by_5_25_125" || 
                        block.type === "vedic_divide_by_5_25_125" || block.type === "vedic_multiply_by_5_50_500" || 
                        block.type === "vedic_divide_by_5_50_500" || block.type === "vedic_divide_with_remainder" || 
                        block.type === "vedic_divide_by_7" || 
                        block.type === "vedic_squares_duplex") && (
                          <div>
                          <label className="block text-sm font-medium  text-white mb-1">Digits (1-10, optional)</label>
                            <input
                              type="text"
                              value={block.constraints.digits === undefined || block.constraints.digits === -1 ? "" : String(block.constraints.digits)}
                            placeholder="2"
                            maxLength={10}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "digits", null);
                                    updateBlock(index, { constraints: { ...block.constraints, digits: undefined } });
                                  } else {
                                    const numVal = parseInt(val);
                                    // Allow any numeric value, even if outside range
                                    updateBlock(index, { constraints: { ...block.constraints, digits: numVal } });
                                    // Real-time validation - show error if outside range
                                    if (numVal < 1) {
                                      setFieldError(index, "digits", "Minimum value for Digits is 1");
                                    } else if (numVal > 10) {
                                      setFieldError(index, "digits", "Maximum value for Digits is 10");
                                    } else {
                                      setFieldError(index, "digits", null);
                                    }
                                  }
                                }
                              }}
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                              getFieldError(index, "digits")
                                ? "focus:ring-red-200"
                                : "focus:ring-blue-200"
                            }`}
                            />
                            {getFieldError(index, "digits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "digits")}</p>
                            )}
                          </div>
                      )}

                      {block.type === "vedic_duplex" && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Digits (2-10, optional)</label>
                          <input
                            type="text"
                            maxLength={10}
                            value={block.constraints.digits === undefined || block.constraints.digits === -1 ? "" : String(block.constraints.digits)}
                            placeholder="2"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                if (val === "") {
                                  setFieldError(index, "digits", null);
                                  updateBlock(index, { constraints: { ...block.constraints, digits: undefined } });
                                } else {
                                  const numVal = parseInt(val);
                                  // Allow any numeric value, even if outside range
                                  updateBlock(index, { constraints: { ...block.constraints, digits: numVal } });
                                  // Real-time validation - show error if outside range
                                  if (numVal < 2) {
                                    setFieldError(index, "digits", "Minimum value for Digits is 2");
                                  } else if (numVal > 10) {
                                    setFieldError(index, "digits", "Maximum value for Digits is 10");
                                  } else {
                                    setFieldError(index, "digits", null);
                                  }
                                }
                              }
                            }}
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                              getFieldError(index, "digits")
                                ? "focus:ring-red-200"
                                : "focus:ring-blue-200"
                            }`}
                          />
                          {getFieldError(index, "digits") && (
                            <p className="mt-1 text-sm text-red-600">{getFieldError(index, "digits")}</p>
                          )}
                        </div>
                      )}

                      {block.type === "vedic_subtraction_powers_of_10" && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Power of 10 (2-6, optional)</label>
                          <input
                            type="text"
                            value={block.constraints.powerOf10 === undefined ? "" : String(block.constraints.powerOf10)}
                            placeholder="2"
                            maxLength={10}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                if (val === "") {
                                  setFieldError(index, "powerOf10", null);
                                  updateBlock(index, { constraints: { ...block.constraints, powerOf10: undefined } });
                                } else {
                                  const numVal = parseInt(val);
                                  // Allow any numeric value, even if outside range
                                  updateBlock(index, { constraints: { ...block.constraints, powerOf10: numVal } });
                                  // Real-time validation - show error if outside range
                                  if (numVal < 2) {
                                    setFieldError(index, "powerOf10", "Minimum value for Power of 10 is 2");
                                  } else if (numVal > 6) {
                                    setFieldError(index, "powerOf10", "Maximum value for Power of 10 is 6");
                                  } else {
                                    setFieldError(index, "powerOf10", null);
                                  }
                                }
                              }
                            }}
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                              getFieldError(index, "powerOf10")
                                ? "focus:ring-red-200"
                                : "focus:ring-blue-200"
                            }`}
                          />
                          {getFieldError(index, "powerOf10") && (
                            <p className="mt-1 text-sm text-red-600">{getFieldError(index, "powerOf10")}</p>
                          )}
                        </div>
                      )}

                      {block.type === "vedic_special_products_cross_multiply" && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Base (100, 1000, etc, optional)</label>
                          <input
                            type="text"
                            value={block.constraints.base === undefined ? "" : String(block.constraints.base)}
                            placeholder="100"
                            maxLength={10}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Allow any numeric input (digits only) - validate and show errors for out-of-range values
                                if (val === "") {
                                  updateBlock(index, { constraints: { ...block.constraints, base: undefined } });
                              } else if (/^\d+$/.test(val)) {
                                // Allow any numeric value, even if outside range
                                  const numVal = parseInt(val);
                                    updateBlock(index, { constraints: { ...block.constraints, base: numVal } });
                                // Real-time validation - show error if invalid
                                if (numVal <= 0) {
                                  setFieldError(index, "base", "Base must be greater than 0");
                                  } else {
                                  setFieldError(index, "base", null);
                                  }
                                }
                              // If input contains non-numeric characters, don't update (prevent typing letters/symbols)
                              }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2  focus:ring-blue-900/30 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500"
                            />
                          </div>
                      )}

                      {(block.type === "vedic_divide_by_9s_repetition_equal" || block.type === "vedic_divide_by_9s_repetition_less_than" ||
                        block.type === "vedic_divide_by_11s_repetition_equal" || block.type === "vedic_divide_by_11s_repetition_less_than") && (
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">Digits (1-10, optional)</label>
                            <input
                              type="text"
                              value={block.constraints.digits === undefined || block.constraints.digits === -1 ? "" : String(block.constraints.digits)}
                            placeholder="2"
                            maxLength={10}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "digits", null);
                                    updateBlock(index, { constraints: { ...block.constraints, digits: undefined } });
                                  } else {
                                    const numVal = parseInt(val);
                                    // Allow any numeric value, even if outside range
                                    updateBlock(index, { constraints: { ...block.constraints, digits: numVal } });
                                    // Real-time validation - show error if outside range
                                    if (numVal < 1) {
                                      setFieldError(index, "digits", "Minimum value for Digits is 1");
                                    } else if (numVal > 10) {
                                      setFieldError(index, "digits", "Maximum value for Digits is 10");
                                    } else {
                                      setFieldError(index, "digits", null);
                                    }
                                  }
                                }
                              }}
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                              getFieldError(index, "digits")
                                ? "focus:ring-red-200"
                                : "focus:ring-blue-200"
                            }`}
                            />
                            {getFieldError(index, "digits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "digits")}</p>
                            )}
                          </div>
                      )}

                      {block.type === "vedic_dropping_10_method" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">Digits (1-5)</label>
                            <input
                              type="text"
                              value={block.constraints.digits === -1 || block.constraints.digits === undefined ? "" : String(block.constraints.digits)}
                              placeholder="3"
                              maxLength={10}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "digits", null);
                                    updateBlock(index, { constraints: { ...block.constraints, digits: -1 as any } });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, { constraints: { ...block.constraints, digits: numVal } });
                                    if (numVal < 1) {
                                      setFieldError(index, "digits", "Minimum value for Digits is 1");
                                    } else if (numVal > 5) {
                                      setFieldError(index, "digits", "Maximum value for Digits is 5");
                                    } else {
                                      setFieldError(index, "digits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "digits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "digits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "digits")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">Rows (3-30)</label>
                            <input
                              type="text"
                              value={block.constraints.rows === -1 || block.constraints.rows === undefined ? "" : String(block.constraints.rows)}
                              placeholder="3"
                              maxLength={10}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "rows", null);
                                    updateBlock(index, { constraints: { ...block.constraints, rows: -1 as any } });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, { constraints: { ...block.constraints, rows: numVal } });
                                    if (numVal < 3) {
                                      setFieldError(index, "rows", "Minimum value for Rows is 3");
                                    } else if (numVal > 30) {
                                      setFieldError(index, "rows", "Maximum value for Rows is 30");
                                    } else {
                                      setFieldError(index, "rows", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "rows")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "rows") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "rows")}</p>
                            )}
                          </div>
                        </>
                      )}

                      {/* Vedic Maths Level 3 Constraints */}
                      {(block.type === "vedic_multiply_by_111_999" || block.type === "vedic_multiply_by_102_109" || 
                        block.type === "vedic_multiply_by_112_119" || block.type === "vedic_multiply_by_10001" ||
                        block.type === "vedic_squares_level3" || block.type === "vedic_percentage_level3" ||
                        block.type === "vedic_squares_addition" || block.type === "vedic_squares_subtraction" ||
                        block.type === "vedic_squares_large" || block.type === "vedic_duplex_level3") && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Digits (1-10, optional)</label>
                          <input
                            type="text"
                            value={block.constraints.digits === undefined || block.constraints.digits === -1 ? "" : String(block.constraints.digits)}
                            placeholder="2"
                            maxLength={10}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                if (val === "") {
                                  setFieldError(index, "digits", null);
                                  updateBlock(index, { constraints: { ...block.constraints, digits: undefined } });
                                } else {
                                  const numVal = parseInt(val);
                                  // Allow any numeric value, even if outside range
                                  updateBlock(index, { constraints: { ...block.constraints, digits: numVal } });
                                  // Real-time validation - show error if outside range
                                  if (numVal < 1) {
                                    setFieldError(index, "digits", "Minimum value for Digits is 1");
                                  } else if (numVal > 10) {
                                    setFieldError(index, "digits", "Maximum value for Digits is 10");
                                  } else {
                                    setFieldError(index, "digits", null);
                                  }
                                }
                              }
                            }}
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                              getFieldError(index, "digits")
                                ? "focus:ring-red-200"
                                : "focus:ring-blue-200"
                            }`}
                          />
                          {getFieldError(index, "digits") && (
                            <p className="mt-1 text-sm text-red-600">{getFieldError(index, "digits")}</p>
                          )}
                        </div>
                      )}

                      {block.type === "vedic_multiplication" && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Case</label>
                          <select
                            value={block.constraints.multiplicationCase || "mix"}
                            onChange={(e) => {
                              updateBlock(index, { constraints: { ...block.constraints, multiplicationCase: e.target.value as any } });
                            }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2  focus:ring-blue-900/30 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500"
                          >
                            <option value="2x2">2×2</option>
                            <option value="3x2">3×2</option>
                            <option value="4x2">4×2</option>
                            <option value="3x3">3×3</option>
                            <option value="4x3">4×3</option>
                            <option value="4x4">4×4</option>
                            <option value="mix">Mix</option>
                          </select>
                        </div>
                      )}

                      {(block.type === "vedic_fraction_addition" || block.type === "vedic_fraction_subtraction") && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Case</label>
                          <select
                            value={block.constraints.fractionCase || "mix"}
                            onChange={(e) => {
                              updateBlock(index, { constraints: { ...block.constraints, fractionCase: e.target.value as any } });
                            }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2  focus:ring-blue-900/30 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500"
                          >
                            <option value="direct">Direct</option>
                            <option value="different_denominator">Different Denominator</option>
                            <option value="whole">Whole</option>
                            <option value="mix">Mix</option>
                          </select>
                        </div>
                      )}

                      {block.type === "vedic_check_divisibility" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">Digits (1-10, optional)</label>
                            <input
                              type="text"
                              value={block.constraints.digits === undefined || block.constraints.digits === -1 ? "" : String(block.constraints.digits)}
                              placeholder="3"
                              maxLength={10}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "digits", null);
                                    updateBlock(index, { constraints: { ...block.constraints, digits: undefined } });
                                  } else {
                                    const numVal = parseInt(val);
                                    // Allow any numeric value, even if outside range
                                    updateBlock(index, { constraints: { ...block.constraints, digits: numVal } });
                                    // Real-time validation - show error if outside range
                                    if (numVal < 1) {
                                      setFieldError(index, "digits", "Minimum value for Digits is 1");
                                    } else if (numVal > 10) {
                                      setFieldError(index, "digits", "Maximum value for Digits is 10");
                                    } else {
                                      setFieldError(index, "digits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "digits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "digits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "digits")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">Divisor (2,3,4,5,6,8,9,10, optional)</label>
                            <select
                              value={block.constraints.divisorCheck === undefined ? "" : String(block.constraints.divisorCheck)}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateBlock(index, { constraints: { ...block.constraints, divisorCheck: val === "" ? undefined : parseInt(val) } });
                              }}
                              className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2  focus:ring-blue-900/30 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500"
                            >
                              <option value="">Random</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                              <option value="4">4</option>
                              <option value="5">5</option>
                              <option value="6">6</option>
                              <option value="8">8</option>
                              <option value="9">9</option>
                              <option value="10">10</option>
                            </select>
                          </div>
                        </>
                      )}

                      {(block.type === "lcm" || block.type === "gcd") && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              First Number Digits (1-10)
                            </label>
                            <input
                              type="text"
                              value={
                                block.constraints.multiplicandDigits === -1 || block.constraints.multiplicandDigits === undefined ? "" : String(block.constraints.multiplicandDigits)
                              }
                              placeholder={block.type === "gcd" ? "3" : "2"}
                              maxLength={10}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "multiplicandDigits", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, multiplicandDigits: -1 as any },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, multiplicandDigits: numVal },
                                    });
                                    // Real-time validation
                                    if (numVal < 1) {
                                      setFieldError(index, "multiplicandDigits", "Minimum value for First Number Digits is 1");
                                    } else if (numVal > 10) {
                                      setFieldError(index, "multiplicandDigits", "Maximum value for First Number Digits is 10");
                                    } else {
                                      setFieldError(index, "multiplicandDigits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "multiplicandDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "multiplicandDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "multiplicandDigits")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              Second Number Digits (1-10)
                            </label>
                            <input
                              type="text"
                              maxLength={10}
                              value={
                                block.constraints.multiplierDigits === -1 || block.constraints.multiplierDigits === undefined ? "" : String(block.constraints.multiplierDigits)
                              }
                              placeholder="3"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "multiplierDigits", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, multiplierDigits: -1 as any },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, multiplierDigits: numVal },
                                    });
                                    // Real-time validation
                                    if (numVal < 1) {
                                      setFieldError(index, "multiplierDigits", "Minimum value for Second Number Digits is 1");
                                    } else if (numVal > 10) {
                                      setFieldError(index, "multiplierDigits", "Maximum value for Second Number Digits is 10");
                                    } else {
                                      setFieldError(index, "multiplierDigits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "multiplierDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "multiplierDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "multiplierDigits")}</p>
                            )}
                          </div>
                        </>
                      )}

                      {/* Vedic Maths Level 4 Constraints */}
                      {(block.type === "vedic_fun_with_5_level4" || block.type === "vedic_fun_with_10_level4") && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Case</label>
                          <select
                            value={block.constraints.funWith5Case || block.constraints.funWith10Case || "mix"}
                            onChange={(e) => {
                              if (block.type === "vedic_fun_with_5_level4") {
                                updateBlock(index, { constraints: { ...block.constraints, funWith5Case: e.target.value as any } });
                              } else {
                                updateBlock(index, { constraints: { ...block.constraints, funWith10Case: e.target.value as any } });
                              }
                            }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2  focus:ring-blue-900/30 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500"
                          >
                            <option value="decimal">Decimal</option>
                            <option value="triple">Triple</option>
                            <option value="mix">Mix</option>
                          </select>
                        </div>
                      )}

                      {(block.type === "vedic_hcf" || block.type === "vedic_lcm_level4") && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              First Number Digits (1-20)
                            </label>
                            <input
                              type="text"
                              maxLength={10}
                              value={
                                block.constraints.multiplicandDigits === -1 || block.constraints.multiplicandDigits === undefined ? "" : String(block.constraints.multiplicandDigits)
                              }
                              placeholder="3"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "multiplicandDigits", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, multiplicandDigits: -1 as any },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, multiplicandDigits: numVal },
                                    });
                                    if (numVal < 1) {
                                      setFieldError(index, "multiplicandDigits", "Minimum value for First Number Digits is 1");
                                    } else if (numVal > 20) {
                                      setFieldError(index, "multiplicandDigits", "Maximum value for First Number Digits is 20");
                                    } else {
                                      setFieldError(index, "multiplicandDigits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "multiplicandDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "multiplicandDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "multiplicandDigits")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              Second Number Digits (1-20)
                            </label>
                            <input
                              type="text"
                              maxLength={10}
                              value={
                                block.constraints.multiplierDigits === -1 || block.constraints.multiplierDigits === undefined ? "" : String(block.constraints.multiplierDigits)
                              }
                              placeholder="3"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "multiplierDigits", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, multiplierDigits: -1 as any },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, multiplierDigits: numVal },
                                    });
                                    if (numVal < 1) {
                                      setFieldError(index, "multiplierDigits", "Minimum value for Second Number Digits is 1");
                                    } else if (numVal > 20) {
                                      setFieldError(index, "multiplierDigits", "Maximum value for Second Number Digits is 20");
                                    } else {
                                      setFieldError(index, "multiplierDigits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "multiplierDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "multiplierDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "multiplierDigits")}</p>
                            )}
                          </div>
                        </>
                      )}

                      {block.type === "vedic_check_divisibility_level4" && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Case</label>
                          <select
                            value={block.constraints.divisibilityCase || "random"}
                            onChange={(e) => {
                              updateBlock(index, { constraints: { ...block.constraints, divisibilityCase: e.target.value as any } });
                            }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2  focus:ring-blue-900/30 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500"
                          >
                            <option value="by_7">By 7</option>
                            <option value="by_11">By 11</option>
                            <option value="random">Random</option>
                          </select>
                        </div>
                      )}

                      {(block.type === "vedic_division_without_remainder" || block.type === "vedic_division_with_remainder" || block.type === "vedic_divide_by_11_99") && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              {block.type === "vedic_divide_by_11_99" ? "Dividend Digits (1-20)" : "Dividend Digits (1-20)"}
                            </label>
                            <input
                              type="text"
                              maxLength={10}
                              value={
                                block.constraints.dividendDigits === -1 || block.constraints.dividendDigits === undefined ? "" : String(block.constraints.dividendDigits)
                              }
                              placeholder={block.type === "vedic_division_with_remainder" ? "3" : block.type === "vedic_divide_by_11_99" ? "4" : "2"}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "dividendDigits", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, dividendDigits: -1 as any },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, dividendDigits: numVal },
                                    });
                                    if (numVal < 2) {
                                      setFieldError(index, "dividendDigits", "Minimum value for Dividend Digits is 2");
                                    } else if (numVal > 20) {
                                      setFieldError(index, "dividendDigits", "Maximum value for Dividend Digits is 20");
                                    } else {
                                      setFieldError(index, "dividendDigits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "dividendDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "dividendDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "dividendDigits")}</p>
                            )}
                          </div>
                          {(block.type === "vedic_division_without_remainder" || block.type === "vedic_division_with_remainder") && (
                            <div>
                              <label className="block text-sm font-medium  text-white mb-1">Divisor Digits (1-20)</label>
                              <input
                                type="text"
                                maxLength={10}
                                value={
                                  block.constraints.divisorDigits === -1 || block.constraints.divisorDigits === undefined ? "" : String(block.constraints.divisorDigits)
                                }
                                placeholder="1"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "" || /^\d+$/.test(val)) {
                                    if (val === "") {
                                      setFieldError(index, "divisorDigits", null);
                                      updateBlock(index, {
                                        constraints: { ...block.constraints, divisorDigits: -1 as any },
                                      });
                                    } else {
                                      const numVal = parseInt(val);
                                      updateBlock(index, {
                                        constraints: { ...block.constraints, divisorDigits: numVal },
                                      });
                                      if (numVal < 1) {
                                        setFieldError(index, "divisorDigits", "Minimum value for Divisor Digits is 1");
                                      } else if (numVal > 20) {
                                        setFieldError(index, "divisorDigits", "Maximum value for Divisor Digits is 20");
                                      } else {
                                        setFieldError(index, "divisorDigits", null);
                                      }
                                    }
                                  }
                                }}
                                className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                  getFieldError(index, "divisorDigits")
                                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                }`}
                              />
                              {getFieldError(index, "divisorDigits") && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError(index, "divisorDigits")}</p>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {(block.type === "vedic_division_9_8_7_6" || block.type === "vedic_division_91_121") && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Case</label>
                          <select
                            value={block.constraints.division9_8_7_6Case || block.constraints.division91_121Case || "mix"}
                            onChange={(e) => {
                              if (block.type === "vedic_division_9_8_7_6") {
                                updateBlock(index, { constraints: { ...block.constraints, division9_8_7_6Case: e.target.value as any } });
                              } else {
                                updateBlock(index, { constraints: { ...block.constraints, division91_121Case: e.target.value as any } });
                              }
                            }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2  focus:ring-blue-900/30 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500"
                          >
                            {block.type === "vedic_division_9_8_7_6" ? (
                              <>
                                <option value="9">9</option>
                                <option value="8">8</option>
                                <option value="7">7</option>
                                <option value="6">6</option>
                                <option value="mix">Mix</option>
                              </>
                            ) : (
                              <>
                                <option value="91">91</option>
                                <option value="121">121</option>
                                <option value="mix">Mix</option>
                              </>
                            )}
                          </select>
                        </div>
                      )}

                      {block.type === "vedic_digital_sum" && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Digits (1-30)</label>
                          <input
                            type="text"
                            value={block.constraints.digits === -1 || block.constraints.digits === undefined ? "" : String(block.constraints.digits)}
                            maxLength={10}
                            placeholder="4"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                if (val === "") {
                                  setFieldError(index, "digits", null);
                                  updateBlock(index, { constraints: { ...block.constraints, digits: -1 as any } });
                                } else {
                                  const numVal = parseInt(val);
                                  updateBlock(index, { constraints: { ...block.constraints, digits: numVal } });
                                  if (numVal < 1) {
                                    setFieldError(index, "digits", "Minimum value for Digits is 1");
                                  } else if (numVal > 30) {
                                    setFieldError(index, "digits", "Maximum value for Digits is 30");
                                  } else {
                                    setFieldError(index, "digits", null);
                                  }
                                }
                              }
                            }}
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white ${
                              getFieldError(index, "digits")
                                ? "focus:ring-red-200"
                                : "focus:ring-blue-200"
                            }`}
                          />
                          {getFieldError(index, "digits") && (
                            <p className="mt-1 text-sm text-red-600">{getFieldError(index, "digits")}</p>
                          )}
                        </div>
                      )}

                      {block.type === "vedic_cube_root_level4" && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Cube Root Digits (4-10)</label>
                          <input
                            type="text"
                            maxLength={10}
                            value={block.constraints.cubeRootDigits === -1 || block.constraints.cubeRootDigits === undefined ? "" : String(block.constraints.cubeRootDigits)}
                            placeholder="5"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                if (val === "") {
                                  setFieldError(index, "cubeRootDigits", null);
                                  updateBlock(index, { constraints: { ...block.constraints, cubeRootDigits: -1 as any } });
                                } else {
                                  const numVal = parseInt(val);
                                  updateBlock(index, { constraints: { ...block.constraints, cubeRootDigits: numVal } });
                                  if (numVal < 4) {
                                    setFieldError(index, "cubeRootDigits", "Minimum value for Cube Root Digits is 4");
                                  } else if (numVal > 10) {
                                    setFieldError(index, "cubeRootDigits", "Maximum value for Cube Root Digits is 10");
                                  } else {
                                    setFieldError(index, "cubeRootDigits", null);
                                  }
                                }
                              }
                            }}
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white ${
                              getFieldError(index, "cubeRootDigits")
                                ? "focus:ring-red-200"
                                : "focus:ring-blue-200"
                            }`}
                          />
                          {getFieldError(index, "cubeRootDigits") && (
                            <p className="mt-1 text-sm text-red-600">{getFieldError(index, "cubeRootDigits")}</p>
                          )}
                        </div>
                      )}

                      {block.type === "vedic_bodmas" && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Difficulty</label>
                          <select
                            value={block.constraints.bodmasDifficulty || "medium"}
                            onChange={(e) => {
                              updateBlock(index, { constraints: { ...block.constraints, bodmasDifficulty: e.target.value as any } });
                            }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2  focus:ring-blue-900/30 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                      )}

                      {block.type === "vedic_square_root_level4" && (
                        <div>
                          <label className="block text-sm font-medium  text-white mb-1">Root Digits (1-30)</label>
                          <input
                            type="text"
                            maxLength={10}
                            value={block.constraints.rootDigits === -1 || block.constraints.rootDigits === undefined ? "" : String(block.constraints.rootDigits)}
                            placeholder="4"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                if (val === "") {
                                  setFieldError(index, "rootDigits", null);
                                  updateBlock(index, { constraints: { ...block.constraints, rootDigits: -1 as any } });
                                } else {
                                  const numVal = parseInt(val);
                                  updateBlock(index, { constraints: { ...block.constraints, rootDigits: numVal } });
                                  if (numVal < 1) {
                                    setFieldError(index, "rootDigits", "Minimum value for Root Digits is 1");
                                  } else if (numVal > 30) {
                                    setFieldError(index, "rootDigits", "Maximum value for Root Digits is 30");
                                  } else {
                                    setFieldError(index, "rootDigits", null);
                                  }
                                }
                              }
                            }}
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white ${
                              getFieldError(index, "rootDigits")
                                ? "focus:ring-red-200"
                                : "focus:ring-blue-200"
                            }`}
                          />
                          {getFieldError(index, "rootDigits") && (
                            <p className="mt-1 text-sm text-red-600">{getFieldError(index, "rootDigits")}</p>
                          )}
                        </div>
                      )}

                      {block.type === "vedic_percentage_level3" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              Percentage Min (1-100)
                            </label>
                            <input
                              type="text"
                              value={
                                block.constraints.percentageMin === undefined ? "" : String(block.constraints.percentageMin)
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "percentageMin", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, percentageMin: undefined },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, percentageMin: numVal },
                                    });
                                    if (numVal < 1) {
                                      setFieldError(index, "percentageMin", "Minimum value for Percentage Min is 1");
                                    } else if (numVal > 100) {
                                      setFieldError(index, "percentageMin", "Maximum value for Percentage Min is 100");
                                    } else if (block.constraints.percentageMax !== undefined && numVal > block.constraints.percentageMax) {
                                      setFieldError(index, "percentageMin", "Percentage Min cannot be greater than Percentage Max");
                                    } else {
                                      setFieldError(index, "percentageMin", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "percentageMin") || (block.constraints.percentageMin !== undefined && block.constraints.percentageMax !== undefined && block.constraints.percentageMin > block.constraints.percentageMax)
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "percentageMin") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "percentageMin")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              Percentage Max (1-100)
                            </label>
                            <input
                              type="text"
                              value={
                                block.constraints.percentageMax === undefined ? "" : String(block.constraints.percentageMax)
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "percentageMax", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, percentageMax: undefined },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, percentageMax: numVal },
                                    });
                                    if (numVal < 1) {
                                      setFieldError(index, "percentageMax", "Minimum value for Percentage Max is 1");
                                    } else if (numVal > 100) {
                                      setFieldError(index, "percentageMax", "Maximum value for Percentage Max is 100");
                                    } else if (block.constraints.percentageMin !== undefined && numVal < block.constraints.percentageMin) {
                                      setFieldError(index, "percentageMax", "Percentage Max cannot be less than Percentage Min");
                                    } else {
                                      setFieldError(index, "percentageMax", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "percentageMax") || (block.constraints.percentageMin !== undefined && block.constraints.percentageMax !== undefined && block.constraints.percentageMin > block.constraints.percentageMax)
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "percentageMax") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "percentageMax")}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium  text-white mb-1">
                              Number Digits (1-10)
                            </label>
                            <input
                              type="text"
                              value={
                                block.constraints.numberDigits === undefined ? "" : String(block.constraints.numberDigits)
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  if (val === "") {
                                    setFieldError(index, "numberDigits", null);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, numberDigits: undefined },
                                    });
                                  } else {
                                    const numVal = parseInt(val);
                                    updateBlock(index, {
                                      constraints: { ...block.constraints, numberDigits: numVal },
                                    });
                                    if (numVal < 1) {
                                      setFieldError(index, "numberDigits", "Minimum value for Number Digits is 1");
                                    } else if (numVal > 10) {
                                      setFieldError(index, "numberDigits", "Maximum value for Number Digits is 10");
                                    } else {
                                      setFieldError(index, "numberDigits", null);
                                    }
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none  bg-slate-700  text-white placeholder:text-slate-400 placeholder:text-slate-500 ${
                                getFieldError(index, "numberDigits")
                                  ? "focus:ring-red-200"
                                  : "focus:ring-blue-200"
                              }`}
                            />
                            {getFieldError(index, "numberDigits") && (
                              <p className="mt-1 text-sm text-red-600">{getFieldError(index, "numberDigits")}</p>
                            )}
                          </div>
                        </>
                      )}
                      </div>{/* end inputs grid */}

                      {/* Drag Handle */}
                      <div className="pc-drag-handle">
                        <GripVertical style={{width:16,height:16}} />
                        <span>drag to reorder</span>
                        <GripVertical style={{width:16,height:16}} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {blocks.length === 0 && (
                <div style={{textAlign:'center',padding:'48px 24px',background:'rgba(123,92,229,0.04)',border:'1.5px dashed rgba(123,92,229,0.25)',borderRadius:16}}>
                  {loadingPresets ? (
                    <>
                      <div style={{width:36,height:36,border:'3px solid #7B5CE5',borderTopColor:'transparent',borderRadius:'50%',animation:'pc-spin 0.9s linear infinite',margin:'0 auto 16px'}}></div>
                      <p style={{color:'#B8BDD8',fontFamily:'DM Sans, sans-serif',fontSize:14,marginBottom:4}}>Loading preset blocks for {level}...</p>
                      <p style={{fontSize:12,color:'#525870',fontFamily:'DM Sans, sans-serif'}}>Please wait</p>
                    </>
                  ) : (
                    <>
                      <div style={{width:48,height:48,background:'rgba(123,92,229,0.1)',border:'1px solid rgba(123,92,229,0.25)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                        <FileDown style={{width:22,height:22,color:'#7B5CE5'}} />
                      </div>
                      <p style={{color:'#525870',fontFamily:'DM Sans, sans-serif',fontSize:14,marginBottom:16}}>No question blocks yet. Add your first block to get started.</p>
                      <button
                        onClick={addBlock}
                        style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 24px',background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',color:'white',borderRadius:10,fontWeight:700,fontFamily:'DM Sans, sans-serif',fontSize:14,border:'none',cursor:'pointer',boxShadow:'0 4px 16px rgba(123,92,229,0.3)'}}
                      >
                        <Plus style={{width:16,height:16}} />
                        Add Your First Block
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Generate Button + Save Template */}
            <div style={{paddingTop:24,borderTop:'1px solid rgba(255,255,255,0.06)',marginTop:8}}>
              {/* Save-as-template row */}
              <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap'}}>
                {/* Save as exam-source paper */}
                <button
                  onClick={handleSavePaper}
                  disabled={blocks.length === 0 || savePaperMutation.isPending}
                  title={
                    blocks.length === 0
                      ? "Add at least one block to save a paper"
                      : "Save this paper so it appears in Admin Exams"
                  }
                  style={{display:'flex',alignItems:'center',gap:7,padding:'10px 18px',background:blocks.length===0||savePaperMutation.isPending?'rgba(255,255,255,0.04)':'rgba(16,185,129,0.10)',border:`1px solid ${blocks.length===0||savePaperMutation.isPending?'rgba(255,255,255,0.07)':'rgba(16,185,129,0.30)'}`,borderRadius:10,color:blocks.length===0||savePaperMutation.isPending?'#525870':'#6EE7B7',fontFamily:'DM Sans, sans-serif',fontWeight:600,fontSize:13,cursor:blocks.length===0||savePaperMutation.isPending?'not-allowed':'pointer',transition:'all 0.2s',flex:'0 0 auto'}}
                >
                  <BookmarkPlus style={{width:15,height:15}} />
                  {savePaperMutation.isPending ? 'Saving Paper…' : 'Save Paper'}
                </button>
                {/* Save as NEW template */}
                <button
                  onClick={handleOpenSaveModal}
                  disabled={blocks.length === 0 || atTemplateLimit}
                  title={
                    blocks.length === 0
                      ? "Add at least one block to save a template"
                      : atTemplateLimit
                      ? `Max ${MAX_TEMPLATES} templates reached — delete one first`
                      : "Save current blocks as a new template"
                  }
                  style={{display:'flex',alignItems:'center',gap:7,padding:'10px 18px',background:blocks.length===0||atTemplateLimit?'rgba(255,255,255,0.04)':'rgba(123,92,229,0.1)',border:`1px solid ${blocks.length===0||atTemplateLimit?'rgba(255,255,255,0.07)':'rgba(123,92,229,0.3)'}`,borderRadius:10,color:blocks.length===0||atTemplateLimit?'#525870':'#C4A8FF',fontFamily:'DM Sans, sans-serif',fontWeight:600,fontSize:13,cursor:blocks.length===0||atTemplateLimit?'not-allowed':'pointer',transition:'all 0.2s',flex:'0 0 auto'}}
                >
                  <BookmarkPlus style={{width:15,height:15}} />
                  Save as Template
                </button>
                {/* Update active template button */}
                {activeTemplateId !== null && (
                  <button
                    onClick={handleOpenUpdateModal}
                    disabled={blocks.length === 0}
                    title="Update loaded template with current blocks"
                    style={{display:'flex',alignItems:'center',gap:7,padding:'10px 18px',background:blocks.length===0?'rgba(255,255,255,0.04)':'rgba(16,185,129,0.1)',border:`1px solid ${blocks.length===0?'rgba(255,255,255,0.07)':'rgba(16,185,129,0.3)'}`,borderRadius:10,color:blocks.length===0?'#525870':'#10B981',fontFamily:'DM Sans, sans-serif',fontWeight:600,fontSize:13,cursor:blocks.length===0?'not-allowed':'pointer',transition:'all 0.2s',flex:'0 0 auto'}}
                  >
                    <Save style={{width:15,height:15}} />
                    Update Template
                  </button>
                )}
              </div>

              <button
                onClick={handlePreview}
                disabled={previewMutation.isPending || loadingPresets}
                style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'16px 32px',background:'linear-gradient(135deg,#10B981,#059669)',color:'white',borderRadius:14,fontWeight:700,fontFamily:'DM Sans, sans-serif',fontSize:16,border:'none',cursor:previewMutation.isPending||loadingPresets?'not-allowed':'pointer',opacity:previewMutation.isPending||loadingPresets?0.6:1,boxShadow:'0 6px 24px rgba(16,185,129,0.3)',transition:'all 0.2s'}}
              >
                {previewMutation.isPending ? (
                  <>
                    <div style={{width:20,height:20,border:'2px solid white',borderTopColor:'transparent',borderRadius:'50%',animation:'pc-spin 0.8s linear infinite'}}></div>
                    Generating Preview...
                  </>
                ) : (
                  <>
                    <Eye style={{width:20,height:20}} />
                    Generate Preview
                  </>
                )}
              </button>

              {previewMutation.isError && (
                <div style={{marginTop:16,padding:'12px 16px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:10,display:'flex',alignItems:'flex-start',gap:10}}>
                  <XCircle style={{width:16,height:16,color:'#EF4444',flexShrink:0,marginTop:2}} />
                  <div>
                    <strong style={{color:'#EF4444',fontFamily:'DM Sans, sans-serif',fontSize:13,display:'block'}}>Error:</strong>
                    <span style={{color:'rgba(239,68,68,0.8)',fontFamily:'DM Sans, sans-serif',fontSize:13}}>
                      {previewMutation.error instanceof Error ? previewMutation.error.message : "Unknown error"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && previewData && (
          <div style={{background:'#0F1120',border:'1px solid rgba(255,255,255,0.07)',borderRadius:20,padding:'clamp(20px,4vw,32px) clamp(16px,3vw,36px)',animation:'pc-scale-in 0.4s ease',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#7B5CE5,#9D7FF0)'}} />
            <div style={{position:'relative',zIndex:1}}>
              {/* Preview header */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28,flexWrap:'wrap',gap:16}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(123,92,229,0.4)'}}>
                    <Eye style={{width:22,height:22,color:'white'}} />
                  </div>
                  <div>
                    <h2 style={{fontSize:20,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",margin:'0 0 3px'}}>Paper Preview</h2>
                    <p style={{fontSize:12,color:'#525870',fontFamily:'DM Sans, sans-serif',margin:0}}>Review your generated questions</p>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <button
                    onClick={() => setShowAnswers(!showAnswers)}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'9px 16px',background:showAnswers?'rgba(123,92,229,0.15)':'rgba(255,255,255,0.05)',border:`1px solid ${showAnswers?'rgba(123,92,229,0.4)':'rgba(255,255,255,0.1)'}`,borderRadius:10,color:showAnswers?'#9D7FF0':'#B8BDD8',fontWeight:600,fontFamily:'DM Sans, sans-serif',fontSize:13,cursor:'pointer',transition:'all 0.2s'}}
                  >
                    {showAnswers ? <EyeOff style={{width:15,height:15}} /> : <Eye style={{width:15,height:15}} />}
                    {showAnswers ? 'Hide Answers' : 'Show Answers'}
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'9px 16px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'#B8BDD8',fontWeight:600,fontFamily:'DM Sans, sans-serif',fontSize:13,cursor:'pointer',transition:'all 0.2s'}}
                  >
                    <ArrowLeft style={{width:15,height:15}} />
                    Back to Edit
                  </button>
                </div>
              </div>

            {(() => {
              // Helper function to check if a block type uses horizontal/vertical space layout
              const isHorizontalBlockType = (type: string): boolean => {
                return type === "multiplication" || 
                       type === "decimal_multiplication" ||
                       type === "division" ||
                       type === "decimal_division" ||
                       type === "lcm" ||
                       type === "gcd" ||
                       type === "square_root" ||
                       type === "cube_root" ||
                       type === "percentage";
              };
              
              // Group consecutive horizontal blocks together (multiplication, division, lcm, gcd, square root, cube root, percentage)
              const groupedBlocks: Array<{ blocks: GeneratedBlock[], indices: number[] }> = [];
              let currentGroup: GeneratedBlock[] = [];
              let currentIndices: number[] = [];
              
              previewData.blocks.forEach((block, blockIndex) => {
                const isHorizontalBlock = isHorizontalBlockType(block.config.type);
                
                const nextBlock = previewData.blocks[blockIndex + 1];
                const nextIsHorizontal = nextBlock && isHorizontalBlockType(nextBlock.config.type);
                
                if (isHorizontalBlock) {
                  currentGroup.push(block);
                  currentIndices.push(blockIndex);
                  
                  // If next block is not horizontal, finalize this group
                  if (!nextIsHorizontal) {
                    groupedBlocks.push({ blocks: currentGroup, indices: currentIndices });
                    currentGroup = [];
                    currentIndices = [];
                  }
                } else {
                  // If we have a pending group, finalize it
                  if (currentGroup.length > 0) {
                    groupedBlocks.push({ blocks: currentGroup, indices: currentIndices });
                    currentGroup = [];
                    currentIndices = [];
                  }
                  // Add non-horizontal block as a single group
                  groupedBlocks.push({ blocks: [block], indices: [blockIndex] });
                }
              });
              
              // Handle any remaining group
              if (currentGroup.length > 0) {
                groupedBlocks.push({ blocks: currentGroup, indices: currentIndices });
              }
              
              return groupedBlocks.map((group, groupIndex) => {
                // Check if this is a horizontal block group (2+ blocks that can coexist)
                const isHorizontalGroup = group.blocks.length >= 2 && 
                  group.blocks.every(block => isHorizontalBlockType(block.config.type));
                
                if (isHorizontalGroup) {
                  // Display horizontal blocks side by side (3 at a time)
                  // Group them in sets of 3
                  const groups: Array<{ blocks: GeneratedBlock[], indices: number[] }> = [];
                  for (let i = 0; i < group.blocks.length; i += 3) {
                    groups.push({
                      blocks: group.blocks.slice(i, i + 3),
                      indices: group.indices.slice(i, i + 3)
                    });
                  }
                  
                  return (
                    <div key={groupIndex} className="space-y-4">
                      {groups.map((groupSet, groupSetIndex) => (
                        <div key={groupSetIndex} className="flex flex-row gap-3 w-full">
                          {groupSet.blocks.map((block, blockInGroupIndex) => {
                            const originalIndex = groupSet.indices[blockInGroupIndex];
                            return (
                              <div key={originalIndex} style={{flex:1,background:'#141729',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:'16px 18px',minWidth:0,transition:'all 0.2s'}}>
                                <h3 style={{fontWeight:800,fontSize:15,marginBottom:12,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif"}}>
                                  {block.config.title || `Section ${originalIndex + 1}`}
                </h3>
                                <div className="grid grid-cols-1 gap-2">
                  {block.questions.map((q) => (
                    <MathQuestion key={q.id} question={q} showAnswer={showAnswers} smallHorizontalFont={!q.isVertical} />
                  ))}
                </div>
              </div>
                            );
                          })}
                          {/* Fill remaining slots if less than 3 blocks */}
                          {Array.from({ length: 3 - groupSet.blocks.length }).map((_, idx) => (
                            <div key={`empty-${idx}`} style={{flex:1,background:'rgba(15,17,32,0.5)',borderRadius:16,border:'1px solid rgba(255,255,255,0.05)'}}></div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                } else {
                  // Single block (multiplication or other type)
                  return group.blocks.map((block, blockInGroupIndex) => {
                    const originalIndex = group.indices[blockInGroupIndex];
                    const hasVerticalQuestions = block.questions.some(q => q.isVertical);
                    const isVerticalBlock = hasVerticalQuestions && 
                      (block.config.type === "addition" || 
                       block.config.type === "subtraction" || 
                       block.config.type === "add_sub" ||
                       block.config.type === "integer_add_sub" ||
                      //  block.config.type === "decimal_add_sub" ||
                       block.config.type === "direct_add_sub" ||
                       block.config.type === "small_friends_add_sub" ||
                       block.config.type === "big_friends_add_sub" ||
                       block.config.type === "mix_friends_add_sub");
                    
                    return (
                      <div key={originalIndex} style={{background:'#141729',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:'16px 18px',transition:'all 0.2s',marginBottom:12}}>
                        <h3 style={{fontWeight:800,fontSize:15,marginBottom:12,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif"}}>
                          {block.config.title || `Section ${originalIndex + 1}`}
                        </h3>
                        {isVerticalBlock ? (
                          // 10 columns for vertical questions (add/sub) - split into multiple rows if needed
                          <div className="overflow-x-auto scrollbar-premium">
                            {(() => {
                              // Split questions into rows of max 10
                              const questionsPerRow = 10;
                              const questionRows: typeof block.questions[] = [];
                              for (let i = 0; i < block.questions.length; i += questionsPerRow) {
                                questionRows.push(block.questions.slice(i, i + questionsPerRow));
                              }
                              
                              return questionRows.map((questionRow, rowIndex) => {
                                const maxOperands = Math.max(...questionRow.map(q => q.operands.length));
                                const rows = [];
                                
                                // Serial number row
                                rows.push(
                                  <tr key={`sno-row-${rowIndex}`}>
                                    {questionRow.map((q) => (
                                      <td key={`sno-${q.id}`} style={{padding:'4px 6px',textAlign:'center',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(123,92,229,0.12)',width:'10%'}}>
                                        <span style={{fontWeight:700,fontSize:13,color:'#C4ADFF',fontFamily:'JetBrains Mono, monospace'}}>{q.id}.</span>
                                      </td>
                                    ))}
                                    {Array.from({ length: Math.max(0, questionsPerRow - questionRow.length) }).map((_, idx) => (
                                        <td key={`empty-sno-${idx}`} style={{padding:'4px 6px',border:'1px solid rgba(255,255,255,0.05)',background:'rgba(20,23,41,0.4)',width:'10%'}}></td>
                                    ))}
                                  </tr>
                                );
                                
                                // Question content rows
                                for (let rowIdx = 0; rowIdx < maxOperands; rowIdx++) {
                                  rows.push(
                                    <tr key={`operand-row-${rowIndex}-${rowIdx}`}>
                                      {questionRow.map((q) => {
                                        const op = q.operands[rowIdx];
                                        if (op === undefined) {
                                          return <td key={`empty-${q.id}-${rowIdx}`} style={{padding:'4px 6px',border:'1px solid rgba(255,255,255,0.08)',background:'#141729',width:'10%'}}></td>;
                                        }
                                        
                                        // Determine operator
                                        let operator = null;
                                        if (q.operators && q.operators.length > 0 && rowIdx > 0) {
                                          operator = q.operators[rowIdx - 1];
                                        } else if (!q.operators) {
                                          if (q.operator === "-" && rowIdx > 0) {
                                            operator = q.operator;
                                          } else if (q.operator !== "-" && rowIdx === q.operands.length - 1) {
                                            operator = q.operator;
                                          }
                                        }
                                        
                                        return (
                                          <td key={`${q.id}-${rowIdx}`} className="p-1 border  border-slate-600  bg-slate-700/50 text-center" style={{ width: '10%' }}>
                                            <div className="font-mono text-sm font-semibold  text-white leading-tight text-center">
                                              {operator && <span className="mr-1  text-blue-400">{operator}</span>}
                                              {op}
                                            </div>
                                          </td>
                                        );
                                      })}
                                      {Array.from({ length: Math.max(0, questionsPerRow - questionRow.length) }).map((_, idx) => (
                                        <td key={`empty-op-${idx}-${rowIdx}`} style={{padding:'4px 6px',border:'1px solid rgba(255,255,255,0.05)',background:'rgba(20,23,41,0.4)',width:'10%'}}></td>
                                      ))}
                                    </tr>
                                  );
                                }
                                
                                // Line row
                                rows.push(
                                  <tr key={`line-row-${rowIndex}`}>
                                    {questionRow.map((q) => (
                                      <td key={`line-${q.id}`} style={{padding:'2px 6px',border:'1px solid rgba(255,255,255,0.08)',background:'#141729',width:'10%'}}>
                                        <div style={{borderTop:'1px solid rgba(123,92,229,0.5)',width:'100%'}}></div>
                                      </td>
                                    ))}
                                    {Array.from({ length: Math.max(0, questionsPerRow - questionRow.length) }).map((_, idx) => (
                                      <td key={`empty-line-${idx}`} style={{padding:'4px 6px',border:'1px solid rgba(255,255,255,0.05)',background:'rgba(20,23,41,0.4)',width:'10%'}}></td>
                                    ))}
                                  </tr>
                                );
                                
                                // Answer row
                                rows.push(
                                  <tr key={`answer-row-${rowIndex}`}>
                                    {questionRow.map((q) => (
                                      <td key={`answer-${q.id}`} style={{padding:'4px 6px',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(16,185,129,0.06)',textAlign:'center',width:'10%',minHeight:'1.2rem'}}>
                                        <div style={{ minHeight: '1.2rem',textAlign:'center'}}>
                                          {showAnswers && (
                                            <div style={{color:'#10B981',fontFamily:'JetBrains Mono, monospace',fontSize:12,fontWeight:700,textAlign:'center'}}>{q.answer}</div>
                                          )}
                                        </div>
                                      </td>
                                    ))}
                                    {Array.from({ length: Math.max(0, questionsPerRow - questionRow.length) }).map((_, idx) => (
                                      <td key={`empty-answer-${idx}`} style={{padding:'4px 6px',border:'1px solid rgba(255,255,255,0.05)',background:'rgba(20,23,41,0.4)',width:'10%'}}></td>
                                    ))}
                                  </tr>
                                );
                                
                                return (
                                  <table key={`table-row-${rowIndex}`} style={{width:'100%',borderCollapse:'collapse',marginBottom:16,tableLayout:'fixed'}}>
                                    <tbody>{rows}</tbody>
                                  </table>
                                );
                              });
                            })()}
                          </div>
                        ) : (
                          // 1 column with multiple rows for horizontal questions (multiplication, etc.)
                          <div className="grid grid-cols-1 gap-2 max-w-md">
                            {block.questions.map((q) => (
                              <MathQuestion key={q.id} question={q} showAnswer={showAnswers} smallHorizontalFont={!q.isVertical} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                }
              });
            })()}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,paddingTop:24,borderTop:'1px solid rgba(255,255,255,0.08)',marginTop:24}}>
              {(() => {
                const totalQ = blocks.reduce((s, b) => s + b.count, 0);
                const tooFew = totalQ < 15;
                return (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    <button
                      onClick={handleAttemptPaper}
                      disabled={tooFew}
                      style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px 16px',background: tooFew ? 'rgba(239,68,68,.25)' : 'linear-gradient(135deg,#EF4444,#DC2626)',border:'none',borderRadius:12,color:'white',fontWeight:700,fontFamily:'DM Sans, sans-serif',fontSize:13,cursor: tooFew ? 'not-allowed' : 'pointer',boxShadow: tooFew ? 'none' : '0 4px 20px rgba(239,68,68,0.35)',transition:'all 0.2s',opacity: tooFew ? 0.55 : 1}}
                    >
                      <Play style={{width:16,height:16}} />
                      Attempt
                    </button>
                    {tooFew && (
                      <p style={{margin:0,fontSize:10,fontFamily:'DM Sans, sans-serif',color:'#F87171',textAlign:'center'}}>
                        Min 15 questions ({totalQ})
                      </p>
                    )}
                  </div>
                );
              })()}

              <button
                onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
                disabled={downloadMutation.isPending}
                style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px 16px',background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',border:'none',borderRadius:12,color:'white',fontWeight:700,fontFamily:'DM Sans, sans-serif',fontSize:13,cursor:'pointer',boxShadow:'0 4px 20px rgba(123,92,229,0.35)',transition:'all 0.2s',opacity:downloadMutation.isPending?0.6:1}}
              >
                <FileDown style={{width:16,height:16}} />
                {downloadMutation.isPending ? 'Generating...' : 'Download'}
              </button>

              <button
                onClick={handleSharePaper}
                disabled={shareMutation.isPending}
                style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px 16px',background:'linear-gradient(135deg,#3B82F6,#2563EB)',border:'none',borderRadius:12,color:'white',fontWeight:700,fontFamily:'DM Sans, sans-serif',fontSize:13,cursor:'pointer',boxShadow:'0 4px 20px rgba(59,130,246,0.35)',transition:'all 0.2s',opacity:shareMutation.isPending?0.6:1}}
              >
                <Share2 style={{width:16,height:16}} />
                {shareMutation.isPending ? 'Sharing...' : 'Share'}
              </button>
            </div>

            {/* Download Modal */}
            {downloadDropdownOpen && (
              <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
                {/* Backdrop */}
                <div
                  style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(12px)'}}
                  onClick={() => setDownloadDropdownOpen(false)}
                />
                {/* Modal */}
                <div style={{position:'relative',background:'#0F1120',borderRadius:20,boxShadow:'0 24px 80px rgba(0,0,0,0.7)',border:'1px solid rgba(255,255,255,0.1)',width:'100%',maxWidth:440,overflow:'hidden',animation:'pc-scale-in 0.25s ease'}}>
                  {/* Header accent */}
                  <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#7B5CE5,#9D7FF0)'}} />
                  {/* Header */}
                  <div style={{padding:'24px 28px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <FileDown style={{width:18,height:18,color:'white'}} />
                      </div>
                      <div>
                        <h3 style={{fontSize:18,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",margin:'0 0 2px'}}>Download Options</h3>
                        <p style={{fontSize:12,color:'#525870',fontFamily:'DM Sans, sans-serif',margin:0}}>Choose your preferred format</p>
                      </div>
                    </div>
                  </div>
                  {/* Options */}
                  <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:10}}>
                    <button
                      onClick={() => {
                        downloadMutation.mutate({ withAnswers: false, answersOnly: false });
                        setDownloadDropdownOpen(false);
                      }}
                      disabled={downloadMutation.isPending}
                      style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,cursor:'pointer',transition:'all 0.15s',opacity:downloadMutation.isPending?0.5:1,width:'100%'}}
                    >
                      <div style={{flexShrink:0,width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#3B82F6,#2563EB)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <FileDown style={{width:18,height:18,color:'white'}} />
                      </div>
                      <div style={{flex:1,textAlign:'left'}}>
                        <div style={{fontWeight:700,color:'#F0F2FF',fontFamily:'DM Sans, sans-serif',fontSize:14}}>Question Paper</div>
                        <div style={{fontSize:12,color:'#525870',fontFamily:'DM Sans, sans-serif',marginTop:2}}>Questions only, no answers</div>
                      </div>
                      <span style={{color:'#525870',fontSize:16}}>→</span>
                    </button>

                    <button
                      onClick={() => {
                        downloadMutation.mutate({ withAnswers: true, answersOnly: false });
                        setDownloadDropdownOpen(false);
                      }}
                      disabled={downloadMutation.isPending}
                      style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,cursor:'pointer',transition:'all 0.15s',opacity:downloadMutation.isPending?0.5:1,width:'100%'}}
                    >
                      <div style={{flexShrink:0,width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <FileDown style={{width:18,height:18,color:'white'}} />
                      </div>
                      <div style={{flex:1,textAlign:'left'}}>
                        <div style={{fontWeight:700,color:'#F0F2FF',fontFamily:'DM Sans, sans-serif',fontSize:14}}>Answer Key</div>
                        <div style={{fontSize:12,color:'#525870',fontFamily:'DM Sans, sans-serif',marginTop:2}}>Questions with answers included</div>
                      </div>
                      <span style={{color:'#525870',fontSize:16}}>→</span>
                    </button>

                    <button
                      onClick={() => {
                        downloadMutation.mutate({ withAnswers: false, answersOnly: false, includeSeparateAnswerKey: true });
                        setDownloadDropdownOpen(false);
                      }}
                      disabled={downloadMutation.isPending}
                      style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,cursor:'pointer',transition:'all 0.15s',opacity:downloadMutation.isPending?0.5:1,width:'100%'}}
                    >
                      <div style={{flexShrink:0,width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#10B981,#059669)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <FileDown style={{width:18,height:18,color:'white'}} />
                      </div>
                      <div style={{flex:1,textAlign:'left'}}>
                        <div style={{fontWeight:700,color:'#F0F2FF',fontFamily:'DM Sans, sans-serif',fontSize:14}}>Question Paper + Answer Key</div>
                        <div style={{fontSize:12,color:'#525870',fontFamily:'DM Sans, sans-serif',marginTop:2}}>Separate pages for questions and answers</div>
                      </div>
                      <span style={{color:'#525870',fontSize:16}}>→</span>
                    </button>
                  </div>
                  {/* Close */}
                  <div style={{padding:'8px 20px 20px'}}>
                    <button
                      onClick={() => setDownloadDropdownOpen(false)}
                      style={{width:'100%',padding:'10px',fontSize:13,fontWeight:600,color:'#525870',background:'transparent',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,cursor:'pointer',fontFamily:'DM Sans, sans-serif',transition:'all 0.15s'}}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Share Paper Modal ─────────────────────────────────────── */}
            {showShareModal && (
              <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
                <div
                  style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(12px)'}}
                  onClick={() => setShowShareModal(false)}
                />
                <div style={{position:'relative',background:'#0F1120',borderRadius:20,boxShadow:'0 24px 80px rgba(0,0,0,0.7)',border:'1px solid rgba(59,130,246,0.25)',width:'100%',maxWidth:460,overflow:'hidden',animation:'pc-scale-in 0.25s ease'}}>
                  {/* Header */}
                  <div style={{padding:'24px 24px 0',display:'flex',alignItems:'center',gap:14}}>
                    <div style={{width:46,height:46,borderRadius:14,background:'linear-gradient(135deg,#3B82F6,#2563EB)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(59,130,246,0.4)',flexShrink:0}}>
                      <Share2 style={{width:22,height:22,color:'white'}} />
                    </div>
                    <div>
                      <h3 style={{fontSize:18,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display',Georgia,serif",margin:0}}>Share Paper</h3>
                      <p style={{fontSize:12,color:'#525870',fontFamily:'DM Sans,sans-serif',margin:0,marginTop:2}}>
                        {shareMutation.isPending ? 'Creating share link...' : shareResult ? 'Send this to anyone to attempt the same paper!' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{padding:'20px 24px 24px'}}>
                    {shareMutation.isPending && (
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 0',gap:16}}>
                        <div style={{width:36,height:36,border:'3px solid #3B82F6',borderTopColor:'transparent',borderRadius:'50%',animation:'pc-spin 0.9s linear infinite'}} />
                        <p style={{color:'#525870',fontFamily:'DM Sans,sans-serif',fontSize:13,margin:0}}>Generating share code...</p>
                      </div>
                    )}

                    {shareResult && (
                      <>
                        {/* Big code display */}
                        <div style={{textAlign:'center',marginBottom:20}}>
                          <p style={{margin:'0 0 8px',fontSize:11,color:'#525870',fontFamily:'DM Sans,sans-serif',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em'}}>Paper Code</p>
                          <div style={{display:'inline-block',padding:'14px 32px',background:'rgba(59,130,246,0.1)',border:'2px solid rgba(59,130,246,0.35)',borderRadius:14}}>
                            <span style={{fontSize:32,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:'#60A5FA',letterSpacing:'0.25em'}}>{shareResult.code}</span>
                          </div>
                        </div>

                        {/* Info chips */}
                        <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:20,flexWrap:'wrap'}}>
                          <div style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8}}>
                            <Clock style={{width:12,height:12,color:'#10B981'}} />
                            <span style={{fontSize:11,color:'#10B981',fontFamily:'DM Sans,sans-serif',fontWeight:600}}>Expires in 24 hours</span>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'rgba(123,92,229,0.08)',border:'1px solid rgba(123,92,229,0.2)',borderRadius:8}}>
                            <span style={{fontSize:11,color:'#9D7FF0',fontFamily:'DM Sans,sans-serif',fontWeight:600}}>{shareResult.total_questions} questions</span>
                          </div>
                        </div>

                        {/* Link field */}
                        <div style={{display:'flex',gap:8,marginBottom:16}}>
                          <div style={{flex:1,padding:'11px 14px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,overflow:'hidden',display:'flex',alignItems:'center'}}>
                            <span style={{fontSize:12,color:'#B8BDD8',fontFamily:'JetBrains Mono,monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block',width:'100%'}}>{getShareLink()}</span>
                          </div>
                          <button
                            onClick={handleCopyShareLink}
                            style={{display:'flex',alignItems:'center',gap:6,padding:'11px 16px',background:shareCopied?'rgba(16,185,129,0.15)':'rgba(59,130,246,0.12)',border:`1px solid ${shareCopied?'rgba(16,185,129,0.35)':'rgba(59,130,246,0.3)'}`,borderRadius:10,color:shareCopied?'#10B981':'#60A5FA',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:12,cursor:'pointer',flexShrink:0,transition:'all 0.2s'}}
                          >
                            {shareCopied ? <Check style={{width:14,height:14}} /> : <Copy style={{width:14,height:14}} />}
                            {shareCopied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>

                        {/* Share buttons */}
                        <div style={{display:'flex',gap:10}}>
                          <button
                            onClick={handleWhatsAppShare}
                            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'13px',background:'rgba(37,211,102,0.12)',border:'1px solid rgba(37,211,102,0.3)',borderRadius:12,color:'#25D366',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 0.15s'}}
                          >
                            <MessageCircle style={{width:16,height:16}} />
                            WhatsApp
                          </button>
                        </div>

                        {/* Tip */}
                        <div style={{marginTop:16,padding:'10px 14px',background:'rgba(59,130,246,0.06)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:10}}>
                          <p style={{fontSize:11,color:'rgba(96,165,250,0.8)',fontFamily:'DM Sans,sans-serif',margin:0,lineHeight:1.5}}>
                            Anyone with this code or link can view and attempt this exact paper within 24 hours. They need to be signed in to attempt it.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Close button */}
                  <div style={{padding:'0 24px 20px'}}>
                    <button
                      onClick={() => setShowShareModal(false)}
                      style={{width:'100%',padding:'11px',fontSize:13,fontWeight:600,color:'#525870',background:'transparent',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,cursor:'pointer',fontFamily:'DM Sans,sans-serif',transition:'all 0.15s'}}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}

            {downloadMutation.isError && (
              <div style={{marginTop:16,padding:'14px 18px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:12,display:'flex',alignItems:'flex-start',gap:10}}>
                <XCircle style={{width:18,height:18,color:'#EF4444',flexShrink:0,marginTop:2}} />
                <div>
                  <strong style={{color:'#FCA5A5',display:'block',fontFamily:'DM Sans, sans-serif',fontSize:14,fontWeight:700}}>Error:</strong>
                  <span style={{color:'#FCA5A5',fontFamily:'DM Sans, sans-serif',fontSize:13}}>
                    {downloadMutation.error instanceof Error ? downloadMutation.error.message : 'Unknown error'}
                  </span>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* ── Tutorial / How to Use Modal ── */}
      {showGuide && (
        <div
          onClick={() => setShowGuide(false)}
          style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.72)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{background:'#0F1120',border:'1px solid rgba(123,92,229,0.25)',borderRadius:24,maxWidth:580,width:'100%',maxHeight:'85vh',overflowY:'auto',position:'relative',boxShadow:'0 32px 80px rgba(0,0,0,0.6)',animation:'pc-scale-in 0.25s ease'}}
          >
            {/* Top bar */}
            <div style={{height:3,background:'linear-gradient(90deg,#7B5CE5,#9D7FF0)',borderRadius:'24px 24px 0 0'}} />
            <div style={{padding:'28px 32px 32px'}}>
              {/* Header */}
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:44,height:44,borderRadius:14,background:'rgba(123,92,229,0.18)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <FileDown style={{width:20,height:20,color:'#9D7FF0'}} />
                  </div>
                  <div>
                    <h2 style={{fontSize:18,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display', Georgia, serif",margin:'0 0 3px'}}>How to Use</h2>
                    <p style={{fontSize:12,color:'#7B5CE5',fontFamily:'DM Sans, sans-serif',margin:0,fontWeight:600}}>Abacus Paper Generator</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,color:'#B8BDD8'}}
                >
                  <XCircle style={{width:16,height:16}} />
                </button>
              </div>

              {/* Steps */}
              {[
                {
                  num: '1',
                  title: 'Set Paper Details',
                  body: 'Enter a title for your paper and select the level (e.g. AB-1, Junior, Custom). The level controls which preset blocks are loaded automatically.'
                },
                {
                  num: '2',
                  title: 'Add Question Blocks',
                  body: 'Each block is one section of questions. Click "Add Block" to add a new block at the end. Use the "+" button on any existing block to insert a new one right below it.'
                },
                {
                  num: '3',
                  title: 'Configure Each Block',
                  body: 'For every block, choose the operation type (e.g. Add/Sub, Multiplication), set the number of questions, and adjust digit / row settings to match the difficulty you need.'
                },
                {
                  num: '4',
                  title: 'Reorder & Organise',
                  body: 'Use the ↑↓ arrows to move blocks up or down. Duplicate a block with the copy icon. Delete unwanted blocks with the trash icon.'
                },
                {
                  num: '5',
                  title: 'Generate Preview',
                  body: 'Click "Generate Preview" to see all questions rendered. Toggle "Show Answers" to verify answers. Go back to edit and regenerate at any time.'
                },
                {
                  num: '6',
                  title: 'Live Attempt',
                  body: 'In the preview, click "Attempt Paper" to take the generated paper as a timed live session — questions appear one by one and your score is recorded.'
                },
                {
                  num: '7',
                  title: 'Download PDF',
                  body: 'Use "Download PDF" to export the paper. Choose "Questions Only" or "Questions + Answer Key" to get a print-ready PDF for classroom use.'
                },
              ].map(step => (
                <div key={step.num} style={{display:'flex',gap:16,marginBottom:20}}>
                  <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:13,fontWeight:800,color:'white',fontFamily:'JetBrains Mono, monospace'}}>
                    {step.num}
                  </div>
                  <div>
                    <h3 style={{fontSize:14,fontWeight:700,color:'#E8EAFF',fontFamily:'DM Sans, sans-serif',margin:'0 0 4px'}}>{step.title}</h3>
                    <p style={{fontSize:13,color:'rgba(255,255,255,0.42)',fontFamily:'DM Sans, sans-serif',margin:0,lineHeight:1.6}}>{step.body}</p>
                  </div>
                </div>
              ))}

              {/* Footer tip */}
              <div style={{marginTop:8,padding:'12px 16px',background:'rgba(123,92,229,0.08)',border:'1px solid rgba(123,92,229,0.2)',borderRadius:12}}>
                <p style={{fontSize:12,color:'#9D7FF0',fontFamily:'DM Sans, sans-serif',margin:0,fontWeight:500}}>
                  💡 Tip — Changing the Level dropdown auto-loads preset blocks for that level. Switch to "Custom" to start with a blank slate.
                </p>
              </div>

              <button
                onClick={() => setShowGuide(false)}
                style={{marginTop:20,width:'100%',padding:'12px',background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',color:'white',border:'none',borderRadius:12,fontWeight:700,fontSize:14,fontFamily:'DM Sans, sans-serif',cursor:'pointer'}}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast notification ───────────────────────────────────── */}
      {toast && (
        <div style={{position:'fixed',bottom:36,left:'50%',transform:'translateX(-50%)',zIndex:2000,pointerEvents:'none'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'13px 22px',background:toast.ok?'rgba(16,185,129,0.97)':'rgba(239,68,68,0.97)',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,0.45)',animation:'pc-fade-up 0.2s ease',fontFamily:'DM Sans,sans-serif',fontSize:14,fontWeight:600,color:'white',whiteSpace:'nowrap'}}>
            {toast.ok
              ? <Check style={{width:15,height:15,flexShrink:0}} />
              : <XCircle style={{width:15,height:15,flexShrink:0}} />
            }
            {toast.msg}
          </div>
        </div>
      )}

      {/* ── Toast notification ──────────────────────────────────────── */}
      {toast && (
        <div style={{position:'fixed',bottom:36,left:'50%',transform:'translateX(-50%)',zIndex:2000,pointerEvents:'none'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'13px 22px',background:toast.ok?'rgba(16,185,129,0.97)':'rgba(239,68,68,0.97)',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,0.45)',animation:'pc-fade-up 0.2s ease',fontFamily:'DM Sans,sans-serif',fontSize:14,fontWeight:600,color:'white',whiteSpace:'nowrap'}}>
            {toast.ok
              ? <Check style={{width:15,height:15,flexShrink:0}} />
              : <XCircle style={{width:15,height:15,flexShrink:0}} />
            }
            {toast.msg}
          </div>
        </div>
      )}

      {/* ── Save / Update Template Modal ──────────────────────────── */}
      {showSaveModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowSaveModal(false); }}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}
        >
          <div style={{background:'#0F1120',border:'1px solid rgba(123,92,229,0.3)',borderRadius:20,padding:'28px 32px',width:'100%',maxWidth:440,boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:38,height:38,borderRadius:10,background:'rgba(123,92,229,0.18)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <BookmarkPlus style={{width:18,height:18,color:'#9D7FF0'}} />
                </div>
                <div>
                  <h3 style={{fontSize:16,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display',Georgia,serif",margin:0}}>
                    {saveModalMode === 'update' ? 'Update Template' : 'Save as Template'}
                  </h3>
                  <p style={{fontSize:12,color:'#525870',fontFamily:'DM Sans,sans-serif',margin:0,marginTop:2}}>
                    {saveModalMode === 'update'
                      ? 'Overwrites the loaded template with current blocks'
                      : `${templates.length} / ${MAX_TEMPLATES} templates used`
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#B8BDD8',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}
              >
                <XCircle style={{width:16,height:16}} />
              </button>
            </div>

            {/* Name Input */}
            <div style={{marginBottom:16}}>
              <label className="pc-label" style={{display:'block',marginBottom:6,fontSize:12,fontWeight:700,color:'#9DA5C9',fontFamily:'DM Sans,sans-serif',textTransform:'uppercase',letterSpacing:'0.06em'}}>
                Template Name
              </label>
              <input
                autoFocus
                type="text"
                value={saveModalName}
                onChange={(e) => { setSaveModalName(e.target.value); setSaveModalError(""); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveModalSubmit();
                  if (e.key === 'Escape') setShowSaveModal(false);
                }}
                maxLength={60}
                placeholder="e.g. My Custom AB-3 Mix"
                style={{width:'100%',boxSizing:'border-box',padding:'12px 14px',background:'rgba(255,255,255,0.05)',border:`1px solid ${saveModalError?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.1)'}`,borderRadius:10,color:'#F0F2FF',fontFamily:'DM Sans,sans-serif',fontSize:14,outline:'none',transition:'border 0.2s'}}
              />
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:5}}>
                <span style={{fontSize:11,color:'#EF4444',fontFamily:'DM Sans,sans-serif',minHeight:16}}>
                  {saveModalError}
                </span>
                <span style={{fontSize:11,color:'#525870',fontFamily:'JetBrains Mono,monospace',letterSpacing:'0.02em'}}>
                  {saveModalName.length}/60
                </span>
              </div>
            </div>

            {/* Summary chip */}
            <div style={{padding:'10px 14px',background:'rgba(123,92,229,0.07)',border:'1px solid rgba(123,92,229,0.18)',borderRadius:10,marginBottom:22}}>
              <span style={{fontSize:12,color:'#9D7FF0',fontFamily:'DM Sans,sans-serif',fontWeight:600}}>
                {blocks.length} block{blocks.length !== 1 ? 's' : ''} · {blocks.reduce((s, b) => s + (b.count || 0), 0)} questions
                {level && level !== 'Custom' ? ` · ${level}` : ''}
              </span>
            </div>

            {/* Action buttons */}
            <div style={{display:'flex',gap:10}}>
              <button
                onClick={() => setShowSaveModal(false)}
                style={{flex:1,padding:'12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#B8BDD8',fontWeight:600,fontFamily:'DM Sans,sans-serif',fontSize:14,cursor:'pointer'}}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModalSubmit}
                disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                style={{flex:2,padding:'12px',background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',border:'none',borderRadius:10,color:'white',fontWeight:700,fontFamily:'DM Sans,sans-serif',fontSize:14,cursor:createTemplateMutation.isPending||updateTemplateMutation.isPending?'not-allowed':'pointer',opacity:createTemplateMutation.isPending||updateTemplateMutation.isPending?0.6:1,transition:'opacity 0.2s'}}
              >
                {createTemplateMutation.isPending || updateTemplateMutation.isPending
                  ? 'Saving…'
                  : saveModalMode === 'update' ? 'Update Template' : 'Save Template'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

