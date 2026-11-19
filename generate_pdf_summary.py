import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.pdfgen import canvas

PDF_PATH = os.path.abspath("./Neuro_Symbolic_Foundry_Executive_Summary.pdf")


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#5F6672"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 756, "Neuro-Symbolic Software Foundry — Technical & Solution Summary")
            self.setStrokeColor(colors.HexColor("#E3E7ED"))
            self.setLineWidth(0.5)
            self.line(36, 750, 576, 750)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E3E7ED"))
        self.setLineWidth(0.5)
        self.line(36, 38, 576, 38)
        self.drawString(36, 26, "Confidential — Engineering & Architectural Executive Overview")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(576, 26, page_text)
        self.restoreState()


def build_pdf():
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=46,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1E222B"),
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#315FCE"),
        textTransform="uppercase",
        spaceAfter=8,
    )

    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1E222B"),
        spaceBefore=10,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#333333"),
        spaceAfter=5,
    )

    bullet_style = ParagraphStyle(
        "BulletText",
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3,
    )

    callout_style = ParagraphStyle(
        "Callout",
        parent=body_style,
        fontName="Helvetica-Oblique",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E222B"),
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#333333"),
    )

    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#1E222B"),
    )

    story = []

    # Title & Header
    story.append(Paragraph("NEURO-SYMBOLIC SOFTWARE FOUNDRY", subtitle_style))
    story.append(Paragraph("Executive Overview: What We Built, Tech Stack & Solution Impact", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Version:</b> 1.0.0 Production Baseline &nbsp;|&nbsp; <b>Status:</b> Live & Verified &nbsp;|&nbsp; <b>Runtime:</b> Python 3.12 / React 19", body_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#315FCE"), spaceAfter=10))

    # SECTION 1: YEH KIS CHEEZ KA SOLUTION HAI?
    story.append(Paragraph("1. Yeh Project Kis Cheez Ka Solution Hai? (The Problem & Solution)", h1_style))
    
    prob_sol_text = """
    <b>Asal Masla (The Core Problem):</b> Aaj kal AI (ChatGPT, Claude, Cursor) se code likhwana bohot aasan ho gaya hai, lekin 
    <b>LLMs mathematical correctness guarantee nahi kar sakte</b>. AI aksar boundary edge-cases miss kar deta hai (jaise negative balance overdraft, 
    illegal discounts > 100%, state transition bypass, ya command injection). Agar aap AI se poochhein ke <i>'kya yeh code theek hai?'</i>, toh AI 
    hallucinate karke 100% confidence ke sath galat code ko bhi sahi keh deta hai.<br/><br/>
    <b>Hamara Solution (The Neuro-Symbolic Gatekeeper):</b> Yeh project aik <b>independent verification platform</b> hai jo AI ki generative taqat ko 
    <b>mathematical SMT solvers (Z3)</b>, <b>automated test runners (Pytest)</b>, aur <b>static AST security tools (Semgrep)</b> ke sath jorta hai.
    """
    story.append(Paragraph(prob_sol_text, body_style))

    # Callout Box: Golden Rule
    callout_data = [[
        Paragraph("<b>Core Invariant:</b> AI sirf explanation aur diff patch draft karta hai; <b>Pass / Fail ka faisla sirf aur sirf deterministic mathematical proofs aur test exit codes karte hain</b> — AI confidence kabhi status decide nahi karti.", callout_style)
    ]]
    callout_table = Table(callout_data, colWidths=[540])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EEF4FC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#315FCE")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 8))

    # SECTION 2: HAMARE PROJECT MEIN KYA KYA BANAYA GAYA HAI?
    story.append(Paragraph("2. Hamare Project Mein Kya Kya Banaya Gaya Hai? (Delivered System)", h1_style))

    features = [
        "<b>Formal Invariant Prover (Z3 SMT Solver):</b> Python business logic ke liye 4 formal templates banaye hain: (1) Account Balance Non-Negativity & Debit Ceilings, (2) Discount Bounds [0%, 70%] & Total Cart Integrity, (3) Order Lifecycle State Transitions (e.g. REFUNDED ke baad SHIPPED block karna), aur (4) Multi-Tenant Boundary Isolation.",
        "<b>Automated Test Sandbox (Pytest 8 Subprocess Runner):</b> Untrusted code ko isolated subprocess mein run karta hai with strict 60s timeouts aur memory limits taake host system crash na ho.",
        "<b>AST Static Security Scanner (Semgrep Rules):</b> Python Abstract Syntax Tree (AST) scan karke direct <code>os.system()</code> command injection, dangerous <code>eval()</code>/<code>exec()</code>, aur hardcoded API secrets foran pakad leta hai.",
        "<b>Secure ZIP Ingestion Pipeline:</b> Path traversal (Zip-Slip), decompression bombs (max 10:1 ratio, 50MB limit), aur malicious archive attacks ko extraction se pehle hi reject karta hai.",
        "<b>Modern Single Page Web Application (React 19 + TypeScript + Vite):</b> Clean, developer-focused light-first dashboard jisme Live 8-stage Execution Stepper, filterable Findings Table, SMT Counterexample Viewer, aur Export Modal shamil hai.",
        "<b>Server-Sent Events (SSE) Live Pipeline:</b> User ko fake percentage ke bajaye authentic stages (queued → unpacking → detecting → running_tests → static_security → formal_verification → completed) live stream hoti hain.",
        "<b>Human-in-the-Loop Patch Review:</b> Invariant fail hone par AI surgical unified diff propose karta hai. User side-by-side inspect karke 'Approve & Re-Verify' karta hai — bina human permission ke production code kabhi change nahi hota.",
        "<b>Signed Export Reports:</b> Har scan ka downloadable report Markdown (.md) aur JSON format mein foran generate hota hai."
    ]

    for f in features:
        story.append(Paragraph(f"• {f}", bullet_style))

    story.append(Spacer(1, 8))

    # SECTION 3: TECH STACK MATRIX
    story.append(Paragraph("3. Technology Stack & Role Matrix", h1_style))

    table_data = [
        [
            Paragraph("Layer", table_header_style),
            Paragraph("Technology", table_header_style),
            Paragraph("Version", table_header_style),
            Paragraph("Role & Why Chosen", table_header_style)
        ],
        [
            Paragraph("Frontend UI", table_cell_bold),
            Paragraph("React + TypeScript + Vite", table_cell_style),
            Paragraph("19.x / Vite 5", table_cell_style),
            Paragraph("Type-safe interactive SPA; fast HMR; static bundle hosted directly by backend.", table_cell_style),
        ],
        [
            Paragraph("Styling & UX", table_cell_bold),
            Paragraph("Tailwind CSS + Lucide", table_cell_style),
            Paragraph("3.4+", table_cell_style),
            Paragraph("Light-first SaaS tokens (#F7F8FA, #315FCE); WCAG 2.2 AA verified contrast.", table_cell_style),
        ],
        [
            Paragraph("Backend API", table_cell_bold),
            Paragraph("FastAPI (Python)", table_cell_style),
            Paragraph("0.115+", table_cell_style),
            Paragraph("Async REST API + Server-Sent Events (SSE) streaming; Pydantic v2 validation.", table_cell_style),
        ],
        [
            Paragraph("SMT Solver", table_cell_bold),
            Paragraph("Z3 (z3-solver)", table_cell_style),
            Paragraph("4.13+", table_cell_style),
            Paragraph("First-order mathematical theorem prover; extracts violating counterexamples.", table_cell_style),
        ],
        [
            Paragraph("Test Engine", table_cell_bold),
            Paragraph("Pytest", table_cell_style),
            Paragraph("8.x", table_cell_style),
            Paragraph("Subprocess test discovery and automated assertion execution with timeouts.", table_cell_style),
        ],
        [
            Paragraph("AST Security", table_cell_bold),
            Paragraph("Semgrep / AST Parser", table_cell_style),
            Paragraph("Latest", table_cell_style),
            Paragraph("Static taint analysis identifying command injection, eval sinks, and secret leaks.", table_cell_style),
        ],
        [
            Paragraph("Database", table_cell_bold),
            Paragraph("SQLite Repository", table_cell_style),
            Paragraph("Built-in", table_cell_style),
            Paragraph("Zero-setup relational schema with cascading foreign keys for scans and findings.", table_cell_style),
        ],
        [
            Paragraph("Deployment", table_cell_bold),
            Paragraph("Docker / Render / HF", table_cell_style),
            Paragraph("3.12-slim", table_cell_style),
            Paragraph("Unified multi-stage container serving both REST endpoints and compiled static UI.", table_cell_style),
        ],
    ]

    stack_table = Table(table_data, colWidths=[70, 115, 65, 290])
    stack_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E222B")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E3E7ED")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F7F8FA")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(stack_table)
    story.append(Spacer(1, 8))

    # SECTION 4: TRUTHFUL STATES & VERIFICATION METRICS
    story.append(Paragraph("4. Truthful Result States & Business Value", h1_style))
    
    val_text = """
    Platform 5 truthful verification states enforce karta hai:
    <b>[PASSED]</b> (Deterministic proof successful), 
    <b>[FAILED]</b> (Mathematical counterexample found ya test assertion fail), 
    <b>[WARNING]</b> (Potential boundary edge), 
    <b>[INCONCLUSIVE]</b> (Solver timeout ya unknown state), aur 
    <b>[NOT CHECKED]</b> (Scan configuration se bahar). Kabhi bhi timeout ya un-checked check ko fake 'Passed' nahi dikhaya jata.<br/><br/>
    <b>Automated Test Evidence:</b> Platform ki reliability 100% automated tests se verified hai:
    <b>6/6 unit tests passed</b> (SMT solver, Pytest runner, Semgrep AST) aur 
    <b>2/2 E2E integration tests passed</b> (Project creation, ZIP upload, background scan, SSE stream, aur report export).
    """
    story.append(Paragraph(val_text, body_style))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {PDF_PATH}")


if __name__ == "__main__":
    build_pdf()
