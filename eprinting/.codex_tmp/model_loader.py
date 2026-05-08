import json
import logging
import tempfile
from pathlib import Path
from typing import Dict, Optional, Any

import mlflow
import mlflow.artifacts
import mlflow.pyfunc
import pandas as pd
from mlflow.tracking import MlflowClient
import yaml

from pricing__epac.src.config.settings import settings

logger = logging.getLogger(__name__)


class ModelLoader:
    """
    Model loader that fetches models fresh from MLflow on each request.
    No caching - always gets the latest production version.
    """

    def __init__(self):
        """Initialize MLflow client without blocking on remote checks."""
        logger.info(f"Initializing ModelLoader with MLflow URI: {settings.MLFLOW_TRACKING_URI}")
        mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)

        try:
            self.client = MlflowClient()
            logger.info("MLflow client created successfully")
        except Exception as e:
            logger.error(f"Failed to create MLflow client: {e}")
            self.client = None

    def get_production_model_info(self, model_name: str) -> Optional[Dict]:
        """
        Retrieves the production model directly from MLflow at request time.
        No caching - always fetches fresh from MLflow.

        Args:
            model_name: Name of the model to load

        Returns:
            Model info dictionary or None if not found
        """
        if not self.client:
            logger.error("MLflow client not initialized")
            return None

        try:
            logger.info(f"Loading model '{model_name}' with alias '{settings.ALIAS_PRODUCTION}' from MLflow...")

            try:
                model_version = self.client.get_model_version_by_alias(
                    model_name, settings.ALIAS_PRODUCTION
                )

                if not model_version:
                    logger.warning(f"No production alias found for {model_name}")
                    versions = self.client.search_model_versions(f"name='{model_name}'")
                    if versions:
                        logger.info(f"Available versions for {model_name}:")
                        for version in versions:
                            aliases = version.aliases if hasattr(version, "aliases") else []
                            logger.info(f"   v{version.version} - aliases: {aliases}")
                    return None

            except Exception as e:
                logger.error(f"Error getting model version by alias: {e}")
                return None

            logger.info(
                f"Found {model_name} v{model_version.version} with alias '{settings.ALIAS_PRODUCTION}'"
            )

            model_uri = f"models:/{model_name}@{settings.ALIAS_PRODUCTION}"
            logger.info(f"Loading model from: {model_uri}")

            try:
                model = mlflow.pyfunc.load_model(model_uri)
                logger.info("Model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load model from {model_uri}: {e}")
                return None

            version_info = self.client.get_model_version(model_name, model_version.version)
            logger.info(f"Run ID: {version_info.run_id}")

            tags = version_info.tags if hasattr(version_info, "tags") else {}
            logger.info(f"Tags found: {list(tags.keys()) if tags else 'None'}")

            metadata = {}
            if "metadata" in tags:
                try:
                    metadata = json.loads(tags["metadata"])
                    logger.info(f"Metadata found with keys: {list(metadata.keys())}")
                except Exception as e:
                    logger.warning(f"Could not parse metadata: {e}")

            metrics = self._extract_metrics(tags, metadata, model_name)
            formula = self._extract_formula(tags, metadata)
            feature_importance = self._extract_feature_importance(tags, metadata)
            shap_available = self._extract_shap_success(tags)

            return {
                "name": model_name,
                "version": int(model_version.version),
                "alias": settings.ALIAS_PRODUCTION,
                "model": model,
                "run_id": version_info.run_id,
                "tags": tags,
                "metadata": metadata,
                "description": getattr(version_info, "description", ""),
                "metrics": metrics,
                "formula": formula,
                "feature_importance": feature_importance,
                "shap_available": shap_available,
            }

        except Exception as e:
            logger.error(f"Unexpected error loading model {model_name}: {e}", exc_info=True)
            return None

    def get_family_model(self, binding_type: str, model_type: str) -> Optional[Dict]:
        safe = self._sanitize_name(binding_type)
        model_name = f"PricingModel_{safe}_{model_type}"
        return self.get_production_model_info(model_name)

    def get_couple_model(self, binding_type: str, siren: str, model_type: str) -> Optional[Dict]:
        safe_binding = self._sanitize_name(binding_type)
        safe_siren = self._sanitize_name(siren)
        model_name = f"PricingModel_{safe_binding}__{safe_siren}_{model_type}"
        return self.get_production_model_info(model_name)

    def get_client_features_data(self, siren: str) -> Optional[Dict]:
        normalized_siren = str(siren).strip()
        try:
            model_info = self.get_production_model_info(settings.MODEL_NAME_CLIENT_FEATURES)
            if model_info:
                client_model = model_info["model"]
                extracted = self._extract_client_features_from_pyfunc(client_model, normalized_siren)
                if extracted:
                    return extracted

            logger.warning(
                "Primary client features lookup failed for siren=%s. Trying artifact-based fallback.",
                normalized_siren,
            )
            return self._load_client_features_from_artifacts(normalized_siren)
        except Exception as e:
            logger.error(f"Error getting client features for siren {siren}: {e}")
            return None

    def _extract_client_features_from_pyfunc(self, client_model: Any, siren: str) -> Optional[Dict]:
        if hasattr(client_model, "get_client_features"):
            result = client_model.get_client_features(siren)
            if isinstance(result, dict) and result:
                return result
            return None

        result = client_model.predict(pd.DataFrame({"siren": [siren]}))
        if isinstance(result, pd.DataFrame) and not result.empty:
            first = result.iloc[0].to_dict()
            if str(first.get("found", "true")).lower() == "false":
                return None
            return first
        if isinstance(result, dict):
            if str(result.get("found", "true")).lower() == "false":
                return None
            return result
        if isinstance(result, list) and result:
            first = result[0]
            if isinstance(first, dict) and str(first.get("found", "true")).lower() == "false":
                return None
            return first
        return None

    def _load_client_features_from_artifacts(self, siren: str) -> Optional[Dict]:
        model_uri = f"models:/{settings.MODEL_NAME_CLIENT_FEATURES}@{settings.ALIAS_PRODUCTION}"

        try:
            with tempfile.TemporaryDirectory() as tmp_dir:
                model_dir = Path(
                    mlflow.artifacts.download_artifacts(
                        artifact_uri=model_uri,
                        dst_path=tmp_dir,
                    )
                )
                csv_path = self._resolve_client_features_csv_path(model_dir)
                if not csv_path:
                    logger.warning("Unable to resolve client_features.csv from model artifacts: %s", model_uri)
                    return None

                df = pd.read_csv(csv_path)
                if "siren" not in df.columns:
                    logger.warning("Artifact CSV has no 'siren' column: %s", csv_path)
                    return None

                normalized = df["siren"].astype(str).str.strip().str.upper()
                row = df[normalized == siren.upper()]
                if row.empty:
                    return None

                return row.iloc[0].to_dict()
        except Exception as e:
            logger.error("Artifact-based fallback failed for siren %s: %s", siren, e)
            return None

    def _resolve_client_features_csv_path(self, model_dir: Path) -> Optional[Path]:
        mlmodel_path = model_dir / "MLmodel"
        if mlmodel_path.exists():
            try:
                with mlmodel_path.open("r", encoding="utf-8") as fh:
                    content = yaml.safe_load(fh) or {}
                artifacts = (
                    content.get("flavors", {})
                    .get("python_function", {})
                    .get("artifacts", {})
                )
            except Exception as e:
                logger.warning("Failed to parse MLmodel at %s: %s", mlmodel_path, e)
                artifacts = {}

            preferred_keys = ("features_csv", "client_features_csv")
            for key in preferred_keys:
                artifact_spec = artifacts.get(key)
                resolved = self._resolve_artifact_path(model_dir, artifact_spec)
                if resolved:
                    return resolved

            for artifact_spec in artifacts.values():
                resolved = self._resolve_artifact_path(model_dir, artifact_spec)
                if resolved and resolved.name == "client_features.csv":
                    return resolved

        found = list(model_dir.rglob("client_features.csv"))
        if found:
            return found[0]
        return None

    def _resolve_artifact_path(self, model_dir: Path, artifact_spec: Any) -> Optional[Path]:
        if not isinstance(artifact_spec, dict):
            return None
        raw_path = artifact_spec.get("path")
        if not raw_path:
            return None

        raw = str(raw_path)
        candidates = [raw, raw.replace("\\", "/")]

        # If separators were serialized in a Windows-style string, ensure basename fallback works on Linux.
        basename = raw.replace("\\", "/").split("/")[-1]
        if basename:
            candidates.append(f"artifacts/{basename}")
            candidates.append(basename)

        for candidate in candidates:
            candidate_path = model_dir / candidate
            if candidate_path.exists():
                return candidate_path

        return None

    def check_mlflow_connection(self) -> bool:
        """Check if MLflow tracking server is accessible."""
        try:
            if not self.client:
                return False
            self.client.search_experiments(max_results=1)
            return True
        except Exception:
            return False

    def _extract_metrics(self, tags: Dict, metadata: Dict, model_name: str) -> Dict:
        metrics = {}
        r2_keys = ["r2_test", "r2", "test_r2", "cv_r2", "performance_r2", "r2_score", "R2", "RÂ²", "r2_train"]
        found_r2 = False

        for key in r2_keys:
            if key in tags:
                try:
                    metrics["r2"] = float(tags[key])
                    logger.info(f"Found R2={metrics['r2']} from tag '{key}' for {model_name}")
                    found_r2 = True
                    break
                except (ValueError, TypeError):
                    continue

        if not found_r2 and metadata:
            for key in r2_keys:
                if key in metadata:
                    try:
                        metrics["r2"] = float(metadata[key])
                        logger.info(f"Found R2={metrics['r2']} from metadata.{key} for {model_name}")
                        break
                    except (ValueError, TypeError):
                        continue

        for key, value in tags.items():
            if key.startswith("performance_"):
                metric_name = key.replace("performance_", "")
                try:
                    metrics[metric_name] = float(value)
                except (ValueError, TypeError):
                    continue
            elif key in ["rmse", "mae", "mape", "cv_r2"] and key not in metrics:
                try:
                    metrics[key] = float(value)
                except (ValueError, TypeError):
                    continue

        return metrics

    def _extract_formula(self, tags: Dict, metadata: Dict) -> Optional[str]:
        if settings.TAG_FORMULA in tags:
            return tags[settings.TAG_FORMULA]
        if metadata and "formula" in metadata:
            return metadata["formula"]
        return None

    def _extract_feature_importance(self, tags: Dict, metadata: Dict) -> Dict:
        if settings.TAG_FEATURE_IMPORTANCE in tags:
            try:
                return json.loads(tags[settings.TAG_FEATURE_IMPORTANCE])
            except Exception:
                pass
        if metadata and "feature_importance" in metadata:
            return metadata["feature_importance"]
        return {}

    def _extract_shap_success(self, tags: Dict) -> bool:
        return tags.get(settings.TAG_SHAP_SUCCESS, "false").lower() == "true"

    @staticmethod
    def _sanitize_name(name: str) -> str:
        import re

        return re.sub(r"[^a-zA-Z0-9_]", "_", name)
