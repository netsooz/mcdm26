// =============================================================================
// MCDM Weighting Methods - Complete TypeScript Implementation
// =============================================================================

type WeightingResult = {
  weights: number[];
  details: Record<string, any>;
  [key: string]: any;
};

// =============================================================================
// Utility Functions
// =============================================================================

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  const variance = arr.reduce((acc, val) => acc + (val - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function correlation(a: number[], b: number[]): number {
  const n = a.length;
  if (n === 0) return 0;
  const meanA = mean(a);
  const meanB = mean(b);
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const dA = a[i] - meanA;
    const dB = b[i] - meanB;
    num += dA * dB;
    denA += dA * dA;
    denB += dB * dB;
  }
  const den = Math.sqrt(denA * denB);
  if (den === 0) return 0;
  return num / den;
}

function transpose(matrix: number[][]): number[][] {
  if (matrix.length === 0) return [];
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = matrix[i][j];
    }
  }
  return result;
}

function normalizeWeights(w: number[]): number[] {
  const s = sum(w);
  if (s === 0) return w.map(() => 1 / w.length);
  return w.map((v) => v / s);
}

function safeLn(x: number): number {
  if (x <= 0) return 0;
  return Math.log(x);
}

/** Min-max normalize a matrix, respecting benefit (+) / cost (-) criteria types. */
function minMaxNormalize(
  matrix: number[][],
  criteriaTypes: string[]
): number[][] {
  const m = matrix.length;
  const n = matrix[0].length;
  const result: number[][] = Array.from({ length: m }, () => new Array(n));
  for (let j = 0; j < n; j++) {
    const col = matrix.map((row) => row[j]);
    const minVal = Math.min(...col);
    const maxVal = Math.max(...col);
    const range = maxVal - minVal;
    for (let i = 0; i < m; i++) {
      if (range === 0) {
        result[i][j] = 0;
      } else {
        const isBenefit =
          !criteriaTypes[j] ||
          criteriaTypes[j].toLowerCase().startsWith('b') ||
          criteriaTypes[j] === '+' ||
          criteriaTypes[j] === 'max';
        if (isBenefit) {
          result[i][j] = (matrix[i][j] - minVal) / range;
        } else {
          result[i][j] = (maxVal - matrix[i][j]) / range;
        }
      }
    }
  }
  return result;
}

function isBenefit(type: string): boolean {
  if (!type) return true;
  const t = type.toLowerCase();
  return t.startsWith('b') || t === '+' || t === 'max';
}

/** Multiply two matrices. */
function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const n = B[0].length;
  const p = B.length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < p; k++) {
        C[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return C;
}

/** Create identity matrix of size n. */
function identity(n: number): number[][] {
  const I: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) I[i][i] = 1;
  return I;
}

/** Invert a matrix using Gauss-Jordan elimination. */
function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  // Augment with identity
  const aug: number[][] = matrix.map((row, i) => {
    const idRow = new Array(n).fill(0);
    idRow[i] = 1;
    return [...row, ...idRow];
  });

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) {
      // Near-singular; use pseudoinverse-like fallback
      continue;
    }
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  return aug.map((row) => row.slice(n));
}

/** Subtract two matrices: A - B */
function matSub(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((val, j) => val - B[i][j]));
}

/**
 * Solve a linear system Ax = b using Gaussian elimination with partial pivoting.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Augmented matrix
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let j = col; j <= n; j++) aug[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  return aug.map((row) => row[n]);
}

// =============================================================================
// Method Implementations
// =============================================================================

/**
 * AHP - Analytic Hierarchy Process
 * Input: pairwise comparison matrix (n x n) using Saaty's 1-9 scale.
 */
function AHP(matrix: number[][]): WeightingResult & { CR: number; consistencyRatio: number } {
  const n = matrix.length;

  // Column sums
  const colSums: number[] = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += matrix[i][j];
    }
  }

  // Normalize each column and average rows
  const weights: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      weights[i] += matrix[i][j] / (colSums[j] || 1);
    }
    weights[i] /= n;
  }

  // lambda_max
  let lambdaMax = 0;
  for (let j = 0; j < n; j++) {
    lambdaMax += colSums[j] * weights[j];
  }

  // Consistency Index
  const CI = n > 1 ? (lambdaMax - n) / (n - 1) : 0;

  // Random Index table (Saaty)
  const RITable: Record<number, number> = {
    1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24,
    7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49, 11: 1.51,
    12: 1.48, 13: 1.56, 14: 1.57, 15: 1.59,
  };
  const RI = RITable[n] ?? 1.59;
  const CR = RI === 0 ? 0 : CI / RI;

  return {
    weights,
    CR,
    consistencyRatio: CR,
    details: {
      lambdaMax,
      CI,
      RI,
      CR,
      colSums,
      isConsistent: CR < 0.1,
    },
  };
}

