'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ToolConfig } from '../../lib/tool-configs';
import { runAllMethods, type AllMethodsResult, type BusinessInput } from '../../lib/run-all-methods';
import { save, load } from '../../lib/storage';
import ReportPreview from './ReportPreview';
import SessionMenu from './SessionMenu';

interface Criterion {
  name: string;
  type: 'benefit' | 'cost';
  importance: number;
}

interface BusinessToolProps {
  config: ToolConfig;
  skipLanding?: boolean;
}

// -1 = landing, 0 = define, 1 = score, 2 = report
type Step = -1 | 0 | 1 | 2;

const ANALYSIS_PHASES = [
  { label: 'Calculating objective weights', pct: 15 },
  { label: 'Running TOPSIS analysis', pct: 30 },
  { label: 'Running VIKOR analysis', pct: 42 },
  { label: 'Running PROMETHEE analysis', pct: 55 },
  { label: 'Running 20+ additional methods', pct: 72 },
  { label: 'Aggregating rankings', pct: 88 },
  { label: 'Computing consensus', pct: 96 },
];

const METHOD_NAMES = [
  'TOPSIS', 'VIKOR', 'PROMETHEE', 'EDAS', 'MABAC', 'MARCOS',
  'CODAS', 'COPRAS', 'ARAS', 'WASPAS', 'MOORA', 'SAW',
];

