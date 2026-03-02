"""
HTML Template Generator for PDF Export
Matches the frontend preview structure exactly
"""
import re
from typing import List
from schemas import PaperConfig, GeneratedBlock


def format_number(num: float) -> str:
    """Format number without scientific notation (matching frontend formatNumber)."""
    if isinstance(num, float) and num % 1 == 0:
        return str(int(num))
    
    # Format decimals nicely
    if isinstance(num, float) and num % 1 != 0:
        # For 1 decimal place
        if abs(num * 10 - round(num * 10)) < 0.001:
            return f"{num:.1f}"
        # For 2 decimal places
        return f"{num:.2f}".rstrip('0').rstrip('.')
    
    return str(num)


def render_vertical_question(question, show_answer: bool = False, block_type: str = None) -> str:
    """Render a vertical question (addition/subtraction)."""
    # Check if this is a decimal question
    # PRIMARY CHECK: block type (most reliable)
    is_decimal = (block_type == "decimal_add_sub")
    
    # SECONDARY CHECK: text field contains decimal points (but only if not add_sub or integer_add_sub)
    if not is_decimal and hasattr(question, 'text') and question.text:
        text_str = str(question.text)
        # Only treat as decimal if text contains '.' AND it's not add_sub or integer_add_sub
        if '.' in text_str and block_type not in ("add_sub", "integer_add_sub"):
            is_decimal = True
    
    # FALLBACK: Check operands format (decimal_add_sub operands are 10-9999, NOT all multiples of 10)
    if not is_decimal and hasattr(question, 'operands') and question.operands:
        # For decimal_add_sub: operands are 10-9999, and at least one is NOT a multiple of 10
        if all(10 <= op <= 9999 for op in question.operands) and not all(op % 10 == 0 for op in question.operands):
            is_decimal = True
    
    html = '<div class="question-vertical">'
    
    # Question number
    html += f'<div class="question-number">{question.id}.</div>'
    html += '<div class="question-content">'
    
    # Render operands vertically
    if hasattr(question, 'operands') and question.operands:
        for idx, operand in enumerate(question.operands):
            if idx == 0:
                # First operand - right aligned
                if is_decimal:
                    display_value = f"{(operand / 10):.1f}"
                else:
                    display_value = format_number(operand)
                html += f'<div class="operand-row"><div class="operand-value">{display_value}</div></div>'
            else:
                # Subsequent operands with operator
                operator = "+"
                if hasattr(question, 'operators') and question.operators and len(question.operators) > idx - 1:
                    operator = question.operators[idx - 1]
                elif hasattr(question, 'operator') and question.operator:
                    operator = question.operator
                
                if is_decimal:
                    display_value = f"{(operand / 10):.1f}"
                else:
                    display_value = format_number(operand)
                html += f'<div class="operand-row"><div class="operator">{operator}</div><div class="operand-value">{display_value}</div></div>'
    
    # Horizontal line
    html += '<div class="question-line"></div>'
    
    # Answer space (always shown, with answer if requested)
    if show_answer and hasattr(question, 'answer') and question.answer is not None:
        html += f'<div class="answer-space">{format_number(question.answer)}</div>'
    else:
        html += '<div class="answer-space"></div>'
    
    html += '</div>'  # question-content
    html += '</div>'  # question-vertical
    
    return html


