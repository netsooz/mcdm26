import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  PageNumber,
  Header,
  Footer,
  ShadingType,
  VerticalAlign,
} from 'docx';
import { saveAs } from 'file-saver';
import { competitionRanks } from './methods/ranking';

// ============================================================
// Types
// ============================================================

export interface ProjectData {
  projectName: string;
  methodName: string;
  methodCategory: 'weighting' | 'ranking' | 'fuzzy';
  criteriaNames: string[];
  alternativeNames: string[];
  inputData: any;
  weights: number[] | null;
  results: any;
  timestamp: Date;
}

// ============================================================
// Method Descriptions
// ============================================================

const METHOD_DESCRIPTIONS: Record<string, string> = {
  AHP: 'The Analytic Hierarchy Process (AHP) is a structured technique for organizing and analyzing complex decisions based on mathematics and psychology. It uses pairwise comparisons of criteria and alternatives to derive ratio scales, enabling decision-makers to decompose problems into a hierarchy of sub-problems that can be independently analyzed. AHP checks the consistency of comparisons through a consistency ratio, ensuring reliable results.',

  BWM: 'Best-Worst Method (BWM) is a multi-criteria decision-making method that uses structured pairwise comparisons between the best and worst criteria and the other criteria. It requires fewer comparisons than AHP while maintaining high consistency. The method determines optimal weights by solving a min-max optimization problem, resulting in a unique set of weights.',

  FUCOM: 'Full Consistency Method (FUCOM) is a subjective weighting method that requires the decision-maker to rank criteria by importance and then provide pairwise comparisons of adjacent criteria. It minimizes deviations from full consistency conditions through mathematical optimization, producing weights with minimal total deviation from maximum consistency.',

  ENTROPY: 'The Entropy method is an objective weighting approach based on information theory. It measures the amount of information contained in each criterion by calculating its entropy value. Criteria with greater variation among alternatives receive higher weights, as they provide more information for distinguishing between alternatives. No subjective judgment is required.',

  CRITIC: 'CRiteria Importance Through Intercriteria Correlation (CRITIC) is an objective weighting method that considers both the contrast intensity (standard deviation) and the conflicting character (correlation) of evaluation criteria. It combines variability and interdependence of criteria to determine their objective weights.',

  MEREC: 'MEthod based on the Removal Effects of Criteria (MEREC) is an objective weighting method that determines criteria weights by analyzing the effect of removing each criterion on the overall performance of alternatives. Criteria whose removal causes larger changes in the ranking are assigned higher weights.',

  TOPSIS: 'Technique for Order of Preference by Similarity to Ideal Solution (TOPSIS) is a ranking method that selects the alternative with the shortest geometric distance from the positive ideal solution and the longest geometric distance from the negative ideal solution. It assumes that each criterion has a monotonically increasing or decreasing trend of utility.',

  VIKOR: 'VIseKriterijumska Optimizacija I Kompromisno Resenje (VIKOR) is a compromise ranking method that determines a compromise solution closest to the ideal. It introduces the concept of maximum group utility and minimum individual regret, ranking alternatives by the closeness to the ideal solution with a balance parameter v.',

  SAW: 'Simple Additive Weighting (SAW) is one of the simplest multi-criteria decision-making methods. It calculates a weighted sum of the performance ratings for each alternative across all criteria after normalization. The alternative with the highest total score is considered the best.',

  WASPAS: 'Weighted Aggregated Sum Product Assessment (WASPAS) combines the Weighted Sum Model (WSM) and Weighted Product Model (WPM) to increase ranking accuracy. It uses a combination parameter lambda to balance between additive and multiplicative aggregation, providing more robust rankings than either method alone.',

  EDAS: 'Evaluation Based on Distance from Average Solution (EDAS) is a ranking method that uses the distance from the average solution as a reference point. It calculates Positive Distance from Average (PDA) and Negative Distance from Average (NDA) for each alternative, then combines them into an appraisal score for final ranking.',

  MABAC: 'Multi-Attributive Border Approximation area Comparison (MABAC) is a ranking method based on the distance of each alternative from the border approximation area (BAA). Alternatives above the BAA are considered good, while those below are considered poor. The method is characterized by stability of results and simplicity of computation.',

  CODAS: 'COmbinative Distance-based Assessment (CODAS) determines the desirability of alternatives using Euclidean and Taxicab distances from the negative ideal solution. The Euclidean distance is the primary measure, while the Taxicab distance is used as a secondary measure when Euclidean distances are very similar.',

  ARAS: 'Additive Ratio ASsessment (ARAS) is a ranking method that determines the utility degree of alternatives by comparing their optimality criteria values with the optimal value. It uses a ratio system where the degree of utility indicates how well each alternative compares to the ideally best alternative.',

  COPRAS: 'COmplex PRoportional ASsessment (COPRAS) is a ranking method that evaluates alternatives by considering the proportional influence of maximizing and minimizing criteria on the final assessment. It calculates the significance and utility degree of each alternative, handling both benefit and cost criteria directly.',

  MOORA: 'Multi-Objective Optimization on the basis of Ratio Analysis (MOORA) is a ranking method that uses a ratio system where each response of an alternative on a criterion is compared to a denominator representing all alternatives for that criterion. It combines a ratio system approach with a reference point approach for robust rankings.',

  PROMETHEE: 'Preference Ranking Organization Method for Enrichment Evaluations (PROMETHEE) is an outranking method that uses preference functions to compare alternatives pairwise on each criterion. It calculates positive and negative preference flows to determine partial (PROMETHEE I) and complete (PROMETHEE II) rankings of alternatives.',

  ELECTRE: 'ELimination Et Choix Traduisant la REalite (ELECTRE) is an outranking method that uses concordance and discordance indices to establish dominance relations between alternatives. It constructs concordance and discordance matrices based on pairwise comparisons, then applies threshold values to determine outranking relationships.',

  'F-TOPSIS': 'Fuzzy TOPSIS extends the classical TOPSIS method by using triangular fuzzy numbers (TFNs) to handle linguistic variables and uncertain evaluations. Decision matrices and weights are expressed as TFNs, and the method calculates distances to fuzzy positive and negative ideal solutions to rank alternatives under uncertainty.',

  'F-VIKOR': 'Fuzzy VIKOR extends the classical VIKOR method by incorporating triangular fuzzy numbers to handle imprecise and uncertain information. It computes fuzzy utility, regret, and compromise measures, then defuzzifies them to produce final rankings. This approach is particularly useful when decision-makers cannot express precise numerical judgments.',
};

