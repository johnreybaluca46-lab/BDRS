import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '../database/firebase';
import Swal from 'sweetalert2';

const getDeviceInfo = async () => {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  let deviceType = "Desktop";

  // Detect Device Type
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = "Tablet";
  } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    deviceType = "Mobile";
  }

  // Detect OS and Version
  if (/Windows NT 10.0/.test(ua)) {
    os = "Windows 10/11"; // Fallback
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      try {
        const uaData = await navigator.userAgentData.getHighEntropyValues(["platformVersion"]);
        if (uaData && uaData.platformVersion) {
          const majorPlatformVersion = parseInt(uaData.platformVersion.split('.')[0], 10);
          if (majorPlatformVersion >= 13) {
            os = "Windows 11";
          } else {
            os = "Windows 10";
          }
        }
      } catch (e) {
        console.error("Error reading platformVersion", e);
      }
    }
  }
  else if (/Windows NT 6.3/.test(ua)) os = "Windows 8.1";
  else if (/Windows NT 6.2/.test(ua)) os = "Windows 8";
  else if (/Windows NT 6.1/.test(ua)) os = "Windows 7";
  else if (/Mac OS X 10[._](\d+)/.test(ua)) {
    const match = ua.match(/Mac OS X 10[._](\d+)/);
    os = `macOS 10.${match[1]}`;
  } else if (/Mac OS X 1[1-9][._](\d+)?/.test(ua)) {
    const match = ua.match(/Mac OS X (1[1-9])[._]?(\d+)?/);
    os = `macOS ${match[1]}${match[2] ? '.' + match[2] : ''}`;
  } else if (/Android (\d+(\.\d+)?)/.test(ua)) {
    const match = ua.match(/Android (\d+(\.\d+)?)/);
    os = `Android ${match[1]}`;
  } else if (/OS (\d+)[._](\d+)/.test(ua) && /iP(hone|od|ad)/.test(ua)) {
    const match = ua.match(/OS (\d+)[._](\d+)/);
    os = `iOS ${match[1]}.${match[2]}`;
  } else if (/Linux/.test(ua)) os = "Linux";
  else if (/Mac/.test(ua)) os = "macOS";
  else if (/Windows/.test(ua)) os = "Windows";

  // Detect Browser and Version
  if (/Edg\/(\d+)/.test(ua)) {
    const match = ua.match(/Edg\/(\d+)/);
    browser = `Edge ${match[1]}`;
  } else if (/OPR\/(\d+)/.test(ua) || /Opera\/(\d+)/.test(ua)) {
    const match = ua.match(/(?:OPR|Opera)\/(\d+)/);
    browser = `Opera ${match[1]}`;
  } else if (/Firefox\/(\d+)/.test(ua)) {
    const match = ua.match(/Firefox\/(\d+)/);
    browser = `Firefox ${match[1]}`;
  } else if (/(?:Chrome|CriOS)\/(\d+)\./.test(ua)) {
    const match = ua.match(/(?:Chrome|CriOS)\/(\d+)\./);
    browser = `Chrome ${match[1]}`;
  } else if (/Version\/(\d+).*Safari/.test(ua)) {
    const match = ua.match(/Version\/(\d+)/);
    browser = `Safari ${match[1]}`;
  } else if (/Safari/.test(ua)) {
    browser = "Safari";
  } else if (/Trident.*rv:11/.test(ua)) {
    browser = "IE 11";
  }

  return { browser, os, deviceType };
};

const isPublicIP = (ip) => {
  if (!ip || typeof ip !== 'string') return false;

  // IPv4 Private Ranges
  // 10.0.0.0/8
  if (/^10\./.test(ip)) return false;
  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return false;
  // 192.168.0.0/16
  if (/^192\.168\./.test(ip)) return false;
  // 127.0.0.0/8 (Loopback)
  if (/^127\./.test(ip)) return false;
  // 169.254.0.0/16 (Link-local)
  if (/^169\.254\./.test(ip)) return false;

  // IPv6 Private/Local Ranges
  // Link-local (fe80::/10)
  if (/^fe80:/i.test(ip)) return false;
  // Unique local (fc00::/7)
  if (/^fc[0-9a-f]{2}:/i.test(ip) || /^fd[0-9a-f]{2}:/i.test(ip)) return false;
  // Loopback (::1)
  if (ip === '::1') return false;

  return true;
};

