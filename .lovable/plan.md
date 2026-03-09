

# Add Map Preview Thumbnail in Geofence Zone Setup

## Change

### `src/pages/admin/AdminTimeClock.tsx`

After the "Detected: lat, lng" confirmation line (around line 769), add a Google Maps Static Map-style preview using a Google Maps embed iframe. When `parsedCoords` is detected, render a small iframe showing the location:

```tsx
{zoneLocation && parsedCoords && (
  <>
    <p className="text-xs text-green-600 flex items-center gap-1">
      <MapPin className="h-3 w-3" />
      Detected: {parsedCoords.lat.toFixed(6)}, {parsedCoords.lng.toFixed(6)}
      <a href={...} target="_blank" ...>View on Maps</a>
    </p>
    <div className="rounded-md overflow-hidden border h-40 w-full">
      <iframe
        width="100%" height="100%" frameBorder="0" style={{border:0}}
        src={`https://maps.google.com/maps?q=${parsedCoords.lat},${parsedCoords.lng}&z=15&output=embed`}
        allowFullScreen
      />
    </div>
  </>
)}
```

This uses the free Google Maps embed URL (no API key required) to show a small interactive map preview directly in the modal. No new dependencies or state needed.

