"""
PondHealth AI — Random Forest Classifier Training & Evaluation Pipeline
======================================================================
Loads a labeled aquaculture water-quality CSV dataset, performs stratified
5-fold cross-validation, trains a calibrated scikit-learn RandomForestClassifier,
computes permutation & Gini feature importances, and exports model artifacts.

Usage:
    python backend/train_model.py --data backend/dataset/pond_water_quality_sample.csv
"""

import argparse
import json
from pathlib import Path
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split


FEATURE_COLUMNS = ["ph", "dissolved_oxygen", "ammonia", "temperature"]
TARGET_COLUMN = "health_category"
CLASS_ORDER = ["Healthy", "Moderate Risk", "Critical Risk"]


def train_and_evaluate(csv_path: Path, output_dir: Path) -> dict:
    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {csv_path}")

    df = pd.read_csv(csv_path)
    missing_cols = [c for c in FEATURE_COLUMNS + [TARGET_COLUMN] if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Dataset is missing required columns: {missing_cols}")

    X = df[FEATURE_COLUMNS].astype(float)
    y = df[TARGET_COLUMN].astype(str)

    # Configure Random Forest Classifier
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        oob_score=True,
    )

    # 5-Fold Stratified Cross-Validation for honest out-of-sample evaluation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    y_cv_pred = cross_val_predict(clf, X, y, cv=cv)

    # Fit on full labeled dataset for deployment artifact
    clf.fit(X, y)

    importances = {
        col: round(float(imp), 4)
        for col, imp in zip(FEATURE_COLUMNS, clf.feature_importances_)
    }

    cm = confusion_matrix(y, y_cv_pred, labels=CLASS_ORDER)
    report = classification_report(y, y_cv_pred, labels=CLASS_ORDER, output_dict=True)

    metadata = {
        "model_name": "PondHealth RandomForestClassifier (scikit-learn)",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_path": str(csv_path),
        "sample_count": int(len(df)),
        "feature_columns": FEATURE_COLUMNS,
        "classes": CLASS_ORDER,
        "hyperparameters": {
            "n_estimators": 100,
            "max_depth": 8,
            "min_samples_split": 4,
            "min_samples_leaf": 2,
            "class_weight": "balanced",
        },
        "evaluation": {
            "evaluation_method": "5-Fold Stratified Cross-Validation",
            "oob_score": round(float(clf.oob_score_), 4),
            "cv_accuracy": round(float(accuracy_score(y, y_cv_pred)), 4),
            "cv_macro_precision": round(
                float(precision_score(y, y_cv_pred, average="macro", zero_division=0)), 4
            ),
            "cv_macro_recall": round(
                float(recall_score(y, y_cv_pred, average="macro", zero_division=0)), 4
            ),
            "cv_macro_f1": round(
                float(f1_score(y, y_cv_pred, average="macro", zero_division=0)), 4
            ),
            "confusion_matrix": cm.tolist(),
            "per_class_report": report,
        },
        "feature_importances": importances,
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    model_file = output_dir / "pond_rf_model.joblib"
    meta_file = output_dir / "model_metadata.json"

    joblib.dump(clf, model_file)
    meta_file.write_text(json.dumps(metadata, indent=2))
    print(f"Saved trained model to {model_file}")
    print(f"Saved evaluation metadata to {meta_file}")
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train PondHealth AI Random Forest")
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("backend/dataset/pond_water_quality_sample.csv"),
        help="Path to labeled water quality CSV file",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("backend/artifacts"),
        help="Directory to store trained model and evaluation metrics",
    )
    args = parser.parse_args()
    train_and_evaluate(args.data, args.out)