const getIpInfo = async () => {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1500);

    try {
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(id);

      if (res.ok) {
        const data = await res.json();
        const ip = data.ip || 'Unknown';
        if (!isPublicIP(ip)) {
          return { ip: 'Unavailable', location: 'Unavailable', isp: 'Unavailable', locationType: 'Approximate (network-based)' };
        }
        const locationParts = [data.city, data.region, data.country_name].filter(Boolean);
        return {
          ip: ip,
          location: locationParts.length > 0 ? locationParts.join(', ') : 'Unknown',
          isp: data.org || 'Unknown',
          locationType: 'Approximate (network-based)'
        };
      }
    } catch (err) {
      clearTimeout(id);
    }

    // Fallback
    const fbController = new AbortController();
    const fbId = setTimeout(() => fbController.abort(), 1500);
    const fbRes = await fetch('https://api.ipify.org?format=json', { signal: fbController.signal });
    clearTimeout(fbId);

    const fbData = await fbRes.json();
    return { ip: fbData.ip, location: 'Unknown', isp: 'Unknown', locationType: 'Approximate (network-based)' };

  } catch (e) {
    return { ip: 'Unknown', location: 'Unknown', isp: 'Unknown', locationType: 'Approximate (network-based)' };
  }
};

export const getLocationWithConsent = async (isResident = false) => {
  if (!navigator.geolocation) {
    // If geolocation is entirely unsupported, fallback to IP immediately
    return await getIpInfo();
  }

  try {
    // Some browsers (like older Safari) don't support navigator.permissions
    let isPrompt = true;
    let isDenied = false;

    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        isPrompt = permission.state === 'prompt';
        isDenied = permission.state === 'denied';
      } catch (e) {
        console.warn("Permissions API not fully supported, ignoring state check.");
      }
    }

    if (isDenied) {
      await Swal.fire({
        title: 'Location Access Blocked',
        text: 'Location permission is required to log in. Please click the lock icon in your URL bar, allow location access, and try again.',
        icon: 'warning',
        confirmButtonColor: '#3182ce'
      });
      return null; // Denied means we must abort as per requirements
    }

    if (isPrompt) {
      const result = await Swal.fire({
        title: 'Location Required',
        text: 'We use your location to help you verify your own login activity and spot suspicious access. Your exact location is only visible to you.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Allow Location',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#3182ce',
        cancelButtonColor: '#718096'
      });
      if (!result.isConfirmed) {
        return null; // User cancelled prompt
      }
    }

    return await new Promise((resolve) => {
      // Start IP fetch immediately in parallel to save time
      const ipPromise = getIpInfo();

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 3000); // Increase timeout to 3s for reverse geocoding

            let locationName = null;

            try {
              // Try Nominatim first
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
                signal: controller.signal,
                headers: {
                  'Accept-Language': 'en-US,en;q=0.9'
                }
              });
              if (res.ok) {
                const data = await res.json();
                const address = data.address || {};
                const parts = [
                  address.village || address.suburb || address.barangay || address.neighbourhood,
                  address.city || address.town || address.municipality,
                  address.state || address.province || address.region,
                  address.country
                ].filter(Boolean);
                if (parts.length > 0) locationName = [...new Set(parts)].join(', ');
              }
            } catch (e) {
              console.warn('Nominatim failed, trying fallback');
            }

            if (!locationName) {
              // Fallback to BigDataCloud
              const fbRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`, { signal: controller.signal });
              if (fbRes.ok) {
                const data = await fbRes.json();
                const parts = [data.locality, data.city, data.principalSubdivision, data.countryName].filter(Boolean);
                if (parts.length > 0) locationName = [...new Set(parts)].join(', ');
              }
            }

            clearTimeout(id);
            const ipInfo = await ipPromise; // Wait for IP info to finish

            // If both geocoders failed, fallback to Lat/Lon display instead of IP
            if (!locationName) {
              locationName = `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)} (Address lookup failed)`;
            }

            resolve({
              ip: ipInfo.ip,
              location: locationName,
              isp: ipInfo.isp,
              locationType: 'Precise (GPS)',
              lat,
              lon,
              gpsConsentGranted: true,
              gpsConsentTimestamp: Date.now()
            });
          } catch (e) {
            const ipInfo = await ipPromise;
            resolve({
              ...ipInfo,
              location: `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`, // Show coordinates if API crashes
              locationType: 'Precise (GPS)',
              lat,
              lon,
              gpsConsentGranted: true,
              gpsConsentTimestamp: Date.now()
            });
          }
        },
        async (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            await Swal.fire({
              title: 'Location Permission Denied',
              text: 'You must allow location access to log in.',
              icon: 'warning',
              confirmButtonColor: '#3182ce'
            });
            resolve(null); // Explicit deny aborts login
          } else {
            // Timeout (3) or Position Unavailable (2)
            let errorReason = err.code === 2 ? 'POSITION_UNAVAILABLE (Your Windows/OS Location Services might be turned off)' : 
                              err.code === 3 ? 'TIMEOUT (Your device took too long to get a GPS lock)' : `Error Code: ${err.code}`;
            
            await Swal.fire({
              title: 'GPS Hardware Failed',
              text: `Your browser failed to get a GPS signal: ${errorReason}. We will safely fall back to your IP address so you can still log in!`,
              icon: 'info',
              confirmButtonColor: '#3182ce'
            });

            const ipInfo = await ipPromise;
            resolve({
              ...ipInfo,
              locationType: 'Approximate (GPS Failed/Timeout)',
              gpsConsentGranted: true,
              gpsConsentTimestamp: Date.now()
            });
          }
        },
        // maximumAge: 60000 caches the location for 1 minute so subsequent logins are instant
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
      );
    });
  } catch (e) {
    console.error("Error obtaining location with consent:", e);
    // Ultimate fallback if something completely crashes
    return await getIpInfo();
  }
};

const sanitizePayload = (payload, allowedFields) => {
  const sanitized = {};
  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      if (typeof payload[field] === 'object' && payload[field] !== null) {
        throw new Error(`Audit Logger Error: Complex objects are not allowed for field '${field}'. Only pass primitive values.`);
      }
      sanitized[field] = payload[field];
    }
  }
  return sanitized;
};

export const logActivity = async ({ action, targetType, targetId, description, result = 'success' }) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn("Audit Logger: Cannot log activity without an authenticated user.");
      return false;
    }

    const { browser, os, deviceType } = await getDeviceInfo();
    const { ip, location, isp } = await getIpInfo();

    const payload = sanitizePayload({ action, targetType, targetId, description, result }, ['action', 'targetType', 'targetId', 'description', 'result']);

    const logData = {
      ...payload,
      actorId: user.uid,
      actorEmail: user.email,
      actorRole: "Admin",
      device: os,
      deviceType: deviceType,
      browser,
      ipAddress: ip,
      location,
      isp,
      timestamp: serverTimestamp(),
    };

    await addDoc(collection(db, 'activity_logs'), logData);
    return true;
  } catch (error) {
    console.error("Audit Logger failed to save log:", error);
    return false;
  }
};

export const logLoginEvent = async ({ event, result, details = '', email = '', role = null, method = 'Email/Password', locationOverride = null }) => {
  try {
    const user = auth.currentUser;
    const { browser, os, deviceType } = await getDeviceInfo();
    const locInfo = locationOverride || await getIpInfo();
    let { ip, location, isp, locationType, lat, lon, gpsConsentGranted, gpsConsentTimestamp } = locInfo;
    
    const actualEmail = user ? user.email : (email || 'Unknown');

    // If the device GPS hardware failed, fulfill the user's request to use their LAST KNOWN exact GPS location instead of the inaccurate ISP IP address!
    if (locationType && locationType.includes('Approximate (GPS Failed') && actualEmail !== 'Unknown') {
       try {
         const lastLogQuery = query(
           collection(db, 'login_logs'), 
           where('actorEmail', '==', actualEmail), 
           where('locationType', '==', 'Precise (GPS)'), 
           orderBy('timestamp', 'desc'), 
           limit(1)
         );
         const lastLogSnap = await getDocs(lastLogQuery);
         if (!lastLogSnap.empty) {
           const lastLog = lastLogSnap.docs[0].data();
           if (lastLog.location && lastLog.lat && lastLog.lon) {
             location = lastLog.location;
             lat = lastLog.lat;
             lon = lastLog.lon;
             locationType = 'Precise (Cached from last known location)';
           }
         }
       } catch (cachedErr) {
         console.warn("Failed to retrieve cached location", cachedErr);
       }
    }

    const payload = sanitizePayload({ event, result, details, email: actualEmail, method }, ['event', 'result', 'details', 'email', 'method']);

    const logData = {
      ...payload,
      actorId: user ? user.uid : 'unauthenticated',
      actorEmail: actualEmail,
      actorRole: role ? role : (user ? (user.email === 'admin@bdrs.gov.ph' ? 'Admin' : 'Resident') : 'Unknown'),
      device: os,
      deviceType: deviceType,
      browser,
      ipAddress: ip,
      location,
      isp,
      method: payload.method || 'Email/Password',
      timestamp: serverTimestamp(),
    };

    if (locationType) logData.locationType = locationType;
    if (lat !== undefined) logData.lat = lat;
    if (lon !== undefined) logData.lon = lon;
    if (gpsConsentGranted !== undefined) logData.gpsConsentGranted = gpsConsentGranted;
    if (gpsConsentTimestamp !== undefined) logData.gpsConsentTimestamp = gpsConsentTimestamp;

    await addDoc(collection(db, 'login_logs'), logData);
    return true;
  } catch (error) {
    console.error("Audit Logger failed to save login event:", error);
    return false;
  }
};
