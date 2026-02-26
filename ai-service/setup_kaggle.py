"""
setup_kaggle.py — Kaggle Credentials Setup Helper
==================================================
Run this once to configure your Kaggle API key.

Usage:
    cd ai-service
    python setup_kaggle.py

Then follow the printed instructions.
"""
import json
import os
from pathlib import Path

KAGGLE_DIR  = Path.home() / ".kaggle"
KAGGLE_JSON = KAGGLE_DIR / "kaggle.json"


def main():
    print("\n" + "=" * 60)
    print("  StreetIntel — Kaggle API Setup")
    print("=" * 60)

    if KAGGLE_JSON.exists():
        try:
            creds = json.loads(KAGGLE_JSON.read_text())
            print(f"\n✅ Kaggle credentials already configured!")
            print(f"   Username: {creds.get('username', 'unknown')}")
            print(f"   File:     {KAGGLE_JSON}")
            print(f"\nYou can now run:")
            print(f"   python train.py")
        except Exception:
            print(f"⚠  kaggle.json exists but might be invalid: {KAGGLE_JSON}")
        return

    print("""
How to get your Kaggle API Key:
  1. Go to https://www.kaggle.com/settings
  2. Scroll to "API" section
  3. Click "Create New Token"
  4. This downloads a file called kaggle.json

Choose how to set up credentials:
  [A] I downloaded kaggle.json — let me paste the path to it
  [B] I'll enter my username and API key manually
  [Q] Quit
""")

    choice = input("Choice [A/B/Q]: ").strip().upper()

    if choice == "Q":
        return

    elif choice == "A":
        path_str = input("Paste the full path to your kaggle.json file: ").strip().strip('"')
        src = Path(path_str)
        if not src.exists():
            print(f"❌ File not found: {src}")
            return
        KAGGLE_DIR.mkdir(parents=True, exist_ok=True)
        import shutil
        shutil.copy(src, KAGGLE_JSON)
        # Set permissions (important on Linux/Mac)
        try:
            os.chmod(KAGGLE_JSON, 0o600)
        except Exception:
            pass
        print(f"\n✅ Credentials saved to: {KAGGLE_JSON}")

    elif choice == "B":
        username = input("Kaggle username: ").strip()
        key      = input("Kaggle API key:  ").strip()
        if not username or not key:
            print("❌ Username and key are required.")
            return
        KAGGLE_DIR.mkdir(parents=True, exist_ok=True)
        creds = {"username": username, "key": key}
        KAGGLE_JSON.write_text(json.dumps(creds))
        try:
            os.chmod(KAGGLE_JSON, 0o600)
        except Exception:
            pass
        print(f"\n✅ Credentials saved to: {KAGGLE_JSON}")

    else:
        print("Invalid choice.")
        return

    print("\nVerifying Kaggle connection...")
    try:
        import kaggle
        kaggle.api.authenticate()
        print("✅ Authentication successful!\n")
        print("You can now start fine-tuning:")
        print("   python train.py")
        print("\nTraining options:")
        print("   python train.py --epochs 30          # Faster (30 epochs)")
        print("   python train.py --batch 16           # If you have a GPU")
        print("   python train.py --resume             # Continue interrupted training")
    except Exception as e:
        print(f"⚠  Auth check failed: {e}")
        print("   Please verify your API key at https://www.kaggle.com/settings")


if __name__ == "__main__":
    main()
