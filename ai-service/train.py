"""
RoadWatch AI — Kaggle Pothole Dataset Fine-Tuning Script
=========================================================
Downloads a pothole detection dataset from Kaggle and fine-tunes
the YOLOv8 model on it to improve accuracy.

Prerequisites:
    1. pip install kaggle ultralytics huggingface_hub
    2. Get your Kaggle API key from: https://www.kaggle.com/settings → API → Create New Token
       This downloads a kaggle.json file. Place it at:
         Windows: C:\\Users\\YourName\\.kaggle\\kaggle.json
         Linux/Mac: ~/.kaggle/kaggle.json

Usage:
    cd ai-service
    python train.py

    # Or with explicit API key:
    python train.py --kaggle-username YOUR_USERNAME --kaggle-key YOUR_KEY

    # Resume from a previous training run:
    python train.py --resume

After training completes:
    - Best weights saved to: models/pothole_finetuned.pt
    - The detector.py will automatically use this model on next startup
"""

import argparse
import os
import sys
import shutil
import zipfile
import glob
from pathlib import Path


# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
MODELS_DIR  = BASE_DIR / "models"
DATA_DIR    = BASE_DIR / "training_data"
DATASET_ZIP = DATA_DIR / "dataset.zip"
YAML_PATH   = BASE_DIR / "dataset.yaml"
OUTPUT_MODEL = MODELS_DIR / "pothole_finetuned.pt"

# ── Kaggle dataset (YOLO-annotated, 3940 images, pre-split) ──────────────────
KAGGLE_DATASET = "farzadnekouei/pothole-image-based-detection-dataset"
KAGGLE_DATASET_ALT = "sovitrath/road-pothole-images-for-pothole-detection"
# We will try the primary then fall back to a second option

# ── Training config ───────────────────────────────────────────────────────────
TRAIN_EPOCHS     = int(os.getenv("TRAIN_EPOCHS", "50"))
TRAIN_IMG_SIZE   = int(os.getenv("TRAIN_IMG_SIZE", "640"))
TRAIN_BATCH      = int(os.getenv("TRAIN_BATCH", "8"))      # 8 for CPU, 16 for GPU
TRAIN_WORKERS    = int(os.getenv("TRAIN_WORKERS", "2"))    # Keep low on Windows
BASE_MODEL       = os.getenv("BASE_MODEL", "")             # Empty = auto-detect from HF


def setup_kaggle_auth(username: str = None, key: str = None):
    """Configure Kaggle API credentials."""
    if username and key:
        os.environ["KAGGLE_USERNAME"] = username
        os.environ["KAGGLE_KEY"] = key
        print(f"[Train] Using provided Kaggle credentials for: {username}")
        return

    # Check environment variables
    if os.getenv("KAGGLE_USERNAME") and os.getenv("KAGGLE_KEY"):
        print(f"[Train] Using Kaggle credentials from environment")
        return

    # Check kaggle.json
    kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
    if kaggle_json.exists():
        print(f"[Train] Using Kaggle credentials from {kaggle_json}")
        return

    print("\n" + "=" * 60)
    print("ERROR: Kaggle credentials not found!")
    print("=" * 60)
    print("\nTo set up Kaggle API access:")
    print("  1. Go to https://www.kaggle.com/settings → API")
    print("  2. Click 'Create New Token' — downloads kaggle.json")
    print(f"  3. Place kaggle.json in: {kaggle_json.parent}")
    print("\nOr pass credentials directly:")
    print("  python train.py --kaggle-username YOUR_USERNAME --kaggle-key YOUR_KEY")
    print("=" * 60 + "\n")
    sys.exit(1)


def download_dataset():
    """Download pothole dataset from Kaggle."""
    print(f"\n[Train] Downloading pothole dataset from Kaggle...")
    print(f"[Train] Dataset: {KAGGLE_DATASET}")

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    try:
        import kaggle
        kaggle.api.authenticate()
        kaggle.api.dataset_download_files(
            KAGGLE_DATASET,
            path=str(DATA_DIR),
            unzip=False
        )
        print(f"[Train] ✅ Dataset downloaded to {DATA_DIR}")
    except Exception as e:
        print(f"[Train] ⚠ Primary dataset failed: {e}")
        print(f"[Train] Trying alternative dataset: {KAGGLE_DATASET_ALT}")
        try:
            import kaggle
            kaggle.api.dataset_download_files(
                KAGGLE_DATASET_ALT,
                path=str(DATA_DIR),
                unzip=False
            )
            print(f"[Train] ✅ Alternative dataset downloaded")
        except Exception as e2:
            print(f"[Train] ❌ Both datasets failed. Error: {e2}")
            sys.exit(1)


