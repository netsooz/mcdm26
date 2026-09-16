'use client';

import { useState } from 'react';
import type { ToolConfig } from '../../lib/tool-configs';
import type { AllMethodsResult } from '../../lib/run-all-methods';
import { competitionRanks } from '../../lib/methods/ranking';
import DownloadGate from './DownloadGate';

interface ReportPreviewProps {
  config: ToolConfig;
  projectName: string;
  results: AllMethodsResult;
  onNewAnalysis?: () => void;
}

export default function ReportPreview({ config, projectName, results, onNewAnalysis }: ReportPreviewProps) {
  const [generating, setGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { input, weightingResults, rankingResults, aggregated } = results;
  const winnerIdx = aggregated.displayRankings.indexOf(1);
  const winner = aggregated.alternativeNames[winnerIdx];
  const alsoFirst = aggregated.alternativeNames.filter(
    (_, i) => aggregated.displayRankings[i] === 1 && i !== winnerIdx,
  );
  const consensus = Math.round(aggregated.consensusLevel * 100);

  const doDownload = async () => {
    setGenerating(true);
    setDownloadError(null);
    try {
      const { generatePDF } = await import('../../lib/pdf-export');
      generatePDF(config, projectName, results);
      setDownloaded(true);
    } catch (e) {
      console.error('PDF generation error:', e);
      setDownloadError(
        e instanceof Error ? e.message : 'The PDF could not be generated. Please try again.',
      );
    }
    setGenerating(false);
  };

  const handleDownloadPDF = () => {
    setShowGate(true);
  };

  const handleAuthorized = () => {
    setShowGate(false);
    doDownload();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Winner card */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {/* Stats row */}
        <div className="px-6 py-5 flex flex-wrap gap-10">
          <Stat label="Methods" value={String(rankingResults.length)} />
          <Stat label="Weight Schemes" value={String(weightingResults.length)} />
          <Stat label={config.alternativesLabel} value={String(input.alternativeNames.length)} />
          <Stat label={config.criteriaLabel} value={String(input.criteriaNames.length)} />
        </div>

        {/* Winner */}
        <div className="mx-6 mb-6 p-6 rounded-xl bg-primary-dark text-white">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">
                Top-Ranked {config.alternativeSingular}
              </p>
              <p className="text-2xl text-white tracking-tight">{winner}</p>
              {alsoFirst.length > 0 && (
                <p className="text-xs text-amber-300/80 mt-1.5">
                  Tied for first with {alsoFirst.join(', ')} — the methods do not separate them.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-6 mt-4">
                <MiniStat label="Avg. Rank" value={aggregated.averageRank[winnerIdx].toFixed(2)} />
                <MiniStat label="Borda" value={String(aggregated.bordaScores[winnerIdx])} />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">Consensus</span>
                  <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${consensus >= 70 ? 'bg-emerald-400' : consensus >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${consensus}%` }}
                    />
                  </div>
                  <span className={`text-xs ${consensus >= 70 ? 'text-emerald-400' : consensus >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                    {consensus}%
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleDownloadPDF}
              disabled={generating}
              className="inline-flex items-center gap-2 bg-white text-primary-dark hover:bg-slate-100 px-5 py-3 text-sm rounded-lg transition-colors shrink-0"
            >
              {generating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Generating...
                </>
              ) : downloaded ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Download Again
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Rankings table */}
      <div className="bg-white rounded-xl border border-border">
        <div className="px-6 py-5 border-b border-border">
          <p className="text-sm text-primary-dark">Aggregated Rankings</p>
          <p className="text-xs text-slate-400 mt-1">Combined across all {rankingResults.length} method-weight combinations</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="text-left text-xs text-slate-400 px-5 py-3 w-16">Rank</th>
                <th className="text-left text-xs text-slate-400 px-5 py-3">{config.alternativeSingular}</th>
                <th className="text-center text-xs text-slate-400 px-4 py-3">Avg. Rank</th>
                <th className="text-center text-xs text-slate-400 px-4 py-3">Borda</th>
                <th className="text-left text-xs text-slate-400 px-4 py-3">Rank Distribution</th>
              </tr>
            </thead>
            <tbody>
              {aggregated.alternativeNames
                .map((name, i) => ({
                  name,
                  i,
                  rank: aggregated.displayRankings[i],
                  tied: aggregated.displayRankings.filter(r => r === aggregated.displayRankings[i]).length > 1,
                }))
                .sort((a, b) => a.rank - b.rank || a.i - b.i)
                .map(({ name, i, rank, tied }) => (
                  <tr key={i} className={`border-t border-border ${rank === 1 ? 'bg-slate-50/50' : ''}`}>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                        rank === 1 ? 'bg-primary-dark text-white' :
                        rank === 2 ? 'bg-slate-200 text-slate-600' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {tied ? `=${rank}` : rank}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-primary-dark">{name}</td>
                    <td className="px-4 py-3 text-sm text-center font-mono text-slate-500">{aggregated.averageRank[i].toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-center font-mono text-slate-500">{aggregated.bordaScores[i]}</td>
                    <td className="px-4 py-3">
                      <RankDistBar freq={aggregated.rankFrequency[i]} total={rankingResults.length} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weights comparison */}
      <div className="bg-white rounded-xl border border-border">
        <div className="px-6 py-5 border-b border-border">
          <p className="text-sm text-primary-dark">Criteria Weights</p>
          <p className="text-xs text-slate-400 mt-1">How different methods assign importance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="text-left text-xs text-slate-400 px-5 py-3">Method</th>
                {input.criteriaNames.map((c, i) => (
                  <th key={i} className="text-center text-xs text-primary-dark px-3 py-3">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weightingResults.map((wr, wi) => {
                const maxW = Math.max(...wr.weights);
                return (
                  <tr key={wi} className="border-t border-border">
                    <td className="px-5 py-2.5 text-xs text-primary-dark whitespace-nowrap">{wr.method}</td>
                    {wr.weights.map((w, j) => (
                      <td key={j} className="px-3 py-2.5 text-center">
                        <span className={`text-xs font-mono ${w === maxW ? 'text-primary-dark' : 'text-slate-400'}`}>
                          {(w * 100).toFixed(1)}%
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Methods */}
      <MethodResultsSection config={config} rankingResults={rankingResults} alternativeNames={aggregated.alternativeNames} />

      {/* Bottom actions */}
      <div className="bg-primary-dark rounded-xl p-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <p className="text-sm text-white/40">Full PDF includes all method details, rank frequency, and methodology appendix.</p>
          <button
            onClick={handleDownloadPDF}
            disabled={generating}
            className="inline-flex items-center gap-2 bg-white text-primary-dark hover:bg-slate-100 px-6 py-3 text-sm rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {downloaded ? 'Download PDF Again' : 'Download Full Report'}
          </button>
        </div>
        {downloadError && (
          <p className="mt-4 text-sm text-red-300">{downloadError}</p>
        )}
        <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-4 flex-wrap">
          {onNewAnalysis && (
            <button
              onClick={onNewAnalysis}
              className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Analysis
            </button>
          )}
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
            </svg>
            Back to All Tools
          </a>
        </div>
      </div>

      {showGate && (
        <DownloadGate
          profileType="business"
          onAuthorized={handleAuthorized}
          onClose={() => setShowGate(false)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xl text-primary-dark tabular-nums">{value}</div>
      <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-xs text-white tabular-nums">{value}</span>
    </div>
  );
}

function RankDistBar({ freq, total }: { freq: number[]; total: number }) {
  const colors = ['#0f172a', '#1e293b', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'];
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-4 rounded overflow-hidden w-36">
        {freq.map((count, rank) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={rank}
              className="flex items-center justify-center text-[8px]"
              style={{
                width: `${pct}%`,
                backgroundColor: colors[Math.min(rank, colors.length - 1)],
                color: rank < 2 ? 'white' : '#0f172a',
              }}
              title={`Rank ${rank + 1}: ${count} times (${pct.toFixed(0)}%)`}
            >
              {pct >= 15 ? `#${rank + 1}` : ''}
            </div>
          );
        })}
      </div>
      <span className="text-[10px] text-slate-400 whitespace-nowrap">
        #{freq.indexOf(Math.max(...freq)) + 1} most often
      </span>
    </div>
  );
}

function MethodResultsSection({
  config, rankingResults, alternativeNames,
}: {
  config: ToolConfig;
  rankingResults: { method: string; fullName: string; scores: number[]; rankings: number[] }[];
  alternativeNames: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const displayResults = expanded ? rankingResults : rankingResults.slice(0, 8);

  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm text-primary-dark">Individual Method Results</p>
          <p className="text-xs text-slate-400 mt-1">{rankingResults.length} method-weight combinations</p>
        </div>
        {rankingResults.length > 8 && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-accent hover:text-accent-hover transition-colors">
            {expanded ? 'Show Less' : `Show All ${rankingResults.length}`}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="text-left text-xs text-slate-400 px-5 py-3">Method</th>
              {alternativeNames.map((a, i) => (
                <th key={i} className="text-center text-xs text-primary-dark px-3 py-3">{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayResults.map((rr, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-5 py-2.5 text-xs text-primary-dark whitespace-nowrap" title={rr.fullName}>
                  {rr.method}
                </td>
                {competitionRanks(rr.rankings).map((rank, j, all) => {
                  const tied = all.filter(r => r === rank).length > 1;
                  return (
                    <td key={j} className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] ${
                        rank === 1 ? 'bg-primary-dark text-white' : 'text-slate-400'
                      }`}>
                        {tied ? `=${rank}` : rank}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
