"""
Playwright-based PDF Generator
Uses headless Chromium to generate pixel-perfect PDFs from HTML
This matches the preview exactly - no layout duplication!
"""
from playwright.async_api import async_playwright
from io import BytesIO
from typing import List
from schemas import PaperConfig, GeneratedBlock
from html_template import generate_html


async def generate_pdf_playwright(
    config: PaperConfig,
    generated_blocks: List[GeneratedBlock],
    with_answers: bool = False,
    answers_only: bool = False,
    include_separate_answer_key: bool = False
) -> BytesIO:
    """
    Generate PDF using Playwright (headless Chromium).
    
    This approach:
    - Uses the exact same HTML/CSS as the preview
    - Pixel-perfect output (what you see is what you get)
    - Full CSS support (grid, flex, fonts, borders)
    - Zero layout duplication
    - Scales from simple worksheets to complex reports
    
    Args:
        config: Paper configuration
        generated_blocks: List of generated question blocks
        with_answers: Whether to include answers in questions
        answers_only: Whether to generate only answer key
        include_separate_answer_key: Whether to include question paper + separate answer key page
    
    Returns:
        BytesIO object containing the PDF
    """
    # Generate HTML matching preview structure
    html_content = generate_html(config, generated_blocks, with_answers, answers_only, include_separate_answer_key)
    
    # Generate PDF using Playwright
    buffer = BytesIO()
    
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        
        try:
            # Create new page
            page = await browser.new_page()
            
            # Set content
            await page.set_content(html_content, wait_until="networkidle")
            
            # Wait for content to render
            await page.wait_for_timeout(500)
            
            # Generate PDF with header/footer for page numbers
            pdf_bytes = await page.pdf(
                format="A4",
                margin={
                    "top": "12mm",
                    "right": "12mm",
                    "bottom": "20mm",  # Extra space for page numbers
                    "left": "12mm"
                },
                print_background=True,
                prefer_css_page_size=True,
                display_header_footer=True,
                header_template='<div></div>',  # Empty header
                footer_template='<div style="font-size: 9pt; color: #666666; text-align: center; width: 100%; padding-top: 5mm; font-weight: bold;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
            )
            
            # Write to buffer
            buffer.write(pdf_bytes)
            buffer.seek(0)
            
        finally:
            await browser.close()
    
    return buffer