/**
 * CRITIC - CRiteria Importance Through Intercriteria Correlation
 */
function CRITIC(
  matrix: number[][],
  criteriaTypes: string[]
): WeightingResult {
  const m = matrix.length;
  const n = matrix[0].length;

  // Min-max normalize
  const norm = minMaxNormalize(matrix, criteriaTypes);

  // Standard deviation per criterion (column)
  const sigmas: number[] = [];
  const columns: number[][] = [];
  for (let j = 0; j < n; j++) {
    const col = norm.map((row) => row[j]);
    columns.push(col);
    sigmas.push(stdDev(col));
  }

  // Information content: Cj = sigma_j * sum(1 - r_jk)
  const C: number[] = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let conflictSum = 0;
    for (let k = 0; k < n; k++) {
      const r = correlation(columns[j], columns[k]);
      conflictSum += 1 - r;
    }
    C[j] = sigmas[j] * conflictSum;
  }

  const weights = normalizeWeights(C);

  return {
    weights,
    details: {
      standardDeviations: sigmas,
      informationContent: C,
    },
  };
}

/**
 * ENTROPY - Shannon Entropy Weighting
 */
function ENTROPY(matrix: number[][]): WeightingResult {
  const m = matrix.length;
  const n = matrix[0].length;

  // Normalize: pij = xij / sum_of_column_j
  const colSums: number[] = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      colSums[j] += Math.abs(matrix[i][j]);
    }
  }

  const P: number[][] = matrix.map((row) =>
    row.map((val, j) => (colSums[j] === 0 ? 1 / m : Math.abs(val) / colSums[j]))
  );

  // Entropy: ej = -(1/ln(m)) * sum(pij * ln(pij))
  const k = 1 / safeLn(m);
  const e: number[] = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let entropySum = 0;
    for (let i = 0; i < m; i++) {
      if (P[i][j] > 0) {
        entropySum += P[i][j] * safeLn(P[i][j]);
      }
    }
    e[j] = -k * entropySum;
  }

  // Degree of diversification
  const d: number[] = e.map((ej) => 1 - ej);

  const weights = normalizeWeights(d);

  return {
    weights,
    details: {
      entropy: e,
      diversification: d,
      proportions: P,
    },
  };
}

/**
 * SWARA - Step-wise Weight Assessment Ratio Analysis
 * values: array of comparative importance values (s_j) for j >= 2.
 *         values[0] is s_2, values[1] is s_3, etc.
 *         The first (most important) criterion has no s-value.
 */
function SWARA(values: number[]): WeightingResult {
  const n = values.length + 1;

  // k_j: coefficient; k_1 = 1, k_j = s_j + 1 for j >= 2
  const k: number[] = [1];
  for (let j = 0; j < values.length; j++) {
    k.push(values[j] + 1);
  }

  // q_j: recalculated weight; q_1 = 1, q_j = q_{j-1} / k_j
  const q: number[] = [1];
  for (let j = 1; j < n; j++) {
    q.push(q[j - 1] / (k[j] || 1));
  }

  const weights = normalizeWeights(q);

  return {
    weights,
    details: {
      coefficients: k,
      recalculatedWeights: q,
      comparativeImportance: values,
    },
  };
}

/**
 * PIPRECIA - PIvot Pairwise RElative Criteria Importance Assessment
 * values: array of comparative importance values (s_j) for j >= 2.
 *         s_j > 1 means criterion j is more important than j-1,
 *         s_j < 1 means less important, s_j = 1 means equal.
 */
