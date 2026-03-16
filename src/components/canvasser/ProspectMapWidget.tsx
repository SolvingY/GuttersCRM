import { useState, useEffect, useCallback, useMemo } from "react";
import { GoogleMap, useLoadScript, MarkerF } from "@react-google-maps/api";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

const STATUS_CONFIG = {
  not_home: { label: "Not Home", color: "#9CA3AF" },
  not_interested: { label: "Not Interested", color: "#EF4444" },
  no_soliciting: { label: "No Soliciting", color: "#111827" },
  damage_identified: { label: "Damage Identified", color: "#F97316" },
  appointment_set: { label: "Appointment Set", color: "#22C55E" },
  follow_up: { label: "Follow Up", color: "#EAB308" },
} as const;

type PinStatus = keyof typeof STATUS_CONFIG;

interface ProspectPin {
  id: string;
  canvasser_id: string;
  lat: number;
  lng: number;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: PinStatus;
  notes: string | null;
  photo_urls: string[];
  quote_request_id: string | null;
  pinned_at: string;
  updated_at: string;
  created_at: string;
}

const OKC_CENTER = { lat: 35.4676, lng: -97.5164 };

function createMarkerIcon(color: string) {
  return {
    path: "M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9zm0 12.75c-2.07 0-3.75-1.68-3.75-3.75S9.93 5.25 12 5.25 15.75 6.93 15.75 9 14.07 12.75 12 12.75z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 1.5,
    scale: 1.5,
    anchor: { x: 12, y: 24 } as google.maps.Point,
  };
}

