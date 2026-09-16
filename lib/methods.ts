// Method registry - metadata for all MCDM methods

export type MethodCategory = 'weighting' | 'ranking' | 'fuzzy';
export type InputType = 'pairwise' | 'pairwise_macbeth' | 'bwm' | 'fucom' | 'stepwise' | 'direct_influence' | 'decision_matrix_only' | 'decision_matrix_with_types' | 'fuzzy_matrix' | 'spherical_fuzzy';

export interface MethodInfo {
  name: string;
  fullName: string;
  input?: InputType;
  desc?: string;
  params?: Record<string, { label: string; default: number; min?: number; max?: number }>;
}

export const METHODS: Record<MethodCategory, Record<string, MethodInfo>> = {
  weighting: {
    AHP: { name: 'AHP', fullName: 'Analytic Hierarchy Process', input: 'pairwise', desc: 'Pairwise comparison of criteria using Saaty\'s 1-9 scale' },
    BWM: { name: 'BWM', fullName: 'Best-Worst Method', input: 'bwm', desc: 'Compare best and worst criteria against others' },
    FUCOM: { name: 'FUCOM', fullName: 'Full Consistency Method', input: 'fucom', desc: 'Rank criteria and provide consecutive pairwise comparisons' },
    SWARA: { name: 'SWARA', fullName: 'Step-wise Weight Assessment Ratio Analysis', input: 'stepwise', desc: 'Assess comparative importance step by step' },
    PIPRECIA: { name: 'PIPRECIA', fullName: 'PIvot Pairwise RElative Criteria Importance Assessment', input: 'stepwise', desc: 'Bidirectional stepwise assessment' },
    MACBETH: { name: 'MACBETH', fullName: 'Measuring Attractiveness by Categorical Based Evaluation', input: 'pairwise_macbeth', desc: 'Pairwise comparison using attractiveness categories (0-6)' },
    DEMATEL: { name: 'DEMATEL', fullName: 'Decision Making Trial and Evaluation Laboratory', input: 'direct_influence', desc: 'Analyze direct influence relationships between criteria' },
    CRITIC: { name: 'CRITIC', fullName: 'CRiteria Importance Through Intercriteria Correlation', input: 'decision_matrix_only', desc: 'Objective weights from standard deviation and correlation' },
    ENTROPY: { name: 'ENTROPY', fullName: 'Shannon Entropy Method', input: 'decision_matrix_only', desc: 'Objective weights based on information entropy' },
    SD: { name: 'SD', fullName: 'Standard Deviation Method', input: 'decision_matrix_only', desc: 'Weights proportional to standard deviation' },
    MEREC: { name: 'MEREC', fullName: 'Method based on Removal Effects of Criteria', input: 'decision_matrix_with_types', desc: 'Objective weights based on removal effect of each criterion' },
    CILOS: { name: 'CILOS', fullName: 'Criterion Impact LOSs', input: 'decision_matrix_with_types', desc: 'Weights from criterion impact loss concept' },
    IDOCRIW: { name: 'IDOCRIW', fullName: 'Integrated Determination of Objective Criteria Weights', input: 'decision_matrix_with_types', desc: 'Combines ENTROPY and CILOS methods' },
    LOPCOW: { name: 'LOPCOW', fullName: 'Logarithmic Percentage Change-driven Objective Weighting', input: 'decision_matrix_with_types', desc: 'Logarithmic percentage change-based weights' },
    ITARA: { name: 'ITARA', fullName: 'Indifference Threshold-based Attribute Ratio Analysis', input: 'decision_matrix_with_types', desc: 'Weights from indifference thresholds' },
    EAMR: { name: 'EAMR', fullName: 'Equally-weighted Absolute-value Maximum-deviation Ratio', input: 'decision_matrix_with_types', desc: 'Maximum deviation-based objective weights' },
    PSI: { name: 'PSI', fullName: 'Preference Selection Index', input: 'decision_matrix_with_types', desc: 'Preference-based objective weights' },
  },
  ranking: {
    TOPSIS: { name: 'TOPSIS', fullName: 'Technique for Order of Preference by Similarity to Ideal Solution' },
    VIKOR: { name: 'VIKOR', fullName: 'VlseKriterijumska Optimizacija I Kompromisno Resenje', params: { v: { label: 'v (strategy weight)', default: 0.5, min: 0, max: 1 } } },
    SAW: { name: 'SAW', fullName: 'Simple Additive Weighting (WSM)' },
    WPM: { name: 'WPM', fullName: 'Weighted Product Model' },
    WASPAS: { name: 'WASPAS', fullName: 'Weighted Aggregated Sum Product Assessment', params: { lambda: { label: 'Lambda', default: 0.5, min: 0, max: 1 } } },
    EDAS: { name: 'EDAS', fullName: 'Evaluation based on Distance from Average Solution' },
    CODAS: { name: 'CODAS', fullName: 'Combinative Distance-based Assessment' },
    CoCoSo: { name: 'CoCoSo', fullName: 'Combined Compromise Solution' },
    COPRAS: { name: 'COPRAS', fullName: 'Complex Proportional Assessment' },
    MARCOS: { name: 'MARCOS', fullName: 'Measurement of Alternatives and Ranking according to Compromise Solution' },
    MABAC: { name: 'MABAC', fullName: 'Multi-Attributive Border Approximation area Comparison' },
    MAIRCA: { name: 'MAIRCA', fullName: 'Multi-Attributive Ideal-Real Comparative Analysis' },
    MOORA: { name: 'MOORA', fullName: 'Multi-Objective Optimization by Ratio Analysis' },
    MULTIMOORA: { name: 'MULTIMOORA', fullName: 'MOORA plus Full Multiplicative Form' },
    ARAS: { name: 'ARAS', fullName: 'Additive Ratio Assessment' },
    OCRA: { name: 'OCRA', fullName: 'Operational Competitiveness Rating' },
    PIV: { name: 'PIV', fullName: 'Proximity Indexed Value' },
    TODIM: { name: 'TODIM', fullName: 'Interactive Multi-Criteria Decision Making', params: { theta: { label: 'Theta (loss aversion)', default: 1, min: 0.1, max: 10 } } },
    ROV: { name: 'ROV', fullName: 'Range of Value' },
    REGIME: { name: 'REGIME', fullName: 'Regime Method' },
    GRA: { name: 'GRA', fullName: 'Grey Relational Analysis', params: { rho: { label: 'Rho (distinguishing coeff)', default: 0.5, min: 0, max: 1 } } },
    PROMETHEE: { name: 'PROMETHEE', fullName: 'Preference Ranking Organization Method for Enrichment Evaluation II' },
    ELECTRE: { name: 'ELECTRE', fullName: 'Elimination and Choice Translating Reality I' },
    EXPROM: { name: 'EXPROM', fullName: 'Extended PROMETHEE' },
    RAFSI: { name: 'RAFSI', fullName: 'Ranking of Alternatives through Functional mapping of criterion sub-Intervals' },
    WISP: { name: 'WISP', fullName: 'Weighted Integrated Sum Product' },
    MOOSRA: { name: 'MOOSRA', fullName: 'Multi-Objective Optimization on basis of Simple Ratio Analysis' },
    COBRA: { name: 'COBRA', fullName: 'Comprehensive Distance Based Ranking' },
    MAUT: { name: 'MAUT', fullName: 'Multi-Attribute Utility Theory' },
  },
  fuzzy: {
    'F-TOPSIS': { name: 'F-TOPSIS', fullName: 'Fuzzy TOPSIS', input: 'fuzzy_matrix' },
    'F-VIKOR': { name: 'F-VIKOR', fullName: 'Fuzzy VIKOR', input: 'fuzzy_matrix', params: { v: { label: 'v', default: 0.5 } } },
    'SF-TOPSIS': { name: 'SF-TOPSIS', fullName: 'Spherical Fuzzy TOPSIS', input: 'spherical_fuzzy' },
    'SF-VIKOR': { name: 'SF-VIKOR', fullName: 'Spherical Fuzzy VIKOR', input: 'spherical_fuzzy', params: { v: { label: 'v', default: 0.5 } } },
  }
};

export function getMethodInfo(category: MethodCategory, method: string): MethodInfo | undefined {
  return METHODS[category]?.[method];
}

export function needsAlternatives(category: MethodCategory, method: string): boolean {
  if (category === 'ranking' || category === 'fuzzy') return true;
  const info = getMethodInfo(category, method);
  return info?.input === 'decision_matrix_only' || info?.input === 'decision_matrix_with_types';
}
