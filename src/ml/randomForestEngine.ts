/**
 * PondHealth AI — Authentic CART Decision Tree & Random Forest Classifier Engine
 * ==============================================================================
 * Implements a genuine bootstrap-aggregated Random Forest Classifier (CART trees
 * with Gini impurity splitting, feature sub-sampling, out-of-sample stratified
 * 5-fold cross-validation, global Gini feature importance, and local instance-level
 * permutation/counterfactual attribution).
 *
 * Clearly labeled as trained on the Reference Aquaculture Dataset (or user-uploaded
 * CSV dataset) so that predictions, probabilities, and evaluation metrics are
 * mathematically computed rather than hardcoded or fabricated.
 */

export type HealthCategory = 'Healthy' | 'Moderate Risk' | 'Critical Risk';

export interface WaterQualitySample {
  ph: number;
  dissolved_oxygen: number;
  ammonia: number;
  temperature: number;
  species?: string;
  health_category: HealthCategory;
}

export interface FeatureNames {
  ph: number;
  dissolved_oxygen: number;
  ammonia: number;
  temperature: number;
}

export type FeatureKey = keyof FeatureNames;

export const FEATURE_KEYS: FeatureKey[] = [
  'ph',
  'dissolved_oxygen',
  'ammonia',
  'temperature',
];

export const CLASS_LABELS: HealthCategory[] = [
  'Healthy',
  'Moderate Risk',
  'Critical Risk',
];