export function ProspectMapWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  const [center, setCenter] = useState(OKC_CENTER);
  const [pins, setPins] = useState<ProspectPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<PinStatus | "all">("all");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPin, setEditingPin] = useState<ProspectPin | null>(null);
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("Oklahoma");
  const [formZip, setFormZip] = useState("");
  const [formLat, setFormLat] = useState(0);
  const [formLng, setFormLng] = useState(0);
  const [formStatus, setFormStatus] = useState<PinStatus>("not_home");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Get user's GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // fallback to OKC
      );
    }
  }, []);

  // Fetch pins
  const fetchPins = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("prospect_pins")
      .select("*")
      .order("pinned_at", { ascending: false });

    if (!error && data) {
      setPins(data as unknown as ProspectPin[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  // Reverse geocode
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.results?.[0]) {
        const result = data.results[0];
        const components = result.address_components || [];
        const getComponent = (type: string) =>
          components.find((c: any) => c.types.includes(type))?.long_name || "";

        const streetNumber = getComponent("street_number");
        const route = getComponent("route");
        const addr = [streetNumber, route].filter(Boolean).join(" ");

        setFormAddress(addr || result.formatted_address || "");
        setFormCity(getComponent("locality") || getComponent("sublocality") || "");
        setFormState(getComponent("administrative_area_level_1") || "Oklahoma");
        setFormZip(getComponent("postal_code") || "");
      }
    } catch {
      // Keep empty fields
    } finally {
      setGeocoding(false);
    }
  }, []);

  // Map click -> new pin
  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      setEditingPin(null);
      setFormLat(lat);
      setFormLng(lng);
      setFormStatus("not_home");
      setFormNotes("");
      setFormAddress("");
      setFormCity("");
      setFormState("Oklahoma");
      setFormZip("");
      setDrawerOpen(true);
      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  // Marker click -> edit pin
  const handleMarkerClick = useCallback((pin: ProspectPin) => {
    setEditingPin(pin);
    setFormLat(pin.lat);
    setFormLng(pin.lng);
    setFormAddress(pin.address || "");
    setFormCity(pin.city || "");
    setFormState(pin.state || "Oklahoma");
    setFormZip(pin.zip || "");
    setFormStatus(pin.status);
    setFormNotes(pin.notes || "");
    setDrawerOpen(true);
  }, []);

  // Save pin
  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      if (editingPin) {
        // Update existing pin
        const { error } = await supabase
          .from("prospect_pins")
          .update({
            status: formStatus,
            notes: formNotes || null,
            address: formAddress || null,
            city: formCity || null,
            state: formState || null,
            zip: formZip || null,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", editingPin.id);

        if (error) throw error;
        toast.success("Pin updated");
      } else {
        // Insert new pin
        const { data, error } = await supabase
          .from("prospect_pins")
          .insert({
            canvasser_id: user.id,
            lat: formLat,
            lng: formLng,
            address: formAddress || null,
            city: formCity || null,
            state: formState || null,
            zip: formZip || null,
            status: formStatus,
            notes: formNotes || null,
          } as any)
          .select()
          .single();

        if (error) throw error;

        if (formStatus === "appointment_set" && data) {
          setDrawerOpen(false);
          navigate("/canvasser/create-lead", {
            state: {
              fromPin: true,
              pinId: (data as any).id,
              address: formAddress,
              city: formCity,
              state: formState,
              zip: formZip,
            },
          });
          return;
        }

        if (formStatus === "damage_identified") {
          toast.info("Damage logged. Create a lead when ready.");
        } else {
          toast.success("Pin saved");
        }
      }

      setDrawerOpen(false);
      fetchPins();
    } catch (err: any) {
      toast.error(err.message || "Failed to save pin");
    } finally {
      setSaving(false);
    }
  }, [user?.id, editingPin, formLat, formLng, formAddress, formCity, formState, formZip, formStatus, formNotes, navigate, fetchPins]);

  // Handle "Create Lead" from existing pin
  const handleCreateLeadFromPin = useCallback(() => {
    if (!editingPin) return;
    setDrawerOpen(false);
    navigate("/canvasser/create-lead", {
      state: {
        fromPin: true,
        pinId: editingPin.id,
        address: editingPin.address || "",
        city: editingPin.city || "",
        state: editingPin.state || "Oklahoma",
        zip: editingPin.zip || "",
      },
    });
  }, [editingPin, navigate]);

  // Filtered pins
  const filteredPins = useMemo(
    () => (activeFilter === "all" ? pins : pins.filter((p) => p.status === activeFilter)),
    [pins, activeFilter]
  );

  // Today's pin counts
  const todayCounts = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayPins = pins.filter((p) => p.pinned_at?.startsWith(todayStr));
    return {
      total: todayPins.length,
      appointments: todayPins.filter((p) => p.status === "appointment_set").length,
      damage: todayPins.filter((p) => p.status === "damage_identified").length,
    };
  }, [pins]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[350px] md:h-[500px] border border-border rounded-lg bg-muted/30">
        <p className="text-sm text-destructive">Failed to load Google Maps. Check your API key.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[350px] md:h-[500px] border border-border rounded-lg bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={activeFilter === "all" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setActiveFilter("all")}
        >
          All
        </Badge>
        {(Object.keys(STATUS_CONFIG) as PinStatus[]).map((status) => (
          <Badge
            key={status}
            variant={activeFilter === status ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setActiveFilter(status)}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1.5"
              style={{ backgroundColor: STATUS_CONFIG[status].color }}
            />
            {STATUS_CONFIG[status].label}
          </Badge>
        ))}
      </div>

      {/* Pin count summary */}
      <p className="text-xs text-muted-foreground">
        Today: {todayCounts.total} pins · Appointments: {todayCounts.appointments} · Damage: {todayCounts.damage}
      </p>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border border-border">
        <GoogleMap
          mapContainerClassName="h-[350px] md:h-[500px] w-full"
          center={center}
          zoom={16}
          onClick={handleMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {filteredPins.map((pin) => (
            <MarkerF
              key={pin.id}
              position={{ lat: pin.lat, lng: pin.lng }}
              icon={createMarkerIcon(STATUS_CONFIG[pin.status]?.color || "#9CA3AF")}
              onClick={() => handleMarkerClick(pin)}
            />
          ))}
        </GoogleMap>
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground text-center">Loading pins…</p>
      )}

      {/* Pin Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {editingPin ? "Edit Pin" : "Drop Pin"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Address */}
            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              {geocoding ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Geocoding…
                </div>
              ) : (
                <p className="text-sm font-medium">
                  {[formAddress, formCity, formState, formZip].filter(Boolean).join(", ") || "Unknown location"}
                </p>
              )}
            </div>

            {/* Status selector */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Status</Label>
              <RadioGroup
                value={formStatus}
                onValueChange={(v) => setFormStatus(v as PinStatus)}
                className="grid grid-cols-2 gap-2"
              >
                {(Object.keys(STATUS_CONFIG) as PinStatus[]).map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <RadioGroupItem value={status} id={`status-${status}`} />
                    <Label htmlFor={`status-${status}`} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_CONFIG[status].color }}
                      />
                      {STATUS_CONFIG[status].label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="pin-notes" className="text-xs text-muted-foreground">
                Notes (optional)
              </Label>
              <Textarea
                id="pin-notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Any observations…"
                rows={2}
              />
            </div>

            {/* Create Lead button for existing appointment_set pin without a lead */}
            {editingPin && editingPin.status === "appointment_set" && !editingPin.quote_request_id && (
              <Button variant="outline" className="w-full" onClick={handleCreateLeadFromPin}>
                Create Lead from This Pin
              </Button>
            )}
          </div>

          <DrawerFooter className="flex-row gap-2">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1">
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </DrawerClose>
            <Button className="flex-1" onClick={handleSave} disabled={saving || geocoding}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editingPin ? "Update" : "Save Pin"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
