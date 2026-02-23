"""
Fix stuck reports by re-running AI detection on their images.
Run from: backend/ directory
"""
import requests, sqlite3, os

db = sqlite3.connect('./data/road_inspection.db')
db.row_factory = sqlite3.Row
cursor = db.cursor()
cursor.execute('SELECT report_id, image_url FROM reports WHERE defect_type IS NULL')
stuck = cursor.fetchall()
print(f'Found {len(stuck)} stuck reports')

for r in stuck:
    img_path = '.' + r['image_url']
    rid = r['report_id']
    if not os.path.exists(img_path):
        print(f'  Report {rid}: image not found at {img_path}')
        continue
    print(f'  Report {rid}: submitting {img_path} to AI service...')
    try:
        with open(img_path, 'rb') as f:
            resp = requests.post(
                'http://localhost:8000/detect',
                files={'file': ('image.jpg', f, 'image/jpeg')},
                timeout=120
            )
        if resp.status_code == 200:
            data = resp.json()
            defect = data.get('defect_type')
            conf   = data.get('confidence', 0)
            sev    = data.get('severity')
            dlevel = data.get('danger_level')
            dprio  = data.get('danger_priority')
            bbox   = str(data['bbox']) if data.get('bbox') else None
            print(f'    Result: defect={defect} conf={conf:.2%} danger={dlevel}')
            cursor.execute(
                'UPDATE reports SET defect_type=?, ai_confidence=?, severity=?, '
                'danger_level=?, danger_priority=?, bbox=? WHERE report_id=?',
                (defect, conf, sev, dlevel, dprio, bbox, rid)
            )
            db.commit()
            print(f'    Updated report {rid} in DB')
        else:
            print(f'    AI error {resp.status_code}: {resp.text[:200]}')
    except Exception as e:
        print(f'    Error: {e}')

db.close()
print('Done!')