interface TreeNode {
  isLeaf: boolean;
  probabilities: Record<HealthCategory, number>;
  predictedClass: HealthCategory;
  feature?: FeatureKey;
  threshold?: number;
  impurityDecrease?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface EvaluationMetrics {
  evaluationMethod: string;
  datasetName: string;
  sampleCount: number;
  treeCount: number;
  maxDepth: number;
  trainedAt: string;
  isPrototypeDataset: boolean;
  cvAccuracy: number;
  cvMacroPrecision: number;
  cvMacroRecall: number;
  cvMacroF1: number;
  confusionMatrix: number[][]; // 3x3 corresponding to CLASS_LABELS
  perClassMetrics: Record<
    HealthCategory,
    { precision: number; recall: number; f1: number; support: number }
  >;
}

export interface FeatureContribution {
  feature: FeatureKey;
  label: string;
  value: number;
  unit: string;
  globalImportance: number; // 0..1 Gini importance across forest
  localImpactScore: number; // 0..1 relative contribution to this specific prediction
  direction: 'optimal' | 'elevated_risk' | 'critical_stress';
  status: 'Optimal' | 'Warning' | 'Critical';
  referenceRange: string;
  explanation: string;
}

export interface RFModelPrediction {
  predictedCategory: HealthCategory;
  confidence: number;
  probabilities: Record<HealthCategory, number>;
  treeVotes: Record<HealthCategory, number>;
  totalTrees: number;
  globalFeatureImportances: Record<FeatureKey, number>;
  localContributions: FeatureContribution[];
  engineLabel: string;
  isPrototypeDataset: boolean;
  timestamp: string;
}

// Deterministic PRNG (Mulberry32) so bootstrap sampling & CV splits are reproducible
function createRng(seed: number) {
  let state = seed >>> 0;
  return function nextRandom(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function computeClassCounts(samples: WaterQualitySample[]): Record<HealthCategory, number> {
  const counts: Record<HealthCategory, number> = {
    Healthy: 0,
    'Moderate Risk': 0,
    'Critical Risk': 0,
  };
  for (const s of samples) {
    if (counts[s.health_category] !== undefined) {
      counts[s.health_category]++;
    }
  }
  return counts;
}

function computeGini(samples: WaterQualitySample[]): number {
  const n = samples.length;
  if (n === 0) return 0;
  const counts = computeClassCounts(samples);
  let sumSq = 0;
  for (const label of CLASS_LABELS) {
    const p = counts[label] / n;
    sumSq += p * p;
  }
  return 1 - sumSq;
}

function getMajorityAndProbs(samples: WaterQualitySample[]): {
  predictedClass: HealthCategory;
  probabilities: Record<HealthCategory, number>;
} {
  const counts = computeClassCounts(samples);
  const n = Math.max(samples.length, 1);
  const probabilities: Record<HealthCategory, number> = {
    Healthy: Number((counts['Healthy'] / n).toFixed(4)),
    'Moderate Risk': Number((counts['Moderate Risk'] / n).toFixed(4)),
    'Critical Risk': Number((counts['Critical Risk'] / n).toFixed(4)),
  };
  let bestClass: HealthCategory = 'Healthy';
  let bestVal = -1;
  for (const label of CLASS_LABELS) {
    if (probabilities[label] > bestVal) {
      bestVal = probabilities[label];
      bestClass = label;
    }
  }
  return { predictedClass: bestClass, probabilities };
}

export class RandomForestClassifierEngine {
  private trees: TreeNode[] = [];
  private featureImportances: Record<FeatureKey, number> = {
    ph: 0.25,
    dissolved_oxygen: 0.25,
    ammonia: 0.25,
    temperature: 0.25,
  };
  private metrics: EvaluationMetrics | null = null;
  private nEstimators: number;
  private maxDepth: number;
  private minSamplesSplit: number;
  private dataset: WaterQualitySample[] = [];
  private datasetName: string = 'Reference Aquaculture Dataset (backend/dataset/pond_water_quality_sample.csv)';
  private isPrototype: boolean = true;

  constructor(nEstimators = 50, maxDepth = 6, minSamplesSplit = 4) {
    this.nEstimators = nEstimators;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  private buildTree(
    samples: WaterQualitySample[],
    depth: number,
    rng: () => number,
    importanceAccumulator: Record<FeatureKey, number>
  ): TreeNode {
    const { predictedClass, probabilities } = getMajorityAndProbs(samples);
    const parentGini = computeGini(samples);

    if (
      depth >= this.maxDepth ||
      samples.length < this.minSamplesSplit ||
      parentGini === 0
    ) {
      return {
        isLeaf: true,
        predictedClass,
        probabilities,
      };
    }

    // Random feature subset selection (m_try = 2 or 3 out of 4 features)
    const shuffledFeatures = [...FEATURE_KEYS].sort(() => rng() - 0.5);
    const candidateFeatures = shuffledFeatures.slice(0, 3);

    let bestFeature: FeatureKey | undefined;
    let bestThreshold: number | undefined;
    let bestGain = 0;
    let bestLeft: WaterQualitySample[] = [];
    let bestRight: WaterQualitySample[] = [];

    for (const feature of candidateFeatures) {
      const sortedValues = Array.from(new Set(samples.map((s) => s[feature]))).sort(
        (a, b) => a - b
      );
      if (sortedValues.length < 2) continue;

      for (let i = 0; i < sortedValues.length - 1; i++) {
        const threshold = (sortedValues[i] + sortedValues[i + 1]) / 2;
        const left = samples.filter((s) => s[feature] <= threshold);
        const right = samples.filter((s) => s[feature] > threshold);
        if (left.length < 2 || right.length < 2) continue;

        const weightedChildGini =
          (left.length / samples.length) * computeGini(left) +
          (right.length / samples.length) * computeGini(right);
        const gain = parentGini - weightedChildGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = feature;
          bestThreshold = threshold;
          bestLeft = left;
          bestRight = right;
        }
      }
    }

    if (!bestFeature || bestThreshold === undefined || bestGain <= 1e-6) {
      return {
        isLeaf: true,
        predictedClass,
        probabilities,
      };
    }

    importanceAccumulator[bestFeature] += bestGain * samples.length;

    const leftNode = this.buildTree(bestLeft, depth + 1, rng, importanceAccumulator);
    const rightNode = this.buildTree(bestRight, depth + 1, rng, importanceAccumulator);

    return {
      isLeaf: false,
      predictedClass,
      probabilities,
      feature: bestFeature,
      threshold: bestThreshold,
      impurityDecrease: bestGain * samples.length,
      left: leftNode,
      right: rightNode,
    };
  }

  private predictSingleTree(node: TreeNode, input: FeatureNames): {
    predictedClass: HealthCategory;
    probabilities: Record<HealthCategory, number>;
  } {
    if (node.isLeaf || !node.feature || node.threshold === undefined) {
      return {
        predictedClass: node.predictedClass,
        probabilities: node.probabilities,
      };
    }
    const val = input[node.feature];
    if (val <= node.threshold) {
      return this.predictSingleTree(node.left!, input);
    } else {
      return this.predictSingleTree(node.right!, input);
    }
  }

  public fit(
    samples: WaterQualitySample[],
    datasetName = 'Reference Aquaculture Dataset (backend/dataset/pond_water_quality_sample.csv)',
    isPrototype = true
  ): EvaluationMetrics {
    this.dataset = [...samples];
    this.datasetName = datasetName;
    this.isPrototype = isPrototype;

    const rng = createRng(42);
    const importanceAccumulator: Record<FeatureKey, number> = {
      ph: 0,
      dissolved_oxygen: 0,
      ammonia: 0,
      temperature: 0,
    };

    this.trees = [];
    for (let t = 0; t < this.nEstimators; t++) {
      // Bootstrap sample with replacement
      const bootstrap: WaterQualitySample[] = [];
      for (let i = 0; i < samples.length; i++) {
        const idx = Math.floor(rng() * samples.length);
        bootstrap.push(samples[idx]);
      }
      const tree = this.buildTree(bootstrap, 0, rng, importanceAccumulator);
      this.trees.push(tree);
    }

    const totalImp =
      Object.values(importanceAccumulator).reduce((acc, v) => acc + v, 0) || 1;
    this.featureImportances = {
      ph: Number((importanceAccumulator.ph / totalImp).toFixed(4)),
      dissolved_oxygen: Number(
        (importanceAccumulator.dissolved_oxygen / totalImp).toFixed(4)
      ),
      ammonia: Number((importanceAccumulator.ammonia / totalImp).toFixed(4)),
      temperature: Number((importanceAccumulator.temperature / totalImp).toFixed(4)),
    };

    // Perform 5-Fold Stratified Cross-Validation for honest out-of-sample evaluation
    this.metrics = this.evaluateCrossValidation(samples);
    return this.metrics;
  }

  private evaluateCrossValidation(samples: WaterQualitySample[]): EvaluationMetrics {
    const k = 5;
    const folds: WaterQualitySample[][] = Array.from({ length: k }, () => []);

    // Group by class for stratified assignment
    for (const label of CLASS_LABELS) {
      const classItems = samples.filter((s) => s.health_category === label);
      classItems.forEach((item, idx) => {
        folds[idx % k].push(item);
      });
    }

    const confusionMatrix: number[][] = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];

    for (let foldIdx = 0; foldIdx < k; foldIdx++) {
      const testFold = folds[foldIdx];
      const trainFold = folds
        .filter((_, idx) => idx !== foldIdx)
        .reduce((acc, f) => acc.concat(f), []);

      const foldRng = createRng(100 + foldIdx);
      const dummyImp: Record<FeatureKey, number> = {
        ph: 0,
        dissolved_oxygen: 0,
        ammonia: 0,
        temperature: 0,
      };

      const foldTrees: TreeNode[] = [];
      for (let t = 0; t < 25; t++) {
        const boot: WaterQualitySample[] = [];
        for (let i = 0; i < trainFold.length; i++) {
          boot.push(trainFold[Math.floor(foldRng() * trainFold.length)]);
        }
        foldTrees.push(this.buildTree(boot, 0, foldRng, dummyImp));
      }

      for (const sample of testFold) {
        const probs: Record<HealthCategory, number> = {
          Healthy: 0,
          'Moderate Risk': 0,
          'Critical Risk': 0,
        };
        for (const tree of foldTrees) {
          const res = this.predictSingleTree(tree, sample);
          for (const c of CLASS_LABELS) {
            probs[c] += res.probabilities[c];
          }
        }
        let predClass: HealthCategory = 'Healthy';
        let maxP = -1;
        for (const c of CLASS_LABELS) {
          if (probs[c] > maxP) {
            maxP = probs[c];
            predClass = c;
          }
        }
        const actualIdx = CLASS_LABELS.indexOf(sample.health_category);
        const predIdx = CLASS_LABELS.indexOf(predClass);
        if (actualIdx >= 0 && predIdx >= 0) {
          confusionMatrix[actualIdx][predIdx]++;
        }
      }
    }

    let correct = 0;
    const total = samples.length || 1;
    for (let i = 0; i < 3; i++) {
      correct += confusionMatrix[i][i];
    }

    const perClassMetrics: Record<
      HealthCategory,
      { precision: number; recall: number; f1: number; support: number }
    > = {
      Healthy: { precision: 0, recall: 0, f1: 0, support: 0 },
      'Moderate Risk': { precision: 0, recall: 0, f1: 0, support: 0 },
      'Critical Risk': { precision: 0, recall: 0, f1: 0, support: 0 },
    };

    let sumPrecision = 0;
    let sumRecall = 0;
    let sumF1 = 0;

    CLASS_LABELS.forEach((label, i) => {
      const tp = confusionMatrix[i][i];
      const rowSum = confusionMatrix[i].reduce((a, b) => a + b, 0);
      const colSum =
        confusionMatrix[0][i] + confusionMatrix[1][i] + confusionMatrix[2][i];

      const precision = colSum > 0 ? tp / colSum : 0;
      const recall = rowSum > 0 ? tp / rowSum : 0;
      const f1 =
        precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      perClassMetrics[label] = {
        precision: Number(precision.toFixed(4)),
        recall: Number(recall.toFixed(4)),
        f1: Number(f1.toFixed(4)),
        support: rowSum,
      };
      sumPrecision += precision;
      sumRecall += recall;
      sumF1 += f1;
    });

    return {
      evaluationMethod: '5-Fold Stratified Cross-Validation',
      datasetName: this.datasetName,
      sampleCount: samples.length,
      treeCount: this.nEstimators,
      maxDepth: this.maxDepth,
      trainedAt: new Date().toISOString(),
      isPrototypeDataset: this.isPrototype,
      cvAccuracy: Number((correct / total).toFixed(4)),
      cvMacroPrecision: Number((sumPrecision / 3).toFixed(4)),
      cvMacroRecall: Number((sumRecall / 3).toFixed(4)),
      cvMacroF1: Number((sumF1 / 3).toFixed(4)),
      confusionMatrix,
      perClassMetrics,
    };
  }

  public predictRaw(input: FeatureNames): {
    predictedCategory: HealthCategory;
    confidence: number;
    probabilities: Record<HealthCategory, number>;
    treeVotes: Record<HealthCategory, number>;
  } {
    const probSums: Record<HealthCategory, number> = {
      Healthy: 0,
      'Moderate Risk': 0,
      'Critical Risk': 0,
    };
    const treeVotes: Record<HealthCategory, number> = {
      Healthy: 0,
      'Moderate Risk': 0,
      'Critical Risk': 0,
    };

    const nTrees = Math.max(this.trees.length, 1);
    for (const tree of this.trees) {
      const res = this.predictSingleTree(tree, input);
      treeVotes[res.predictedClass]++;
      for (const c of CLASS_LABELS) {
        probSums[c] += res.probabilities[c];
      }
    }

    const probabilities: Record<HealthCategory, number> = {
      Healthy: Number((probSums['Healthy'] / nTrees).toFixed(4)),
      'Moderate Risk': Number((probSums['Moderate Risk'] / nTrees).toFixed(4)),
      'Critical Risk': Number((probSums['Critical Risk'] / nTrees).toFixed(4)),
    };

    let predictedCategory: HealthCategory = 'Healthy';
    let maxProb = -1;
    for (const c of CLASS_LABELS) {
      if (probabilities[c] > maxProb) {
        maxProb = probabilities[c];
        predictedCategory = c;
      }
    }

    return {
      predictedCategory,
      confidence: Number(maxProb.toFixed(4)),
      probabilities,
      treeVotes,
    };
  }

  public predictWithExplainability(
    input: FeatureNames,
    speciesThresholds: {
      ph: { min: number; max: number; criticalMin: number; criticalMax: number };
      dissolved_oxygen: { min: number; max: number; criticalMin: number };
      ammonia: { max: number; criticalMax: number };
      temperature: { min: number; max: number; criticalMin: number; criticalMax: number };
    }
  ): RFModelPrediction {
    const base = this.predictRaw(input);

    // Compute counterfactual local impact by replacing each feature with its optimal midpoint
    const optimalMidpoints: FeatureNames = {
      ph: (speciesThresholds.ph.min + speciesThresholds.ph.max) / 2,
      dissolved_oxygen:
        (speciesThresholds.dissolved_oxygen.min +
          speciesThresholds.dissolved_oxygen.max) /
        2,
      ammonia: Math.max(0.01, speciesThresholds.ammonia.max * 0.25),
      temperature:
        (speciesThresholds.temperature.min + speciesThresholds.temperature.max) / 2,
    };

    const rawDeltas: Record<FeatureKey, number> = {
      ph: 0,
      dissolved_oxygen: 0,
      ammonia: 0,
      temperature: 0,
    };

    for (const key of FEATURE_KEYS) {
      const perturbed: FeatureNames = {
        ...input,
        [key]: optimalMidpoints[key],
      };
      const perturbedPred = this.predictRaw(perturbed);
      const probShift = Math.abs(
        base.probabilities[base.predictedCategory] -
          perturbedPred.probabilities[base.predictedCategory]
      );
      // Combine local counterfactual probability shift with global Gini importance
      rawDeltas[key] = probShift * 0.7 + this.featureImportances[key] * 0.3;
    }

    const totalDelta =
      Object.values(rawDeltas).reduce((a, b) => a + b, 0) || 1;

    const evaluateFeatureMeta = (key: FeatureKey): FeatureContribution => {
      const localImpactScore = Number((rawDeltas[key] / totalDelta).toFixed(4));
      const globalImportance = this.featureImportances[key];

      if (key === 'ph') {
        const v = input.ph;
        const t = speciesThresholds.ph;
        const isCrit = v < t.criticalMin || v > t.criticalMax;
        const isWarn = !isCrit && (v < t.min || v > t.max);
        return {
          feature: 'ph',
          label: 'Water pH',
          value: v,
          unit: 'pH',
          globalImportance,
          localImpactScore,
          direction: isCrit
            ? 'critical_stress'
            : isWarn
            ? 'elevated_risk'
            : 'optimal',
          status: isCrit ? 'Critical' : isWarn ? 'Warning' : 'Optimal',
          referenceRange: `${t.min.toFixed(1)} – ${t.max.toFixed(1)} pH`,
          explanation: isCrit
            ? `pH (${v.toFixed(2)}) breaches critical limits (${t.criticalMin}–${t.criticalMax}), causing gill tissue stress and shifting unionized ammonia toxicity.`
            : isWarn
            ? `pH (${v.toFixed(2)}) drifts outside optimal range (${t.min}–${t.max}); monitor diurnal carbonate buffering.`
            : `pH (${v.toFixed(2)}) is stable within the species target range (${t.min}–${t.max}).`,
        };
      }

      if (key === 'dissolved_oxygen') {
        const v = input.dissolved_oxygen;
        const t = speciesThresholds.dissolved_oxygen;
        const isCrit = v < t.criticalMin;
        const isWarn = !isCrit && v < t.min;
        return {
          feature: 'dissolved_oxygen',
          label: 'Dissolved Oxygen (DO)',
          value: v,
          unit: 'mg/L',
          globalImportance,
          localImpactScore,
          direction: isCrit
            ? 'critical_stress'
            : isWarn
            ? 'elevated_risk'
            : 'optimal',
          status: isCrit ? 'Critical' : isWarn ? 'Warning' : 'Optimal',
          referenceRange: `${t.min.toFixed(1)} – ${t.max.toFixed(1)} mg/L`,
          explanation: isCrit
            ? `Severe hypoxia risk: DO (${v.toFixed(2)} mg/L) is below critical threshold (${t.criticalMin} mg/L). Verify paddlewheel aeration immediately.`
            : isWarn
            ? `Sub-optimal DO (${v.toFixed(2)} mg/L) below target minimum (${t.min} mg/L), reducing feed conversion efficiency.`
            : `Dissolved oxygen (${v.toFixed(2)} mg/L) supports healthy aerobic respiration and nitrification.`,
        };
      }

      if (key === 'ammonia') {
        const v = input.ammonia;
        const t = speciesThresholds.ammonia;
        const isCrit = v > t.criticalMax;
        const isWarn = !isCrit && v > t.max;
        return {
          feature: 'ammonia',
          label: 'Ammonia (TAN)',
          value: v,
          unit: 'mg/L',
          globalImportance,
          localImpactScore,
          direction: isCrit
            ? 'critical_stress'
            : isWarn
            ? 'elevated_risk'
            : 'optimal',
          status: isCrit ? 'Critical' : isWarn ? 'Warning' : 'Optimal',
          referenceRange: `0.00 – ${t.max.toFixed(2)} mg/L`,
          explanation: isCrit
            ? `High ammonia toxicity (${v.toFixed(3)} mg/L > ${t.criticalMax} mg/L critical limit). Elevated pH and temperature amplify unionized NH3 gill damage.`
            : isWarn
            ? `Ammonia (${v.toFixed(3)} mg/L) exceeds target threshold (${t.max} mg/L); inspect unconsumed feed and biofilter turnover.`
            : `Ammonia concentration (${v.toFixed(3)} mg/L) is well below toxic thresholds.`,
        };
      }

      // temperature
      const v = input.temperature;
      const t = speciesThresholds.temperature;
      const isCrit = v < t.criticalMin || v > t.criticalMax;
      const isWarn = !isCrit && (v < t.min || v > t.max);
      return {
        feature: 'temperature',
        label: 'Water Temperature',
        value: v,
        unit: '°C',
        globalImportance,
        localImpactScore,
        direction: isCrit
          ? 'critical_stress'
          : isWarn
          ? 'elevated_risk'
          : 'optimal',
        status: isCrit ? 'Critical' : isWarn ? 'Warning' : 'Optimal',
        referenceRange: `${t.min.toFixed(1)} – ${t.max.toFixed(1)} °C`,
        explanation: isCrit
          ? `Thermal stress (${v.toFixed(1)} °C outside ${t.criticalMin}–${t.criticalMax} °C) accelerates metabolic oxygen demand while lowering oxygen solubility.`
          : isWarn
          ? `Water temperature (${v.toFixed(1)} °C) is outside optimal thermal band (${t.min}–${t.max} °C).`
          : `Water temperature (${v.toFixed(1)} °C) is within the optimal metabolic window.`,
      };
    };

    const localContributions = FEATURE_KEYS.map(evaluateFeatureMeta).sort(
      (a, b) => b.localImpactScore - a.localImpactScore
    );

    return {
      ...base,
      totalTrees: this.trees.length,
      globalFeatureImportances: this.featureImportances,
      localContributions,
      engineLabel: this.isPrototype
        ? `CART Random Forest Classifier (${this.trees.length} Trees, Reference Dataset — Prototype Mode)`
        : `CART Random Forest Classifier (${this.trees.length} Trees, Custom Dataset)`,
      isPrototypeDataset: this.isPrototype,
      timestamp: new Date().toISOString(),
    };
  }

  public getEvaluationMetrics(): EvaluationMetrics | null {
    return this.metrics;
  }

  public getFeatureImportances(): Record<FeatureKey, number> {
    return this.featureImportances;
  }

  public getDatasetCount(): number {
    return this.dataset.length;
  }
}
