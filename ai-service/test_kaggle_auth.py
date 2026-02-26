"""Quick auth test for kaggle package."""
import sys
try:
    import kaggle
    kaggle.api.authenticate()
    print(f"SUCCESS: kaggle {kaggle.__version__} authenticated OK")
    datasets = kaggle.api.datasets_list(search="pothole detection yolo")
    found = list(datasets)
    print(f"API works — found {len(found)} datasets")
    for d in found[:3]:
        print(f"  - {d.ref}: {d.title}")
except Exception as e:
    print(f"FAILED: {type(e).__name__}: {e}")
    sys.exit(1)
