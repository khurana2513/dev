import React from "react";
import { Question } from "@/lib/api";

interface Props {
  question: Question;
  showAnswer?: boolean;
  hideSerialNumber?: boolean; // Hide serial number when used in attempt page
  largeFont?: boolean; // Use larger font size for attempt page
  smallHorizontalFont?: boolean; // Use smaller font for horizontal questions in preview
}

// Helper function to format numbers without scientific notation
function formatNumber(num: number): string {
  // Convert to string first to check for scientific notation
  const str = num.toString();
  
  // If already in scientific notation, convert it
  if (str.includes('e') || str.includes('E')) {
    const match = str.match(/^([\d.]+)e([+-]?\d+)$/i);
    if (match) {
      const [, base, exp] = match;
      const exponent = parseInt(exp);
      const [intPart, decPart = ''] = base.split('.');
      
      if (exponent > 0) {
        // Positive exponent - move decimal point right
        const totalDecimals = decPart.length;
        if (exponent >= totalDecimals) {
          // All decimals become part of integer, add zeros
          return intPart + decPart + '0'.repeat(exponent - totalDecimals);
        } else {
          // Some decimals remain
          return intPart + decPart.slice(0, exponent) + '.' + decPart.slice(exponent);
        }
      } else {
        // Negative exponent - move decimal point left
        const absExp = Math.abs(exponent);
        return '0.' + '0'.repeat(absExp - 1) + intPart.replace(/^0+/, '') + decPart;
      }
    }
    // Fallback for malformed scientific notation
    return str;
  }
  
  // For very large integers, ensure no scientific notation
  // Use Number.isSafeInteger to check if we can safely format
  if (Number.isInteger(num) && Math.abs(num) < Number.MAX_SAFE_INTEGER) {
    return num.toFixed(0);
  }
  
  // For very large numbers that might be displayed in scientific notation
  // Use toLocaleString without grouping
  if (Math.abs(num) >= 1e6) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 0, useGrouping: false });
  }
  
  return str;
}

