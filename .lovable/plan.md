

# Paste Google Maps Link for Geofence Setup

Replace the separate Latitude/Longitude inputs in the "Add Work Zone" modal with a single textarea that accepts Google Maps links, embed URLs, or raw coordinates.

## How It Works

The user can paste any of these formats:
- Google Maps share link: `https://www.google.com/maps/place/.../@35.4676,-97.5164,...`
- Google Maps embed iframe: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3249.129...`
- Short link: `https://maps.app.goo.gl/...` (raw coords fallback)
- Raw coordinates: `35.4676, -97.5164`

The screenshot shows the user copying an embed iframe from Google Maps — the parser will handle that format too.

## Changes

### `src/pages/admin/AdminTimeClock.tsx`

**1. Replace `zoneLat`/`zoneLng` state with a single `zoneLocation` string + parsed state**
- Remove `zoneLat` and `zoneLng` state variables
- Add `zoneLocation` (raw paste input) and `parsedCoords` (`{lat, lng} | null`) state

**2. Add a `parseCoordinates` function**
Extracts lat/lng from pasted text using these strategies in order:
- Google Maps `@lat,lng` pattern: `/@(-?\d+\.\d+),(-?\d+\.\d+)/`
- Google Maps `?q=lat,lng` pattern
- Google Maps embed `!2d` (lng) and `!3d` (lat) markers: `!3d(-?\d+\.\d+).*!2d(-?\d+\.\d+)` or `!2d(-?\d+\.\d+).*!3d(-?\d+\.\d+)`
- Raw coordinate pair: `(-?\d+\.\d+),\s*(-?\d+\.\d+)`

**3. Update the Add Zone modal UI**
- Replace the lat/lng grid with a single `<Textarea>` labeled "Google Maps Link or Coordinates"
- Placeholder: `Paste a Google Maps link, embed code, or coordinates (e.g. 35.4676, -97.5164)`
- On change, run `parseCoordinates` and show a green confirmation line: "Detected: 35.4676, -97.5164" with a small "View on Maps" link, or a red warning if parsing fails
- Keep Zone Name and Radius inputs as-is

**4. Update `handleAddZone` validation and insert**
- Use `parsedCoords.lat` and `parsedCoords.lng` instead of `parseFloat(zoneLat/zoneLng)`
- Disable the Add button when `!parsedCoords` instead of `!zoneLat || !zoneLng`
- Reset `zoneLocation` and `parsedCoords` on close

