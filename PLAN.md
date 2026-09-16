# CKR Decision Platform - Architecture Plan

## Overview

A platform wrapping the existing MCDM engine into a landing page + 9 distinct tools:
1 researcher tool (existing) + 8 business-specific tools with simplified UIs.

All tools share the same `/lib/methods/` engine. No accounts, no server persistence.
localStorage with a silent 41-minute TTL handles session continuity (never exposed to users).

---

## Route Structure

```
/                         Landing page (marketing/product page)
/researcher               Existing MCDM tool (Word export, full method control)
/supplier-evaluation      Supplier Evaluation Software
/vendor-selection         Vendor Selection Platform
/rfp-scoring              RFP Scoring Tool
/tender-evaluation        Tender Evaluation Software
/vendor-performance       Vendor Performance Management
/capex-approval           CAPEX Approval System
/project-prioritization   Project Prioritization
/investment-decision      Investment Decision Support
```

---

## Landing Page (`/`)

### Sections
1. **Hero** - Bold headline, subtext, two CTAs: "Researcher Tool" + "Business Tools"
2. **Tool Cards Grid** - 8 business tools + 1 researcher tool, each with:
   - Icon, title, one-liner description
   - "Launch Free Tool" button linking to its route
3. **How It Works** - 3-step: Define criteria -> Enter data -> Get report
4. **Trust Bar** - "50+ MCDM methods", "PDF/Word reports", "No sign-up", "Free forever"
5. **Footer** - Minimal, clean

### Design
- Professional, enterprise feel. Dark header section, white content.
- No animations beyond subtle fades. No gradients.
- Consistent with the slate/blue design system already in globals.css.

---

## Business Tool Architecture

### Shared Concept
Each business tool follows an identical flow with domain-specific language:

```
Step 1: Define [domain items]     (criteria + alternatives with domain labels)
Step 2: Rate / Score              (simplified matrix input)
Step 3: Generate Report           (runs ALL methods, produces PDF)
```

### Domain Mapping

| Tool                    | "Criteria" label     | "Alternatives" label | Example criteria presets               |
|-------------------------|----------------------|----------------------|----------------------------------------|
| Supplier Evaluation     | Evaluation Criteria  | Suppliers            | Price, Quality, Delivery, Reliability  |
| Vendor Selection        | Selection Criteria   | Vendors              | Cost, Capability, Experience, Support  |
| RFP Scoring             | Scoring Criteria     | Proposals            | Technical, Financial, Timeline, Risk   |
| Tender Evaluation       | Evaluation Criteria  | Tenders              | Price, Compliance, Capability, Track   |
| Vendor Performance      | KPIs                 | Vendors              | On-time delivery, Defect rate, Cost    |
| CAPEX Approval          | Decision Factors     | Projects             | ROI, Risk, Strategic fit, Payback      |
| Project Prioritization  | Priority Criteria    | Projects             | Impact, Feasibility, Urgency, Cost     |
| Investment Decision     | Investment Criteria  | Opportunities        | Return, Risk, Liquidity, Time horizon  |

### Simplified UI (vs Researcher Tool)

- NO method selection (user never sees "TOPSIS", "VIKOR", etc.)
- NO category selection (weighting/ranking/fuzzy)
- Preset criteria suggestions (user can edit/add/remove)
- Simple 1-10 importance scale for criteria (mapped to weights internally)
- Simple 1-10 performance scale for alternatives on each criterion
- Benefit/Cost toggle per criterion with domain-friendly labels ("Higher is better" / "Lower is better")
- One big "Generate Report" button

### Under the Hood

When user clicks "Generate Report":
1. Normalize the 1-10 inputs into a proper decision matrix
2. Run ALL applicable methods:
   - Weighting: AHP (equal weights from user input), CRITIC, ENTROPY, SD, MEREC, LOPCOW
   - Ranking: TOPSIS, VIKOR, SAW, WPM, WASPAS, EDAS, CODAS, CoCoSo, COPRAS, MARCOS,
              MABAC, MAIRCA, MOORA, MULTIMOORA, ARAS, OCRA, PIV, TODIM, ROV, GRA,
              PROMETHEE, WISP, MOOSRA, COBRA, MAUT
