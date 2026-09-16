import { CRITIC, ENTROPY, SD, MEREC, LOPCOW, CILOS, IDOCRIW, ITARA, EAMR, PSI } from './methods/weighting';
import { RankingMethods, rankScores, competitionRanks } from './methods/ranking';
import type { RankingInput, RankingResult } from './methods/ranking';

export interface BusinessInput {
  criteriaNames: string[];
  criteriaTypes: string[]; // 'benefit' | 'cost'
  criteriaWeights: number[]; // user importance 1-10
  alternativeNames: string[];
  matrix: number[][]; // [alt][crit] performance scores 1-10
}

export interface WeightingMethodResult {
  method: string;
  fullName: string;
  weights: number[];
}

export interface RankingMethodResult {
  method: string;
  fullName: string;
  scores: number[];
  rankings: number[];
}

export interface AggregatedResult {
  alternativeNames: string[];
  averageRank: number[];
  bordaScores: number[];
  /** Average ranks — may be fractional when alternatives tie. For the maths. */
  finalRankings: number[];
  /** Competition ranks (1, 1, 3) derived from the above. For display. */
  displayRankings: number[];
  rankFrequency: number[][]; // [alt][rank] how many times alt got each rank
  consensusLevel: number; // 0-1, higher = more agreement
}

export interface AllMethodsResult {
  input: BusinessInput;
  weightingResults: WeightingMethodResult[];
  rankingResults: RankingMethodResult[];
  aggregated: AggregatedResult;
}

const OBJECTIVE_WEIGHTING_METHODS: {
  key: string;
  fullName: string;
  fn: (matrix: number[][], criteriaTypes: string[]) => { weights: number[] };
  needsTypes: boolean;
}[] = [
  { key: 'CRITIC', fullName: 'CRiteria Importance Through Intercriteria Correlation', fn: (m, t) => CRITIC(m, t), needsTypes: true },
  { key: 'ENTROPY', fullName: 'Shannon Entropy Method', fn: (m) => ENTROPY(m), needsTypes: false },
  { key: 'SD', fullName: 'Standard Deviation Method', fn: (m) => SD(m), needsTypes: false },
  { key: 'MEREC', fullName: 'Method based on Removal Effects of Criteria', fn: (m, t) => MEREC(m, t), needsTypes: true },
  { key: 'LOPCOW', fullName: 'Logarithmic Percentage Change-driven Objective Weighting', fn: (m, t) => LOPCOW(m, t), needsTypes: true },
  { key: 'CILOS', fullName: 'Criterion Impact LOSs', fn: (m, t) => CILOS(m, t), needsTypes: true },
  { key: 'IDOCRIW', fullName: 'Integrated Determination of Objective Criteria Weights', fn: (m, t) => IDOCRIW(m, t), needsTypes: true },
  { key: 'ITARA', fullName: 'Indifference Threshold-based Attribute Ratio Analysis', fn: (m, t) => ITARA(m, t), needsTypes: true },
  { key: 'EAMR', fullName: 'Equally-weighted Absolute-value Maximum-deviation Ratio', fn: (m, t) => EAMR(m, t), needsTypes: true },
  { key: 'PSI', fullName: 'Preference Selection Index', fn: (m, t) => PSI(m, t), needsTypes: true },
];

const RANKING_METHOD_NAMES: Record<string, string> = {
  SAW: 'Simple Additive Weighting',
  WPM: 'Weighted Product Model',
  TOPSIS: 'Technique for Order of Preference by Similarity to Ideal Solution',
  VIKOR: 'VlseKriterijumska Optimizacija I Kompromisno Resenje',
  EDAS: 'Evaluation based on Distance from Average Solution',
  CODAS: 'Combinative Distance-based Assessment',
  CoCoSo: 'Combined Compromise Solution',
  COPRAS: 'Complex Proportional Assessment',
  MARCOS: 'Measurement of Alternatives and Ranking according to Compromise Solution',
  MABAC: 'Multi-Attributive Border Approximation area Comparison',
  MAIRCA: 'Multi-Attributive Ideal-Real Comparative Analysis',
  MOORA: 'Multi-Objective Optimization by Ratio Analysis',
  MULTIMOORA: 'MOORA plus Full Multiplicative Form',
  ARAS: 'Additive Ratio Assessment',
  OCRA: 'Operational Competitiveness Rating',
  PIV: 'Proximity Indexed Value',
  TODIM: 'Interactive Multi-Criteria Decision Making',
  ROV: 'Range of Value',
  GRA: 'Grey Relational Analysis',
  PROMETHEE: 'Preference Ranking Organization Method for Enrichment Evaluation II',
  WISP: 'Weighted Integrated Sum Product',
  MOOSRA: 'Multi-Objective Optimization on basis of Simple Ratio Analysis',
  COBRA: 'Comprehensive Distance Based Ranking',
  MAUT: 'Multi-Attribute Utility Theory',
  WASPAS: 'Weighted Aggregated Sum Product Assessment',
};

