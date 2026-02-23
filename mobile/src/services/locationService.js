// ─────────────────────────────────────────────────────────────────────────────
// Location Service — High-accuracy GPS helpers
// ─────────────────────────────────────────────────────────────────────────────
import * as Location from 'expo-location';

export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Get the most accurate GPS fix available.
 * Uses BestForNavigation accuracy and waits up to 15 s for a reading
 * with accuracy ≤ 20 m. Falls back to whatever is available after timeout.
 *
 * @returns {{ latitude, longitude, accuracy }}
 */
export async function getCurrentLocation() {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error('Location permission denied. Please enable it in Settings.');
  }

  return new Promise((resolve, reject) => {
    let bestReading = null;
    let subscription = null;
    const TIMEOUT_MS  = 15_000; // give GPS chip 15 s to get a good fix
    const TARGET_ACCURACY_M = 20; // accept reading if accuracy ≤ 20 m

    const finish = (reading) => {
      if (subscription) subscription.then((s) => s.remove()).catch(() => {});
      resolve({
        latitude:  reading.coords.latitude,
        longitude: reading.coords.longitude,
        accuracy:  reading.coords.accuracy,
      });
    };

    // Timeout fallback — resolve with best we have (or reject if nothing)
    const timer = setTimeout(() => {
      if (bestReading) finish(bestReading);
      else reject(new Error('GPS timed out. Move to an open area and retry.'));
    }, TIMEOUT_MS);

    // Start watching — each update may be more accurate than the last
    subscription = Location.watchPositionAsync(
      {
        accuracy:        Location.Accuracy.BestForNavigation,
        timeInterval:    1000,  // update every second
        distanceInterval: 0,    // update even if not moved
        mayShowUserSettingsDialog: true,
      },
      (location) => {
        const acc = location.coords.accuracy;

        // Keep the most accurate reading seen so far
        if (!bestReading || acc < bestReading.coords.accuracy) {
          bestReading = location;
        }

        // Resolve early if we hit target accuracy
        if (acc <= TARGET_ACCURACY_M) {
          clearTimeout(timer);
          finish(location);
        }
      }
    ).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Start a live location watcher and call `onUpdate` each time.
 * Returns the subscription — call `.remove()` to stop.
 */
export async function watchLocation(onUpdate, onError) {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    onError?.(new Error('Location permission denied.'));
    return null;
  }

  return Location.watchPositionAsync(
    {
      accuracy:        Location.Accuracy.BestForNavigation,
      timeInterval:    2000,
      distanceInterval: 1,
    },
    (location) => onUpdate({
      latitude:  location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy:  Math.round(location.coords.accuracy),
    })
  );
}

export async function getAddressFromCoords(latitude, longitude) {
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
    return [address.street, address.city, address.region].filter(Boolean).join(', ') || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  } catch {
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }
}
