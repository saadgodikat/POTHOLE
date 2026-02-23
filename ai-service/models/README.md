# models/ — Fine-Tuned Model Weights
# =====================================
# Place your trained model weights here.
#
# After running train.py, the file `pothole_finetuned.pt` will be saved here.
# The AI service (detector.py) automatically detects and uses it on next startup.
#
# Model loading priority:
#   1. pothole_finetuned.pt (your custom fine-tuned model)  ← BEST ACCURACY
#   2. MODEL_PATH env var (explicit override)
#   3. HuggingFace pretrained model (downloaded automatically)
#   4. yolov8n.pt COCO fallback
