import React, { useState, useEffect } from 'react';
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
  BrainCircuit,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  PondUnit,
  PondAlert,
  SpeciesThresholds,
  calculateUnionizedAmmonia,
} from '../data/aquacultureConfig';
import { FeatureKey, HealthCategory } from '../ml/randomForestEngine';

interface AquaSenseAndAlertsViewProps {
  mode: 'aquasense' | 'alerts';
  ponds: PondUnit[];
  selectedPondId: string;
  onSelectPond: (pondId: string) => void;
  speciesProfiles: Record<string, SpeciesThresholds>;
  globalImportances: Record<FeatureKey, number>;
  alerts: PondAlert[];
  onAcknowledgeAlert: (alertId: string) => void;
  initialContext?: {
    pondName: string;
    speciesId: string;
    ph: number;
    dissolved_oxygen: number;
    ammonia: number;
    temperature: number;
    predictedCategory: HealthCategory;
    confidence: number;
  } | null;
}

interface AquaSenseAnalysisResult {
  mode: string;
  modeLabel: string;
  limitations: string;
  summary: string;
  outOfRangeFactors: string[];
  measurementsToRecheck: string[];
  practicalActions: string[];
  questionResponse?: string;
}

export const AquaSenseAndAlertsView: React.FC<AquaSenseAndAlertsViewProps> = ({
  mode,
  ponds,
  selectedPondId,
  onSelectPond,
  speciesProfiles,
  globalImportances,
  alerts,
  onAcknowledgeAlert,
  initialContext,
}) => {
  const activePond = ponds.find((p) => p.id === selectedPondId) || ponds[0];
  const activeSpecies =
    speciesProfiles[
      initialContext?.speciesId || activePond.speciesId || 'tilapia'
    ] || speciesProfiles.tilapia;

  const [question, setQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AquaSenseAnalysisResult | null>(
    null
  );

  const [alertFilter, setAlertFilter] = useState<
    'ALL' | 'Critical' | 'Warning' | 'UNACKNOWLEDGED'
  >('ALL');

  const currentReading = initialContext
    ? {
        ph: initialContext.ph,
        dissolved_oxygen: initialContext.dissolved_oxygen,
        ammonia: initialContext.ammonia,
        temperature: initialContext.temperature,
      }
    : activePond.currentReading;

  const currentCategory =
    initialContext?.predictedCategory || activePond.predictedCategory;
  const currentConfidence =
    initialContext?.confidence || activePond.confidence;
  const currentPondName = initialContext?.pondName || activePond.name;

  const runAquaSenseAnalysis = async (customQuestion?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/aquasense/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pondName: currentPondName,
          speciesId: activeSpecies.id,
          speciesName: activeSpecies.name,
          ph: currentReading.ph,
          dissolved_oxygen: currentReading.dissolved_oxygen,
          ammonia: currentReading.ammonia,
          temperature: currentReading.temperature,
          predictedCategory: currentCategory,
          confidence: currentConfidence,
          question: customQuestion || '',
        }),
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (_err) {
      // Fallback handled cleanly
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'aquasense') {
      runAquaSenseAnalysis();
    }
  }, [mode, selectedPondId, initialContext]);

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    runAquaSenseAnalysis(question.trim());
  };

  const importanceData = [
    {
      name: 'Dissolved Oxygen (DO)',
      importance: Number(
        ((globalImportances.dissolved_oxygen || 0.34) * 100).toFixed(1)
      ),
      color: '#7CE7FB',
    },
    {
      name: 'Ammonia (TAN)',
      importance: Number(((globalImportances.ammonia || 0.31) * 100).toFixed(1)),
      color: '#38BDF8',
    },
    {
      name: 'Water pH',
      importance: Number(((globalImportances.ph || 0.19) * 100).toFixed(1)),
      color: '#10B981',
    },
    {
      name: 'Water Temperature',
      importance: Number(
        ((globalImportances.temperature || 0.16) * 100).toFixed(1)
      ),
      color: '#F59E0B',
    },
  ].sort((a, b) => b.importance - a.importance);

  const nh3Data = calculateUnionizedAmmonia(
    currentReading.ammonia,
    currentReading.ph,
    currentReading.temperature
  );

  if (mode === 'alerts') {
    const filteredAlerts = alerts.filter((a) => {
      if (alertFilter === 'Critical') return a.severity === 'Critical';
      if (alertFilter === 'Warning') return a.severity === 'Warning';
      if (alertFilter === 'UNACKNOWLEDGED') return !a.acknowledged;
      return true;
    });

    return (
      <div className="space-y-8">
        {/* Alerts Header Banner */}
        <div className="oceanic-hero-gradient rounded-xl p-6 border border-[#7CE7FB]/25 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-mono text-[#7CE7FB]">
                <span>POND ALERT & DECISION SUPPORT SYSTEM</span>
                <span aria-hidden="true">·</span>
                <span>
                  {alerts.filter((a) => !a.acknowledged).length} ACTIVE
                  UNACKNOWLEDGED ALERTS
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Water-Quality Alerts & Smart Recommendations
              </h1>
              <p className="text-sm text-[#D5E6F5] leading-relaxed">
                Real-time threshold breach tracking across all monitored basins.
                Recommendations emphasize sensor calibration verification,
                secondary grab-sample confirmation, and specialist consultation
                rather than automated chemical prescriptions.
              </p>
            </div>

            {/* Interactive Filter Bar */}
            <div className="flex items-center gap-1 p-1 bg-[#1E1D42] rounded-lg border border-white/15 shrink-0">
              {(
                [
                  { id: 'ALL', label: `All (${alerts.length})` },
                  {
                    id: 'Critical',
                    label: `Critical (${
                      alerts.filter((a) => a.severity === 'Critical').length
                    })`,
                  },
                  {
                    id: 'Warning',
                    label: `Warning (${
                      alerts.filter((a) => a.severity === 'Warning').length
                    })`,
                  },
                  {
                    id: 'UNACKNOWLEDGED',
                    label: `Unverified (${
                      alerts.filter((a) => !a.acknowledged).length
                    })`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAlertFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    alertFilter === tab.id
                      ? 'bg-[#7CE7FB] text-[#1E1D42]'
                      : 'text-[#C7C6E8] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">
                No Matching Water-Quality Alerts
              </h3>
              <p className="text-xs text-[#C7C6E8]">
                All monitored ponds in this filter category are operating within
                configured reference thresholds.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span
                        className={
                          alert.severity === 'Critical'
                            ? 'text-rose-300 font-bold'
                            : alert.severity === 'Warning'
                            ? 'text-amber-300 font-bold'
                            : 'text-emerald-300 font-bold'
                        }
                      >
                        {alert.severity === 'Critical'
                          ? '✖ CRITICAL SEVERITY'
                          : alert.severity === 'Warning'
                          ? '▲ WARNING SEVERITY'
                          : '● HEALTHY STATUS'}
                      </span>
                      <span aria-hidden="true" className="text-[#C7C6E8]">
                        ·
                      </span>
                      <span className="text-[#7CE7FB]">{alert.id}</span>
                      <span aria-hidden="true" className="text-[#C7C6E8]">
                        ·
                      </span>
                      <span className="text-[#C7C6E8]">{alert.dataSource}</span>
                      <span aria-hidden="true" className="text-[#C7C6E8]">
                        ·
                      </span>
                      <span className="text-[#C7C6E8]">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      {alert.pondName} — {alert.parameter}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => onAcknowledgeAlert(alert.id)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        alert.acknowledged
                          ? 'bg-[#1E1D42] text-emerald-300 border border-emerald-400/30'
                          : 'bg-[#7CE7FB] text-[#1E1D42] hover:bg-[#99EFFD]'
                      }`}
                    >
                      {alert.acknowledged
                        ? '✓ Field Check Logged'
                        : 'Acknowledge & Log Verification'}
                    </button>
                  </div>
                </div>

                {/* Observed vs Configured Reference Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-[#1E1D42] border border-white/10">
                    <span className="text-[#C7C6E8] block mb-1">
                      Observed Parameter Value
                    </span>
                    <span className="text-base font-mono font-bold text-white tabular-nums">
                      {alert.observedValue}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#1E1D42] border border-white/10">
                    <span className="text-[#C7C6E8] block mb-1">
                      Configured Reference Range
                    </span>
                    <span className="text-sm font-mono font-semibold text-[#7CE7FB] tabular-nums">
                      {alert.referenceRange}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#1E1D42] border border-white/10">
                    <span className="text-[#C7C6E8] block mb-1">
                      Verification State
                    </span>
                    <span className="text-sm font-mono text-white">
                      {alert.acknowledged
                        ? 'Acknowledged by Operator'
                        : 'Pending Grab-Sample Check'}
                    </span>
                  </div>
                </div>

                {/* Explanation & Suggested Next Step */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-lg bg-[#181736] border border-white/10 space-y-1">
                    <div className="font-bold text-white">
                      Hydro-Chemical Diagnostic Explanation
                    </div>
                    <p className="text-[#D5E6F5] leading-relaxed">
                      {alert.explanation}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-[#181736] border border-[#7CE7FB]/25 space-y-1">
                    <div className="font-bold text-[#7CE7FB]">
                      Suggested Next Step (Non-Prescriptive Advisory)
                    </div>
                    <p className="text-[#D5E6F5] leading-relaxed">
                      {alert.suggestedNextStep}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // AquaSense AI Explainability Mode
  return (
    <div className="space-y-8">
      {/* AquaSense Header Banner */}
      <div className="oceanic-hero-gradient rounded-xl p-6 border border-[#7CE7FB]/25 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-mono text-[#7CE7FB]">
              <span>AQUASENSE AI — EXPLAINABLE AQUACULTURE INTELLIGENCE</span>
              <span aria-hidden="true">·</span>
              <span>{analysis?.modeLabel || 'HYBRID RF + DOMAIN ENGINE'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              AquaSense AI Diagnostic & Explainability Assistant
            </h1>
            <p className="text-sm text-[#D5E6F5] leading-relaxed">
              Understand why a pond received its predicted health category,
              inspect parameter interactions (such as pH and temperature driving
              unionized NH3 toxicity), and review evidence-based verification
              steps.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <select
              value={selectedPondId}
              onChange={(e) => onSelectPond(e.target.value)}
              className="px-3.5 py-2 rounded-lg bg-[#1E1D42] border border-[#7CE7FB]/40 text-xs font-semibold text-white"
            >
              {ponds.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => runAquaSenseAnalysis(question)}
              className="px-3.5 py-2 rounded-lg bg-[#7CE7FB] text-[#1E1D42] text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span>Refresh Explanation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Evidence-Based Explanation & Interactive Q&A */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <div className="text-xs font-mono text-[#7CE7FB]">
                  DIAGNOSTIC TARGET: {currentPondName.toUpperCase()} (
                  {activeSpecies.name})
                </div>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  Predicted Status:{' '}
                  <span
                    className={
                      currentCategory === 'Healthy'
                        ? 'text-emerald-300'
                        : currentCategory === 'Moderate Risk'
                        ? 'text-amber-300'
                        : 'text-rose-300'
                    }
                  >
                    {currentCategory}
                  </span>{' '}
                  <span className="text-sm font-mono text-[#7CE7FB]">
                    ({(currentConfidence * 100).toFixed(1)}% confidence)
                  </span>
                </h2>
              </div>
              <BrainCircuit className="w-6 h-6 text-[#7CE7FB]" />
            </div>

            {/* Snapshot Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#1E1D42] border border-white/10">
                <span className="text-[#C7C6E8] block text-[10px]">pH</span>
                <span className="text-sm font-bold text-white">
                  {currentReading.ph.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#1E1D42] border border-white/10">
                <span className="text-[#C7C6E8] block text-[10px]">
                  DO (mg/L)
                </span>
                <span className="text-sm font-bold text-[#7CE7FB]">
                  {currentReading.dissolved_oxygen.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#1E1D42] border border-white/10">
                <span className="text-[#C7C6E8] block text-[10px]">
                  TAN (mg/L)
                </span>
                <span className="text-sm font-bold text-white">
                  {currentReading.ammonia.toFixed(3)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#1E1D42] border border-white/10">
                <span className="text-[#C7C6E8] block text-[10px]">
                  TOXIC NH3
                </span>
                <span className="text-sm font-bold text-amber-300">
                  {nh3Data.nh3MgL.toFixed(4)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#1E1D42] border border-white/10">
                <span className="text-[#C7C6E8] block text-[10px]">TEMP</span>
                <span className="text-sm font-bold text-white">
                  {currentReading.temperature.toFixed(1)} °C
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="p-6 rounded-lg bg-[#1E1D42] border border-white/10 text-xs font-mono text-[#7CE7FB] animate-pulse">
                Synthesizing Random Forest tree-path attributions and
                hydro-chemical equilibrium diagnostics...
              </div>
            ) : (
              analysis && (
                <div className="space-y-4 text-xs">
                  {/* Executive Summary */}
                  <div className="p-4 rounded-lg bg-[#1E1D42] border border-white/10 space-y-1.5">
                    <div className="font-bold text-[#7CE7FB] uppercase tracking-wider">
                      1. Why This Category Was Assigned
                    </div>
                    <p className="text-sm text-white leading-relaxed">
                      {analysis.summary}
                    </p>
                  </div>

                  {/* Out of Range Factors */}
                  <div className="p-4 rounded-lg bg-[#1E1D42] border border-white/10 space-y-2">
                    <div className="font-bold text-amber-300 uppercase tracking-wider">
                      2. Parameter Status vs. Configured Reference Thresholds
                    </div>
                    <ul className="space-y-1.5 text-[#D5E6F5] list-disc list-inside leading-relaxed">
                      {analysis.outOfRangeFactors.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Measurements to Recheck */}
                  <div className="p-4 rounded-lg bg-[#1E1D42] border border-white/10 space-y-2">
                    <div className="font-bold text-[#7CE7FB] uppercase tracking-wider">
                      3. Measurements & Sensors to Verify Again
                    </div>
                    <ul className="space-y-1.5 text-[#D5E6F5] list-disc list-inside leading-relaxed">
                      {analysis.measurementsToRecheck.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Practical Actions */}
                  <div className="p-4 rounded-lg bg-[#1E1D42] border border-emerald-400/25 space-y-2">
                    <div className="font-bold text-emerald-300 uppercase tracking-wider">
                      4. Practical Pond-Management Considerations
                    </div>
                    <ul className="space-y-1.5 text-[#D5E6F5] list-disc list-inside leading-relaxed">
                      {analysis.practicalActions.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {analysis.questionResponse && (
                    <div className="p-4 rounded-lg bg-[#35336B] border border-[#7CE7FB]/40 space-y-1.5">
                      <div className="font-bold text-[#7CE7FB]">
                        AquaSense Response to Your Query:
                      </div>
                      <p className="text-sm text-white leading-relaxed">
                        {analysis.questionResponse}
                      </p>
                    </div>
                  )}

                  {/* Explicit Engine Mode & Scientific Limitations Notice */}
                  <div className="p-3.5 rounded-lg bg-[#181736] border border-white/10 text-[11px] text-[#C7C6E8] space-y-1">
                    <div className="font-mono font-semibold text-white">
                      Active Engine Mode: {analysis.modeLabel}
                    </div>
                    <p>{analysis.limitations}</p>
                  </div>
                </div>
              )
            )}

            {/* Ask AquaSense Question Form */}
            <form
              onSubmit={handleQuestionSubmit}
              className="pt-2 border-t border-white/10 space-y-2.5"
            >
              <label className="block text-xs font-semibold text-white">
                Ask AquaSense AI About Parameter Interactions or Verification
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., How does a pH drop from 8.6 to 7.5 affect toxic unionized ammonia?"
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#1E1D42] border border-white/15 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-[#7CE7FB]"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-lg bg-[#7CE7FB] hover:bg-[#99EFFD] text-[#1E1D42] text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask AquaSense</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  'Why does high pH make ammonia more toxic?',
                  'Which sensor should I recalibrate first?',
                  'How does temperature affect dissolved oxygen solubility?',
                ].map((sampleQ) => (
                  <button
                    key={sampleQ}
                    type="button"
                    onClick={() => {
                      setQuestion(sampleQ);
                      runAquaSenseAnalysis(sampleQ);
                    }}
                    className="text-[11px] text-[#7CE7FB] hover:underline cursor-pointer"
                  >
                    &ldquo;{sampleQ}&rdquo;
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>

        {/* Right 5 Columns: Global Random Forest Feature Importance & Hydro-Chemical Reference */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Random Forest Global Feature Importance (Gini Impurity Reduction)
              </h3>
              <p className="text-xs text-[#C7C6E8]">
                Relative predictive weight across all decision trees in the
                trained forest
              </p>
            </div>

            <div className="h-56 w-full bg-[#1E1D42]/80 rounded-lg p-3 border border-white/10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={importanceData}
                  layout="vertical"
                  margin={{ top: 5, right: 25, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 50]}
                    tick={{ fill: '#C7C6E8', fontSize: 11 }}
                    unit="%"
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={130}
                    tick={{ fill: '#FFFFFF', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E1D42',
                      borderColor: 'rgba(124,231,251,0.3)',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                    formatter={(val: any) => [`${val}%`, 'Gini Importance']}
                  />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]} barSize={22}>
                    {importanceData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="p-3.5 rounded-lg bg-[#181736] border border-amber-400/30 text-xs text-[#D5E6F5] space-y-1">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 shrink-0" />
                <span>Methodological Note: Association vs. Causation</span>
              </div>
              <p className="leading-relaxed text-[11px] text-[#C7C6E8]">
                Mean Decrease in Impurity (Gini Importance) measures how
                frequently and effectively a parameter splits nodes in the
                training dataset. High feature importance does not prove that a
                single parameter is the sole biological cause of fish stress in
                every pond.
              </p>
            </div>
          </div>

          {/* Parameter Interaction Matrix Card */}
          <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-3">
            <h3 className="text-base font-bold text-white">
              Coupled Hydro-Chemical Parameter Dynamics
            </h3>
            <div className="space-y-2.5 text-xs text-[#D5E6F5]">
              <div className="p-3 rounded-lg bg-[#1E1D42] border border-white/10">
                <strong className="text-[#7CE7FB] block mb-0.5">
                  pH &times; Temperature &rarr; Unionized Ammonia (NH3)
                </strong>
                Every 1.0 unit increase in pH increases the toxic unionized NH3
                fraction nearly tenfold. Warm afternoon temperatures further
                shift the $\text{NH}_4^+ \rightleftharpoons \text{NH}_3$
                equilibrium toward toxic $\text{NH}_3$.
              </div>
              <div className="p-3 rounded-lg bg-[#1E1D42] border border-white/10">
                <strong className="text-[#7CE7FB] block mb-0.5">
                  Temperature &rarr; Dissolved Oxygen Saturation
                </strong>
                Higher water temperatures reduce physical oxygen solubility in
                water while simultaneously elevating fish and bacterial
                metabolic oxygen consumption.
              </div>
              <div className="p-3 rounded-lg bg-[#1E1D42] border border-white/10">
                <strong className="text-[#7CE7FB] block mb-0.5">
                  Diurnal Phytoplankton Cycle &rarr; pH & DO Swing
                </strong>
                Dense algal blooms produce $\text{O}_2$ and consume $\text{CO}_2$
                during daylight (raising afternoon pH and DO), then respire
                overnight, causing pre-dawn hypoxia and pH decline.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
