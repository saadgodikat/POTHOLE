# 🏆 Hackathon Judge Q&A — StreetIntel

This document prepares you for potential questions from judges during the hackathon presentation. Focus on **Impact**, **Innovation**, and **Technical Execution**.

---

## 🏗️ Technical Architecture

### Q1: Why did you choose YOLOv8 for detection instead of other models?
*   **Answer**: YOLOv8 (You Only Look Once) is the industry standard for real-time edge detection. In a mobile road-inspection app, we need high-speed inference. It's lightweight enough to run on-device if needed, but for this hackathon, we optimized it on a FastAPI server to handle batch processing and complex danger classification.

### Q2: Why use two backends (Node.js + FastAPI) instead of just one?
*   **Answer**: We chose a **Decoupled Architecture** for three strategic reasons:
    1.  **Right Tool for the Job**: Node.js/Express is world-class for managing APIs, databases, and concurrent users. Python/FastAPI is the industry standard for AI/ML; it allows us to use libraries like `ultralytics` natively.
    2.  **Independent Scaling**: AI processing is CPU/GPU intensive. By separating it, we can scale the AI server to handle more detections without slowing down the main user dashboard or mobile app.
    3.  **System Resilience**: If the AI service experiences a heavy load or crash, the core application (reports, dashboard, login) remains online and functional.

### Q3: How does the "Quality Score" (0–10) work?
*   **Answer**: It’s a multi-factor engine. We don’t just detect a pothole; we calculate its threat level. We factor in:
    1.  **AI Confidence**: How certain is the model?
    2.  **Size (BBox Area)**: Larger holes pose higher immediate structural risk.
    3.  **GPS Accuracy**: Reports with high GPS jitter are slightly penalized to ensure data integrity.
    *   **The Result**: A simple, actionable score for city planners (e.g., "This street is a 4.2/10, prioritize immediately").

### Q4: How do you handle fake or duplicate reports?
*   **Answer**: We use a two-layered approach:
    1.  **Current (Geospatial Clustering)**: Our Heatmap automatically groups multiple reports within a 500-meter radius into a "Data Cluster." This prevents any single duplicate from skewing the city-wide quality score.
    2.  **Future (Image Hashing)**: For the production version, we have a roadmap to implement **Perceptual Hashing (pHash)**, which compares image signatures to detect if the exact same photo is being uploaded by different accounts.

### Q5: GPS often "drifts" (jumps around), how do you ensure the report is accurate?
*   **Answer**: We implement a three-tier **Verification Layer**:
    1.  **"Wait-and-See" Lock**: Our mobile app doesn't just take the first GPS signal it gets. It waits up to 15 seconds for a "High Precision" lock (within 20 meters) before allowing the final submission.
    2.  **Manual Correction**: Users can manually "Pick on Map" to override the GPS if they are under a bridge or near tall buildings that cause drift.
    3.  **Accuracy Logging**: Every report stores its "Accuracy Radius" in the metadata. Our Admin Dashboard shows this, allowing admins to prioritize reports with high geospatial integrity.

---

## 🧠 AI & Data

### Q6: Your model missed a pothole in a tricky image. How do you improve this?
*   **Answer**: We recognized this during development. We responded by:
    1.  **Distributed Training**: Fine-tuning the model for 45+ epochs using a custom dataset from Kaggle.
    2.  **Sensitivity Logic**: Implementing a dynamic threshold (0.15) that ensures even subtle defects are flagged for human review in the Admin Dashboard rather than being ignored.

### Q7: How many images did you use for training, and what was the mAP?
*   **Answer**: We used a combined dataset of **~2,500 annotated images** sourced from high-quality professional sets on Kaggle, specifically:
    1.  *farzadnekouei/pothole-image-based-detection-dataset*
    2.  *sovitrath/road-pothole-images-for-pothole-detection*
    3.  *chitholian/annotated-potholes-dataset*
    *   **Result**: After 45 epochs, we achieved an mAP50 (Mean Average Precision) of approximately 0.65, specifically tuned for variety in road textures (asphalt vs. concrete).

### Q8: What are the specific parameters of your AI model?
*   **Answer**: 
    *   **Architecture**: YOLOv8n (Nano) chosen for its extreme speed-to-accuracy ratio.
    *   **Size**: ~3.2 Million parameters, resulting in a lightweight 6MB weight file—ideal for rapid inference on edge devices.
    *   **Logic**: We use a custom **Confidence + Area Ratio** algorithm (0.7:0.3 weight) to classify defects into 3 danger levels (Critical, Moderate, Minor) rather than just outputting raw probability.
    *   **Optimization**: Fine-tuned using **Mosaic** and **MixUp** augmentations to ensure robustness against different weather, lighting conditions, and even digital noise from older phone cameras.

### Q9: What happens if a user has an old phone and the photo quality is bad?
*   **Answer**: Our system is built with **"Graceful Degradation"**.
    1.  **Resilient Training**: We trained the model with augmentations like *Gaussian Blur* and *Digital Noise*, which teaches the AI to recognize pothole shapes even when they aren't sharp.
    2.  **Confidence-Based Flagging**: If the image is very blurry, the AI's confidence score will naturally drop. Instead of ignoring the report, our system flags it for **"Human Verification"** in the Admin Dashboard.
    3.  **The Admin Backup**: Even if the AI is unsure, the human admin will see the photo. A human eye can often recognize a pothole in a blurry photo that a machine-only system might miss.

