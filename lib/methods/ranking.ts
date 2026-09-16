// MCDM Ranking Methods - Complete implementations of 29 methods

export interface RankingInput {
  matrix: number[][];
  weights: number[];
  criteriaTypes: string[];
  criteriaNames: string[];
  alternativeNames: string[];
  [key: string]: any; // method-specific params
}

export interface RankingResult {
  scores: number[];
  rankings: number[];
  details: Record<string, any>;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Scores this close together are treated as tied rather than ordered. */
const TIE_EPSILON = 1e-9;

function nearlyEqual(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  if (diff === 0) return true;
  return diff <= TIE_EPSILON * Math.max(Math.abs(a), Math.abs(b), 1);
}

/**
 * Rank an array of scores, giving tied scores the same rank.
 *
 * Ties take the *average* of the positions they span (1, 2.5, 2.5, 4) rather
 * than distinct consecutive ranks. Assigning distinct ranks would break ties
 * by array order — a systematic advantage for whichever alternative the user
 * happened to enter first — and average ranks keep the rank total fixed at
 * n(n+1)/2, which is what the Borda, average-rank and Kendall's W aggregation
 * downstream assumes. Use `competitionRanks` to render these for humans.
 *
 * @param scores  Numeric scores for each alternative.
 * @param ascending If true, lower score => rank 1 (default false: higher => rank 1).
 */
export function rankScores(scores: number[], ascending = false): number[] {
  const indexed = scores.map((s, i) => ({ s, i }));
  indexed.sort((a, b) => (ascending ? a.s - b.s : b.s - a.s));
  const ranks = new Array<number>(scores.length);

  let start = 0;
  while (start < indexed.length) {
    let end = start + 1;
    while (end < indexed.length && nearlyEqual(indexed[end].s, indexed[start].s)) end++;
    // Positions start+1..end (1-based) are tied, so they share the mean rank.
    const midRank = (start + end + 1) / 2;
    for (let k = start; k < end; k++) ranks[indexed[k].i] = midRank;
    start = end;
  }

  return ranks;
}

/**
 * Turn average ranks into competition ranks — the "1, 1, 3" form people expect
 * to read, where tied alternatives share the best position they span. Rank 1
 * always exists here, which average ranks cannot guarantee (a three-way tie for
 * first averages to 2), so this is what display and winner lookups should use.
 */
export function competitionRanks(ranks: number[]): number[] {
  return ranks.map(r => 1 + ranks.filter(other => other < r - TIE_EPSILON).length);
}

/** True when at least one other alternative shares this alternative's rank. */
export function isTiedRank(ranks: number[], index: number): boolean {
  return ranks.some((r, i) => i !== index && nearlyEqual(r, ranks[index]));
}

function isBenefit(type: string): boolean {
  const t = type.toLowerCase();
  return t === 'benefit' || t === 'max' || t === '+' || t === 'b';
}

function colMin(matrix: number[][], j: number): number {
  let m = Infinity;
  for (let i = 0; i < matrix.length; i++) m = Math.min(m, matrix[i][j]);
  return m;
}

function colMax(matrix: number[][], j: number): number {
  let m = -Infinity;
  for (let i = 0; i < matrix.length; i++) m = Math.max(m, matrix[i][j]);
  return m;
}

function colValues(matrix: number[][], j: number): number[] {
  return matrix.map((row) => row[j]);
}

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function taxicab(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum;
}

function geometricMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let product = 1;
  for (const v of arr) product *= v;
  return Math.pow(product, 1 / arr.length);
}

// ---------------------------------------------------------------------------
// Method implementations
// ---------------------------------------------------------------------------

function SAW(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;
  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      if (isBenefit(criteriaTypes[j])) {
        return maxs[j] === 0 ? 0 : x / maxs[j];
      }
      return x === 0 ? 0 : mins[j] / x;
    })
  );

  const scores = norm.map((row) =>
    row.reduce((sum, v, j) => sum + v * weights[j], 0)
  );
  const rankings = rankScores(scores);

  return { scores, rankings, details: { normalizedMatrix: norm } };
}

function WPM(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;
  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      if (isBenefit(criteriaTypes[j])) {
        return maxs[j] === 0 ? 0 : x / maxs[j];
      }
      return x === 0 ? 0 : mins[j] / x;
    })
  );

  const scores = norm.map((row) =>
    row.reduce((prod, v, j) => prod * Math.pow(v, weights[j]), 1)
  );
  const rankings = rankScores(scores);

  return { scores, rankings, details: { normalizedMatrix: norm } };
}

function TOPSIS(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Vector normalization
  const colNorms = Array.from({ length: n }, (_, j) => {
    let sum = 0;
    for (let i = 0; i < m; i++) sum += matrix[i][j] ** 2;
    return Math.sqrt(sum);
  });

  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => (colNorms[j] === 0 ? 0 : x / colNorms[j]))
  );

  // Weighted normalized
  const weighted: number[][] = norm.map((row) =>
    row.map((v, j) => v * weights[j])
  );

  // Ideal best and worst
  const idealBest = Array.from({ length: n }, (_, j) => {
    const col = weighted.map((r) => r[j]);
    return isBenefit(criteriaTypes[j]) ? Math.max(...col) : Math.min(...col);
  });
  const idealWorst = Array.from({ length: n }, (_, j) => {
    const col = weighted.map((r) => r[j]);
    return isBenefit(criteriaTypes[j]) ? Math.min(...col) : Math.max(...col);
  });

  const sPlus = weighted.map((row) => euclidean(row, idealBest));
  const sMinus = weighted.map((row) => euclidean(row, idealWorst));

  const scores = sPlus.map((sp, i) => {
    const denom = sp + sMinus[i];
    return denom === 0 ? 0 : sMinus[i] / denom;
  });

  const rankings = rankScores(scores);

  return {
    scores,
    rankings,
    details: { weightedMatrix: weighted, idealBest, idealWorst, sPlus, sMinus },
  };
}

