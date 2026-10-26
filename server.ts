import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  RandomForestClassifierEngine,
  WaterQualitySample,
  HealthCategory,
} from './src/ml/randomForestEngine.ts';
import {
  DEFAULT_SPECIES_PROFILES,
  REFERENCE_DATASET_SAMPLES,
  INITIAL_PREDICTION_HISTORY,
  PredictionRecord,
  calculateUnionizedAmmonia,
} from './src/data/aquacultureConfig.ts';

dotenv.config();

const PORT = 3000;

// Initialize and fit Random Forest Classifier on the reference labeled dataset
const rfEngine = new RandomForestClassifierEngine(50, 6, 4);
rfEngine.fit(
  REFERENCE_DATASET_SAMPLES,
  'Reference Aquaculture Dataset (backend/dataset/pond_water_quality_sample.csv)',
  true
);

let predictionHistory: PredictionRecord[] = [...INITIAL_PREDICTION_HISTORY];

function hasConfiguredGeminiKey(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== '' && key !== 'MY_GEMINI_API_KEY');
}

function buildRuleBasedAquaSenseResponse(payload: {
  pondName: string;
  speciesName: string;
  ph: number;
  dissolved_oxygen: number;
  ammonia: number;
  temperature: number;
  predictedCategory: HealthCategory;
  confidence: number;
  question?: string;
  speciesId?: string;
}) {
  const profile =
    DEFAULT_SPECIES_PROFILES[payload.speciesId || 'tilapia'] ||
    DEFAULT_SPECIES_PROFILES.tilapia;
  const nh3Info = calculateUnionizedAmmonia(
    payload.ammonia,
    payload.ph,
    payload.temperature
  );

  const outOfRange: string[] = [];
  const actions: string[] = [];
  const recheckList: string[] = [];

  if (payload.dissolved_oxygen < profile.dissolved_oxygen.criticalMin) {
    outOfRange.push(
      `Dissolved Oxygen (${payload.dissolved_oxygen.toFixed(2)} mg/L) is below the critical threshold (${profile.dissolved_oxygen.criticalMin.toFixed(1)} mg/L) for ${profile.name}.`
    );
    recheckList.push(
      'Verify Dissolved Oxygen immediately at 0.5m and 1.5m depth using a calibrated optical DO meter.'
    );
    actions.push(
      'Inspect and engage emergency paddlewheel or diffuser aeration; suspend feeding until DO stabilizes above minimum reference bounds.'
    );
  } else if (payload.dissolved_oxygen < profile.dissolved_oxygen.min) {
    outOfRange.push(
      `Dissolved Oxygen (${payload.dissolved_oxygen.toFixed(2)} mg/L) is below the optimal target range (${profile.dissolved_oxygen.min.toFixed(1)}–${profile.dissolved_oxygen.max.toFixed(1)} mg/L).`
    );
    recheckList.push('Check DO sensor membrane fouling and pre-dawn oxygen sag.');
    actions.push(
      'Increase supplemental夜间/afternoon aeration capacity and review ration size.'
    );
  }

  if (payload.ammonia > profile.ammonia.criticalMax) {
    outOfRange.push(
      `Total Ammonia Nitrogen (${payload.ammonia.toFixed(3)} mg/L) exceeds the critical threshold (${profile.ammonia.criticalMax.toFixed(2)} mg/L). Calculated toxic unionized NH3 is ${nh3Info.nh3MgL.toFixed(4)} mg/L (${nh3Info.nh3Percent}% of TAN).`
    );
    recheckList.push(
      'Cross-check Total Ammonia Nitrogen using a reagent salicylate test kit and verify pH sensor calibration.'
    );
    actions.push(
      'Temporarily reduce or pause high-protein feed input, inspect biofilter nitrification turnover or bottom sludge accumulation, and consult an aquaculture specialist before performing water exchange.'
    );
  } else if (payload.ammonia > profile.ammonia.max) {
    outOfRange.push(
      `Total Ammonia Nitrogen (${payload.ammonia.toFixed(3)} mg/L) is elevated above optimal limit (${profile.ammonia.max.toFixed(2)} mg/L), yielding ${nh3Info.nh3MgL.toFixed(4)} mg/L unionized NH3.`
    );
    recheckList.push('Sample bottom water near feed trays for localized ammonia buildup.');
    actions.push(
      'Audit daily feed conversion ratio (FCR) and verify nitrifying biofilter aeration.'
    );
  }

  if (payload.ph < profile.ph.criticalMin || payload.ph > profile.ph.criticalMax) {
    outOfRange.push(
      `Water pH (${payload.ph.toFixed(2)}) breaches critical bounds (${profile.ph.criticalMin.toFixed(1)}–${profile.ph.criticalMax.toFixed(1)}) for ${profile.name}.`
    );
    recheckList.push(
      'Calibrate pH glass electrode with standard pH 7.00 and pH 10.01 buffers and test total alkalinity (CaCO3).'
    );
    actions.push(
      'Evaluate phytoplankton bloom density and carbonate alkalinity buffering with a qualified water-quality technician.'
    );
  } else if (payload.ph < profile.ph.min || payload.ph > profile.ph.max) {
    outOfRange.push(
      `Water pH (${payload.ph.toFixed(2)}) is outside the optimal species window (${profile.ph.min.toFixed(1)}–${profile.ph.max.toFixed(1)}).`
    );
    recheckList.push('Compare morning (06:00) vs late afternoon (16:00) pH swing.');
  }

  if (
    payload.temperature < profile.temperature.criticalMin ||
    payload.temperature > profile.temperature.criticalMax
  ) {
    outOfRange.push(
      `Water Temperature (${payload.temperature.toFixed(1)} °C) is outside critical thermal limits (${profile.temperature.criticalMin.toFixed(1)}–${profile.temperature.criticalMax.toFixed(1)} °C).`
    );
    recheckList.push('Check thermistor depth placement and surface vs bottom thermal stratification.');
    actions.push(
      'Run water circulators to break thermal stratification and adjust feeding schedule to cooler hours.'
    );
  } else if (
    payload.temperature < profile.temperature.min ||
    payload.temperature > profile.temperature.max
  ) {
    outOfRange.push(
      `Water Temperature (${payload.temperature.toFixed(1)} °C) is outside optimal thermal range (${profile.temperature.min.toFixed(1)}–${profile.temperature.max.toFixed(1)} °C).`
    );
  }

  if (outOfRange.length === 0) {
    outOfRange.push(
      `All four primary parameters (pH ${payload.ph.toFixed(2)}, DO ${payload.dissolved_oxygen.toFixed(2)} mg/L, TAN ${payload.ammonia.toFixed(3)} mg/L, Temp ${payload.temperature.toFixed(1)} °C) are within optimal reference bounds for ${profile.name}.`
    );
    recheckList.push(
      'Maintain routine pre-dawn (05:30) and afternoon (15:30) sensor verification.'
    );
    actions.push(
      'Continue standard feeding protocol and log scheduled weekly sensor calibration check.'
    );
  }

  const summary = `AquaSense Rule-Based Diagnostic for ${payload.pondName} (${profile.name}): The Random Forest Classifier assigned "${payload.predictedCategory}" with ${(payload.confidence * 100).toFixed(1)}% tree-vote confidence. At pH ${payload.ph.toFixed(2)} and ${payload.temperature.toFixed(1)} °C, approximately ${nh3Info.nh3Percent}% of Total Ammonia (${payload.ammonia.toFixed(3)} mg/L) exists in the gill-toxic unionized NH3 state (${nh3Info.nh3MgL.toFixed(4)} mg/L).`;

  return {
    mode: 'RULE_BASED_ENGINE',
    modeLabel:
      'Deterministic Rule-Based & Tree-Attribution Assistant (LLM API not active or fallback selected)',
    limitations:
      'Generated via deterministic hydro-chemical equilibrium equations (Emerson NH3 ionization) and Random Forest counterfactual splits. Feature importance reflects statistical correlation in the training dataset, not guaranteed biological causation.',
    summary,
    outOfRangeFactors: outOfRange,
    measurementsToRecheck: recheckList,
    practicalActions: actions,
    questionResponse: payload.question
      ? `Regarding "${payload.question}": Based on current readings (pH ${payload.ph.toFixed(2)}, DO ${payload.dissolved_oxygen.toFixed(2)} mg/L, TAN ${payload.ammonia.toFixed(3)} mg/L, Temp ${payload.temperature.toFixed(1)} °C), ${outOfRange[0]} Always verify suspicious readings with a secondary calibrated instrument before modifying pond management.`
      : undefined,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // 1. Model metadata & evaluation endpoint
  app.get('/api/model-info', (_req, res) => {
    res.json({
      metrics: rfEngine.getEvaluationMetrics(),
      featureImportances: rfEngine.getFeatureImportances(),
      datasetCount: rfEngine.getDatasetCount(),
      llmConfigured: hasConfiguredGeminiKey(),
    });
  });

  // 2. Random Forest Pond Health Prediction endpoint
  app.post('/api/predict', (req, res) => {
    try {
      const {
        pondId = 'pond-01',
        pondName = 'Basin A-1 North',
        speciesId = 'tilapia',
        ph,
        dissolved_oxygen,
        ammonia,
        temperature,
        dataSource = 'MANUAL LAB ENTRY',
        customThresholds,
        saveToHistory = true,
        notes = '',
      } = req.body;

      const parsedPh = Number(ph);
      const parsedDo = Number(dissolved_oxygen);
      const parsedAmmonia = Number(ammonia);
      const parsedTemp = Number(temperature);

      if (
        Number.isNaN(parsedPh) ||
        parsedPh < 0 ||
        parsedPh > 14 ||
        Number.isNaN(parsedDo) ||
        parsedDo < 0 ||
        parsedDo > 25 ||
        Number.isNaN(parsedAmmonia) ||
        parsedAmmonia < 0 ||
        parsedAmmonia > 15 ||
        Number.isNaN(parsedTemp) ||
        parsedTemp < -2 ||
        parsedTemp > 45
      ) {
        return res.status(400).json({
          error:
            'Invalid water-quality parameter bounds. Ensure pH (0–14), DO (0–25 mg/L), Ammonia (0–15 mg/L), and Temperature (-2–45 °C) are valid numbers.',
        });
      }

      const speciesProfile =
        customThresholds ||
        DEFAULT_SPECIES_PROFILES[speciesId] ||
        DEFAULT_SPECIES_PROFILES.tilapia;

      const prediction = rfEngine.predictWithExplainability(
        {
          ph: parsedPh,
          dissolved_oxygen: parsedDo,
          ammonia: parsedAmmonia,
          temperature: parsedTemp,
        },
        speciesProfile
      );

      const nh3Data = calculateUnionizedAmmonia(
        parsedAmmonia,
        parsedPh,
        parsedTemp
      );

      let savedRecord: PredictionRecord | null = null;
      if (saveToHistory) {
        savedRecord = {
          id: `PRED-${905 + predictionHistory.length}`,
          pondId,
          pondName,
          speciesName: speciesProfile.name || 'Nile Tilapia',
          timestamp: prediction.timestamp,
          dataSource,
          ph: parsedPh,
          dissolved_oxygen: parsedDo,
          ammonia: parsedAmmonia,
          temperature: parsedTemp,
          predictedCategory: prediction.predictedCategory,
          confidence: prediction.confidence,
          probabilities: prediction.probabilities,
          topContributingParameter:
            prediction.localContributions[0]?.label || 'Dissolved Oxygen (DO)',
          engineUsed: prediction.engineLabel,
          notes:
            notes ||
            `Unionized NH3: ${nh3Data.nh3MgL.toFixed(4)} mg/L (${nh3Data.nh3Percent}% of TAN)`,
        };
        predictionHistory = [savedRecord, ...predictionHistory.slice(0, 99)];
      }

      return res.json({
        prediction,
        unionizedAmmonia: nh3Data,
        savedRecord,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: err?.message || 'Prediction failed.',
      });
    }
  });

  // 3. Prediction history endpoint
  app.get('/api/history', (_req, res) => {
    res.json({ history: predictionHistory });
  });

  // 4. Train / re-train Random Forest on custom or reference dataset
  app.post('/api/dataset/train', (req, res) => {
    try {
      const {
        samples,
        datasetName = 'Custom Uploaded Water-Quality Dataset',
        nEstimators = 50,
        maxDepth = 6,
        resetToReference = false,
      } = req.body;

      if (resetToReference) {
        const reEngine = new RandomForestClassifierEngine(
          Number(nEstimators) || 50,
          Number(maxDepth) || 6,
          4
        );
        const metrics = reEngine.fit(
          REFERENCE_DATASET_SAMPLES,
          'Reference Aquaculture Dataset (backend/dataset/pond_water_quality_sample.csv)',
          true
        );
        Object.assign(rfEngine, reEngine);
        return res.json({
          metrics,
          featureImportances: rfEngine.getFeatureImportances(),
        });
      }

      if (!Array.isArray(samples) || samples.length < 15) {
        return res.status(400).json({
          error:
            'Please provide at least 15 labeled records with ph, dissolved_oxygen, ammonia, temperature, and health_category.',
        });
      }

      const validSamples: WaterQualitySample[] = samples.map((s: any) => ({
        ph: Number(s.ph),
        dissolved_oxygen: Number(s.dissolved_oxygen),
        ammonia: Number(s.ammonia),
        temperature: Number(s.temperature),
        species: s.species || 'tilapia',
        health_category: (['Healthy', 'Moderate Risk', 'Critical Risk'].includes(
          s.health_category
        )
          ? s.health_category
          : 'Moderate Risk') as HealthCategory,
      }));

      const customEngine = new RandomForestClassifierEngine(
        Math.min(Math.max(Number(nEstimators) || 50, 10), 200),
        Math.min(Math.max(Number(maxDepth) || 6, 2), 12),
        4
      );
      const metrics = customEngine.fit(validSamples, datasetName, false);
      Object.assign(rfEngine, customEngine);

      return res.json({
        metrics,
        featureImportances: rfEngine.getFeatureImportances(),
      });
    } catch (err: any) {
      return res.status(500).json({
        error: err?.message || 'Failed to train Random Forest model.',
      });
    }
  });

  // 5. AquaSense AI Explainability & Insights endpoint (Gemini API + Rule-Based Fallback)
  app.post('/api/aquasense/analyze', async (req, res) => {
    const payload = req.body || {};
    const ruleFallback = buildRuleBasedAquaSenseResponse(payload);

    if (!hasConfiguredGeminiKey()) {
      return res.json(ruleFallback);
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const profile =
        DEFAULT_SPECIES_PROFILES[payload.speciesId || 'tilapia'] ||
        DEFAULT_SPECIES_PROFILES.tilapia;
      const nh3Info = calculateUnionizedAmmonia(
        Number(payload.ammonia || 0.05),
        Number(payload.ph || 7.5),
        Number(payload.temperature || 28)
      );

      const prompt = `You are AquaSense AI, a senior aquaculture water-quality scientist and explainable-AI advisor for PondHealth AI.
Analyze the following pond water-quality reading and Random Forest Classifier output:
- Pond: ${payload.pondName || 'Pond A-1'}
- Species: ${profile.name} (${profile.scientificName}) in ${profile.pondType}
- Water pH: ${payload.ph} (Configured Optimal Range: ${profile.ph.min} - ${profile.ph.max}, Critical outside ${profile.ph.criticalMin} - ${profile.ph.criticalMax})
- Dissolved Oxygen (DO): ${payload.dissolved_oxygen} mg/L (Configured Optimal Range: ${profile.dissolved_oxygen.min} - ${profile.dissolved_oxygen.max} mg/L, Critical < ${profile.dissolved_oxygen.criticalMin} mg/L)
- Total Ammonia Nitrogen (TAN): ${payload.ammonia} mg/L (Configured Optimal <= ${profile.ammonia.max} mg/L, Critical > ${profile.ammonia.criticalMax} mg/L)
- Calculated Toxic Unionized NH3 (Emerson equation): ${nh3Info.nh3MgL} mg/L (${nh3Info.nh3Percent}% of TAN)
- Water Temperature: ${payload.temperature} °C (Configured Optimal: ${profile.temperature.min} - ${profile.temperature.max} °C)
- Random Forest Predicted Category: ${payload.predictedCategory} (Confidence: ${((payload.confidence || 0.9) * 100).toFixed(1)}%)
${payload.question ? `- User Question: "${payload.question}"` : ''}

Provide a concise, evidence-based explanation in JSON with keys:
- "summary": 2-3 sentence scientific explanation of why the pond received this category and how pH, temperature, DO, and ammonia interact.
- "outOfRangeFactors": array of 2-4 specific bullet strings detailing parameter status vs configured thresholds.
- "measurementsToRecheck": array of 2-3 specific sensor calibration or verification steps.
- "practicalActions": array of 2-4 practical management steps (never guarantee outcomes or prescribe veterinary chemicals; recommend verifying sensors, checking aeration, or consulting a specialist).
- "questionResponse": direct, helpful answer if a User Question was provided (or empty string if none).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '';
      const parsed = JSON.parse(text);

      return res.json({
        mode: 'GEMINI_LLM_AND_RF',
        modeLabel: 'AquaSense AI (Gemini 3.8 Flash + Random Forest Attribution)',
        limitations:
          'AI explanations combine Random Forest tree split attributions with hydro-chemical domain reasoning. Feature importance indicates model association, not biological causation. Verify readings with calibrated field instruments.',
        summary: parsed.summary || ruleFallback.summary,
        outOfRangeFactors:
          Array.isArray(parsed.outOfRangeFactors) && parsed.outOfRangeFactors.length > 0
            ? parsed.outOfRangeFactors
            : ruleFallback.outOfRangeFactors,
        measurementsToRecheck:
          Array.isArray(parsed.measurementsToRecheck) &&
          parsed.measurementsToRecheck.length > 0
            ? parsed.measurementsToRecheck
            : ruleFallback.measurementsToRecheck,
        practicalActions:
          Array.isArray(parsed.practicalActions) && parsed.practicalActions.length > 0
            ? parsed.practicalActions
            : ruleFallback.practicalActions,
        questionResponse: parsed.questionResponse || ruleFallback.questionResponse,
      });
    } catch (_err) {
      // Return rule-based response seamlessly if Gemini call fails
      return res.json(ruleFallback);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PondHealth AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