function PIPRECIA(values: number[]): WeightingResult {
  const n = values.length + 1;

  // k_j = 2 - s_j for j >= 2
  const k: number[] = [1];
  for (let j = 0; j < values.length; j++) {
    k.push(2 - values[j]);
  }

  // q_1 = 1, q_j = q_{j-1} / k_j
  const q: number[] = [1];
  for (let j = 1; j < n; j++) {
    const kj = k[j] === 0 ? 1e-10 : k[j];
    q.push(q[j - 1] / kj);
  }

  const weights = normalizeWeights(q);

  return {
    weights,
    details: {
      coefficients: k,
      recalculatedWeights: q,
      comparativeImportance: values,
    },
  };
}

/**
 * MEREC - MEthod based on the Removal Effects of Criteria
 */
function MEREC(
  matrix: number[][],
  criteriaTypes: string[]
): WeightingResult {
  const m = matrix.length;
  const n = matrix[0].length;

  // Step 1: Linear normalization
  // For benefit: n_ij = min_j / x_ij
  // For cost: n_ij = x_ij / max_j
  const norm: number[][] = Array.from({ length: m }, () => new Array(n));
  for (let j = 0; j < n; j++) {
    const col = matrix.map((row) => row[j]);
    const minVal = Math.min(...col);
    const maxVal = Math.max(...col);
    for (let i = 0; i < m; i++) {
      if (isBenefit(criteriaTypes[j])) {
        norm[i][j] = matrix[i][j] === 0 ? 1e-10 : minVal / matrix[i][j];
      } else {
        norm[i][j] = maxVal === 0 ? 1e-10 : matrix[i][j] / maxVal;
      }
    }
  }

  // Step 2: Overall performance of each alternative (using all criteria)
  // S_i = ln(1 + (1/n) * sum_j |ln(n_ij)|)
  const S: number[] = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    let logSum = 0;
    for (let j = 0; j < n; j++) {
      logSum += Math.abs(safeLn(norm[i][j]));
    }
    S[i] = safeLn(1 + (1 / n) * logSum);
  }

  // Step 3: Performance with criterion j removed
  // S'_ij = ln(1 + (1/n) * sum_{k!=j} |ln(n_ik)|)
  const E: number[] = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let removalEffect = 0;
    for (let i = 0; i < m; i++) {
      let logSum = 0;
      for (let k = 0; k < n; k++) {
        if (k === j) continue;
        logSum += Math.abs(safeLn(norm[i][k]));
      }
      const Sprime = safeLn(1 + (1 / n) * logSum);
      removalEffect += Math.abs(Sprime - S[i]);
    }
    E[j] = removalEffect;
  }

  const weights = normalizeWeights(E);

  return {
    weights,
    details: {
      overallPerformance: S,
      removalEffects: E,
      normalizedMatrix: norm,
    },
  };
}

/**
 * SD - Standard Deviation Weighting
 */
function SD(matrix: number[][]): WeightingResult {
  const m = matrix.length;
  const n = matrix[0].length;

  // Normalize columns to [0,1] range (vector normalization)
  const norm: number[][] = Array.from({ length: m }, () => new Array(n));
  for (let j = 0; j < n; j++) {
    const col = matrix.map((row) => row[j]);
    const colNorm = Math.sqrt(col.reduce((acc, v) => acc + v * v, 0));
    for (let i = 0; i < m; i++) {
      norm[i][j] = colNorm === 0 ? 0 : matrix[i][j] / colNorm;
    }
  }

  // Standard deviation of each normalized column
  const sigmas: number[] = [];
  for (let j = 0; j < n; j++) {
    const col = norm.map((row) => row[j]);
    sigmas.push(stdDev(col));
  }

  const weights = normalizeWeights(sigmas);

  return {
    weights,
    details: {
      standardDeviations: sigmas,
      normalizedMatrix: norm,
    },
  };
}

/**
 * CILOS - Criterion Impact LOSs
 */