function VIKOR(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const v: number = input.v ?? 0.5;
  const m = matrix.length;
  const n = weights.length;

  const fStar = Array.from({ length: n }, (_, j) => {
    const col = colValues(matrix, j);
    return isBenefit(criteriaTypes[j]) ? Math.max(...col) : Math.min(...col);
  });
  const fMinus = Array.from({ length: n }, (_, j) => {
    const col = colValues(matrix, j);
    return isBenefit(criteriaTypes[j]) ? Math.min(...col) : Math.max(...col);
  });

  const S: number[] = [];
  const R: number[] = [];

  for (let i = 0; i < m; i++) {
    let si = 0;
    let ri = 0;
    for (let j = 0; j < n; j++) {
      const denom = fStar[j] - fMinus[j];
      const val = denom === 0 ? 0 : (weights[j] * Math.abs(fStar[j] - matrix[i][j])) / Math.abs(denom);
      si += val;
      ri = Math.max(ri, val);
    }
    S.push(si);
    R.push(ri);
  }

  const sStar = Math.min(...S);
  const sMinus = Math.max(...S);
  const rStar = Math.min(...R);
  const rMinus = Math.max(...R);

  const Q = S.map((si, i) => {
    const sPart = sMinus - sStar === 0 ? 0 : (si - sStar) / (sMinus - sStar);
    const rPart = rMinus - rStar === 0 ? 0 : (R[i] - rStar) / (rMinus - rStar);
    return v * sPart + (1 - v) * rPart;
  });

  const rankings = rankScores(Q, true); // lower Q is better

  // Check compromise conditions
  const sortedQ = [...Q].sort((a, b) => a - b);
  const dq = m <= 2 ? 1 : 1 / (m - 1);
  const c1 = sortedQ.length >= 2 ? sortedQ[1] - sortedQ[0] >= dq : true;

  const qMinIdx = Q.indexOf(Math.min(...Q));
  const sMinIdx = S.indexOf(Math.min(...S));
  const rMinIdx = R.indexOf(Math.min(...R));
  const c2 = qMinIdx === sMinIdx || qMinIdx === rMinIdx;

  return {
    scores: Q,
    rankings,
    details: { S, R, Q, v, compromiseC1: c1, compromiseC2: c2, fStar, fMinus },
  };
}

function PROMETHEE(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Usual preference function: P(a,b) = 1 if d > 0, else 0
  // pi(a,b) = sum wj * Pj(a,b)
  const pi: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));

  for (let a = 0; a < m; a++) {
    for (let b = 0; b < m; b++) {
      if (a === b) continue;
      let pab = 0;
      for (let j = 0; j < n; j++) {
        const d = isBenefit(criteriaTypes[j])
          ? matrix[a][j] - matrix[b][j]
          : matrix[b][j] - matrix[a][j];
        if (d > 0) pab += weights[j];
      }
      pi[a][b] = pab;
    }
  }

  const positiveFlow = pi.map((row) => row.reduce((s, v) => s + v, 0) / (m - 1));
  const negativeFlow = Array.from({ length: m }, (_, i) => {
    let sum = 0;
    for (let a = 0; a < m; a++) sum += pi[a][i];
    return sum / (m - 1);
  });
  const netFlow = positiveFlow.map((p, i) => p - negativeFlow[i]);

  const scores = netFlow;
  const rankings = rankScores(scores);

  return {
    scores,
    rankings,
    details: { positiveFlow, negativeFlow, netFlow, preferenceMatrix: pi },
  };
}

