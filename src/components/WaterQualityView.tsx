import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  Droplets,
  Thermometer,
  Wind,
  Activity,
  Radio,
  Wifi,
  BatteryCharging,
  Sliders,
  RefreshCw,
  Terminal,
  AlertCircle,
} from 'lucide-react';
import {
  PondUnit,
  SpeciesThresholds,
  calculateUnionizedAmmonia,
} from '../data/aquacultureConfig';

interface WaterQualityViewProps {
  mode: 'water-quality' | 'iot-sensors';
  ponds: PondUnit[];
  selectedPondId: string;
  onSelectPond: (pondId: string) => void;
  speciesProfiles: Record<string, SpeciesThresholds>;
  onUpdateSpeciesThresholds: (
    speciesId: string,
    updated: SpeciesThresholds
  ) => void;
  iotSimulationActive: boolean;
  onToggleIotSimulation: () => void;
  onStepSimulationNow: () => void;
}

export const WaterQualityView: React.FC<WaterQualityViewProps> = ({
  mode,
  ponds,
  selectedPondId,
  onSelectPond,
  speciesProfiles,
  onUpdateSpeciesThresholds,
  iotSimulationActive,
  onToggleIotSimulation,
  onStepSimulationNow,
}) => {
  const activePond = ponds.find((p) => p.id === selectedPondId) || ponds[0];
  const activeSpecies =
    speciesProfiles[activePond.speciesId] || speciesProfiles.tilapia;

  const [focusedParam, setFocusedParam] = useState<
    'dissolved_oxygen' | 'ph' | 'ammonia' | 'temperature'
  >('dissolved_oxygen');
  const [editingThresholds, setEditingThresholds] = useState<boolean>(false);
  const [draftThresholds, setDraftThresholds] =
    useState<SpeciesThresholds>(activeSpecies);

  const handleOpenThresholdEditor = () => {
    setDraftThresholds(activeSpecies);
    setEditingThresholds(!editingThresholds);
  };

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSpeciesThresholds(activeSpecies.id, draftThresholds);
    setEditingThresholds(false);
  };

  const getParamStatus = (
    param: 'ph' | 'dissolved_oxygen' | 'ammonia' | 'temperature',
    val: number
  ): { label: string; tone: string } => {
    if (param === 'ph') {
      if (
        val < activeSpecies.ph.criticalMin ||
        val > activeSpecies.ph.criticalMax
      ) {
        return { label: '✖ Critical Breach', tone: 'text-rose-300' };
      }
      if (val < activeSpecies.ph.min || val > activeSpecies.ph.max) {
        return { label: '▲ Out of Range', tone: 'text-amber-300' };
      }
      return { label: '● Optimal', tone: 'text-emerald-300' };
    }
    if (param === 'dissolved_oxygen') {
      if (val < activeSpecies.dissolved_oxygen.criticalMin) {
        return { label: '✖ Hypoxia Alert', tone: 'text-rose-300' };
      }
      if (val < activeSpecies.dissolved_oxygen.min) {
        return { label: '▲ Sub-Optimal', tone: 'text-amber-300' };
      }
      return { label: '● Optimal', tone: 'text-emerald-300' };
    }
    if (param === 'ammonia') {
      if (val > activeSpecies.ammonia.criticalMax) {
        return { label: '✖ Toxic Spike', tone: 'text-rose-300' };
      }
      if (val > activeSpecies.ammonia.max) {
        return { label: '▲ Elevated', tone: 'text-amber-300' };
      }
      return { label: '● Optimal', tone: 'text-emerald-300' };
    }
    if (
      val < activeSpecies.temperature.criticalMin ||
      val > activeSpecies.temperature.criticalMax
    ) {
      return { label: '✖ Thermal Stress', tone: 'text-rose-300' };
    }
    if (
      val < activeSpecies.temperature.min ||
      val > activeSpecies.temperature.max
    ) {
      return { label: '▲ Thermal Drift', tone: 'text-amber-300' };
    }
    return { label: '● Optimal', tone: 'text-emerald-300' };
  };

  const nh3Calc = calculateUnionizedAmmonia(
    activePond.currentReading.ammonia,
    activePond.currentReading.ph,
    activePond.currentReading.temperature
  );

  if (mode === 'iot-sensors') {
    return (
      <div className="space-y-8">
        {/* IoT Sensor Header Banner */}
        <div className="oceanic-hero-gradient rounded-xl p-6 border border-[#7CE7FB]/25 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-mono text-[#7CE7FB]">
                <span>IOT TELEMETRY & HARDWARE GATEWAY</span>
                <span aria-hidden="true">·</span>
                <span>
                  {iotSimulationActive
                    ? 'SIMULATION STREAM ACTIVE (DEMO DATA)'
                    : 'STATIC SNAPSHOT MODE'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                IoT Pond Sensor Network & Telemetry Diagnostics
              </h1>
              <p className="text-sm text-[#D5E6F5] leading-relaxed">
                Monitor multi-parameter probe health, battery voltage, LoRaWAN /
                MQTT packet freshness, and calibration schedules. Simulated sensor
                streams are explicitly tagged as{' '}
                <strong className="text-[#7CE7FB]">
                  DEMO DATA — SIMULATED IOT TELEMETRY
                </strong>
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onToggleIotSimulation}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  iotSimulationActive
                    ? 'bg-amber-400 text-[#1E1D42] hover:bg-amber-300'
                    : 'bg-[#7CE7FB] text-[#1E1D42] hover:bg-[#99EFFD]'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>
                  {iotSimulationActive
                    ? 'Stop Demo Telemetry Stream'
                    : 'Start Demo Sensor Simulation'}
                </span>
              </button>
              <button
                type="button"
                onClick={onStepSimulationNow}
                className="px-3.5 py-2.5 rounded-lg bg-[#1E1D42] hover:bg-[#35336B] text-white border border-white/20 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#7CE7FB]" />
                <span>Step Demo Reading</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sensor Node Health Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ponds.map((pond) => {
            const isSelected = pond.id === selectedPondId;
            const isStale = pond.sensorStatus.includes('Stale');
            const isCalDue = pond.sensorStatus.includes('Calibration');

            return (
              <div
                key={pond.id}
                onClick={() => onSelectPond(pond.id)}
                className={`p-5 rounded-xl border transition-colors cursor-pointer space-y-4 ${
                  isSelected
                    ? 'bg-[#35336B] border-[#7CE7FB]'
                    : 'bg-[#2B2A5A] border-white/15 hover:border-white/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-[#7CE7FB]">
                      {pond.sensorNodeId} · {pond.code}
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {pond.name}
                    </h3>
                  </div>
                  <span
                    className={`text-xs font-mono ${
                      isStale
                        ? 'text-rose-300'
                        : isCalDue
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                    }`}
                  >
                    {isStale
                      ? '✖ Stale (>45m)'
                      : isCalDue
                      ? '▲ Calibration Due'
                      : '● Sim Online'}
                  </span>
                </div>

                {/* Telemetry Hardware Metrics */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-[#1E1D42] border border-white/10 text-xs font-mono">
                  <div>
                    <span className="text-[#C7C6E8] block text-[11px]">
                      BATTERY
                    </span>
                    <span
                      className={
                        pond.batteryPercent < 50
                          ? 'text-amber-300 font-semibold'
                          : 'text-white font-semibold'
                      }
                    >
                      {pond.batteryPercent}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[#C7C6E8] block text-[11px]">
                      SIGNAL RSSI
                    </span>
                    <span className="text-white font-semibold">
                      {pond.signalRssiDbm} dBm
                    </span>
                  </div>
                  <div>
                    <span className="text-[#C7C6E8] block text-[11px]">
                      LAST CALIB
                    </span>
                    <span className="text-white font-semibold">
                      {pond.lastCalibrationDate}
                    </span>
                  </div>
                </div>

                {/* Current Readings Summary */}
                <div className="grid grid-cols-4 gap-2 text-center pt-1">
                  <div className="p-2 rounded bg-[#1E1D42]/60">
                    <div className="text-[11px] text-[#C7C6E8]">pH</div>
                    <div className="text-sm font-mono font-bold text-white tabular-nums">
                      {pond.currentReading.ph.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-[#1E1D42]/60">
                    <div className="text-[11px] text-[#C7C6E8]">DO</div>
                    <div className="text-sm font-mono font-bold text-[#7CE7FB] tabular-nums">
                      {pond.currentReading.dissolved_oxygen.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-[#1E1D42]/60">
                    <div className="text-[11px] text-[#C7C6E8]">TAN</div>
                    <div className="text-sm font-mono font-bold text-white tabular-nums">
                      {pond.currentReading.ammonia.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-[#1E1D42]/60">
                    <div className="text-[11px] text-[#C7C6E8]">Temp</div>
                    <div className="text-sm font-mono font-bold text-white tabular-nums">
                      {pond.currentReading.temperature.toFixed(1)}°
                    </div>
                  </div>
                </div>

                {/* Provenance & Timestamp */}
                <div className="flex items-center justify-between text-[11px] font-mono text-[#C7C6E8] border-t border-white/10 pt-3">
                  <span>{pond.dataSource}</span>
                  <span>
                    {new Date(pond.lastUpdated).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* MQTT & REST API Hardware Integration Specification */}
        <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-[#7CE7FB]" />
              <div>
                <h2 className="text-lg font-bold text-white">
                  Physical Sensor Integration Points (MQTT & REST API)
                </h2>
                <p className="text-xs text-[#C7C6E8]">
                  Connect ESP32 / STM32 / LoRaWAN water-quality nodes directly to
                  the PondHealth AI prediction endpoint
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#7CE7FB]">
              POST /api/predict
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#7CE7FB]">
                MQTT Topic & JSON Telemetry Payload Schema
              </div>
              <pre className="p-4 rounded-lg bg-[#181736] border border-white/10 text-xs font-mono text-[#D5E6F5] overflow-x-auto leading-relaxed">
{`// Topic: pondhealth/v1/telemetry/AQ-NODE-104A
{
  "pondId": "${activePond.id}",
  "sensorNodeId": "${activePond.sensorNodeId}",
  "speciesId": "${activePond.speciesId}",
  "ph": ${activePond.currentReading.ph.toFixed(2)},
  "dissolved_oxygen": ${activePond.currentReading.dissolved_oxygen.toFixed(2)},
  "ammonia": ${activePond.currentReading.ammonia.toFixed(3)},
  "temperature": ${activePond.currentReading.temperature.toFixed(1)},
  "batteryPercent": ${activePond.batteryPercent},
  "signalRssiDbm": ${activePond.signalRssiDbm}
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#7CE7FB]">
                cURL / Edge Gateway Webhook Example
              </div>
              <pre className="p-4 rounded-lg bg-[#181736] border border-white/10 text-xs font-mono text-[#D5E6F5] overflow-x-auto leading-relaxed">
{`curl -X POST http://localhost:3000/api/predict \\
  -H "Content-Type: application/json" \\
  -d '{
    "pondId": "${activePond.id}",
    "pondName": "${activePond.name}",
    "speciesId": "${activePond.speciesId}",
    "ph": ${activePond.currentReading.ph.toFixed(2)},
    "dissolved_oxygen": ${activePond.currentReading.dissolved_oxygen.toFixed(2)},
    "ammonia": ${activePond.currentReading.ammonia.toFixed(3)},
    "temperature": ${activePond.currentReading.temperature.toFixed(1)},
    "dataSource": "MANUAL LAB ENTRY"
  }'`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Water Quality Intelligence Mode
  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="oceanic-hero-gradient rounded-xl p-6 border border-[#7CE7FB]/25 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-mono text-[#7CE7FB]">
              <span>HYDRO-CHEMICAL WATER QUALITY INTELLIGENCE</span>
              <span aria-hidden="true">·</span>
              <span>SPECIES: {activeSpecies.name.toUpperCase()}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Multi-Parameter Water Quality Analysis & Species Thresholds
            </h1>
            <p className="text-sm text-[#D5E6F5] leading-relaxed">
              Inspect diurnal trends for pH, Dissolved Oxygen, Ammonia (TAN &
              unionized NH3), and Water Temperature. Reference thresholds are
              species-configurable rather than universally hardcoded.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
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
              onClick={handleOpenThresholdEditor}
              className="px-4 py-2 rounded-lg bg-[#7CE7FB] hover:bg-[#99EFFD] text-[#1E1D42] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>
                {editingThresholds
                  ? 'Close Threshold Editor'
                  : 'Configure Reference Ranges'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Configurable Species Reference Threshold Editor */}
      {editingThresholds && (
        <form
          onSubmit={handleSaveThresholds}
          className="bg-[#2B2A5A] border border-[#7CE7FB]/40 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">
                Configure Reference Thresholds — {activeSpecies.name} (
                <em className="font-normal text-[#7CE7FB]">
                  {activeSpecies.scientificName}
                </em>
                )
              </h2>
              <p className="text-xs text-[#C7C6E8]">
                Adjust optimal and critical thresholds for {activeSpecies.pondType}
              </p>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-[#1E1D42] text-xs font-bold cursor-pointer"
            >
              Save Thresholds
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* pH Bounds */}
            <div className="p-3.5 rounded-lg bg-[#1E1D42] border border-white/10 space-y-2">
              <div className="font-bold text-[#7CE7FB]">Water pH Bounds</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#C7C6E8] block mb-1">Optimal Min</label>
                  <input
                    type="number"
                    step="0.1"
                    value={draftThresholds.ph.min}
                    onChange={(e) =>
                      setDraftThresholds({
                        ...draftThresholds,
                        ph: {
                          ...draftThresholds.ph,
                          min: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-[#2B2A5A] text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#C7C6E8] block mb-1">Optimal Max</label>
                  <input
                    type="number"
                    step="0.1"
                    value={draftThresholds.ph.max}
                    onChange={(e) =>
                      setDraftThresholds({
                        ...draftThresholds,
                        ph: {
                          ...draftThresholds.ph,
                          max: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-[#2B2A5A] text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* DO Bounds */}
            <div className="p-3.5 rounded-lg bg-[#1E1D42] border border-white/10 space-y-2">
              <div className="font-bold text-[#7CE7FB]">
                Dissolved Oxygen (mg/L)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#C7C6E8] block mb-1">Optimal Min</label>
                  <input
                    type="number"
                    step="0.1"
                    value={draftThresholds.dissolved_oxygen.min}
                    onChange={(e) =>
                      setDraftThresholds({
                        ...draftThresholds,
                        dissolved_oxygen: {
                          ...draftThresholds.dissolved_oxygen,
                          min: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-[#2B2A5A] text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#C7C6E8] block mb-1">Critical Min</label>
                  <input
                    type="number"
                    step="0.1"
                    value={draftThresholds.dissolved_oxygen.criticalMin}
                    onChange={(e) =>
                      setDraftThresholds({
                        ...draftThresholds,
                        dissolved_oxygen: {
                          ...draftThresholds.dissolved_oxygen,
                          criticalMin: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-[#2B2A5A] text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Ammonia Bounds */}
            <div className="p-3.5 rounded-lg bg-[#1E1D42] border border-white/10 space-y-2">
              <div className="font-bold text-[#7CE7FB]">Ammonia TAN (mg/L)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#C7C6E8] block mb-1">Optimal Max</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftThresholds.ammonia.max}
                    onChange={(e) =>
                      setDraftThresholds({
                        ...draftThresholds,
                        ammonia: {
                          ...draftThresholds.ammonia,
                          max: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-[#2B2A5A] text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#C7C6E8] block mb-1">Critical Max</label>
                  <input
                    type="number"
                    step="0.05"
                    value={draftThresholds.ammonia.criticalMax}
                    onChange={(e) =>
                      setDraftThresholds({
                        ...draftThresholds,
                        ammonia: {
                          ...draftThresholds.ammonia,
                          criticalMax: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-[#2B2A5A] text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Temperature Bounds */}
            <div className="p-3.5 rounded-lg bg-[#1E1D42] border border-white/10 space-y-2">
              <div className="font-bold text-[#7CE7FB]">Temperature (°C)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#C7C6E8] block mb-1">Optimal Min</label>
                  <input
                    type="number"
                    step="0.5"
                    value={draftThresholds.temperature.min}
                    onChange={(e) =>
                      setDraftThresholds({
                        ...draftThresholds,
                        temperature: {
                          ...draftThresholds.temperature,
                          min: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-[#2B2A5A] text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[#C7C6E8] block mb-1">Optimal Max</label>
                  <input
                    type="number"
                    step="0.5"
                    value={draftThresholds.temperature.max}
                    onChange={(e) =>
                      setDraftThresholds({
                        ...draftThresholds,
                        temperature: {
                          ...draftThresholds.temperature,
                          max: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-[#2B2A5A] text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* 4 Parameter Intelligence Cards (Click to Focus Trend Chart) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* DO Card */}
        <div
          onClick={() => setFocusedParam('dissolved_oxygen')}
          className={`p-5 rounded-xl border transition-colors cursor-pointer space-y-3 ${
            focusedParam === 'dissolved_oxygen'
              ? 'bg-[#35336B] border-[#7CE7FB]'
              : 'bg-[#2B2A5A] border-white/15 hover:border-white/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#C7C6E8]">
            <span className="font-semibold uppercase tracking-wider">
              DISSOLVED OXYGEN
            </span>
            <Wind className="w-4 h-4 text-[#7CE7FB]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">
              {activePond.currentReading.dissolved_oxygen.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-[#7CE7FB]">mg/L</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span
              className={
                getParamStatus(
                  'dissolved_oxygen',
                  activePond.currentReading.dissolved_oxygen
                ).tone
              }
            >
              {
                getParamStatus(
                  'dissolved_oxygen',
                  activePond.currentReading.dissolved_oxygen
                ).label
              }
            </span>
            <span className="text-[#C7C6E8]">
              Ref: {activeSpecies.dissolved_oxygen.min.toFixed(1)}–
              {activeSpecies.dissolved_oxygen.max.toFixed(1)}
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#C7C6E8] border-t border-white/10 pt-2">
            {activePond.dataSource}
          </div>
        </div>

        {/* pH Card */}
        <div
          onClick={() => setFocusedParam('ph')}
          className={`p-5 rounded-xl border transition-colors cursor-pointer space-y-3 ${
            focusedParam === 'ph'
              ? 'bg-[#35336B] border-[#7CE7FB]'
              : 'bg-[#2B2A5A] border-white/15 hover:border-white/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#C7C6E8]">
            <span className="font-semibold uppercase tracking-wider">
              WATER pH LEVEL
            </span>
            <Droplets className="w-4 h-4 text-[#7CE7FB]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">
              {activePond.currentReading.ph.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-[#7CE7FB]">pH</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span
              className={
                getParamStatus('ph', activePond.currentReading.ph).tone
              }
            >
              {getParamStatus('ph', activePond.currentReading.ph).label}
            </span>
            <span className="text-[#C7C6E8]">
              Ref: {activeSpecies.ph.min.toFixed(1)}–
              {activeSpecies.ph.max.toFixed(1)}
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#C7C6E8] border-t border-white/10 pt-2">
            {activePond.dataSource}
          </div>
        </div>

        {/* Ammonia Card */}
        <div
          onClick={() => setFocusedParam('ammonia')}
          className={`p-5 rounded-xl border transition-colors cursor-pointer space-y-3 ${
            focusedParam === 'ammonia'
              ? 'bg-[#35336B] border-[#7CE7FB]'
              : 'bg-[#2B2A5A] border-white/15 hover:border-white/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#C7C6E8]">
            <span className="font-semibold uppercase tracking-wider">
              AMMONIA (TAN)
            </span>
            <Activity className="w-4 h-4 text-[#7CE7FB]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">
              {activePond.currentReading.ammonia.toFixed(3)}
            </span>
            <span className="text-xs font-mono text-[#7CE7FB]">mg/L</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span
              className={
                getParamStatus('ammonia', activePond.currentReading.ammonia).tone
              }
            >
              {
                getParamStatus('ammonia', activePond.currentReading.ammonia)
                  .label
              }
            </span>
            <span className="text-[#C7C6E8]">
              NH3: {nh3Calc.nh3MgL.toFixed(3)} mg/L
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#C7C6E8] border-t border-white/10 pt-2">
            {activePond.dataSource}
          </div>
        </div>

        {/* Temperature Card */}
        <div
          onClick={() => setFocusedParam('temperature')}
          className={`p-5 rounded-xl border transition-colors cursor-pointer space-y-3 ${
            focusedParam === 'temperature'
              ? 'bg-[#35336B] border-[#7CE7FB]'
              : 'bg-[#2B2A5A] border-white/15 hover:border-white/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#C7C6E8]">
            <span className="font-semibold uppercase tracking-wider">
              WATER TEMPERATURE
            </span>
            <Thermometer className="w-4 h-4 text-[#7CE7FB]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-mono font-bold text-white tabular-nums">
              {activePond.currentReading.temperature.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-[#7CE7FB]">°C</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span
              className={
                getParamStatus(
                  'temperature',
                  activePond.currentReading.temperature
                ).tone
              }
            >
              {
                getParamStatus(
                  'temperature',
                  activePond.currentReading.temperature
                ).label
              }
            </span>
            <span className="text-[#C7C6E8]">
              Ref: {activeSpecies.temperature.min.toFixed(1)}–
              {activeSpecies.temperature.max.toFixed(1)} °C
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#C7C6E8] border-t border-white/10 pt-2">
            {activePond.dataSource}
          </div>
        </div>
      </div>

      {/* Interactive 24-Hour Parameter Time-Series with Configured Threshold Reference Lines */}
      <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              24-Hour Parameter Trajectory & Reference Threshold Envelope —{' '}
              {activePond.name}
            </h2>
            <p className="text-xs text-[#C7C6E8] mt-0.5">
              Comparing observed time-series against configured{' '}
              {activeSpecies.name} reference bounds
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#1E1D42] rounded-lg border border-white/10">
            {(
              [
                { id: 'dissolved_oxygen', label: 'DO (mg/L)' },
                { id: 'ph', label: 'pH' },
                { id: 'ammonia', label: 'Ammonia (mg/L)' },
                { id: 'temperature', label: 'Temp (°C)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFocusedParam(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  focusedParam === tab.id
                    ? 'bg-[#7CE7FB] text-[#1E1D42]'
                    : 'text-[#C7C6E8] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full bg-[#1E1D42]/80 rounded-lg p-4 border border-white/10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={activePond.history24h}
              margin={{ top: 12, right: 28, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.08)"
              />
              <XAxis
                dataKey="timeLabel"
                tick={{ fill: '#C7C6E8', fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: '#C7C6E8', fontSize: 12 }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E1D42',
                  borderColor: 'rgba(124,231,251,0.35)',
                  fontSize: '12px',
                  color: '#fff',
                }}
              />
              <Legend />
              {focusedParam === 'dissolved_oxygen' && (
                <>
                  <ReferenceLine
                    y={activeSpecies.dissolved_oxygen.min}
                    stroke="#10B981"
                    strokeDasharray="4 4"
                    label={{
                      value: `Optimal Min (${activeSpecies.dissolved_oxygen.min} mg/L)`,
                      fill: '#10B981',
                      fontSize: 11,
                    }}
                  />
                  <ReferenceLine
                    y={activeSpecies.dissolved_oxygen.criticalMin}
                    stroke="#F43F5E"
                    strokeDasharray="4 4"
                    label={{
                      value: `Critical Hypoxia (${activeSpecies.dissolved_oxygen.criticalMin} mg/L)`,
                      fill: '#F43F5E',
                      fontSize: 11,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="dissolved_oxygen"
                    name="Dissolved Oxygen (mg/L)"
                    stroke="#7CE7FB"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#7CE7FB' }}
                  />
                </>
              )}
              {focusedParam === 'ph' && (
                <>
                  <ReferenceLine
                    y={activeSpecies.ph.min}
                    stroke="#10B981"
                    strokeDasharray="4 4"
                    label={{
                      value: `Min (${activeSpecies.ph.min})`,
                      fill: '#10B981',
                      fontSize: 11,
                    }}
                  />
                  <ReferenceLine
                    y={activeSpecies.ph.max}
                    stroke="#F59E0B"
                    strokeDasharray="4 4"
                    label={{
                      value: `Max (${activeSpecies.ph.max})`,
                      fill: '#F59E0B',
                      fontSize: 11,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ph"
                    name="Water pH"
                    stroke="#38BDF8"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#38BDF8' }}
                  />
                </>
              )}
              {focusedParam === 'ammonia' && (
                <>
                  <ReferenceLine
                    y={activeSpecies.ammonia.max}
                    stroke="#F59E0B"
                    strokeDasharray="4 4"
                    label={{
                      value: `Target Max (${activeSpecies.ammonia.max} mg/L)`,
                      fill: '#F59E0B',
                      fontSize: 11,
                    }}
                  />
                  <ReferenceLine
                    y={activeSpecies.ammonia.criticalMax}
                    stroke="#F43F5E"
                    strokeDasharray="4 4"
                    label={{
                      value: `Critical (${activeSpecies.ammonia.criticalMax} mg/L)`,
                      fill: '#F43F5E',
                      fontSize: 11,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ammonia"
                    name="Total Ammonia Nitrogen (mg/L)"
                    stroke="#F43F5E"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#F43F5E' }}
                  />
                </>
              )}
              {focusedParam === 'temperature' && (
                <>
                  <ReferenceLine
                    y={activeSpecies.temperature.min}
                    stroke="#38BDF8"
                    strokeDasharray="4 4"
                    label={{
                      value: `Min (${activeSpecies.temperature.min} °C)`,
                      fill: '#38BDF8',
                      fontSize: 11,
                    }}
                  />
                  <ReferenceLine
                    y={activeSpecies.temperature.max}
                    stroke="#F59E0B"
                    strokeDasharray="4 4"
                    label={{
                      value: `Max (${activeSpecies.temperature.max} °C)`,
                      fill: '#F59E0B',
                      fontSize: 11,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    name="Water Temperature (°C)"
                    stroke="#FBBF24"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#FBBF24' }}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Multi-Species Reference Matrix Comparison Table */}
      <div className="bg-[#2B2A5A] border border-white/15 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white">
              Configured Species Reference Threshold Matrix
            </h3>
            <p className="text-xs text-[#C7C6E8]">
              Biological water-quality envelopes across supported aquaculture
              species and pond systems
            </p>
          </div>
          <span className="text-xs font-mono text-[#7CE7FB]">
            Active Species: {activeSpecies.name}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/15 text-[#C7C6E8] font-mono">
                <th className="py-3 px-3">SPECIES & SYSTEM</th>
                <th className="py-3 px-3 text-right">OPTIMAL pH</th>
                <th className="py-3 px-3 text-right">OPTIMAL DO (mg/L)</th>
                <th className="py-3 px-3 text-right">CRITICAL DO</th>
                <th className="py-3 px-3 text-right">MAX TAN (mg/L)</th>
                <th className="py-3 px-3 text-right">OPTIMAL TEMP (°C)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {Object.values(speciesProfiles).map((sp) => {
                const isCurrent = sp.id === activeSpecies.id;
                return (
                  <tr
                    key={sp.id}
                    className={
                      isCurrent ? 'bg-[#35336B]/80' : 'hover:bg-white/5'
                    }
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">
                        {sp.name}{' '}
                        {isCurrent && (
                          <span className="text-[#7CE7FB] font-mono ml-1">
                            (Active Pond)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#C7C6E8]">
                        {sp.pondType}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-white tabular-nums">
                      {sp.ph.min.toFixed(1)} – {sp.ph.max.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-300 tabular-nums">
                      {sp.dissolved_oxygen.min.toFixed(1)} –{' '}
                      {sp.dissolved_oxygen.max.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-300 tabular-nums">
                      &lt; {sp.dissolved_oxygen.criticalMin.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-300 tabular-nums">
                      &le; {sp.ammonia.max.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-white tabular-nums">
                      {sp.temperature.min.toFixed(1)} –{' '}
                      {sp.temperature.max.toFixed(1)} °C
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