3. Aggregate results (average rank across all methods, consensus analysis)
4. Generate PDF with:
   - Title page with tool name, project name, date
   - Executive summary (top-ranked alternative, consensus level)
   - Input data table
   - Individual method results (table per method)
   - Aggregated ranking (average rank, rank frequency, Borda count)
   - Sensitivity analysis (what-if on weights)
   - Methodology appendix (brief description of each method used)

---

## PDF Export (Business Tools)

Use `jspdf` + `jspdf-autotable` for PDF generation (client-side).

Structure:
- Cover page
- Table of contents
- Executive summary with recommendation
- Section per method group with result tables
- Final aggregated comparison
- Appendix

---

## Data Persistence (Silent)

```typescript
// lib/storage.ts
const TTL = 41 * 60 * 1000; // 41 minutes

function save(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
}

function load(key: string): any | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const { data, ts } = JSON.parse(raw);
  if (Date.now() - ts > TTL) { localStorage.removeItem(key); return null; }
  return data;
}

// Cleanup runs on app mount - clears all expired entries
function cleanup() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('ckr_')) load(key); // load triggers expiry check
  }
}
```

Key format: `ckr_{toolSlug}_{field}` (e.g. `ckr_supplier-evaluation_state`)

---

## Shared Components

### New shared components needed:
- `BusinessToolShell` - Common layout for all 8 business tools (header, stepper, footer)
- `SimpleCriteriaInput` - 1-10 scale with labels instead of raw numbers
- `SimpleMatrixInput` - Performance rating grid (1-10 stars or slider)
- `ReportPreview` - Shows results before PDF download
- `PDFGenerator` - Builds the multi-method PDF report

### Reused from existing:
- All `/lib/methods/*` calculation engines (unchanged)
- `globals.css` design system
- `layout.tsx` fonts and metadata

---

## File Structure

```
app/
  page.tsx                          Landing page
  layout.tsx                        Root layout (existing, update metadata)
  globals.css                       Design system (existing)
  components/
    MCDMApp.tsx                     Researcher tool component (existing)
    LandingPage.tsx                 Landing page component
    BusinessTool.tsx                Shared business tool shell
    SimpleCriteriaInput.tsx         1-10 importance rating
    SimpleMatrixInput.tsx           Performance scoring grid
    ReportPreview.tsx               Results display before PDF
  researcher/
    page.tsx                        Researcher tool route
  supplier-evaluation/
    page.tsx                        Tool route (renders BusinessTool with config)
  vendor-selection/
    page.tsx
  rfp-scoring/
    page.tsx
  tender-evaluation/
    page.tsx
  vendor-performance/
    page.tsx
  capex-approval/
    page.tsx
  project-prioritization/
    page.tsx
  investment-decision/
    page.tsx
lib/
  methods.ts                        Method registry (existing)
  methods/
    weighting.ts                    (existing)
    ranking.ts                      (existing)
    fuzzy.ts                        (existing)
  export.ts                         Word export for researcher (existing)
  pdf-export.ts                     PDF export for business tools (NEW)
  storage.ts                        localStorage with TTL (NEW)
  tool-configs.ts                   Domain configs for all 8 tools (NEW)
  run-all-methods.ts                Orchestrator: runs all methods, aggregates (NEW)
```

---

## Build Order

### Phase 1: Foundation
1. Create `lib/storage.ts` (localStorage with 41min TTL)
2. Create `lib/tool-configs.ts` (all 8 tool domain configs)
3. Create `lib/run-all-methods.ts` (run all methods + aggregate)
4. Move existing MCDMApp to `/researcher` route

### Phase 2: Business Tool UI
5. Build `BusinessTool.tsx` (shared shell component)
6. Build `SimpleCriteriaInput.tsx`
7. Build `SimpleMatrixInput.tsx`
8. Build `ReportPreview.tsx`
9. Create all 8 tool route pages (thin wrappers around BusinessTool)

### Phase 3: PDF Export
10. Install `jspdf` + `jspdf-autotable`
11. Build `lib/pdf-export.ts`

### Phase 4: Landing Page
12. Build `LandingPage.tsx`
13. Update root `page.tsx` to render landing page
14. Update metadata/SEO

### Phase 5: Polish
15. Wire localStorage save/load into BusinessTool
16. Test all tool flows end-to-end
17. Responsive pass on all pages