function ELECTRE(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Vector normalization
  const colNorms = Array.from({ length: n }, (_, j) => {
    let s = 0;
    for (let i = 0; i < m; i++) s += matrix[i][j] ** 2;
    return Math.sqrt(s);
  });
  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => (colNorms[j] === 0 ? 0 : x / colNorms[j]))
  );
  const weighted = norm.map((row) => row.map((v, j) => v * weights[j]));

  // Concordance matrix
  const concordance: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  const discordance: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));

  for (let a = 0; a < m; a++) {
    for (let b = 0; b < m; b++) {
      if (a === b) continue;
      let cSet = 0;
      let maxDiscord = 0;
      let maxDiff = 0;
      for (let j = 0; j < n; j++) {
        const diff = isBenefit(criteriaTypes[j])
          ? weighted[a][j] - weighted[b][j]
          : weighted[b][j] - weighted[a][j];
        if (diff >= 0) {
          cSet += weights[j];
        }
        const absDiff = Math.abs(weighted[a][j] - weighted[b][j]);
        if (diff < 0) maxDiscord = Math.max(maxDiscord, absDiff);
        maxDiff = Math.max(maxDiff, absDiff);
      }
      concordance[a][b] = cSet;
      discordance[a][b] = maxDiff === 0 ? 0 : maxDiscord / maxDiff;
    }
  }

  // Threshold: mean values
  let cSum = 0;
  let dSum = 0;
  const pairs = m * (m - 1);
  for (let a = 0; a < m; a++) {
    for (let b = 0; b < m; b++) {
      if (a === b) continue;
      cSum += concordance[a][b];
      dSum += discordance[a][b];
    }
  }
  const cThreshold = cSum / pairs;
  const dThreshold = dSum / pairs;

  // Outranking
  const outranking: boolean[][] = Array.from({ length: m }, () => new Array(m).fill(false));
  for (let a = 0; a < m; a++) {
    for (let b = 0; b < m; b++) {
      if (a === b) continue;
      if (concordance[a][b] >= cThreshold && discordance[a][b] <= dThreshold) {
        outranking[a][b] = true;
      }
    }
  }

  // Kernel: alternatives that are not outranked by any kernel member
  // Compute dominance scores for ranking
  const dominanceScores = Array.from({ length: m }, (_, a) => {
    let outranks = 0;
    let outranked = 0;
    for (let b = 0; b < m; b++) {
      if (a === b) continue;
      if (outranking[a][b]) outranks++;
      if (outranking[b][a]) outranked++;
    }
    return outranks - outranked;
  });

  // Kernel: alternatives not outranked by any other
  const kernel: number[] = [];
  for (let a = 0; a < m; a++) {
    let isOutranked = false;
    for (let b = 0; b < m; b++) {
      if (a !== b && outranking[b][a]) {
        isOutranked = true;
        break;
      }
    }
    if (!isOutranked) kernel.push(a);
  }

  const scores = dominanceScores;
  const rankings = rankScores(scores);

  return {
    scores,
    rankings,
    details: { concordance, discordance, cThreshold, dThreshold, outranking, kernel },
  };
}

function EDAS(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Average solution
  const AV = Array.from({ length: n }, (_, j) => {
    let sum = 0;
    for (let i = 0; i < m; i++) sum += matrix[i][j];
    return sum / m;
  });

  // PDA and NDA
  const PDA: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      if (isBenefit(criteriaTypes[j])) {
        return AV[j] === 0 ? 0 : Math.max(0, x - AV[j]) / AV[j];
      }
      return AV[j] === 0 ? 0 : Math.max(0, AV[j] - x) / AV[j];
    })
  );
  const NDA: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      if (isBenefit(criteriaTypes[j])) {
        return AV[j] === 0 ? 0 : Math.max(0, AV[j] - x) / AV[j];
      }
      return AV[j] === 0 ? 0 : Math.max(0, x - AV[j]) / AV[j];
    })
  );

  const SP = PDA.map((row) => row.reduce((s, v, j) => s + v * weights[j], 0));
  const SN = NDA.map((row) => row.reduce((s, v, j) => s + v * weights[j], 0));

  const maxSP = Math.max(...SP);
  const maxSN = Math.max(...SN);

  const NSP = SP.map((v) => (maxSP === 0 ? 0 : v / maxSP));
  const NSN = SN.map((v) => (maxSN === 0 ? 0 : 1 - v / maxSN));

  const scores = NSP.map((nsp, i) => (nsp + NSN[i]) / 2);
  const rankings = rankScores(scores);

  return { scores, rankings, details: { AV, PDA, NDA, SP, SN, NSP, NSN } };
}

function CODAS(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const tau: number = input.tau ?? 0.02;
  const m = matrix.length;
  const n = weights.length;

  // Linear normalization
  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      if (isBenefit(criteriaTypes[j])) {
        const denom = maxs[j] - mins[j];
        return denom === 0 ? 0 : (x - mins[j]) / denom;
      }
      const denom = maxs[j] - mins[j];
      return denom === 0 ? 0 : (maxs[j] - x) / denom;
    })
  );

  // Weighted normalized
  const weighted = norm.map((row) => row.map((v, j) => v * weights[j]));

  // Negative ideal solution
  const nis = Array.from({ length: n }, (_, j) => {
    let minV = Infinity;
    for (let i = 0; i < m; i++) minV = Math.min(minV, weighted[i][j]);
    return minV;
  });

  // Euclidean and Taxicab distances from NIS
  const E = weighted.map((row) => euclidean(row, nis));
  const T = weighted.map((row) => taxicab(row, nis));

  // Assessment score: H(a,b)
  const H: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let k = 0; k < m; k++) {
      const eDiff = E[i] - E[k];
      const tDiff = T[i] - T[k];
      const psi = Math.abs(eDiff) >= tau ? eDiff : tDiff;
      H[i][k] = psi;
    }
  }

  const scores = H.map((row) => row.reduce((s, v) => s + v, 0));
  const rankings = rankScores(scores);

  return { scores, rankings, details: { nis, E, T, H, tau } };
}

function CoCoSo(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  // Min-max normalization
  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      const denom = maxs[j] - mins[j];
      if (denom === 0) return 0;
      if (isBenefit(criteriaTypes[j])) {
        return (x - mins[j]) / denom;
      }
      return (maxs[j] - x) / denom;
    })
  );

  // WSM-type score Si
  const S = norm.map((row) => row.reduce((s, v, j) => s + v * weights[j], 0));

  // WPM-type score Pi
  const P = norm.map((row) =>
    row.reduce((prod, v, j) => prod * Math.pow(v, weights[j]), 1)
  );

  // Three aggregation strategies
  const sumSP = S.map((si, i) => si + P[i]);
  const sumSPTotal = sumSP.reduce((a, b) => a + b, 0);

  const ka = sumSP.map((v) => (sumSPTotal === 0 ? 0 : v / sumSPTotal));

  const maxS = Math.max(...S);
  const maxP = Math.max(...P);
  const kb = S.map((si, i) => (maxS === 0 ? 0 : si / maxS) + (maxP === 0 ? 0 : P[i] / maxP));

  const lambda = 0.5;
  const kc = S.map((si, i) => {
    const val = lambda * si + (1 - lambda) * P[i];
    const denom = lambda * maxS + (1 - lambda) * maxP;
    return denom === 0 ? 0 : val / denom;
  });

  const scores = ka.map((_, i) => Math.pow(ka[i] * kb[i] * kc[i], 1 / 3) + (ka[i] + kb[i] + kc[i]) / 3);
  const rankings = rankScores(scores);

  return { scores, rankings, details: { S, P, ka, kb, kc } };
}

