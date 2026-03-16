import { ProspectMapWidget } from "@/components/canvasser/ProspectMapWidget";

export default function CanvasserMap() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl uppercase">Prospect Map</h1>
        <p className="text-sm text-muted-foreground">
          Drop pins on every door you knock — track status, notes, and create leads
        </p>
      </div>
      <ProspectMapWidget />
    </div>
  );
}
