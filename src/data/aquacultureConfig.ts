import { HealthCategory, WaterQualitySample } from '../ml/randomForestEngine';

export type DataSourceType =
  | 'DEMO DATA — SIMULATED IOT TELEMETRY'
  | 'MANUAL LAB ENTRY'
  | 'UPLOADED CSV RECORD'
  | 'CALIBRATION CHECK';

export interface SpeciesThresholds {
  id: string;
  name: string;
  scientificName: string;
  pondType: string;
  description: string;
  ph: { min: number; max: number; criticalMin: number; criticalMax: number };
  dissolved_oxygen: { min: number; max: number; criticalMin: number };
  ammonia: { max: number; criticalMax: number };
  temperature: { min: number; max: number; criticalMin: number; criticalMax: number };
}

export const DEFAULT_SPECIES_PROFILES: Record<string, SpeciesThresholds> = {
  tilapia: {
    id: 'tilapia',
    name: 'Nile Tilapia',
    scientificName: 'Oreochromis niloticus',
    pondType: 'Earthen Semi-Intensive Pond',
    description: 'Warm-water finfish tolerant of moderate pH variation; sensitive to unionized ammonia spikes at high afternoon pH.',
    ph: { min: 6.8, max: 8.4, criticalMin: 6.0, criticalMax: 9.0 },
    dissolved_oxygen: { min: 5.0, max: 9.5, criticalMin: 3.0 },
    ammonia: { max: 0.12, criticalMax: 0.45 },
    temperature: { min: 25.0, max: 30.5, criticalMin: 20.0, criticalMax: 33.5 },
  },
  shrimp: {
    id: 'shrimp',
    name: 'Pacific White Shrimp',
    scientificName: 'Litopenaeus vannamei',
    pondType: 'HDPE-Lined Biofloc Intensive Basin',
    description: 'High-density crustacean culture requiring strict dissolved oxygen stability and tight alkalinity/pH buffering.',
    ph: { min: 7.5, max: 8.5, criticalMin: 7.0, criticalMax: 8.9 },
    dissolved_oxygen: { min: 5.5, max: 9.5, criticalMin: 3.8 },
    ammonia: { max: 0.10, criticalMax: 0.35 },
    temperature: { min: 26.0, max: 30.5, criticalMin: 22.0, criticalMax: 33.0 },
  },
  salmon: {
    id: 'salmon',
    name: 'Atlantic Salmon Smolt',
    scientificName: 'Salmo salar',
    pondType: 'Recirculating Aquaculture System (RAS)',
    description: 'Cold-water salmonid requiring high dissolved oxygen saturation (>8.0 mg/L) and near-zero ammonia.',
    ph: { min: 6.8, max: 7.8, criticalMin: 6.2, criticalMax: 8.3 },
    dissolved_oxygen: { min: 7.5, max: 11.5, criticalMin: 5.5 },
    ammonia: { max: 0.05, criticalMax: 0.20 },
    temperature: { min: 11.0, max: 16.5, criticalMin: 8.0, criticalMax: 19.5 },
  },
  catfish: {
    id: 'catfish',
    name: 'Pangasius Catfish',
    scientificName: 'Pangasianodon hypophthalmus',
    pondType: 'Deep Earthen Culture Pond',
    description: 'Resilient warm-water catfish; high stocking density increases sediment organic load and ammonia accumulation.',
    ph: { min: 6.5, max: 8.5, criticalMin: 5.8, criticalMax: 9.1 },
    dissolved_oxygen: { min: 4.5, max: 9.0, criticalMin: 2.5 },
    ammonia: { max: 0.15, criticalMax: 0.55 },
    temperature: { min: 26.0, max: 31.5, criticalMin: 21.0, criticalMax: 34.5 },
  },
  carp: {
    id: 'carp',
    name: 'Indian Major Carp (Rohu)',
    scientificName: 'Labeo rohita',
    pondType: 'Polyculture Freshwater Pond',
    description: 'Subtropical polyculture cyprinid; thrives in slightly alkaline waters with balanced phytoplankton bloom.',
    ph: { min: 7.0, max: 8.4, criticalMin: 6.3, criticalMax: 8.9 },
    dissolved_oxygen: { min: 5.0, max: 9.0, criticalMin: 3.2 },
    ammonia: { max: 0.12, criticalMax: 0.45 },
    temperature: { min: 24.5, max: 30.5, criticalMin: 19.5, criticalMax: 33.5 },
  },
};

export interface TelemetryTimePoint {
  timestamp: string;
  timeLabel: string;
  ph: number;
  dissolved_oxygen: number;
  ammonia: number;
  temperature: number;
  predictedCategory: HealthCategory;
  confidence: number;
  source: DataSourceType;
}

export interface PondUnit {
  id: string;
  name: string;
  code: string;
  speciesId: string;
  pondType: string;
  surfaceAreaHa: number;
  depthMeters: number;
  stockingDensityPerM2: number;
  sensorNodeId: string;
  sensorStatus: 'Connected (Simulated Demo)' | 'Stale Signal (>45m)' | 'Calibration Due';
  batteryPercent: number;
  signalRssiDbm: number;
  lastCalibrationDate: string;
  lastUpdated: string;
  dataSource: DataSourceType;
  currentReading: {
    ph: number;
    dissolved_oxygen: number;
    ammonia: number;
    temperature: number;
  };
  predictedCategory: HealthCategory;
  confidence: number;
  probabilities: Record<HealthCategory, number>;
  history24h: TelemetryTimePoint[];
}

