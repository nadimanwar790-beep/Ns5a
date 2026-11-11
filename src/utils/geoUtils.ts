// Geolocation & School Campus Geofencing Utilities

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface SchoolCampusLocation {
  latitude: number;
  longitude: number;
  radiusMeters: number; // e.g. 200m geofence radius
  address?: string;
  landmark?: string;
  enforceGeofence?: boolean;
  updatedAt?: string;
}

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    typeof lat1 !== "number" ||
    typeof lon1 !== "number" ||
    typeof lat2 !== "number" ||
    typeof lon2 !== "number" ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }

  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Format meters to human-readable string (e.g. "45m" or "1.2 km")
 */
export function formatDistance(meters: number): string {
  if (isNaN(meters) || meters < 0) return "--";
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Check if a given position is inside the school's configured campus geofence
 */
export function checkCampusGeofence(
  currentPos: { latitude: number; longitude: number },
  schoolLocation?: SchoolCampusLocation | null
): {
  isConfigured: boolean;
  isInside: boolean;
  distanceMeters: number;
  formattedDistance: string;
  statusText: string;
} {
  if (
    !schoolLocation ||
    typeof schoolLocation.latitude !== "number" ||
    typeof schoolLocation.longitude !== "number" ||
    isNaN(schoolLocation.latitude) ||
    isNaN(schoolLocation.longitude) ||
    (schoolLocation.latitude === 0 && schoolLocation.longitude === 0)
  ) {
    return {
      isConfigured: false,
      isInside: true, // Default to true if school location not yet pinned
      distanceMeters: 0,
      formattedDistance: "Not Set",
      statusText: "स्कूल लोकेशन सेट नहीं है (GPS Not Set)",
    };
  }

  const distance = calculateDistanceMeters(
    currentPos.latitude,
    currentPos.longitude,
    schoolLocation.latitude,
    schoolLocation.longitude
  );

  const radius = schoolLocation.radiusMeters || 200;
  const isInside = distance <= radius;

  return {
    isConfigured: true,
    isInside,
    distanceMeters: distance,
    formattedDistance: formatDistance(distance),
    statusText: isInside
      ? `स्कूल परिसर के अंदर (${formatDistance(distance)})`
      : `स्कूल परिसर से बाहर (${formatDistance(distance)} दूर)`,
  };
}

/**
 * Browser helper to grab current live GPS position with high accuracy
 */
export function getLiveBrowserPosition(): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("इस ब्राउज़र या डिवाइस में GPS Geolocation उपलब्ध नहीं है।"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        let msg = "GPS लोकेशन प्राप्त करने में विफल।";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "लोकेशन की अनुमति अस्वीकृत की गई। कृपया ब्राउज़र सेटिंग्स में लोकेशन ऑन करें।";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "GPS सिग्नल अनुपलब्ध है।";
        } else if (err.code === err.TIMEOUT) {
          msg = "लोकेशन रिक्वेस्ट टाइमआउट हो गया।";
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  });
}
