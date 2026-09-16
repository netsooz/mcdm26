import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ToolConfig } from './tool-configs';
import type { AllMethodsResult } from './run-all-methods';
import { competitionRanks } from './methods/ranking';

export function generatePDF(config: ToolConfig, projectName: string, results: AllMethodsResult) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  const { input, weightingResults, rankingResults, aggregated } = results;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let y = 0;

  function addPage() {
    doc.addPage();
    y = margin;
  }

  function checkPageBreak(needed: number) {
    if (y + needed > pageH - margin) addPage();
  }

  function heading(text: string, size: number = 14) {
    checkPageBreak(15);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(text, margin, y);
    y += size * 0.5 + 4;
  }

  function body(text: string) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(text, contentW);
    checkPageBreak(lines.length * 5 + 2);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 2;
  }

  function divider() {
    checkPageBreak(8);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
  }

  // ── Cover Page ──────────────────────────────────────────────────────────
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 100, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(config.title, margin, 45);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(projectName || 'Decision Analysis Report', margin, 58);

  doc.setFontSize(10);
  doc.text(date, margin, 72);

  // Stats bar
  y = 115;
  const stats = [
    { label: 'Methods Used', value: String(rankingResults.length) },
    { label: 'Weighting Schemes', value: String(weightingResults.length) },
    { label: config.alternativesLabel, value: String(input.alternativeNames.length) },
    { label: config.criteriaLabel, value: String(input.criteriaNames.length) },
  ];
  const statW = contentW / stats.length;
  stats.forEach((stat, i) => {
    const x = margin + i * statW;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(stat.value, x + statW / 2, y, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(stat.label, x + statW / 2, y + 7, { align: 'center' });
  });

  y = 145;
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin, y, contentW, 30, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('RECOMMENDED ' + config.alternativeSingular.toUpperCase(), margin + 10, y + 10);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const winnerIdx = aggregated.displayRankings.indexOf(1);
  const winner = aggregated.alternativeNames[winnerIdx];
  doc.text(winner, margin + 10, y + 22);

  const consensus = Math.round(aggregated.consensusLevel * 100);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${consensus}% consensus`, pageW - margin - 10, y + 16, { align: 'right' });

  // ── Table of Contents ──────────────────────────────────────────────────
  addPage();
  heading('Table of Contents', 18);
  y += 5;
  const toc = [
    '1. Executive Summary',
    '2. Input Data',
    '3. Criteria Weights Analysis',
    '4. Aggregated Rankings',
    '5. Individual Method Results',
    '6. Methodology Appendix',
  ];
  toc.forEach(item => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(item, margin + 5, y);
    y += 8;
  });

  // ── 1. Executive Summary ──────────────────────────────────────────────
  addPage();
  heading('1. Executive Summary', 18);
  y += 3;

  body(
    `This report presents a comprehensive multi-criteria decision analysis for ${projectName || 'the given scenario'}. ` +
    `A total of ${rankingResults.length} method-weight combinations were evaluated across ${weightingResults.length} weighting schemes ` +
    `to rank ${input.alternativeNames.length} ${config.alternativesLabel.toLowerCase()} against ${input.criteriaNames.length} ${config.criteriaLabel.toLowerCase()}.`
  );
  y += 3;

  // Calling a single alternative the winner would overstate the result when
  // several share the top position.
  const alsoFirst = aggregated.alternativeNames.filter(
    (_, i) => aggregated.displayRankings[i] === 1 && i !== winnerIdx,
  );

  body(
    `The analysis achieves ${consensus}% consensus across all methods. ` +
    `"${winner}" emerges as the top-ranked ${config.alternativeSingular.toLowerCase()} with an average rank of ` +
    `${aggregated.averageRank[winnerIdx].toFixed(2)} and a Borda score of ` +
    `${aggregated.bordaScores[winnerIdx]}.` +
    (alsoFirst.length > 0
      ? ` It is tied for first with ${alsoFirst.map(n => `"${n}"`).join(', ')}; the methods do not separate them, so the choice between them needs criteria beyond those scored here.`
      : '')
  );

  y += 5;
  heading('Final Rankings', 12);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Rank', config.alternativeSingular, 'Avg. Rank', 'Borda Score']],
    body: aggregated.alternativeNames
      .map((name, i) => ({ name, i, rank: aggregated.displayRankings[i] }))
      .sort((a, b) => a.rank - b.rank)
      .map(({ name, i, rank }) => [
        aggregated.displayRankings.filter(r => r === rank).length > 1 ? `=${rank}` : String(rank),
        name,
        aggregated.averageRank[i].toFixed(2),
        String(aggregated.bordaScores[i]),
      ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: () => { y = margin; },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── 2. Input Data ─────────────────────────────────────────────────────
  checkPageBreak(60);
  heading('2. Input Data', 18);
  y += 3;

  heading('Criteria Definition', 12);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Criterion', 'Type', 'Importance (1-10)']],
    body: input.criteriaNames.map((c, i) => [
      String(i + 1),
      c,
      input.criteriaTypes[i] === 'benefit' ? 'Higher is better' : 'Lower is better',
      String(input.criteriaWeights[i]),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  heading('Decision Matrix', 12);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[config.alternativeSingular, ...input.criteriaNames]],
    body: input.alternativeNames.map((alt, ai) => [
      alt,
      ...input.criteriaNames.map((_, ci) => String(input.matrix[ai][ci])),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── 3. Criteria Weights Analysis ──────────────────────────────────────
  checkPageBreak(40);
  heading('3. Criteria Weights Analysis', 18);
  y += 3;

  body(
    'Multiple objective weighting methods were applied to determine criteria importance. ' +
    'The table below compares weights assigned by each method.'
  );
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Method', ...input.criteriaNames]],
    body: weightingResults.map(wr => [
      wr.method,
      ...wr.weights.map(w => (w * 100).toFixed(1) + '%'),
    ]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── 4. Aggregated Rankings ────────────────────────────────────────────
  checkPageBreak(40);
  heading('4. Aggregated Rankings', 18);
  y += 3;

  body(
    'Rankings are aggregated using average rank and Borda count across all method-weight combinations. ' +
    `Kendall's W coefficient of concordance is ${(aggregated.consensusLevel).toFixed(3)}, indicating ` +
    `${consensus >= 70 ? 'strong' : consensus >= 40 ? 'moderate' : 'weak'} agreement among methods.`
  );
  y += 3;

  heading('Rank Frequency Distribution', 12);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[config.alternativeSingular, ...Array.from({ length: input.alternativeNames.length }, (_, i) => `Rank ${i + 1}`)]],
    body: aggregated.alternativeNames
      .map((name, i) => ({ name, i, rank: aggregated.displayRankings[i] }))
      .sort((a, b) => a.rank - b.rank)
      .map(({ name, i }) => [
        name,
        ...aggregated.rankFrequency[i].map(f => String(f)),
      ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── 5. Individual Method Results ──────────────────────────────────────
  checkPageBreak(30);
  heading('5. Individual Method Results', 18);
  y += 3;

  body('The following tables show the ranking produced by each method-weight combination.');
  y += 3;

  // Split into chunks to avoid enormous tables
  const chunkSize = 20;
  for (let start = 0; start < rankingResults.length; start += chunkSize) {
    const chunk = rankingResults.slice(start, start + chunkSize);

    checkPageBreak(30);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Method', ...input.alternativeNames.map(a => a.substring(0, 15))]],
      body: chunk.map(rr => {
        const display = competitionRanks(rr.rankings);
        return [
          rr.method,
          ...display.map(r =>
            display.filter(o => o === r).length > 1 ? `=${r}` : String(r),
          ),
        ];
      }),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 45 } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── 6. Methodology Appendix ───────────────────────────────────────────
  addPage();
  heading('6. Methodology Appendix', 18);
  y += 3;

  body(
    'This analysis employs a robust multi-method approach to minimize bias from any single decision method. ' +
    'Multiple objective weighting methods determine criteria importance from the data itself, while ' +
    'user-defined importance ratings provide a subjective baseline.'
  );
  y += 3;

  heading('Weighting Methods', 12);
  const weightDescriptions: [string, string][] = [
    ['CRITIC', 'Uses standard deviation and inter-criteria correlation to determine objective weights.'],
    ['ENTROPY', 'Based on Shannon entropy - criteria with more variation receive higher weights.'],
    ['SD', 'Weights are proportional to the standard deviation of each criterion.'],
    ['MEREC', 'Determines weights based on the removal effect of each criterion.'],
    ['LOPCOW', 'Uses logarithmic percentage changes for objective weight determination.'],
    ['CILOS', 'Assigns weights based on criterion impact loss analysis.'],
    ['IDOCRIW', 'Integrates ENTROPY and CILOS for combined objective weights.'],
    ['ITARA', 'Uses indifference thresholds for ratio-based weight analysis.'],
    ['EAMR', 'Based on maximum deviation ratios with equal initial weights.'],
    ['PSI', 'Derives weights from preference selection indices.'],
  ];

  weightDescriptions.forEach(([method, desc]) => {
    checkPageBreak(12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(method, margin + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const descLines = doc.splitTextToSize(desc, contentW - 25);
    doc.text(descLines, margin + 25, y);
    y += Math.max(descLines.length * 4, 5) + 3;
  });

  y += 5;
  heading('Ranking Methods', 12);

  const rankDescriptions: [string, string][] = [
    ['TOPSIS', 'Ranks by closeness to ideal and distance from anti-ideal solution.'],
    ['VIKOR', 'Finds compromise solutions balancing group utility and individual regret.'],
    ['SAW/WSM', 'Simple weighted sum of normalized performance values.'],
    ['WPM', 'Weighted product of performance ratios.'],
    ['WASPAS', 'Combines WSM and WPM approaches.'],
    ['EDAS', 'Evaluates based on distance from average solution.'],
    ['CODAS', 'Combines Euclidean and Taxicab distances from negative-ideal.'],
    ['CoCoSo', 'Combined compromise solution using WSM, WPM, and balanced approach.'],
    ['COPRAS', 'Complex proportional assessment of benefit and cost criteria.'],
    ['MARCOS', 'Ranking by measurement relative to ideal and anti-ideal.'],
    ['MABAC', 'Comparison with border approximation area.'],
    ['MAIRCA', 'Ideal-real comparative analysis.'],
    ['MOORA', 'Multi-objective optimization by ratio analysis.'],
    ['MULTIMOORA', 'Extends MOORA with full multiplicative form.'],
    ['ARAS', 'Additive ratio assessment against optimal alternative.'],
    ['OCRA', 'Operational competitiveness rating analysis.'],
    ['PIV', 'Proximity indexed value method.'],
    ['TODIM', 'Prospect theory-based method considering loss aversion.'],
    ['ROV', 'Ranks by range of value intervals.'],
    ['GRA', 'Grey relational analysis for uncertainty handling.'],
    ['PROMETHEE', 'Outranking based on pairwise preference flows.'],
    ['WISP', 'Weighted integrated sum product method.'],
    ['MOOSRA', 'Ratio analysis for multi-objective optimization.'],
    ['COBRA', 'Comprehensive distance-based ranking.'],
    ['MAUT', 'Multi-attribute utility theory.'],
  ];

  rankDescriptions.forEach(([method, desc]) => {
    checkPageBreak(12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(method, margin + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const descLines = doc.splitTextToSize(desc, contentW - 30);
    doc.text(descLines, margin + 30, y);
    y += Math.max(descLines.length * 4, 5) + 2;
  });

  // ── Footer on each page ───────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by CKR Decision Platform | ${config.title} | ${date}`,
      margin,
      pageH - 10
    );
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 10, { align: 'right' });
  }

  // Save
  const filename = `${config.slug}-report${projectName ? '-' + projectName.replace(/[^a-zA-Z0-9]/g, '-') : ''}.pdf`;
  doc.save(filename);
}