export default function MathQuestion({ question, showAnswer = false, hideSerialNumber = false, largeFont = false, smallHorizontalFont = false }: Props) {
  // Premium serial number styling
  const serialNumber = (
    <span className="font-bold text-sm text-blue-400 dark:text-blue-400 mr-2">{question.id}.</span>
  );
  
  // Memoize decimal conversion to prevent log spam on every render
  const processedDecimalLines = React.useMemo(() => {
    // PRIMARY CHECK: If backend-provided text contains '.', and question is vertical, it's decimal_add_sub.
    // IMPORTANT: Do NOT infer decimals from operands/operator. `add_sub` and `integer_add_sub` can look similar.
    const textStr = question.text ? String(question.text) : '';
    const hasDecimalText = textStr.includes('.');
    const isVerticalWithDecimals = question.isVertical && hasDecimalText;
    
    // Only treat as decimal if backend text contains decimals.
    const isDecimalAddSub = isVerticalWithDecimals;
    
    if (isDecimalAddSub && hasDecimalText && textStr) {
      // Use the text field directly - it's already formatted with decimals
      const lines = textStr.split('\n').filter(line => line.trim() !== '');
      // Debug log (only once per question, not on every render)
      if (process.env.NODE_ENV === 'development') {
        console.log('[MathQuestion] Using text field for decimal_add_sub:', {
          lines,
          originalText: question.text,
          textStr,
          hasDecimalText,
          isVertical: question.isVertical,
          operator: question.operator,
          operands: question.operands
        });
      }
      return lines;
    }
    return null;
  }, [question.text, question.isVertical, question.operator, question.operands]);
  
  // For decimal_add_sub, use the text field directly (it's already formatted with decimals)
  // Check for decimal_add_sub by operator "±" (Unicode: U+00B1, char code 177)
  const operatorStr = String(question.operator || "");
  const operatorCharCode = operatorStr.length > 0 ? operatorStr.charCodeAt(0) : -1;
  
  // PRIORITY: If vertical question has text with decimals, treat as decimal_add_sub
  // OR if operands are in decimal format (NOT multiples of 10)
  if (processedDecimalLines) {
    // Use table structure for Excel compatibility
    // ALWAYS prefer text field if it contains decimal points (backend-generated format)
    const lines = processedDecimalLines;
    
    return (
      <table className="w-full border-collapse bg-slate-800/50 dark:bg-slate-800/50 rounded border border-slate-600 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 transition-colors shadow-sm">
        <tbody>
          <tr>
            {!hideSerialNumber && (
              <td className="p-1.5 align-center w-8 border-r border-slate-600 dark:border-slate-600 text-center">
                <span className="font-bold text-sm text-blue-400 dark:text-blue-400">{question.id}.</span>
              </td>
            )}
            <td className="p-1.5">
              <div className="flex flex-col items-end space-y-0.5">
                {lines.map((line, idx) => (
                  <div key={idx} className={`text-right font-mono ${largeFont ? 'text-xl' : 'text-base'} font-semibold text-white dark:text-white leading-tight`}>
                    {line}
                  </div>
                ))}
                <div className="border-t border-slate-500 dark:border-slate-500 w-full my-0.5"></div>
                {/* Always show answer space (blank if answer not shown) */}
                <div className="min-h-[1.2rem] text-right w-full">
                  {showAnswer && (
                    <div className={`text-slate-300 dark:text-slate-300 font-mono ${largeFont ? 'text-xl' : 'text-base'} font-bold`}>
                      {typeof question.answer === 'number' && question.answer % 1 !== 0 
                        ? question.answer.toFixed(1) 
                        : formatNumber(question.answer)}
                    </div>
                  )}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
  
  if (question.isVertical) {
    // Decimal add/sub is ONLY when backend text contains '.', otherwise treat as integer formatting.
    const hasDecimalText = question.text && String(question.text).includes('.');
    const isDecimalFormatVertical = !!hasDecimalText;
    
    // Use table structure for Excel compatibility - serial number in separate column
    return (
      <table className="w-full border-collapse bg-slate-800/50 dark:bg-slate-800/50 rounded border border-slate-600 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 transition-colors shadow-sm">
        <tbody>
          {/* Serial number row */}
          <tr>
            {!hideSerialNumber && (
              <td className="p-1.5 align-center w-8 border-r border-slate-600 dark:border-slate-600 text-center">
                <span className="font-bold text-sm text-blue-400 dark:text-blue-400">{question.id}.</span>
              </td>
            )}
            <td className="p-1.5">
              <div className="flex flex-col items-end space-y-0.5">
                {isDecimalFormatVertical ? (
                  // Use backend-formatted text field directly.
                  String(question.text).split('\n').filter(line => line.trim() !== '').map((line, idx) => (
                    <div key={idx} className={`text-right font-mono ${largeFont ? 'text-xl' : 'text-base'} font-semibold text-white dark:text-white leading-tight`}>
                      {line}
                    </div>
                  ))
                ) : (
                  // Fallback: reconstruct from operands (regular add/sub - no decimal conversion)
                  question.operands.map((op, idx) => {
                    // For regular add/sub, display operands as-is (no decimal conversion)
                    const displayValue = formatNumber(op);
                    
                    // Handle mixed operations (add_sub)
                    if (question.operators && question.operators.length > 0) {
                      if (idx === 0) {
                        // First operand has no operator
                        return (
                          <div key={idx} className={`text-right font-mono ${largeFont ? 'text-xl' : 'text-base'} font-semibold text-white dark:text-white leading-tight`}>
                            {displayValue}
                          </div>
                        );
                      } else {
                        // Subsequent operands have their operators
                        const operator = question.operators[idx - 1];
                        return (
                          <div key={idx} className={`text-right font-mono ${largeFont ? 'text-xl' : 'text-base'} font-semibold text-white dark:text-white leading-tight`}>
                            <span className="mr-1 text-blue-400 dark:text-blue-400">{operator}</span>
                            {displayValue}
                          </div>
                        );
                      }
                    }
                    
                    // Handle single operator type (addition or subtraction)
                    const showOperator = 
                      (question.operator === "-" && idx > 0) || 
                      (question.operator !== "-" && idx === question.operands.length - 1);
                    
                    return (
                      <div key={idx} className={`text-right font-mono ${largeFont ? 'text-xl' : 'text-base'} font-semibold text-white dark:text-white leading-tight`}>
                        {showOperator && (
                          <span className="mr-1 text-blue-400 dark:text-blue-400">{question.operator}</span>
                        )}
                        {displayValue}
                      </div>
                    );
                  })
                )}
                <div className="border-t border-slate-500 dark:border-slate-500 w-full my-0.5"></div>
                {/* Always show answer space (blank if answer not shown) */}
                <div className="min-h-[1.2rem] text-right w-full">
                  {showAnswer && (
                    <div className={`text-slate-300 dark:text-slate-300 font-mono ${largeFont ? 'text-xl' : 'text-base'} font-bold`}>
                      {typeof question.answer === 'number' && question.answer % 1 !== 0 
                        ? question.answer.toFixed(1) 
                        : formatNumber(question.answer)}
                    </div>
                  )}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  // For square root, cube root, LCM, GCD, decimal operations, percentage, use the text field directly
  // Check if it's a decimal division (whole numbers with decimal answer)
  const isDecimalDivision = question.operator === "÷" && question.text && question.text.includes("÷") && !question.text.includes(".");
  
  // Check for operators that use single operand or have custom text (squares, complements, etc.)
  const usesSingleOperand = question.operator === "²" || question.operator === "C";
  const hasCustomText = question.text && (question.text.includes("LCM") || question.text.includes("GCD") || question.text.includes("√") || question.text.includes("∛") || question.text.includes("% of") || question.text.includes("C of") || question.text.includes("²"));
  
  if (question.operator === "√" || question.operator === "∛" || question.operator === "LCM" || question.operator === "GCD" || question.operator === "%" || question.operator === "²" || question.operator === "C" || isDecimalDivision || hasCustomText || usesSingleOperand || (question.operands && question.operands.length === 1)) {
    // Use table structure for Excel compatibility - answers in separate column
    return (
      <table className="w-full border-collapse bg-slate-800/50 dark:bg-slate-800/50 rounded border border-slate-600 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 transition-colors shadow-sm">
        <tbody>
          <tr>
            {!hideSerialNumber && (
              <td className="p-1.5 align-center w-8 border-r border-slate-600 dark:border-slate-600 text-center">
                <span className="font-bold text-sm text-blue-400 dark:text-blue-400">{question.id}.</span>
              </td>
            )}
              <td className={`p-1.5 ${showAnswer ? 'border-r border-slate-600 dark:border-slate-600' : ''}`}>
                <div className={`font-mono ${smallHorizontalFont ? 'text-sm' : (largeFont ? 'text-xl' : 'text-base')} font-semibold text-white dark:text-white break-all`} style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                {question.text}
              </div>
            </td>
            {showAnswer && (
              <td className="p-1.5 w-32 text-right align-top">
                <div className={`text-slate-300 dark:text-slate-300 font-mono ${largeFont ? 'text-xl' : 'text-base'} font-bold text-right whitespace-nowrap`}>
                  {typeof question.answer === 'number' && question.answer % 1 !== 0 
                    ? question.answer.toFixed(2).replace(/\.?0+$/, '') 
                    : formatNumber(question.answer)}
                </div>
              </td>
            )}
          </tr>
        </tbody>
      </table>
    );
  }

  // For decimal multiplication, handle decimal display
  if (question.operator === "×" && question.text && question.text.includes(".")) {
    // Use table structure for Excel compatibility - answers in separate column
    return (
      <table className="w-full border-collapse bg-slate-800/50 dark:bg-slate-800/50 rounded border border-slate-600 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 transition-colors shadow-sm">
        <tbody>
          <tr>
            {!hideSerialNumber && (
              <td className="p-1.5 align-center w-8 border-r border-slate-600 dark:border-slate-600 text-center">
                <span className="font-bold text-sm text-blue-400 dark:text-blue-400">{question.id}.</span>
              </td>
            )}
              <td className={`p-1.5 ${showAnswer ? 'border-r border-slate-600 dark:border-slate-600' : ''}`}>
                <div className={`font-mono ${smallHorizontalFont ? 'text-sm' : (largeFont ? 'text-xl' : 'text-base')} font-semibold text-white dark:text-white break-all`} style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                {question.text}
              </div>
            </td>
            {showAnswer && (
              <td className="p-1.5 w-32 text-right align-top">
                <div className={`text-slate-300 dark:text-slate-300 font-mono ${largeFont ? 'text-xl' : 'text-base'} font-bold text-right whitespace-nowrap`}>
                  {typeof question.answer === 'number' && question.answer % 1 !== 0 
                    ? question.answer.toFixed(2) 
                    : formatNumber(question.answer)}
                </div>
              </td>
            )}
          </tr>
        </tbody>
      </table>
    );
  }

  // Use table structure for Excel compatibility - answers in separate column
  // Handle questions with single operand or use text field if available
  let questionText: string;
  if (question.text && (question.operands.length === 1 || question.operator === "²" || question.operator === "C")) {
    // Use the text field for single-operand questions or custom text
    questionText = question.text;
  } else if (question.operands.length === 1) {
    // Single operand without custom text - construct it
    questionText = `${formatNumber(question.operands[0])} ${question.operator} =`;
  } else if (question.operands.length >= 2) {
    // Two or more operands - standard format
    questionText = `${formatNumber(question.operands[0])} ${question.operator} ${formatNumber(question.operands[1])} =`;
  } else {
    // Fallback to text field if available
    questionText = question.text || "?";
  }
  
  return (
    <table className="w-full border-collapse bg-slate-800/50 dark:bg-slate-800/50 rounded border border-slate-600 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 transition-colors shadow-sm">
      <tbody>
        <tr>
          {!hideSerialNumber && (
            <td className="p-1.5 align-center w-8 border-r border-slate-600 dark:border-slate-600 text-center">
              <span className="font-bold text-sm text-blue-400 dark:text-blue-400">{question.id}.</span>
            </td>
          )}
          <td className={`p-1.5 ${showAnswer ? 'border-r border-slate-600 dark:border-slate-600' : ''}`}>
            <div className={`font-mono ${smallHorizontalFont ? 'text-sm' : (largeFont ? 'text-xl' : 'text-base')} font-semibold text-white dark:text-white break-all`}>
              {questionText}
            </div>
          </td>
          {showAnswer && (
            <td className="p-1.5 w-32 text-right align-top">
              <div className={`text-slate-300 dark:text-slate-300 font-mono ${largeFont ? 'text-xl' : 'text-base'} font-bold text-right whitespace-nowrap`}>
                {typeof question.answer === 'number' && question.answer % 1 !== 0 
                  ? question.answer.toFixed(2) 
                  : formatNumber(question.answer)}
              </div>
            </td>
          )}
        </tr>
      </tbody>
    </table>
  );
}
