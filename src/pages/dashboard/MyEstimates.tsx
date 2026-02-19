import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function MyEstimates() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["my-standalone-estimates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gutter_estimates")
        .select("*")
        .is("lead_id", null)
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <Link to="/dashboard/tools" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Tools
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-1 text-foreground">My Estimates</h1>
      <p className="text-muted-foreground text-sm mb-6">Your saved standalone estimates (not linked to a lead).</p>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : estimates.length === 0 ? (
        <div className="text-center py-16 border border-border rounded-lg">
          <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: "#e53935" }} />
          <h2 className="text-lg font-bold mb-2">No standalone estimates saved yet</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Use the Gutter Estimator to create and save your first estimate.
          </p>
          <Button onClick={() => navigate("/dashboard/tools/estimator")} style={{ background: "#e53935" }} className="text-white">
            Open Gutter Estimator
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Customer Name</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Quoted Price</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Commission</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(estimates as any[]).map((est: any) => (
                <tr key={est.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(est.created_at).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 font-medium">{est.customer_name || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">${Number(est.quoted_price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">${Number(est.commission || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/dashboard/tools/estimator", { state: { existingEstimate: est } })}
                    >
                      Open &amp; Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
