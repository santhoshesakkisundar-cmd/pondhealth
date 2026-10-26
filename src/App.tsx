/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  LayoutDashboard,
  FlaskConical,
  Droplets,
  BrainCircuit,
  Radio,
  Bell,
  BarChart3,
  Globe2,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Thermometer,
  Wind,
  Activity,
  RefreshCw,
} from 'lucide-react';
import {
  INITIAL_PONDS,
  INITIAL_ALERTS,
  INITIAL_PREDICTION_HISTORY,
  DEFAULT_SPECIES_PROFILES,
  PondUnit,
  PondAlert,
  PredictionRecord,
  SpeciesThresholds,
  DataSourceType,
  calculateUnionizedAmmonia,
} from './data/aquacultureConfig';
import {
  EvaluationMetrics,
  FeatureKey,
  HealthCategory,
  RFModelPrediction,
} from './ml/randomForestEngine';
import { PredictionLabView } from './components/PredictionLabView';
import { WaterQualityView } from './components/WaterQualityView';
import { AquaSenseAndAlertsView } from './components/AquaSenseAndAlertsView';
import { AnalyticsAndSdgView } from './components/AnalyticsAndSdgView';

type ActiveSection =
  | 'dashboard'
  | 'prediction-lab'
  | 'water-quality'
  | 'aquasense'
  | 'iot-sensors'
  | 'alerts'
  | 'analytics'
  | 'sdg-reports';

