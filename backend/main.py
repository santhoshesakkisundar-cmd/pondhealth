"""
PondHealth AI — FastAPI Prediction & Water-Quality Intelligence Backend
=======================================================================
Exposes REST API endpoints for running the trained scikit-learn Random Forest
Classifier, inspecting feature contributions, validating species-specific
water-quality thresholds, and persisting prediction history.

Run with:
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.train_model import FEATURE_COLUMNS, train_and_evaluate

ARTIFACT_DIR = Path("backend/artifacts")
MODEL_PATH = ARTIFACT_DIR / "pond_rf_model.joblib"
META_PATH = ARTIFACT_DIR / "model_metadata.json"
DEFAULT_DATASET = Path("backend/dataset/pond_water_quality_sample.csv")

app = FastAPI(
    title="PondHealth AI Prediction Service",
    description="Aquaculture Pond Health Random Forest Classifier API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictionInput(BaseModel):
    pond_id: str = Field(default="pond-01", description="Target pond identifier")
    pond_name: str = Field(default="Pond A-1 (Nile Tilapia)", description="Pond display name")
    species: str = Field(default="tilapia", description="Aquaculture species key")
    ph: float = Field(..., ge=0.0, le=14.0, description="Water pH (0 - 14)")
    dissolved_oxygen: float = Field(..., ge=0.0, le=25.0, description="Dissolved Oxygen in mg/L")
    ammonia: float = Field(..., ge=0.0, le=10.0, description="Total Ammonia Nitrogen in mg/L")
    temperature: float = Field(..., ge=0.0, le=45.0, description="Water temperature in °C")
    source: str = Field(default="MANUAL_LAB_ENTRY", description="Data origin label")


def ensure_model_loaded():
    if not MODEL_PATH.exists() or not META_PATH.exists():
        if DEFAULT_DATASET.exists():
            train_and_evaluate(DEFAULT_DATASET, ARTIFACT_DIR)
        else:
            return None, None
    clf = joblib.load(MODEL_PATH)
    meta = json.loads(META_PATH.read_text())
    return clf, meta


@app.get("/api/health")
def health_check():
    clf, meta = ensure_model_loaded()
    return {
        "status": "ok",
        "engine": "fastapi-sklearn" if clf is not None else "prototype-fallback",
        "model_loaded": clf is not None,
        "trained_at": meta.get("trained_at") if meta else None,
    }


@app.get("/api/model-info")
def get_model_info():
    clf, meta = ensure_model_loaded()
    if not meta:
        raise HTTPException(status_code=404, detail="Model metadata not found.")
    return meta


@app.post("/api/predict")
def predict_pond_health(payload: PredictionInput):
    clf, meta = ensure_model_loaded()
    if clf is None or meta is None:
        raise HTTPException(status_code=503, detail="Trained scikit-learn model unavailable.")

    X_input = pd.DataFrame(
        [[payload.ph, payload.dissolved_oxygen, payload.ammonia, payload.temperature]],
        columns=FEATURE_COLUMNS,
    )
    pred_class = str(clf.predict(X_input)[0])
    proba_arr = clf.predict_proba(X_input)[0]
    class_labels = list(clf.classes_)

    probabilities = {
        label: round(float(prob), 4) for label, prob in zip(class_labels, proba_arr)
    }
    confidence = round(float(np.max(proba_arr)), 4)

    return {
        "predicted_category": pred_class,
        "confidence": confidence,
        "probabilities": probabilities,
        "feature_importances": meta.get("feature_importances", {}),
        "engine": "Python FastAPI + scikit-learn RandomForestClassifier",
        "is_prototype_dataset": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
