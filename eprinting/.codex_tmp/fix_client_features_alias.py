import os
import mlflow
import pandas as pd
from mlflow.pyfunc import PythonModel
from mlflow.tracking import MlflowClient

TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow-server:5000")
MODEL_NAME = "ClientFeatures"
ALIAS = "production"
CSV_PATH = "/tmp/client_features.csv"

class ClientFeaturesLookupModel(PythonModel):
    def load_context(self, context):
        self.df = pd.read_csv(context.artifacts["client_features_csv"])
        self.df["_siren_norm"] = self.df["siren"].astype(str).str.strip().str.upper()

    def predict(self, context, model_input):
        if not isinstance(model_input, pd.DataFrame) or "siren" not in model_input.columns or model_input.empty:
            return pd.DataFrame()
        siren = str(model_input.iloc[0]["siren"]).strip().upper()
        row = self.df[self.df["_siren_norm"] == siren]
        if row.empty:
            return pd.DataFrame()
        out = row.drop(columns=["_siren_norm"]).copy()
        return out.reset_index(drop=True)

if not os.path.exists(CSV_PATH):
    raise FileNotFoundError(f"Missing CSV at {CSV_PATH}")

mlflow.set_tracking_uri(TRACKING_URI)
client = MlflowClient()

with mlflow.start_run(run_name="client-features-hotfix-path-separator") as run:
    mlflow.pyfunc.log_model(
        artifact_path="client_features_model",
        python_model=ClientFeaturesLookupModel(),
        artifacts={"client_features_csv": CSV_PATH},
        input_example=pd.DataFrame({"siren": ["SAV"]}),
    )
    run_id = run.info.run_id

model_uri = f"runs:/{run_id}/client_features_model"
registered = mlflow.register_model(model_uri=model_uri, name=MODEL_NAME)
version = registered.version

client.set_model_version_tag(MODEL_NAME, version, "hotfix_reason", "portable_artifact_path_linux")
client.set_model_version_tag(MODEL_NAME, version, "lifecycle_status", "production")
client.set_model_version_tag(MODEL_NAME, version, "deployment_date", pd.Timestamp.utcnow().isoformat())
client.set_registered_model_alias(MODEL_NAME, ALIAS, version)

print(f"OK: registered {MODEL_NAME} v{version} from run {run_id} and set alias '{ALIAS}'")