function COPRAS(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Proportional normalization: rij = xij / sum(xij)
  const colSums = Array.from({ length: n }, (_, j) => {
    let s = 0;
    for (let i = 0; i < m; i++) s += matrix[i][j];
    return s;
  });

  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => (colSums[j] === 0 ? 0 : x / colSums[j]))
  );

  // Weighted normalized
  const weighted = norm.map((row) => row.map((v, j) => v * weights[j]));

  // S+ and S-
  const sPlus = weighted.map((row) =>
    row.reduce((s, v, j) => (isBenefit(criteriaTypes[j]) ? s + v : s), 0)
  );
  const sMinus = weighted.map((row) =>
    row.reduce((s, v, j) => (!isBenefit(criteriaTypes[j]) ? s + v : s), 0)
  );

  // Qi = S+i + (Smin- * sum(S-)) / (S-i * sum(Smin- / S-i))
  const sumSMinus = sMinus.reduce((a, b) => a + b, 0);
  const sumInvSMinus = sMinus.reduce((s, v) => s + (v === 0 ? 0 : 1 / v), 0);

  const Q = sPlus.map((sp, i) => {
    if (sMinus[i] === 0) return sp;
    return sp + sumSMinus / (sMinus[i] * sumInvSMinus);
  });

  const maxQ = Math.max(...Q);
  const scores = Q.map((qi) => (maxQ === 0 ? 0 : (qi / maxQ) * 100));
  const rankings = rankScores(scores);

  return { scores, rankings, details: { sPlus, sMinus, Q, utilityDegree: scores } };
}

function MARCOS(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  // Anti-ideal (AAI) and Ideal (AI)
  const AAI = Array.from({ length: n }, (_, j) =>
    isBenefit(criteriaTypes[j]) ? mins[j] : maxs[j]
  );
  const AI = Array.from({ length: n }, (_, j) =>
    isBenefit(criteriaTypes[j]) ? maxs[j] : mins[j]
  );

  // Extended matrix: [AAI, ...alternatives, AI]
  const extended = [AAI, ...matrix, AI];

  // Normalization: benefit: xij / AI_j, cost: AI_j / xij
  const norm: number[][] = extended.map((row) =>
    row.map((x, j) => {
      if (isBenefit(criteriaTypes[j])) {
        return AI[j] === 0 ? 0 : x / AI[j];
      }
      return x === 0 ? 0 : AI[j] / x;
    })
  );

  // Weighted
  const weighted = norm.map((row) => row.map((v, j) => v * weights[j]));

  // Si = sum of weighted values
  const S = weighted.map((row) => row.reduce((s, v) => s + v, 0));

  const sAAI = S[0];
  const sAI = S[S.length - 1];
  const altS = S.slice(1, -1);

  // Ki+ and Ki-
  const kPlus = altS.map((si) => (sAI === 0 ? 0 : si / sAI));
  const kMinus = altS.map((si) => (sAAI === 0 ? 0 : si / sAAI));

  // f(Ki) = (Ki+ + Ki-) / (1 + (1 - f(Ki+))/f(Ki+) + (1 - f(Ki-))/f(Ki-))
  const scores = kPlus.map((kp, i) => {
    const km = kMinus[i];
    const sum = kp + km;
    const denom1 = kp === 0 ? Infinity : (1 - kp) / kp;
    const denom2 = km === 0 ? Infinity : (1 - km) / km;
    const denomTotal = 1 + denom1 + denom2;
    return denomTotal === Infinity || denomTotal === 0 ? 0 : sum / denomTotal;
  });

  const rankings = rankScores(scores);

  return { scores, rankings, details: { AAI, AI, altS, kPlus, kMinus } };
}

function MABAC(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  // Normalization
  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      const denom = maxs[j] - mins[j];
      if (denom === 0) return 0;
      if (isBenefit(criteriaTypes[j])) {
        return (x - mins[j]) / denom;
      }
      return (maxs[j] - x) / denom;
    })
  );

  // Weighted: vij = wj * (nij + 1)
  const weighted = norm.map((row) => row.map((v, j) => weights[j] * (v + 1)));

  // Border approximation area (geometric mean per criterion)
  const G = Array.from({ length: n }, (_, j) => {
    let product = 1;
    for (let i = 0; i < m; i++) product *= weighted[i][j];
    return Math.pow(product, 1 / m);
  });

  // Distance from border: qij = vij - gj
  const Q: number[][] = weighted.map((row) => row.map((v, j) => v - G[j]));

  const scores = Q.map((row) => row.reduce((s, v) => s + v, 0));
  const rankings = rankScores(scores);

  return { scores, rankings, details: { normalizedMatrix: norm, weighted, G, Q } };
}