export interface PondAlert {
  id: string;
  pondId: string;
  pondName: string;
  parameter: 'pH' | 'Dissolved Oxygen' | 'Ammonia (TAN)' | 'Water Temperature' | 'Sensor Telemetry';
  observedValue: string;
  referenceRange: string;
  timestamp: string;
  severity: 'Healthy' | 'Warning' | 'Critical';
  dataSource: DataSourceType;
  explanation: string;
  suggestedNextStep: string;
  acknowledged: boolean;
}

export interface PredictionRecord {
  id: string;
  pondId: string;
  pondName: string;
  speciesName: string;
  timestamp: string;
  dataSource: DataSourceType;
  ph: number;
  dissolved_oxygen: number;
  ammonia: number;
  temperature: number;
  predictedCategory: HealthCategory;
  confidence: number;
  probabilities: Record<HealthCategory, number>;
  topContributingParameter: string;
  engineUsed: string;
  notes?: string;
}

export const INITIAL_PONDS: PondUnit[] = [
  {
    id: 'pond-01',
    name: 'Basin A-1 North',
    code: 'PA-01',
    speciesId: 'tilapia',
    pondType: 'Earthen Semi-Intensive Pond',
    surfaceAreaHa: 1.4,
    depthMeters: 1.8,
    stockingDensityPerM2: 12,
    sensorNodeId: 'AQ-NODE-104A',
    sensorStatus: 'Connected (Simulated Demo)',
    batteryPercent: 94,
    signalRssiDbm: -62,
    lastCalibrationDate: '2026-10-18',
    lastUpdated: '2026-10-26T16:35:00Z',
    dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
    currentReading: {
      ph: 7.55,
      dissolved_oxygen: 6.85,
      ammonia: 0.03,
      temperature: 27.9,
    },
    predictedCategory: 'Healthy',
    confidence: 0.96,
    probabilities: {
      Healthy: 0.96,
      'Moderate Risk': 0.04,
      'Critical Risk': 0.0,
    },
    history24h: [
      { timestamp: '2026-10-25T20:00:00Z', timeLabel: '20:00', ph: 7.7, dissolved_oxygen: 6.9, ammonia: 0.02, temperature: 28.1, predictedCategory: 'Healthy', confidence: 0.96, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T00:00:00Z', timeLabel: '00:00', ph: 7.5, dissolved_oxygen: 6.3, ammonia: 0.03, temperature: 27.4, predictedCategory: 'Healthy', confidence: 0.94, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T04:00:00Z', timeLabel: '04:00', ph: 7.3, dissolved_oxygen: 5.8, ammonia: 0.03, temperature: 26.8, predictedCategory: 'Healthy', confidence: 0.91, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T08:00:00Z', timeLabel: '08:00', ph: 7.4, dissolved_oxygen: 6.5, ammonia: 0.03, temperature: 27.2, predictedCategory: 'Healthy', confidence: 0.95, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T12:00:00Z', timeLabel: '12:00', ph: 7.6, dissolved_oxygen: 7.1, ammonia: 0.02, temperature: 28.3, predictedCategory: 'Healthy', confidence: 0.97, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T16:35:00Z', timeLabel: '16:35', ph: 7.55, dissolved_oxygen: 6.85, ammonia: 0.03, temperature: 27.9, predictedCategory: 'Healthy', confidence: 0.96, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
    ],
  },
  {
    id: 'pond-02',
    name: 'Biofloc Tank B-2',
    code: 'PB-02',
    speciesId: 'shrimp',
    pondType: 'HDPE-Lined Biofloc Intensive Basin',
    surfaceAreaHa: 0.65,
    depthMeters: 1.5,
    stockingDensityPerM2: 85,
    sensorNodeId: 'AQ-NODE-208B',
    sensorStatus: 'Connected (Simulated Demo)',
    batteryPercent: 87,
    signalRssiDbm: -68,
    lastCalibrationDate: '2026-10-12',
    lastUpdated: '2026-10-26T16:38:00Z',
    dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
    currentReading: {
      ph: 8.62,
      dissolved_oxygen: 4.35,
      ammonia: 0.19,
      temperature: 31.1,
    },
    predictedCategory: 'Moderate Risk',
    confidence: 0.89,
    probabilities: {
      Healthy: 0.06,
      'Moderate Risk': 0.89,
      'Critical Risk': 0.05,
    },
    history24h: [
      { timestamp: '2026-10-25T20:00:00Z', timeLabel: '20:00', ph: 8.2, dissolved_oxygen: 5.7, ammonia: 0.09, temperature: 29.4, predictedCategory: 'Healthy', confidence: 0.86, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T00:00:00Z', timeLabel: '00:00', ph: 8.3, dissolved_oxygen: 5.2, ammonia: 0.12, temperature: 29.8, predictedCategory: 'Moderate Risk', confidence: 0.78, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T04:00:00Z', timeLabel: '04:00', ph: 8.4, dissolved_oxygen: 4.8, ammonia: 0.15, temperature: 30.2, predictedCategory: 'Moderate Risk', confidence: 0.84, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T08:00:00Z', timeLabel: '08:00', ph: 8.5, dissolved_oxygen: 4.6, ammonia: 0.17, temperature: 30.6, predictedCategory: 'Moderate Risk', confidence: 0.87, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T12:00:00Z', timeLabel: '12:00', ph: 8.58, dissolved_oxygen: 4.45, ammonia: 0.18, temperature: 30.9, predictedCategory: 'Moderate Risk', confidence: 0.88, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T16:38:00Z', timeLabel: '16:38', ph: 8.62, dissolved_oxygen: 4.35, ammonia: 0.19, temperature: 31.1, predictedCategory: 'Moderate Risk', confidence: 0.89, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
    ],
  },
  {
    id: 'pond-03',
    name: 'Estuary Raceway C-4',
    code: 'PC-04',
    speciesId: 'catfish',
    pondType: 'Deep Earthen Culture Pond',
    surfaceAreaHa: 2.1,
    depthMeters: 2.4,
    stockingDensityPerM2: 28,
    sensorNodeId: 'AQ-NODE-312C',
    sensorStatus: 'Calibration Due',
    batteryPercent: 72,
    signalRssiDbm: -74,
    lastCalibrationDate: '2026-09-14',
    lastUpdated: '2026-10-26T16:40:00Z',
    dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
    currentReading: {
      ph: 9.18,
      dissolved_oxygen: 2.25,
      ammonia: 0.74,
      temperature: 34.3,
    },
    predictedCategory: 'Critical Risk',
    confidence: 0.94,
    probabilities: {
      Healthy: 0.0,
      'Moderate Risk': 0.06,
      'Critical Risk': 0.94,
    },
    history24h: [
      { timestamp: '2026-10-25T20:00:00Z', timeLabel: '20:00', ph: 8.5, dissolved_oxygen: 4.4, ammonia: 0.24, temperature: 31.5, predictedCategory: 'Moderate Risk', confidence: 0.82, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T00:00:00Z', timeLabel: '00:00', ph: 8.7, dissolved_oxygen: 3.8, ammonia: 0.36, temperature: 32.1, predictedCategory: 'Moderate Risk', confidence: 0.79, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T04:00:00Z', timeLabel: '04:00', ph: 8.9, dissolved_oxygen: 3.1, ammonia: 0.51, temperature: 32.9, predictedCategory: 'Critical Risk', confidence: 0.85, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T08:00:00Z', timeLabel: '08:00', ph: 9.05, dissolved_oxygen: 2.7, ammonia: 0.62, temperature: 33.5, predictedCategory: 'Critical Risk', confidence: 0.9, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T12:00:00Z', timeLabel: '12:00', ph: 9.12, dissolved_oxygen: 2.4, ammonia: 0.69, temperature: 34.0, predictedCategory: 'Critical Risk', confidence: 0.92, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T16:40:00Z', timeLabel: '16:40', ph: 9.18, dissolved_oxygen: 2.25, ammonia: 0.74, temperature: 34.3, predictedCategory: 'Critical Risk', confidence: 0.94, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
    ],
  },
  {
    id: 'pond-04',
    name: 'Coldwater RAS D-1',
    code: 'PD-01',
    speciesId: 'salmon',
    pondType: 'Recirculating Aquaculture System (RAS)',
    surfaceAreaHa: 0.35,
    depthMeters: 3.0,
    stockingDensityPerM2: 45,
    sensorNodeId: 'AQ-NODE-401D',
    sensorStatus: 'Connected (Simulated Demo)',
    batteryPercent: 98,
    signalRssiDbm: -55,
    lastCalibrationDate: '2026-10-21',
    lastUpdated: '2026-10-26T16:36:00Z',
    dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
    currentReading: {
      ph: 7.32,
      dissolved_oxygen: 8.85,
      ammonia: 0.01,
      temperature: 14.2,
    },
    predictedCategory: 'Healthy',
    confidence: 0.98,
    probabilities: {
      Healthy: 0.98,
      'Moderate Risk': 0.02,
      'Critical Risk': 0.0,
    },
    history24h: [
      { timestamp: '2026-10-25T20:00:00Z', timeLabel: '20:00', ph: 7.3, dissolved_oxygen: 8.7, ammonia: 0.01, temperature: 14.1, predictedCategory: 'Healthy', confidence: 0.98, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T00:00:00Z', timeLabel: '00:00', ph: 7.28, dissolved_oxygen: 8.8, ammonia: 0.01, temperature: 13.9, predictedCategory: 'Healthy', confidence: 0.98, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T04:00:00Z', timeLabel: '04:00', ph: 7.25, dissolved_oxygen: 8.9, ammonia: 0.01, temperature: 13.8, predictedCategory: 'Healthy', confidence: 0.98, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T08:00:00Z', timeLabel: '08:00', ph: 7.3, dissolved_oxygen: 8.8, ammonia: 0.01, temperature: 14.0, predictedCategory: 'Healthy', confidence: 0.98, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T12:00:00Z', timeLabel: '12:00', ph: 7.35, dissolved_oxygen: 8.75, ammonia: 0.02, temperature: 14.3, predictedCategory: 'Healthy', confidence: 0.97, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T16:36:00Z', timeLabel: '16:36', ph: 7.32, dissolved_oxygen: 8.85, ammonia: 0.01, temperature: 14.2, predictedCategory: 'Healthy', confidence: 0.98, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
    ],
  },
  {
    id: 'pond-05',
    name: 'Delta Polyculture E-3',
    code: 'PE-03',
    speciesId: 'carp',
    pondType: 'Polyculture Freshwater Pond',
    surfaceAreaHa: 1.85,
    depthMeters: 2.0,
    stockingDensityPerM2: 10,
    sensorNodeId: 'AQ-NODE-509E',
    sensorStatus: 'Stale Signal (>45m)',
    batteryPercent: 41,
    signalRssiDbm: -88,
    lastCalibrationDate: '2026-10-02',
    lastUpdated: '2026-10-26T15:12:00Z',
    dataSource: 'MANUAL LAB ENTRY',
    currentReading: {
      ph: 7.64,
      dissolved_oxygen: 6.62,
      ammonia: 0.03,
      temperature: 27.8,
    },
    predictedCategory: 'Healthy',
    confidence: 0.95,
    probabilities: {
      Healthy: 0.95,
      'Moderate Risk': 0.05,
      'Critical Risk': 0.0,
    },
    history24h: [
      { timestamp: '2026-10-25T20:00:00Z', timeLabel: '20:00', ph: 7.6, dissolved_oxygen: 6.5, ammonia: 0.03, temperature: 27.7, predictedCategory: 'Healthy', confidence: 0.94, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T00:00:00Z', timeLabel: '00:00', ph: 7.5, dissolved_oxygen: 6.2, ammonia: 0.03, temperature: 27.2, predictedCategory: 'Healthy', confidence: 0.93, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T04:00:00Z', timeLabel: '04:00', ph: 7.4, dissolved_oxygen: 5.9, ammonia: 0.04, temperature: 26.9, predictedCategory: 'Healthy', confidence: 0.91, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T08:00:00Z', timeLabel: '08:00', ph: 7.55, dissolved_oxygen: 6.4, ammonia: 0.03, temperature: 27.3, predictedCategory: 'Healthy', confidence: 0.94, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T12:00:00Z', timeLabel: '12:00', ph: 7.68, dissolved_oxygen: 6.8, ammonia: 0.02, temperature: 28.0, predictedCategory: 'Healthy', confidence: 0.96, source: 'DEMO DATA — SIMULATED IOT TELEMETRY' },
      { timestamp: '2026-10-26T15:12:00Z', timeLabel: '15:12', ph: 7.64, dissolved_oxygen: 6.62, ammonia: 0.03, temperature: 27.8, predictedCategory: 'Healthy', confidence: 0.95, source: 'MANUAL LAB ENTRY' },
    ],
  },
];

export const INITIAL_ALERTS: PondAlert[] = [
  {
    id: 'ALT-1001',
    pondId: 'pond-03',
    pondName: 'Estuary Raceway C-4 (Pangasius Catfish)',
    parameter: 'Dissolved Oxygen',
    observedValue: '2.25 mg/L',
    referenceRange: '4.50 – 9.00 mg/L (Critical < 2.50 mg/L)',
    timestamp: '2026-10-26T16:40:00Z',
    severity: 'Critical',
    dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
    explanation: 'Observed dissolved oxygen (2.25 mg/L) fell below the configured critical hypoxia limit (2.50 mg/L) for Pangasius Catfish during peak afternoon thermal load (34.3 °C).',
    suggestedNextStep: 'Verify reading with a calibrated handheld optical DO meter, inspect paddlewheel aerator electrical lines, and consult your on-site aquaculture specialist before making water-exchange changes.',
    acknowledged: false,
  },
  {
    id: 'ALT-1002',
    pondId: 'pond-03',
    pondName: 'Estuary Raceway C-4 (Pangasius Catfish)',
    parameter: 'Ammonia (TAN)',
    observedValue: '0.740 mg/L',
    referenceRange: '0.00 – 0.15 mg/L (Critical > 0.55 mg/L)',
    timestamp: '2026-10-26T16:40:00Z',
    severity: 'Critical',
    dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
    explanation: 'Total Ammonia Nitrogen (0.740 mg/L) combined with elevated pH (9.18) and temperature (34.3 °C) substantially increases the toxic unionized NH3 fraction.',
    suggestedNextStep: 'Cross-check with a colorimetric salicylate test kit, temporarily pause scheduled feed dispensing until verified, and review probe calibration logs (last calibrated 2026-09-14).',
    acknowledged: false,
  },
  {
    id: 'ALT-1003',
    pondId: 'pond-02',
    pondName: 'Biofloc Tank B-2 (Pacific White Shrimp)',
    parameter: 'Dissolved Oxygen',
    observedValue: '4.35 mg/L',
    referenceRange: '5.50 – 9.50 mg/L (Critical < 3.80 mg/L)',
    timestamp: '2026-10-26T16:38:00Z',
    severity: 'Warning',
    dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
    explanation: 'Dissolved oxygen (4.35 mg/L) is below the optimal biofloc target (5.50 mg/L), indicating elevated heterotrophic microbial respiration.',
    suggestedNextStep: 'Check root-blower diffuser pressure and measure settleable biofloc volume (Imhoff cone) to verify suspended solids load.',
    acknowledged: false,
  },
  {
    id: 'ALT-1004',
    pondId: 'pond-02',
    pondName: 'Biofloc Tank B-2 (Pacific White Shrimp)',
    parameter: 'pH',
    observedValue: '8.62 pH',
    referenceRange: '7.50 – 8.50 pH (Critical > 8.90 pH)',
    timestamp: '2026-10-26T16:38:00Z',
    severity: 'Warning',
    dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
    explanation: 'Afternoon pH (8.62) has drifted slightly above the 8.50 upper reference threshold for Pacific White Shrimp.',
    suggestedNextStep: 'Re-verify pH electrode slope with pH 7.00 and 10.01 buffer solutions and monitor evening carbonate alkalinity.',
    acknowledged: false,
  },
  {
    id: 'ALT-1005',
    pondId: 'pond-05',
    pondName: 'Delta Polyculture E-3 (Indian Major Carp)',
    parameter: 'Sensor Telemetry',
    observedValue: 'Stale Packet (88 min elapsed)',
    referenceRange: 'Reporting Interval <= 15 min',
    timestamp: '2026-10-26T15:12:00Z',
    severity: 'Warning',
    dataSource: 'MANUAL LAB ENTRY',
    explanation: 'IoT Node AQ-NODE-509E has not transmitted an MQTT packet for 88 minutes (RSSI -88 dBm, Battery 41%). Fallback manual sample is currently displayed.',
    suggestedNextStep: 'Inspect solar charge controller on Node AQ-NODE-509E and continue manual grab-sampling until telemetry resumes.',
    acknowledged: true,
  },
];

export const REFERENCE_DATASET_SAMPLES: WaterQualitySample[] = [
  { ph: 7.4, dissolved_oxygen: 6.8, ammonia: 0.02, temperature: 28.1, species: 'tilapia', health_category: 'Healthy' },
  { ph: 7.6, dissolved_oxygen: 7.1, ammonia: 0.03, temperature: 27.5, species: 'tilapia', health_category: 'Healthy' },
  { ph: 7.2, dissolved_oxygen: 6.4, ammonia: 0.04, temperature: 28.8, species: 'tilapia', health_category: 'Healthy' },
  { ph: 7.8, dissolved_oxygen: 6.9, ammonia: 0.01, temperature: 26.9, species: 'tilapia', health_category: 'Healthy' },
  { ph: 7.5, dissolved_oxygen: 7.4, ammonia: 0.02, temperature: 27.2, species: 'shrimp', health_category: 'Healthy' },
  { ph: 8.0, dissolved_oxygen: 6.6, ammonia: 0.03, temperature: 28.5, species: 'shrimp', health_category: 'Healthy' },
  { ph: 7.9, dissolved_oxygen: 7.2, ammonia: 0.02, temperature: 29.0, species: 'shrimp', health_category: 'Healthy' },
  { ph: 7.3, dissolved_oxygen: 8.5, ammonia: 0.01, temperature: 14.5, species: 'salmon', health_category: 'Healthy' },
  { ph: 7.1, dissolved_oxygen: 9.1, ammonia: 0.01, temperature: 13.8, species: 'salmon', health_category: 'Healthy' },
  { ph: 7.4, dissolved_oxygen: 8.8, ammonia: 0.02, temperature: 15.1, species: 'salmon', health_category: 'Healthy' },
  { ph: 7.2, dissolved_oxygen: 6.2, ammonia: 0.04, temperature: 29.2, species: 'catfish', health_category: 'Healthy' },
  { ph: 7.5, dissolved_oxygen: 6.7, ammonia: 0.03, temperature: 28.4, species: 'catfish', health_category: 'Healthy' },
  { ph: 7.7, dissolved_oxygen: 7.0, ammonia: 0.02, temperature: 26.5, species: 'carp', health_category: 'Healthy' },
  { ph: 7.4, dissolved_oxygen: 6.5, ammonia: 0.03, temperature: 27.8, species: 'carp', health_category: 'Healthy' },
  { ph: 7.6, dissolved_oxygen: 6.9, ammonia: 0.02, temperature: 28.0, species: 'tilapia', health_category: 'Healthy' },
  { ph: 7.8, dissolved_oxygen: 7.3, ammonia: 0.02, temperature: 27.4, species: 'tilapia', health_category: 'Healthy' },
  { ph: 7.1, dissolved_oxygen: 6.3, ammonia: 0.04, temperature: 28.6, species: 'tilapia', health_category: 'Healthy' },
  { ph: 8.1, dissolved_oxygen: 6.8, ammonia: 0.03, temperature: 28.9, species: 'shrimp', health_category: 'Healthy' },
  { ph: 7.7, dissolved_oxygen: 7.5, ammonia: 0.01, temperature: 27.7, species: 'shrimp', health_category: 'Healthy' },
  { ph: 7.5, dissolved_oxygen: 6.6, ammonia: 0.03, temperature: 28.3, species: 'carp', health_category: 'Healthy' },
  { ph: 7.3, dissolved_oxygen: 7.1, ammonia: 0.02, temperature: 27.1, species: 'tilapia', health_category: 'Healthy' },
  { ph: 7.9, dissolved_oxygen: 6.5, ammonia: 0.04, temperature: 29.1, species: 'tilapia', health_category: 'Healthy' },
  { ph: 7.4, dissolved_oxygen: 8.6, ammonia: 0.01, temperature: 14.2, species: 'salmon', health_category: 'Healthy' },
  { ph: 7.2, dissolved_oxygen: 8.9, ammonia: 0.01, temperature: 13.5, species: 'salmon', health_category: 'Healthy' },
  { ph: 7.6, dissolved_oxygen: 6.4, ammonia: 0.03, temperature: 28.7, species: 'catfish', health_category: 'Healthy' },
  { ph: 7.5, dissolved_oxygen: 7.2, ammonia: 0.02, temperature: 27.6, species: 'tilapia', health_category: 'Healthy' },
  { ph: 7.7, dissolved_oxygen: 6.8, ammonia: 0.03, temperature: 28.2, species: 'shrimp', health_category: 'Healthy' },
  { ph: 7.3, dissolved_oxygen: 6.7, ammonia: 0.02, temperature: 27.9, species: 'carp', health_category: 'Healthy' },
  { ph: 7.8, dissolved_oxygen: 7.0, ammonia: 0.02, temperature: 27.3, species: 'tilapia', health_category: 'Healthy' },
  { ph: 7.4, dissolved_oxygen: 6.6, ammonia: 0.03, temperature: 28.5, species: 'tilapia', health_category: 'Healthy' },
  { ph: 6.4, dissolved_oxygen: 4.3, ammonia: 0.18, temperature: 31.2, species: 'tilapia', health_category: 'Moderate Risk' },
  { ph: 8.6, dissolved_oxygen: 4.6, ammonia: 0.15, temperature: 30.8, species: 'tilapia', health_category: 'Moderate Risk' },
  { ph: 6.6, dissolved_oxygen: 4.1, ammonia: 0.22, temperature: 31.5, species: 'tilapia', health_category: 'Moderate Risk' },
  { ph: 8.5, dissolved_oxygen: 4.8, ammonia: 0.14, temperature: 30.4, species: 'shrimp', health_category: 'Moderate Risk' },
  { ph: 6.7, dissolved_oxygen: 4.4, ammonia: 0.19, temperature: 31.0, species: 'shrimp', health_category: 'Moderate Risk' },
  { ph: 8.7, dissolved_oxygen: 4.2, ammonia: 0.21, temperature: 31.6, species: 'shrimp', health_category: 'Moderate Risk' },
  { ph: 6.5, dissolved_oxygen: 5.8, ammonia: 0.09, temperature: 17.8, species: 'salmon', health_category: 'Moderate Risk' },
  { ph: 8.3, dissolved_oxygen: 5.5, ammonia: 0.11, temperature: 18.2, species: 'salmon', health_category: 'Moderate Risk' },
  { ph: 6.3, dissolved_oxygen: 4.0, ammonia: 0.24, temperature: 31.8, species: 'catfish', health_category: 'Moderate Risk' },
  { ph: 8.6, dissolved_oxygen: 4.5, ammonia: 0.17, temperature: 30.9, species: 'catfish', health_category: 'Moderate Risk' },
  { ph: 6.5, dissolved_oxygen: 4.2, ammonia: 0.20, temperature: 31.4, species: 'carp', health_category: 'Moderate Risk' },
  { ph: 8.5, dissolved_oxygen: 4.7, ammonia: 0.16, temperature: 30.6, species: 'carp', health_category: 'Moderate Risk' },
  { ph: 6.7, dissolved_oxygen: 4.5, ammonia: 0.16, temperature: 30.5, species: 'tilapia', health_category: 'Moderate Risk' },
  { ph: 8.4, dissolved_oxygen: 4.3, ammonia: 0.19, temperature: 31.1, species: 'tilapia', health_category: 'Moderate Risk' },
  { ph: 6.8, dissolved_oxygen: 4.1, ammonia: 0.23, temperature: 24.2, species: 'tilapia', health_category: 'Moderate Risk' },
  { ph: 8.6, dissolved_oxygen: 4.9, ammonia: 0.15, temperature: 24.5, species: 'shrimp', health_category: 'Moderate Risk' },
  { ph: 6.5, dissolved_oxygen: 4.4, ammonia: 0.18, temperature: 23.8, species: 'tilapia', health_category: 'Moderate Risk' },
  { ph: 8.5, dissolved_oxygen: 4.2, ammonia: 0.21, temperature: 31.3, species: 'shrimp', health_category: 'Moderate Risk' },
  { ph: 6.6, dissolved_oxygen: 5.6, ammonia: 0.10, temperature: 17.9, species: 'salmon', health_category: 'Moderate Risk' },
  { ph: 8.4, dissolved_oxygen: 5.4, ammonia: 0.12, temperature: 18.4, species: 'salmon', health_category: 'Moderate Risk' },
  { ph: 6.4, dissolved_oxygen: 4.3, ammonia: 0.22, temperature: 31.7, species: 'catfish', health_category: 'Moderate Risk' },
  { ph: 8.6, dissolved_oxygen: 4.6, ammonia: 0.18, temperature: 30.7, species: 'carp', health_category: 'Moderate Risk' },
  { ph: 6.7, dissolved_oxygen: 4.2, ammonia: 0.20, temperature: 31.2, species: 'tilapia', health_category: 'Moderate Risk' },
  { ph: 8.5, dissolved_oxygen: 4.4, ammonia: 0.17, temperature: 30.9, species: 'tilapia', health_category: 'Moderate Risk' },
  { ph: 6.6, dissolved_oxygen: 4.5, ammonia: 0.19, temperature: 24.1, species: 'carp', health_category: 'Moderate Risk' },
  { ph: 8.7, dissolved_oxygen: 4.1, ammonia: 0.23, temperature: 31.5, species: 'shrimp', health_category: 'Moderate Risk' },
  { ph: 6.5, dissolved_oxygen: 4.3, ammonia: 0.21, temperature: 31.0, species: 'tilapia', health_category: 'Moderate Risk' },
  { ph: 8.4, dissolved_oxygen: 4.7, ammonia: 0.16, temperature: 30.3, species: 'tilapia', health_category: 'Moderate Risk' },
  { ph: 6.6, dissolved_oxygen: 4.0, ammonia: 0.24, temperature: 31.6, species: 'catfish', health_category: 'Moderate Risk' },
  { ph: 8.5, dissolved_oxygen: 4.5, ammonia: 0.18, temperature: 30.8, species: 'shrimp', health_category: 'Moderate Risk' },
  { ph: 5.6, dissolved_oxygen: 2.4, ammonia: 0.62, temperature: 34.1, species: 'tilapia', health_category: 'Critical Risk' },
  { ph: 9.2, dissolved_oxygen: 2.1, ammonia: 0.78, temperature: 34.8, species: 'tilapia', health_category: 'Critical Risk' },
  { ph: 5.8, dissolved_oxygen: 2.7, ammonia: 0.54, temperature: 33.6, species: 'tilapia', health_category: 'Critical Risk' },
  { ph: 9.1, dissolved_oxygen: 2.3, ammonia: 0.68, temperature: 34.2, species: 'shrimp', health_category: 'Critical Risk' },
  { ph: 5.7, dissolved_oxygen: 2.0, ammonia: 0.85, temperature: 35.0, species: 'shrimp', health_category: 'Critical Risk' },
  { ph: 9.3, dissolved_oxygen: 2.5, ammonia: 0.59, temperature: 33.9, species: 'shrimp', health_category: 'Critical Risk' },
  { ph: 5.9, dissolved_oxygen: 3.4, ammonia: 0.38, temperature: 21.5, species: 'salmon', health_category: 'Critical Risk' },
  { ph: 9.0, dissolved_oxygen: 3.1, ammonia: 0.44, temperature: 22.1, species: 'salmon', health_category: 'Critical Risk' },
  { ph: 5.5, dissolved_oxygen: 1.9, ammonia: 0.92, temperature: 35.2, species: 'catfish', health_category: 'Critical Risk' },
  { ph: 9.4, dissolved_oxygen: 2.2, ammonia: 0.74, temperature: 34.5, species: 'catfish', health_category: 'Critical Risk' },
  { ph: 5.7, dissolved_oxygen: 2.5, ammonia: 0.65, temperature: 33.8, species: 'carp', health_category: 'Critical Risk' },
  { ph: 9.2, dissolved_oxygen: 2.3, ammonia: 0.71, temperature: 34.4, species: 'carp', health_category: 'Critical Risk' },
  { ph: 5.8, dissolved_oxygen: 2.6, ammonia: 0.58, temperature: 33.5, species: 'tilapia', health_category: 'Critical Risk' },
  { ph: 9.1, dissolved_oxygen: 2.0, ammonia: 0.82, temperature: 34.9, species: 'tilapia', health_category: 'Critical Risk' },
  { ph: 5.6, dissolved_oxygen: 2.2, ammonia: 0.76, temperature: 20.4, species: 'tilapia', health_category: 'Critical Risk' },
  { ph: 9.3, dissolved_oxygen: 2.4, ammonia: 0.64, temperature: 20.8, species: 'shrimp', health_category: 'Critical Risk' },
  { ph: 5.7, dissolved_oxygen: 2.1, ammonia: 0.88, temperature: 34.7, species: 'shrimp', health_category: 'Critical Risk' },
  { ph: 9.2, dissolved_oxygen: 2.6, ammonia: 0.55, temperature: 33.4, species: 'tilapia', health_category: 'Critical Risk' },
  { ph: 5.9, dissolved_oxygen: 3.2, ammonia: 0.42, temperature: 21.8, species: 'salmon', health_category: 'Critical Risk' },
  { ph: 9.0, dissolved_oxygen: 2.9, ammonia: 0.49, temperature: 22.4, species: 'salmon', health_category: 'Critical Risk' },
  { ph: 5.6, dissolved_oxygen: 2.0, ammonia: 0.84, temperature: 34.6, species: 'catfish', health_category: 'Critical Risk' },
  { ph: 9.3, dissolved_oxygen: 2.3, ammonia: 0.69, temperature: 34.0, species: 'carp', health_category: 'Critical Risk' },
  { ph: 5.8, dissolved_oxygen: 2.5, ammonia: 0.61, temperature: 33.7, species: 'tilapia', health_category: 'Critical Risk' },
  { ph: 9.1, dissolved_oxygen: 2.2, ammonia: 0.75, temperature: 34.3, species: 'shrimp', health_category: 'Critical Risk' },
  { ph: 5.7, dissolved_oxygen: 2.4, ammonia: 0.66, temperature: 33.9, species: 'carp', health_category: 'Critical Risk' },
  { ph: 9.2, dissolved_oxygen: 2.1, ammonia: 0.79, temperature: 34.6, species: 'tilapia', health_category: 'Critical Risk' },
  { ph: 5.5, dissolved_oxygen: 1.8, ammonia: 0.95, temperature: 35.4, species: 'shrimp', health_category: 'Critical Risk' },
  { ph: 9.4, dissolved_oxygen: 2.0, ammonia: 0.86, temperature: 35.1, species: 'tilapia', health_category: 'Critical Risk' },
  { ph: 5.8, dissolved_oxygen: 2.3, ammonia: 0.72, temperature: 34.2, species: 'catfish', health_category: 'Critical Risk' },
  { ph: 9.1, dissolved_oxygen: 2.5, ammonia: 0.60, temperature: 33.6, species: 'carp', health_category: 'Critical Risk' },
];

export const INITIAL_PREDICTION_HISTORY: PredictionRecord[] = [
  {
    id: 'PRED-904',
    pondId: 'pond-03',
    pondName: 'Estuary Raceway C-4',
    speciesName: 'Pangasius Catfish',
    timestamp: '2026-10-26T16:40:00Z',
    dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
    ph: 9.18,
    dissolved_oxygen: 2.25,
    ammonia: 0.74,
    temperature: 34.3,
    predictedCategory: 'Critical Risk',
    confidence: 0.94,
    probabilities: { Healthy: 0.0, 'Moderate Risk': 0.06, 'Critical Risk': 0.94 },
    topContributingParameter: 'Dissolved Oxygen (DO)',
    engineUsed: 'CART Random Forest Classifier (50 Trees, Reference Dataset — Prototype Mode)',
    notes: 'Afternoon thermal stratification + low DO + high unionized ammonia risk.',
  },
  {
    id: 'PRED-903',
    pondId: 'pond-02',
    pondName: 'Biofloc Tank B-2',
    speciesName: 'Pacific White Shrimp',
    timestamp: '2026-10-26T16:38:00Z',
    dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
    ph: 8.62,
    dissolved_oxygen: 4.35,
    ammonia: 0.19,
    temperature: 31.1,
    predictedCategory: 'Moderate Risk',
    confidence: 0.89,
    probabilities: { Healthy: 0.06, 'Moderate Risk': 0.89, 'Critical Risk': 0.05 },
    topContributingParameter: 'Dissolved Oxygen (DO)',
    engineUsed: 'CART Random Forest Classifier (50 Trees, Reference Dataset — Prototype Mode)',
    notes: 'Elevated biofloc microbial respiration drawing down DO.',
  },
  {
    id: 'PRED-902',
    pondId: 'pond-04',
    pondName: 'Coldwater RAS D-1',
    speciesName: 'Atlantic Salmon Smolt',
    timestamp: '2026-10-26T16:36:00Z',
    dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
    ph: 7.32,
    dissolved_oxygen: 8.85,
    ammonia: 0.01,
    temperature: 14.2,
    predictedCategory: 'Healthy',
    confidence: 0.98,
    probabilities: { Healthy: 0.98, 'Moderate Risk': 0.02, 'Critical Risk': 0.0 },
    topContributingParameter: 'Dissolved Oxygen (DO)',
    engineUsed: 'CART Random Forest Classifier (50 Trees, Reference Dataset — Prototype Mode)',
    notes: 'Nominal RAS biofilter nitrification and oxygen cone saturation.',
  },
  {
    id: 'PRED-901',
    pondId: 'pond-01',
    pondName: 'Basin A-1 North',
    speciesName: 'Nile Tilapia',
    timestamp: '2026-10-26T16:35:00Z',
    dataSource: 'DEMO DATA — SIMULATED IOT TELEMETRY',
    ph: 7.55,
    dissolved_oxygen: 6.85,
    ammonia: 0.03,
    temperature: 27.9,
    predictedCategory: 'Healthy',
    confidence: 0.96,
    probabilities: { Healthy: 0.96, 'Moderate Risk': 0.04, 'Critical Risk': 0.0 },
    topContributingParameter: 'Ammonia (TAN)',
    engineUsed: 'CART Random Forest Classifier (50 Trees, Reference Dataset — Prototype Mode)',
    notes: 'Balanced phytoplankton bloom and optimal parameters.',
  },
  {
    id: 'PRED-900',
    pondId: 'pond-05',
    pondName: 'Delta Polyculture E-3',
    speciesName: 'Indian Major Carp (Rohu)',
    timestamp: '2026-10-26T15:12:00Z',
    dataSource: 'MANUAL LAB ENTRY',
    ph: 7.64,
    dissolved_oxygen: 6.62,
    ammonia: 0.03,
    temperature: 27.8,
    predictedCategory: 'Healthy',
    confidence: 0.95,
    probabilities: { Healthy: 0.95, 'Moderate Risk': 0.05, 'Critical Risk': 0.0 },
    topContributingParameter: 'Water pH',
    engineUsed: 'CART Random Forest Classifier (50 Trees, Reference Dataset — Prototype Mode)',
    notes: 'Verified via handheld photometer after telemetry node signal drop.',
  },
];

// Calculate unionized ammonia (NH3) fraction based on Emerson et al. (1975) equation
export function calculateUnionizedAmmonia(
  totalAmmoniaMgL: number,
  ph: number,
  tempC: number
): { nh3MgL: number; nh3Percent: number } {
  const tempK = tempC + 273.15;
  const pKa = 0.09018 + 2729.92 / tempK;
  const fraction = 1 / (Math.pow(10, pKa - ph) + 1);
  const nh3MgL = totalAmmoniaMgL * fraction;
  return {
    nh3MgL: Number(nh3MgL.toFixed(4)),
    nh3Percent: Number((fraction * 100).toFixed(2)),
  };
}