function CILOS(
  matrix: number[][],
  criteriaTypes: string[]
): WeightingResult {
  const m = matrix.length;
  const n = matrix[0].length;

  // Step 1: Transform cost criteria to benefit by inverting
  const transformed: number[][] = matrix.map((row) =>
    row.map((val, j) => {
      if (isBenefit(criteriaTypes[j])) return val;
      return val === 0 ? 1e-10 : 1 / val;
    })
  );

  // Step 2: Normalize so that max of each column = 1
  const norm: number[][] = Array.from({ length: m }, () => new Array(n));
  for (let j = 0; j < n; j++) {
    const col = transformed.map((row) => row[j]);
    const maxVal = Math.max(...col);
    for (let i = 0; i < m; i++) {
      norm[i][j] = maxVal === 0 ? 0 : transformed[i][j] / maxVal;
    }
  }

  // Step 3: Build relative impact loss matrix A (n x n)
  // For each criterion pair (j, k), compute the loss:
  // A[j][k] = - sum_i ((x_ij_best - x_ij_when_k_best) / x_ij_best)
  // where i-th best for column j means the row where column j has max value

  // Find the row index where each criterion has its maximum
  const bestRows: number[] = [];
  for (let j = 0; j < n; j++) {
    let bestRow = 0;
    let bestVal = norm[0][j];
    for (let i = 1; i < m; i++) {
      if (norm[i][j] > bestVal) {
        bestVal = norm[i][j];
        bestRow = i;
      }
    }
    bestRows.push(bestRow);
  }

  // Build square impact loss matrix
  const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    for (let k = 0; k < n; k++) {
      if (j === k) continue;
      // Loss in criterion j when criterion k is optimized
      // Use the row where k is best
      const rowK = bestRows[k];
      const bestValJ = norm[bestRows[j]][j]; // best value for j
      const valJatK = norm[rowK][j]; // value of j at row where k is best
      A[j][k] = bestValJ === 0 ? 0 : -(bestValJ - valJatK) / bestValJ;
    }
  }

  // Diagonal: A[j][j] = -sum of column j (excluding diagonal)
  for (let j = 0; j < n; j++) {
    let colSum = 0;
    for (let k = 0; k < n; k++) {
      if (k !== j) colSum += A[k][j];
    }
    A[j][j] = -colSum;
  }

  // Step 4: Solve the system Aw = 0 with constraint sum(w) = 1
  // Replace last equation with sum = 1
  const Asys: number[][] = A.map((row) => [...row]);
  const b: number[] = new Array(n).fill(0);

  // Replace last row with sum constraint
  for (let j = 0; j < n; j++) {
    Asys[n - 1][j] = 1;
  }
  b[n - 1] = 1;

  const weights = solveLinearSystem(Asys, b);

  // Ensure non-negative
  const absWeights = weights.map((w) => Math.max(w, 0));
  const finalWeights = normalizeWeights(absWeights);

  return {
    weights: finalWeights,
    details: {
      impactLossMatrix: A,
      bestRows,
      normalizedMatrix: norm,
    },
  };
}

/**
 * IDOCRIW - Integrated Determination of Objective CRIteria Weights
 * Combines ENTROPY and CILOS methods.
 */
function IDOCRIW(
  matrix: number[][],
  criteriaTypes: string[]
): WeightingResult {
  const entropyResult = ENTROPY(matrix);
  const cilosResult = CILOS(matrix, criteriaTypes);

  const n = entropyResult.weights.length;

  // Combined: w_j = (w_entropy_j * w_cilos_j) / sum(w_entropy_k * w_cilos_k)
  const combined: number[] = new Array(n);
  for (let j = 0; j < n; j++) {
    combined[j] = entropyResult.weights[j] * cilosResult.weights[j];
  }

  const weights = normalizeWeights(combined);

  return {
    weights,
    details: {
      entropyWeights: entropyResult.weights,
      cilosWeights: cilosResult.weights,
      combinedProducts: combined,
      entropyDetails: entropyResult.details,
      cilosDetails: cilosResult.details,
    },
  };
}

/**
 * LOPCOW - LOgarithmic Percentage Change-driven Objective Weighting
 */
function LOPCOW(
  matrix: number[][],
  criteriaTypes: string[]
): WeightingResult {
  const m = matrix.length;
  const n = matrix[0].length;

  // Step 1: Normalize using min-max
  const norm = minMaxNormalize(matrix, criteriaTypes);

  // Step 2: For each criterion, compute the percentage of value lost
  // PV_j = (ln(max_j) - ln(min_j)) / ln(max_j)
  // Using the normalized values
  const PV: number[] = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    const col = norm.map((row) => row[j]);
    // Shift to avoid log(0): add small epsilon to zeros
    const shifted = col.map((v) => (v <= 0 ? 1e-10 : v));
    const maxVal = Math.max(...shifted);
    const minVal = Math.min(...shifted);

    const lnMax = safeLn(maxVal);
    const lnMin = safeLn(minVal);

    if (lnMax === 0) {
      PV[j] = 0;
    } else {
      PV[j] = Math.abs((lnMax - lnMin) / lnMax);
    }
  }

  const weights = normalizeWeights(PV);

  return {
    weights,
    details: {
      percentageValues: PV,
      normalizedMatrix: norm,
    },
  };
}