function MAIRCA(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Theoretical rating: Tp = 1/m for each alternative
  const Tp = 1 / m;

  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  // Theoretical weighted: Tpj = Tp * wj
  const Tpj = weights.map((w) => Tp * w);

  // Normalized performance
  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      const denom = maxs[j] - mins[j];
      if (denom === 0) return 0;
      if (isBenefit(criteriaTypes[j])) {
        return (x - mins[j]) / denom;
      }
      return (maxs[j] - x) / denom;
    })
  );

  // Real rating: Trij = Tpj * nij
  const Tr: number[][] = norm.map((row) => row.map((v, j) => Tpj[j] * v));

  // Gap matrix: Gij = Tpj - Trij
  const gap: number[][] = Tr.map((row) => row.map((v, j) => Tpj[j] - v));

  // Sum of gaps (lower is better)
  const scores = gap.map((row) => row.reduce((s, v) => s + v, 0));
  const rankings = rankScores(scores, true);

  return { scores, rankings, details: { Tp, Tpj, gap } };
}

function MOORA(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Vector normalization
  const colNorms = Array.from({ length: n }, (_, j) => {
    let s = 0;
    for (let i = 0; i < m; i++) s += matrix[i][j] ** 2;
    return Math.sqrt(s);
  });

  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => (colNorms[j] === 0 ? 0 : x / colNorms[j]))
  );

  // Ratio system: benefit sum - cost sum
  const scores = norm.map((row) => {
    let benefit = 0;
    let cost = 0;
    for (let j = 0; j < n; j++) {
      if (isBenefit(criteriaTypes[j])) {
        benefit += row[j] * weights[j];
      } else {
        cost += row[j] * weights[j];
      }
    }
    return benefit - cost;
  });

  const rankings = rankScores(scores);

  return { scores, rankings, details: { normalizedMatrix: norm } };
}

function MULTIMOORA(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Vector normalization
  const colNorms = Array.from({ length: n }, (_, j) => {
    let s = 0;
    for (let i = 0; i < m; i++) s += matrix[i][j] ** 2;
    return Math.sqrt(s);
  });
  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => (colNorms[j] === 0 ? 0 : x / colNorms[j]))
  );

  // 1. Ratio System
  const ratioScores = norm.map((row) => {
    let b = 0, c = 0;
    for (let j = 0; j < n; j++) {
      if (isBenefit(criteriaTypes[j])) b += row[j] * weights[j];
      else c += row[j] * weights[j];
    }
    return b - c;
  });
  const ratioRanks = rankScores(ratioScores);

  // 2. Reference Point
  const refPoint = Array.from({ length: n }, (_, j) => {
    const col = norm.map((r) => r[j]);
    return isBenefit(criteriaTypes[j]) ? Math.max(...col) : Math.min(...col);
  });
  const rpScores = norm.map((row) => {
    let maxDev = 0;
    for (let j = 0; j < n; j++) {
      maxDev = Math.max(maxDev, weights[j] * Math.abs(refPoint[j] - row[j]));
    }
    return maxDev;
  });
  const rpRanks = rankScores(rpScores, true); // lower is better

  // 3. Full Multiplicative Form
  const fmScores = norm.map((row) => {
    let bProd = 1, cProd = 1;
    for (let j = 0; j < n; j++) {
      const val = Math.pow(row[j], weights[j]);
      if (isBenefit(criteriaTypes[j])) bProd *= val;
      else cProd *= val;
    }
    return cProd === 0 ? Infinity : bProd / cProd;
  });
  const fmRanks = rankScores(fmScores);

  // Dominance theory: rank by sum of ranks (simple aggregation)
  const totalRanks = ratioRanks.map((r, i) => r + rpRanks[i] + fmRanks[i]);
  const rankings = rankScores(totalRanks, true);
  const scores = totalRanks.map((r) => -r); // higher (less negative) is better

  return {
    scores,
    rankings,
    details: { ratioScores, ratioRanks, rpScores, rpRanks, fmScores, fmRanks, totalRanks },
  };
}

function ARAS(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Optimal alternative: max for benefit, min for cost
  const optimal = Array.from({ length: n }, (_, j) => {
    const col = colValues(matrix, j);
    return isBenefit(criteriaTypes[j]) ? Math.max(...col) : Math.min(...col);
  });

  // Extended matrix with optimal as row 0
  const extended = [optimal, ...matrix];

  // Proportional normalization
  const colSums = Array.from({ length: n }, (_, j) => {
    let s = 0;
    for (let i = 0; i < extended.length; i++) s += extended[i][j];
    return s;
  });

  const norm: number[][] = extended.map((row) =>
    row.map((x, j) => {
      if (colSums[j] === 0) return 0;
      if (isBenefit(criteriaTypes[j])) {
        return x / colSums[j];
      }
      // For cost: (1/x) / sum(1/xi)
      if (x === 0) return 0;
      let invSum = 0;
      for (let i = 0; i < extended.length; i++) {
        if (extended[i][j] !== 0) invSum += 1 / extended[i][j];
      }
      return invSum === 0 ? 0 : (1 / x) / invSum;
    })
  );

  // Weighted
  const weighted = norm.map((row) => row.map((v, j) => v * weights[j]));

  // Si
  const S = weighted.map((row) => row.reduce((s, v) => s + v, 0));

  const S0 = S[0];
  const altS = S.slice(1);

  // Ki = Si / S0
  const K = altS.map((si) => (S0 === 0 ? 0 : si / S0));

  const scores = K;
  const rankings = rankScores(scores);

  return { scores, rankings, details: { optimal, S0, altS, K } };
}