// Methods to skip (need special input or produce non-standard output)
const SKIP_RANKING = new Set(['WSM', 'ELECTRE', 'EXPROM', 'RAFSI', 'REGIME']);

function normalizeUserWeights(userWeights: number[]): number[] {
  const s = userWeights.reduce((a, b) => a + b, 0);
  if (s === 0) return userWeights.map(() => 1 / userWeights.length);
  return userWeights.map(w => w / s);
}

export function runAllMethods(input: BusinessInput): AllMethodsResult {
  const { criteriaNames, criteriaTypes, criteriaWeights, alternativeNames, matrix } = input;
  const numAlts = alternativeNames.length;

  // 1. Compute weighting results
  const userNormWeights = normalizeUserWeights(criteriaWeights);
  const weightingResults: WeightingMethodResult[] = [
    { method: 'User Weights', fullName: 'User-defined Importance Ratings', weights: userNormWeights },
  ];

  for (const wm of OBJECTIVE_WEIGHTING_METHODS) {
    try {
      const result = wm.fn(matrix, criteriaTypes);
      if (result.weights && result.weights.length === criteriaNames.length) {
        weightingResults.push({ method: wm.key, fullName: wm.fullName, weights: result.weights });
      }
    } catch {}
  }

  // 2. Run ranking methods with each weighting set
  const rankingResults: RankingMethodResult[] = [];

  for (const wr of weightingResults) {
    const baseInput: RankingInput = {
      matrix,
      weights: wr.weights,
      criteriaTypes,
      criteriaNames,
      alternativeNames,
    };

    for (const [methodKey, methodFn] of Object.entries(RankingMethods)) {
      if (SKIP_RANKING.has(methodKey)) continue;

      try {
        const result = methodFn(baseInput);
        if (
          result.rankings &&
          result.rankings.length === numAlts &&
          result.scores &&
          result.scores.length === numAlts &&
          result.scores.every(Number.isFinite)
        ) {
          const label = weightingResults.length > 1 && wr.method !== 'User Weights'
            ? `${methodKey} (${wr.method})`
            : methodKey;
          rankingResults.push({
            method: label,
            fullName: RANKING_METHOD_NAMES[methodKey] || methodKey,
            scores: result.scores,
            rankings: result.rankings,
          });
        }
      } catch {}
    }
  }

  // 3. Aggregate
  const aggregated = aggregateResults(alternativeNames, rankingResults);

  return { input, weightingResults, rankingResults, aggregated };
}

function aggregateResults(
  alternativeNames: string[],
  rankingResults: RankingMethodResult[]
): AggregatedResult {
  const n = alternativeNames.length;
  const numMethods = rankingResults.length;

  if (numMethods === 0) {
    return {
      alternativeNames,
      averageRank: Array(n).fill(1),
      bordaScores: Array(n).fill(0),
      finalRankings: Array(n).fill(1),
      displayRankings: Array(n).fill(1),
      rankFrequency: Array.from({ length: n }, () => Array(n).fill(0)),
      consensusLevel: 0,
    };
  }

  // Average rank
  const rankSums = new Array(n).fill(0);
  const rankFrequency: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (const rr of rankingResults) {
    const display = competitionRanks(rr.rankings);
    for (let i = 0; i < n; i++) {
      rankSums[i] += rr.rankings[i];
      const rankIdx = display[i] - 1;
      if (rankIdx >= 0 && rankIdx < n) {
        rankFrequency[i][rankIdx]++;
      }
    }
  }

  const averageRank = rankSums.map(s => s / numMethods);

  // Borda count: each method gives (n - rank) points
  const bordaScores = new Array(n).fill(0);
  for (const rr of rankingResults) {
    for (let i = 0; i < n; i++) {
      bordaScores[i] += n - rr.rankings[i];
    }
  }

  // Final rankings based on average rank (lower is better)
  const finalRankings = rankScores(averageRank, true);
  const displayRankings = competitionRanks(finalRankings);

  // Consensus: Kendall's W coefficient of concordance.
  //   W = 12 * S / (m^2 * (n^3 - n))   with S over the rank *sums*.
  // S here is computed over average ranks (rank sum / m), which is smaller by
  // a factor of m^2, so the m^2 in the denominator cancels out. Dividing by
  // maxS *and* multiplying by m, as before, left W scaled down by m — with
  // ~275 method/weight combinations that pinned the reported consensus at 0%.
  const grandMean = (n + 1) / 2;
  let S = 0;
  for (let i = 0; i < n; i++) {
    S += (averageRank[i] - grandMean) ** 2;
  }
  const spread = n * n * n - n;
  const consensusLevel = spread > 0 ? Math.min(1, (12 * S) / spread) : 1;

  return {
    alternativeNames,
    averageRank,
    bordaScores,
    finalRankings,
    displayRankings,
    rankFrequency,
    consensusLevel,
  };
}
