"""
RoadWatch AI — Pothole Detection Test Script
=============================================
Tests the pothole detection model on sample images.

Usage:
    cd ai-service
    python test_detector.py

The script loads the YOLOv8 pothole model and runs inference on all images
in the test_images/ directory, printing results with danger classifications.
"""

import os, sys, glob

# ── Ensure we can import from the same directory ──────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from detector import load_model, detect, model_info


def print_header(text: str, char: str = "═"):
    width = 70
    print(f"\n{char * width}")
    print(f"  {text}")
    print(f"{char * width}")


def print_detection(det: dict, index: int = 0):
    """Pretty-print a single detection."""
    emoji = {"critical": "🔴", "moderate": "🟡", "minor": "🟢"}.get(det.get("danger_level", ""), "⚪")
    print(f"  [{index+1}] {emoji} {det['defect_type'].upper()}")
    print(f"      Confidence:    {det['confidence']:.1%}")
    print(f"      Danger Level:  {det['danger_level']} — {det.get('danger_label', 'N/A')}")
    print(f"      Priority:      {det.get('danger_priority', 'N/A')}")
    print(f"      Severity:      {det.get('severity', 'N/A')} (legacy)")
    print(f"      BBox:          {det['bbox']}")


def test_image(image_path: str):
    """Run detection on a single image and print results."""
    filename = os.path.basename(image_path)
    print_header(f"Testing: {filename}", "─")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    print(f"  Image size: {len(image_bytes) / 1024:.1f} KB")

    result = detect(image_bytes)

    if result["defect_type"] is None:
        print("  ⚠️  No potholes detected in this image.")
        return result

    print(f"\n  📌 PRIMARY DETECTION (Most Dangerous):")
    print_detection(result)

    total = len(result["all_detections"])
    if total > 1:
        print(f"\n  📋 ALL DETECTIONS ({total} total):")
        for i, det in enumerate(result["all_detections"]):
            print_detection(det, i)
    
    return result


def main():
    print_header("RoadWatch AI — Pothole Detection Test")

    # Show model info
    info = model_info()
    print(f"\n  Model:        {info['model_path']}")
    print(f"  Classes:      {info['class_names']}")
    print(f"  Confidence:   ≥ {info['confidence_threshold']}")
    print(f"  Danger Levels: {info['danger_levels']}")

    # Find test images
    test_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_images")
    
    if not os.path.exists(test_dir):
        print(f"\n  ⚠️  No test_images/ directory found. Creating it...")
        os.makedirs(test_dir)
        print(f"  📂 Add pothole images to: {test_dir}")
        return

    patterns = ["*.png", "*.jpg", "*.jpeg", "*.webp"]
    images = []
    for pat in patterns:
        images.extend(glob.glob(os.path.join(test_dir, pat)))

    if not images:
        print(f"\n  ⚠️  No images found in {test_dir}")
        print(f"  📂 Add .jpg/.png/.webp pothole images to test_images/")
        return

    print(f"\n  Found {len(images)} test image(s)")

    # Run detection on each image
    results = []
    for img_path in sorted(images):
        result = test_image(img_path)
        results.append((os.path.basename(img_path), result))

    # Summary
    print_header("SUMMARY")
    detected = sum(1 for _, r in results if r["defect_type"] is not None)
    print(f"\n  Images tested:     {len(results)}")
    print(f"  Potholes detected: {detected}/{len(results)}")

    if detected > 0:
        # Show danger distribution
        levels = {"critical": 0, "moderate": 0, "minor": 0}
        for _, r in results:
            dl = r.get("danger_level")
            if dl in levels:
                levels[dl] += 1
        print(f"\n  Danger Distribution:")
        print(f"    🔴 Critical: {levels['critical']}")
        print(f"    🟡 Moderate: {levels['moderate']}")
        print(f"    🟢 Minor:    {levels['minor']}")

    print()


if __name__ == "__main__":
    main()