function OCRA(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Separate benefit and cost criteria indices
  const benefitIdx = Array.from({ length: n }, (_, j) => j).filter((j) => isBenefit(criteriaTypes[j]));
  const costIdx = Array.from({ length: n }, (_, j) => j).filter((j) => !isBenefit(criteriaTypes[j]));

  // Input scores (cost criteria): Ii = sum_j wj * (max(xj) - xij) / min(xj)
  const I = matrix.map((row) => {
    let score = 0;
    for (const j of costIdx) {
      const maxJ = colMax(matrix, j);
      const minJ = colMin(matrix, j);
      score += minJ === 0 ? 0 : weights[j] * (maxJ - row[j]) / minJ;
    }
    return score;
  });

  const minI = Math.min(...I);
  const Ibar = I.map((v) => v - minI);

  // Output scores (benefit criteria): Oi = sum_j wj * (xij - min(xj)) / min(xj)
  const O = matrix.map((row) => {
    let score = 0;
    for (const j of benefitIdx) {
      const minJ = colMin(matrix, j);
      score += minJ === 0 ? 0 : weights[j] * (row[j] - minJ) / minJ;
    }
    return score;
  });

  const minO = Math.min(...O);
  const Obar = O.map((v) => v - minO);

  const scores = Ibar.map((ib, i) => ib + Obar[i]);
  const rankings = rankScores(scores);

  return { scores, rankings, details: { I, Ibar, O, Obar } };
}

function PIV(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Vector normalization
  const colNorms = Array.from({ length: n }, (_, j) => {
    let s = 0;
    for (let i = 0; i < m; i++) s += matrix[i][j] ** 2;
    return Math.sqrt(s);
  });
  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => (colNorms[j] === 0 ? 0 : x / colNorms[j]))
  );

  // Weighted normalized
  const weighted = norm.map((row) => row.map((v, j) => v * weights[j]));

  // Best value per criterion
  const best = Array.from({ length: n }, (_, j) => {
    const col = weighted.map((r) => r[j]);
    return isBenefit(criteriaTypes[j]) ? Math.max(...col) : Math.min(...col);
  });

  // Proximity: |vij - vbest_j|, for benefit subtract, for cost add
  const scores = weighted.map((row) => {
    let d = 0;
    for (let j = 0; j < n; j++) {
      const diff = Math.abs(row[j] - best[j]);
      if (isBenefit(criteriaTypes[j])) {
        d += diff; // want to minimize distance from best
      } else {
        d -= diff; // for cost, reverse since best is min
      }
    }
    return d;
  });

  // Lower is better for PIV
  const rankings = rankScores(scores, true);

  return { scores, rankings, details: { weighted, best } };
}

function TODIM(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const theta: number = input.theta ?? 1;
  const m = matrix.length;
  const n = weights.length;

  // Normalize weights: wjr = wj / max(wj)
  const maxW = Math.max(...weights);
  const wNorm = weights.map((w) => (maxW === 0 ? 0 : w / maxW));

  // Min-max normalization
  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      const denom = maxs[j] - mins[j];
      if (denom === 0) return 0;
      if (isBenefit(criteriaTypes[j])) return (x - mins[j]) / denom;
      return (maxs[j] - x) / denom;
    })
  );

  // Dominance of i over k for criterion j
  const sumW = wNorm.reduce((a, b) => a + b, 0);

  // delta(i, k) = sum_j phi_j(i, k)
  const delta: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));

  for (let i = 0; i < m; i++) {
    for (let k = 0; k < m; k++) {
      if (i === k) continue;
      let domSum = 0;
      for (let j = 0; j < n; j++) {
        // A zero-weight criterion contributes nothing to either the gain or
        // the loss term; dividing by it would produce Infinity/NaN.
        if (sumW === 0 || wNorm[j] === 0) continue;
        const diff = norm[i][j] - norm[k][j];
        if (diff > 0) {
          domSum += Math.sqrt((wNorm[j] * diff) / sumW);
        } else if (diff < 0) {
          domSum -= (1 / theta) * Math.sqrt((sumW * Math.abs(diff)) / wNorm[j]);
        }
      }
      delta[i][k] = domSum;
    }
  }

  // Global value
  const scores = delta.map((row) => {
    const rowSum = row.reduce((s, v) => s + v, 0);
    const minRowSum = Math.min(...delta.map((r) => r.reduce((s2, v2) => s2 + v2, 0)));
    const maxRowSum = Math.max(...delta.map((r) => r.reduce((s2, v2) => s2 + v2, 0)));
    const denom = maxRowSum - minRowSum;
    return denom === 0 ? 0 : (rowSum - minRowSum) / denom;
  });

  const rankings = rankScores(scores);

  return { scores, rankings, details: { delta, theta } };
}

function ROV(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  // Normalize
  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      const denom = maxs[j] - mins[j];
      if (denom === 0) return 0;
      return (x - mins[j]) / denom;
    })
  );

  // Best weighted sum (benefit perspective)
  const uPlus = norm.map((row) =>
    row.reduce((s, v, j) => {
      if (isBenefit(criteriaTypes[j])) return s + v * weights[j];
      return s + (1 - v) * weights[j];
    }, 0)
  );

  // Worst weighted sum
  const uMinus = norm.map((row) =>
    row.reduce((s, v, j) => {
      if (isBenefit(criteriaTypes[j])) return s + (1 - v) * weights[j];
      return s + v * weights[j];
    }, 0)
  );

  const scores = uPlus.map((up, i) => (up + uMinus[i]) / 2);
  const rankings = rankScores(scores);

  return { scores, rankings, details: { uPlus, uMinus } };
}

