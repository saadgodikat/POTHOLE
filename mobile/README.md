# StreetIntel — Mobile App

React Native (Expo) mobile app for the AI Road Inspection System.

## Setup

### Prerequisites
- Node.js ≥ 18
- Expo Go app on your Android/iOS device, OR Android Studio emulator

### Install & Run

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code in Expo Go to run on your phone.

### Configure Backend URL

Open `src/services/api.js` and update `BASE_URL` to your machine's local IP:

```js
const BASE_URL = 'http://192.168.x.x:3000'; // your local network IP
```

> `localhost` only works on simulators. For physical devices, use your machine's local IP (find it with `ipconfig` / `ifconfig`).

## Screens

| Screen | Description |
|---|---|
| **Home** | Landing page with navigation to capture or view reports |
| **Capture** | Camera viewfinder with live GPS tag + image compression |
| **Report** | Image preview, GPS metadata, optional description, submit |
| **Reports List** | Browse all reports with AI results, status filter, pull-to-refresh |

## Permissions Required
- **Camera** — to capture road images
- **Location (Fine)** — to auto-tag GPS coordinates on each report
