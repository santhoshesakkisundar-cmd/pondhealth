import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  FlaskConical,
  Play,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Code2,
  Database,
  Sliders,
} from 'lucide-react';
import {
  PondUnit,
  SpeciesThresholds,
  DataSourceType,
  PredictionRecord,
  calculateUnionizedAmmonia,
} from '../data/aquacultureConfig';
import {
  EvaluationMetrics,
  RFModelPrediction,
  HealthCategory,
  FeatureKey,
} from '../ml/randomForestEngine';

interface PredictionLabViewProps {
  ponds: PondUnit[];
  speciesProfiles: Record<string, SpeciesThresholds>;
  modelMetrics: EvaluationMetrics | null;
  globalImportances: Record<FeatureKey, number>;
  onPredictionComplete: (
    pondId: string,
    input: {
      ph: number;
      dissolved_oxygen: number;
      ammonia: number;
      temperature: number;
      dataSource: DataSourceType;
    },
    prediction: RFModelPrediction,
    savedRecord: PredictionRecord | null
  ) => void;
  onModelRetrained: (
    metrics: EvaluationMetrics,
    importances: Record<FeatureKey, number>
  ) => void;
  onAskAquaSense: (context: {
    pondName: string;
    speciesId: string;
    ph: number;
    dissolved_oxygen: number;
    ammonia: number;
    temperature: number;
    predictedCategory: HealthCategory;
    confidence: number;
  }) => void;
}

