import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Download,
  FileText,
  Printer,
  ArrowUpDown,
  Filter,
  Globe2,
  Droplets,
  Fish,
  Sprout,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import {
  PondUnit,
  PredictionRecord,
  PondAlert,
  SpeciesThresholds,
  calculateUnionizedAmmonia,
} from '../data/aquacultureConfig';
import { EvaluationMetrics, CLASS_LABELS } from '../ml/randomForestEngine';

interface AnalyticsAndSdgViewProps {
  mode: 'analytics' | 'sdg-reports';
  ponds: PondUnit[];
  predictionHistory: PredictionRecord[];
  alerts: PondAlert[];
  modelMetrics: EvaluationMetrics | null;
  speciesProfiles: Record<string, SpeciesThresholds>;
}

export const AnalyticsAndSdgView: React.FC<AnalyticsAndSdgViewProps> = ({
  mode,
  ponds,
  predictionHistory,
  alerts,
  modelMetrics,
  speciesProfiles,
}) => {
  // Analytics state
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [pondFilter, setPondFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<
    'timestamp' | 'confidence' | 'ph' | 'dissolved_oxygen' | 'ammonia'
  >('timestamp');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Report state
  const [reportPondId, setReportPondId] = useState<string>(
    ponds[0]?.id || 'pond-01'
  );

  const filteredHistory = useMemo(() => {
    return predictionHistory
      .filter((rec) => {
        if (categoryFilter !== 'ALL' && rec.predictedCategory !== categoryFilter)
          return false;
        if (pondFilter !== 'ALL' && rec.pondId !== pondFilter) return false;
        if (
          searchQuery.trim() !== '' &&
          !rec.pondName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !rec.speciesName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !rec.id.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'timestamp') {
          cmp =
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        } else {
          cmp = a[sortField] - b[sortField];
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [predictionHistory, categoryFilter, pondFilter, searchQuery, sortField, sortAsc]);

  const handleSort = (
    field: 'timestamp' | 'confidence' | 'ph' | 'dissolved_oxygen' | 'ammonia'
  ) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportHistoryCsv = () => {
    const headers = [
      'Record_ID',
      'Timestamp',
      'Pond_ID',
      'Pond_Name',
      'Species',
      'Data_Source',
      'pH',
      'Dissolved_Oxygen_mgL',
      'Ammonia_TAN_mgL',
      'Temperature_C',
      'Predicted_Category',
      'Confidence',
      'Top_Contributing_Parameter',
      'Engine',
    ];
    const rows = filteredHistory.map((r) => [
      r.id,
      r.timestamp,
      r.pondId,
      `"${r.pondName}"`,
      `"${r.speciesName}"`,
      `"${r.dataSource}"`,
      r.ph.toFixed(2),
      r.dissolved_oxygen.toFixed(2),
      r.ammonia.toFixed(3),
      r.temperature.toFixed(1),
      `"${r.predictedCategory}"`,
      r.confidence.toFixed(4),
      `"${r.topContributingParameter}"`,
      `"${r.engineUsed}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `pondhealth_ai_predictions_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pond-to-Pond comparison chart data
  const pondComparisonData = ponds.map((p) => ({
    name: p.code,
    fullName: p.name,
    DO: p.currentReading.dissolved_oxygen,
    pH: p.currentReading.ph,
    Ammonia_x10: Number((p.currentReading.ammonia * 10).toFixed(2)),
    Temp_div4: Number((p.currentReading.temperature / 4).toFixed(2)),
  }));

  if (mode === 'analytics') {
    return (
      <div className="space-y-8">
        {/* Analytics Header Banner */}
        <div className="oceanic-hero-gradient rounded-xl p-6 border border-[#7CE7FB]/25 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-mono text-[#7CE7FB]">
                <span>MULTI-BASIN ANALYTICS & PREDICTION LEDGER</span>
                <span aria-hidden="true">·</span>
                <span>{predictionHistory.length} LOGGED PREDICTIONS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Advanced Water-Quality Analytics & Model Evaluation
              </h1>
              <p className="text-sm text-[#D5E6F5] leading-relaxed">
                Compare parameters across all monitored ponds, audit the
                Random Forest Classifier’s 5-Fold Stratified Cross-Validation
                confusion matrix, and export filtered prediction history to CSV.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportHistoryCsv}
              className="px-4 py-2.5 rounded-lg bg-[#7CE7FB] hover:bg-[#99EFFD] text-[#1E1D42] text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Export Prediction History (CSV)</span>
            </button>
          </div>
        </div>

        {/* Pond-to-Pond Comparison & Cross-Validation Evaluation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Pond-to-Pond Comparison Chart (6 cols) */}
          <div className="lg:col-span-6 bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Pond-to-Pond Parameter Comparison (Current Snapshot)
              </h2>
              <p className="text-xs text-[#C7C6E8]">
                Cross-basin comparison of Dissolved Oxygen (mg/L), pH, and scaled
                Ammonia (TAN &times; 10)
              </p>
            </div>

            <div className="h-64 w-full bg-[#1E1D42]/80 rounded-lg p-3 border border-white/10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pondComparisonData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#FFFFFF', fontSize: 12 }}
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
                  <Bar
                    dataKey="DO"
                    name="Dissolved Oxygen (mg/L)"
                    fill="#7CE7FB"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="pH"
                    name="Water pH"
                    fill="#38BDF8"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Ammonia_x10"
                    name="Ammonia TAN (×10 mg/L)"
                    fill="#F43F5E"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Honest Calculated Model Evaluation Panel (6 cols) */}
          <div className="lg:col-span-6 bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white">
                  Calculated Random Forest Evaluation Metrics
                </h2>
                <p className="text-xs text-[#C7C6E8]">
                  {modelMetrics?.evaluationMethod} on{' '}
                  {modelMetrics?.datasetName} (n={modelMetrics?.sampleCount})
                </p>
              </div>
              <span className="text-xs font-mono text-[#7CE7FB]">
                {modelMetrics?.isPrototypeDataset
                  ? 'REFERENCE BENCHMARK'
                  : 'CUSTOM DATASET'}
              </span>
            </div>

            {modelMetrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-[#1E1D42] border border-white/10">
                    <div className="text-[11px] font-mono text-[#C7C6E8]">
                      CV ACCURACY
                    </div>
                    <div className="text-xl font-mono font-bold text-[#7CE7FB] tabular-nums">
                      {(modelMetrics.cvAccuracy * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1E1D42] border border-white/10">
                    <div className="text-[11px] font-mono text-[#C7C6E8]">
                      MACRO PRECISION
                    </div>
                    <div className="text-xl font-mono font-bold text-white tabular-nums">
                      {(modelMetrics.cvMacroPrecision * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1E1D42] border border-white/10">
                    <div className="text-[11px] font-mono text-[#C7C6E8]">
                      MACRO RECALL
                    </div>
                    <div className="text-xl font-mono font-bold text-white tabular-nums">
                      {(modelMetrics.cvMacroRecall * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1E1D42] border border-white/10">
                    <div className="text-[11px] font-mono text-[#C7C6E8]">
                      MACRO F1-SCORE
                    </div>
                    <div className="text-xl font-mono font-bold text-emerald-300 tabular-nums">
                      {(modelMetrics.cvMacroF1 * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* 3x3 Confusion Matrix */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-white">
                    5-Fold Cross-Validation Confusion Matrix (Actual Rows vs.
                    Predicted Columns)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-white/15 text-[#C7C6E8]">
                          <th className="py-2 px-2 text-left">ACTUAL \ PRED</th>
                          {CLASS_LABELS.map((c) => (
                            <th key={c} className="py-2 px-2 text-right">
                              {c}
                            </th>
                          ))}
                          <th className="py-2 px-2 text-right">F1</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {CLASS_LABELS.map((rowLabel, rIdx) => (
                          <tr key={rowLabel}>
                            <td className="py-2 px-2 font-semibold text-white">
                              {rowLabel}
                            </td>
                            {modelMetrics.confusionMatrix[rIdx].map(
                              (cellVal, cIdx) => (
                                <td
                                  key={cIdx}
                                  className={`py-2 px-2 text-right tabular-nums ${
                                    rIdx === cIdx
                                      ? 'text-[#7CE7FB] font-bold bg-[#1E1D42]'
                                      : 'text-[#C7C6E8]'
                                  }`}
                                >
                                  {cellVal}
                                </td>
                              )
                            )}
                            <td className="py-2 px-2 text-right text-emerald-300 tabular-nums">
                              {(
                                modelMetrics.perClassMetrics[rowLabel].f1 * 100
                              ).toFixed(1)}
                              %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#C7C6E8]">
                Loading evaluation metrics...
              </div>
            )}
          </div>
        </div>

        {/* Sortable & Filterable Prediction History Table */}
        <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                Prediction History & Model Output Ledger
              </h2>
              <p className="text-xs text-[#C7C6E8]">
                Click column headers to sort; filter by pond, predicted health
                category, or search keyword
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <input
                type="text"
                placeholder="Search pond, species, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#1E1D42] border border-white/15 text-white placeholder:text-white/35"
              />
              <select
                value={pondFilter}
                onChange={(e) => setPondFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#1E1D42] border border-white/15 text-white"
              >
                <option value="ALL">All Ponds</option>
                {ponds.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#1E1D42] border border-white/15 text-white"
              >
                <option value="ALL">All Categories</option>
                <option value="Healthy">Healthy</option>
                <option value="Moderate Risk">Moderate Risk</option>
                <option value="Critical Risk">Critical Risk</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/15 text-[#C7C6E8] font-mono">
                  <th className="py-3 px-3">ID</th>
                  <th
                    onClick={() => handleSort('timestamp')}
                    className="py-3 px-3 cursor-pointer hover:text-white"
                  >
                    <span className="inline-flex items-center gap-1">
                      TIMESTAMP <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="py-3 px-3">POND & SPECIES</th>
                  <th className="py-3 px-3">DATA SOURCE</th>
                  <th
                    onClick={() => handleSort('ph')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  >
                    pH
                  </th>
                  <th
                    onClick={() => handleSort('dissolved_oxygen')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  >
                    DO (mg/L)
                  </th>
                  <th
                    onClick={() => handleSort('ammonia')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  >
                    TAN (mg/L)
                  </th>
                  <th className="py-3 px-3 text-right">TEMP (°C)</th>
                  <th className="py-3 px-3">PREDICTED STATUS</th>
                  <th
                    onClick={() => handleSort('confidence')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  >
                    CONFIDENCE
                  </th>
                  <th className="py-3 px-3">TOP DRIVER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredHistory.map((rec) => (
                  <tr key={rec.id} className="hover:bg-white/5">
                    <td className="py-3 px-3 font-mono text-[#7CE7FB]">
                      {rec.id}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#C7C6E8] tabular-nums whitespace-nowrap">
                      {new Date(rec.timestamp).toLocaleString([], {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">
                        {rec.pondName}
                      </div>
                      <div className="text-[11px] text-[#C7C6E8]">
                        {rec.speciesName}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#C7C6E8]">
                      {rec.dataSource}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-white tabular-nums">
                      {rec.ph.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#7CE7FB] tabular-nums">
                      {rec.dissolved_oxygen.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-white tabular-nums">
                      {rec.ammonia.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-white tabular-nums">
                      {rec.temperature.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold">
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
                    <td className="py-3 px-3 text-right font-mono text-white tabular-nums">
                      {(rec.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-[#D5E6F5]">
                      {rec.topContributingParameter}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // SDG Impact & Comprehensive Reports Mode
  const reportPond =
    ponds.find((p) => p.id === reportPondId) || ponds[0];
  const reportSpecies =
    speciesProfiles[reportPond.speciesId] || speciesProfiles.tilapia;
  const reportNh3 = calculateUnionizedAmmonia(
    reportPond.currentReading.ammonia,
    reportPond.currentReading.ph,
    reportPond.currentReading.temperature
  );
  const pondAlerts = alerts.filter((a) => a.pondId === reportPond.id);

  const handleDownloadJsonReport = () => {
    const reportPayload = {
      generatedAt: new Date().toISOString(),
      platform: 'PondHealth AI — Aquaculture Intelligence Platform',
      pond: {
        id: reportPond.id,
        code: reportPond.code,
        name: reportPond.name,
        pondType: reportPond.pondType,
        surfaceAreaHa: reportPond.surfaceAreaHa,
        species: reportSpecies.name,
        scientificName: reportSpecies.scientificName,
      },
      waterQualityReadings: {
        ...reportPond.currentReading,
        derivedUnionizedNh3MgL: reportNh3.nh3MgL,
        dataSource: reportPond.dataSource,
        lastUpdated: reportPond.lastUpdated,
      },
      aiPrediction: {
        predictedCategory: reportPond.predictedCategory,
        confidence: reportPond.confidence,
        probabilities: reportPond.probabilities,
        modelEngine: modelMetrics?.datasetName || 'Reference Random Forest',
      },
      configuredThresholds: reportSpecies,
      activeAlerts: pondAlerts,
      limitationsAndDisclaimer:
        'Decision-support diagnostic report. Simulated telemetry is labeled as DEMO DATA. Always verify water-quality anomalies with calibrated field instruments.',
    };
    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pondhealth_report_${reportPond.code}_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* SDG & Sustainability Header Banner */}
      <div className="oceanic-hero-gradient rounded-xl p-6 border border-[#7CE7FB]/25 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-mono text-[#7CE7FB]">
              <span>UN SUSTAINABLE DEVELOPMENT GOALS & DIAGNOSTIC REPORTS</span>
              <span aria-hidden="true">·</span>
              <span>SDG 2 · SDG 6 · SDG 14</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Sustainability Impact & Pond Diagnostic Reporting
            </h1>
            <p className="text-sm text-[#D5E6F5] leading-relaxed">
              Aligning proactive aquaculture water-quality intelligence with the
              United Nations Sustainable Development Goals while generating
              auditable pond health reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-lg bg-[#7CE7FB] hover:bg-[#99EFFD] text-[#1E1D42] text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF Report</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJsonReport}
              className="px-4 py-2.5 rounded-lg bg-[#1E1D42] hover:bg-[#35336B] text-white border border-white/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-[#7CE7FB]" />
              <span>Export JSON Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* UN SDG 2, SDG 6, SDG 14 Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SDG 2 */}
        <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-amber-300">
              UN SDG 2 — ZERO HUNGER
            </span>
            <Sprout className="w-5 h-5 text-amber-300" />
          </div>
          <h2 className="text-lg font-bold text-white">
            Resilient Aquaculture & Food Production
          </h2>
          <p className="text-xs text-[#D5E6F5] leading-relaxed">
            Early detection of dissolved oxygen sag and unionized ammonia stress
            helps small- and medium-scale fish farmers prevent sudden mass
            mortality events and improve feed conversion efficiency.
          </p>
          <div className="p-3.5 rounded-lg bg-[#1E1D42] border border-white/10 space-y-1">
            <div className="text-[11px] font-mono text-[#C7C6E8]">
              ESTIMATED BIOMASS PROTECTED (MODELED PROJECTION)
            </div>
            <div className="text-xl font-mono font-bold text-amber-300 tabular-nums">
              5 Monitored Basins (6.35 ha)
            </div>
            <div className="text-[11px] text-[#C7C6E8]">
              Supports proactive harvest security across Tilapia, Shrimp, Carp,
              Catfish, and Salmonid culture.
            </div>
          </div>
        </div>

        {/* SDG 6 */}
        <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#7CE7FB]">
              UN SDG 6 — CLEAN WATER & SANITATION
            </span>
            <Droplets className="w-5 h-5 text-[#7CE7FB]" />
          </div>
          <h2 className="text-lg font-bold text-white">
            Responsible Water Stewardship
          </h2>
          <p className="text-xs text-[#D5E6F5] leading-relaxed">
            Continuous monitoring of Total Ammonia Nitrogen (TAN) and pH prevents
            unnecessary emergency flushing, reducing untreated nutrient-rich
            effluent discharge into surrounding watersheds.
          </p>
          <div className="p-3.5 rounded-lg bg-[#1E1D42] border border-white/10 space-y-1">
            <div className="text-[11px] font-mono text-[#C7C6E8]">
              ESTIMATED WATER EXCHANGE REDUCTION (PROJECTION)
            </div>
            <div className="text-xl font-mono font-bold text-[#7CE7FB] tabular-nums">
              15% – 25% Lower Flush Volume
            </div>
            <div className="text-[11px] text-[#C7C6E8]">
              Estimated operational savings when targeted aeration replaces
              blind water exchange.
            </div>
          </div>
        </div>

        {/* SDG 14 */}
        <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-emerald-300">
              UN SDG 14 — LIFE BELOW WATER
            </span>
            <Fish className="w-5 h-5 text-emerald-300" />
          </div>
          <h2 className="text-lg font-bold text-white">
            Aquatic Ecosystem & Welfare Protection
          </h2>
          <p className="text-xs text-[#D5E6F5] leading-relaxed">
            Maintaining species-specific dissolved oxygen and thermal envelopes
            reduces physiological gill stress, lowers susceptibility to
            opportunistic pathogens, and minimizes prophylactic chemical use.
          </p>
          <div className="p-3.5 rounded-lg bg-[#1E1D42] border border-white/10 space-y-1">
            <div className="text-[11px] font-mono text-[#C7C6E8]">
              EUTROPHICATION RISK MITIGATION (ESTIMATE)
            </div>
            <div className="text-xl font-mono font-bold text-emerald-300 tabular-nums">
              4 / 5 Ponds in Nominal NH3 Range
            </div>
            <div className="text-[11px] text-[#C7C6E8]">
              Note: Sustainability indicators represent modeled operational
              estimates, not third-party audited carbon/effluent certificates.
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Printable Pond Diagnostic Report */}
      <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="text-xs font-mono text-[#7CE7FB]">
              OFFICIAL POND HEALTH & WATER-QUALITY DIAGNOSTIC REPORT
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">
              Comprehensive Basin Assessment — {reportPond.name} (
              {reportPond.code})
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-[#C7C6E8]">Select Basin:</label>
            <select
              value={reportPondId}
              onChange={(e) => setReportPondId(e.target.value)}
              className="px-3.5 py-2 rounded-lg bg-[#1E1D42] border border-[#7CE7FB]/40 text-xs font-semibold text-white"
            >
              {ponds.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Report Section 1: Pond Metadata & AI Prediction Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-[#1E1D42] border border-white/10 space-y-1.5">
            <div className="font-mono text-[#7CE7FB] font-bold">
              1. POND & BIOLOGICAL PROFILE
            </div>
            <div className="text-white font-semibold">
              {reportPond.name} ({reportPond.code})
            </div>
            <div className="text-[#C7C6E8]">
              Species: {reportSpecies.name} (<em>{reportSpecies.scientificName}</em>)
            </div>
            <div className="text-[#C7C6E8]">System: {reportPond.pondType}</div>
            <div className="text-[#C7C6E8] font-mono">
              Area: {reportPond.surfaceAreaHa} ha · Depth: {reportPond.depthMeters}m
              · Density: {reportPond.stockingDensityPerM2}/m²
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#1E1D42] border border-white/10 space-y-1.5">
            <div className="font-mono text-[#7CE7FB] font-bold">
              2. AI RANDOM FOREST CLASSIFICATION
            </div>
            <div
              className={`text-lg font-extrabold ${
                reportPond.predictedCategory === 'Healthy'
                  ? 'text-emerald-300'
                  : reportPond.predictedCategory === 'Moderate Risk'
                  ? 'text-amber-300'
                  : 'text-rose-300'
              }`}
            >
              {reportPond.predictedCategory} (
              {(reportPond.confidence * 100).toFixed(1)}% Confidence)
            </div>
            <div className="font-mono text-[#C7C6E8]">
              Probabilities: H {(reportPond.probabilities['Healthy'] * 100).toFixed(0)}
              % · M {(reportPond.probabilities['Moderate Risk'] * 100).toFixed(0)}% ·
              C {(reportPond.probabilities['Critical Risk'] * 100).toFixed(0)}%
            </div>
            <div className="text-[#C7C6E8] font-mono">
              Source: {reportPond.dataSource}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#1E1D42] border border-white/10 space-y-1.5">
            <div className="font-mono text-[#7CE7FB] font-bold">
              3. SENSOR NODE & CALIBRATION
            </div>
            <div className="text-white font-mono font-semibold">
              Node ID: {reportPond.sensorNodeId}
            </div>
            <div className="text-[#C7C6E8]">
              Status: {reportPond.sensorStatus}
            </div>
            <div className="text-[#C7C6E8] font-mono">
              Battery: {reportPond.batteryPercent}% · RSSI:{' '}
              {reportPond.signalRssiDbm} dBm
            </div>
            <div className="text-[#C7C6E8] font-mono">
              Last Calibrated: {reportPond.lastCalibrationDate}
            </div>
          </div>
        </div>

        {/* Report Section 2: Parameter Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/15 text-[#C7C6E8] font-mono">
                <th className="py-2.5 px-3">PARAMETER</th>
                <th className="py-2.5 px-3 text-right">OBSERVED READING</th>
                <th className="py-2.5 px-3 text-right">
                  SPECIES OPTIMAL RANGE
                </th>
                <th className="py-2.5 px-3 text-right">CRITICAL THRESHOLD</th>
                <th className="py-2.5 px-3">DIAGNOSTIC NOTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">
                  Water pH
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-white tabular-nums">
                  {reportPond.currentReading.ph.toFixed(2)} pH
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#7CE7FB] tabular-nums">
                  {reportSpecies.ph.min.toFixed(1)} –{' '}
                  {reportSpecies.ph.max.toFixed(1)} pH
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-300 tabular-nums">
                  &lt; {reportSpecies.ph.criticalMin.toFixed(1)} or &gt;{' '}
                  {reportSpecies.ph.criticalMax.toFixed(1)}
                </td>
                <td className="py-2.5 px-3 text-[#D5E6F5]">
                  Regulates carbonate buffering and NH3/NH4+ ionization ratio.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">
                  Dissolved Oxygen (DO)
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-white tabular-nums">
                  {reportPond.currentReading.dissolved_oxygen.toFixed(2)} mg/L
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#7CE7FB] tabular-nums">
                  {reportSpecies.dissolved_oxygen.min.toFixed(1)} –{' '}
                  {reportSpecies.dissolved_oxygen.max.toFixed(1)} mg/L
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-300 tabular-nums">
                  &lt; {reportSpecies.dissolved_oxygen.criticalMin.toFixed(1)}{' '}
                  mg/L
                </td>
                <td className="py-2.5 px-3 text-[#D5E6F5]">
                  Primary metabolic requirement for stock respiration and
                  biofilter nitrification.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">
                  Total Ammonia Nitrogen (TAN)
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-white tabular-nums">
                  {reportPond.currentReading.ammonia.toFixed(3)} mg/L (NH3:{' '}
                  {reportNh3.nh3MgL.toFixed(4)} mg/L)
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#7CE7FB] tabular-nums">
                  0.00 – {reportSpecies.ammonia.max.toFixed(2)} mg/L
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-300 tabular-nums">
                  &gt; {reportSpecies.ammonia.criticalMax.toFixed(2)} mg/L
                </td>
                <td className="py-2.5 px-3 text-[#D5E6F5]">
                  {reportNh3.nh3Percent}% currently exists as gill-toxic
                  unionized NH3 at {reportPond.currentReading.ph.toFixed(2)} pH.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">
                  Water Temperature
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-white tabular-nums">
                  {reportPond.currentReading.temperature.toFixed(1)} °C
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#7CE7FB] tabular-nums">
                  {reportSpecies.temperature.min.toFixed(1)} –{' '}
                  {reportSpecies.temperature.max.toFixed(1)} °C
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-300 tabular-nums">
                  &lt; {reportSpecies.temperature.criticalMin.toFixed(1)} or &gt;{' '}
                  {reportSpecies.temperature.criticalMax.toFixed(1)} °C
                </td>
                <td className="py-2.5 px-3 text-[#D5E6F5]">
                  Governs metabolic rate and maximum dissolved oxygen
                  solubility.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Report Section 3: Data Lineage & Limitations */}
        <div className="p-4 rounded-lg bg-[#181736] border border-white/10 text-xs text-[#C7C6E8] space-y-1">
          <div className="font-bold text-white">
            Data Sources, Methodology & Operational Limitations
          </div>
          <p className="leading-relaxed">
            Current reading provenance:{' '}
            <strong className="text-[#7CE7FB] font-mono">
              {reportPond.dataSource}
            </strong>
            . Predictions are generated by a CART Random Forest Classifier
            trained on the reference aquaculture water-quality dataset (n=
            {modelMetrics?.sampleCount ?? 90}). Model outputs and recommendations
            are intended for decision support only; always verify anomalous
            sensor readings with calibrated field instruments and consult a
            certified aquaculture specialist before applying treatments.
          </p>
        </div>
      </div>
    </div>
  );
};