/**
 * ITARA - Indifference Threshold-based Attribute RAtio Analysis
 */
function ITARA(
  matrix: number[][],
  criteriaTypes: string[]
): WeightingResult {
  const m = matrix.length;
  const n = matrix[0].length;

  // Step 1: Normalize using min-max
  const norm = minMaxNormalize(matrix, criteriaTypes);

  // Step 2: Compute indifference threshold for each criterion
  // IT_j = 1/m * sum_i |n_ij - mean_j|
  const means: number[] = [];
  for (let j = 0; j < n; j++) {
    const col = norm.map((row) => row[j]);
    means.push(mean(col));
  }

  const IT: number[] = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let absDevSum = 0;
    for (let i = 0; i < m; i++) {
      absDevSum += Math.abs(norm[i][j] - means[j]);
    }
    IT[j] = absDevSum / m;
  }

  const weights = normalizeWeights(IT);

  return {
    weights,
    details: {
      indifferenceThresholds: IT,
      columnMeans: means,
      normalizedMatrix: norm,
    },
  };
}

/**
 * EAMR - Estimation based on the Absolute Maximum of Row values (area-based weighting)
 */
function EAMR(
  matrix: number[][],
  criteriaTypes: string[]
): WeightingResult {
  const m = matrix.length;
  const n = matrix[0].length;

  // Step 1: Normalize using min-max
  const norm = minMaxNormalize(matrix, criteriaTypes);

  // Step 2: Compute maximum deviation for each criterion
  // D_j = sum_i |n_ij - max_j| where max_j is the maximum in column j
  const maxVals: number[] = [];
  for (let j = 0; j < n; j++) {
    const col = norm.map((row) => row[j]);
    maxVals.push(Math.max(...col));
  }

  const D: number[] = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      D[j] += Math.abs(norm[i][j] - maxVals[j]);
    }
  }

  const weights = normalizeWeights(D);

  return {
    weights,
    details: {
      deviations: D,
      maxValues: maxVals,
      normalizedMatrix: norm,
    },
  };
}

/**
 * DEMATEL - Decision Making Trial and Evaluation Laboratory
 * Input: direct-influence matrix (n x n), where a[i][j] = influence of i on j (0-4 scale).
 */
function DEMATEL(
  matrix: number[][]
): WeightingResult & { prominence: number[]; relation: number[] } {
  const n = matrix.length;

  // Step 1: Normalize the direct-relation matrix
  // X = A / max(row_sums of A)
  const rowSums: number[] = matrix.map((row) => sum(row));
  const maxRowSum = Math.max(...rowSums);
  const X: number[][] = matrix.map((row) =>
    row.map((val) => (maxRowSum === 0 ? 0 : val / maxRowSum))
  );

  // Step 2: Total relation matrix T = X * (I - X)^(-1)
  const I = identity(n);
  const IminusX = matSub(I, X);
  const IminusXinv = invertMatrix(IminusX);
  const T = matMul(X, IminusXinv);

  // Step 3: D = row sums of T, R = column sums of T
  const D: number[] = T.map((row) => sum(row));
  const R: number[] = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      R[j] += T[i][j];
    }
  }

  // Step 4: Prominence and Relation
  const prominence: number[] = D.map((d, i) => d + R[i]);
  const relation: number[] = D.map((d, i) => d - R[i]);

  // Weights from normalized prominence
  const weights = normalizeWeights(prominence.map((p) => Math.abs(p)));

  return {
    weights,
    prominence,
    relation,
    details: {
      normalizedMatrix: X,
      totalRelationMatrix: T,
      D,
      R,
      prominence,
      relation,
    },
  };
}

