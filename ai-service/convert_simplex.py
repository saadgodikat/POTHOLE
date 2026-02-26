import os
import shutil
from pathlib import Path
from PIL import Image

def convert_annotations(anno_file, img_root, output_labels_dir, output_images_dir):
    print(f"Converting {anno_file}...")
    if not anno_file.exists():
        print(f"Error: {anno_file} NOT FOUND")
        return
    with open(anno_file, 'r') as f:
        lines = f.readlines()


    os.makedirs(output_labels_dir, exist_ok=True)
    os.makedirs(output_images_dir, exist_ok=True)

    count = 0
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # The line format is: path num_boxes x1 y1 w1 h1 ...
        # Since path has spaces, we need a better way to split.
        # We know that after the path there is num_boxes (integer).
        # Let's find the first instance of " .bmp " or " .JPG " or just split by extension.
        
        if ".bmp" in line:
            ext = ".bmp"
        elif ".JPG" in line:
            ext = ".JPG"
        else:
            print(f"Unknown extension in line: {line[:50]}...")
            continue
            
        ext_idx = line.find(ext)
        rel_img_path = line[:ext_idx + len(ext)]
        rest = line[ext_idx + len(ext):].strip().split()
        
        if not rest:
            print(f"No boxes for {rel_img_path}")
            continue
            
        num_boxes = int(rest[0])
        boxes = rest[1:]
        
        # Change extension to .JPG and fix separators
        rel_img_path_fixed = rel_img_path.replace('\\', '/').replace('.bmp', '.JPG')
        
        full_img_path = img_root / rel_img_path_fixed
        if not full_img_path.exists():
            # Try lowercase jpg
            full_img_path = full_img_path.with_suffix('.jpg')
            if not full_img_path.exists():
                print(f"Skipping {rel_img_path_fixed} (not found)")
                continue

        # Get image size
        with Image.open(full_img_path) as img:
            w_img, h_img = img.size

        
        label_file = output_labels_dir / (full_img_path.stem + ".txt")
        yolo_labels = []
        
        for i in range(0, num_boxes * 4, 4):
            x = float(boxes[i])
            y = float(boxes[i+1])
            w = float(boxes[i+2])
            h = float(boxes[i+3])
            
            # YOLO format: class x_center y_center width height (normalized)
            # Assuming x, y are top-left
            x_center = (x + w/2) / w_img
            y_center = (y + h/2) / h_img
            w_norm = w / w_img
            h_norm = h / h_img
            
            yolo_labels.append(f"0 {x_center:.6f} {y_center:.6f} {w_norm:.6f} {h_norm:.6f}")
            
        with open(label_file, 'w') as lf:
            lf.write("\n".join(yolo_labels))
            
        # Copy image to output dir
        shutil.copy(full_img_path, output_images_dir / full_img_path.name)
        count += 1
        
    print(f"Processed {count} images.")

def add_negatives(neg_dir, output_labels_dir, output_images_dir):
    print(f"Adding negatives from {neg_dir}...")
    neg_images = list(neg_dir.glob("*.JPG")) + list(neg_dir.glob("*.jpg"))
    for img_path in neg_images:
        # For negatives, create empty label file
        label_file = output_labels_dir / (img_path.stem + ".txt")
        open(label_file, 'w').close()
        shutil.copy(img_path, output_images_dir / img_path.name)
    print(f"Added {len(neg_images)} negatives.")

if __name__ == "__main__":
    base_data = Path("training_data/extracted/Dataset 1 (Simplex)/Dataset 1 (Simplex)")
    yolo_root = Path("training_data/yolo_dataset")
    
    # Train
    convert_annotations(
        base_data / "simpleTrainFullPhotosSortedFullAnnotations.txt",
        base_data,
        yolo_root / "labels/train",
        yolo_root / "images/train"
    )
    add_negatives(
        base_data / "Train data/Negative data",
        yolo_root / "labels/train",
        yolo_root / "images/train"
    )
    
    # Val (Test data in Simplex)
    convert_annotations(
        base_data / "simpleTestFullSizeAllPotholesSortedFullAnnotation.txt",
        base_data,
        yolo_root / "labels/val",
        yolo_root / "images/val"
    )
    # Background images in Test data? It seems all images in Test data are positives (in the txt)
    # but let's check if there are any files NOT in the txt that could be backgrounds.
    # Actually, Simplex usually provides negatives in a separate folder.
    # I'll just use the txt files as source of truth for both.