def render_horizontal_question(question, show_answer: bool = False) -> str:
    """Render a horizontal question (multiplication, division, etc.)."""
    # Add class to indicate if answer column exists
    has_answer = show_answer and hasattr(question, 'answer') and question.answer is not None
    table_class = "question-horizontal" + (" with-answer" if has_answer else " no-answer")
    html = f'<table class="{table_class}">'
    html += '<tbody><tr>'
    
    # Serial number column
    html += f'<td class="serial-col"><span class="question-number">{question.id}.</span></td>'
    
    # Question text column
    html += '<td class="question-col">'
    
    # Get operator to determine special formatting
    operator = getattr(question, 'operator', '')
    question_text = getattr(question, 'text', '')
    
    # Handle special operations that need custom formatting
    if operator == "√" or operator == "∛":
        # Square root or cube root - use text field directly (contains symbols)
        html += f'<div class="question-text">{question_text}</div>'
    elif operator == "×" and question_text and "." in question_text:
        # Decimal multiplication - use text field directly (contains decimals)
        html += f'<div class="question-text">{question_text}</div>'
    elif question_text and (question_text.startswith("√") or question_text.startswith("∛") or "LCM" in question_text or "GCD" in question_text or "%" in question_text or "." in question_text):
        # Use text field directly for operations that have special formatting (LCM, GCD, percentage, etc.)
        html += f'<div class="question-text">{question_text}</div>'
    elif hasattr(question, 'operands') and question.operands:
        # Standard format from operands
        if len(question.operands) == 2:
            op1 = format_number(question.operands[0])
            op2 = format_number(question.operands[1])
            # Determine operator from question.operator or infer from text field
            if hasattr(question, 'operator') and question.operator:
                operator = question.operator
            elif question_text and "÷" in question_text:
                operator = "÷"
            elif question_text and "×" in question_text:
                operator = "×"
            else:
                operator = "×"  # Default fallback
            html += f'<div class="question-text">{op1} {operator} {op2} =</div>'
        else:
            # Multiple operands
            parts = [format_number(question.operands[0])]
            for i in range(1, len(question.operands)):
                op = question.operands[i]
                operator = question.operators[i - 1] if hasattr(question, 'operators') and question.operators and len(question.operators) > i - 1 else "+"
                parts.append(f"{operator} {format_number(op)}")
            html += f'<div class="question-text">{" ".join(parts)} =</div>'
    else:
        html += f'<div class="question-text">{question_text or ""}</div>'
    
    html += '</td>'
    
    # Answer column (if showing answers)
    if show_answer and hasattr(question, 'answer') and question.answer is not None:
        html += f'<td class="answer-col"><div class="answer-text">{format_number(question.answer)}</div></td>'
    
    html += '</tr></tbody></table>'
    
    return html


