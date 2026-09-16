'use client';

import { useEffect, useRef, useState } from 'react';
import { TOOL_CONFIGS, type ToolConfig } from '../../lib/tool-configs';
import UserMenu from './UserMenu';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  truck: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 00-.879-2.121l-2.122-2.122A3 3 0 0016.5 9.375H15M9 6h4.5M2.25 9h9.75" />,
  handshake: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />,
  'file-text': <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />,
  'clipboard-check': <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />,
  'bar-chart': <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />,
  building: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />,
  layers: <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />,
  'trending-up': <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />,
  document: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />,
  cpu: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />,
  shield: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />,
};

const ALL_METHODS = [
  'TOPSIS', 'VIKOR', 'PROMETHEE II', 'EDAS', 'MABAC', 'MARCOS',
  'CODAS', 'COPRAS', 'ARAS', 'WASPAS', 'MOORA', 'SAW',
  'CRITIC', 'ENTROPY', 'MEREC', 'SD', 'LOPCOW', 'CILOS',
  'PSI', 'ROV', 'OCRA', 'GRA',
];

// Fixed viz items — always same DOM order so CSS transitions animate widths
const VIZ_ITEMS = [
  { name: 'Option A', color: '#6F00FF' },
  { name: 'Option B', color: '#00B4D8' },
  { name: 'Option C', color: '#06D6A0' },
  { name: 'Option D', color: '#F59E0B' },
  { name: 'Option E', color: '#EF4444' },
];
const VIZ_SCORES = [
  { method: 'TOPSIS',     scores: [88, 72, 94, 61, 79] },
  { method: 'VIKOR',      scores: [75, 91, 68, 84, 72] },
  { method: 'PROMETHEE',  scores: [83, 70, 91, 76, 65] },
  { method: 'EDAS',       scores: [70, 84, 78, 91, 68] },
  { method: 'Aggregated', scores: [82, 79, 85, 77, 71] },
];

interface LandingPageProps {
  userEmail?: string | null;
  planId?: string | null;
}