// ============================================================
// Styling Constants
// ============================================================

const FONT_BODY = 'Times New Roman';
const FONT_SIZE_BODY = 24; // 12pt in half-points
const FONT_SIZE_HEADING = 28; // 14pt in half-points
const MARGIN = 1440; // 1 inch in twips
const HEADER_SHADING = 'B4C6E7';

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
};

// ============================================================
// Helper Functions
// ============================================================

function createBodyText(text: string, bold = false): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT_BODY,
        size: FONT_SIZE_BODY,
        bold,
      }),
    ],
    spacing: { after: 120 },
  });
}

function createSectionHeading(
  sectionNumber: string,
  title: string
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${sectionNumber}. ${title}`,
        font: FONT_BODY,
        size: FONT_SIZE_HEADING,
        bold: true,
      }),
    ],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
  });
}

function createSubHeading(
  sectionNumber: string,
  title: string
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${sectionNumber} ${title}`,
        font: FONT_BODY,
        size: FONT_SIZE_HEADING,
        bold: true,
      }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
  });
}

function createHeaderCell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: FONT_BODY,
            size: FONT_SIZE_BODY,
            bold: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
    shading: {
      type: ShadingType.SOLID,
      color: HEADER_SHADING,
      fill: HEADER_SHADING,
    },
    verticalAlign: VerticalAlign.CENTER,
  });
}

