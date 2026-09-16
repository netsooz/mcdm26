// Fuzzy MCDM Methods
// Triangular and Spherical Fuzzy Number operations for TOPSIS and VIKOR

// ============================================================
// Types
// ============================================================

/** Triangular Fuzzy Number [lower, middle, upper] */
export type TFN = [number, number, number];

/** Spherical Fuzzy Number */
export interface SFN {
  mu: number;
  nu: number;
  pi: number;
}

export interface FuzzyInput {
  matrix: TFN[][] | SFN[][];
  weights: TFN[] | SFN[];
  criteriaTypes: string[];
  criteriaNames: string[];
  alternativeNames: string[];
  [key: string]: any;
}

export interface FuzzyResult {
  scores: number[];
  rankings: number[];
  details: Record<string, any>;
}

// ============================================================
// TFN Helpers
// ============================================================

/** Add two triangular fuzzy numbers */
export function fuzzyAdd(a: TFN, b: TFN): TFN {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Multiply two triangular fuzzy numbers */
export function fuzzyMultiply(a: TFN, b: TFN): TFN {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}

/** Subtract two triangular fuzzy numbers */
export function fuzzySubtract(a: TFN, b: TFN): TFN {
  return [a[0] - b[2], a[1] - b[1], a[2] - b[0]];
}

/** Distance between two triangular fuzzy numbers */
export function fuzzyDistance(a: TFN, b: TFN): number {
  return Math.sqrt(
    (1 / 3) *
      ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
  );
}

/** Defuzzify a TFN using centroid method */
export function defuzzify(a: TFN): number {
  return (a[0] + a[1] + a[2]) / 3;
}

/** Divide a scalar by a TFN (inverse) */
function fuzzyScalarDivide(scalar: number, a: TFN): TFN {
  return [scalar / a[2], scalar / a[1], scalar / a[0]];
}

// ============================================================
// SFN Helpers
// ============================================================

/** Score function for a spherical fuzzy number */
export function sfScore(a: SFN): number {
  return (a.mu - a.nu) * a.pi;
}

/** Accuracy function for a spherical fuzzy number */
export function sfAccuracy(a: SFN): number {
  return a.mu + a.nu + a.pi;
}

/** Normalized Euclidean distance between two spherical fuzzy numbers */
export function sfDistance(a: SFN, b: SFN): number {
  return Math.sqrt(
    (1 / 3) *
      ((a.mu ** 2 - b.mu ** 2) ** 2 +
        (a.nu ** 2 - b.nu ** 2) ** 2 +
        (a.pi ** 2 - b.pi ** 2) ** 2)
  );
}

/** Multiply (scale) a spherical fuzzy number by a weight SFN */
export function sfMultiply(a: SFN, w: SFN): SFN {
  const mu = a.mu * w.mu;
  const nu = Math.sqrt(a.nu ** 2 + w.nu ** 2 - a.nu ** 2 * w.nu ** 2);
  const pi = Math.sqrt(
    (1 - w.mu ** 2) * a.pi ** 2 +
      (1 - a.mu ** 2) * w.pi ** 2 -
      a.pi ** 2 * w.pi ** 2
  );
  return { mu, nu, pi };
}

/** Add two spherical fuzzy numbers */
export function sfAdd(a: SFN, b: SFN): SFN {
  const mu = Math.sqrt(a.mu ** 2 + b.mu ** 2 - a.mu ** 2 * b.mu ** 2);
  const nu = a.nu * b.nu;
  const pi = Math.sqrt(
    (1 - b.mu ** 2) * a.pi ** 2 +
      (1 - a.mu ** 2) * b.pi ** 2 -
      a.pi ** 2 * b.pi ** 2
  );
  return { mu, nu, pi };
}

// ============================================================
// Fuzzy TOPSIS (TFN)
// ============================================================

function fTopsis(input: FuzzyInput): FuzzyResult {
  const matrix = input.matrix as TFN[][];
  const weights = input.weights as TFN[];
  const criteriaTypes = input.criteriaTypes;
  const m = matrix.length; // alternatives
  const n = matrix[0].length; // criteria

  // Step 1: Normalize the fuzzy decision matrix
  const normalized: TFN[][] = [];
  for (let i = 0; i < m; i++) {
    normalized.push([]);
    for (let j = 0; j < n; j++) {
      const col = matrix.map((row) => row[j]);
      if (
        criteriaTypes[j] === 'benefit' ||
        criteriaTypes[j] === 'max'
      ) {
        // Benefit: divide by max upper value
        const uMax = Math.max(...col.map((c) => c[2]));
        normalized[i].push([
          matrix[i][j][0] / uMax,
          matrix[i][j][1] / uMax,
          matrix[i][j][2] / uMax,
        ]);
      } else {
        // Cost: l_min / value (reversed)
        const lMin = Math.min(...col.map((c) => c[0]));
        normalized[i].push([
          lMin / matrix[i][j][2],
          lMin / matrix[i][j][1],
          lMin / matrix[i][j][0],
        ]);
      }
    }
  }

  // Step 2: Weighted normalized matrix
  const weighted: TFN[][] = [];
  for (let i = 0; i < m; i++) {
    weighted.push([]);
    for (let j = 0; j < n; j++) {
      weighted[i].push(fuzzyMultiply(normalized[i][j], weights[j]));
    }
  }

  // Step 3: Determine FPIS and FNIS
  const fpis: TFN[] = [];
  const fnis: TFN[] = [];
  for (let j = 0; j < n; j++) {
    if (
      criteriaTypes[j] === 'benefit' ||
      criteriaTypes[j] === 'max'
    ) {
      fpis.push([1, 1, 1]);
      fnis.push([0, 0, 0]);
    } else {
      fpis.push([0, 0, 0]);
      fnis.push([1, 1, 1]);
    }
  }

  // Step 4: Calculate distances
  const dPos: number[] = [];
  const dNeg: number[] = [];
  for (let i = 0; i < m; i++) {
    let sumPos = 0;
    let sumNeg = 0;
    for (let j = 0; j < n; j++) {
      sumPos += fuzzyDistance(weighted[i][j], fpis[j]);
      sumNeg += fuzzyDistance(weighted[i][j], fnis[j]);
    }
    dPos.push(sumPos);
    dNeg.push(sumNeg);
  }

  // Step 5: Closeness coefficient
  const scores: number[] = [];
  for (let i = 0; i < m; i++) {
    scores.push(dNeg[i] / (dPos[i] + dNeg[i]));
  }

  // Rankings (highest score = rank 1)
  const sorted = scores
    .map((s, i) => ({ score: s, index: i }))
    .sort((a, b) => b.score - a.score);
  const rankings: number[] = new Array(m);
  sorted.forEach((item, rank) => {
    rankings[item.index] = rank + 1;
  });

  return {
    scores,
    rankings,
    details: {
      normalizedMatrix: normalized,
      weightedMatrix: weighted,
      fpis,
      fnis,
      distanceToPositive: dPos,
      distanceToNegative: dNeg,
    },
  };
}

// ============================================================
// Fuzzy VIKOR (TFN)
// ============================================================

function fVikor(input: FuzzyInput): FuzzyResult {
  const matrix = input.matrix as TFN[][];
  const weights = input.weights as TFN[];
  const criteriaTypes = input.criteriaTypes;
  const v: number = input.v ?? 0.5;
  const m = matrix.length;
  const n = matrix[0].length;

  // Step 1: Find fuzzy best and fuzzy worst for each criterion
  const fBest: TFN[] = [];
  const fWorst: TFN[] = [];
  for (let j = 0; j < n; j++) {
    const col = matrix.map((row) => row[j]);
    if (
      criteriaTypes[j] === 'benefit' ||
      criteriaTypes[j] === 'max'
    ) {
      const bestL = Math.max(...col.map((c) => c[0]));
      const bestM = Math.max(...col.map((c) => c[1]));
      const bestU = Math.max(...col.map((c) => c[2]));
      const worstL = Math.min(...col.map((c) => c[0]));
      const worstM = Math.min(...col.map((c) => c[1]));
      const worstU = Math.min(...col.map((c) => c[2]));
      fBest.push([bestL, bestM, bestU]);
      fWorst.push([worstL, worstM, worstU]);
    } else {
      const bestL = Math.min(...col.map((c) => c[0]));
      const bestM = Math.min(...col.map((c) => c[1]));
      const bestU = Math.min(...col.map((c) => c[2]));
      const worstL = Math.max(...col.map((c) => c[0]));
      const worstM = Math.max(...col.map((c) => c[1]));
      const worstU = Math.max(...col.map((c) => c[2]));
      fBest.push([bestL, bestM, bestU]);
      fWorst.push([worstL, worstM, worstU]);
    }
  }

  // Step 2: Calculate S and R values (defuzzified)
  const S: number[] = [];
  const R: number[] = [];
  const sFuzzy: TFN[][] = []; // per-criterion contributions

  for (let i = 0; i < m; i++) {
    let sSum: TFN = [0, 0, 0];
    let rMax = 0;
    const contributions: TFN[] = [];

    for (let j = 0; j < n; j++) {
      const diff = fuzzyDistance(matrix[i][j], fBest[j]);
      const range = fuzzyDistance(fWorst[j], fBest[j]);
      const ratio = range === 0 ? 0 : diff / range;
      const wDef = defuzzify(weights[j]);
      const val = wDef * ratio;

      const contribution: TFN = [val, val, val]; // simplified after defuzzification
      contributions.push(contribution);

      sSum = fuzzyAdd(sSum, contribution);
      if (val > rMax) {
        rMax = val;
      }
    }

    sFuzzy.push(contributions);
    S.push(defuzzify(sSum));
    R.push(rMax);
  }

  // Step 3: Calculate Q values
  const sStar = Math.min(...S);
  const sMinus = Math.max(...S);
  const rStar = Math.min(...R);
  const rMinus = Math.max(...R);

  const Q: number[] = [];
  for (let i = 0; i < m; i++) {
    const sNorm =
      sMinus - sStar === 0 ? 0 : (S[i] - sStar) / (sMinus - sStar);
    const rNorm =
      rMinus - rStar === 0 ? 0 : (R[i] - rStar) / (rMinus - rStar);
    Q.push(v * sNorm + (1 - v) * rNorm);
  }

  // Rankings by Q (lowest = rank 1)
  const sorted = Q.map((q, i) => ({ q, index: i })).sort(
    (a, b) => a.q - b.q
  );
  const rankings: number[] = new Array(m);
  sorted.forEach((item, rank) => {
    rankings[item.index] = rank + 1;
  });

  return {
    scores: Q,
    rankings,
    details: {
      S,
      R,
      Q,
      fBest,
      fWorst,
      sStar,
      sMinus,
      rStar,
      rMinus,
      v,
    },
  };
}

// ============================================================
// Spherical Fuzzy TOPSIS
// ============================================================

function sfTopsis(input: FuzzyInput): FuzzyResult {
  const matrix = input.matrix as SFN[][];
  const weights = input.weights as SFN[];
  const criteriaTypes = input.criteriaTypes;
  const m = matrix.length;
  const n = matrix[0].length;

  // Step 1: Weighted spherical fuzzy decision matrix
  const weighted: SFN[][] = [];
  for (let i = 0; i < m; i++) {
    weighted.push([]);
    for (let j = 0; j < n; j++) {
      weighted[i].push(sfMultiply(matrix[i][j], weights[j]));
    }
  }

  // Step 2: Determine SF-PIS and SF-NIS
  const sfpis: SFN[] = [];
  const sfnis: SFN[] = [];
  for (let j = 0; j < n; j++) {
    if (
      criteriaTypes[j] === 'benefit' ||
      criteriaTypes[j] === 'max'
    ) {
      // Ideal: highest mu, lowest nu
      sfpis.push({ mu: 1, nu: 0, pi: 0 });
      sfnis.push({ mu: 0, nu: 1, pi: 0 });
    } else {
      sfpis.push({ mu: 0, nu: 1, pi: 0 });
      sfnis.push({ mu: 1, nu: 0, pi: 0 });
    }
  }

  // Step 3: Calculate distances
  const dPos: number[] = [];
  const dNeg: number[] = [];
  for (let i = 0; i < m; i++) {
    let sumPos = 0;
    let sumNeg = 0;
    for (let j = 0; j < n; j++) {
      sumPos += sfDistance(weighted[i][j], sfpis[j]);
      sumNeg += sfDistance(weighted[i][j], sfnis[j]);
    }
    dPos.push(sumPos);
    dNeg.push(sumNeg);
  }

  // Step 4: Closeness coefficient
  const scores: number[] = [];
  for (let i = 0; i < m; i++) {
    scores.push(dNeg[i] / (dPos[i] + dNeg[i]));
  }

  // Rankings (highest score = rank 1)
  const sorted = scores
    .map((s, i) => ({ score: s, index: i }))
    .sort((a, b) => b.score - a.score);
  const rankings: number[] = new Array(m);
  sorted.forEach((item, rank) => {
    rankings[item.index] = rank + 1;
  });

  return {
    scores,
    rankings,
    details: {
      weightedMatrix: weighted,
      sfpis,
      sfnis,
      distanceToPositive: dPos,
      distanceToNegative: dNeg,
    },
  };
}

// ============================================================
// Spherical Fuzzy VIKOR
// ============================================================

function sfVikor(input: FuzzyInput): FuzzyResult {
  const matrix = input.matrix as SFN[][];
  const weights = input.weights as SFN[];
  const criteriaTypes = input.criteriaTypes;
  const v: number = input.v ?? 0.5;
  const m = matrix.length;
  const n = matrix[0].length;

  // Step 1: Determine best and worst SFN for each criterion using score function
  const sfBest: SFN[] = [];
  const sfWorst: SFN[] = [];
  for (let j = 0; j < n; j++) {
    const col = matrix.map((row) => row[j]);
    const colScores = col.map((c) => sfScore(c));

    if (
      criteriaTypes[j] === 'benefit' ||
      criteriaTypes[j] === 'max'
    ) {
      const bestIdx = colScores.indexOf(Math.max(...colScores));
      const worstIdx = colScores.indexOf(Math.min(...colScores));
      sfBest.push(col[bestIdx]);
      sfWorst.push(col[worstIdx]);
    } else {
      const bestIdx = colScores.indexOf(Math.min(...colScores));
      const worstIdx = colScores.indexOf(Math.max(...colScores));
      sfBest.push(col[bestIdx]);
      sfWorst.push(col[worstIdx]);
    }
  }

  // Step 2: Calculate S and R values using SF distances
  const S: number[] = [];
  const R: number[] = [];

  for (let i = 0; i < m; i++) {
    let sSum = 0;
    let rMax = 0;

    for (let j = 0; j < n; j++) {
      const dBest = sfDistance(matrix[i][j], sfBest[j]);
      const dRange = sfDistance(sfWorst[j], sfBest[j]);
      const ratio = dRange === 0 ? 0 : dBest / dRange;
      const wScore = sfScore(weights[j]);
      // Use absolute weight score for weighting
      const wAbs = Math.abs(wScore) > 0 ? Math.abs(wScore) : defuzzifysfn(weights[j]);
      const val = wAbs * ratio;

      sSum += val;
      if (val > rMax) {
        rMax = val;
      }
    }

    S.push(sSum);
    R.push(rMax);
  }

  // Step 3: Calculate Q values
  const sStar = Math.min(...S);
  const sMinus = Math.max(...S);
  const rStar = Math.min(...R);
  const rMinus = Math.max(...R);

  const Q: number[] = [];
  for (let i = 0; i < m; i++) {
    const sNorm =
      sMinus - sStar === 0 ? 0 : (S[i] - sStar) / (sMinus - sStar);
    const rNorm =
      rMinus - rStar === 0 ? 0 : (R[i] - rStar) / (rMinus - rStar);
    Q.push(v * sNorm + (1 - v) * rNorm);
  }

  // Rankings by Q (lowest = rank 1)
  const sorted = Q.map((q, i) => ({ q, index: i })).sort(
    (a, b) => a.q - b.q
  );
  const rankings: number[] = new Array(m);
  sorted.forEach((item, rank) => {
    rankings[item.index] = rank + 1;
  });

  return {
    scores: Q,
    rankings,
    details: {
      S,
      R,
      Q,
      sfBest,
      sfWorst,
      sStar,
      sMinus,
      rStar,
      rMinus,
      v,
    },
  };
}

/** Defuzzify a spherical fuzzy number using score-based approach */
function defuzzifysfn(a: SFN): number {
  return (a.mu + 1 - a.nu) / 2;
}

// ============================================================
// Exported API
// ============================================================

export const FuzzyMethods = {
  fTopsis,
  fVikor,
  sfTopsis,
  sfVikor,
};

export default FuzzyMethods;