function REGIME(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Pairwise comparison with sign
  const regimeMatrix: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));

  for (let i = 0; i < m; i++) {
    for (let k = 0; k < m; k++) {
      if (i === k) continue;
      let sum = 0;
      for (let j = 0; j < n; j++) {
        const diff = isBenefit(criteriaTypes[j])
          ? matrix[i][j] - matrix[k][j]
          : matrix[k][j] - matrix[i][j];
        const sign = diff > 0 ? 1 : diff < 0 ? -1 : 0;
        sum += sign * weights[j];
      }
      regimeMatrix[i][k] = sum;
    }
  }

  // Score: sum of signs of regime values
  const scores = regimeMatrix.map((row) =>
    row.reduce((s, v) => s + (v > 0 ? 1 : v < 0 ? -1 : 0), 0)
  );
  const rankings = rankScores(scores);

  return { scores, rankings, details: { regimeMatrix } };
}

function GRA(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const rho: number = input.rho ?? 0.5;
  const m = matrix.length;
  const n = weights.length;

  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  // Normalize to reference sequence (ideal = 1 for all)
  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      const denom = maxs[j] - mins[j];
      if (denom === 0) return 1;
      if (isBenefit(criteriaTypes[j])) return (x - mins[j]) / denom;
      return (maxs[j] - x) / denom;
    })
  );

  // Deviation from reference (1)
  const delta: number[][] = norm.map((row) => row.map((v) => Math.abs(1 - v)));

  // Global min and max of delta
  let globalMin = Infinity;
  let globalMax = -Infinity;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      globalMin = Math.min(globalMin, delta[i][j]);
      globalMax = Math.max(globalMax, delta[i][j]);
    }
  }

  // Grey relational coefficient
  const grc: number[][] = delta.map((row) =>
    row.map((d) => {
      const denom = d + rho * globalMax;
      return denom === 0 ? 1 : (globalMin + rho * globalMax) / denom;
    })
  );

  // Weighted grey relational grade
  const scores = grc.map((row) =>
    row.reduce((s, v, j) => s + v * weights[j], 0)
  );
  const rankings = rankScores(scores);

  return { scores, rankings, details: { normalizedMatrix: norm, delta, grc, rho } };
}

function EXPROM(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  // Normalize
  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      const denom = maxs[j] - mins[j];
      if (denom === 0) return 0;
      if (isBenefit(criteriaTypes[j])) return (x - mins[j]) / denom;
      return (maxs[j] - x) / denom;
    })
  );

  // Weak preference (usual function) and strong preference
  const weakPi: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  const strongPi: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));

  for (let a = 0; a < m; a++) {
    for (let b = 0; b < m; b++) {
      if (a === b) continue;
      let wp = 0;
      let sp = 0;
      for (let j = 0; j < n; j++) {
        const d = norm[a][j] - norm[b][j];
        // Weak: usual preference
        if (d > 0) wp += weights[j];
        // Strong: preference proportional to d
        if (d > 0) sp += weights[j] * d;
      }
      weakPi[a][b] = wp;
      strongPi[a][b] = sp;
    }
  }

  // Combined preference: TP = weak + strong
  const totalPi: number[][] = weakPi.map((row, i) =>
    row.map((v, j) => v + strongPi[i][j])
  );

  // Flows
  const positiveFlow = totalPi.map((row) => row.reduce((s, v) => s + v, 0) / (m - 1));
  const negativeFlow = Array.from({ length: m }, (_, i) => {
    let sum = 0;
    for (let a = 0; a < m; a++) sum += totalPi[a][i];
    return sum / (m - 1);
  });
  const netFlow = positiveFlow.map((p, i) => p - negativeFlow[i]);

  const scores = netFlow;
  const rankings = rankScores(scores);

  return {
    scores,
    rankings,
    details: { weakPi, strongPi, totalPi, positiveFlow, negativeFlow, netFlow },
  };
}

function RAFSI(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Map each criterion to [1, n+1] interval
  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  const nIdeal = n + 1;
  const nAntiIdeal = 1;

  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      const denom = maxs[j] - mins[j];
      if (denom === 0) return (nIdeal + nAntiIdeal) / 2;
      if (isBenefit(criteriaTypes[j])) {
        // Map: min -> nAntiIdeal, max -> nIdeal
        return nAntiIdeal + ((x - mins[j]) / denom) * (nIdeal - nAntiIdeal);
      }
      // Cost: min -> nIdeal, max -> nAntiIdeal
      return nIdeal - ((x - mins[j]) / denom) * (nIdeal - nAntiIdeal);
    })
  );

  const scores = norm.map((row) =>
    row.reduce((s, v, j) => s + v * weights[j], 0)
  );
  const rankings = rankScores(scores);

  return { scores, rankings, details: { normalizedMatrix: norm } };
}

function WISP(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  // Additive integration
  const additive = matrix.map((row) => {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      if (isBenefit(criteriaTypes[j])) {
        sum += maxs[j] === 0 ? 0 : weights[j] * (row[j] / maxs[j]);
      } else {
        sum -= row[j] === 0 ? 0 : weights[j] * (mins[j] / row[j]);
      }
    }
    return sum;
  });

  // Multiplicative integration
  const multiplicative = matrix.map((row) => {
    let bProd = 1;
    let cProd = 1;
    for (let j = 0; j < n; j++) {
      if (isBenefit(criteriaTypes[j])) {
        bProd *= Math.pow(maxs[j] === 0 ? 0 : row[j] / maxs[j], weights[j]);
      } else {
        cProd *= Math.pow(row[j] === 0 ? 0 : mins[j] / row[j], weights[j]);
      }
    }
    return cProd === 0 ? 0 : bProd / cProd;
  });

  // Combined
  const scores = additive.map((a, i) => a + multiplicative[i]);
  const rankings = rankScores(scores);

  return { scores, rankings, details: { additive, multiplicative } };
}

