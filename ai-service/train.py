"""
StreetIntel AI — Kaggle Pothole Dataset Fine-Tuning Script
=========================================================
Downloads a pothole detection dataset from Kaggle and fine-tunes
the YOLOv8 model on it to improve accuracy.

Uses the Kaggle HTTP API directly — no kaggle Python package needed.

Prerequisites:
    pip install ultralytics huggingface_hub requests tqdm

Setup — ONE of the following:
    Option A (Recommended): Set env var before running:
        Windows CMD:   set KAGGLE_API_TOKEN=KGAT_xxxx
        PowerShell:    $env:KAGGLE_API_TOKEN="KGAT_xxxx"

    Option B: Pass token on command line:
        python train.py --token KGAT_xxxx

    Option C: Place kaggle.json at C:\\Users\\Name\\.kaggle\\kaggle.json
        Format for new tokens:  {"token":"KGAT_xxxx"}
        Format for old tokens:  {"username":"x","key":"x"}

Usage:
    python train.py --token KGAT_2e026db6c33f419807a91ce4bfb8a3e7
    python train.py --epochs 20 --batch 4          # CPU-optimized
    python train.py --skip-download --resume        # Resume training
"""

import argparse
import json
import os
import shutil
import sys
import zipfile
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR     = Path(__file__).parent
MODELS_DIR   = BASE_DIR / "models"
DATA_DIR     = BASE_DIR / "training_data"
YAML_PATH    = BASE_DIR / "dataset.yaml"
OUTPUT_MODEL = MODELS_DIR / "pothole_finetuned.pt"

# ── Kaggle datasets to try (YOLO-annotated, pre-split train/val/test) ─────────
# These are public datasets with bounding-box annotations in YOLO format.
KAGGLE_DATASETS = [
    ("farzadnekouei", "pothole-image-based-detection-dataset"),
    ("sovitrath",     "road-pothole-images-for-pothole-detection"),
    ("chitholian",    "annotated-potholes-dataset"),
]

# ── Training config ──────────────────────────────────────────────────────────
TRAIN_EPOCHS   = int(os.getenv("TRAIN_EPOCHS",   "20"))   # 20 = ~1-2 hrs CPU
TRAIN_IMG_SIZE = int(os.getenv("TRAIN_IMG_SIZE", "640"))
TRAIN_BATCH    = int(os.getenv("TRAIN_BATCH",    "4"))     # 4 for CPU
TRAIN_WORKERS  = int(os.getenv("TRAIN_WORKERS",  "0"))     # 0 = no multiprocessing (Windows)


# ────────────────────────────────────── DOWNLOAD ──────────────────────────────

def _get_token(cli_token: str = None) -> str:
    """Resolve Kaggle API token with fallback chain."""
    # 1. CLI arg
    if cli_token:
        return cli_token

    # 2. Environment variable
    token = os.getenv("KAGGLE_API_TOKEN") or os.getenv("KAGGLE_KEY")
    if token:
        return token

    # 3. kaggle.json
    kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
    if kaggle_json.exists():
        try:
            creds = json.loads(kaggle_json.read_text(encoding="utf-8"))
            # New token format: {"token":"KGAT_xxxx"}
            if "token" in creds:
                return creds["token"]
            # Old format: {"username":"xx","key":"xx"} → reconstruct as Basic auth handled separately
            if "key" in creds:
                return creds.get("key", "")
        except Exception:
            pass

    return ""


def _kaggle_download(token: str, owner: str, dataset: str, dest_dir: Path) -> Path:
    """
    Download a Kaggle dataset as a zip file using the HTTP API.
    Returns the path to the downloaded zip.
    """
    import requests
    from requests.auth import HTTPBasicAuth

    dest_dir.mkdir(parents=True, exist_ok=True)
    zip_path = dest_dir / f"{dataset}.zip"

    if zip_path.exists():
        print(f"[Train] Found cached download: {zip_path}")
        return zip_path

    # Kaggle dataset download URL (v1 API)
    url = f"https://www.kaggle.com/api/v1/datasets/download/{owner}/{dataset}"

    print(f"[Train] Downloading: {owner}/{dataset}")
    print(f"[Train] From: {url}")

    # Try the new KGAT token as Bearer auth first, then Basic auth as fallback
    session = requests.Session()
    session.headers["Accept"] = "application/zip"

    if token.startswith("KGAT_"):
        # New OAuth bearer token
        session.headers["Authorization"] = f"Bearer {token}"
        auth = None
    else:
        # Legacy: use as the API key with username from kaggle.json
        kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
        username = ""
        if kaggle_json.exists():
            try:
                creds = json.loads(kaggle_json.read_text(encoding="utf-8"))
                username = creds.get("username", "")
            except Exception:
                pass
        auth = HTTPBasicAuth(username, token)

    # Stream download with progress
    try:
        resp = session.get(url, auth=auth, stream=True, timeout=120)
    except Exception as e:
        raise RuntimeError(f"Network error: {e}")

    if resp.status_code == 401:
        raise RuntimeError("Auth failed (401) — check your KAGGLE_API_TOKEN")
    if resp.status_code == 403:
        raise RuntimeError("Access denied (403) — you may need to accept dataset rules on Kaggle")
    if resp.status_code == 404:
        raise RuntimeError(f"Dataset not found (404): {owner}/{dataset}")
    if resp.status_code != 200:
        raise RuntimeError(f"Download failed ({resp.status_code}): {resp.text[:200]}")

    # Save to disk with tqdm progress bar
    try:
        from tqdm import tqdm
        total = int(resp.headers.get("content-length", 0))
        with open(zip_path, "wb") as f, tqdm(total=total, unit="B", unit_scale=True, desc=dataset) as pbar:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
                pbar.update(len(chunk))
    except ImportError:
        print("[Train] (Install tqdm for a progress bar — pip install tqdm)")
        with open(zip_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)

    size_mb = zip_path.stat().st_size / 1_048_576
    print(f"[Train] ✅ Downloaded {size_mb:.1f} MB → {zip_path}")
    return zip_path


