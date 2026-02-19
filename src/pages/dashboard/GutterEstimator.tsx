import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import NGRGutterCalculator from "@/components/NGRGutterCalculator";

export default function GutterEstimator() {
  const location = useLocation();
  const existingEstimate = (location.state as any)?.existingEstimate || null;

  return (
    <div>
      <div className="p-4">
        <Link to="/dashboard/tools" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Tools
        </Link>
      </div>
      <NGRGutterCalculator existingEstimate={existingEstimate} />
    </div>
  );
}
