# 🏆 Hackathon Judge Q&A — StreetIntel

This document prepares you for potential questions from judges during the hackathon presentation. Focus on **Impact**, **Innovation**, and **Technical Execution**.

---

## 🏗️ Technical Architecture

### Q1: Why did you choose YOLOv8 for detection instead of other models?
*   **Answer**: YOLOv8 (You Only Look Once) is the industry standard for real-time edge detection. In a mobile road-inspection app, we need high-speed inference. It's lightweight enough to run on-device if needed, but for this hackathon, we optimized it on a FastAPI server to handle batch processing and complex danger classification.

### Q2: How does the "Quality Score" (0–10) work?
*   **Answer**: It’s a multi-factor engine. We don’t just detect a pothole; we calculate its threat level. We factor in:
    1.  **AI Confidence**: How certain is the model?
    2.  **Size (BBox Area)**: Larger holes pose higher immediate structural risk.
    3.  **GPS Accuracy**: Reports with high GPS jitter are slightly penalized to ensure data integrity.
    *   **The Result**: A simple, actionable score for city planners (e.g., "This street is a 4.2/10, prioritize immediately").

### Q3: How do you handle fake or duplicate reports?
*   **Answer**: Currently, we use geospatial clustering (seen in our Heatmap) to group reports in the same radius. For a production version, we would implement **image hashing** to detect duplicate photos and **user reputation scores** to filter out spam.

---

## 🧠 AI & Data

### Q4: Your model missed a pothole in a tricky image. How do you improve this?
*   **Answer**: We recognized this during development. We responded by:
    1.  **Distributed Training**: Fine-tuning the model for 45+ epochs using a custom dataset from Kaggle.
    2.  **Sensitivity Logic**: Implementing a dynamic threshold (0.15) that ensures even subtle defects are flagged for human review in the Admin Dashboard rather than being ignored.

### Q5: How many images did you use for training, and what was the mAP?
*   **Answer**: We used a dataset of ~2,500 annotated road defect images. After 45 epochs, we achieved an mAP50 (Mean Average Precision) of approximately 0.65, specifically tuned for variety in road textures (asphalt vs. concrete).

---

## 💼 Impact & Scalability

### Q6: Who are your primary customers?
*   **Answer**: Local Municipalities and Public Works Departments. Currently, road inspection is manual and expensive (driving trucks around). **StreetIntel** crowdsources this data for free, saving the city thousands in inspection costs and identifying dangers *before* they cause vehicle damage or accidents.

### Q7: If 10,000 people use this, can your backend handle it?
*   **Answer**: 
    *   **Frontend**: Built with React Native and Vite + React for high performance.
    *   **Backend**: Node.js is asynchronous and event-driven, perfect for high I/O.
    *   **AI**: Our FastAPI service is decoupled. We can scale it horizontally by adding more "worker nodes" with GPUs without affecting the main user database.

---

## 🚀 Future Roadmap

### Q8: What’s the next feature?
*   **Answer**: IoT Integration. We want to mount a low-cost camera (like a Raspberry Pi) on garbage trucks or city buses. As they drive their daily routes, they automatically map the entire city's road quality every 24 hours without any extra human effort.

### Q9: How do you handle offline usage (areas with no 5G)?
*   **Answer**: The mobile app is designed to cache reports locally using SQLite. When the user regains connectivity, the app syncs the "Capture Queue" to the server in the background.

---

## 💡 Pro-Tips for the Pitch:
*   **Show, Don't Just Tell**: Show the **Heatmap Screen**—judges love geospatial visualizations because they show "Big Picture" impact.
*   **The Admin Dashboard**: Mention that we didn't just build a "camera app," we built a **management system** where a boss can actually assign work to teams.
*   **Light/Dark Mode**: Mention the premium UI Polish—it shows attention to detail and user experience.