export const PredictionLabView: React.FC<PredictionLabViewProps> = ({
  ponds,
  speciesProfiles,
  modelMetrics,
  globalImportances,
  onPredictionComplete,
  onModelRetrained,
  onAskAquaSense,
}) => {
  const [selectedPondId, setSelectedPondId] = useState<string>(ponds[0]?.id || 'pond-01');
  const activePond = ponds.find((p) => p.id === selectedPondId) || ponds[0];
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>(
    activePond?.speciesId || 'tilapia'
  );

  const [ph, setPh] = useState<string>(String(activePond?.currentReading.ph ?? 7.55));
  const [doLevel, setDoLevel] = useState<string>(
    String(activePond?.currentReading.dissolved_oxygen ?? 6.85)
  );
  const [ammonia, setAmmonia] = useState<string>(
    String(activePond?.currentReading.ammonia ?? 0.03)
  );
  const [temperature, setTemperature] = useState<string>(
    String(activePond?.currentReading.temperature ?? 27.9)
  );
  const [dataSource, setDataSource] = useState<DataSourceType>('MANUAL LAB ENTRY');
  const [notes, setNotes] = useState<string>('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [result, setResult] = useState<RFModelPrediction | null>(null);
  const [nh3Result, setNh3Result] = useState<{
    nh3MgL: number;
    nh3Percent: number;
  } | null>(null);

  const [showPipelinePanel, setShowPipelinePanel] = useState<boolean>(false);
  const [nEstimatorsInput, setNEstimatorsInput] = useState<number>(
    modelMetrics?.treeCount || 50
  );
  const [maxDepthInput, setMaxDepthInput] = useState<number>(
    modelMetrics?.maxDepth || 6
  );
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingStatus, setTrainingStatus] = useState<string | null>(null);

  const currentSpecies =
    speciesProfiles[selectedSpeciesId] || speciesProfiles.tilapia;

  const handleSelectPond = (pondId: string) => {
    setSelectedPondId(pondId);
    const found = ponds.find((p) => p.id === pondId);
    if (found) {
      setSelectedSpeciesId(found.speciesId);
      setPh(String(found.currentReading.ph));
      setDoLevel(String(found.currentReading.dissolved_oxygen));
      setAmmonia(String(found.currentReading.ammonia));
      setTemperature(String(found.currentReading.temperature));
      setDataSource(found.dataSource);
      setValidationError(null);
    }
  };

  const applyPresetScenario = (
    preset: 'optimal' | 'moderate_biofloc' | 'critical_hypoxia'
  ) => {
    setValidationError(null);
    if (preset === 'optimal') {
      setPh('7.50');
      setDoLevel('7.10');
      setAmmonia('0.025');
      setTemperature('27.6');
      setDataSource('MANUAL LAB ENTRY');
      setNotes('Optimal midday grab sample preset');
    } else if (preset === 'moderate_biofloc') {
      setPh('8.58');
      setDoLevel('4.35');
      setAmmonia('0.195');
      setTemperature('31.1');
      setDataSource('DEMO DATA — SIMULATED IOT TELEMETRY');
      setNotes('High afternoon microbial oxygen demand scenario');
    } else {
      setPh('9.22');
      setDoLevel('2.15');
      setAmmonia('0.780');
      setTemperature('34.4');
      setDataSource('DEMO DATA — SIMULATED IOT TELEMETRY');
      setNotes('Severe hypoxia + high unionized ammonia stress scenario');
    }
  };

  const handleRunPrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const numPh = Number(ph);
    const numDo = Number(doLevel);
    const numAmmonia = Number(ammonia);
    const numTemp = Number(temperature);

    if (
      ph.trim() === '' ||
      Number.isNaN(numPh) ||
      numPh < 0 ||
      numPh > 14
    ) {
      setValidationError('Water pH must be a valid number between 0.00 and 14.00.');
      return;
    }
    if (
      doLevel.trim() === '' ||
      Number.isNaN(numDo) ||
      numDo < 0 ||
      numDo > 25
    ) {
      setValidationError(
        'Dissolved Oxygen (DO) must be between 0.00 and 25.00 mg/L.'
      );
      return;
    }
    if (
      ammonia.trim() === '' ||
      Number.isNaN(numAmmonia) ||
      numAmmonia < 0 ||
      numAmmonia > 15
    ) {
      setValidationError(
        'Total Ammonia Nitrogen (TAN) must be between 0.000 and 15.000 mg/L.'
      );
      return;
    }
    if (
      temperature.trim() === '' ||
      Number.isNaN(numTemp) ||
      numTemp < 0 ||
      numTemp > 45
    ) {
      setValidationError('Water Temperature must be between 0.0 and 45.0 °C.');
      return;
    }

    setIsPredicting(true);
    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pondId: selectedPondId,
          pondName: activePond?.name || 'Basin A-1 North',
          speciesId: selectedSpeciesId,
          ph: numPh,
          dissolved_oxygen: numDo,
          ammonia: numAmmonia,
          temperature: numTemp,
          dataSource,
          customThresholds: currentSpecies,
          saveToHistory: true,
          notes,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Prediction request failed.');
      }

      setResult(data.prediction);
      setNh3Result(
        data.unionizedAmmonia ||
          calculateUnionizedAmmonia(numAmmonia, numPh, numTemp)
      );
      onPredictionComplete(
        selectedPondId,
        {
          ph: numPh,
          dissolved_oxygen: numDo,
          ammonia: numAmmonia,
          temperature: numTemp,
          dataSource,
        },
        data.prediction,
        data.savedRecord
      );
    } catch (err: any) {
      setValidationError(err?.message || 'Unable to execute Random Forest classifier.');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleRetrainReference = async () => {
    setIsTraining(true);
    setTrainingStatus(null);
    try {
      const res = await fetch('/api/dataset/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToReference: true,
          nEstimators: nEstimatorsInput,
          maxDepth: maxDepthInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Retraining failed');
      onModelRetrained(data.metrics, data.featureImportances);
      setTrainingStatus(
        `Trained ${data.metrics.treeCount} CART trees (max_depth=${data.metrics.maxDepth}) on ${data.metrics.sampleCount} samples. 5-Fold CV Accuracy: ${(data.metrics.cvAccuracy * 100).toFixed(1)}%`
      );
    } catch (err: any) {
      setTrainingStatus(`Error: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsTraining(true);
    setTrainingStatus(null);

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 16) {
        throw new Error('CSV must include header + at least 15 labeled rows.');
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const phIdx = headers.indexOf('ph');
      const doIdx = headers.indexOf('dissolved_oxygen');
      const ammIdx = headers.indexOf('ammonia');
      const tempIdx = headers.indexOf('temperature');
      const catIdx = headers.indexOf('health_category');

      if (
        phIdx === -1 ||
        doIdx === -1 ||
        ammIdx === -1 ||
        tempIdx === -1 ||
        catIdx === -1
      ) {
        throw new Error(
          'CSV header must contain: ph, dissolved_oxygen, ammonia, temperature, health_category'
        );
      }

      const parsedSamples = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim());
        return {
          ph: Number(cols[phIdx]),
          dissolved_oxygen: Number(cols[doIdx]),
          ammonia: Number(cols[ammIdx]),
          temperature: Number(cols[tempIdx]),
          health_category: cols[catIdx],
        };
      });

      const res = await fetch('/api/dataset/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples: parsedSamples,
          datasetName: `Uploaded CSV (${file.name})`,
          nEstimators: nEstimatorsInput,
          maxDepth: maxDepthInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Training failed');
      onModelRetrained(data.metrics, data.featureImportances);
      setTrainingStatus(
        `Trained Random Forest on "${file.name}" (${data.metrics.sampleCount} rows). 5-Fold CV Accuracy: ${(data.metrics.cvAccuracy * 100).toFixed(1)}%`
      );
    } catch (err: any) {
      setTrainingStatus(`CSV Upload Error: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  const liveNh3 = calculateUnionizedAmmonia(
    Number(ammonia) || 0,
    Number(ph) || 7.5,
    Number(temperature) || 28
  );

  const probabilityChartData = result
    ? [
        {
          name: 'Healthy',
          probability: Number((result.probabilities['Healthy'] * 100).toFixed(1)),
          votes: result.treeVotes['Healthy'],
          color: '#10B981',
        },
        {
          name: 'Moderate Risk',
          probability: Number(
            (result.probabilities['Moderate Risk'] * 100).toFixed(1)
          ),
          votes: result.treeVotes['Moderate Risk'],
          color: '#F59E0B',
        },
        {
          name: 'Critical Risk',
          probability: Number(
            (result.probabilities['Critical Risk'] * 100).toFixed(1)
          ),
          votes: result.treeVotes['Critical Risk'],
          color: '#F43F5E',
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Top Hero Banner with Sample-Image Oceanic Teal-Indigo Gradient */}
      <div className="oceanic-hero-gradient rounded-xl p-6 border border-[#7CE7FB]/25 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 text-xs text-[#7CE7FB] font-mono">
              <span>RANDOM FOREST CLASSIFIER WORKBENCH</span>
              <span aria-hidden="true">·</span>
              <span>
                {modelMetrics?.isPrototypeDataset
                  ? 'PROTOTYPE MODE (REFERENCE DATASET n=' +
                    (modelMetrics?.sampleCount ?? 90) +
                    ')'
                  : 'CUSTOM LABELED DATASET MODE'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{modelMetrics?.treeCount ?? 50} DECISION TREES</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              AI Pond Health Prediction Laboratory
            </h1>
            <p className="text-sm text-[#D5E6F5] leading-relaxed">
              Enter measured or simulated water-quality parameters (pH, Dissolved
              Oxygen, Total Ammonia Nitrogen, and Water Temperature) to execute
              the trained Random Forest ensemble, inspect tree-level probability
              votes, and evaluate species-specific parameter attributions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowPipelinePanel(!showPipelinePanel)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#282654]/90 text-[#7CE7FB] border border-[#7CE7FB]/40 hover:bg-[#282654] transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              {showPipelinePanel
                ? 'Hide ML Training & FastAPI Pipeline'
                : 'ML Training & FastAPI Pipeline'}
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible ML Dataset Training & Python FastAPI Architecture Drawer */}
      {showPipelinePanel && (
        <div className="bg-[#2B2A5A] border border-[#7CE7FB]/25 rounded-xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Model Training, Evaluation & FastAPI Deployment Pipeline
              </h2>
              <p className="text-xs text-[#C7C6E8] mt-0.5">
                Train the in-process CART Random Forest on custom CSV records or
                connect to the standalone Python FastAPI + scikit-learn service (
                <code className="font-mono text-[#7CE7FB]">backend/main.py</code>).
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-[#7CE7FB]">
              <span>
                5-Fold CV Accuracy:{' '}
                {modelMetrics
                  ? `${(modelMetrics.cvAccuracy * 100).toFixed(1)}%`
                  : 'N/A'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Macro F1:{' '}
                {modelMetrics
                  ? `${(modelMetrics.cvMacroF1 * 100).toFixed(1)}%`
                  : 'N/A'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hyperparameter & CSV Upload Controls */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#7CE7FB]">
                1. Configure & Retrain Random Forest Classifier
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#C7C6E8] mb-1">
                    Number of Trees (n_estimators)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    step={10}
                    value={nEstimatorsInput}
                    onChange={(e) => setNEstimatorsInput(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#1E1D42] border border-white/15 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#C7C6E8] mb-1">
                    Max Tree Depth (max_depth)
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={12}
                    step={1}
                    value={maxDepthInput}
                    onChange={(e) => setMaxDepthInput(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#1E1D42] border border-white/15 text-sm font-mono text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={isTraining}
                  onClick={handleRetrainReference}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#7CE7FB] text-[#1E1D42] hover:bg-[#93EEFD] transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  {isTraining ? 'Training Forest...' : 'Retrain on Reference Dataset'}
                </button>

                <label className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#1E1D42] text-white border border-white/20 hover:border-[#7CE7FB] transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap">
                  <Upload className="w-3.5 h-3.5 text-[#7CE7FB]" />
                  <span>Upload Custom Labeled CSV</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {trainingStatus && (
                <div className="p-3 rounded-lg bg-[#1E1D42] border border-[#7CE7FB]/30 text-xs font-mono text-[#7CE7FB]">
                  {trainingStatus}
                </div>
              )}

              <div className="text-xs text-[#C7C6E8] space-y-1">
                <p>
                  Expected CSV columns:{' '}
                  <code className="font-mono text-white">
                    ph,dissolved_oxygen,ammonia,temperature,health_category
                  </code>
                </p>
                <p>
                  Allowed target labels:{' '}
                  <code className="font-mono text-emerald-300">Healthy</code>,{' '}
                  <code className="font-mono text-amber-300">Moderate Risk</code>,{' '}
                  <code className="font-mono text-rose-300">Critical Risk</code>.
                </p>
              </div>
            </div>

            {/* Python FastAPI & scikit-learn Reference Commands */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#7CE7FB] flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                <span>2. Standalone Python FastAPI + scikit-learn Workflow</span>
              </h3>
              <p className="text-xs text-[#C7C6E8]">
                Complete Python source files are included in{' '}
                <code className="font-mono text-white">backend/train_model.py</code>{' '}
                and <code className="font-mono text-white">backend/main.py</code>:
              </p>
              <pre className="p-3.5 rounded-lg bg-[#181736] border border-white/10 text-xs font-mono text-[#D5E6F5] overflow-x-auto leading-relaxed">
{`# 1. Install Python ML dependencies
pip install -r backend/requirements.txt

# 2. Train & evaluate scikit-learn RandomForestClassifier (5-fold CV)
python backend/train_model.py --data backend/dataset/pond_water_quality_sample.csv

# 3. Start FastAPI prediction server on port 8000
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Main Asymmetric Split Console: Left Parameter Input Form + Right Prediction & Explainability Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Parameter Input & Validation Form (5 cols) */}
        <form
          onSubmit={handleRunPrediction}
          className="lg:col-span-5 bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                Water-Quality Input Parameters
              </h2>
              <p className="text-xs text-[#C7C6E8] mt-0.5">
                Configure target pond, species profile, and measured values
              </p>
            </div>
            <FlaskConical className="w-5 h-5 text-[#7CE7FB]" />
          </div>

          {/* Quick Scenario Presets */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-[#C7C6E8]">
              Load Calibration / Test Scenario Preset:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPresetScenario('optimal')}
                className="px-2.5 py-2 text-xs font-medium rounded-lg bg-[#1E1D42] hover:bg-[#35336B] text-emerald-300 border border-emerald-400/25 transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                Optimal Baseline
              </button>
              <button
                type="button"
                onClick={() => applyPresetScenario('moderate_biofloc')}
                className="px-2.5 py-2 text-xs font-medium rounded-lg bg-[#1E1D42] hover:bg-[#35336B] text-amber-300 border border-amber-400/25 transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                Moderate Drift
              </button>
              <button
                type="button"
                onClick={() => applyPresetScenario('critical_hypoxia')}
                className="px-2.5 py-2 text-xs font-medium rounded-lg bg-[#1E1D42] hover:bg-[#35336B] text-rose-300 border border-rose-400/25 transition-colors cursor-pointer whitespace-nowrap truncate"
              >
                Critical Stress
              </button>
            </div>
          </div>

          {/* Pond & Species Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#C7C6E8] mb-1.5">
                Monitored Pond Unit
              </label>
              <select
                value={selectedPondId}
                onChange={(e) => handleSelectPond(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1E1D42] border border-white/15 text-sm text-white focus:outline-none focus:border-[#7CE7FB]"
              >
                {ponds.map((pond) => (
                  <option key={pond.id} value={pond.id}>
                    {pond.code} — {pond.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#C7C6E8] mb-1.5">
                Aquaculture Species Profile
              </label>
              <select
                value={selectedSpeciesId}
                onChange={(e) => setSelectedSpeciesId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1E1D42] border border-white/15 text-sm text-white focus:outline-none focus:border-[#7CE7FB]"
              >
                {Object.values(speciesProfiles).map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4 Core Parameters with Interactive Sliders & Precision Inputs */}
          <div className="space-y-4 pt-1">
            {/* 1. Water pH */}
            <div className="p-3.5 rounded-lg bg-[#1E1D42]/90 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  1. Water pH
                </label>
                <span className="text-xs font-mono text-[#7CE7FB]">
                  Target: {currentSpecies.ph.min.toFixed(1)} –{' '}
                  {currentSpecies.ph.max.toFixed(1)} pH
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={4.5}
                  max={10.5}
                  step={0.05}
                  value={Number(ph) || 7.5}
                  onChange={(e) => setPh(e.target.value)}
                  className="flex-1 accent-[#7CE7FB]"
                />
                <div className="flex items-center bg-[#2B2A5A] border border-white/15 rounded-md px-2.5 py-1 w-28">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="14"
                    value={ph}
                    onChange={(e) => setPh(e.target.value)}
                    className="w-full bg-transparent text-right font-mono text-sm text-white focus:outline-none tabular-nums"
                  />
                  <span className="text-xs font-mono text-[#C7C6E8] ml-1.5">
                    pH
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Dissolved Oxygen (DO) */}
            <div className="p-3.5 rounded-lg bg-[#1E1D42]/90 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  2. Dissolved Oxygen (DO)
                </label>
                <span className="text-xs font-mono text-[#7CE7FB]">
                  Target: {currentSpecies.dissolved_oxygen.min.toFixed(1)} –{' '}
                  {currentSpecies.dissolved_oxygen.max.toFixed(1)} mg/L
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0.5}
                  max={14.0}
                  step={0.05}
                  value={Number(doLevel) || 6.5}
                  onChange={(e) => setDoLevel(e.target.value)}
                  className="flex-1 accent-[#7CE7FB]"
                />
                <div className="flex items-center bg-[#2B2A5A] border border-white/15 rounded-md px-2.5 py-1 w-28">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="25"
                    value={doLevel}
                    onChange={(e) => setDoLevel(e.target.value)}
                    className="w-full bg-transparent text-right font-mono text-sm text-white focus:outline-none tabular-nums"
                  />
                  <span className="text-xs font-mono text-[#C7C6E8] ml-1">
                    mg/L
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Ammonia Concentration (TAN) */}
            <div className="p-3.5 rounded-lg bg-[#1E1D42]/90 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  3. Ammonia Concentration (TAN)
                </label>
                <span className="text-xs font-mono text-[#7CE7FB]">
                  Target: &le; {currentSpecies.ammonia.max.toFixed(2)} mg/L
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0.0}
                  max={1.5}
                  step={0.01}
                  value={Number(ammonia) || 0.03}
                  onChange={(e) => setAmmonia(e.target.value)}
                  className="flex-1 accent-[#7CE7FB]"
                />
                <div className="flex items-center bg-[#2B2A5A] border border-white/15 rounded-md px-2.5 py-1 w-28">
                  <input
                    type="number"
                    step="0.005"
                    min="0"
                    max="15"
                    value={ammonia}
                    onChange={(e) => setAmmonia(e.target.value)}
                    className="w-full bg-transparent text-right font-mono text-sm text-white focus:outline-none tabular-nums"
                  />
                  <span className="text-xs font-mono text-[#C7C6E8] ml-1">
                    mg/L
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-[#C7C6E8] pt-0.5 font-mono">
                <span>Derived Unionized NH3 (Toxic Fraction):</span>
                <span
                  className={
                    liveNh3.nh3MgL > 0.05 ? 'text-rose-300' : 'text-emerald-300'
                  }
                >
                  {liveNh3.nh3MgL.toFixed(4)} mg/L ({liveNh3.nh3Percent}%)
                </span>
              </div>
            </div>

            {/* 4. Water Temperature */}
            <div className="p-3.5 rounded-lg bg-[#1E1D42]/90 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  4. Water Temperature
                </label>
                <span className="text-xs font-mono text-[#7CE7FB]">
                  Target: {currentSpecies.temperature.min.toFixed(1)} –{' '}
                  {currentSpecies.temperature.max.toFixed(1)} °C
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={8.0}
                  max={38.0}
                  step={0.1}
                  value={Number(temperature) || 28.0}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="flex-1 accent-[#7CE7FB]"
                />
                <div className="flex items-center bg-[#2B2A5A] border border-white/15 rounded-md px-2.5 py-1 w-28">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="45"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full bg-transparent text-right font-mono text-sm text-white focus:outline-none tabular-nums"
                  />
                  <span className="text-xs font-mono text-[#C7C6E8] ml-1.5">
                    °C
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Data Provenance Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#C7C6E8] mb-1">
                Measurement Provenance
              </label>
              <select
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value as DataSourceType)}
                className="w-full px-3 py-2 rounded-lg bg-[#1E1D42] border border-white/15 text-xs font-mono text-white"
              >
                <option value="MANUAL LAB ENTRY">MANUAL LAB ENTRY</option>
                <option value="DEMO DATA — SIMULATED IOT TELEMETRY">
                  DEMO DATA — SIMULATED IOT TELEMETRY
                </option>
                <option value="CALIBRATION CHECK">CALIBRATION CHECK</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#C7C6E8] mb-1">
                Sample Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Post-feeding 16:00 check"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1E1D42] border border-white/15 text-xs text-white placeholder:text-white/30"
              />
            </div>
          </div>

          {validationError && (
            <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-400/40 text-xs text-rose-200 flex items-start gap-2">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPredicting}
              className="flex-1 py-3 px-5 rounded-lg bg-[#7CE7FB] hover:bg-[#99EFFD] text-[#1E1D42] font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isPredicting
                  ? 'Executing Random Forest...'
                  : 'Predict Pond Health'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPond(selectedPondId)}
              title="Reset to Pond Current Reading"
              className="p-3 rounded-lg bg-[#1E1D42] hover:bg-[#35336B] text-[#C7C6E8] border border-white/15 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Right Column: Random Forest Output, Probabilities, & Parameter Attribution (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {!result ? (
            <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-8 text-center space-y-4">
              <FlaskConical className="w-10 h-10 text-[#7CE7FB] mx-auto opacity-80" />
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-white">
                  Ready to Run Random Forest Classifier
                </h3>
                <p className="text-xs text-[#C7C6E8] leading-relaxed">
                  Adjust the water-quality parameters on the left or pick a
                  calibration scenario, then click{' '}
                  <strong className="text-[#7CE7FB]">Predict Pond Health</strong>{' '}
                  to compute class probabilities, tree votes, and feature
                  attributions.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const fakeEvent = {
                      preventDefault: () => {},
                    } as React.FormEvent;
                    handleRunPrediction(fakeEvent);
                  }}
                  className="px-5 py-2.5 rounded-lg bg-[#1D7E91] hover:bg-[#2393A9] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Run Prediction on Current Values
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Prediction Verdict Banner */}
              <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#C7C6E8]">
                      <span>PREDICTED POND HEALTH CATEGORY</span>
                      <span aria-hidden="true">·</span>
                      <span>{dataSource}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {result.predictedCategory === 'Healthy' && (
                        <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                      )}
                      {result.predictedCategory === 'Moderate Risk' && (
                        <AlertTriangle className="w-7 h-7 text-amber-400 shrink-0" />
                      )}
                      {result.predictedCategory === 'Critical Risk' && (
                        <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
                      )}
                      <h2
                        className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                          result.predictedCategory === 'Healthy'
                            ? 'text-emerald-300'
                            : result.predictedCategory === 'Moderate Risk'
                            ? 'text-amber-300'
                            : 'text-rose-300'
                        }`}
                      >
                        {result.predictedCategory}
                      </h2>
                    </div>
                  </div>

                  <div className="sm:text-right space-y-1">
                    <div className="text-xs font-mono text-[#C7C6E8]">
                      ENSEMBLE CONFIDENCE ({result.totalTrees} TREES)
                    </div>
                    <div className="text-3xl font-mono font-bold text-[#7CE7FB] tabular-nums">
                      {(result.confidence * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs font-mono text-[#C7C6E8]">
                      Votes: {result.treeVotes['Healthy']} H ·{' '}
                      {result.treeVotes['Moderate Risk']} M ·{' '}
                      {result.treeVotes['Critical Risk']} C
                    </div>
                  </div>
                </div>

                {/* Provenance & Model Mode Notice */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#C7C6E8] font-mono bg-[#1E1D42] px-3.5 py-2.5 rounded-lg border border-white/10">
                  <span>Engine: {result.engineLabel}</span>
                  <span>
                    Timestamp: {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Class Probabilities Chart */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#C7C6E8]">
                    <span className="font-semibold text-white">
                      Random Forest Class Probability Distribution
                    </span>
                    <span className="font-mono">
                      Fraction of {result.totalTrees} CART Decision Trees
                    </span>
                  </div>
                  <div className="h-44 w-full bg-[#1E1D42]/80 rounded-lg p-3 border border-white/10">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={probabilityChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 24, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.08)"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fill: '#C7C6E8', fontSize: 11 }}
                          unit="%"
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={105}
                          tick={{ fill: '#FFFFFF', fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1E1D42',
                            borderColor: 'rgba(124,231,251,0.3)',
                            fontSize: '12px',
                            color: '#fff',
                          }}
                          formatter={(value: any, _name: any, props: any) => [
                            `${value}% (${props.payload.votes}/${result.totalTrees} trees)`,
                            'Model Probability',
                          ]}
                        />
                        <Bar dataKey="probability" radius={[0, 4, 4, 0]} barSize={22}>
                          {probabilityChartData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Feature Contributions & Parameter-Level Warnings */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-white">
                      Contributing Input Parameters & Species Threshold Evaluation
                    </h3>
                    <span className="text-xs text-[#C7C6E8]">
                      Note: Feature importance reflects statistical tree split
                      attribution, not direct causation.
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {result.localContributions.map((item) => (
                      <div
                        key={item.feature}
                        className="p-3.5 rounded-lg bg-[#1E1D42] border border-white/10 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                              {item.label}
                            </span>
                            <span className="text-xs font-mono text-[#7CE7FB]">
                              {item.value} {item.unit}
                            </span>
                            <span className="text-xs text-[#C7C6E8]">·</span>
                            <span className="text-xs font-mono text-[#C7C6E8]">
                              Ref: {item.referenceRange}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 font-mono text-xs">
                            <span
                              className={
                                item.status === 'Optimal'
                                  ? 'text-emerald-300'
                                  : item.status === 'Warning'
                                  ? 'text-amber-300'
                                  : 'text-rose-300'
                              }
                            >
                              {item.status === 'Optimal'
                                ? '● Optimal'
                                : item.status === 'Warning'
                                ? '▲ Out of Range (Warning)'
                                : '✖ Critical Breach'}
                            </span>
                            <span className="text-[#7CE7FB]">
                              Attribution: {(item.localImpactScore * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Attribution bar */}
                        <div className="w-full h-1.5 bg-[#2B2A5A] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.status === 'Optimal'
                                ? 'bg-emerald-400'
                                : item.status === 'Warning'
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                            }`}
                            style={{
                              width: `${Math.max(item.localImpactScore * 100, 6)}%`,
                            }}
                          />
                        </div>

                        <p className="text-xs text-[#D5E6F5] leading-relaxed">
                          {item.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Next Steps & Deep-Dive Action */}
                <div className="p-4 rounded-lg bg-[#181736] border border-[#7CE7FB]/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7CE7FB]">
                      Recommended Next Steps (Decision Support)
                    </h4>
                    {nh3Result && (
                      <span className="text-xs font-mono text-[#C7C6E8]">
                        Unionized NH3: {nh3Result.nh3MgL.toFixed(4)} mg/L
                      </span>
                    )}
                  </div>
                  <ul className="text-xs text-[#D5E6F5] space-y-1.5 list-disc list-inside">
                    {result.predictedCategory === 'Healthy' ? (
                      <>
                        <li>
                          All primary water-quality parameters align with nominal
                          bounds for {currentSpecies.name}. Continue scheduled
                          monitoring.
                        </li>
                        <li>
                          Verify dissolved oxygen again prior to dawn (05:00–06:00)
                          when phytoplankton respiration peaks.
                        </li>
                      </>
                    ) : (
                      <>
                        <li>
                          Re-verify out-of-range measurements using a calibrated
                          secondary handheld meter or reagent test kit before
                          intervening.
                        </li>
                        <li>
                          Inspect mechanical aerators, water circulation, and feed
                          trays; avoid sudden water exchanges or unverified chemical
                          treatments without consulting an aquaculture specialist.
                        </li>
                      </>
                    )}
                  </ul>
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        onAskAquaSense({
                          pondName: activePond?.name || 'Basin A-1 North',
                          speciesId: selectedSpeciesId,
                          ph: Number(ph),
                          dissolved_oxygen: Number(doLevel),
                          ammonia: Number(ammonia),
                          temperature: Number(temperature),
                          predictedCategory: result.predictedCategory,
                          confidence: result.confidence,
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-[#1D7E91] hover:bg-[#2596AC] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Open in AquaSense AI Explainability Assistant &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