/**
 * MACBETH - Measuring Attractiveness by a Categorical Based Evaluation TecHnique
 * Input: pairwise matrix (n x n) with categorical differences (0-6 scale):
 *   0 = no difference, 1 = very weak, 2 = weak, 3 = moderate,
 *   4 = strong, 5 = very strong, 6 = extreme
 */
function MACBETH(matrix: number[][]): WeightingResult {
  const n = matrix.length;

  // Row-sum scoring: score_j = sum of row j (upper triangle values)
  const scores: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      scores[i] += matrix[i][j];
    }
  }

  const weights = normalizeWeights(scores);

  return {
    weights,
    details: {
      scores,
      matrix,
    },
  };
}

/**
 * PSI - Preference Selection Index
 * No subjective input required; weights derived from decision matrix.
 */
function PSI(
  matrix: number[][],
  criteriaTypes: string[]
): WeightingResult {
  const m = matrix.length;
  const n = matrix[0].length;

  // Step 1: Normalize
  // Benefit: N_ij = x_ij / max_j
  // Cost:    N_ij = min_j / x_ij
  const norm: number[][] = Array.from({ length: m }, () => new Array(n));
  for (let j = 0; j < n; j++) {
    const col = matrix.map((row) => row[j]);
    const minVal = Math.min(...col);
    const maxVal = Math.max(...col);

    for (let i = 0; i < m; i++) {
      if (isBenefit(criteriaTypes[j])) {
        norm[i][j] = maxVal === 0 ? 0 : matrix[i][j] / maxVal;
      } else {
        norm[i][j] = matrix[i][j] === 0 ? 0 : minVal / matrix[i][j];
      }
    }
  }

  // Step 2: Mean of normalized values per criterion
  const N: number[] = [];
  for (let j = 0; j < n; j++) {
    const col = norm.map((row) => row[j]);
    N.push(mean(col));
  }

  // Step 3: Preference variation value
  // PV_j = sum_i (N_ij - N_mean_j)^2
  const PV: number[] = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      PV[j] += (norm[i][j] - N[j]) ** 2;
    }
  }

  // Step 4: Deviation in preference value
  // Phi_j = 1 - PV_j
  // This can go negative for large variations; use absolute
  const Phi: number[] = PV.map((pv) => 1 - pv);

  // Step 5: Overall preference value (PSI)
  // Psi_j = Phi_j / sum(Phi_j) -- but if Phi has negatives, use Phi directly
  // Some formulations use PV directly. We handle both cases.
  const positivePhis = Phi.every((p) => p >= 0);
  const weights = positivePhis
    ? normalizeWeights(Phi)
    : normalizeWeights(PV);

  return {
    weights,
    details: {
      normalizedMatrix: norm,
      meanNormalized: N,
      preferenceVariation: PV,
      deviationPreference: Phi,
    },
  };
}

/**
 * FUCOM - Full Consistency Method
 * ranking: priority order values for each criterion (1 = most important).
 *          Fractional values represent the ratio compared to the best.
 * comparisons: pairwise comparison values between consecutively ranked criteria.
 *              comparisons[i] = w_{(i)} / w_{(i+1)} for the sorted ranking.
 */
function FUCOM(
  ranking: number[],
  comparisons: number[]
): WeightingResult {
  const n = ranking.length;

  // Sort criteria indices by ranking (ascending = most important first)
  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => ranking[a] - ranking[b]);

  // Cumulative products to derive weights:
  // w_{(1)} = 1, w_{(k)} = w_{(k-1)} / comparisons[k-1]
  const sortedWeights: number[] = [1];
  for (let i = 0; i < comparisons.length; i++) {
    const comp = comparisons[i] === 0 ? 1 : comparisons[i];
    sortedWeights.push(sortedWeights[i] / comp);
  }
  // If comparisons shorter than n-1, fill remaining with last weight
  while (sortedWeights.length < n) {
    sortedWeights.push(sortedWeights[sortedWeights.length - 1]);
  }

  // Map back to original order
  const rawWeights: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    rawWeights[indices[i]] = sortedWeights[i];
  }

  const weights = normalizeWeights(rawWeights);

  // Transitivity check: w_{(i)}/w_{(i+2)} should equal comparisons[i]*comparisons[i+1]
  const transitivityErrors: number[] = [];
  for (let i = 0; i < comparisons.length - 1; i++) {
    const expectedRatio = comparisons[i] * comparisons[i + 1];
    const actualRatio =
      sortedWeights[i + 2] === 0
        ? Infinity
        : sortedWeights[i] / sortedWeights[i + 2];
    transitivityErrors.push(Math.abs(actualRatio - expectedRatio));
  }

  const DFC = transitivityErrors.length > 0 ? Math.max(...transitivityErrors) : 0;

  return {
    weights,
    details: {
      sortedIndices: indices,
      sortedWeights,
      transitivityErrors,
      DFC,
      isFullyConsistent: DFC < 1e-10,
    },
  };
}