### Q10: How does the model perform at night or in low-light conditions?
*   **Answer**: Night detection is a common challenge for visual AI, but we tackle it using:
    1.  **Low-Light Augmentation**: During training, we applied random brightness and contrast shifts to simulate nighttime street lighting and headlight glare.
    2.  **Flash Utilization**: The mobile app is configured to use the device's LED flash to illuminate the defect area, providing the AI with better feature definition.
    3.  **Confidence Check**: If the AI is uncertain due to shadows, it assigns a "Minor" danger level and requests admin review, ensuring no hazard is ignored just because it's dark.

### Q11: What is the average latency, and where does the AI run?
*   **Answer**: 
    *   **Architecture**: We use **Server-Side Inference**. While YOLOv8 *can* run locally, we chose a centralized FastAPI server. This ensures that even a $100 budget smartphone gets the same high-quality detection as a flagship device.
    *   **Total Latency**: ~2–3 seconds (Round Trip).
    *   **AI Speed**: The actual YOLOv8n model processing takes only **~100ms**. The rest of the time is spent on network transmission (uploading the compressed JPEG), which we optimized by resizing and compressing images to ~300KB before upload.

### Q12: What would happen if 1,000 users upload photos simultaneously?
*   **Answer**: Our system is designed for **Asynchronous Scaling**. If we hit massive loads:
    1.  **Message Queuing (The Buffer)**: In a production environment, we would place a **Worker Queue** (like Redis or RabbitMQ) between Node.js and FastAPI. The 1,000 images would be safely stored in the queue instantly, and the AI workers would process them as fast as possible without crashing the server.
    2.  **Stateless Inference**: Our FastAPI detection service is "stateless," meaning we can instantly spin up 10 extra GPU nodes on AWS or GCP to clear a backlog of 1,000 photos in seconds.
    3.  **Non-Blocking UX**: On the mobile app, the user sees "Report Submitted" immediately. The AI analysis happens in the background, so the user never has to wait at a loading screen.

---

## 💼 Impact & Scalability

### Q13: What is the cost comparison with manual inspection?
*   **Answer**: StreetIntel offers a **90% reduction in inspection costs**.
    *   **Manual**: Requires a 2-person engineering team, a specialized vehicle (fuel/maintenance), and weeks to cover a city. Estimated cost: **$150–$200 per mile**.
    *   **StreetIntel**: Uses existing smartphones or $50 IoT cameras on garbage trucks. The "inspection" happens during normal commutes. Estimated cost: **<$5 per mile** (server/cloud costs).
    *   **The "Pothole Tax"**: Cities spend millions on car damage claims and late-stage repairs. By catching a crack for $50 today, we save a $5,000 deep-road repair next year.

### Q14: Who are your primary customers?
*   **Answer**: Local Municipalities and Public Works Departments. Currently, road inspection is manual and expensive (driving trucks around). **StreetIntel** crowdsources this data for free, saving the city thousands in inspection costs and identifying dangers *before* they cause vehicle damage or accidents.

### Q15: If 10,000 people use this, can your backend handle it?
*   **Answer**: 
    *   **Frontend**: Built with React Native and Vite + React for high performance.
    *   **Backend**: Node.js is asynchronous and event-driven, perfect for high I/O.
    *   **AI**: Our FastAPI service is decoupled. We can scale it horizontally by adding more "worker nodes" with GPUs without affecting the main user database.

---

## 🚀 Future Roadmap

### Q16: What’s the next feature?
*   **Answer**: IoT Integration. We want to mount a low-cost camera (like a Raspberry Pi) on garbage trucks or city buses. As they drive their daily routes, they automatically map the entire city's road quality every 24 hours without any extra human effort.

### Q17: How do you handle offline usage (areas with no 5G)?
*   **Answer**: The mobile app is designed to cache reports locally using SQLite. When the user regains connectivity, the app syncs the "Capture Queue" to the server in the background.

### Q18: Can the system detect road cracks?
*   **Answer**: 
    1.  **Current Focus**: Our current fine-tuned model is specialized for **Potholes** to achieve maximum accuracy (mAP 0.65) for this critical safety hazard.
    2.  **Modular AI Service**: Because we use a modular **YOLOv8** architecture, we can swap the model weights in seconds (e.g., to the RDD2022 dataset) to detect longitudinal and transverse cracks without changing a single line of application code.
    3.  **Roadmap**: Multi-damage detection is our next priority in the engineering pipeline.

---

## 💡 Pro-Tips for the Pitch:
*   **Show, Don't Just Tell**: Show the **Heatmap Screen**—judges love geospatial visualizations because they show "Big Picture" impact.
*   **The Admin Dashboard**: Mention that we didn't just build a "camera app," we built a **management system** where a boss can actually assign work to teams.
*   **Light/Dark Mode**: Mention the premium UI Polish—it shows attention to detail and user experience.