function MOOSRA(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  // Vector normalization
  const colNorms = Array.from({ length: n }, (_, j) => {
    let s = 0;
    for (let i = 0; i < m; i++) s += matrix[i][j] ** 2;
    return Math.sqrt(s);
  });
  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => (colNorms[j] === 0 ? 0 : x / colNorms[j]))
  );

  // Weighted benefit sum / weighted cost sum
  const scores = norm.map((row) => {
    let benefit = 0;
    let cost = 0;
    for (let j = 0; j < n; j++) {
      if (isBenefit(criteriaTypes[j])) {
        benefit += row[j] * weights[j];
      } else {
        cost += row[j] * weights[j];
      }
    }
    // No cost criteria: the ratio has an empty denominator, so MOOSRA
    // degenerates to the weighted benefit sum instead of dividing by zero.
    return cost === 0 ? benefit : benefit / cost;
  });

  const rankings = rankScores(scores);

  return { scores, rankings, details: { normalizedMatrix: norm } };
}

function COBRA(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  // Normalize
  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      const denom = maxs[j] - mins[j];
      if (denom === 0) return 0;
      if (isBenefit(criteriaTypes[j])) return (x - mins[j]) / denom;
      return (maxs[j] - x) / denom;
    })
  );

  // Weighted normalized
  const weighted = norm.map((row) => row.map((v, j) => v * weights[j]));

  // Ideal solution = weighted max for each criterion (all 1 after normalization * weight)
  const ideal = weights.slice();

  // Euclidean distance from ideal (lower is better)
  const distances = weighted.map((row) => euclidean(row, ideal));
  const scores = distances.map((d) => -d); // negate so higher is better

  const rankings = rankScores(scores);

  return { scores, rankings, details: { weighted, ideal, distances } };
}

function MAUT(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const m = matrix.length;
  const n = weights.length;

  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  // Linear utility function
  const utility: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      const denom = maxs[j] - mins[j];
      if (denom === 0) return 1;
      if (isBenefit(criteriaTypes[j])) return (x - mins[j]) / denom;
      return (maxs[j] - x) / denom;
    })
  );

  // Weighted sum of utilities
  const scores = utility.map((row) =>
    row.reduce((s, v, j) => s + v * weights[j], 0)
  );
  const rankings = rankScores(scores);

  return { scores, rankings, details: { utility } };
}

function WASPAS(input: RankingInput): RankingResult {
  const { matrix, weights, criteriaTypes } = input;
  const lambda: number = input.lambda ?? 0.5;
  const m = matrix.length;
  const n = weights.length;

  const mins = Array.from({ length: n }, (_, j) => colMin(matrix, j));
  const maxs = Array.from({ length: n }, (_, j) => colMax(matrix, j));

  // Linear normalization
  const norm: number[][] = matrix.map((row) =>
    row.map((x, j) => {
      if (isBenefit(criteriaTypes[j])) {
        return maxs[j] === 0 ? 0 : x / maxs[j];
      }
      return x === 0 ? 0 : mins[j] / x;
    })
  );

  // WSM
  const wsm = norm.map((row) =>
    row.reduce((s, v, j) => s + v * weights[j], 0)
  );

  // WPM
  const wpm = norm.map((row) =>
    row.reduce((prod, v, j) => prod * Math.pow(v, weights[j]), 1)
  );

  // Combined
  const scores = wsm.map((w, i) => lambda * w + (1 - lambda) * wpm[i]);
  const rankings = rankScores(scores);

  return { scores, rankings, details: { wsm, wpm, lambda } };
}

// ---------------------------------------------------------------------------
// Export all methods
// ---------------------------------------------------------------------------

export const RankingMethods: Record<string, (input: RankingInput) => RankingResult> = {
  SAW,
  WSM: SAW, // alias
  WPM,
  TOPSIS,
  VIKOR,
  PROMETHEE,
  ELECTRE,
  EDAS,
  CODAS,
  CoCoSo,
  COPRAS,
  MARCOS,
  MABAC,
  MAIRCA,
  MOORA,
  MULTIMOORA,
  ARAS,
  OCRA,
  PIV,
  TODIM,
  ROV,
  REGIME,
  GRA,
  EXPROM,
  RAFSI,
  WISP,
  MOOSRA,
  COBRA,
  MAUT,
  WASPAS,
};

export {
  SAW,
  WPM,
  TOPSIS,
  VIKOR,
  PROMETHEE,
  ELECTRE,
  EDAS,
  CODAS,
  CoCoSo,
  COPRAS,
  MARCOS,
  MABAC,
  MAIRCA,
  MOORA,
  MULTIMOORA,
  ARAS,
  OCRA,
  PIV,
  TODIM,
  ROV,
  REGIME,
  GRA,
  EXPROM,
  RAFSI,
  WISP,
  MOOSRA,
  COBRA,
  MAUT,
  WASPAS,
};

// WSM alias
export const WSM = SAW;

export default RankingMethods;
