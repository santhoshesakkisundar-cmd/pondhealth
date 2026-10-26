# PondHealth AI — Aquaculture Water Quality & Pond Health Intelligence Platform

PondHealth AI is an intelligent aquaculture pond-health prediction and water-quality monitoring platform powered by a **Random Forest Classifier**, species-specific hydro-chemical reference thresholds, IoT telemetry integration, and **AquaSense AI** explainability.

## Core Capabilities

1. **Main Command Center**: Real-time overview of monitored aquaculture basins, latest pH, Dissolved Oxygen (DO), Total Ammonia Nitrogen (TAN + derived unionized $\text{NH}_3$), Water Temperature, AI-predicted Pond Health Category (`Healthy`, `Moderate Risk`, `Critical Risk`), model confidence, active alerts, and 24-hour trends.
2. **AI Pond Health Prediction Laboratory**:
   - Interactive input validation for pH, Dissolved Oxygen, Ammonia concentration, and Water Temperature.
   - Executes a trained CART Random Forest Classifier (50 decision trees) with tree-vote breakdown, class probability distribution, global Gini feature importances, and local counterfactual parameter attribution.
   - Supports live model retraining and custom labeled CSV dataset upload directly in the UI.
3. **Water Quality Intelligence**:
   - Species-specific reference thresholds for **Nile Tilapia**, **Pacific White Shrimp**, **Atlantic Salmon Smolt**, **Pangasius Catfish**, and **Indian Major Carp (Rohu)**.
   - Configurable optimal and critical thresholds per species.
   - Explicit provenance tracking distinguishing `DEMO DATA — SIMULATED IOT TELEMETRY`, `MANUAL LAB ENTRY`, and `CALIBRATION CHECK`.
4. **AquaSense AI Explainability Assistant**:
   - Server-side integration with `@google/genai` (`gemini-3.8-flash`) plus a deterministic **Rule-Based & Tree-Attribution Fallback Engine** when no LLM API key is configured.
   - Explains why a pond received its predicted health category, which parameters breach configured limits, how pH and temperature govern toxic unionized $\text{NH}_3$ equilibrium, which measurements to re-verify, and practical management steps.
5. **IoT Sensor Network & Hardware Gateway**:
   - Sensor node status, battery/RSSI telemetry, calibration schedules, stale packet warnings, and MQTT / REST API integration specifications.
6. **Advanced Analytics, UN SDG 2/6/14 Alignment & Diagnostic Reports**:
   - 5-Fold Stratified Cross-Validation confusion matrix and per-class Precision, Recall, and F1 metrics calculated from the labeled dataset.
   - Sortable and filterable prediction history ledger with 1-click CSV export, JSON report export, and printable PDF reports.

## Project Structure

```text
├── backend/
│   ├── dataset/
│   │   └── pond_water_quality_sample.csv   # Labeled reference aquaculture dataset
│   ├── main.py                             # Standalone Python FastAPI + scikit-learn service
│   ├── train_model.py                      # scikit-learn RandomForestClassifier training & 5-fold CV
│   └── requirements.txt                    # Python ML dependencies
├── src/
│   ├── components/
│   │   ├── PredictionLabView.tsx           # AI Prediction Lab & Custom CSV Retraining UI
│   │   ├── WaterQualityView.tsx            # Water Quality Intelligence & IoT Sensor Network
│   │   ├── AquaSenseAndAlertsView.tsx      # AquaSense AI Explainability & Smart Alerts
│   │   └── AnalyticsAndSdgView.tsx         # Cross-Basin Analytics, SDG 2/6/14 & Reports
│   ├── data/
│   │   └── aquacultureConfig.ts            # Species profiles, reference dataset & initial ponds
│   ├── ml/
│   │   └── randomForestEngine.ts           # In-process CART Random Forest Classifier & CV engine
│   ├── App.tsx                             # Main Command Center & workspace navigation
│   └── index.css                           # Oceanic Indigo-Teal theme & typography
└── server.ts                               # Full-stack Express + Random Forest + Gemini API server
```

## Setup & Running Instructions

### 1. Full-Stack Web Application (Node.js + Express + Vite)

```bash
npm install
npm run dev
```

The application runs on `http://localhost:3000`.

### 2. Standalone Python FastAPI + scikit-learn Pipeline (Optional)

```bash
pip install -r backend/requirements.txt
python backend/train_model.py --data backend/dataset/pond_water_quality_sample.csv
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