def download_dataset(token: str) -> Path:
    """Try each Kaggle dataset in turn until one downloads successfully."""
    for owner, dataset in KAGGLE_DATASETS:
        try:
            return _kaggle_download(token, owner, dataset, DATA_DIR)
        except RuntimeError as e:
            print(f"[Train] ⚠ {owner}/{dataset} failed: {e}")

    print("\n[Train] ❌ All dataset downloads failed.")
    print("         Check your KAGGLE_API_TOKEN and internet connection.")
    sys.exit(1)


# ────────────────────────────────────── PREPARE ───────────────────────────────

def extract_dataset(zip_path: Path) -> Path:
    """Extract zip and return the extracted folder."""
    extract_dir = DATA_DIR / "extracted"
    if extract_dir.exists() and any(extract_dir.iterdir()):
        print(f"[Train] Using existing extracted data: {extract_dir}")
        return extract_dir

    extract_dir.mkdir(exist_ok=True)
    print(f"[Train] Extracting {zip_path.name}...")
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(extract_dir)
    contents = list(extract_dir.iterdir())
    print(f"[Train] Extracted {len(contents)} items → {extract_dir}")
    return extract_dir


def _find_images(root: Path) -> list:
    """Return list of all image paths under root."""
    exts = {".jpg", ".jpeg", ".png"}
    return [p for p in root.rglob("*") if p.suffix.lower() in exts]


def build_dataset_yaml(extract_dir: Path) -> Path:
    """Find/create dataset.yaml for YOLO training."""
    if YAML_PATH.exists():
        print(f"[Train] Using existing: {YAML_PATH}")
        return YAML_PATH

    # Try to use the dataset's own YAML
    yamls = list(extract_dir.rglob("*.yaml")) + list(extract_dir.rglob("*.yml"))
    yamls = [y for y in yamls if "data" in y.name.lower() or "dataset" in y.name.lower() or y.parent.name in ("", ".")]
    if not yamls:
        yamls = list(extract_dir.rglob("*.yaml"))

    if yamls:
        src_yaml = yamls[0]
        print(f"[Train] Found dataset YAML: {src_yaml}")
        # Read and fix paths to be absolute
        content = src_yaml.read_text(encoding="utf-8")
        # If it has a 'path:' line, update it to our extracted dir
        lines = content.splitlines()
        new_lines = []
        has_path_line = any(l.strip().startswith("path:") for l in lines)
        for line in lines:
            if line.strip().startswith("path:"):
                new_lines.append(f"path: {extract_dir.as_posix()}")
            else:
                new_lines.append(line)
        if not has_path_line:
            new_lines = [f"path: {extract_dir.as_posix()}"] + new_lines
        YAML_PATH.write_text("\n".join(new_lines), encoding="utf-8")
        print(f"[Train] ✅ Dataset YAML saved: {YAML_PATH}")
        return YAML_PATH

    # Auto-detect train/val directories
    train_imgs = next((p for p in [
        extract_dir / "train" / "images",
        extract_dir / "images" / "train",
        extract_dir / "train",
    ] if p.exists()), None)

    val_imgs = next((p for p in [
        extract_dir / "valid" / "images",
        extract_dir / "val" / "images",
        extract_dir / "images" / "val",
        extract_dir / "valid",
        extract_dir / "val",
    ] if p.exists()), train_imgs)  # fallback to train

    if not train_imgs:
        # use the whole extracted dir as training data
        train_imgs = extract_dir
        val_imgs   = extract_dir

    yaml_content = f"""# StreetIntel Pothole Detection Dataset
path: {extract_dir.as_posix()}
train: {train_imgs.as_posix()}
val:   {val_imgs.as_posix()}

nc: 1
names:
  0: pothole
"""
    YAML_PATH.write_text(yaml_content, encoding="utf-8")
    print(f"[Train] ✅ Auto-generated dataset YAML: {YAML_PATH}")
    return YAML_PATH


# ────────────────────────────────────── TRAIN ─────────────────────────────────