/**
 * BWM - Best-Worst Method
 * bestToOthers: comparisons of the best criterion to all others (1-9 scale).
 * othersToWorst: comparisons of all criteria to the worst (1-9 scale).
 * bestIdx: index of the best criterion.
 * worstIdx: index of the worst criterion.
 */
function BWM(
  bestToOthers: number[],
  othersToWorst: number[],
  bestIdx: number,
  worstIdx: number
): WeightingResult {
  const n = bestToOthers.length;

  // Dual estimation approach:
  // w_B / w_j = a_Bj  =>  w_j = w_B / a_Bj
  // w_j / w_W = a_jW  =>  w_j = a_jW * w_W

  // From best-to-others: w_j = w_B / a_Bj
  const fromBest: number[] = bestToOthers.map((a) =>
    a === 0 ? 1 : 1 / a
  );

  // From others-to-worst: w_j = a_jW (proportional to w_W)
  const fromWorst: number[] = othersToWorst.map((a) => a);

  // Average the two estimates (after normalizing each independently)
  const normBest = normalizeWeights(fromBest);
  const normWorst = normalizeWeights(fromWorst);

  const avgWeights: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    avgWeights[i] = (normBest[i] + normWorst[i]) / 2;
  }

  const weights = normalizeWeights(avgWeights);

  // Consistency Ratio for BWM
  // ksi* = max_j |w_B/w_j - a_Bj|, |w_j/w_W - a_jW|
  let maxDeviation = 0;
  const wB = weights[bestIdx];
  const wW = weights[worstIdx];
  for (let j = 0; j < n; j++) {
    if (weights[j] > 0) {
      const dev1 = Math.abs(wB / weights[j] - bestToOthers[j]);
      maxDeviation = Math.max(maxDeviation, dev1);
    }
    if (wW > 0) {
      const dev2 = Math.abs(weights[j] / wW - othersToWorst[j]);
      maxDeviation = Math.max(maxDeviation, dev2);
    }
  }

  // Consistency Index table for BWM (based on a_BW)
  const CITable: Record<number, number> = {
    1: 0, 2: 0.44, 3: 1.0, 4: 1.63, 5: 2.3,
    6: 3.0, 7: 3.73, 8: 4.47, 9: 5.23,
  };
  const aBW = bestToOthers[worstIdx];
  const CI = CITable[aBW] ?? 5.23;
  const CR = CI === 0 ? 0 : maxDeviation / CI;

  return {
    weights,
    details: {
      bestIndex: bestIdx,
      worstIndex: worstIdx,
      bestToOthers,
      othersToWorst,
      weightsFromBest: normBest,
      weightsFromWorst: normWorst,
      maxDeviation,
      CI,
      CR,
      isConsistent: CR < 0.1,
    },
  };
}

// =============================================================================
// Export
// =============================================================================

export const WeightingMethods = {
  AHP,
  CRITIC,
  ENTROPY,
  SWARA,
  PIPRECIA,
  MEREC,
  SD,
  CILOS,
  IDOCRIW,
  LOPCOW,
  ITARA,
  EAMR,
  DEMATEL,
  MACBETH,
  PSI,
  FUCOM,
  BWM,
};

export default WeightingMethods;

// Also export utilities for external use
export {
  sum,
  mean,
  stdDev,
  correlation,
  transpose,
  normalizeWeights,
};

// Export individual methods for tree-shaking
export {
  AHP,
  CRITIC,
  ENTROPY,
  SWARA,
  PIPRECIA,
  MEREC,
  SD,
  CILOS,
  IDOCRIW,
  LOPCOW,
  ITARA,
  EAMR,
  DEMATEL,
  MACBETH,
  PSI,
  FUCOM,
  BWM,
};