def generate_html(config: PaperConfig, generated_blocks: List[GeneratedBlock], 
                 with_answers: bool = False, answers_only: bool = False, include_separate_answer_key: bool = False) -> str:
    """Generate complete HTML document matching preview structure.
    
    Args:
        config: Paper configuration
        generated_blocks: List of generated question blocks
        with_answers: Whether to include answers in questions
        answers_only: Whether to generate only answer key
        include_separate_answer_key: Whether to include question paper + separate answer key page
    """
    
    # Calculate total questions
    total_questions = sum(len(block.questions) for block in generated_blocks)
    
    # For include_separate_answer_key, render questions without answers
    # but still add answer key page
    effective_with_answers = with_answers and not include_separate_answer_key
    
    # Debug: Print the parameters to verify they're being passed correctly
    # print(f"DEBUG: with_answers={with_answers}, answers_only={answers_only}, include_separate_answer_key={include_separate_answer_key}")
    
    html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>""" + config.title + """</title>
    <style>
        @page {
            size: A4;
            margin: 12mm;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            font-weight: bold;
            line-height: 1.3;
            color: #1F2937;
            background: white;  /* White PDF background */
            padding: 0;
        }
        
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(45deg);
            font-size: 80pt;
            font-weight: bold;
            color: #000000;
            opacity: 0.08;  /* Further reduced opacity */
            z-index: 1;
            pointer-events: none;
            white-space: nowrap;  /* Keep watermark in single line */
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 0;
            position: relative;
            z-index: 2;  /* Above watermark */
        }
        
        .title {
            font-size: 16pt;
            font-weight: bold;
            color: #000000;
            margin-bottom: 4mm;
            text-align: center;
        }
        
        .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2mm;
            margin-bottom: 3mm;
            font-size: 9pt;
        }
        
        .info-left {
            text-align: left;
            padding-left: 3mm;  /* Slight padding to avoid overlapping with page border */
        }
        
        .info-right {
            text-align: right;
            padding-right: 30mm;  /* 1.5x spacing from right edge (1.5 * 20mm = 30mm) */
        }
        
        .info-item {
            margin-bottom: 2mm;
            font-weight: bold;  /* Make input columns bold */
        }
        
        .block-container {
            border: none;  /* Remove section borders */
            padding: 2mm;
            margin-bottom: 4mm;
            page-break-inside: avoid;
            break-inside: avoid;
            background: transparent;  /* Make transparent so watermark shows through */
        }
        
        /* Page box border - removed */
        
        .section-title {
            font-size: 12pt;
            font-weight: bold;
            color: #000000;
            margin-bottom: 3mm;
        }
        
        /* Vertical Questions (table structure matching preview) */
        .vertical-questions-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 2mm;
        }
        
        .vertical-questions-table td {
            border: 1pt solid #000000;
            padding: 1mm;
            background: transparent;  /* Transparent so watermark shows through */
            font-weight: bold;
        }
        
        .sno-cell {
            width: 10%;
            vertical-align: middle;
            text-align: center;
        }
        
        .operand-cell {
            width: 10%;
            text-align: center;
            vertical-align: top;
            padding: 1mm;
            overflow: hidden;
        }
        
        .operand-content {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            font-weight: bold;
            color: #1F2937;
            line-height: 1.2;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            position: relative;
        }
        
        .operand-wrapper {
            display: flex;
            align-items: center;
            width: 100%;
            max-width: 100%;
            justify-content: center;  /* Center the entire wrapper */
            position: relative;
        }
        
        .operator-wrapper {
            position: absolute;
            left: 2mm;
            text-align: left;
            display: block;
            z-index: 1;
        }
        
        .number-wrapper {
            text-align: center;  /* Center-align numbers */
            width: 100%;
            overflow: visible;
        }
        
        .line-cell {
            width: 10%;
            vertical-align: top;
        }
        
        .answer-cell {
            width: 10%;
            text-align: center;
            vertical-align: top;
            min-height: 7.5mm;
            height: 7.5mm;
            padding-top: 2mm;
            padding-bottom: 2mm;
        }
        
        .answer-value {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            font-weight: bold;
            color: #4B5563;
            text-align: center;
        }
        
        .question-number {
            font-weight: bold;
            font-size: 12pt;
            color: #1E40AF;
            text-align: center;
        }
        
        .operator {
            font-weight: bold;
            font-size: 11pt;
            color: #2563EB;
            margin-right: 2mm;
        }
        
        .question-line {
            border-top: 1pt solid #9CA3AF;
            width: 100%;
            margin: 0;
        }
        
        /* Horizontal Questions */
        .horizontal-questions-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4mm;
            margin-bottom: 2mm;
        }
        
        .question-horizontal {
            width: 100%;
            border-collapse: collapse;
            border: 1pt solid #000000;
            background: transparent;  /* Transparent so watermark shows through */
            table-layout: fixed;  /* Fixed layout for consistent column widths */
        }
        
        .question-horizontal td {
            padding: 1.5mm;
            vertical-align: top;
            font-weight: bold;
        }
        
        .serial-col {
            width: 9mm;  /* Increased by 50% from 6mm for better readability */
            border-right: 1pt solid #000000;
            text-align: center;
            vertical-align: middle;
            white-space: nowrap;
        }
        
        /* Wider serial column when answer column exists */
        .question-horizontal.with-answer .serial-col {
            width: 8mm;
        }
        
        .question-col {
            border-right: 1pt solid #000000;
            white-space: nowrap;
            width: 70%;  /* Fixed at 70% of table width - separator at 70% when answer column exists */
        }
        
        /* When no answer column, question takes remaining space */
        .question-horizontal.no-answer .question-col {
            width: auto;
            border-right: none;  /* No border when it's the last column */
        }
        
        .answer-col {
            width: 30%;  /* Fixed at 30% of table width */
            text-align: right;
            white-space: nowrap;
        }
        
        .question-text {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            font-weight: bold;
            color: #1F2937;
            white-space: nowrap;
            overflow: visible;
        }
        
        .answer-text {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 10pt;
            font-weight: bold;
            color: #4B5563;
            text-align: right;
        }
        
        .ending-section {
            margin-top: 5mm;
            text-align: center;
        }
        
        .ending-line {
            border-top: 1pt solid #000000;
            margin: 2mm 0;
        }
        
        .ending-text {
            font-size: 12pt;
            font-weight: bold;
            color: #000000;
            margin-top: 2mm;
        }
        
        .ending-exclamation {
            font-size: 12pt;
            font-weight: bold;
            color: #000000;
            margin-right: 2mm;
        }
        
        .page-number {
            position: fixed;
            bottom: 10mm;
            left: 50%;
            transform: translateX(-50%);
            font-size: 9pt;
            color: #666666;
        }
        
        @media print {
            .watermark {
                display: block;
            }
            .page-number {
                display: block;
            }
        }
    </style>