def get_base_model() -> str:
    """Return path to the best available base model for fine-tuning."""
    # Already trained? Continue from it.
    if OUTPUT_MODEL.exists():
        print(f"[Train] Continuing from existing trained model: {OUTPUT_MODEL}")
        return str(OUTPUT_MODEL)

    # HuggingFace cache
    import glob as _glob
    hf_pattern = str(Path.home() / ".cache" / "huggingface" / "hub" /
                     "models--Harisanth--Pothole-Finetuned-YOLOv8" / "**" / "best.pt")
    cached = _glob.glob(hf_pattern, recursive=True)
    if cached:
        print(f"[Train] Using cached HF model: {cached[0]}")
        return cached[0]

    # Download from HuggingFace
    print("[Train] Downloading base pothole model from HuggingFace (~22 MB)...")
    try:
        from huggingface_hub import hf_hub_download
        path = hf_hub_download(repo_id="Harisanth/Pothole-Finetuned-YOLOv8", filename="best.pt")
        print(f"[Train] ✅ Base model ready: {path}")
        return path
    except Exception as e:
        print(f"[Train] ⚠ HF download failed ({e}) — using yolov8n.pt (COCO fallback)")
        return "yolov8n.pt"


def run_training(resume: bool = False, epochs: int = None, batch: int = None):
    """Run YOLO fine-tuning."""
    from ultralytics import YOLO

    _epochs = epochs or TRAIN_EPOCHS
    _batch  = batch  or TRAIN_BATCH

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    base_model = get_base_model()

    print(f"\n{'='*60}")
    print(f"  StreetIntel — Pothole Detection Fine-Tuning")
    print(f"{'='*60}")
    print(f"  Base model : {base_model}")
    print(f"  Data YAML  : {YAML_PATH}")
    print(f"  Epochs     : {_epochs}  (early stop at patience=10)")
    print(f"  Batch size : {_batch}")
    print(f"  Device     : {'GPU' if _has_gpu() else 'CPU (slow but works)'}")
    print(f"  Output     : {OUTPUT_MODEL}")
    print(f"{'='*60}\n")

    model   = YOLO(base_model)
    results = model.train(
        data       = str(YAML_PATH),
        epochs     = _epochs,
        imgsz      = TRAIN_IMG_SIZE,
        batch      = _batch,
        workers    = TRAIN_WORKERS,
        project    = str(MODELS_DIR / "runs"),
        name       = "pothole_finetune",
        exist_ok   = True,
        resume     = resume,
        device     = "0" if _has_gpu() else "cpu",
        patience   = 10,
        save       = True,
        verbose    = True,
        # Augmentation
        hsv_h=0.015, hsv_s=0.7, hsv_v=0.4,
        flipud=0.1,  fliplr=0.5,
        mosaic=1.0,  mixup=0.05,
    )

    best_weights = MODELS_DIR / "runs" / "pothole_finetune" / "weights" / "best.pt"
    if best_weights.exists():
        shutil.copy(best_weights, OUTPUT_MODEL)
        metrics = results.results_dict
        map50   = metrics.get("metrics/mAP50(B)", 0)
        print(f"\n{'='*60}")
        print(f"  ✅ Training Complete!")
        print(f"  mAP50  : {map50:.4f}")
        print(f"  Saved  : {OUTPUT_MODEL}")
        print(f"  Restart AI service to load the new model.")
        print(f"{'='*60}\n")
    else:
        print(f"[Train] ⚠ Could not find best.pt at {best_weights}")

    return results


def _has_gpu() -> bool:
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False


# ────────────────────────────────────── MAIN ──────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Fine-tune YOLOv8 on Kaggle pothole dataset",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python train.py --token KGAT_xxxxxxxxxxxx
  python train.py --token KGAT_xxxx --epochs 20 --batch 4
  python train.py --skip-download   (if already downloaded)
  python train.py --resume          (continue interrupted training)
        """
    )
    parser.add_argument("--token",         help="Kaggle API token (KGAT_xxxx)")
    parser.add_argument("--skip-download", action="store_true", help="Skip download")
    parser.add_argument("--resume",        action="store_true", help="Resume training")
    parser.add_argument("--epochs",        type=int, default=TRAIN_EPOCHS)
    parser.add_argument("--batch",         type=int, default=TRAIN_BATCH)
    args = parser.parse_args()

    if not args.skip_download:
        token = _get_token(args.token)
        if not token:
            print("\nERROR: No Kaggle API token found.")
            print("Pass it with:  python train.py --token KGAT_xxxx")
            sys.exit(1)

        zip_path    = download_dataset(token)
        extract_dir = extract_dataset(zip_path)
        build_dataset_yaml(extract_dir)
    else:
        if not YAML_PATH.exists():
            print("[Train] ❌ dataset.yaml missing. Run without --skip-download first.")
            sys.exit(1)
        print(f"[Train] Using existing dataset: {YAML_PATH}")

    run_training(resume=args.resume, epochs=args.epochs, batch=args.batch)


if __name__ == "__main__":
    main()
