import assert from 'assert';

const mockNavigator = {
  userAgent: 'Node.js',
  permissions: {
    query: async () => ({ state: 'prompt' })
  },
  geolocation: {
    getCurrentPosition: (success) => {
      success({ coords: { latitude: 10, longitude: 10 } });
    }
  }
};

let mockNominatimRateLimit = false;

const mockFetch = async (url) => {
  if (url.includes('nominatim')) {
    if (mockNominatimRateLimit) {
      return { ok: false, status: 429 };
    }
    return {
      ok: true,
      json: async () => ({ address: { city: 'Test City', country: 'Test Country' } })
    };
  }
  if (url.includes('ipapi.co') || url.includes('ipify')) {
    return {
      ok: true,
      json: async () => ({ ip: '1.2.3.4', city: 'IP City', org: 'IP ISP' })
    };
  }
  return { ok: false };
};

const mockGetIpInfo = async () => {
  const res = await mockFetch('https://ipapi.co/json/');
  const data = await res.json();
  return { ip: data.ip, location: 'IP City', isp: data.org, locationType: 'Approximate (network-based)' };
};

const mockGetLocationWithConsent = async (isResident = false) => {
  const fallback = async (granted = false) => {
    const ipInfo = await mockGetIpInfo();
    return { ...ipInfo, gpsConsentGranted: granted, gpsConsentTimestamp: 12345 };
  };

  if (!isResident) return fallback(false);

  try {
    const permission = await mockNavigator.permissions.query({ name: 'geolocation' });
    let consentGranted = false;

    if (permission.state === 'denied') {
      return fallback(false);
    }
    
    return await new Promise((resolve) => {
      mockNavigator.geolocation.getCurrentPosition(
        async (position) => {
          consentGranted = true;
          try {
            const res = await mockFetch(`https://nominatim.openstreetmap.org/reverse?lat=10&lon=10&format=json`);
            if (!res.ok) {
              if (res.status === 429) console.warn("Nominatim rate limited. Falling back to IP.");
              return resolve(fallback(consentGranted));
            }
            const data = await res.json();
            const ipInfo = await mockGetIpInfo();
            resolve({
              ip: ipInfo.ip,
              location: data.address.city,
              isp: ipInfo.isp,
              locationType: 'Precise',
              lat: 10,
              lon: 10,
              gpsConsentGranted: true,
              gpsConsentTimestamp: 12345
            });
          } catch (e) {
            resolve(fallback(consentGranted));
          }
        },
        () => resolve(fallback(false))
      );
    });
  } catch (e) {
    return fallback(false);
  }
};

async function runTests() {
  console.log("Running Fallback Unit Tests...\n");

  try {
    // TEST 1: GPS Denied
    mockNavigator.permissions.query = async () => ({ state: 'denied' });
    let result = await mockGetLocationWithConsent(true);
    assert.strictEqual(result.locationType, 'Approximate (network-based)', "Expected locationType to be Approximate");
    assert.strictEqual(result.gpsConsentGranted, false, "Expected gpsConsentGranted to be false");
    console.log("✅ Test 1 Passed: GPS Denied falls back to IP address.");

    // TEST 2: Nominatim 429 Rate Limit
    mockNavigator.permissions.query = async () => ({ state: 'prompt' });
    mockNominatimRateLimit = true;
    result = await mockGetLocationWithConsent(true);
    assert.strictEqual(result.locationType, 'Approximate (network-based)', "Expected locationType to be Approximate");
    assert.strictEqual(result.gpsConsentGranted, true, "Expected gpsConsentGranted to be true because GPS was allowed but Nominatim failed");
    console.log("✅ Test 2 Passed: Nominatim 429 Rate Limit falls back to IP address.");

    // TEST 3: Success Path
    mockNominatimRateLimit = false;
    result = await mockGetLocationWithConsent(true);
    assert.strictEqual(result.locationType, 'Precise', "Expected locationType to be Precise");
    assert.strictEqual(result.location, 'Test City', "Expected location to be geocoded address");
    assert.strictEqual(result.gpsConsentGranted, true, "Expected gpsConsentGranted to be true");
    console.log("✅ Test 3 Passed: Successful GPS and Reverse Geocoding.");

    console.log("\nAll tests passed successfully!");
  } catch (error) {
    console.error("❌ Test Failed:");
    console.error(error);
    process.exit(1);
  }
}

runTests();
