
import os, sys
from PIL import Image
import io

# Ensure we can import from the same directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from detector import load_model, CLASS_MAP, model_info

def test_pothole_26():
    info = model_info()
    print(f"Using model: {info['model_path']}")
    print(f"Is custom trained: {info['is_custom_trained']}")
    image_path = r"c:\Users\Saad Godikat\Downloads\hack\backend\uploads\6a3effc4-c932-41cd-9dab-b52d864a036f.jpg"
    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        return

    print(f"Testing detection on: {image_path}")
    model = load_model()
    image = Image.open(image_path).convert("RGB")
    
    # Run prediction with a very low threshold to see what it finds
    results = model.predict(source=image, conf=0.01, verbose=False)
    
    if not results or len(results[0].boxes) == 0:
        print("No detections found even at 0.01 threshold!")
        return

    boxes = results[0].boxes
    print(f"Found {len(boxes)} raw detections:")
    for i in range(len(boxes)):
        conf = float(boxes.conf[i])
        class_id = int(boxes.cls[i])
        raw_label = results[0].names[class_id]
        defect = CLASS_MAP.get(raw_label, raw_label.lower())
        bbox = [round(v, 2) for v in boxes.xyxy[i].tolist()]
        print(f"[{i+1}] {defect} (raw: {raw_label}) - Confidence: {conf:.4f} - BBox: {bbox}")

if __name__ == "__main__":
    test_pothole_26()