def extract_and_prepare():
    """Extract the downloaded dataset and prepare directory structure for YOLO."""
    print(f"\n[Train] Extracting dataset...")

    # Find the zip file
    zips = list(DATA_DIR.glob("*.zip"))
    if not zips:
        print(f"[Train] ❌ No zip file found in {DATA_DIR}")
        sys.exit(1)

    zip_path = zips[0]
    extract_dir = DATA_DIR / "extracted"
    extract_dir.mkdir(exist_ok=True)

    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(extract_dir)
    print(f"[Train] ✅ Extracted to: {extract_dir}")
    print(f"[Train] Contents: {list(extract_dir.iterdir())}")

    return extract_dir


def find_yolo_structure(root: Path):
    """
    Search for YOLO dataset structure (train/val/test folders with images + labels).
    Returns (train_path, val_path, test_path).
    """
    # Common YOLO dataset layouts
    possible_train = [
        root / "train",
        root / "images" / "train",
    ]
    for sub in root.iterdir():
        if sub.is_dir():
            possible_train.append(sub / "train")
            possible_train.append(sub / "images" / "train")

    train_path = None
    for p in possible_train:
        if p.exists() and any(p.glob("*.jpg")) or any(p.glob("*.png")):
            train_path = p.parent
            break
        # Also check if the images are directly in the train folder
        if p.exists():
            imgs = list(p.glob("*.jpg")) + list(p.glob("*.png")) + list(p.glob("*.jpeg"))
            if imgs:
                train_path = p.parent
                break

    if train_path is None:
        # Try to find any images directory
        img_dirs = list(root.rglob("train"))
        if img_dirs:
            train_path = img_dirs[0].parent

    return train_path


def create_dataset_yaml(dataset_root: Path):
    """Create the YOLO dataset.yaml configuration file."""
    # Try to find the yaml file in the extracted dataset
    existing_yamls = list(dataset_root.rglob("*.yaml"))
    if existing_yamls:
        yaml_src = existing_yamls[0]
        print(f"[Train] Found existing YAML: {yaml_src}")
        shutil.copy(yaml_src, YAML_PATH)
        # Update the paths in the yaml to be absolute
        content = YAML_PATH.read_text()
        # Fix relative paths if needed
        if "path:" in content:
            print(f"[Train] Using dataset YAML as-is")
        else:
            # Re-write with correct paths
            _write_yaml(dataset_root)
    else:
        _write_yaml(dataset_root)

    print(f"[Train] ✅ Dataset YAML: {YAML_PATH}")


def _write_yaml(dataset_root: Path):
    """Write a YOLO dataset.yaml from scratch."""
    train_dir = dataset_root / "train" / "images"
    val_dir   = dataset_root / "valid" / "images"
    test_dir  = dataset_root / "test"  / "images"

    if not train_dir.exists():
        train_dir = dataset_root / "train"
    if not val_dir.exists():
        val_dir = dataset_root / "val"
    if not val_dir.exists():
        val_dir = train_dir  # fallback: use train as val

    yaml_content = f"""# RoadWatch Pothole Detection Dataset
path: {dataset_root.as_posix()}
train: {train_dir.as_posix()}
val:   {val_dir.as_posix()}
{"test:  " + test_dir.as_posix() if test_dir.exists() else "# test: (not available)"}

nc: 1
names:
  0: pothole
"""
    YAML_PATH.write_text(yaml_content)


def get_base_model():
    """Get the base model path for fine-tuning. Prefers the HuggingFace pretrained model."""
    # Check if we already have a locally trained model to continue from
    if OUTPUT_MODEL.exists():
        print(f"[Train] Found existing trained model — continuing fine-tuning: {OUTPUT_MODEL}")
        return str(OUTPUT_MODEL)

    # Check for the HuggingFace pretrained model in cache
    hf_cache_pattern = str(Path.home() / ".cache" / "huggingface" / "hub" / "models--Harisanth--Pothole-Finetuned-YOLOv8" / "**" / "best.pt")
    hf_cached = glob.glob(hf_cache_pattern, recursive=True)
    if hf_cached:
        print(f"[Train] Found cached HuggingFace model: {hf_cached[0]}")
        return hf_cached[0]

    # Download from HuggingFace
    print("[Train] Downloading base model from HuggingFace...")
    try:
        from huggingface_hub import hf_hub_download
        path = hf_hub_download(repo_id="Harisanth/Pothole-Finetuned-YOLOv8", filename="best.pt")
        print(f"[Train] ✅ Downloaded base model: {path}")
        return path
    except Exception as e:
        print(f"[Train] ⚠ HuggingFace download failed: {e}")
        print("[Train] Falling back to yolov8n.pt (COCO pretrained)")
        return "yolov8n.pt"