export default function App() {
  const [activeSection, setActiveSection] =
    useState<ActiveSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const [ponds, setPonds] = useState<PondUnit[]>(INITIAL_PONDS);
  const [selectedPondId, setSelectedPondId] = useState<string>(
    INITIAL_PONDS[0].id
  );
  const [speciesProfiles, setSpeciesProfiles] = useState<
    Record<string, SpeciesThresholds>
  >(DEFAULT_SPECIES_PROFILES);
  const [alerts, setAlerts] = useState<PondAlert[]>(INITIAL_ALERTS);
  const [predictionHistory, setPredictionHistory] = useState<
    PredictionRecord[]
  >(INITIAL_PREDICTION_HISTORY);

  const [modelMetrics, setModelMetrics] = useState<EvaluationMetrics | null>(
    null
  );
  const [globalImportances, setGlobalImportances] = useState<
    Record<FeatureKey, number>
  >({
    dissolved_oxygen: 0.34,
    ammonia: 0.31,
    ph: 0.19,
    temperature: 0.16,
  });

  const [iotSimulationActive, setIotSimulationActive] =
    useState<boolean>(false);
  const [aquaSenseContext, setAquaSenseContext] = useState<{
    pondName: string;
    speciesId: string;
    ph: number;
    dissolved_oxygen: number;
    ammonia: number;
    temperature: number;
    predictedCategory: HealthCategory;
    confidence: number;
  } | null>(null);

  // Fetch initial model metadata & history from backend
  useEffect(() => {
    async function fetchModelInfo() {
      try {
        const res = await fetch('/api/model-info');
        if (res.ok) {
          const data = await res.json();
          if (data.metrics) setModelMetrics(data.metrics);
          if (data.featureImportances)
            setGlobalImportances(data.featureImportances);
        }
        const histRes = await fetch('/api/history');
        if (histRes.ok) {
          const histData = await histRes.json();
          if (Array.isArray(histData.history) && histData.history.length > 0) {
            setPredictionHistory(histData.history);
          }
        }
      } catch (_err) {
        // Fallback already initialized
      }
    }
    fetchModelInfo();
  }, []);

  // Step simulated IoT reading for demo mode (explicitly labeled as DEMO DATA)
  const stepSimulatedTelemetry = useCallback(async () => {
    const targetPond =
      ponds.find((p) => p.id === selectedPondId) || ponds[0];
    if (!targetPond) return;

    const jitter = (range: number) => (Math.random() - 0.48) * range;
    const nextPh = Number(
      Math.min(
        9.6,
        Math.max(5.5, targetPond.currentReading.ph + jitter(0.08))
      ).toFixed(2)
    );
    const nextDo = Number(
      Math.min(
        11.5,
        Math.max(1.8, targetPond.currentReading.dissolved_oxygen + jitter(0.18))
      ).toFixed(2)
    );
    const nextAmmonia = Number(
      Math.min(
        1.2,
        Math.max(0.01, targetPond.currentReading.ammonia + jitter(0.02))
      ).toFixed(3)
    );
    const nextTemp = Number(
      Math.min(
        35.5,
        Math.max(11.0, targetPond.currentReading.temperature + jitter(0.2))
      ).toFixed(1)
    );

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pondId: targetPond.id,
          pondName: targetPond.name,
          speciesId: targetPond.speciesId,
          ph: nextPh,
          dissolved_oxygen: nextDo,
          ammonia: nextAmmonia,
          temperature: nextTemp,
          dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
          customThresholds: speciesProfiles[targetPond.speciesId],
          saveToHistory: false,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const pred: RFModelPrediction = data.prediction;
      const nowIso = new Date().toISOString();
      const timeLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      setPonds((prev) =>
        prev.map((p) => {
          if (p.id !== targetPond.id) return p;
          return {
            ...p,
            lastUpdated: nowIso,
            dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
            currentReading: {
              ph: nextPh,
              dissolved_oxygen: nextDo,
              ammonia: nextAmmonia,
              temperature: nextTemp,
            },
            predictedCategory: pred.predictedCategory,
            confidence: pred.confidence,
            probabilities: pred.probabilities,
            history24h: [
              ...p.history24h.slice(-9),
              {
                timestamp: nowIso,
                timeLabel,
                ph: nextPh,
                dissolved_oxygen: nextDo,
                ammonia: nextAmmonia,
                temperature: nextTemp,
                predictedCategory: pred.predictedCategory,
                confidence: pred.confidence,
                source: 'DEMO DATA — SIMULATED IOT TELEMETRY',
              },
            ],
          };
        })
      );
    } catch (_e) {
      // Ignore transient step errors
    }
  }, [ponds, selectedPondId, speciesProfiles]);

  useEffect(() => {
    if (!iotSimulationActive) return;
    const interval = setInterval(() => {
      stepSimulatedTelemetry();
    }, 5500);
    return () => clearInterval(interval);
  }, [iotSimulationActive, stepSimulatedTelemetry]);

  const handlePredictionComplete = (
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
  ) => {
    const nowIso = prediction.timestamp || new Date().toISOString();
    const timeLabel = new Date(nowIso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setPonds((prev) =>
      prev.map((p) => {
        if (p.id !== pondId) return p;
        return {
          ...p,
          lastUpdated: nowIso,
          dataSource: input.dataSource,
          currentReading: {
            ph: input.ph,
            dissolved_oxygen: input.dissolved_oxygen,
            ammonia: input.ammonia,
            temperature: input.temperature,
          },
          predictedCategory: prediction.predictedCategory,
          confidence: prediction.confidence,
          probabilities: prediction.probabilities,
          history24h: [
            ...p.history24h.slice(-9),
            {
              timestamp: nowIso,
              timeLabel,
              ph: input.ph,
              dissolved_oxygen: input.dissolved_oxygen,
              ammonia: input.ammonia,
              temperature: input.temperature,
              predictedCategory: prediction.predictedCategory,
              confidence: prediction.confidence,
              source: input.dataSource,
            },
          ],
        };
      })
    );

    if (savedRecord) {
      setPredictionHistory((prev) => [savedRecord, ...prev]);
    }
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, acknowledged: !a.acknowledged } : a
      )
    );
  };

  const handleUpdateSpeciesThresholds = (
    speciesId: string,
    updated: SpeciesThresholds
  ) => {
    setSpeciesProfiles((prev) => ({
      ...prev,
      [speciesId]: updated,
    }));
  };

  const activePond =
    ponds.find((p) => p.id === selectedPondId) || ponds[0];
  const activeSpecies =
    speciesProfiles[activePond.speciesId] || speciesProfiles.tilapia;
  const activeNh3 = calculateUnionizedAmmonia(
    activePond.currentReading.ammonia,
    activePond.currentReading.ph,
    activePond.currentReading.temperature
  );

  const healthyCount = ponds.filter(
    (p) => p.predictedCategory === 'Healthy'
  ).length;
  const moderateCount = ponds.filter(
    (p) => p.predictedCategory === 'Moderate Risk'
  ).length;
  const criticalCount = ponds.filter(
    (p) => p.predictedCategory === 'Critical Risk'
  ).length;
  const unacknowledgedAlertsCount = alerts.filter(
    (a) => !a.acknowledged
  ).length;

  const sidebarItems: {
    id: ActiveSection;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'prediction-lab', label: 'AI Prediction Lab', icon: FlaskConical },
    { id: 'water-quality', label: 'Water Quality Intel', icon: Droplets },
    { id: 'aquasense', label: 'AquaSense AI', icon: BrainCircuit },
    { id: 'iot-sensors', label: 'IoT Sensor Network', icon: Radio },
    { id: 'alerts', label: 'Alerts & Actions', icon: Bell },
    { id: 'analytics', label: 'Analytics & History', icon: BarChart3 },
    { id: 'sdg-reports', label: 'SDG Impact & Reports', icon: Globe2 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#212046] text-white">
      {/* Top Bar Contract: Strictly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#262552]/95 backdrop-blur-md border-b border-[#7CE7FB]/20">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('dashboard');
          }}
          className="text-lg font-extrabold tracking-tight text-[#7CE7FB] whitespace-nowrap shrink-0"
        >
          PondHealth AI
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#C7C6E8]">
          <button
            type="button"
            onClick={() => setActiveSection('dashboard')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'dashboard'
                ? 'text-[#7CE7FB] underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Command Center
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('prediction-lab')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'prediction-lab'
                ? 'text-[#7CE7FB] underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Prediction Lab
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('water-quality')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'water-quality'
                ? 'text-[#7CE7FB] underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Water Quality
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('aquasense')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'aquasense'
                ? 'text-[#7CE7FB] underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            AquaSense AI
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('analytics')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === 'analytics'
                ? 'text-[#7CE7FB] underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Analytics
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection('prediction-lab')}
            className="px-4 py-2 text-xs font-bold text-[#1E1D42] bg-[#7CE7FB] rounded-lg hover:bg-[#9AF0FD] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            Predict Pond Health
          </button>
        </div>
      </header>

      {/* Workspace Body: Collapsible Sidebar + Main Content Stage */}
      <div className="flex-1 flex">
        {/* Collapsible Sidebar */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-16' : 'w-64'
          } shrink-0 bg-[#252450] border-r border-white/10 transition-all duration-150 flex flex-col justify-between`}
        >
          <div className="p-3 space-y-1.5">
            <div className="flex items-center justify-between px-2 py-1.5 mb-2">
              {!sidebarCollapsed && (
                <span className="text-[11px] font-mono text-[#7CE7FB] tracking-wider">
                  AQUACULTURE MODULES
                </span>
              )}
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                className="p-1.5 rounded-lg text-[#C7C6E8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </div>

            {sidebarItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#7CE7FB] text-[#1E1D42] shadow-sm'
                      : 'text-[#C7C6E8] hover:bg-[#333168] hover:text-white'
                  }`}
                >
                  <IconComponent className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {!sidebarCollapsed &&
                    item.id === 'alerts' &&
                    unacknowledgedAlertsCount > 0 && (
                      <span
                        className={`ml-auto font-mono text-[11px] ${
                          isActive ? 'text-[#1E1D42] font-bold' : 'text-rose-300'
                        }`}
                      >
                        {unacknowledgedAlertsCount}
                      </span>
                    )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Bottom Pond Selector & Model Status */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-white/10 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-[#C7C6E8] mb-1">
                  ACTIVE MONITORED BASIN
                </label>
                <select
                  value={selectedPondId}
                  onChange={(e) => setSelectedPondId(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#1E1D42] border border-white/15 text-xs font-semibold text-white"
                >
                  {ponds.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-[#1E1D42] border border-white/10 space-y-1 font-mono text-[11px] text-[#C7C6E8]">
                <div className="text-[#7CE7FB] font-semibold">
                  RF Classifier Active
                </div>
                <div>
                  Trees: {modelMetrics?.treeCount ?? 50} · CV Acc:{' '}
                  {modelMetrics
                    ? `${(modelMetrics.cvAccuracy * 100).toFixed(1)}%`
                    : '95.6%'}
                </div>
                <div>
                  Dataset:{' '}
                  {modelMetrics?.isPrototypeDataset
                    ? 'Reference (Prototype)'
                    : 'Custom CSV'}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-[1440px] mx-auto w-full">
          {activeSection === 'dashboard' && (
            <div className="space-y-8">
              {/* Sample-Image Inspired Oceanic Hero Command Banner */}
              <div className="oceanic-hero-gradient rounded-xl p-6 sm:p-8 border border-[#7CE7FB]/30 shadow-xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-8 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#7CE7FB]">
                      <span>AQUACULTURE ENVIRONMENTAL AI COMMAND CENTER</span>
                      <span aria-hidden="true">·</span>
                      <span>{ponds.length} MONITORED PONDS</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {modelMetrics?.isPrototypeDataset
                          ? 'DEMO TELEMETRY & REFERENCE RF MODEL'
                          : 'CUSTOM RF MODEL'}
                      </span>
                    </div>

                    <h1
                      className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white"
                      style={{ textWrap: 'balance' }}
                    >
                      <span className="text-[#7CE7FB]">
                        PondHealth AI
                      </span>{' '}
                      Water-Quality & Random Forest Prediction System
                    </h1>

                    <p className="text-sm sm:text-base text-[#E2EBF8] max-w-2xl leading-relaxed">
                      Continuous hydro-chemical surveillance and Random Forest
                      health classification across pH, Dissolved Oxygen, Ammonia
                      concentration, and Water Temperature.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveSection('prediction-lab')}
                        className="px-5 py-2.5 rounded-full bg-[#7CE7FB] hover:bg-[#9AF0FD] text-[#1E1D42] font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-md whitespace-nowrap"
                      >
                        <FlaskConical className="w-4 h-4" />
                        <span>Launch AI Prediction Lab</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection('aquasense')}
                        className="px-5 py-2.5 rounded-full bg-[#1D7E91] hover:bg-[#2393A9] text-white border border-[#7CE7FB]/40 font-semibold text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        <BrainCircuit className="w-4 h-4 text-[#7CE7FB]" />
                        <span>Open AquaSense AI</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setIotSimulationActive(!iotSimulationActive)
                        }
                        className="px-4 py-2.5 rounded-full bg-[#282654]/90 hover:bg-[#282654] text-[#7CE7FB] border border-[#7CE7FB]/30 font-mono text-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            iotSimulationActive ? 'animate-spin' : ''
                          }`}
                        />
                        <span>
                          {iotSimulationActive
                            ? 'Demo Stream: ON (SIMULATED)'
                            : 'Toggle Demo Sensor Stream'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Right Summary Ring / Basin Health Tally (Inspired by Sample Image 2 Circular Badge) */}
                  <div className="lg:col-span-4 flex justify-center lg:justify-end">
                    <div className="w-60 h-60 rounded-full p-5 flex flex-col items-center justify-center text-center border-2 border-[#7CE7FB]/60 bg-gradient-to-br from-[#1D8296]/90 via-[#38538E]/90 to-[#5B3E96]/90 shadow-2xl space-y-1">
                      <span className="text-[11px] font-mono tracking-widest uppercase text-[#7CE7FB]">
                        ACTIVE BASIN VERDICT
                      </span>
                      <div className="text-xs font-semibold text-white truncate max-w-[180px]">
                        {activePond.name}
                      </div>
                      <div
                        className={`text-2xl font-extrabold tracking-tight ${
                          activePond.predictedCategory === 'Healthy'
                            ? 'text-emerald-300'
                            : activePond.predictedCategory === 'Moderate Risk'
                            ? 'text-amber-300'
                            : 'text-rose-300'
                        }`}
                      >
                        {activePond.predictedCategory}
                      </div>
                      <div className="text-xl font-mono font-bold text-white tabular-nums">
                        {(activePond.confidence * 100).toFixed(1)}% Conf.
                      </div>
                      <div className="text-[11px] font-mono text-[#D5E6F5] pt-1">
                        {healthyCount} Healthy · {moderateCount} Mod ·{' '}
                        {criticalCount} Crit
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monitored Ponds Quick Selector Bar */}
              <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-[#7CE7FB] font-mono">
                    SELECT MONITORED POND ({ponds.length} TOTAL):
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {ponds.map((p) => {
                    const isSelected = p.id === selectedPondId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPondId(p.id)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                          isSelected
                            ? 'bg-[#7CE7FB] text-[#1E1D42] shadow-sm'
                            : 'bg-[#1E1D42] text-[#C7C6E8] hover:text-white border border-white/10'
                        }`}
                      >
                        <span className="font-mono">{p.code}</span>
                        <span>{p.name}</span>
                        <span
                          className={`font-mono text-[11px] ${
                            isSelected
                              ? 'text-[#1E1D42]'
                              : p.predictedCategory === 'Healthy'
                              ? 'text-emerald-300'
                              : p.predictedCategory === 'Moderate Risk'
                              ? 'text-amber-300'
                              : 'text-rose-300'
                          }`}
                        >
                          ({p.predictedCategory})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4 Primary Water-Quality Parameter Telemetry Cards + 1 AI Health Verdict Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. pH */}
                <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#C7C6E8]">
                    <span className="font-semibold">WATER pH</span>
                    <Droplets className="w-4 h-4 text-[#7CE7FB]" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-mono font-bold text-white tabular-nums">
                      {activePond.currentReading.ph.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono text-[#7CE7FB]">
                      pH units
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#C7C6E8]">
                    Target: {activeSpecies.ph.min.toFixed(1)} –{' '}
                    {activeSpecies.ph.max.toFixed(1)} pH
                  </div>
                  <div className="text-[11px] font-mono text-[#C7C6E8] border-t border-white/10 pt-2 flex flex-col gap-0.5">
                    <span className="text-[#7CE7FB] truncate">
                      {activePond.dataSource}
                    </span>
                    <span>
                      Updated:{' '}
                      {new Date(activePond.lastUpdated).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* 2. Dissolved Oxygen */}
                <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#C7C6E8]">
                    <span className="font-semibold">DISSOLVED OXYGEN</span>
                    <Wind className="w-4 h-4 text-[#7CE7FB]" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-mono font-bold text-[#7CE7FB] tabular-nums">
                      {activePond.currentReading.dissolved_oxygen.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono text-[#7CE7FB]">
                      mg/L
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#C7C6E8]">
                    Target: {activeSpecies.dissolved_oxygen.min.toFixed(1)} –{' '}
                    {activeSpecies.dissolved_oxygen.max.toFixed(1)} mg/L
                  </div>
                  <div className="text-[11px] font-mono text-[#C7C6E8] border-t border-white/10 pt-2 flex flex-col gap-0.5">
                    <span className="text-[#7CE7FB] truncate">
                      {activePond.dataSource}
                    </span>
                    <span>
                      Updated:{' '}
                      {new Date(activePond.lastUpdated).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* 3. Ammonia Concentration */}
                <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#C7C6E8]">
                    <span className="font-semibold">AMMONIA (TAN)</span>
                    <Activity className="w-4 h-4 text-[#7CE7FB]" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-mono font-bold text-white tabular-nums">
                      {activePond.currentReading.ammonia.toFixed(3)}
                    </span>
                    <span className="text-xs font-mono text-[#7CE7FB]">
                      mg/L
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#C7C6E8]">
                    Toxic NH3: {activeNh3.nh3MgL.toFixed(4)} mg/L (
                    {activeNh3.nh3Percent}%)
                  </div>
                  <div className="text-[11px] font-mono text-[#C7C6E8] border-t border-white/10 pt-2 flex flex-col gap-0.5">
                    <span className="text-[#7CE7FB] truncate">
                      {activePond.dataSource}
                    </span>
                    <span>
                      Updated:{' '}
                      {new Date(activePond.lastUpdated).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* 4. Water Temperature */}
                <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#C7C6E8]">
                    <span className="font-semibold">TEMPERATURE</span>
                    <Thermometer className="w-4 h-4 text-[#7CE7FB]" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-mono font-bold text-white tabular-nums">
                      {activePond.currentReading.temperature.toFixed(1)}
                    </span>
                    <span className="text-xs font-mono text-[#7CE7FB]">°C</span>
                  </div>
                  <div className="text-xs font-mono text-[#C7C6E8]">
                    Target: {activeSpecies.temperature.min.toFixed(1)} –{' '}
                    {activeSpecies.temperature.max.toFixed(1)} °C
                  </div>
                  <div className="text-[11px] font-mono text-[#C7C6E8] border-t border-white/10 pt-2 flex flex-col gap-0.5">
                    <span className="text-[#7CE7FB] truncate">
                      {activePond.dataSource}
                    </span>
                    <span>
                      Updated:{' '}
                      {new Date(activePond.lastUpdated).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* 5. AI Predicted Pond Health Category */}
                <div className="bg-[#35336B] border border-[#7CE7FB]/40 rounded-xl p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#7CE7FB] font-mono">
                    <span>AI HEALTH PREDICTION</span>
                    <span>RF ({modelMetrics?.treeCount ?? 50} TREES)</span>
                  </div>
                  <div
                    className={`text-2xl font-extrabold tracking-tight ${
                      activePond.predictedCategory === 'Healthy'
                        ? 'text-emerald-300'
                        : activePond.predictedCategory === 'Moderate Risk'
                        ? 'text-amber-300'
                        : 'text-rose-300'
                    }`}
                  >
                    {activePond.predictedCategory}
                  </div>
                  <div className="text-xs font-mono text-white tabular-nums">
                    Confidence: {(activePond.confidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] font-mono text-[#C7C6E8] border-t border-white/10 pt-2 flex flex-col gap-0.5">
                    <span>Species: {activeSpecies.name}</span>
                    <span>Node: {activePond.sensorNodeId}</span>
                  </div>
                </div>
              </div>

              {/* Middle Split: 24-Hour Water-Quality Trend Chart (7 cols) + Active Alerts & Recommended Actions (5 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Water-Quality Trend Chart */}
                <div className="lg:col-span-7 bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-white">
                        24-Hour Water-Quality Telemetry Trends —{' '}
                        {activePond.name}
                      </h2>
                      <p className="text-xs text-[#C7C6E8]">
                        Dissolved Oxygen (mg/L), Water pH, and Temperature (°C)
                        trajectory ({activePond.dataSource})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('water-quality')}
                      className="text-xs font-semibold text-[#7CE7FB] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <span>Full Water Quality Intel</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="h-72 w-full bg-[#1E1D42]/80 rounded-lg p-3 border border-white/10">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={activePond.history24h}
                        margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient
                            id="doGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#7CE7FB"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="#7CE7FB"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="phGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10B981"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10B981"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.08)"
                        />
                        <XAxis
                          dataKey="timeLabel"
                          tick={{ fill: '#C7C6E8', fontSize: 11 }}
                        />
                        <YAxis tick={{ fill: '#C7C6E8', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1E1D42',
                            borderColor: 'rgba(124,231,251,0.35)',
                            fontSize: '12px',
                            color: '#fff',
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="dissolved_oxygen"
                          name="Dissolved Oxygen (mg/L)"
                          stroke="#7CE7FB"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#doGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="ph"
                          name="Water pH"
                          stroke="#10B981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#phGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Critical Parameter Warnings & Recommended Next Actions */}
                <div className="lg:col-span-5 bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-white">
                        Active Water-Quality Alerts & Next Actions
                      </h2>
                      <p className="text-xs text-[#C7C6E8]">
                        {unacknowledgedAlertsCount} unverified alerts across
                        monitored basins
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('alerts')}
                      className="text-xs font-semibold text-[#7CE7FB] hover:underline cursor-pointer whitespace-nowrap"
                    >
                      View All ({alerts.length})
                    </button>
                  </div>

                  <div className="space-y-3">
                    {alerts.slice(0, 3).map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3.5 rounded-lg bg-[#1E1D42] border border-white/10 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono">
                          <span
                            className={
                              alert.severity === 'Critical'
                                ? 'text-rose-300 font-bold'
                                : 'text-amber-300 font-bold'
                            }
                          >
                            {alert.severity === 'Critical'
                              ? '✖ CRITICAL'
                              : '▲ WARNING'}{' '}
                            · {alert.parameter}
                          </span>
                          <span className="text-[#7CE7FB]">
                            {alert.observedValue}
                          </span>
                        </div>
                        <div className="font-semibold text-white">
                          {alert.pondName}
                        </div>
                        <p className="text-[#C7C6E8] leading-relaxed">
                          <strong className="text-white">Next Action:</strong>{' '}
                          {alert.suggestedNextStep}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Prediction History Table on Command Center */}
              <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Recent Random Forest Prediction History
                    </h2>
                    <p className="text-xs text-[#C7C6E8]">
                      Latest water-quality evaluations and model outputs across
                      monitored ponds
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setActiveSection('prediction-lab')}
                      className="text-xs font-semibold text-[#7CE7FB] hover:underline cursor-pointer"
                    >
                      + Run New Prediction
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('analytics')}
                      className="text-xs font-semibold text-white hover:text-[#7CE7FB] cursor-pointer"
                    >
                      Full History & CSV Export &rarr;
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/15 text-[#C7C6E8] font-mono">
                        <th className="py-2.5 px-3">ID</th>
                        <th className="py-2.5 px-3">POND & SPECIES</th>
                        <th className="py-2.5 px-3">PROVENANCE</th>
                        <th className="py-2.5 px-3 text-right">pH</th>
                        <th className="py-2.5 px-3 text-right">DO (mg/L)</th>
                        <th className="py-2.5 px-3 text-right">TAN (mg/L)</th>
                        <th className="py-2.5 px-3 text-right">TEMP (°C)</th>
                        <th className="py-2.5 px-3">PREDICTED HEALTH</th>
                        <th className="py-2.5 px-3 text-right">CONFIDENCE</th>
                        <th className="py-2.5 px-3">PRIMARY DRIVER</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {predictionHistory.slice(0, 5).map((rec) => (
                        <tr key={rec.id} className="hover:bg-white/5">
                          <td className="py-2.5 px-3 font-mono text-[#7CE7FB]">
                            {rec.id}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-white">
                              {rec.pondName}
                            </span>{' '}
                            <span className="text-[#C7C6E8]">
                              · {rec.speciesName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-[#C7C6E8]">
                            {rec.dataSource}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-white tabular-nums">
                            {rec.ph.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#7CE7FB] tabular-nums">
                            {rec.dissolved_oxygen.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-white tabular-nums">
                            {rec.ammonia.toFixed(3)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-white tabular-nums">
                            {rec.temperature.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold">
                            <span
                              className={
                                rec.predictedCategory === 'Healthy'
                                  ? 'text-emerald-300'
                                  : rec.predictedCategory === 'Moderate Risk'
                                  ? 'text-amber-300'
                                  : 'text-rose-300'
                              }
                            >
                              {rec.predictedCategory === 'Healthy'
                                ? '● Healthy'
                                : rec.predictedCategory === 'Moderate Risk'
                                ? '▲ Moderate Risk'
                                : '✖ Critical Risk'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-white tabular-nums">
                            {(rec.confidence * 100).toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-[#D5E6F5]">
                            {rec.topContributingParameter}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'prediction-lab' && (
            <PredictionLabView
              ponds={ponds}
              speciesProfiles={speciesProfiles}
              modelMetrics={modelMetrics}
              globalImportances={globalImportances}
              onPredictionComplete={handlePredictionComplete}
              onModelRetrained={(metrics, imps) => {
                setModelMetrics(metrics);
                setGlobalImportances(imps);
              }}
              onAskAquaSense={(ctx) => {
                setAquaSenseContext(ctx);
                setActiveSection('aquasense');
              }}
            />
          )}

          {(activeSection === 'water-quality' ||
            activeSection === 'iot-sensors') && (
            <WaterQualityView
              mode={activeSection}
              ponds={ponds}
              selectedPondId={selectedPondId}
              onSelectPond={setSelectedPondId}
              speciesProfiles={speciesProfiles}
              onUpdateSpeciesThresholds={handleUpdateSpeciesThresholds}
              iotSimulationActive={iotSimulationActive}
              onToggleIotSimulation={() =>
                setIotSimulationActive(!iotSimulationActive)
              }
              onStepSimulationNow={stepSimulatedTelemetry}
            />
          )}

          {(activeSection === 'aquasense' || activeSection === 'alerts') && (
            <AquaSenseAndAlertsView
              mode={activeSection}
              ponds={ponds}
              selectedPondId={selectedPondId}
              onSelectPond={setSelectedPondId}
              speciesProfiles={speciesProfiles}
              globalImportances={globalImportances}
              alerts={alerts}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              initialContext={aquaSenseContext}
            />
          )}

          {(activeSection === 'analytics' ||
            activeSection === 'sdg-reports') && (
            <AnalyticsAndSdgView
              mode={activeSection}
              ponds={ponds}
              predictionHistory={predictionHistory}
              alerts={alerts}
              modelMetrics={modelMetrics}
              speciesProfiles={speciesProfiles}
            />
          )}
        </main>
      </div>

      {/* Quiet, Clean Footer */}
      <footer className="border-t border-white/10 bg-[#1E1D42] px-6 py-4 text-xs text-[#C7C6E8] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          PondHealth AI — Aquaculture Water Quality & Random Forest Decision
          Support Platform
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveSection('sdg-reports')}
            className="hover:text-[#7CE7FB] cursor-pointer"
          >
            UN SDG 2 · 6 · 14 Alignment
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setActiveSection('prediction-lab')}
            className="hover:text-[#7CE7FB] cursor-pointer"
          >
            Random Forest Pipeline
          </button>
        </div>
      </footer>
    </div>
  );
}