export default function LandingPage({ userEmail = null, planId = null }: LandingPageProps) {
  const all = Object.values(TOOL_CONFIGS);
  const procurement = all.filter(t => t.category === 'procurement');
  const strategy = all.filter(t => t.category === 'strategy');

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E8E6F5]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between">
          <span className="text-sm text-[#131628] tracking-tight">CKR</span>
          <div className="flex items-center gap-6">
            <a href="#tools" className="text-xs text-[#9B9BC0] hover:text-[#131628] transition-colors uppercase tracking-wider">Tools</a>
            <a href="/researcher" className="text-xs text-[#9B9BC0] hover:text-[#131628] transition-colors uppercase tracking-wider">Researcher</a>
            <UserMenu email={userEmail} planId={planId} />
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="pt-14 bg-[#131628] relative overflow-hidden">
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(111,0,255,0.15) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 20%, #131628 100%)',
        }} />

        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_420px] gap-16 items-center py-20 lg:py-28">

            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 border border-[#6F00FF]/30 bg-[#6F00FF]/10 rounded-full px-3.5 py-1.5 mb-8">
                <div className="w-1.5 h-1.5 rounded-full bg-[#6F00FF] animate-pulse" />
                <span className="text-[11px] text-[#6F00FF]/80 uppercase tracking-widest">Multi-Criteria Decision Analysis</span>
              </div>

              <h1 className="text-4xl sm:text-[3.25rem] leading-[1.06] tracking-tight text-white">
                Rank anything.<br />
                <span className="text-white/25">Defend every choice.</span>
              </h1>

              <p className="text-[15px] text-white/35 mt-7 leading-relaxed max-w-[420px]">
                50+ scientific methods cross-validate your decisions. Get a defensible, auditable ranking backed by TOPSIS, VIKOR, PROMETHEE, and more — in minutes.
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-10">
                <a
                  href="#tools"
                  className="inline-flex items-center gap-2.5 bg-[#6F00FF] text-white px-7 py-3.5 rounded-lg text-sm hover:bg-[#5B00D4] transition-colors shadow-lg shadow-[#6F00FF]/25"
                >
                  Explore tools
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                  </svg>
                </a>
                <a
                  href="/researcher"
                  className="inline-flex items-center gap-2 border border-white/10 text-white/50 hover:text-white hover:border-white/25 px-6 py-3.5 rounded-lg text-sm transition-all"
                >
                  Researcher mode
                </a>
              </div>

              <div className="flex items-center gap-8 mt-12 pt-10 border-t border-white/[0.06]">
                <HeroStat value="50+" label="methods" />
                <HeroStat value="10" label="weighting schemes" />
                <HeroStat value="11" label="tools" />
              </div>
            </div>

            {/* Right — animated viz */}
            <div className="hidden lg:block">
              <RankingViz />
            </div>
          </div>
        </div>
      </header>

      {/* ── Tools ── */}
      <div id="tools" className="bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20 space-y-16">
          <ToolGroup label="Procurement & Vendors" tools={procurement} />
          <ToolGroup label="Strategy & Finance" tools={strategy} extra={<ResearcherCard />} />
        </div>
      </div>

      {/* ── How it works ── */}
      <section className="bg-[#F8F7FF] border-t border-[#E8E6F5]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-24">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-14">
            <div>
              <p className="text-[11px] text-[#9B9BC0] uppercase tracking-[0.2em] mb-3">How it works</p>
              <p className="text-3xl text-[#131628] tracking-tight">Three steps.</p>
              <p className="text-3xl text-[#C5BFEE] tracking-tight">Under five minutes.</p>
            </div>
            <a href="#tools" className="text-xs text-[#9B9BC0] hover:text-[#6F00FF] transition-colors pb-1">
              Go to tools →
            </a>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <StepCard n="01" title="Define" desc="Name your criteria and options. Mark each as higher-is-better or lower-is-better. Assign importance with a simple slider." />
            <StepCard n="02" title="Score" desc="Rate every option 1–10 on each criterion. Color-coded cells show patterns instantly. Click any cell to edit." />
            <StepCard n="03" title="Report" desc="50+ methods rank your options independently. See how strongly they agree, then download a full PDF with every detail." />
          </div>
        </div>
      </section>

      {/* ── Methods ── */}
      <section className="bg-[#131628] border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-[300px,1fr] gap-16 items-start">
            <div>
              <p className="text-[11px] text-white/25 uppercase tracking-[0.2em] mb-4">Under the hood</p>
              <p className="text-xl text-white leading-snug mb-3">Every tool runs the same 50+ method engine.</p>
              <p className="text-sm text-white/30 leading-relaxed">10 objective weighting schemes derive importance from your data. 25+ ranking algorithms evaluate alternatives independently. Results aggregated with Borda count.</p>

              <div className="grid grid-cols-3 gap-3 mt-8">
                {[['50+', 'Methods'], ['10', 'Weight\nschemes'], ['1', 'Consensus\nanswer']].map(([v, l]) => (
                  <div key={v} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <p className="text-xl text-white tabular-nums">{v}</p>
                    <p className="text-[10px] text-white/25 mt-1 uppercase tracking-wider leading-tight whitespace-pre-line">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 content-start pt-1">
              {ALL_METHODS.map(m => (
                <span key={m} className="text-[11px] text-white/30 border border-white/[0.07] hover:border-[#6F00FF]/40 hover:text-[#6F00FF]/70 transition-all px-3 py-1.5 rounded-full cursor-default">{m}</span>
              ))}
              <span className="text-[11px] text-[#6F00FF]/80 border border-[#6F00FF]/30 bg-[#6F00FF]/10 px-3 py-1.5 rounded-full">+ 28 more</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-[#E8E6F5]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 flex items-center justify-between">
          <span className="text-xs text-[#9B9BC0]">Chakaralaya Analytics</span>
          <div className="flex items-center gap-5 text-xs text-[#9B9BC0]">
            <a href="/terms" className="hover:text-[#131628] transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-[#131628] transition-colors">Privacy</a>
            <a href="mailto:ckranalytics@gmail.com" className="hover:text-[#131628] transition-colors">Contact</a>
            <a href="/researcher" className="hover:text-[#131628] transition-colors">Researcher</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Hero Stat ── */
function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl text-white tabular-nums">{value}</p>
      <p className="text-[11px] text-white/25 mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  );
}

/* ── Ranking Viz ── */
function RankingViz() {
  const [phase, setPhase] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const current = VIZ_SCORES[phase];

  useEffect(() => {
    timer.current = setInterval(() => setPhase(p => (p + 1) % VIZ_SCORES.length), 2600);
    return () => clearInterval(timer.current);
  }, []);

  const ranks = current.scores.map(s => current.scores.filter(x => x > s).length + 1);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] text-white/20 uppercase tracking-widest">Live ranking</span>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#6F00FF] animate-pulse" />
          <span className="text-xs text-[#6F00FF] tabular-nums">{current.method}</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {VIZ_ITEMS.map((item, i) => {
          const score = current.scores[i];
          const pct = score;
          return (
            <div key={item.name} className="flex items-center gap-3">
              <span className="text-[11px] text-white/20 w-4 shrink-0 tabular-nums text-right">{ranks[i]}</span>
              <div className="flex-1 h-8 bg-white/[0.04] rounded-md overflow-hidden relative">
                <div
                  className="h-full rounded-md flex items-center pl-3 transition-all duration-700 ease-in-out"
                  style={{ width: `${pct}%`, backgroundColor: item.color + '25', borderLeft: `2px solid ${item.color}60` }}
                >
                  <span className="text-[11px] text-white/60 whitespace-nowrap">{item.name}</span>
                </div>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/20 tabular-nums">{score}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-5">
        {VIZ_SCORES.map((_, i) => (
          <button
            key={i}
            onClick={() => setPhase(i)}
            className={`rounded-full transition-all duration-300 ${i === phase ? 'w-5 h-1.5 bg-[#6F00FF]' : 'w-1.5 h-1.5 bg-white/10 hover:bg-white/25'}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Tool Group ── */
function ToolGroup({ label, tools, extra }: { label: string; tools: ToolConfig[]; extra?: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <p className="text-[11px] text-[#9B9BC0] uppercase tracking-[0.2em]">{label}</p>
        <div className="flex-1 h-px bg-[#E8E6F5]" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(tool => <ToolCard key={tool.slug} tool={tool} />)}
        {extra}
      </div>
    </section>
  );
}

/* ── Tool Card ── */
function ToolCard({ tool }: { tool: ToolConfig }) {
  return (
    <a
      href={`/${tool.slug}`}
      className="group flex flex-col rounded-xl border border-[#E8E6F5] hover:border-[#6F00FF]/30 bg-white hover:shadow-lg hover:shadow-[#6F00FF]/[0.06] transition-all duration-200 overflow-hidden"
    >
      {/* Purple-tinted color bar on hover */}
      <div
        className="h-[3px] w-full transition-opacity duration-200 opacity-60 group-hover:opacity-100"
        style={{ backgroundColor: tool.color }}
      />

      <div className="p-5 flex flex-col flex-1">
        {/* Icon + title */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: tool.color + '12' }}
          >
            <svg className="w-[17px] h-[17px]" style={{ color: tool.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {TOOL_ICONS[tool.icon]}
            </svg>
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm text-[#131628] leading-snug">{tool.shortTitle}</h3>
            <p className="text-[11px] text-[#9B9BC0] mt-0.5">{tool.tagline}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-[#7B7A9D] leading-relaxed mb-4">{tool.description}</p>

        {/* Criteria — show direction */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tool.presetCriteria.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border"
              style={{ color: '#6F00FF', backgroundColor: '#6F00FF0d', borderColor: '#6F00FF25' }}
            >
              <span className={c.type === 'benefit' ? 'text-emerald-500' : 'text-amber-500'}>
                {c.type === 'benefit' ? '↑' : '↓'}
              </span>
              {c.name}
            </span>
          ))}
        </div>

        {/* CTA row */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-[11px] px-3.5 py-1.5 rounded-md bg-[#6F00FF] text-white font-medium group-hover:bg-[#5B00D4] transition-colors">
            Start →
          </span>
          <span className="text-[10px] text-[#C5BFEE] group-hover:text-[#9B9BC0] transition-colors">
            Learn more
          </span>
        </div>
      </div>
    </a>
  );
}

/* ── Researcher Card ── */
function ResearcherCard() {
  return (
    <a
      href="/researcher"
      className="group flex flex-col rounded-xl border border-[#E8E6F5] hover:border-[#6F00FF]/30 bg-[#131628] hover:shadow-lg hover:shadow-[#6F00FF]/[0.08] transition-all duration-200 overflow-hidden"
    >
      <div className="h-[3px] w-full bg-gradient-to-r from-[#6F00FF] to-[#00B4D8] opacity-70 group-hover:opacity-100 transition-opacity" />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
            <svg className="w-[17px] h-[17px] text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
            </svg>
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm text-white leading-snug">Researcher Tool</h3>
            <p className="text-[11px] text-white/30 mt-0.5">Full method control</p>
          </div>
        </div>

        <p className="text-xs text-white/30 leading-relaxed mb-4">
          Pick individual weighting and ranking methods. Compare results side by side. Export to Word. Built for academics and analysts.
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {['AHP', 'CRITIC', 'ENTROPY', 'TOPSIS', 'VIKOR'].map(m => (
            <span key={m} className="text-[10px] px-2 py-0.5 rounded-full border border-white/[0.08] text-white/25 bg-white/[0.04]">{m}</span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-[11px] px-3.5 py-1.5 rounded-md bg-[#6F00FF] text-white font-medium group-hover:bg-[#5B00D4] transition-colors">
            Launch →
          </span>
          <span className="text-[10px] text-white/20 group-hover:text-white/40 transition-colors">
            Learn more
          </span>
        </div>
      </div>
    </a>
  );
}

/* ── Step Card ── */
function StepCard({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E6F5] p-7">
      <div className="w-8 h-8 rounded-lg bg-[#6F00FF] flex items-center justify-center text-white text-[11px] mb-5">{n}</div>
      <h3 className="text-sm text-[#131628] mb-2">{title}</h3>
      <p className="text-sm text-[#7B7A9D] leading-relaxed">{desc}</p>
    </div>
  );
}