</head>
<body>
    <div class="watermark">TALENT HUB</div>
    <div class="container">"""
    
    if not answers_only:
        # Title
        html += f'<h1 class="title">{config.title}</h1>'
        
        # Info section
        html += '<div class="info-section">'
        html += '<div class="info-left">'
        html += '<div class="info-item">Name: </div>'
        html += '<div class="info-item">Start Time: </div>'
        html += f'<div class="info-item">MM: {total_questions}</div>'
        html += '</div>'
        html += '<div class="info-right">'
        html += '<div class="info-item">Date: </div>'
        html += '<div class="info-item">Stop Time: </div>'
        html += '</div>'
        html += '</div>'
        
        # Process blocks
        question_counter = 1
        
        for block_index, block in enumerate(generated_blocks):
            html += '<div class="block-container">'
            
            # Section title
            if block.config.title:
                html += f'<h2 class="section-title">{block.config.title}</h2>'
            
            # Check if block has vertical questions
            has_vertical = any(
                getattr(q, 'isVertical', getattr(q, 'is_vertical', False))
                for q in block.questions
            ) if block.questions else False
            
            if has_vertical:
                # Render vertical questions in table structure (matching preview exactly)
                vertical_questions = [q for q in block.questions 
                                     if getattr(q, 'isVertical', getattr(q, 'is_vertical', False))]
                
                # Process in chunks of 10
                for chunk_start in range(0, len(vertical_questions), 10):
                    chunk = vertical_questions[chunk_start:chunk_start + 10]
                    
                    # Create table matching preview structure
                    html += '<table class="vertical-questions-table">'
                    html += '<tbody>'
                    
                    # Serial number row
                    html += '<tr>'
                    for q in chunk:
                        html += f'<td class="sno-cell"><span class="question-number">{q.id}.</span></td>'
                    # Fill remaining cells
                    for _ in range(10 - len(chunk)):
                        html += '<td class="sno-cell"></td>'
                    html += '</tr>'
                    
                    # Pre-check which questions are decimal (do this once per question, not per operand)
                    question_is_decimal = {}
                    # Check block type first (most reliable for decimal_add_sub)
                    block_type = None
                    if hasattr(block, 'config') and block.config:
                        block_type = getattr(block.config, 'type', None)
                    is_block_decimal = (block_type == "decimal_add_sub")
                    
                    for q in chunk:
                        is_decimal = False
                        # PRIMARY CHECK: block type (most reliable for decimal_add_sub)
                        if is_block_decimal:
                            is_decimal = True
                        # SECONDARY CHECK: text field contains decimal points (but only if not add_sub or integer_add_sub)
                        elif hasattr(q, 'text') and q.text:
                            text_val = str(q.text)
                            # Only treat as decimal if text contains '.' AND it's not add_sub or integer_add_sub
                            if '.' in text_val and block_type not in ("add_sub", "integer_add_sub"):
                                is_decimal = True
                        # FALLBACK: Check operands format (more reliable than operator check since integer_add_sub also uses "±")
                        if not is_decimal and hasattr(q, 'operands') and q.operands:
                            # For decimal_add_sub: operands are 10-9999, and at least one is NOT a multiple of 10
                            # This distinguishes decimal_add_sub from integer_add_sub and add_sub (which also use "±" operator)
                            if all(op >= 10 and op <= 9999 for op in q.operands) and not all(op % 10 == 0 for op in q.operands):
                                is_decimal = True
                        question_is_decimal[q.id] = is_decimal
                    
                    # Operand rows
                    if chunk:
                        max_operands = max(len(q.operands) for q in chunk if hasattr(q, 'operands'))
                        for row_idx in range(max_operands):
                            html += '<tr>'
                            for q in chunk:
                                if hasattr(q, 'operands') and row_idx < len(q.operands):
                                    op = q.operands[row_idx]
                                    is_decimal = question_is_decimal.get(q.id, False)
                                    
                                    # Determine operator
                                    operator = ""
                                    if row_idx > 0:
                                        # For add_sub questions, operators are in the operators list
                                        if hasattr(q, 'operators') and q.operators and len(q.operators) > row_idx - 1:
                                            operator = q.operators[row_idx - 1]
                                        # For single operator questions (subtraction, etc.)
                                        elif hasattr(q, 'operator') and q.operator and q.operator != "±":
                                            if q.operator == "-":
                                                operator = q.operator  # Show minus for subtraction
                                            # For addition, operator is typically shown only on last line
                                            elif q.operator == "+" and row_idx == len(q.operands) - 1:
                                                operator = q.operator
                                    
                                    display_value = f"{(op / 10):.1f}" if is_decimal else format_number(op)
                                    html += f'<td class="operand-cell"><div class="operand-content">'
                                    html += '<div class="operand-wrapper">'
                                    if operator:
                                        html += f'<div class="operator-wrapper"><span class="operator">{operator}</span></div>'
                                    html += f'<div class="number-wrapper">{display_value}</div>'
                                    html += '</div></div></td>'
                                else:
                                    html += '<td class="operand-cell"></td>'
                            # Fill remaining cells
                            for _ in range(10 - len(chunk)):
                                html += '<td class="operand-cell"></td>'
                            html += '</tr>'
                    
                    # Line row
                    html += '<tr>'
                    for q in chunk:
                        html += '<td class="line-cell"><div class="question-line"></div></td>'
                    for _ in range(10 - len(chunk)):
                        html += '<td class="line-cell"></td>'
                    html += '</tr>'
                    
                    # Answer row
                    html += '<tr>'
                    for q in chunk:
                        html += '<td class="answer-cell">'
                        if effective_with_answers and hasattr(q, 'answer') and q.answer is not None:
                            html += f'<div class="answer-value">{format_number(q.answer)}</div>'
                        html += '</td>'
                    for _ in range(10 - len(chunk)):
                        html += '<td class="answer-cell"></td>'
                    html += '</tr>'
                    
                    html += '</tbody>'
                    html += '</table>'
            else:
                # Render horizontal questions in columns (fill first column, then second)
                horizontal_questions = [q for q in block.questions 
                                      if not getattr(q, 'isVertical', getattr(q, 'is_vertical', False))]
                
                # Split into two columns - fill first column completely, then second
                mid_point = (len(horizontal_questions) + 1) // 2  # Ceiling division
                column1 = horizontal_questions[:mid_point]
                column2 = horizontal_questions[mid_point:]
                
                # Render row by row
                max_rows = max(len(column1), len(column2))
                for row_idx in range(max_rows):
                    html += '<div class="horizontal-questions-container">'
                    # First column
                    if row_idx < len(column1):
                        html += render_horizontal_question(column1[row_idx], effective_with_answers)
                    else:
                        html += '<div></div>'  # Empty cell for alignment
                    # Second column
                    if row_idx < len(column2):
                        html += render_horizontal_question(column2[row_idx], effective_with_answers)
                    else:
                        html += '<div></div>'  # Empty cell for alignment
                    html += '</div>'
            
            html += '</div>'  # block-container
        
        # Ending section
        html += '<div class="ending-section">'
        html += '<div class="ending-line"></div>'
        html += '<div class="ending-text">ALL THE BEST!!!</div>'
        html += '</div>'
    
    # Answer key page (if requested)
    # For include_separate_answer_key, we always add the answer key page after questions
    should_add_answer_key = with_answers or answers_only or include_separate_answer_key
    if should_add_answer_key:
        # Add page break before answer key (unless it's answers_only, in which case we're starting fresh)
        if not answers_only:
            # Force page break - use multiple approaches for compatibility
            html += '<div style="page-break-before: always; break-before: page; -webkit-break-before: page; height: 0; margin: 0; padding: 0; display: block;"></div>'
        
        html += f'<h1 class="title">{config.title} - Answer Key</h1>'
        html += '<div style="margin-top: 4mm;"></div>'
        
        # Answer key styles
        html += '<style>'
        html += '''
        .answer-key-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0 8mm;
            margin-bottom: 3mm;
            width: 100%;
        }
        .answer-key-column {
            display: flex;
            flex-direction: column;
            gap: 2mm;
        }
        .answer-key-item {
            display: flex;
            align-items: baseline;
            gap: 2mm;
            font-size: 10pt;
            white-space: nowrap !important;
            overflow: visible;
            width: 100%;
        }
        .answer-key-question {
            white-space: nowrap !important;
            overflow: visible;
            flex: 0 1 auto;
            min-width: 0;
            max-width: none;
            font-weight: normal;
        }
        .answer-key-answer {
            font-weight: bold;
            flex-shrink: 0;
            white-space: nowrap !important;
        }
        '''
        html += '</style>'
        
        # Collect all answers first
        all_answers = []
        answer_counter = 1
        for block in generated_blocks:
            for q in block.questions:
                if hasattr(q, 'answer') and q.answer is not None:
                    # Build question text with proper formatting (same logic as render_horizontal_question)
                    question_text = ""
                    operator = getattr(q, 'operator', '')
                    text_field = getattr(q, 'text', '')
                    
                    # Handle special operations
                    if operator == "√" or operator == "∛":
                        # Use text field directly for root symbols
                        question_text = text_field.replace('\n', ' ') if text_field else ""
                    elif text_field and ("." in text_field or "LCM" in text_field or "GCD" in text_field or "%" in text_field or text_field.startswith("√") or text_field.startswith("∛")):
                        # Use text field directly for special operations (LCM, GCD, percentage, decimals, roots)
                        question_text = text_field.replace('\n', ' ')
                    elif text_field:
                        question_text = text_field.replace('\n', ' ')
                    elif hasattr(q, 'operands') and q.operands:
                        if len(q.operands) == 2:
                            op1 = format_number(q.operands[0])
                            op2 = format_number(q.operands[1])
                            # Determine operator from question.operator or infer from text field
                            if hasattr(q, 'operator') and q.operator:
                                operator = q.operator
                            elif text_field and "÷" in text_field:
                                operator = "÷"
                            elif text_field and "×" in text_field:
                                operator = "×"
                            else:
                                operator = "×"  # Default fallback
                            question_text = f"{op1} {operator} {op2} ="
                        else:
                            # Multiple operands
                            parts = [format_number(q.operands[0])]
                            for i in range(1, len(q.operands)):
                                op = q.operands[i]
                                operator = q.operators[i - 1] if hasattr(q, 'operators') and q.operators and len(q.operators) > i - 1 else "+"
                                parts.append(f"{operator} {format_number(op)}")
                            question_text = " ".join(parts) + " ="
                    
                    all_answers.append({
                        'number': answer_counter,
                        'question': question_text,
                        'answer': format_number(q.answer)
                    })
                    answer_counter += 1
        
        # Split into 3 columns - fill first column, then second, then third
        items_per_column = (len(all_answers) + 2) // 3  # Ceiling division
        column1 = all_answers[:items_per_column]
        column2 = all_answers[items_per_column:items_per_column * 2]
        column3 = all_answers[items_per_column * 2:]
        
        html += '<div class="answer-key-container">'
        # First column
        html += '<div class="answer-key-column">'
        for item in column1:
            html += f'<div class="answer-key-item">'
            html += f'<span class="answer-key-question">{item["number"]}. {item["question"]}</span>'
            html += f'<span class="answer-key-answer">{item["answer"]}</span>'
            html += '</div>'
        html += '</div>'
        # Second column
        html += '<div class="answer-key-column">'
        for item in column2:
            html += f'<div class="answer-key-item">'
            html += f'<span class="answer-key-question">{item["number"]}. {item["question"]}</span>'
            html += f'<span class="answer-key-answer">{item["answer"]}</span>'
            html += '</div>'
        html += '</div>'
        # Third column
        html += '<div class="answer-key-column">'
        for item in column3:
            html += f'<div class="answer-key-item">'
            html += f'<span class="answer-key-question">{item["number"]}. {item["question"]}</span>'
            html += f'<span class="answer-key-answer">{item["answer"]}</span>'
            html += '</div>'
        html += '</div>'
        html += '</div>'  # Close answer-key-container
    
    html += """
    </div>
    <script>
        // Add page numbers
        window.addEventListener('load', function() {
            const pages = document.querySelectorAll('.page');
            pages.forEach((page, index) => {
                const pageNum = document.createElement('div');
                pageNum.className = 'page-number';
                pageNum.textContent = 'Page ' + (index + 1);
                page.appendChild(pageNum);
            });
        });
    </script>
</body>
</html>"""
    
    return html