def train(resume=False):
    """Run the YOLO fine-tuning."""
    from ultralytics import YOLO

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    base_model = get_base_model()

    print(f"\n{'='*60}")
    print(f"  RoadWatch Pothole Detection — Fine-Tuning")
    print(f"{'='*60}")
    print(f"  Base model:   {base_model}")
    print(f"  Dataset YAML: {YAML_PATH}")
    print(f"  Epochs:       {TRAIN_EPOCHS}")
    print(f"  Image size:   {TRAIN_IMG_SIZE}")
    print(f"  Batch size:   {TRAIN_BATCH}")
    print(f"  Output:       {OUTPUT_MODEL}")
    print(f"{'='*60}\n")

    model = YOLO(base_model)

    results = model.train(
        data       = str(YAML_PATH),
        epochs     = TRAIN_EPOCHS,
        imgsz      = TRAIN_IMG_SIZE,
        batch      = TRAIN_BATCH,
        workers    = TRAIN_WORKERS,
        project    = str(MODELS_DIR / "runs"),
        name       = "pothole_finetune",
        exist_ok   = True,
        resume     = resume,
        device     = "0" if _has_gpu() else "cpu",  # auto-detect GPU
        # Augmentation (to reduce overfitting on small datasets)
        hsv_h      = 0.015,   # HSV hue augmentation
        hsv_s      = 0.7,     # HSV saturation
        hsv_v      = 0.4,     # HSV value
        flipud     = 0.1,     # vertical flip prob
        fliplr     = 0.5,     # horizontal flip prob
        mosaic     = 1.0,     # mosaic augmentation
        mixup      = 0.1,     # mixup augmentation
        copy_paste = 0.1,     # copy-paste augmentation
        patience   = 15,      # early stopping - stop if no improvement for 15 epochs
        save       = True,
        verbose    = True,
    )

    # Copy best weights to our standard output path
    best_weights = MODELS_DIR / "runs" / "pothole_finetune" / "weights" / "best.pt"
    if best_weights.exists():
        shutil.copy(best_weights, OUTPUT_MODEL)
        print(f"\n{'='*60}")
        print(f"  ✅ Training Complete!")
        print(f"{'='*60}")
        print(f"  Best mAP50:   {results.results_dict.get('metrics/mAP50(B)', 'N/A'):.4f}")
        print(f"  Best mAP50-95:{results.results_dict.get('metrics/mAP50-95(B)', 'N/A'):.4f}")
        print(f"  Model saved:  {OUTPUT_MODEL}")
        print(f"\n  The AI service will automatically use this model on next restart.")
        print(f"  Restart with: uvicorn main:app --host 0.0.0.0 --port 8000")
        print(f"{'='*60}\n")
    else:
        print(f"\n[Train] ⚠ best.pt not found at {best_weights}")
        print(f"[Train] Check the runs directory: {MODELS_DIR / 'runs'}")

    return results


def _has_gpu():
    """Check if a CUDA GPU is available."""
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False


def main():
    # Read module-level defaults for argparse help text (avoids global-before-local error)
    _default_epochs = int(os.getenv("TRAIN_EPOCHS", "50"))
    _default_batch  = int(os.getenv("TRAIN_BATCH", "8"))

    parser = argparse.ArgumentParser(description="Fine-tune YOLOv8 on Kaggle pothole dataset")
    parser.add_argument("--kaggle-username", help="Kaggle username")
    parser.add_argument("--kaggle-key",      help="Kaggle API key")
    parser.add_argument("--skip-download",   action="store_true",
                        help="Skip dataset download (use existing training_data/)")
    parser.add_argument("--resume",          action="store_true",
                        help="Resume from last training checkpoint")
    parser.add_argument("--epochs",          type=int, default=_default_epochs,
                        help=f"Number of training epochs (default: {_default_epochs})")
    parser.add_argument("--batch",           type=int, default=_default_batch,
                        help=f"Batch size (default: {_default_batch}; use 16 if GPU)")
    args = parser.parse_args()

    # Update module-level training config with CLI overrides
    global TRAIN_EPOCHS, TRAIN_BATCH
    TRAIN_EPOCHS = args.epochs
    TRAIN_BATCH  = args.batch

    if not args.skip_download:
        setup_kaggle_auth(args.kaggle_username, args.kaggle_key)
        download_dataset()
        extract_dir = extract_and_prepare()
        dataset_root = find_yolo_structure(extract_dir) or extract_dir
        create_dataset_yaml(dataset_root)
    else:
        if not YAML_PATH.exists():
            print(f"[Train] ❌ dataset.yaml not found. Run without --skip-download first.")
            sys.exit(1)
        print(f"[Train] Skipping download, using existing: {YAML_PATH}")

    train(resume=args.resume)


if __name__ == "__main__":
    main()