export default function BusinessTool({ config, skipLanding }: BusinessToolProps) {
  const [step, setStep] = useState<Step>(() => skipLanding ? 0 : -1);
  const [projectName, setProjectName] = useState('');
  const [criteria, setCriteria] = useState<Criterion[]>(() =>
    config.presetCriteria.map(c => ({ ...c, importance: 5 }))
  );
  const [alternatives, setAlternatives] = useState<string[]>([
    `${config.alternativeSingular} A`,
    `${config.alternativeSingular} B`,
    `${config.alternativeSingular} C`,
  ]);
  const [matrix, setMatrix] = useState<number[][]>([]);
  const [results, setResults] = useState<AllMethodsResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState(0);
  const [computeError, setComputeError] = useState<string | null>(null);
  const storageKey = config.slug;
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const saved = load<{
      step: Step;
      projectName: string;
      criteria: Criterion[];
      alternatives: string[];
      matrix: number[][];
    }>(storageKey);
    if (saved && saved.step >= 0) {
      setStep(saved.step as Step);
      setProjectName(saved.projectName);
      setCriteria(saved.criteria);
      setAlternatives(saved.alternatives);
      setMatrix(saved.matrix);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!loaded.current || step < 0) return;
    save(storageKey, { step, projectName, criteria, alternatives, matrix });
  }, [step, projectName, criteria, alternatives, matrix, storageKey]);

  useEffect(() => {
    if (step === 1 && (matrix.length !== alternatives.length || (matrix[0] && matrix[0].length !== criteria.length))) {
      const newMatrix = alternatives.map((_, ai) =>
        criteria.map((_, ci) => matrix[ai]?.[ci] || 5)
      );
      setMatrix(newMatrix);
    }
  }, [step, alternatives.length, criteria.length]);

  const addCriterion = () => {
    setCriteria([...criteria, { name: '', type: 'benefit', importance: 5 }]);
  };
  const removeCriterion = (idx: number) => {
    if (criteria.length <= 2) return;
    setCriteria(criteria.filter((_, i) => i !== idx));
    // Drop the matching column too — otherwise the scores to the right of it
    // shift onto the wrong criteria when the matrix is next resized.
    setMatrix(matrix.map(row => row.filter((_, i) => i !== idx)));
  };
  const updateCriterion = (idx: number, field: keyof Criterion, value: any) => {
    setCriteria(criteria.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };
  const addAlternative = () => {
    // Pick the first unused letter rather than indexing by length, so removing
    // an alternative and adding another can't produce a duplicate name.
    const used = new Set(alternatives);
    let name = '';
    for (let i = 0; i < 26 && !name; i++) {
      const candidate = `${config.alternativeSingular} ${String.fromCharCode(65 + i)}`;
      if (!used.has(candidate)) name = candidate;
    }
    setAlternatives([...alternatives, name || `${config.alternativeSingular} ${alternatives.length + 1}`]);
  };
  const removeAlternative = (idx: number) => {
    if (alternatives.length <= 2) return;
    setAlternatives(alternatives.filter((_, i) => i !== idx));
    setMatrix(matrix.filter((_, i) => i !== idx));
  };
  const updateAlternative = (idx: number, name: string) => {
    setAlternatives(alternatives.map((a, i) => i === idx ? name : a));
  };
  const updateMatrix = (altIdx: number, critIdx: number, value: number) => {
    setMatrix(prev => prev.map((row, ai) =>
      ai === altIdx ? row.map((v, ci) => ci === critIdx ? value : v) : row
    ));
  };

  const canProceedToScore = criteria.length >= 2 && alternatives.length >= 2 &&
    criteria.every(c => c.name.trim() !== '') &&
    alternatives.every(a => a.trim() !== '');

  const generateReport = useCallback(async () => {
    setComputing(true);
    setAnalysisPhase(0);
    setComputeError(null);

    // Staged loading — run through phases with delays to show progress
    const input: BusinessInput = {
      criteriaNames: criteria.map(c => c.name),
      criteriaTypes: criteria.map(c => c.type),
      criteriaWeights: criteria.map(c => c.importance),
      alternativeNames: alternatives,
      matrix,
    };

    // Animate through phases while computation happens in the background
    let result: AllMethodsResult | null = null;
    let error: string | null = null;

    // Start computation
    const computePromise = new Promise<void>(resolve => {
      setTimeout(() => {
        try {
          result = runAllMethods(input);
        } catch (e) {
          console.error('Error running methods:', e);
          error = e instanceof Error ? e.message : 'Unknown error';
        }
        resolve();
      }, 50);
    });

    // Animate phases over ~2.5s total
    for (let i = 0; i < ANALYSIS_PHASES.length; i++) {
      setAnalysisPhase(i);
      await new Promise(r => setTimeout(r, 280 + Math.random() * 120));
    }

    // Make sure computation is done
    await computePromise;

    // Brief pause at 100%
    setAnalysisPhase(ANALYSIS_PHASES.length);
    await new Promise(r => setTimeout(r, 300));

    if (result && !error) {
      setResults(result);
      setStep(2);
    } else {
      setComputeError(
        error ?? 'The analysis could not be completed. Check your scores and try again.',
      );
    }
    setComputing(false);
  }, [criteria, alternatives, matrix]);

  const reset = () => {
    setStep(0);
    setProjectName('');
    setComputeError(null);
    setCriteria(config.presetCriteria.map(c => ({ ...c, importance: 5 })));
    setAlternatives([
      `${config.alternativeSingular} A`,
      `${config.alternativeSingular} B`,
      `${config.alternativeSingular} C`,
    ]);
    setMatrix([]);
    setResults(null);
  };

  if (step === -1) {
    return <ToolLanding config={config} onStart={() => setStep(0)} />;
  }

  const STEP_LABELS = ['Define', 'Score', 'Report'];

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-primary-dark text-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="text-sm text-white/40 hover:text-white/80 transition-colors">CKR</a>
            <span className="text-white/20">/</span>
            <span className="text-sm text-white/80">{config.shortTitle}</span>
          </div>
          <div className="flex items-center gap-4">
            {step > 0 && step < 2 && (
              <button onClick={() => setStep((step - 1) as Step)} className="text-sm text-white/40 hover:text-white transition-colors">
                Back
              </button>
            )}
            {step === 2 && (
              <>
                <a href="/" className="text-sm text-white/40 hover:text-white transition-colors">
                  All Tools
                </a>
                <span className="text-white/15">|</span>
                <button onClick={reset} className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  New Analysis
                </button>
              </>
            )}
            <SessionMenu tone="dark" />
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full text-[11px] flex items-center justify-center transition-colors ${
                    i < step ? 'bg-emerald-100 text-emerald-600' :
                    i === step ? 'bg-primary-dark text-white' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {i < step ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <span className={`text-sm ${i === step ? 'text-primary-dark' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`w-10 h-px ${i < step ? 'bg-emerald-200' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 lg:px-8 py-10">
        {step === 0 && (
          <StepDefine
            config={config}
            projectName={projectName}
            setProjectName={setProjectName}
            criteria={criteria}
            alternatives={alternatives}
            addCriterion={addCriterion}
            removeCriterion={removeCriterion}
            updateCriterion={updateCriterion}
            addAlternative={addAlternative}
            removeAlternative={removeAlternative}
            updateAlternative={updateAlternative}
            canProceed={canProceedToScore}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && !computing && (
          <StepScore
            config={config}
            criteria={criteria}
            alternatives={alternatives}
            matrix={matrix}
            updateMatrix={updateMatrix}
            onGenerate={generateReport}
            onBack={() => setStep(0)}
            error={computeError}
          />
        )}
        {step === 1 && computing && (
          <AnalysisLoader phase={analysisPhase} config={config} />
        )}
        {step === 2 && results && (
          <ReportPreview config={config} projectName={projectName} results={results} onNewAnalysis={reset} />
        )}
      </main>
    </div>
  );
}

// ── Analysis Loader ─────────────────────────────────────────────────────────

function AnalysisLoader({ phase, config }: { phase: number; config: ToolConfig }) {
  const currentPhase = ANALYSIS_PHASES[Math.min(phase, ANALYSIS_PHASES.length - 1)];
  const pct = phase >= ANALYSIS_PHASES.length ? 100 : currentPhase.pct;
  const label = phase >= ANALYSIS_PHASES.length ? 'Preparing report...' : currentPhase.label;

  return (
    <div className="animate-fade-in flex items-center justify-center min-h-[400px]">
      <div className="w-full max-w-md text-center">
        {/* Animated icon */}
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-8">
          <svg className="w-7 h-7 text-accent animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
          </svg>
        </div>

        <p className="text-lg text-primary-dark mb-2">Analyzing {config.alternativesLabel.toLowerCase()}</p>
        <p className="text-sm text-slate-400 mb-8">{label}</p>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-xs text-slate-300 tabular-nums">{pct}%</p>
      </div>
    </div>
  );
}

// ── Tool Landing Page ───────────────────────────────────────────────────────

function ToolLanding({ config, onStart }: { config: ToolConfig; onStart: () => void }) {
  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="bg-primary-dark">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <a href="/" className="text-sm text-white/40 hover:text-white/80 transition-colors">CKR</a>
          <a href="/" className="text-sm text-white/40 hover:text-white/80 transition-colors">All Tools</a>
        </div>
      </nav>

      {/* Hero with color accent */}
      <header className="bg-primary-dark text-white pb-20 pt-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 opacity-10" style={{ backgroundColor: config.color }} />

        <div className="relative max-w-5xl mx-auto px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: config.color + 'aa' }}>{config.shortTitle}</p>
          <h1 className="text-3xl sm:text-4xl leading-tight tracking-tight max-w-lg">
            {config.heroHeadline}
          </h1>
          <p className="text-[15px] text-white/50 mt-6 max-w-md leading-relaxed">
            {config.heroSubtext}
          </p>
          <button
            onClick={onStart}
            className="mt-10 inline-flex items-center gap-2 text-primary-dark px-7 py-3.5 rounded-lg text-sm hover:opacity-90 transition-all"
            style={{ backgroundColor: 'white' }}
          >
            Start Analysis
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          {/* Preset criteria shown in hero as proof of specificity */}
          <div className="mt-8 flex flex-wrap gap-2">
            <span className="text-[11px] text-white/30">Built-in criteria:</span>
            {config.presetCriteria.map((c, i) => (
              <span key={i} className="text-[11px] text-white/40 bg-white/[0.06] border border-white/[0.08] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                {c.type === 'benefit' ? (
                  <svg className="w-2 h-2 text-emerald-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                ) : (
                  <svg className="w-2 h-2 text-amber-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                )}
                {c.name}
              </span>
            ))}
            <span className="text-[11px] text-white/25">+ add your own</span>
          </div>
        </div>
      </header>

      {/* Features + Steps in cards */}
      <section className="max-w-5xl mx-auto px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-6">
          {/* What you get — card */}
          <div className="bg-white rounded-2xl border border-border p-8 sm:p-10">
            <p className="text-xs text-slate-400 uppercase tracking-[0.15em] mb-8">What you get</p>
            <div className="space-y-8">
              {config.features.map((f, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: config.color + '12' }}>
                    <svg className="w-3 h-3" style={{ color: config.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[15px] text-primary-dark leading-snug">{f.bold}</p>
                    <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{f.rest}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works — card */}
          <div className="bg-white rounded-2xl border border-border p-8 sm:p-10">
            <p className="text-xs text-slate-400 uppercase tracking-[0.15em] mb-8">How it works</p>
            <div className="space-y-10">
              {[
                { n: '01', t: 'Define', d: `Name your ${config.criteriaLabel.toLowerCase()}. Set importance levels and whether higher or lower scores are better for each.` },
                { n: '02', t: 'Score', d: `Rate each ${config.alternativeSingular.toLowerCase()} from 1 to 10 on every criterion. Color-coded cells make patterns visible.` },
                { n: '03', t: 'Report', d: '50+ methods rank your options independently. See consensus level, rank distributions, and download a full PDF.' },
              ].map(s => (
                <div key={s.n}>
                  <span className="text-[11px] text-slate-300 tracking-wider">{s.n}</span>
                  <p className="text-[15px] text-primary-dark mt-1.5">{s.t}</p>
                  <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Under the hood — method pills for visual texture */}
      <section className="max-w-5xl mx-auto px-6 lg:px-8 pb-16">
        <div className="rounded-2xl bg-white border border-border p-8 sm:p-10">
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            <div>
              <p className="text-3xl tabular-nums" style={{ color: config.color }}>50+</p>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Ranking methods run on your data simultaneously, each using a different mathematical approach.
              </p>
            </div>
            <div>
              <p className="text-3xl text-primary-dark tabular-nums">10</p>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Objective weighting schemes that derive importance from your data instead of relying on gut feel.
              </p>
            </div>
            <div>
              <p className="text-3xl text-primary-dark">PDF</p>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Executive summary, rank distributions, every method's result, and a methodology appendix.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-[11px] text-slate-400 uppercase tracking-[0.15em] mb-4">Methods included</p>
            <div className="flex flex-wrap gap-2">
              {METHOD_NAMES.map(m => (
                <span key={m} className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">{m}</span>
              ))}
              <span className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">CRITIC</span>
              <span className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">ENTROPY</span>
              <span className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">MEREC</span>
              <span className="text-[11px] text-slate-300 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">+ 35 more</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-5xl mx-auto px-6 lg:px-8 pb-20">
        <div className="rounded-2xl px-8 sm:px-12 py-14 flex items-center justify-between flex-wrap gap-6 relative overflow-hidden" style={{ backgroundColor: config.color }}>
          <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <p className="text-lg text-white">Ready to analyze?</p>
            <p className="text-sm text-white/60 mt-2">Three steps. Takes under 5 minutes.</p>
          </div>
          <button
            onClick={onStart}
            className="relative inline-flex items-center gap-2 bg-white px-7 py-3.5 rounded-lg text-sm hover:bg-white/90 transition-colors"
            style={{ color: config.color }}
          >
            Start Analysis
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 flex items-center justify-between text-xs text-slate-400">
          <span>CKR Decision Platform</span>
          <a href="/" className="hover:text-slate-600 transition-colors">All Tools</a>
        </div>
      </footer>
    </div>
  );
}

// ── Step 0: Define ──────────────────────────────────────────────────────────

function StepDefine({
  config, projectName, setProjectName, criteria, alternatives,
  addCriterion, removeCriterion, updateCriterion,
  addAlternative, removeAlternative, updateAlternative,
  canProceed, onNext,
}: {
  config: ToolConfig;
  projectName: string;
  setProjectName: (v: string) => void;
  criteria: Criterion[];
  alternatives: string[];
  addCriterion: () => void;
  removeCriterion: (i: number) => void;
  updateCriterion: (i: number, field: any, value: any) => void;
  addAlternative: () => void;
  removeAlternative: (i: number) => void;
  updateAlternative: (i: number, v: string) => void;
  canProceed: boolean;
  onNext: () => void;
}) {
  return (
    <div className="space-y-10 animate-fade-in">
      {/* Project Name */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-slate-400 whitespace-nowrap">Project</label>
        <input
          type="text"
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          placeholder={`e.g. Q4 ${config.shortTitle}`}
          className="form-input max-w-sm"
        />
      </div>

      {/* Criteria */}
      <div className="bg-white rounded-xl border border-border">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <p className="text-sm text-primary-dark">{config.criteriaLabel}</p>
          <button onClick={addCriterion} className="text-xs text-accent hover:text-accent-hover transition-colors">
            + Add
          </button>
        </div>

        <div className="divide-y divide-border">
          {criteria.map((c, i) => (
            <div key={i} className="px-6 py-5 group">
              <div className="flex items-start gap-5">
                <span className="text-2xl text-slate-200 w-8 text-right shrink-0 leading-none pt-2">
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0 space-y-4">
                  <input
                    type="text"
                    value={c.name}
                    onChange={e => updateCriterion(i, 'name', e.target.value)}
                    placeholder="Criterion name"
                    className="form-input"
                  />

                  <div className="flex flex-wrap items-end gap-6">
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-2">Direction</p>
                      <div className="inline-flex rounded-lg overflow-hidden border border-border">
                        <button
                          onClick={() => updateCriterion(i, 'type', 'benefit')}
                          className={`flex items-center gap-1.5 px-4 py-2 text-xs transition-all ${
                            c.type === 'benefit'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-white text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                          </svg>
                          Higher is better
                        </button>
                        <button
                          onClick={() => updateCriterion(i, 'type', 'cost')}
                          className={`flex items-center gap-1.5 px-4 py-2 text-xs transition-all border-l border-border ${
                            c.type === 'cost'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-white text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                          Lower is better
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 min-w-[220px]">
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-2">Importance</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-300 w-6 text-right shrink-0">Low</span>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={c.importance}
                          onChange={e => updateCriterion(i, 'importance', parseInt(e.target.value))}
                          className="flex-1 accent-primary-dark"
                        />
                        <span className="text-[11px] text-slate-300 w-10 shrink-0">Critical</span>
                        <span className={`text-lg w-8 text-center tabular-nums ${
                          c.importance >= 8 ? 'text-primary-dark' :
                          c.importance >= 5 ? 'text-slate-500' :
                          'text-slate-300'
                        }`}>
                          {c.importance}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => removeCriterion(i)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-2 rounded-lg hover:bg-red-50 shrink-0"
                  disabled={criteria.length <= 2}
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-border">
          <button
            onClick={addCriterion}
            className="w-full py-3 rounded-lg border border-dashed border-slate-200 text-sm text-slate-400 hover:text-accent hover:border-accent transition-all"
          >
            + Add criterion
          </button>
        </div>
      </div>

      {/* Alternatives */}
      <div className="bg-white rounded-xl border border-border">
        <div className="px-6 py-5 border-b border-border">
          <p className="text-sm text-primary-dark">{config.alternativesLabel}</p>
        </div>

        <div className="px-6 py-5 space-y-3">
          {alternatives.map((alt, i) => (
            <div key={i} className="flex items-center gap-4 group">
              <span className="text-xs text-slate-300 w-5 text-center shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <input
                type="text"
                value={alt}
                onChange={e => updateAlternative(i, e.target.value)}
                placeholder={`${config.alternativeSingular} name`}
                className="form-input flex-1"
              />
              <button
                onClick={() => removeAlternative(i)}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-2 rounded-lg hover:bg-red-50"
                disabled={alternatives.length <= 2}
                title="Remove"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-border">
          <button
            onClick={addAlternative}
            className="w-full py-3 rounded-lg border border-dashed border-slate-200 text-sm text-slate-400 hover:text-accent hover:border-accent transition-all"
          >
            + Add {config.alternativeSingular.toLowerCase()}
          </button>
        </div>
      </div>

      {/* Validation + Next */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm">
          {!canProceed && criteria.some(c => !c.name.trim()) && (
            <span className="text-red-400">All criteria need a name</span>
          )}
        </div>
        <button onClick={onNext} disabled={!canProceed} className="btn btn-primary btn-lg">
          Continue to Scoring
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Step 1: Score ───────────────────────────────────────────────────────────

const SCORE_LABELS: Record<number, string> = {
  1: 'Terrible', 2: 'Very Poor', 3: 'Poor', 4: 'Below Avg',
  5: 'Average', 6: 'Above Avg', 7: 'Good', 8: 'Very Good',
  9: 'Excellent', 10: 'Outstanding',
};

function StepScore({
  config, criteria, alternatives, matrix, updateMatrix,
  onGenerate, onBack, error,
}: {
  config: ToolConfig;
  criteria: Criterion[];
  alternatives: string[];
  matrix: number[][];
  updateMatrix: (ai: number, ci: number, v: number) => void;
  onGenerate: () => void;
  onBack: () => void;
  error?: string | null;
}) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Scale legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-sm text-slate-400">Score scale</span>
        <div className="flex items-center gap-px">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
            <div key={v} className="flex flex-col items-center">
              <div
                className="w-7 h-5 rounded-sm text-[9px] flex items-center justify-center"
                style={{ backgroundColor: scoreColor(v), color: scoreTextColor(v) }}
              >
                {v}
              </div>
              {(v === 1 || v === 5 || v === 10) && (
                <span className="text-[9px] text-slate-300 mt-0.5">{v === 1 ? 'Worst' : v === 5 ? 'Mid' : 'Best'}</span>
              )}
            </div>
          ))}
        </div>
        <span className="text-[11px] text-slate-300">Click any cell to type</span>
      </div>

      {/* Matrix */}
      <div className="bg-white rounded-xl border border-border">
        <div className="px-6 py-5 border-b border-border">
          <p className="text-sm text-primary-dark">
            Rate each {config.alternativeSingular.toLowerCase()} on every criterion
          </p>
          <p className="text-xs text-slate-400 mt-1">
            1 = worst, 10 = best
          </p>
        </div>

        <div className="overflow-x-auto custom-scroll">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="text-left text-xs text-slate-400 px-5 py-3 sticky left-0 bg-slate-50/80 z-10 min-w-[140px]">
                  {config.alternativeSingular}
                </th>
                {criteria.map((c, ci) => (
                  <th key={ci} className="text-center text-xs px-3 py-3 min-w-[100px]">
                    <div className="text-primary-dark">{c.name}</div>
                    <div className={`flex items-center justify-center gap-0.5 mt-1.5 text-[10px] ${
                      c.type === 'benefit' ? 'text-emerald-500' : 'text-amber-500'
                    }`}>
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        {c.type === 'benefit'
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        }
                      </svg>
                      {c.type === 'benefit' ? 'higher' : 'lower'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alternatives.map((alt, ai) => (
                <tr key={ai} className="border-t border-border hover:bg-slate-50/50">
                  <td className="text-sm text-primary-dark px-5 py-3 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-300">
                        {String.fromCharCode(65 + ai)}
                      </span>
                      {alt}
                    </div>
                  </td>
                  {criteria.map((_, ci) => (
                    <td key={ci} className="text-center px-3 py-2">
                      <ScoreInput
                        value={matrix[ai]?.[ci] ?? 5}
                        onChange={v => updateMatrix(ai, ci, v)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-primary-dark transition-colors flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button onClick={onGenerate} className="btn btn-primary btn-lg">
          Generate Report
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Score helpers ────────────────────────────────────────────────────────────

function scoreColor(v: number): string {
  if (v <= 2) return '#fecaca';
  if (v <= 4) return '#fde68a';
  if (v <= 6) return '#e2e8f0';
  if (v <= 8) return '#a7f3d0';
  return '#6ee7b7';
}

function scoreTextColor(v: number): string {
  if (v <= 2) return '#991b1b';
  if (v <= 4) return '#92400e';
  if (v <= 6) return '#334155';
  if (v <= 8) return '#065f46';
  return '#064e3b';
}

// ── Score Input ──────────────────────────────────────────────────────────────

function ScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setLocalVal(String(value));
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const num = parseInt(localVal);
    if (!isNaN(num) && num >= 1 && num <= 10) {
      onChange(num);
    } else {
      setLocalVal(String(value));
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setLocalVal(String(value)); } }}
        className="cell-input w-[60px] border-accent ring-1 ring-accent/20 bg-white"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.select(), 0); }}
      className="cell-input w-[60px] cursor-pointer hover:ring-1 hover:ring-slate-300 transition-all"
      style={{ backgroundColor: scoreColor(value), color: scoreTextColor(value) }}
      title={`${value}/10 - ${SCORE_LABELS[value] || ''}`}
    >
      {value}
    </button>
  );
}