function createDataCell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: FONT_BODY,
            size: FONT_SIZE_BODY,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
    verticalAlign: VerticalAlign.CENTER,
  });
}

function createDataTable(
  headers: string[],
  rows: string[][]
): Table {
  const headerRow = new TableRow({
    children: headers.map((h) => createHeaderCell(h)),
    tableHeader: true,
  });

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((cell) => createDataCell(cell)),
      })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
  });
}

function formatNumber(value: number, decimals = 4): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return value.toFixed(decimals);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================
// Section Builders
// ============================================================

function buildTitlePage(data: ProjectData): (Paragraph | Table)[] {
  return [
    new Paragraph({ spacing: { before: 4000 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: data.projectName,
          font: FONT_BODY,
          size: 52, // 26pt
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Method: ${data.methodName}`,
          font: FONT_BODY,
          size: 36, // 18pt
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Category: ${data.methodCategory.charAt(0).toUpperCase() + data.methodCategory.slice(1)}`,
          font: FONT_BODY,
          size: 28,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: formatDate(data.timestamp),
          font: FONT_BODY,
          size: FONT_SIZE_BODY,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Generated by MCDM Decision Tool',
          font: FONT_BODY,
          size: FONT_SIZE_BODY,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({ pageBreakBefore: true }),
  ];
}

function buildTableOfContents(): (Paragraph | Table)[] {
  const tocEntries = [
    '1. Introduction',
    '2. Input Data',
    '3. Methodology',
    '4. Results',
    '5. Summary and Recommendations',
  ];

  return [
    new Paragraph({
      children: [
        new TextRun({
          text: 'Table of Contents',
          font: FONT_BODY,
          size: FONT_SIZE_HEADING,
          bold: true,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    ...tocEntries.map(
      (entry) =>
        new Paragraph({
          children: [
            new TextRun({
              text: entry,
              font: FONT_BODY,
              size: FONT_SIZE_BODY,
            }),
          ],
          spacing: { after: 80 },
        })
    ),
    new Paragraph({ pageBreakBefore: true }),
  ];
}

function buildIntroduction(data: ProjectData): (Paragraph | Table)[] {
  const desc =
    METHOD_DESCRIPTIONS[data.methodName] ||
    `The ${data.methodName} method is a multi-criteria decision-making technique used to evaluate and rank alternatives based on multiple criteria.`;

  return [
    createSectionHeading('1', 'Introduction'),
    createBodyText(
      `This report presents the results of a multi-criteria decision-making analysis conducted using the ${data.methodName} method. The analysis evaluates ${data.alternativeNames.length} alternatives across ${data.criteriaNames.length} criteria.`
    ),
    createSubHeading('1.1', 'Method Description'),
    createBodyText(desc),
    createSubHeading('1.2', 'Problem Structure'),
    createBodyText(`Criteria: ${data.criteriaNames.join(', ')}`),
    createBodyText(
      `Alternatives: ${data.alternativeNames.join(', ')}`
    ),
  ];
}

function buildInputData(data: ProjectData): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = [
    createSectionHeading('2', 'Input Data'),
  ];

  // Decision Matrix
  if (data.inputData?.matrix) {
    paragraphs.push(createSubHeading('2.1', 'Decision Matrix'));
    paragraphs.push(
      createBodyText(
        'The following table presents the decision matrix used in the analysis:'
      )
    );

    const matrix = data.inputData.matrix;
    const headers = ['Alternative', ...data.criteriaNames];
    const rows: string[][] = [];

    for (let i = 0; i < matrix.length; i++) {
      const altName =
        data.alternativeNames[i] || `A${i + 1}`;
      const rowData = matrix[i].map((val: any) => {
        if (Array.isArray(val)) {
          return `(${val.map((v: number) => formatNumber(v, 2)).join(', ')})`;
        }
        if (typeof val === 'object' && val !== null && 'mu' in val) {
          return `(${formatNumber(val.mu, 2)}, ${formatNumber(val.nu, 2)}, ${formatNumber(val.pi, 2)})`;
        }
        return formatNumber(val, 4);
      });
      rows.push([altName, ...rowData]);
    }

    paragraphs.push(createDataTable(headers, rows));
    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
  }

  // Pairwise comparison matrix (for AHP, BWM, etc.)
  if (data.inputData?.pairwiseMatrix) {
    paragraphs.push(
      createSubHeading('2.1', 'Pairwise Comparison Matrix')
    );
    paragraphs.push(
      createBodyText(
        'The pairwise comparison matrix reflects the relative importance of criteria:'
      )
    );

    const pwMatrix = data.inputData.pairwiseMatrix;
    const headers = ['', ...data.criteriaNames];
    const rows: string[][] = [];
    for (let i = 0; i < pwMatrix.length; i++) {
      rows.push([
        data.criteriaNames[i] || `C${i + 1}`,
        ...pwMatrix[i].map((v: number) => formatNumber(v, 3)),
      ]);
    }
    paragraphs.push(createDataTable(headers, rows));
    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
  }

  // Weights
  if (data.weights) {
    paragraphs.push(createSubHeading('2.2', 'Criteria Weights'));
    paragraphs.push(
      createBodyText('The following weights were assigned to the criteria:')
    );

    const wHeaders = ['Criterion', 'Weight'];
    const wRows = data.criteriaNames.map((name, i) => [
      name,
      formatNumber(data.weights![i], 4),
    ]);
    paragraphs.push(createDataTable(wHeaders, wRows));
    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
  }

  return paragraphs;
}

function buildMethodology(data: ProjectData): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = [
    createSectionHeading('3', 'Methodology'),
    createBodyText(
      `This section presents the intermediate calculations performed during the ${data.methodName} analysis.`
    ),
  ];

  const details = data.results?.details || {};
  let subSection = 1;

  // Normalized Matrix
  if (details.normalizedMatrix) {
    paragraphs.push(
      createSubHeading(`3.${subSection}`, 'Normalized Decision Matrix')
    );
    paragraphs.push(
      createBodyText(
        'The decision matrix was normalized to make criteria values comparable:'
      )
    );

    const normMatrix = details.normalizedMatrix;
    const headers = ['Alternative', ...data.criteriaNames];
    const rows: string[][] = [];
    for (let i = 0; i < normMatrix.length; i++) {
      const altName =
        data.alternativeNames[i] || `A${i + 1}`;
      const rowData = normMatrix[i].map((val: any) => {
        if (Array.isArray(val))
          return `(${val.map((v: number) => formatNumber(v, 4)).join(', ')})`;
        return formatNumber(val, 4);
      });
      rows.push([altName, ...rowData]);
    }
    paragraphs.push(createDataTable(headers, rows));
    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
    subSection++;
  }

  // Weighted Matrix
  if (details.weightedMatrix) {
    paragraphs.push(
      createSubHeading(`3.${subSection}`, 'Weighted Normalized Matrix')
    );
    paragraphs.push(
      createBodyText(
        'The normalized matrix was multiplied by the criteria weights:'
      )
    );

    const wMatrix = details.weightedMatrix;
    const headers = ['Alternative', ...data.criteriaNames];
    const rows: string[][] = [];
    for (let i = 0; i < wMatrix.length; i++) {
      const altName =
        data.alternativeNames[i] || `A${i + 1}`;
      const rowData = wMatrix[i].map((val: any) => {
        if (Array.isArray(val))
          return `(${val.map((v: number) => formatNumber(v, 4)).join(', ')})`;
        if (typeof val === 'object' && val !== null && 'mu' in val)
          return `(${formatNumber(val.mu, 4)}, ${formatNumber(val.nu, 4)}, ${formatNumber(val.pi, 4)})`;
        return formatNumber(val, 4);
      });
      rows.push([altName, ...rowData]);
    }
    paragraphs.push(createDataTable(headers, rows));
    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
    subSection++;
  }

  // Ideal Solutions (TOPSIS, VIKOR, etc.)
  if (details.positiveIdeal || details.fpis || details.sfpis) {
    paragraphs.push(
      createSubHeading(`3.${subSection}`, 'Ideal Solutions')
    );

    if (details.positiveIdeal) {
      paragraphs.push(createBodyText('Positive Ideal Solution (PIS):', true));
      paragraphs.push(
        createBodyText(
          details.positiveIdeal
            .map((v: number) => formatNumber(v, 4))
            .join(', ')
        )
      );
      paragraphs.push(createBodyText('Negative Ideal Solution (NIS):', true));
      paragraphs.push(
        createBodyText(
          details.negativeIdeal
            .map((v: number) => formatNumber(v, 4))
            .join(', ')
        )
      );
    }

    if (details.fpis) {
      paragraphs.push(
        createBodyText('Fuzzy Positive Ideal Solution (FPIS):', true)
      );
      paragraphs.push(
        createBodyText(
          details.fpis
            .map(
              (v: number[]) =>
                `(${v.map((x: number) => formatNumber(x, 4)).join(', ')})`
            )
            .join('; ')
        )
      );
      paragraphs.push(
        createBodyText('Fuzzy Negative Ideal Solution (FNIS):', true)
      );
      paragraphs.push(
        createBodyText(
          details.fnis
            .map(
              (v: number[]) =>
                `(${v.map((x: number) => formatNumber(x, 4)).join(', ')})`
            )
            .join('; ')
        )
      );
    }

    if (details.sfpis) {
      paragraphs.push(
        createBodyText(
          'Spherical Fuzzy Positive Ideal Solution (SF-PIS):',
          true
        )
      );
      paragraphs.push(
        createBodyText(
          details.sfpis
            .map(
              (v: any) =>
                `(mu=${formatNumber(v.mu, 4)}, nu=${formatNumber(v.nu, 4)}, pi=${formatNumber(v.pi, 4)})`
            )
            .join('; ')
        )
      );
      paragraphs.push(
        createBodyText(
          'Spherical Fuzzy Negative Ideal Solution (SF-NIS):',
          true
        )
      );
      paragraphs.push(
        createBodyText(
          details.sfnis
            .map(
              (v: any) =>
                `(mu=${formatNumber(v.mu, 4)}, nu=${formatNumber(v.nu, 4)}, pi=${formatNumber(v.pi, 4)})`
            )
            .join('; ')
        )
      );
    }

    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
    subSection++;
  }

  // Distances
  if (details.distanceToPositive || details.S) {
    paragraphs.push(
      createSubHeading(`3.${subSection}`, 'Distance Measures')
    );

    if (details.distanceToPositive) {
      const dHeaders = [
        'Alternative',
        'Distance to PIS (D+)',
        'Distance to NIS (D-)',
      ];
      const dRows = data.alternativeNames.map((name, i) => [
        name,
        formatNumber(details.distanceToPositive[i], 4),
        formatNumber(details.distanceToNegative[i], 4),
      ]);
      paragraphs.push(createDataTable(dHeaders, dRows));
    }

    if (details.S && details.R && details.Q) {
      paragraphs.push(
        createBodyText('VIKOR utility (S), regret (R), and compromise (Q) measures:')
      );
      const vHeaders = ['Alternative', 'S', 'R', 'Q'];
      const vRows = data.alternativeNames.map((name, i) => [
        name,
        formatNumber(details.S[i], 4),
        formatNumber(details.R[i], 4),
        formatNumber(details.Q[i], 4),
      ]);
      paragraphs.push(createDataTable(vHeaders, vRows));
    }

    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
    subSection++;
  }

  // Consistency (AHP, BWM, FUCOM)
  if (details.consistencyRatio !== undefined || details.consistency !== undefined) {
    paragraphs.push(
      createSubHeading(`3.${subSection}`, 'Consistency Analysis')
    );

    if (details.consistencyRatio !== undefined) {
      paragraphs.push(
        createBodyText(
          `Consistency Ratio (CR): ${formatNumber(details.consistencyRatio, 4)}`
        )
      );
      paragraphs.push(
        createBodyText(
          details.consistencyRatio < 0.1
            ? 'The consistency ratio is below 0.10, indicating acceptable consistency in the pairwise comparisons.'
            : 'Warning: The consistency ratio exceeds 0.10, suggesting the pairwise comparisons may need to be revised.'
        )
      );
    }

    if (details.consistencyIndex !== undefined) {
      paragraphs.push(
        createBodyText(
          `Consistency Index (CI): ${formatNumber(details.consistencyIndex, 4)}`
        )
      );
    }

    if (details.consistency !== undefined) {
      paragraphs.push(
        createBodyText(
          `Consistency: ${formatNumber(details.consistency, 4)}`
        )
      );
    }

    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
    subSection++;
  }

  // Concordance/Discordance (ELECTRE)
  if (details.concordanceMatrix) {
    paragraphs.push(
      createSubHeading(`3.${subSection}`, 'Concordance and Discordance Matrices')
    );
    paragraphs.push(createBodyText('Concordance Matrix:', true));

    const cHeaders = ['', ...data.alternativeNames];
    const cRows = data.alternativeNames.map((name, i) => [
      name,
      ...details.concordanceMatrix[i].map((v: number) =>
        formatNumber(v, 4)
      ),
    ]);
    paragraphs.push(createDataTable(cHeaders, cRows));

    if (details.discordanceMatrix) {
      paragraphs.push(
        new Paragraph({ spacing: { after: 200 } })
      );
      paragraphs.push(createBodyText('Discordance Matrix:', true));

      const dRows = data.alternativeNames.map((name, i) => [
        name,
        ...details.discordanceMatrix[i].map((v: number) =>
          formatNumber(v, 4)
        ),
      ]);
      paragraphs.push(createDataTable(cHeaders, dRows));
    }

    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
    subSection++;
  }

  // Preference flows (PROMETHEE)
  if (details.positiveFlow) {
    paragraphs.push(
      createSubHeading(`3.${subSection}`, 'Preference Flows')
    );

    const fHeaders = [
      'Alternative',
      'Positive Flow (Phi+)',
      'Negative Flow (Phi-)',
      'Net Flow (Phi)',
    ];
    const fRows = data.alternativeNames.map((name, i) => [
      name,
      formatNumber(details.positiveFlow[i], 4),
      formatNumber(details.negativeFlow[i], 4),
      formatNumber(details.netFlow?.[i] ?? details.positiveFlow[i] - details.negativeFlow[i], 4),
    ]);
    paragraphs.push(createDataTable(fHeaders, fRows));
    paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
    subSection++;
  }

  return paragraphs;
}

function buildResults(data: ProjectData): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = [
    createSectionHeading('4', 'Results'),
    createBodyText(
      'The following table presents the final results of the analysis:'
    ),
  ];

  if (data.methodCategory === 'weighting') {
    // Weights table
    const headers = ['Criterion', 'Weight', 'Rank'];
    const weightValues = data.results?.weights || data.weights || [];
    const weightRankings = [...weightValues]
      .map((w: number, i: number) => ({ w, i }))
      .sort((a: { w: number }, b: { w: number }) => b.w - a.w)
      .map(
        (item: { i: number }, rank: number) =>
          ({ index: item.i, rank: rank + 1 } as { index: number; rank: number })
      );
    const rankMap = new Map<number, number>();
    weightRankings.forEach((item: { index: number; rank: number }) => {
      rankMap.set(item.index, item.rank);
    });

    const rows = data.criteriaNames.map((name, i) => [
      name,
      formatNumber(weightValues[i], 4),
      String(rankMap.get(i) || i + 1),
    ]);
    paragraphs.push(createDataTable(headers, rows));
  } else {
    // Scores and rankings table
    const headers = ['Alternative', 'Score', 'Rank'];
    const scores = data.results?.scores || [];
    const rankings = data.results?.rankings || [];
    const display = competitionRanks(rankings);
    const rows = data.alternativeNames.map((name, i) => [
      name,
      formatNumber(scores[i], 4),
      display[i] === undefined
        ? ''
        : display.filter(r => r === display[i]).length > 1
          ? `=${display[i]}`
          : String(display[i]),
    ]);
    paragraphs.push(createDataTable(headers, rows));
  }

  paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
  return paragraphs;
}

function buildSummary(data: ProjectData): (Paragraph | Table)[] {
  const paragraphs: (Paragraph | Table)[] = [
    createSectionHeading('5', 'Summary and Recommendations'),
  ];

  if (data.methodCategory === 'weighting') {
    const weightValues = data.results?.weights || data.weights || [];
    const maxIdx = weightValues.indexOf(
      Math.max(...weightValues)
    );
    const bestCriterion =
      data.criteriaNames[maxIdx] || `C${maxIdx + 1}`;

    paragraphs.push(
      createBodyText(
        `Based on the ${data.methodName} analysis, the most important criterion is "${bestCriterion}" with a weight of ${formatNumber(weightValues[maxIdx], 4)}.`
      )
    );
    paragraphs.push(
      createBodyText(
        'The derived weights can be used as input for ranking methods such as TOPSIS, VIKOR, or other MCDM techniques to evaluate and rank the alternatives.'
      )
    );
  } else {
    const scores = data.results?.scores || [];
    const rankings = data.results?.rankings || [];
    // Average ranks need not contain a literal 1 (a three-way tie for first
    // averages to 2), so look the winner up on the competition ranks.
    const display = competitionRanks(rankings);
    const bestIdx = display.indexOf(1);
    const bestAlt =
      bestIdx >= 0
        ? data.alternativeNames[bestIdx] || `A${bestIdx + 1}`
        : 'N/A';

    paragraphs.push(
      createBodyText(
        `Based on the ${data.methodName} analysis, the best alternative is "${bestAlt}" with a score of ${bestIdx >= 0 ? formatNumber(scores[bestIdx], 4) : 'N/A'}.`
      )
    );

    // Provide ranking summary
    if (rankings.length > 0) {
      const rankedAlts = [...display]
        .map((r: number, i: number) => ({ rank: r, name: data.alternativeNames[i] || `A${i + 1}` }))
        .sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank);

      paragraphs.push(
        createBodyText(
          `Complete ranking: ${rankedAlts.map((a: { rank: number; name: string }) => `${a.rank}. ${a.name}`).join(', ')}`
        )
      );
    }

    paragraphs.push(
      createBodyText(
        'It is recommended to perform sensitivity analysis by varying the criteria weights to assess the robustness of the ranking results.'
      )
    );
  }

  paragraphs.push(
    new Paragraph({ spacing: { after: 200 } })
  );
  paragraphs.push(
    createBodyText(
      `This report was generated on ${formatDate(data.timestamp)} using the MCDM Decision Tool.`,
      false
    )
  );

  return paragraphs;
}

// ============================================================
// Main Export Function
// ============================================================

export async function exportToWord(
  projectData: ProjectData
): Promise<string> {
  const fileName = `${projectData.projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${projectData.methodName}_Report.docx`;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_BODY,
            size: FONT_SIZE_BODY,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: MARGIN,
              right: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${projectData.projectName} - ${projectData.methodName} Analysis`,
                    font: FONT_BODY,
                    size: 18, // 9pt
                    italics: true,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Page ',
                    font: FONT_BODY,
                    size: 18,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT_BODY,
                    size: 18,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          ...buildTitlePage(projectData),
          ...buildTableOfContents(),
          ...buildIntroduction(projectData),
          ...buildInputData(projectData),
          ...buildMethodology(projectData),
          ...buildResults(projectData),
          ...buildSummary(projectData),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
  return fileName;
}

export default exportToWord;
