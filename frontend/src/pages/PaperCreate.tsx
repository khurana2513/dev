import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, FileDown, XCircle, GripVertical, Copy, ChevronUp, ChevronDown, Play, ChevronDown as ChevronDownIcon } from "lucide-react";
import { previewPaper, generatePdf, PaperConfig, BlockConfig, GeneratedBlock } from "@/lib/api";
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
  
  // Track previous location to detect page changes
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
    }
    
    previousLocationRef.current = location;
  }, [location]);
  
  // Reset level to Custom when switching to Vedic pages (level selection is now manual via dropdown)
  // No automatic level setting - users select level via dropdown
  
  // Load preset blocks when level changes (but not on initial mount if Custom)
  useEffect(() => {
    // Check if level has presets: AB-1 through AB-10, Junior, Advanced, Vedic-Level-1, Vedic-Level-2
    const hasPresets = level.startsWith("AB-") || level === "Junior" || level === "Advanced" || level === "Vedic-Level-1" || level === "Vedic-Level-2";
    
    // AbortController to cancel in-flight requests when level changes
    const abortController = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (hasPresets && level !== "Custom") {
      console.log(`🟦 [PRESETS] Loading preset blocks for level: ${level}`);
      setLoadingPresets(true);
      setBlocks([]); // Clear blocks while loading
      // Load preset blocks from backend
      const apiBase = import.meta.env.VITE_API_BASE || "/api";
      const url = `${apiBase}/presets/${level}`;
      console.log(`🟦 [PRESETS] Fetching from: ${url}`);
      
      // Add timeout
      timeoutId = setTimeout(() => {
        console.log(`⏱️ [PRESETS] Request timeout after 10s, aborting...`);
        abortController.abort();
      }, 10000); // 10 second timeout
      
      fetch(url, { signal: abortController.signal })
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
      rows: 5,
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
                              'powerOf10',
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
    setBlocks(blocks.filter((_, i) => i !== index));
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
          block.type === "big_friends_add_sub") {
        const digits = block.constraints.digits;
        if (digits !== undefined && digits !== -1) {
          if (digits < 1 || digits > 10) {
            blockErrors.digits = digits < 1 ? "Minimum value for Digits is 1" : "Maximum value for Digits is 10";
            hasErrors = true;
          }
        }
        const rows = block.constraints.rows;
        if (rows !== undefined && rows !== -1) {
          if (rows < 3 || rows > 30) {
            blockErrors.rows = rows < 3 ? "Minimum value for Rows is 3" : "Maximum value for Rows is 30";
            hasErrors = true;
          }
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
        if (b.type === "addition" || b.type === "subtraction" || b.type === "add_sub" || b.type === "integer_add_sub" || b.type === "direct_add_sub" || b.type === "small_friends_add_sub" || b.type === "big_friends_add_sub") {
          constraints.digits = b.constraints.digits || 2;
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
    <div className="min-h-screen bg-background pt-32 pb-20 px-6 transition-colors duration-300">
      <div className="container mx-auto">
        {/* Page Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <Link href="/">
              <button className="group flex items-center gap-2 px-6 py-3 bg-background border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all">
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform text-primary" />
                <span className="font-bold uppercase tracking-widest text-muted-foreground">Back</span>
              </button>
            </Link>
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-foreground flex items-center gap-3">
              <FileDown className="w-10 h-10 text-primary" />
              Create Paper
            </h1>
            <div className="w-32"></div>
          </div>
        </header>

        {step === 1 && (
          <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-xl space-y-8">
            {/* Page Title */}
            {isBasicPage && (
              <div className="mb-8 pb-6 border-b border-border">
                <h2 className="text-3xl font-black tracking-tight text-card-foreground mb-2">Basic Operations</h2>
                <p className="text-muted-foreground">Create math papers with basic operations: Addition, Subtraction, Multiplication, and Division</p>
              </div>
            )}
            {isJuniorPage && (
              <div className="mb-8 pb-6 border-b border-border">
                <h2 className="text-3xl font-black tracking-tight text-card-foreground mb-2">Junior Operations</h2>
                <p className="text-muted-foreground">Create math papers for junior level abacus training: Direct Add/Sub, Small Friends, and Big Friends</p>
              </div>
            )}
            {isAdvancedPage && (
              <div className="mb-8 pb-6 border-b border-border">
                <h2 className="text-3xl font-black tracking-tight text-card-foreground mb-2">Advanced Operations</h2>
                <p className="text-muted-foreground">Create math papers with advanced operations: Decimal operations, LCM, GCD, Square Root, Cube Root, and more</p>
              </div>
            )}
            {isVedicPage && (
              <div className="mb-8 pb-6 border-b border-border">
                <h2 className="text-3xl font-black tracking-tight text-card-foreground mb-2">
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
                <p className="text-muted-foreground">
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
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-2">
                  Paper Title
                </label>
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
                  className="w-full px-4 py-3 border-0 rounded-xl focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400"
                  placeholder="Practice Paper"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Level
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as PaperConfig["level"])}
                  className="w-full px-4 py-3 border-0 rounded-xl focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Custom">Custom</option>
                  {/* Show Abacus levels on Basic page */}
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
                  {/* Show Abacus-7 through Abacus-10 on Advanced page */}
                  {isAdvancedPage && (
                    <>
                      <option value="AB-7">Abacus-7</option>
                      <option value="AB-8">Abacus-8</option>
                      <option value="AB-9">Abacus-9</option>
                      <option value="AB-10">Abacus-10</option>
                    </>
                  )}
                  {/* Show Vedic Maths levels on Vedic pages */}
                  {isVedicPage && (
                    <>
                      <option value="Vedic-Level-1">Vedic Maths-1</option>
                      <option value="Vedic-Level-2">Vedic Maths-2</option>
                      <option value="Vedic-Level-3">Vedic Maths-3</option>
                      <option value="Vedic-Level-4">Vedic Maths-4</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Blocks Section */}
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Question Blocks</h2>
                  {blocks.length > 0 && (
                      <p className="text-sm text-gray-600 dark:text-white mt-1">
                      Total Questions: <span className="font-bold text-blue-600 dark:text-blue-400">{blocks.reduce((sum, block) => sum + block.count, 0)}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      if (blocks.length === 0) return;
                      if (confirm("Are you sure you want to clear all blocks? This action cannot be undone.")) {
                        setBlocks([]);
                      }
                    }}
                    disabled={blocks.length === 0}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 whitespace-nowrap ${
                      blocks.length > 0
                        ? "bg-destructive text-destructive-foreground hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
                    }`}
                    title={blocks.length > 0 ? "Clear all blocks" : "No blocks to clear"}
                  >
                    <Trash2 className="w-5 h-5" />
                    Clear All Blocks
                  </button>
                  <button
                    onClick={addBlock}
                    className="flex items-center gap-2 px-6 py-3 premium-gradient text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
                  >
                    <Plus className="w-5 h-5" />
                    Add Block
                  </button>
                </div>
              </div>

              <div className="space-y-6">
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
                    className={`group relative bg-gradient-to-br from-white via-white/95 to-white/90 dark:from-slate-800/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-xl border-2 rounded-3xl shadow-xl dark:shadow-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] ${
                      draggedIndex === index
                        ? 'opacity-40 scale-95 border-primary/60 dark:border-primary/60'
                        : draggedIndex !== null
                        ? 'border-primary/40 dark:border-primary/40'
                        : 'border-slate-200/60 dark:border-slate-700/60 hover:border-primary/30 dark:hover:border-primary/40'
                    }`}
                  >
                    {/* Premium gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 dark:from-primary/10 dark:via-transparent dark:to-primary/10 rounded-3xl pointer-events-none" />

                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl premium-gradient flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                            <span className="text-2xl font-black text-white">{index + 1}</span>
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white group-hover:text-primary transition-colors duration-300">
                              {generateSectionName(block)}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Move Up Button */}
                          <button
                            onClick={() => moveBlockUp(index)}
                            disabled={index === 0}
                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-primary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Move Up"
                          >
                            <ChevronUp className="w-5 h-5" />
                          </button>
                          {/* Move Down Button */}
                          <button
                            onClick={() => moveBlockDown(index)}
                            disabled={index === blocks.length - 1}
                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-primary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Move Down"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                          {/* Duplicate Button */}
                          <button
                            onClick={() => handleDuplicateBlock(index)}
                            className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Duplicate Block"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteBlock(index)}
                            className="p-2.5 rounded-xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Delete Block"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Type</label>
                        <select
                          value={block.type}
                          onChange={(e) => {
                            const newType = e.target.value as BlockConfig["type"];
                            updateBlock(index, { type: newType });
                          }}
                          className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                                </optgroup>
                              ) : isAdvancedPage ? (
                                <>
                                  <optgroup label="Basic Operations">
                                    <option value="add_sub">Add/Sub</option>
                                    <option value="addition">Addition</option>
                                    <option value="subtraction">Subtraction</option>
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
                                  <option value="addition">Addition</option>
                                  <option value="subtraction">Subtraction</option>
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
                              <option value="addition">Addition</option>
                              <option value="subtraction">Subtraction</option>
                              <option value="multiplication">Multiplication</option>
                              <option value="division">Division</option>
                            </optgroup>
                          )}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                          className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                            getFieldError(index, block.type === "vedic_tables" || block.type === "vedic_tables_large" ? "rows" : "count")
                              ? "focus:ring-red-200"
                              : "focus:ring-blue-200"
                          }`}
                        />
                        {getFieldError(index, block.type === "vedic_tables" || block.type === "vedic_tables_large" ? "rows" : "count") && (
                          <p className="mt-1 text-sm text-red-600">{getFieldError(index, block.type === "vedic_tables" || block.type === "vedic_tables_large" ? "rows" : "count")}</p>
                        )}
                      </div>

                      {(block.type === "addition" || block.type === "subtraction" || block.type === "add_sub" || block.type === "integer_add_sub" || block.type === "decimal_add_sub" || block.type === "direct_add_sub" || block.type === "small_friends_add_sub" || block.type === "big_friends_add_sub") && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                              {block.type === "decimal_add_sub" ? "Digits (Before Decimal) (1-10)" : "Digits (1-10)"}
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
                                    if (numVal < 1) {
                                      setFieldError(index, "digits", "Minimum value for Digits is 1");
                                    } else if (numVal > 10) {
                                      setFieldError(index, "digits", "Maximum value for Digits is 10");
                                    } else {
                                      setFieldError(index, "digits", null);
                                    }
                                  }
                                // If input contains non-numeric characters, don't update (prevent typing letters/symbols)
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Rows (3-30)</label>
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
                                    if (numVal < 3) {
                                      setFieldError(index, "rows", "Minimum value for Rows is 3");
                                    } else if (numVal > 30) {
                                      setFieldError(index, "rows", "Maximum value for Rows is 30");
                                    } else {
                                      setFieldError(index, "rows", null);
                                    }
                                  }
                                // If input contains non-numeric characters, don't update (prevent typing letters/symbols)
                              }}
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Digits (2-30)</label>
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
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Base (100, 1000, etc)</label>
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
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                          />
                        </div>
                      )}

                      {(block.type === "vedic_multiply_by_12_19" || block.type === "vedic_multiply_by_21_91") && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Digits (2-30)</label>
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Multiplier (12-19, optional)</label>
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
                                className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Multiplier (21-91, optional)</label>
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
                                className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">First Number Digits (1-30)</label>
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Second Number Digits (1-30)</label>
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Digits (2-30)</label>
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Divisor (2-9, optional)</label>
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Table Number (111-999, optional)</label>
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
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Table Number (1111-9999, optional)</label>
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
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Digits (1-10, optional)</label>
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
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Digits (2-10, optional)</label>
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
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Power of 10 (2-6, optional)</label>
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
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Base (100, 1000, etc, optional)</label>
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
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                          </div>
                      )}

                      {(block.type === "vedic_divide_by_9s_repetition_equal" || block.type === "vedic_divide_by_9s_repetition_less_than" ||
                        block.type === "vedic_divide_by_11s_repetition_equal" || block.type === "vedic_divide_by_11s_repetition_less_than") && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Digits (1-10, optional)</label>
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
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Digits (1-5)</label>
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Rows (3-30)</label>
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Digits (1-10, optional)</label>
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
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Case</label>
                          <select
                            value={block.constraints.multiplicationCase || "mix"}
                            onChange={(e) => {
                              updateBlock(index, { constraints: { ...block.constraints, multiplicationCase: e.target.value as any } });
                            }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Case</label>
                          <select
                            value={block.constraints.fractionCase || "mix"}
                            onChange={(e) => {
                              updateBlock(index, { constraints: { ...block.constraints, fractionCase: e.target.value as any } });
                            }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Digits (1-10, optional)</label>
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Divisor (2,3,4,5,6,8,9,10, optional)</label>
                            <select
                              value={block.constraints.divisorCheck === undefined ? "" : String(block.constraints.divisorCheck)}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateBlock(index, { constraints: { ...block.constraints, divisorCheck: val === "" ? undefined : parseInt(val) } });
                              }}
                              className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Case</label>
                          <select
                            value={block.constraints.funWith5Case || block.constraints.funWith10Case || "mix"}
                            onChange={(e) => {
                              if (block.type === "vedic_fun_with_5_level4") {
                                updateBlock(index, { constraints: { ...block.constraints, funWith5Case: e.target.value as any } });
                              } else {
                                updateBlock(index, { constraints: { ...block.constraints, funWith10Case: e.target.value as any } });
                              }
                            }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Case</label>
                          <select
                            value={block.constraints.divisibilityCase || "random"}
                            onChange={(e) => {
                              updateBlock(index, { constraints: { ...block.constraints, divisibilityCase: e.target.value as any } });
                            }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Divisor Digits (1-20)</label>
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
                                className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Case</label>
                          <select
                            value={block.constraints.division9_8_7_6Case || block.constraints.division91_121Case || "mix"}
                            onChange={(e) => {
                              if (block.type === "vedic_division_9_8_7_6") {
                                updateBlock(index, { constraints: { ...block.constraints, division9_8_7_6Case: e.target.value as any } });
                              } else {
                                updateBlock(index, { constraints: { ...block.constraints, division91_121Case: e.target.value as any } });
                              }
                            }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Digits (1-30)</label>
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
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Cube Root Digits (4-10)</label>
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
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Difficulty</label>
                          <select
                            value={block.constraints.bodmasDifficulty || "medium"}
                            onChange={(e) => {
                              updateBlock(index, { constraints: { ...block.constraints, bodmasDifficulty: e.target.value as any } });
                            }}
                            className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                      )}

                      {block.type === "vedic_square_root_level4" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Root Digits (1-30)</label>
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
                            className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
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
                              className={`w-full px-3 py-2 border-0 rounded-lg focus:ring-2 transition-all outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
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
                      <div className="flex items-center justify-center pt-4 mt-4 border-t border-slate-200/50 dark:border-slate-700/50 cursor-grab active:cursor-grabbing">
                        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors duration-300 select-none">
                          <GripVertical className="w-5 h-5" />
                          <span className="text-sm font-medium">Drag to reorder</span>
                          <GripVertical className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {blocks.length === 0 && (
                <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-700">
                  {loadingPresets ? (
                    <>
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600 mb-2 font-medium">Loading preset blocks for {level}...</p>
                      <p className="text-sm text-gray-500">Please wait</p>
                    </>
                  ) : (
                    <>
                  <p className="text-gray-500 dark:text-slate-400 mb-4">No question blocks yet</p>
                  <button
                    onClick={addBlock}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Add Your First Block
                  </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="pt-4">
              <button
                onClick={handlePreview}
                disabled={previewMutation.isPending || loadingPresets}
                className="w-full group flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {previewMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Preview...
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Generate Preview
                  </>
                )}
              </button>

              {previewMutation.isError && (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-red-800 block">Error:</strong>
                    <span className="text-red-700">
                      {previewMutation.error instanceof Error ? previewMutation.error.message : "Unknown error"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && previewData && (
          <div className="relative bg-gradient-to-br from-white/10 via-white/5 to-transparent dark:from-slate-800/60 dark:via-slate-800/40 dark:to-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-[2.5rem] shadow-2xl dark:shadow-slate-900/50 p-8 transition-all duration-500">
            {/* Glass morphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 dark:from-slate-700/10 dark:via-transparent dark:to-slate-800/10 rounded-[2.5rem] pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Paper Preview</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Review your generated questions</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAnswers(!showAnswers)}
                    className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {showAnswers ? (
                      <>
                        <EyeOff className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Hide Answers
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Show Answers
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-slate-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:scale-110 transition-transform" />
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
                              <div key={originalIndex} className="flex-1 bg-card border-2 border-border rounded-xl p-4 min-w-0 transition-all duration-300">
                                <h3 className="font-bold text-base mb-3 text-gray-900 dark:text-white">
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
                            <div key={`empty-${idx}`} className="flex-1 bg-slate-800/50 dark:bg-slate-800/50 rounded-xl border-2 border-slate-700/50 dark:border-slate-700/50"></div>
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
                       block.config.type === "big_friends_add_sub");
                    
                    return (
                      <div key={originalIndex} className="bg-card border-2 border-border rounded-xl p-4 transition-all duration-300">
                        <h3 className="font-bold text-base mb-3 text-white dark:text-white">
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
                                      <td key={`sno-${q.id}`} className="p-1 align-center border border-slate-600 dark:border-slate-600 bg-slate-700/50 dark:bg-slate-700/50 text-center" style={{ width: '10%' }}>
                                        <span className="font-bold text-sm text-white dark:text-white">{q.id}.</span>
                                      </td>
                                    ))}
                                    {Array.from({ length: Math.max(0, questionsPerRow - questionRow.length) }).map((_, idx) => (
                                        <td key={`empty-sno-${idx}`} className="p-1 border border-slate-600 dark:border-slate-600 bg-slate-800/30 dark:bg-slate-800/30" style={{ width: '10%' }}></td>
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
                                          return <td key={`empty-${q.id}-${rowIdx}`} className="p-1 border border-slate-600 dark:border-slate-600 bg-slate-700/50 dark:bg-slate-700/50" style={{ width: '10%' }}></td>;
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
                                          <td key={`${q.id}-${rowIdx}`} className="p-1 border border-slate-600 dark:border-slate-600 bg-slate-700/50 dark:bg-slate-700/50 text-center" style={{ width: '10%' }}>
                                            <div className="font-mono text-sm font-semibold text-white dark:text-white leading-tight text-center">
                                              {operator && <span className="mr-1 text-blue-400 dark:text-blue-400">{operator}</span>}
                                              {op}
                                            </div>
                                          </td>
                                        );
                                      })}
                                      {Array.from({ length: Math.max(0, questionsPerRow - questionRow.length) }).map((_, idx) => (
                                        <td key={`empty-op-${idx}-${rowIdx}`} className="p-1 border border-slate-600 dark:border-slate-600 bg-slate-800/30 dark:bg-slate-800/30" style={{ width: '10%' }}></td>
                                      ))}
                                    </tr>
                                  );
                                }
                                
                                // Line row
                                rows.push(
                                  <tr key={`line-row-${rowIndex}`}>
                                    {questionRow.map((q) => (
                                      <td key={`line-${q.id}`} className="p-1 border border-slate-600 dark:border-slate-600 bg-slate-700/50 dark:bg-slate-700/50" style={{ width: '10%' }}>
                                        <div className="border-t border-slate-500 dark:border-slate-500 w-full"></div>
                                      </td>
                                    ))}
                                    {Array.from({ length: Math.max(0, questionsPerRow - questionRow.length) }).map((_, idx) => (
                                      <td key={`empty-line-${idx}`} className="p-1 border border-slate-600 dark:border-slate-600 bg-slate-800/30 dark:bg-slate-800/30" style={{ width: '10%' }}></td>
                                    ))}
                                  </tr>
                                );
                                
                                // Answer row
                                rows.push(
                                  <tr key={`answer-row-${rowIndex}`}>
                                    {questionRow.map((q) => (
                                      <td key={`answer-${q.id}`} className="p-1 border border-slate-600 dark:border-slate-600 bg-slate-700/50 dark:bg-slate-700/50 text-center" style={{ width: '10%', minHeight: '1.2rem' }}>
                                        <div style={{ minHeight: '1.2rem' }} className="text-center">
                                          {showAnswers && (
                                            <div className="text-white dark:text-white font-mono text-sm font-bold text-center">{q.answer}</div>
                                          )}
                                        </div>
                                      </td>
                                    ))}
                                    {Array.from({ length: Math.max(0, questionsPerRow - questionRow.length) }).map((_, idx) => (
                                      <td key={`empty-answer-${idx}`} className="p-1 border border-slate-600 dark:border-slate-600 bg-slate-800/30 dark:bg-slate-800/30" style={{ width: '10%' }}></td>
                                    ))}
                                  </tr>
                                );
                                
                                return (
                                  <table key={`table-row-${rowIndex}`} className="w-full border-collapse mb-4" style={{ tableLayout: 'fixed' }}>
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

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/20 dark:border-slate-700/50">
              <button
                onClick={handleAttemptPaper}
                className="group flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-sm"
              >
                <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Attempt Paper
              </button>

              <button
                onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
                disabled={downloadMutation.isPending}
                className="w-full group flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 text-sm"
              >
                <FileDown className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {downloadMutation.isPending ? "Generating..." : "Download"}
                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${downloadDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Premium Modal-Style Download Menu */}
            {downloadDropdownOpen && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop with blur */}
                <div 
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
                  onClick={() => setDownloadDropdownOpen(false)}
                />
                
                {/* Modal Content */}
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden transform transition-all duration-300 scale-100 opacity-100">
                  {/* Header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileDown className="w-5 h-5" />
                      Download Options
                    </h3>
                    <p className="text-sm text-blue-100 mt-1">Choose your preferred format</p>
                  </div>

                  {/* Modal Content */}
                  {/* Options */}
                  <div className="p-4 space-y-2">
                    <button
                      onClick={() => {
                        downloadMutation.mutate({ withAnswers: false, answersOnly: false });
                        setDownloadDropdownOpen(false);
                      }}
                      disabled={downloadMutation.isPending}
                      className="w-full group flex items-center gap-4 px-5 py-4 rounded-xl bg-secondary hover:bg-secondary/80 border border-border transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] hover:shadow-lg"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500 dark:bg-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileDown className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-gray-900 dark:text-white">Question Paper</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Questions only, no answers</div>
                      </div>
                      <div className="flex-shrink-0 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        →
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        downloadMutation.mutate({ withAnswers: true, answersOnly: false });
                        setDownloadDropdownOpen(false);
                      }}
                      disabled={downloadMutation.isPending}
                      className="w-full group flex items-center gap-4 px-5 py-4 rounded-xl bg-secondary hover:bg-secondary/80 border border-border transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] hover:shadow-lg"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500 dark:bg-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileDown className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-gray-900 dark:text-white">Answer Key</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Questions with answers included</div>
                      </div>
                      <div className="flex-shrink-0 text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        →
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        downloadMutation.mutate({ withAnswers: false, answersOnly: false, includeSeparateAnswerKey: true });
                        setDownloadDropdownOpen(false);
                      }}
                      disabled={downloadMutation.isPending}
                      className="w-full group flex items-center gap-4 px-5 py-4 rounded-xl bg-secondary hover:bg-secondary/80 border border-border transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] hover:shadow-lg"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500 dark:bg-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileDown className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-gray-900 dark:text-white">Question Paper + Answer Key</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Separate pages for questions and answers</div>
                      </div>
                      <div className="flex-shrink-0 text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        →
                      </div>
                    </button>
                  </div>

                  {/* Close Button */}
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => setDownloadDropdownOpen(false)}
                      className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {downloadMutation.isError && (
              <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 rounded-2xl flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-red-800 dark:text-red-200 block">Error:</strong>
                  <span className="text-red-700 dark:text-red-300">
                    {downloadMutation.error instanceof Error ? downloadMutation.error.message : "Unknown error"}
                  </span>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


