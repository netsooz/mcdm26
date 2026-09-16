'use client';

import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { METHODS, type MethodCategory, type MethodInfo, needsAlternatives } from '@/lib/methods';
import { WeightingMethods } from '@/lib/methods/weighting';
import { RankingMethods, type RankingInput } from '@/lib/methods/ranking';
import { FuzzyMethods, type FuzzyInput } from '@/lib/methods/fuzzy';
import DownloadGate from './DownloadGate';
import SessionMenu from './SessionMenu';
import { competitionRanks } from '../../lib/methods/ranking';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppState {
  projectName: string;
  category: MethodCategory;
  method: string;
  criteriaCount: number;
  altCount: number;
  criteriaNames: string[];
  alternativeNames: string[];
  criteriaTypes: string[];
  weights: number[] | null;
  results: any;
  inputData: any;
  step: 'welcome' | 'input' | 'results';
}

const INITIAL: AppState = {
  projectName: '', category: 'weighting', method: 'AHP',
  criteriaCount: 3, altCount: 4, criteriaNames: [], alternativeNames: [],
  criteriaTypes: [], weights: null, results: null, inputData: null, step: 'welcome',
};

// ─── Icons (inline SVG) ─────────────────────────────────────────────────────

const Icons = {
  menu: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M2 4.5h14M2 9h14M2 13.5h14"/></svg>,
  plus: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v10M3 8h10"/></svg>,
  minus: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 8h10"/></svg>,
  arrow: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l7-5-7-5"/></svg>,
  back: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4L5 8l6 4"/></svg>,
  check: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.5L5.5 10.5 11.5 4"/></svg>,
  download: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v9M4 8l4 4 4-4M2 13h12"/></svg>,
  search: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>,
  chevDown: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5l4 4 4-4"/></svg>,
  close: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>,
  weight: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2L2 8l7 8 7-8z"/><circle cx="9" cy="8" r="2"/></svg>,
  rank: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 14h3V7H3zM8 14h3V4H8zM13 14h3v-4h-3z"/></svg>,
  fuzzy: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="9" cy="9" r="6" strokeDasharray="3 2"/><circle cx="9" cy="9" r="2.5"/></svg>,
  print: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2h8v4M4 12h8v4H4zM2 6h12v6H2z"/></svg>,
  forward: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>,
  info: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M7 5v0M7 7v3"/></svg>,
};

const CATEGORY_META: Record<MethodCategory, { icon: ReactNode; label: string; desc: string; color: string; bg: string }> = {
  weighting: { icon: Icons.weight, label: 'Criteria Weighting', desc: 'Determine how important each criterion is', color: 'text-primary', bg: 'bg-surface border-border hover:border-slate-300' },
  ranking: { icon: Icons.rank, label: 'Ranking / Selection', desc: 'Rank alternatives using weighted criteria', color: 'text-primary', bg: 'bg-surface border-border hover:border-slate-300' },
  fuzzy: { icon: Icons.fuzzy, label: 'Fuzzy Methods', desc: 'Handle uncertainty with fuzzy numbers', color: 'text-primary', bg: 'bg-surface border-border hover:border-slate-300' },
};

// ─── Toast ───────────────────────────────────────────────────────────────────

function useToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: string }[]>([]);
  const idRef = useRef(0);
  const show = useCallback((msg: string, type = 'info') => {
    const id = ++idRef.current;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseAHP(str: string): number | null {
  const s = str.trim();
  if (!s) return null;
  if (s.includes('/')) { const [n, d] = s.split('/').map(Number); return d ? n / d : null; }
  const v = parseFloat(s); return isNaN(v) ? null : v;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MCDMApp() {
  const [state, setState] = useState<AppState>(INITIAL);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showExportGate, setShowExportGate] = useState(false);
  const { toasts, show: toast } = useToast();

  // Sidebar form
  const [formName, setFormName] = useState('');
  const [formCat, setFormCat] = useState<MethodCategory>('weighting');
  const [formMethod, setFormMethod] = useState('AHP');
  const [formCriteria, setFormCriteria] = useState(3);
  const [formAlts, setFormAlts] = useState(4);

  const methodInfo = METHODS[state.category]?.[state.method];
  const showAlts = needsAlternatives(formCat, formMethod);

  function openSidebar(cat?: MethodCategory) {
    if (cat) { setFormCat(cat); setFormMethod(Object.keys(METHODS[cat])[0]); }
    setSidebarOpen(true);
  }
  function closeSidebar() { setSidebarOpen(false); }

  function onCategoryChange(cat: MethodCategory) {
    setFormCat(cat);
    setFormMethod(Object.keys(METHODS[cat])[0]);
  }

  function onCreate() {
    if (!formName.trim()) { toast('Project name is required', 'error'); return; }
    const nC = Math.max(2, Math.min(20, formCriteria));
    const nA = Math.max(2, Math.min(30, formAlts));
    setState({
      projectName: formName.trim(), category: formCat, method: formMethod,
      criteriaCount: nC, altCount: nA,
      criteriaNames: Array.from({ length: nC }, (_, i) => `C${i + 1}`),
      alternativeNames: Array.from({ length: nA }, (_, i) => `A${i + 1}`),
      criteriaTypes: Array.from({ length: nC }, () => 'benefit'),
      weights: null, results: null, inputData: null, step: 'input',
    });
    closeSidebar();
    toast('Analysis created', 'success');
  }

  function onCalculate(inputData: any) {
    try {
      let results: any;
      if (state.category === 'weighting') results = calcWeighting(state.method, inputData);
      else if (state.category === 'ranking') results = calcRanking(state.method, inputData);
      else results = calcFuzzy(state.method, inputData);
      setState(s => ({ ...s, inputData, results, weights: results.weights || s.weights, step: 'results' }));
      toast('Calculation completed!', 'success');
    } catch (err: any) { toast(err.message || 'Calculation error', 'error'); }
  }

  function onProceed(rankMethod: string, nAlts: number) {
    setState(s => ({
      ...s, category: 'ranking', method: rankMethod, altCount: nAlts,
      alternativeNames: Array.from({ length: nAlts }, (_, i) => `A${i + 1}`),
      results: null, inputData: null, step: 'input',
    }));
    toast('Weights applied. Enter the decision matrix.', 'info');
  }

  function onExport() {
    setShowExportGate(true);
  }

  async function doExport() {
    try {
      const { exportToWord } = await import('@/lib/export');
      await exportToWord({
        projectName: state.projectName, methodName: state.method, methodCategory: state.category,
        criteriaNames: state.criteriaNames, alternativeNames: state.alternativeNames,
        inputData: state.inputData, weights: state.weights || state.results?.weights || null,
        results: state.results, timestamp: new Date(),
      });
      toast('Word document exported!', 'success');
    } catch (err: any) { toast(err.message || 'Export error', 'error'); }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* ── Header ── */}
      <header className="no-print fixed top-0 inset-x-0 z-50 h-14 bg-primary-dark flex items-center px-5 shadow-sm">
        <button onClick={() => openSidebar()} className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 mr-3 transition-all active:scale-95" aria-label="New analysis">
          {Icons.menu}
        </button>
        <a href="/" className="text-white font-bold text-base tracking-wide select-none hover:text-white/80 transition-colors">MCDM Decision Tool</a>
        <div className="ml-auto flex items-center gap-4 text-sm">
          {state.step !== 'welcome' && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-white/50">{state.projectName}</span>
              <span className="text-white/30">/</span>
              <span className="bg-white/15 text-white px-2.5 py-0.5 rounded-md text-xs font-bold">{state.method}</span>
            </div>
          )}
          <SessionMenu tone="dark" />
        </div>
      </header>

      {/* ── Sidebar Overlay ── */}
      {sidebarOpen && <div className="no-print fixed inset-0 bg-black/40 z-[60] animate-fade-in-fast" onClick={closeSidebar} />}

      {/* ── Sidebar ── */}
      <aside className={`no-print fixed top-0 left-0 h-full w-[400px] max-w-[90vw] bg-white z-[70] shadow-2xl shadow-black/20 transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-primary">New Analysis</h2>
          <button onClick={closeSidebar} className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-surface transition-colors">{Icons.close}</button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scroll px-6 py-6 space-y-7">
          {/* Project Name */}
          <FormField label="Project Name *" icon={<span className="text-slate-500">&#9997;</span>}>
            <input className="form-input" placeholder="e.g. Supplier Selection 2024" value={formName} onChange={e => setFormName(e.target.value)} required />
          </FormField>

          {/* Category Cards */}
          <FormField label="Category" icon={<span className="text-slate-500">&#9881;</span>}>
            <div className="grid gap-2">
              {(Object.entries(CATEGORY_META) as [MethodCategory, typeof CATEGORY_META.weighting][]).map(([key, meta]) => (
                <button key={key} onClick={() => onCategoryChange(key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all duration-200 cursor-pointer ${formCat === key ? `${meta.bg} border-accent ${meta.color}` : 'bg-white border-border hover:border-slate-300'}`}>
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${formCat === key ? meta.color : 'text-gray-400'} ${formCat === key ? 'bg-white shadow-sm' : 'bg-surface'}`}>{meta.icon}</span>
                  <div>
                    <div className={`text-sm font-semibold ${formCat === key ? meta.color : 'text-gray-700'}`}>{meta.label}</div>
                    <div className="text-[11px] text-muted leading-tight">{meta.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </FormField>

          {/* Method Dropdown */}
          <FormField label="Method" icon={<span className="text-slate-500">&#9878;</span>}>
            <SearchableSelect
              value={formMethod}
              onChange={setFormMethod}
              options={Object.entries(METHODS[formCat]).map(([k, v]) => ({ value: k, label: k, desc: v.fullName }))}
              placeholder="Search methods..."
            />
          </FormField>

          {/* Criteria Count */}
          <FormField label="Number of Criteria" icon={<span className="text-slate-500">&#9635;</span>}>
            <StepperInput value={formCriteria} onChange={setFormCriteria} min={2} max={20} />
          </FormField>

          {/* Alternatives Count */}
          {showAlts && (
            <FormField label="Number of Alternatives" icon={<span className="text-slate-500">&#9632;</span>}>
              <StepperInput value={formAlts} onChange={setFormAlts} min={2} max={30} />
            </FormField>
          )}
        </div>

        {/* Create Button */}
        <div className="px-6 py-4 border-t border-border bg-surface">
          <button onClick={onCreate} className="btn btn-primary w-full btn-lg">
            {Icons.plus} Create Analysis
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 mt-14 px-4 sm:px-6 py-6 max-w-[1440px] mx-auto w-full">
        {state.step === 'welcome' && <WelcomeScreen onStart={openSidebar} />}
        {state.step === 'input' && <InputView state={state} setState={setState} onCalculate={onCalculate} methodInfo={methodInfo} />}
        {state.step === 'results' && <ResultsView state={state} onBack={() => setState(s => ({ ...s, step: 'input' }))} onExport={onExport} onProceed={onProceed} />}
      </main>

      {/* ── Toasts ── */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto animate-slide-in px-5 py-3 rounded-lg text-white text-sm font-medium shadow-lg flex items-center gap-2 ${t.type === 'success' ? 'bg-accent' : t.type === 'error' ? 'bg-danger' : 'bg-primary'}`}>
            {t.type === 'success' ? Icons.check : t.type === 'error' ? Icons.close : Icons.info}
            {t.msg}
          </div>
        ))}
      </div>

      {showExportGate && (
        <DownloadGate
          profileType="researcher"
          onAuthorized={() => { setShowExportGate(false); doExport(); }}
          onClose={() => setShowExportGate(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  REUSABLE UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function FormField({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function StepperInput({ value, onChange, min, max }: { value: number; onChange: (n: number) => void; min: number; max: number }) {
  return (
    <div className="flex items-center gap-0.5">
      <button onClick={() => onChange(Math.max(min, value - 1))} className="w-10 h-10 border border-border rounded-l-lg bg-white hover:bg-surface hover:border-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer" aria-label="Decrease">
        {Icons.minus}
      </button>
      <input type="number" value={value} onChange={e => onChange(Math.max(min, Math.min(max, +e.target.value || min)))} className="w-14 h-10 border-y border-border text-center text-sm font-bold text-primary bg-white focus:outline-none focus:border-accent" />
      <button onClick={() => onChange(Math.min(max, value + 1))} className="w-10 h-10 border border-border rounded-r-lg bg-white hover:bg-surface hover:border-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer" aria-label="Increase">
        {Icons.plus}
      </button>
      <span className="ml-3 text-xs text-muted">{min}&ndash;{max}</span>
    </div>
  );
}

// ── Custom Searchable Select ─────────────────────────────────────────────────

function SearchableSelect({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; desc: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || o.desc.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open) { setQuery(''); inputRef.current?.focus(); }
  }, [open]);

  function onSelect(v: string) {
    onChange(v);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button onClick={() => setOpen(!open)} className="form-input flex items-center justify-between gap-2 cursor-pointer text-left">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-bold text-primary shrink-0">{selected?.label}</span>
          <span className="text-muted text-xs truncate">{selected?.desc}</span>
        </div>
        <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>{Icons.chevDown}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="dropdown-menu max-h-[300px] flex flex-col">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface sticky top-0">
            <span className="text-gray-400">{Icons.search}</span>
            <input ref={inputRef} type="text" className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-300" placeholder={placeholder} value={query} onChange={e => setQuery(e.target.value)} />
            {query && <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">{Icons.close}</button>}
          </div>
          {/* Options */}
          <div className="overflow-y-auto custom-scroll flex-1">
            {filtered.length === 0 && <div className="px-4 py-3 text-sm text-muted">No methods found</div>}
            {filtered.map(o => (
              <div key={o.value} onClick={() => onSelect(o.value)} className={`dropdown-item ${o.value === value ? 'active' : ''}`}>
                <span className="method-abbr">{o.label}</span>
                <span className="method-full">{o.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Layout helpers ───────────────────────────────────────────────────────────

function Tag({ children, color }: { children: ReactNode; color: string }) {
  return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-white ${color}`}>{children}</span>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-bold text-primary mt-8 mb-3 flex items-center gap-2 first:mt-0"><span className="w-1 h-5 bg-accent rounded-full" />{children}</h3>;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-lg border border-border shadow-sm p-6 sm:p-8 ${className}`}>{children}</div>;
}

function InfoBox({ children, type = 'info' }: { children: ReactNode; type?: 'info' | 'warning' | 'success' }) {
  const s = { info: 'bg-surface border-l-4 border-accent text-primary', warning: 'bg-amber-50/50 border-l-4 border-amber-400 text-amber-900', success: 'bg-surface border-l-4 border-accent text-primary' };
  const icons = { info: Icons.info, warning: '!', success: Icons.check };
  return <div className={`${s[type]} px-4 py-3 rounded-r-lg text-sm mb-4 flex items-start gap-2`}><span className="mt-0.5 shrink-0">{icons[type]}</span><div>{children}</div></div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WELCOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

function WelcomeScreen({ onStart }: { onStart: (cat?: MethodCategory) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center animate-fade-in">
      {/* Hero */}
      <div className="mb-8">
        <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-2xl mx-auto mb-5">&#9878;</div>
        <h1 className="text-3xl font-bold text-primary mb-3 tracking-tight">MCDM Decision Tool</h1>
        <p className="text-muted max-w-md mx-auto text-base leading-relaxed">Analyse decisions with 50+ multi-criteria methods. Weigh criteria, rank alternatives, and export publication-ready reports.</p>
      </div>

      {/* CTA */}
      <button onClick={() => onStart()} className="btn btn-primary btn-lg text-base mb-12">
        {Icons.plus} Start New Analysis
      </button>

      {/* Feature cards */}
      <div className="grid sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {(Object.entries(CATEGORY_META) as [MethodCategory, typeof CATEGORY_META.weighting][]).map(([key, m]) => (
          <button key={key} onClick={() => onStart(key)} className={`group text-left p-5 rounded-lg border transition-all duration-200 cursor-pointer ${m.bg} hover:shadow-sm`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.color} bg-white shadow-sm mb-3 group-hover:scale-110 transition-transform`}>{m.icon}</div>
            <div className={`font-bold text-sm mb-1 ${m.color}`}>{m.label}</div>
            <div className="text-xs text-muted leading-relaxed">{m.desc}</div>
            <div className="text-xs text-muted mt-2 font-semibold">{Object.keys(METHODS[key]).length} methods</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STEPPER
// ═══════════════════════════════════════════════════════════════════════════════

function Stepper({ current }: { current: number }) {
  const steps = ['Setup', 'Input Data', 'Calculate', 'Results'];
  return (
    <div className="flex items-center mb-8 px-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${i < current ? 'bg-accent text-white' : i === current ? 'bg-accent text-white ring-4 ring-accent/15' : 'bg-surface text-gray-400 border border-border'}`}>
              {i < current ? Icons.check : i + 1}
            </div>
            <span className={`text-xs font-semibold hidden sm:inline ${i === current ? 'text-primary' : i < current ? 'text-accent' : 'text-gray-300'}`}>{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`w-6 sm:w-12 h-0.5 mx-1.5 sm:mx-3 rounded-full transition-colors ${i < current ? 'bg-accent' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INPUT VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function InputSection({ step, title, subtitle, children, last }: { step: number; title: string; subtitle?: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={`relative ${last ? '' : 'pb-8'}`}>
      {/* Connector line */}
      {!last && <div className="absolute left-[19px] top-11 bottom-0 w-px bg-border" />}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-sm z-10">{step}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-primary leading-none">{title}</h3>
          {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function InputView({ state, setState, onCalculate, methodInfo }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onCalculate: (data: any) => void; methodInfo: MethodInfo | undefined;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const isWeighting = state.category === 'weighting';
  const input = methodInfo?.input;
  const showAlts = needsAlternatives(state.category, state.method);
  const showTypes = input === 'decision_matrix_with_types' || state.category === 'ranking' || state.category === 'fuzzy';

  function updateCriteriaName(i: number, name: string) { setState(s => { const n = [...s.criteriaNames]; n[i] = name || `C${i+1}`; return { ...s, criteriaNames: n }; }); }
  function updateAltName(i: number, name: string) { setState(s => { const n = [...s.alternativeNames]; n[i] = name || `A${i+1}`; return { ...s, alternativeNames: n }; }); }
  function updateCriteriaType(i: number, type: string) { setState(s => { const t = [...s.criteriaTypes]; t[i] = type; return { ...s, criteriaTypes: t }; }); }

  function handleCalculate() {
    const data = collectInput(formRef.current!, state);
    onCalculate(data);
  }

  // Build numbered steps dynamically based on what the method needs
  let stepNum = 0;
  const hasParams = !!methodInfo?.params;
  const hasMethodInput = isWeighting || state.category === 'ranking' || state.category === 'fuzzy';

  return (
    <div className="animate-fade-in">
      <Stepper current={1} />

      {/* Header bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <Tag color="bg-primary">{state.method}</Tag>
          <span className="text-sm font-semibold text-primary">{methodInfo?.fullName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="bg-surface px-2.5 py-1 rounded-lg border border-border font-semibold">{state.criteriaCount} criteria</span>
          {showAlts && <span className="bg-surface px-2.5 py-1 rounded-lg border border-border font-semibold">{state.altCount} alternatives</span>}
        </div>
      </div>

      {methodInfo?.desc && <InfoBox>{methodInfo.desc}</InfoBox>}

      <div ref={formRef} className="space-y-0">

        {/* ── Step: Define Criteria ── */}
        <InputSection step={++stepNum} title="Define Criteria" subtitle={showTypes ? 'Name each criterion and set whether higher values are better (benefit) or worse (cost).' : 'Name each criterion to be evaluated.'}>
          <div className="space-y-2">
            {state.criteriaNames.map((n, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-border hover:border-slate-300 transition-colors group">
                <span className="text-xs font-bold text-muted w-7 text-center tabular-nums">C{i + 1}</span>
                <input className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-gray-300 min-w-0" defaultValue={n} onBlur={e => updateCriteriaName(i, e.target.value)} placeholder={`Criterion ${i + 1}`} />
                {showTypes && <CriteriaTypeToggle value={state.criteriaTypes[i]} onChange={v => updateCriteriaType(i, v)} />}
              </div>
            ))}
          </div>
        </InputSection>

        {/* ── Step: Define Alternatives ── */}
        {showAlts && (
          <InputSection step={++stepNum} title="Define Alternatives" subtitle="Name each option being evaluated.">
            <div className="grid grid-cols-2 gap-2">
              {state.alternativeNames.map((n, i) => (
                <div key={i} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-border hover:border-slate-300 transition-colors">
                  <span className="text-xs font-bold text-muted w-7 text-center tabular-nums">A{i + 1}</span>
                  <input className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-gray-300 min-w-0" defaultValue={n} onBlur={e => updateAltName(i, e.target.value)} placeholder={`Alternative ${i + 1}`} />
                </div>
              ))}
            </div>
          </InputSection>
        )}

        {/* ── Step: Criteria Weights (for ranking methods that need pre-set weights) ── */}
        {state.category === 'ranking' && (
          <InputSection step={++stepNum} title="Criteria Weights" subtitle="Enter relative importance of each criterion. Values are auto-normalized to sum to 1.">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {state.criteriaNames.map((n, i) => (
                <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-4 py-2.5 border border-border hover:border-slate-300 transition">
                  <span className="text-xs font-bold text-muted truncate max-w-[80px]">{n}</span>
                  <input type="number" step="any" min="0" className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-center focus:outline-none weight-input" data-wi={i} defaultValue={(state.weights?.[i] ?? 1 / state.criteriaCount).toFixed(4)} />
                </div>
              ))}
            </div>
          </InputSection>
        )}

        {/* ── Step: Parameters ── */}
        {hasParams && (
          <InputSection step={++stepNum} title="Method Parameters" subtitle="Adjust algorithm-specific settings if needed.">
            <div className="flex flex-wrap gap-3">
              {Object.entries(methodInfo!.params!).map(([k, p]) => (
                <div key={k} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-border">
                  <span className="text-sm font-medium text-primary">{p.label}</span>
                  <input type="number" step="0.01" min={p.min} max={p.max} className="w-20 bg-surface border border-border rounded-lg px-2 py-1 text-sm text-center font-bold text-primary focus:outline-none focus:border-accent method-param" data-param={k} defaultValue={p.default} />
                </div>
              ))}
            </div>
          </InputSection>
        )}

        {/* ── Step: Data Entry (method-specific) ── */}
        {hasMethodInput && (
          <InputSection step={++stepNum} title="Enter Data" subtitle={
            input === 'pairwise' ? 'Compare each pair of criteria using the Saaty 1–9 scale.' :
            input === 'bwm' ? 'Select best & worst criteria, then rate all criteria relative to each.' :
            input === 'fucom' ? 'Rank criteria by importance, then set consecutive comparison ratios.' :
            input === 'stepwise' ? 'Set relative importance compared to the previous criterion.' :
            input === 'direct_influence' ? 'Rate the direct influence of each criterion on every other.' :
            input === 'pairwise_macbeth' ? 'Set attractiveness differences between each pair (0–6).' :
            state.category === 'fuzzy' ? 'Enter fuzzy weights and fuzzy performance values.' :
            'Enter performance values for each alternative on each criterion.'
          } last>
            {isWeighting && input === 'pairwise' && <AHPMatrix state={state} />}
            {isWeighting && input === 'pairwise_macbeth' && <PairwiseMatrix state={state} type="macbeth" />}
            {isWeighting && input === 'bwm' && <BWMInput state={state} />}
            {isWeighting && input === 'fucom' && <FucomInput state={state} />}
            {isWeighting && input === 'stepwise' && <StepwiseInput state={state} />}
            {isWeighting && input === 'direct_influence' && <PairwiseMatrix state={state} type="dematel" />}
            {(input === 'decision_matrix_only' || input === 'decision_matrix_with_types' || state.category === 'ranking') && <DecisionMatrix state={state} />}
            {state.category === 'fuzzy' && <FuzzyMatrixInput state={state} />}
          </InputSection>
        )}
      </div>

      {/* ── Sticky Calculate Bar ── */}
      <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 mt-8">
        <div className="bg-white/90 backdrop-blur-sm border-t border-border px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-muted hidden sm:block">Review your inputs above, then calculate.</span>
          <button onClick={handleCalculate} className="btn btn-primary btn-lg ml-auto">
            {Icons.arrow}
            {isWeighting ? 'Calculate Weights' : 'Calculate Rankings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Criteria Type Toggle ─────────────────────────────────────────────────────

function CriteriaTypeToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-full bg-white border border-border overflow-hidden">
      <button onClick={() => onChange('benefit')} className={`px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${value === 'benefit' ? 'bg-accent text-white' : 'text-gray-400 hover:text-gray-600'}`}>
        + Benefit
      </button>
      <button onClick={() => onChange('cost')} className={`px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${value === 'cost' ? 'bg-danger text-white' : 'text-gray-400 hover:text-gray-600'}`}>
        &minus; Cost
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MATRIX INPUT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function MatrixHeader({ names, label = 'Criteria', minCellWidth }: { names: string[]; label?: string; minCellWidth?: number }) {
  return (
    <thead><tr>
      <th className="bg-primary-dark text-white px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider sticky left-0 z-10 rounded-tl-lg">{label}</th>
      {names.map((n, i) => <th key={i} className={`bg-primary text-white px-4 py-3 font-semibold text-xs text-center whitespace-nowrap ${i === names.length - 1 ? 'rounded-tr-lg' : ''}`} style={minCellWidth ? { minWidth: minCellWidth } : undefined}>{n}</th>)}
    </tr></thead>
  );
}

// Saaty scale: 17 discrete values
const SAATY_SCALE = [1/9, 1/8, 1/7, 1/6, 1/5, 1/4, 1/3, 1/2, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SAATY_LABELS = ['1/9','1/8','1/7','1/6','1/5','1/4','1/3','1/2','1','2','3','4','5','6','7','8','9'];
const SAATY_DEFAULT_IDX = 8; // index of "1"

function saatLabel(val: number): string {
  const idx = SAATY_SCALE.findIndex(v => Math.abs(v - val) < 0.001);
  return idx >= 0 ? SAATY_LABELS[idx] : val.toFixed(3);
}

// Parses typed text like "1/3" or "5" into a numeric value
function parseSaatyInput(text: string): number | null {
  const t = text.trim();
  const fracMatch = t.match(/^1\/(\d)$/);
  if (fracMatch) { const d = +fracMatch[1]; return d >= 1 && d <= 9 ? 1 / d : null; }
  const n = +t;
  return !isNaN(n) && n > 0 ? n : null;
}

/** A typeable cell that shows a scale picker on hover. Uses fixed positioning so it's never clipped by overflow containers. */
function ScaleCell({ scale, labels, defaultLabel, cellClass, dataAttrs, onValueChange }: {
  scale: number[]; labels: string[]; defaultLabel: string; cellClass: string;
  dataAttrs: Record<string, string | number>;
  onValueChange?: (val: number) => void;
}) {
  const [text, setText] = useState(defaultLabel);
  const [showPicker, setShowPicker] = useState(false);
  const [focused, setFocused] = useState(false);
  const pickerVisible = showPicker || focused;
  const inputRef = useRef<HTMLInputElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number; arrowLeft: number; above: boolean } | null>(null);

  const numericVal = (() => {
    const idx = labels.indexOf(text);
    return idx >= 0 ? scale[idx] : (+text || 0);
  })();

  function updatePickerPos() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const pickerW = scale.length * 28 + 8;
    const cellCenter = rect.left + rect.width / 2;
    let left = cellCenter - pickerW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - pickerW - 8));
    const arrowLeft = cellCenter - left;
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < 48;
    const top = above ? rect.top - 38 : rect.bottom;
    setPickerPos({ top, left, arrowLeft, above });
  }

  function selectValue(val: number, label: string) {
    setText(label);
    onValueChange?.(val);
    inputRef.current?.focus();
  }

  function handleBlur() {
    setFocused(false);
    const parsed = parseSaatyInput(text);
    if (parsed !== null) {
      const idx = scale.findIndex(v => Math.abs(v - parsed) < 0.001);
      if (idx >= 0) { setText(labels[idx]); onValueChange?.(scale[idx]); }
      else { onValueChange?.(parsed); }
    } else { setText(defaultLabel); onValueChange?.(scale[labels.indexOf(defaultLabel)]); }
  }

  function onEnter() { clearTimeout(hideTimeout.current); setShowPicker(true); updatePickerPos(); }
  function onLeave() { hideTimeout.current = setTimeout(() => setShowPicker(false), 80); }

  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onFocus={() => { setFocused(true); updatePickerPos(); }}
        onBlur={handleBlur}
        className={`cell-input font-semibold ${pickerVisible ? 'border-accent bg-white ring-1 ring-accent/20' : ''} ${cellClass}`}
        data-value={numericVal}
        {...Object.fromEntries(Object.entries(dataAttrs).map(([k, v]) => [`data-${k}`, v]))}
      />
      {pickerVisible && pickerPos && (
        <div
          className="fixed z-[100] bg-white border border-accent/30 rounded-lg shadow-lg p-1 flex gap-px scale-picker"
          style={{ top: pickerPos.top, left: pickerPos.left }}
          onMouseEnter={onEnter} onMouseLeave={onLeave}>
          {/* Arrow connecting picker to cell */}
          <span className={`absolute ${pickerPos.above ? 'bottom-[-5px] border-t-white border-b-transparent' : 'top-[-5px] border-b-white border-t-transparent'} border-l-transparent border-r-transparent w-0 h-0`}
            style={{ left: pickerPos.arrowLeft - 5, borderWidth: 5, borderStyle: 'solid', ...(pickerPos.above ? { borderTopColor: 'white' } : { borderBottomColor: 'white' }) }} />
          <span className={`absolute ${pickerPos.above ? 'bottom-[-6px] border-t-[#e2e8f0] border-b-transparent' : 'top-[-6px] border-b-[#e2e8f0] border-t-transparent'} border-l-transparent border-r-transparent w-0 h-0 -z-10`}
            style={{ left: pickerPos.arrowLeft - 6, borderWidth: 6, borderStyle: 'solid', ...(pickerPos.above ? { borderTopColor: 'rgba(37,99,235,0.3)' } : { borderBottomColor: 'rgba(37,99,235,0.3)' }) }} />
          {scale.map((s, i) => (
            <button key={i} type="button" tabIndex={-1}
              onMouseDown={e => { e.preventDefault(); selectValue(s, labels[i]); }}
              className={`min-w-[26px] h-7 px-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer whitespace-nowrap ${text === labels[i] ? 'bg-accent text-white' : 'text-primary hover:bg-accent/10'}`}>
              {labels[i]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AHPMatrix({ state }: { state: AppState }) {
  const names = state.criteriaNames;
  const [reciprocals, setReciprocals] = useState<Record<string, string>>({});

  function onCellChange(r: number, c: number, val: number) {
    setReciprocals(prev => ({ ...prev, [`${c}-${r}`]: saatLabel(1 / val) }));
  }

  return (
    <>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted bg-surface rounded-lg p-3 mb-3 border border-border">
        {[['1','Equal'],['3','Moderate'],['5','Strong'],['7','Very strong'],['9','Extreme'],['1/n','Inverse']].map(([v,l]) => (
          <span key={v}><b className="text-primary font-black">{v}</b> {l}</span>
        ))}
      </div>
      <div className="overflow-x-auto custom-scroll rounded-lg border border-border">
        <table className="text-sm border-collapse">
          <MatrixHeader names={names} />
          <tbody>
            {names.map((rn, i) => (
              <tr key={i} className={i % 2 ? 'bg-surface' : ''}>
                <td className="bg-slate-100 font-semibold text-primary text-xs px-3 py-2.5 sticky left-0 z-[5] whitespace-nowrap border-b border-border">{rn}</td>
                {names.map((_, j) => (
                  <td key={j} className="text-center border-b border-border px-0.5 py-0.5" style={{ minWidth: 80 }}>
                    {i === j ? (
                      <span className="inline-flex items-center justify-center w-full h-[36px] text-gray-300 font-bold bg-surface rounded text-sm">1</span>
                    ) : j > i ? (
                      <ScaleCell scale={SAATY_SCALE} labels={SAATY_LABELS} defaultLabel="1" cellClass="ahp-cell" dataAttrs={{ row: i, col: j }} onValueChange={v => onCellChange(i, j, v)} />
                    ) : (
                      <span className="inline-flex items-center justify-center w-full h-[36px] text-muted/70 text-xs bg-surface rounded font-semibold">{reciprocals[`${i}-${j}`] || '1'}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const MACBETH_SCALE = [0, 1, 2, 3, 4, 5, 6];
const MACBETH_LABELS = ['0', '1', '2', '3', '4', '5', '6'];
const DEMATEL_SCALE = [0, 1, 2, 3, 4];
const DEMATEL_LABELS = ['0', '1', '2', '3', '4'];

function PairwiseMatrix({ state, type }: { state: AppState; type: 'macbeth' | 'dematel' }) {
  const names = state.criteriaNames;
  const isMac = type === 'macbeth';
  const scale = isMac ? MACBETH_SCALE : DEMATEL_SCALE;
  const labels = isMac ? MACBETH_LABELS : DEMATEL_LABELS;
  const [mirrors, setMirrors] = useState<Record<string, string>>({});

  function onCellChange(r: number, c: number, val: number) {
    if (isMac) setMirrors(prev => ({ ...prev, [`${c}-${r}`]: String(val) }));
  }

  return (
    <>
      {isMac ? (
        <div className="flex flex-wrap gap-x-3 text-[11px] text-muted bg-surface rounded-lg p-3 mb-3 border border-border">
          {[['0','None'],['1','Very weak'],['2','Weak'],['3','Moderate'],['4','Strong'],['5','Very strong'],['6','Extreme']].map(([v,l]) => <span key={v}><b className="text-primary font-black">{v}</b> {l}</span>)}
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-3 text-[11px] text-muted bg-surface rounded-lg p-3 mb-3 border border-border">
          {[['0','None'],['1','Low'],['2','Medium'],['3','High'],['4','Very high']].map(([v,l]) => <span key={v}><b className="text-primary font-black">{v}</b> {l}</span>)}
        </div>
      )}
      <div className="overflow-x-auto custom-scroll rounded-lg border border-border">
        <table className="min-w-full text-sm border-collapse">
          <MatrixHeader names={names} />
          <tbody>
            {names.map((rn, i) => (
              <tr key={i} className={i % 2 ? 'bg-surface' : ''}>
                <td className="bg-slate-100 font-semibold text-primary text-xs px-3 py-2 sticky left-0 z-[5] border-b border-border">{rn}</td>
                {names.map((_, j) => (
                  <td key={j} className="text-center border-b border-border px-0.5 py-0.5">
                    {i === j ? <span className="inline-flex items-center justify-center w-full h-[36px] text-gray-300 font-bold bg-surface rounded text-sm">0</span>
                    : (isMac && j < i) ? <span className="inline-flex items-center justify-center w-full h-[36px] text-muted/60 text-xs bg-surface rounded font-semibold" id={`macbeth-${i}-${j}`}>{mirrors[`${i}-${j}`] || '0'}</span>
                    : <ScaleCell scale={scale} labels={labels} defaultLabel="0" cellClass={isMac ? 'macbeth-cell' : 'dematel-cell'} dataAttrs={{ row: i, col: j }} onValueChange={v => onCellChange(i, j, v)} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const BWM_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const BWM_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function BWMInput({ state }: { state: AppState }) {
  const names = state.criteriaNames;
  return (
    <>
      <InfoBox>Select the <strong>best</strong> and <strong>worst</strong> criteria, then rate all criteria relative to each (1–9 scale).</InfoBox>
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <FormField label="Best (Most Important)">
          <select className="form-input font-semibold text-primary" id="bwm-best">{names.map((n, i) => <option key={i} value={i}>{n}</option>)}</select>
        </FormField>
        <FormField label="Worst (Least Important)">
          <select className="form-input font-semibold text-danger" id="bwm-worst" defaultValue={names.length - 1}>{names.map((n, i) => <option key={i} value={i}>{n}</option>)}</select>
        </FormField>
      </div>
      <SectionTitle>Best-to-Others</SectionTitle>
      <div className="space-y-1.5 mb-4">
        {names.map((n, i) => (
          <div key={i} className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-border hover:border-slate-300 transition-colors">
            <span className="font-semibold text-sm text-primary min-w-[80px] truncate">{n}</span>
            <ScaleCell scale={BWM_SCALE} labels={BWM_LABELS} defaultLabel="1" cellClass="bwm-bo" dataAttrs={{ idx: i }} />
          </div>
        ))}
      </div>
      <SectionTitle>Others-to-Worst</SectionTitle>
      <div className="space-y-1.5">
        {names.map((n, i) => (
          <div key={i} className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-border hover:border-slate-300 transition-colors">
            <span className="font-semibold text-sm text-primary min-w-[80px] truncate">{n}</span>
            <ScaleCell scale={BWM_SCALE} labels={BWM_LABELS} defaultLabel="1" cellClass="bwm-ow" dataAttrs={{ idx: i }} />
          </div>
        ))}
      </div>
    </>
  );
}

function FucomInput({ state }: { state: AppState }) {
  const names = state.criteriaNames;
  return (
    <>
      <InfoBox>Rank criteria most-to-least important, then compare consecutive pairs.</InfoBox>
      <div className="space-y-1.5 mb-5">
        {names.map((_, i) => (
          <div key={i} className="flex items-center gap-3 bg-surface px-4 py-2.5 rounded-lg border border-border">
            <span className="w-8 h-8 rounded-full bg-accent/10 text-accent text-xs font-black flex items-center justify-center">{i + 1}</span>
            <select className="flex-1 bg-transparent text-sm font-medium focus:outline-none fucom-rank" data-rank={i} defaultValue={i}>
              {names.map((n, j) => <option key={j} value={j}>{n}</option>)}
            </select>
          </div>
        ))}
      </div>
      <SectionTitle>Consecutive Comparisons</SectionTitle>
      <div className="space-y-1.5">
        {names.slice(0, -1).map((_, i) => (
          <div key={i} className="flex items-center gap-3 bg-surface px-4 py-2.5 rounded-lg border border-border">
            <span className="text-xs font-bold text-muted min-w-[100px]">{names[i]} vs {names[i + 1]}</span>
            <input type="number" min="1" max="9" step="0.1" defaultValue="1" className="w-16 bg-white border border-border rounded-lg px-2 py-1 text-sm text-center font-bold text-primary focus:outline-none focus:border-accent fucom-comp" data-idx={i} />
            <span className="text-[10px] text-muted">times more important</span>
          </div>
        ))}
      </div>
    </>
  );
}

function StepwiseInput({ state }: { state: AppState }) {
  const names = state.criteriaNames;
  const isSWARA = state.method === 'SWARA';
  return (
    <>
      <InfoBox>{isSWARA ? 'For each criterion (from 2nd), enter how much MORE important the previous one is. 0 = equal.' : 'For each criterion: >1 = more important than previous, <1 = less, 1 = equal.'}</InfoBox>
      <div className="space-y-1.5">
        <div className="flex items-center gap-3 bg-surface px-4 py-2.5 rounded-lg border border-border">
          <span className="w-8 h-8 rounded-full bg-accent text-white text-xs font-black flex items-center justify-center">1</span>
          <span className="font-semibold text-sm text-primary">{names[0]}</span>
          <span className="ml-auto text-[10px] text-accent font-semibold bg-accent/10 px-2 py-0.5 rounded-md">Reference</span>
        </div>
        {names.slice(1).map((n, i) => (
          <div key={i + 1} className="flex items-center gap-3 bg-surface px-4 py-2.5 rounded-lg border border-border">
            <span className="w-8 h-8 rounded-full bg-surface text-gray-500 text-xs font-black flex items-center justify-center">{i + 2}</span>
            <span className="font-semibold text-sm text-gray-700 min-w-[80px]">{n}</span>
            <input type="number" step="0.01" min="0" defaultValue={isSWARA ? '0.1' : '1'} className="w-20 bg-white border border-border rounded-lg px-2 py-1 text-sm text-center font-bold text-primary focus:outline-none focus:border-accent stepwise-val" data-idx={i + 1} />
          </div>
        ))}
      </div>
    </>
  );
}

function DecisionMatrix({ state }: { state: AppState }) {
  return (
    <>
      <div className="overflow-x-auto custom-scroll rounded-lg border border-border">
        <table className="min-w-full text-sm border-collapse">
          <MatrixHeader names={state.criteriaNames} label="Alternative" minCellWidth={90} />
          <tbody>
            {state.alternativeNames.map((an, i) => (
              <tr key={i} className={i % 2 ? 'bg-surface' : ''}>
                <td className="bg-slate-100 font-semibold text-primary text-xs px-4 py-3 sticky left-0 z-[5] whitespace-nowrap border-b border-border">{an}</td>
                {state.criteriaNames.map((_, j) => (
                  <td key={j} className="text-center border-b border-border px-1 py-1" style={{ minWidth: 90 }}>
                    <input type="number" step="any" placeholder="0" className="cell-input dm-cell" data-row={i} data-col={j} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Typeable cell with a 0–1 slider on hover. For fuzzy weight/membership values. */
function SliderCell({ defaultValue, className, ...dataProps }: { defaultValue: string; className: string; [key: string]: any }) {
  const [text, setText] = useState(defaultValue);
  const [showSlider, setShowSlider] = useState(false);
  const [focused, setFocused] = useState(false);
  const visible = showSlider || focused;
  const inputRef = useRef<HTMLInputElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [sliderPos, setSliderPos] = useState<{ top: number; left: number; arrowLeft: number; above: boolean } | null>(null);

  const numVal = Math.max(0, Math.min(1, +text || 0));

  function updatePos() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const w = 140;
    const cellCenter = rect.left + rect.width / 2;
    let left = cellCenter - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    const arrowLeft = cellCenter - left;
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < 60;
    const top = above ? rect.top - 52 : rect.bottom;
    setSliderPos({ top, left, arrowLeft, above });
  }

  function onEnter() { clearTimeout(hideTimeout.current); setShowSlider(true); updatePos(); }
  function onLeave() { hideTimeout.current = setTimeout(() => setShowSlider(false), 80); }

  function onSliderInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = (+e.target.value).toFixed(2);
    setText(v);
  }

  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onFocus={() => { setFocused(true); updatePos(); }}
        onBlur={() => setFocused(false)}
        className={`${visible ? 'border-accent ring-1 ring-accent/20' : ''} ${className}`}
        {...dataProps}
      />
      {visible && sliderPos && (
        <div className="fixed z-[100] bg-white border border-accent/30 rounded-lg shadow-lg px-2.5 py-2 scale-picker w-[140px]"
          style={{ top: sliderPos.top, left: sliderPos.left }}
          onMouseEnter={onEnter} onMouseLeave={onLeave}>
          <span className={`absolute ${sliderPos.above ? 'bottom-[-5px] border-t-white border-b-transparent' : 'top-[-5px] border-b-white border-t-transparent'} border-l-transparent border-r-transparent w-0 h-0`}
            style={{ left: sliderPos.arrowLeft - 5, borderWidth: 5, borderStyle: 'solid', ...(sliderPos.above ? { borderTopColor: 'white' } : { borderBottomColor: 'white' }) }} />
          <span className={`absolute ${sliderPos.above ? 'bottom-[-6px] border-t-[#e2e8f0] border-b-transparent' : 'top-[-6px] border-b-[#e2e8f0] border-t-transparent'} border-l-transparent border-r-transparent w-0 h-0 -z-10`}
            style={{ left: sliderPos.arrowLeft - 6, borderWidth: 6, borderStyle: 'solid', ...(sliderPos.above ? { borderTopColor: 'rgba(37,99,235,0.3)' } : { borderBottomColor: 'rgba(37,99,235,0.3)' }) }} />
          <input
            type="range" min="0" max="1" step="0.01" value={numVal}
            onChange={onSliderInput}
            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-accent"
          />
          <div className="flex justify-between text-[9px] text-muted mt-0.5 font-semibold">
            <span>0</span><span>{numVal.toFixed(2)}</span><span>1</span>
          </div>
        </div>
      )}
    </div>
  );
}

function FuzzyMatrixInput({ state }: { state: AppState }) {
  const isSF = state.method.startsWith('SF-');
  const comps = isSF ? ['mu', 'nu', 'pi'] : ['l', 'm', 'u'];
  return (
    <>
      <SectionTitle>Fuzzy Criteria Weights</SectionTitle>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {state.criteriaNames.map((n, i) => (
          <div key={i} className="bg-white rounded-lg p-3 border border-border hover:border-slate-300 transition">
            <span className="text-xs font-bold text-muted">{n}</span>
            <div className="flex gap-1.5 mt-2">
              {comps.map(c => (
                <div key={c} className="flex-1">
                  <span className="text-[9px] font-bold text-muted uppercase">{c}</span>
                  <SliderCell
                    defaultValue={c === 'l' || c === 'mu' ? '0.70' : c === 'm' || c === 'nu' ? '0.20' : '0.10'}
                    className="w-full bg-surface border border-border rounded-lg px-1 py-1 text-xs text-center font-bold focus:outline-none focus:border-accent fuzzy-weight"
                    data-wi={i} data-comp={c}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <SectionTitle>Fuzzy Decision Matrix</SectionTitle>
      <div className="overflow-x-auto custom-scroll rounded-lg border border-border">
        <table className="min-w-full text-xs border-collapse">
          <thead><tr>
            <th className="bg-primary-dark text-white px-2 py-2 text-left font-semibold sticky left-0 z-10">Alt</th>
            {state.criteriaNames.map((n, i) => <th key={i} className="bg-primary text-white px-2 py-2 font-semibold text-center">{n}</th>)}
          </tr></thead>
          <tbody>
            {state.alternativeNames.map((an, i) => (
              <tr key={i} className={i % 2 ? 'bg-surface' : ''}>
                <td className="bg-slate-100 font-semibold text-primary px-2 py-1 sticky left-0 z-[5] border-b border-border">{an}</td>
                {state.criteriaNames.map((_, j) => (
                  <td key={j} className="border-b border-border px-1 py-0.5">
                    <div className="flex gap-0.5">
                      {comps.map(c => (
                        isSF ? (
                          <SliderCell key={c}
                            defaultValue={c === 'mu' ? '0.50' : c === 'nu' ? '0.30' : '0.20'}
                            className="w-12 bg-white border border-border rounded text-center py-1 text-[11px] font-semibold focus:outline-none focus:border-accent fuzzy-cell"
                            data-r={i} data-c={j} data-comp={c}
                          />
                        ) : (
                          <input key={c} type="number" step="0.1" defaultValue={c === 'l' ? '1' : c === 'm' ? '3' : '5'} className="w-12 bg-white border border-border rounded text-center py-1 text-[11px] focus:outline-none focus:border-accent fuzzy-cell" data-r={i} data-c={j} data-comp={c} placeholder={c} />
                        )
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COLLECT INPUT + CALC
// ═══════════════════════════════════════════════════════════════════════════════

function collectInput(container: HTMLElement, state: AppState): any {
  const { category, method, criteriaCount: n, altCount: m, criteriaTypes } = state;
  const info = METHODS[category][method];

  if (category === 'weighting') {
    const input = info?.input;
    if (input === 'pairwise') {
      const matrix = Array.from({ length: n }, () => Array(n).fill(1));
      container.querySelectorAll<HTMLInputElement>('.ahp-cell').forEach(el => {
        const r = +el.dataset.row!, c = +el.dataset.col!;
        const v = el.dataset.value ? +el.dataset.value : SAATY_SCALE[+el.value];
        if (v) { matrix[r][c] = v; matrix[c][r] = 1 / v; }
      });
      return { matrix };
    }
    if (input === 'pairwise_macbeth') {
      const matrix = Array.from({ length: n }, () => Array(n).fill(0));
      container.querySelectorAll<HTMLInputElement>('.macbeth-cell').forEach(el => { const r = +el.dataset.row!, c = +el.dataset.col!; const v = +(el.dataset.value ?? el.value) || 0; matrix[r][c] = v; matrix[c][r] = v; });
      return { matrix };
    }
    if (input === 'bwm') {
      const bestIdx = +(document.getElementById('bwm-best') as HTMLSelectElement).value;
      const worstIdx = +(document.getElementById('bwm-worst') as HTMLSelectElement).value;
      const bo: number[] = [], ow: number[] = [];
      container.querySelectorAll<HTMLInputElement>('.bwm-bo').forEach(el => { bo[+el.dataset.idx!] = +(el.dataset.value ?? el.value) || 1; });
      container.querySelectorAll<HTMLInputElement>('.bwm-ow').forEach(el => { ow[+el.dataset.idx!] = +(el.dataset.value ?? el.value) || 1; });
      return { bestIdx, worstIdx, bestToOthers: bo, othersToWorst: ow };
    }
    if (input === 'fucom') {
      const ranking: number[] = [], comparisons: number[] = [];
      container.querySelectorAll<HTMLSelectElement>('.fucom-rank').forEach(el => { ranking[+el.dataset.rank!] = +el.value; });
      container.querySelectorAll<HTMLInputElement>('.fucom-comp').forEach(el => { comparisons[+el.dataset.idx!] = +el.value || 1; });
      return { ranking, comparisons };
    }
    if (input === 'stepwise') {
      const values: number[] = [0];
      container.querySelectorAll<HTMLInputElement>('.stepwise-val').forEach(el => { values[+el.dataset.idx!] = +el.value || 0; });
      return { values };
    }
    if (input === 'direct_influence') {
      const matrix = Array.from({ length: n }, () => Array(n).fill(0));
      container.querySelectorAll<HTMLInputElement>('.dematel-cell').forEach(el => { matrix[+el.dataset.row!][+el.dataset.col!] = +(el.dataset.value ?? el.value) || 0; });
      return { matrix };
    }
    return { matrix: collectDM(container, m, n), criteriaTypes };
  }

  if (category === 'ranking') {
    const weights: number[] = [];
    container.querySelectorAll<HTMLInputElement>('.weight-input').forEach(el => { weights[+el.dataset.wi!] = +el.value || 0; });
    const wSum = weights.reduce((a, b) => a + b, 0);
    const nw = wSum > 0 ? weights.map(w => w / wSum) : Array(n).fill(1 / n);
    const params: Record<string, number> = {};
    container.querySelectorAll<HTMLInputElement>('.method-param').forEach(el => { params[el.dataset.param!] = +el.value; });
    return { matrix: collectDM(container, m, n), weights: nw, criteriaTypes, criteriaNames: state.criteriaNames, alternativeNames: state.alternativeNames, ...params };
  }

  if (category === 'fuzzy') {
    const isSF = method.startsWith('SF-');
    const fMatrix: any[][] = Array.from({ length: m }, () => Array.from({ length: n }, () => isSF ? { mu: 0.5, nu: 0.3, pi: 0.2 } : [1, 3, 5]));
    container.querySelectorAll<HTMLInputElement>('.fuzzy-cell').forEach(el => {
      const r = +el.dataset.r!, c = +el.dataset.c!, comp = el.dataset.comp!;
      if (isSF) fMatrix[r][c][comp] = +el.value || 0;
      else { const idx = comp === 'l' ? 0 : comp === 'm' ? 1 : 2; fMatrix[r][c][idx] = +el.value || 0; }
    });
    const fWeights: any[] = Array.from({ length: n }, () => isSF ? { mu: 0.7, nu: 0.2, pi: 0.1 } : [0.1, 0.3, 0.5]);
    container.querySelectorAll<HTMLInputElement>('.fuzzy-weight').forEach(el => {
      const wi = +el.dataset.wi!, comp = el.dataset.comp!;
      if (isSF) fWeights[wi][comp] = +el.value || 0;
      else { const idx = comp === 'l' ? 0 : comp === 'm' ? 1 : 2; fWeights[wi][idx] = +el.value || 0; }
    });
    const params: Record<string, number> = {};
    container.querySelectorAll<HTMLInputElement>('.method-param').forEach(el => { params[el.dataset.param!] = +el.value; });
    return { matrix: fMatrix, weights: fWeights, criteriaTypes, criteriaNames: state.criteriaNames, alternativeNames: state.alternativeNames, ...params };
  }
}

function collectDM(container: HTMLElement, m: number, n: number): number[][] {
  const matrix = Array.from({ length: m }, () => Array(n).fill(0));
  container.querySelectorAll<HTMLInputElement>('.dm-cell').forEach(el => { matrix[+el.dataset.row!][+el.dataset.col!] = +el.value || 0; });
  return matrix;
}

function calcWeighting(method: string, data: any) {
  const W = WeightingMethods as any;
  const fn = W[method]; if (!fn) throw new Error(`Unknown method: ${method}`);
  switch (method) {
    case 'AHP': case 'MACBETH': case 'DEMATEL': return fn(data.matrix);
    case 'SWARA': case 'PIPRECIA': return fn(data.values);
    case 'BWM': return fn(data.bestToOthers, data.othersToWorst, data.bestIdx, data.worstIdx);
    case 'FUCOM': return fn(data.ranking, data.comparisons);
    case 'CRITIC': case 'ENTROPY': case 'SD': return fn(data.matrix, data.criteriaTypes);
    default: return fn(data.matrix, data.criteriaTypes);
  }
}

function calcRanking(method: string, data: any) {
  const fn = RankingMethods[method]; if (!fn) throw new Error(`Unknown method: ${method}`);
  return fn(data as RankingInput);
}

function calcFuzzy(method: string, data: any) {
  const map: Record<string, string> = { 'F-TOPSIS': 'fTopsis', 'F-VIKOR': 'fVikor', 'SF-TOPSIS': 'sfTopsis', 'SF-VIKOR': 'sfVikor' };
  const fn = (FuzzyMethods as any)[map[method]]; if (!fn) throw new Error(`Unknown method: ${method}`);
  return fn(data as FuzzyInput);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RESULTS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function ResultsView({ state, onBack, onExport, onProceed }: {
  state: AppState; onBack: () => void; onExport: () => void; onProceed: (method: string, alts: number) => void;
}) {
  const [proceedMethod, setProceedMethod] = useState('TOPSIS');
  const [proceedAlts, setProceedAlts] = useState(4);
  const results = state.results;
  const isWeighting = state.category === 'weighting';

  return (
    <div className="animate-fade-in">
      <Stepper current={3} />
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <Tag color="bg-primary">{state.method}</Tag>
          <span className="text-sm font-semibold text-primary">{isWeighting ? 'Criteria Weights' : 'Alternative Rankings'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="bg-surface px-2.5 py-1 rounded-lg border border-border font-semibold">{state.criteriaCount} criteria</span>
          {!isWeighting && <span className="bg-surface px-2.5 py-1 rounded-lg border border-border font-semibold">{state.altCount} alternatives</span>}
        </div>
      </div>

      <Card className="animate-slide-up">
        <h3 className="text-base font-bold text-primary mb-6 flex items-center gap-2">
          {isWeighting ? Icons.weight : Icons.rank}
          {isWeighting ? `${state.method} — Criteria Weights` : `${state.method} — Rankings`}
        </h3>

        {/* AHP Consistency */}
        {results?.CR !== undefined && (
          <div className="mb-5">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-sm ${results.CR < 0.1 ? 'bg-surface text-accent border border-border' : 'bg-red-50 text-danger border border-red-200'}`}>
              {results.CR < 0.1 ? Icons.check : Icons.close}
              {results.CR < 0.1 ? 'Consistent' : 'Inconsistent'} &middot; CR = {results.CR.toFixed(4)}
            </span>
            {results.CR >= 0.1 && <InfoBox type="warning">CR exceeds 0.10. Revise pairwise comparisons.</InfoBox>}
          </div>
        )}

        {/* DEMATEL */}
        {results?.prominence && (
          <>
            <SectionTitle>Cause-Effect Analysis</SectionTitle>
            <div className="overflow-x-auto custom-scroll rounded-lg border border-border mb-4">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-primary text-white"><th className="px-4 py-2.5 text-left font-semibold text-xs">Criterion</th><th className="px-4 py-2.5 text-center text-xs">D+R</th><th className="px-4 py-2.5 text-center text-xs">D-R</th><th className="px-4 py-2.5 text-center text-xs">Type</th></tr></thead>
                <tbody>{results.prominence.map((p: number, i: number) => (
                  <tr key={i} className={i % 2 ? 'bg-surface' : ''}>
                    <td className="px-4 py-2.5 font-medium">{state.criteriaNames[i]}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-xs">{p.toFixed(4)}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-xs">{results.relation[i].toFixed(4)}</td>
                    <td className="px-4 py-2.5 text-center"><span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${results.relation[i] >= 0 ? 'bg-accent/10 text-accent' : 'bg-surface text-muted'}`}>{results.relation[i] >= 0 ? 'CAUSE' : 'EFFECT'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}

        {isWeighting && results?.weights && <WeightsTable weights={results.weights} names={state.criteriaNames} />}
        {!isWeighting && results?.scores && <RankingsTable scores={results.scores} rankings={results.rankings} names={state.alternativeNames} />}

        {/* VIKOR */}
        {results?.compromise && <InfoBox type={results.compromise.acceptable ? 'success' : 'warning'}><strong>VIKOR:</strong> C1 {results.compromise.C1 ? '✓' : '✗'}, C2 {results.compromise.C2 ? '✓' : '✗'} &mdash; {results.compromise.acceptable ? 'Compromise acceptable.' : 'Consider multiple solutions.'}</InfoBox>}
        {results?.kernel && <InfoBox type="success"><strong>ELECTRE Kernel:</strong> {results.kernel.map((i: number) => state.alternativeNames[i]).join(', ')}</InfoBox>}
        {results?.details && <DetailsSection details={results.details} />}
      </Card>

      {/* Actions */}
      <div className="no-print flex flex-wrap items-center gap-3 mt-5">
        <button onClick={onBack} className="btn btn-secondary">{Icons.back} Back to Input</button>
        <div className="ml-auto flex gap-2">
          <a href="/" className="btn btn-ghost">Home</a>
          <button onClick={onExport} className="btn btn-outline-primary">{Icons.download} Export Word</button>
          <button onClick={() => window.print()} className="btn btn-ghost">{Icons.print} Print</button>
        </div>
      </div>

      {/* Proceed */}
      {isWeighting && (
        <div className="no-print mt-8 bg-surface border border-dashed border-border rounded-lg p-8 text-center animate-slide-up">
          <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent mx-auto mb-3">{Icons.forward}</div>
          <h3 className="text-lg font-bold text-primary mb-1">Continue with Ranking?</h3>
          <p className="text-sm text-muted mb-5 max-w-md mx-auto">Use calculated weights with a ranking method to evaluate alternatives.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
            <SearchableSelect value={proceedMethod} onChange={setProceedMethod}
              options={Object.entries(METHODS.ranking).map(([k, v]) => ({ value: k, label: k, desc: v.fullName }))} placeholder="Search ranking methods..." />
            <StepperInput value={proceedAlts} onChange={setProceedAlts} min={2} max={30} />
            <button onClick={() => onProceed(proceedMethod, proceedAlts)} className="btn btn-primary whitespace-nowrap">{Icons.forward} Proceed</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Weights Table ────────────────────────────────────────────────────────────

function WeightsTable({ weights, names }: { weights: number[]; names: string[] }) {
  const indexed = weights.map((w, i) => ({ w, name: names[i] })).sort((a, b) => b.w - a.w);
  const maxW = Math.max(...weights);
  const barColors = ['bg-accent', 'bg-primary', 'bg-primary-light', 'bg-slate-500', 'bg-slate-400', 'bg-blue-400', 'bg-blue-300', 'bg-slate-300', 'bg-gray-400', 'bg-gray-300'];

  return (
    <>
      <SectionTitle>Final Weights</SectionTitle>
      <div className="overflow-x-auto custom-scroll rounded-lg border border-border mb-4">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-primary text-white">
            <th className="px-4 py-2.5 text-left text-xs font-bold rounded-tl-lg w-12">#</th>
            <th className="px-4 py-2.5 text-left text-xs font-bold">Criterion</th>
            <th className="px-4 py-2.5 text-center text-xs font-bold w-24">Weight</th>
            <th className="px-4 py-2.5 text-center text-xs font-bold w-16">%</th>
            <th className="px-4 py-2.5 text-xs font-bold rounded-tr-lg min-w-[180px]"></th>
          </tr></thead>
          <tbody>
            {indexed.map((item, rank) => (
              <tr key={item.name} className={rank % 2 ? 'bg-surface' : ''}>
                <td className="px-4 py-3"><span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white ${rank === 0 ? 'bg-accent' : rank === 1 ? 'bg-primary-light' : rank === 2 ? 'bg-slate-400' : 'bg-gray-300'}`}>{rank + 1}</span></td>
                <td className="px-4 py-3 font-semibold">{item.name}</td>
                <td className="px-4 py-3 text-center font-mono text-xs">{item.w.toFixed(4)}</td>
                <td className="px-4 py-3 text-center font-bold text-xs">{(item.w * 100).toFixed(1)}%</td>
                <td className="px-4 py-3"><div className="h-4 bg-surface rounded-full overflow-hidden"><div className={`h-full rounded-full ${barColors[rank % barColors.length]} animate-bar-grow`} style={{ width: `${maxW > 0 ? (item.w / maxW) * 100 : 0}%` }} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Rankings Table ───────────────────────────────────────────────────────────

function RankingsTable({ scores, rankings, names }: { scores: number[]; rankings: number[]; names: string[] }) {
  // rankings hold average ranks, which are fractional when alternatives tie;
  // competition ranks are what belongs on screen (and index arrays safely).
  const display = competitionRanks(rankings);
  const indexed = scores
    .map((s, i) => ({
      s,
      rank: display[i],
      tied: display.filter(r => r === display[i]).length > 1,
      name: names[i],
    }))
    .sort((a, b) => a.rank - b.rank);
  const maxS = Math.max(...scores.map(Math.abs));
  const barColors = ['bg-accent', 'bg-primary', 'bg-primary-light', 'bg-slate-500', 'bg-slate-400', 'bg-slate-300', 'bg-blue-300', 'bg-blue-200', 'bg-gray-400', 'bg-gray-300'];

  return (
    <>
      <SectionTitle>Final Rankings</SectionTitle>
      <div className="overflow-x-auto custom-scroll rounded-lg border border-border mb-4">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-primary text-white">
            <th className="px-4 py-2.5 text-left text-xs font-bold rounded-tl-lg w-12">#</th>
            <th className="px-4 py-2.5 text-left text-xs font-bold">Alternative</th>
            <th className="px-4 py-2.5 text-center text-xs font-bold w-24">Score</th>
            <th className="px-4 py-2.5 text-xs font-bold rounded-tr-lg min-w-[180px]"></th>
          </tr></thead>
          <tbody>
            {indexed.map((item) => (
              <tr key={item.name} className={item.rank % 2 === 0 ? 'bg-surface' : ''}>
                <td className="px-4 py-3"><span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white ${item.rank === 1 ? 'bg-accent' : item.rank === 2 ? 'bg-primary-light' : item.rank === 3 ? 'bg-slate-400' : 'bg-gray-300'}`}>{item.tied ? `=${item.rank}` : item.rank}</span></td>
                <td className="px-4 py-3 font-semibold">{item.name}</td>
                <td className="px-4 py-3 text-center font-mono text-xs">{item.s.toFixed(4)}</td>
                <td className="px-4 py-3"><div className="h-4 bg-surface rounded-full overflow-hidden"><div className={`h-full rounded-full ${barColors[(item.rank - 1) % barColors.length]} animate-bar-grow`} style={{ width: `${maxS > 0 ? (Math.abs(item.s) / maxS) * 100 : 0}%` }} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Details Toggle ───────────────────────────────────────────────────────────

function DetailsSection({ details }: { details: Record<string, any> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5">
      <button onClick={() => setOpen(!open)} className="btn btn-ghost text-accent hover:text-accent-hover gap-1.5">
        <span className={`transition-transform inline-block ${open ? 'rotate-90' : ''}`}>{Icons.arrow}</span>
        {open ? 'Hide' : 'Show'} Calculation Details
      </button>
      {open && (
        <div className="mt-3 max-h-[400px] overflow-y-auto custom-scroll border border-border rounded-lg p-5 bg-surface text-xs space-y-3 animate-scale-in">
          {Object.entries(details).map(([key, value]) => (
            <div key={key}>
              <span className="font-bold text-primary">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}: </span>
              {Array.isArray(value) && Array.isArray(value[0]) ? (
                <div className="overflow-x-auto mt-1 rounded-lg border border-border"><table className="text-xs border-collapse"><tbody>{(value as number[][]).map((row, i) => (
                  <tr key={i} className={i % 2 ? 'bg-white' : 'bg-surface'}>{row.map((v, j) => <td key={j} className="px-2 py-0.5 border border-border text-center font-mono">{typeof v === 'number' ? v.toFixed(4) : String(v)}</td>)}</tr>
                ))}</tbody></table></div>
              ) : Array.isArray(value) ? <span className="font-mono text-gray-600">[{(value as any[]).map(v => typeof v === 'number' ? v.toFixed(4) : String(v)).join(', ')}]</span>
              : typeof value === 'number' ? <span className="font-mono">{value.toFixed(6)}</span>
              : <span className="font-mono text-gray-600">{JSON.stringify(value)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
