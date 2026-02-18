import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SupplementJob {
  id: string;
  job_number: string | null;
  client_name: string;
  insurance_carrier: string | null;
  status: string;
  rcv_increase: number;
  money_collected: number;
  assigned_at: string;
  coc_bonus_points: number;
}

export default function SupplementerJobsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<SupplementJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newJob, setNewJob] = useState({ client_name: "", job_number: "", insurance_carrier: "", claim_number: "", property_address: "" });

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setShowNewDialog(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) fetchJobs();
  }, [user, statusFilter]);

  const fetchJobs = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("supplement_jobs")
      .select("id, job_number, client_name, insurance_carrier, status, rcv_increase, money_collected, assigned_at, coc_bonus_points")
      .eq("supplementer_id", user.id)
      .order("assigned_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) console.error("Error fetching jobs:", error);
    else setJobs(data || []);
    setLoading(false);
  };

  const handleCreateJob = async () => {
    if (!user || !newJob.client_name.trim()) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("supplement_jobs")
      .insert({
        supplementer_id: user.id,
        client_name: newJob.client_name.trim(),
        job_number: newJob.job_number.trim() || null,
        insurance_carrier: newJob.insurance_carrier.trim() || null,
        claim_number: newJob.claim_number.trim() || null,
        property_address: newJob.property_address.trim() || null,
        created_by: user.id,
        last_modified_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job Created", description: "New supplement job created." });
      setShowNewDialog(false);
      setNewJob({ client_name: "", job_number: "", insurance_carrier: "", claim_number: "", property_address: "" });
      if (data) navigate(`/supplementer/jobs/${data.id}`);
    }
    setCreating(false);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const statusColors: Record<string, string> = {
    active: "bg-blue-100 text-blue-800",
    coc_pending: "bg-yellow-100 text-yellow-800",
    depreciation_pending: "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    closed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Supplement Jobs</h1>
          <p className="text-muted-foreground mt-1">Manage your supplement tracking</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="coc_pending">COC Pending</SelectItem>
            <SelectItem value="depreciation_pending">Depreciation Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead className="text-right">RCV Increase</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No jobs found
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/supplementer/jobs/${job.id}`)}
                  >
                    <TableCell className="font-medium">{job.job_number || "-"}</TableCell>
                    <TableCell>{job.client_name}</TableCell>
                    <TableCell>{job.insurance_carrier || "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(job.rcv_increase) || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(job.money_collected) || 0)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[job.status] || "bg-muted"}>
                        {job.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(job.assigned_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* New Job Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Supplement Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client Name *</Label>
              <Input value={newJob.client_name} onChange={(e) => setNewJob({ ...newJob, client_name: e.target.value })} placeholder="Enter client name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Number</Label>
                <Input value={newJob.job_number} onChange={(e) => setNewJob({ ...newJob, job_number: e.target.value })} placeholder="e.g., NGR-2026-001" />
              </div>
              <div className="space-y-2">
                <Label>Insurance Carrier</Label>
                <Input value={newJob.insurance_carrier} onChange={(e) => setNewJob({ ...newJob, insurance_carrier: e.target.value })} placeholder="e.g., State Farm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Claim Number</Label>
              <Input value={newJob.claim_number} onChange={(e) => setNewJob({ ...newJob, claim_number: e.target.value })} placeholder="Claim number" />
            </div>
            <div className="space-y-2">
              <Label>Property Address</Label>
              <Input value={newJob.property_address} onChange={(e) => setNewJob({ ...newJob, property_address: e.target.value })} placeholder="Property address" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateJob} disabled={creating || !newJob.client_name.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
