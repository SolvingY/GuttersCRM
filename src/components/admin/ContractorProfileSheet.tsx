import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import {
  dnaQuestions,
  dnaCategories,
  getCategoryScore,
  getScoreColor,
  getScoreBarColor,
  getAlignmentStars,
  getPositiveIndicators,
  getQuestionWeight,
  getQuestionWeightLabel,
  MAX_SCORE,
} from "@/lib/dnaAssessment";
import type { AlignmentCategory } from "@/lib/dnaAssessment";
import {
  Star,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Upload,
  File,
  Trash2,
  Download,
  Save,
  Loader2,
  ClipboardList,
  TrendingUp,
  PlusCircle,
  ClipboardCheck,
} from "lucide-react";
import { format } from "date-fns";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

const roleColors: Record<string, string> = {
  admin: "bg-accent text-accent-foreground",
  user: "bg-primary text-primary-foreground",
  canvasser: "bg-green-600 text-white",
};

const getCurrentQuarter = () => {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
};

interface ContractorUser {
  id: string;
  name: string;
  roles: string[];
  isArchived: boolean;
  createdAt: string;
  salesRank?: string | null;
  approvedRevenue: number;
  closedDeals: number;
  leads: number;
  points: number;
  canvasserRank?: string | null;
  leadsSet: number;
  leadsClosed: number;
  canvasserPoints: number;
  hireDate?: string | null;
  startDate?: string | null;
  dnaScore: number | null;
  alignmentCategory: string | null;
  hasAssessment: boolean;
  hasSalesMetrics: boolean;
  hasCanvasserMetrics: boolean;
  dnaPending?: boolean;
  lastLoginAt?: string | null;
  loginCount?: number;
}

interface Props {
  user: ContractorUser | null;
  open: boolean;
  onClose: () => void;
  onAssignAssessment: (userId: string) => void;
}

interface ReviewForm {
  quarter: string;
  overall_rating: number;
  review_notes: string;
  goals_set: string;
  action_items: string;
}

const defaultReviewForm = (): ReviewForm => ({
  quarter: getCurrentQuarter(),
  overall_rating: 3,
  review_notes: "",
  goals_set: "",
  action_items: "",
});

const chartConfig = {
  avg: { label: "Team Avg DNA Score", color: "hsl(var(--primary))" },
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${i < value ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"} ${onChange ? "cursor-pointer hover:text-yellow-400" : ""}`}
          onClick={() => onChange?.(i + 1)}
        />
      ))}
    </div>
  );
}

export function ContractorProfileSheet({ user, open, onClose, onAssignAssessment }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dnaOpen, setDnaOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(defaultReviewForm());
  const [savingReview, setSavingReview] = useState(false);

  // Fetch full DNA assessment data for this user
  const { data: hireApp } = useQuery({
    queryKey: ["contractor-hire-app", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("created_user_id", user!.id)
        .eq("status", "hired")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch all hired team members for DNA trend chart
  const { data: allHiredApps = [] } = useQuery({
    queryKey: ["team-trend-apps"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("job_applications")
        .select("dna_score, hired_at, full_name, created_user_id")
        .eq("status", "hired")
        .not("created_user_id", "is", null)
        .not("dna_score", "is", null)
        .order("hired_at", { ascending: true });
      return data ?? [];
    },
  });

  // Fetch performance reviews for this user
  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ["performance-reviews", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("performance_reviews" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("review_date", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  // Fetch files
  const { data: files = [], refetch: refetchFiles } = useQuery({
    queryKey: ["contractor-files", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_files")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Load admin notes when hire app data arrives
  useEffect(() => {
    if (hireApp && !notesLoaded) {
      setAdminNotes(hireApp.admin_notes || "");
      setNotesLoaded(true);
    }
  }, [hireApp, notesLoaded]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setNotesLoaded(false);
      setAdminNotes("");
      setDnaOpen(false);
      setShowReviewForm(false);
      setReviewForm(defaultReviewForm());
    }
  }, [open]);

  // Compute DNA trend data
  const trendData = allHiredApps
    .filter((a) => a.hired_at && a.dna_score != null)
    .map((entry, idx, arr) => {
      const runningScores = arr.slice(0, idx + 1).map((e) => Number(e.dna_score));
      const avg = runningScores.reduce((s, v) => s + v, 0) / runningScores.length;
      return {
        date: format(new Date(entry.hired_at!), "MMM ''yy"),
        avg: Math.round(avg * 10) / 10,
        memberName: entry.full_name,
      };
    });

  const saveNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (!hireApp) throw new Error("No hire record");
      const { error } = await supabase
        .from("job_applications")
        .update({ admin_notes: notes } as any)
        .eq("id", hireApp.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-hire-app", user?.id] });
      toast({ title: "Notes saved" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async ({ fileId, filePath }: { fileId: string; filePath: string }) => {
      await supabase.storage.from("contractor-files").remove([filePath]);
      const { error } = await supabase.from("contractor_files").delete().eq("id", fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchFiles();
      toast({ title: "File deleted" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("contractor-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from("contractor_files").insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: authUser?.id,
      } as any);

      if (dbError) throw dbError;
      refetchFiles();
      toast({ title: "File uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("contractor-files")
      .createSignedUrl(filePath, 3600);
    if (error) {
      toast({ title: "Download failed", variant: "destructive" });
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = fileName;
    a.click();
  };

  const handleSaveReview = async () => {
    if (!user) return;
    setSavingReview(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error } = await supabase.from("performance_reviews" as any).insert({
        user_id: user.id,
        reviewed_by: authUser?.id,
        quarter: reviewForm.quarter,
        overall_rating: reviewForm.overall_rating,
        review_notes: reviewForm.review_notes || null,
        goals_set: reviewForm.goals_set || null,
        action_items: reviewForm.action_items || null,
      });
      if (error) throw error;
      refetchReviews();
      setShowReviewForm(false);
      setReviewForm(defaultReviewForm());
      toast({ title: "Review saved" });
    } catch (err: any) {
      toast({ title: "Failed to save review", description: err.message, variant: "destructive" });
    } finally {
      setSavingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const { error } = await supabase.from("performance_reviews" as any).delete().eq("id", reviewId);
    if (error) {
      toast({ title: "Failed to delete review", variant: "destructive" });
      return;
    }
    refetchReviews();
    toast({ title: "Review deleted" });
  };

  if (!user) return null;

  const answers = hireApp ? (hireApp.dna_answers as Record<string, "A" | "B">) : {};
  const redFlags = hireApp ? (hireApp.red_flags as string[]) : [];
  const positiveIndicators = hireApp ? getPositiveIndicators(answers) : [];
  const dnaScore = hireApp?.dna_score ?? null;
  const scorePercent = dnaScore !== null ? Math.round((dnaScore / MAX_SCORE) * 100) : 0;
  const stars = hireApp ? getAlignmentStars(hireApp.alignment_category as AlignmentCategory) : 0;

  // Current member's score for reference line on chart
  const memberDnaScore = dnaScore;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-accent text-accent-foreground p-6">
          <SheetHeader>
            <SheetTitle className="text-accent-foreground font-heading text-2xl uppercase text-left">
              {user.name}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {user.roles.map((role) => (
              <Badge key={role} className={`text-xs ${roleColors[role] || "bg-muted"}`}>
                {role}
              </Badge>
            ))}
            {user.salesRank && <Badge variant="secondary" className="text-xs">{user.salesRank}</Badge>}
            {user.canvasserRank && <Badge variant="secondary" className="text-xs">{user.canvasserRank}</Badge>}
            {user.isArchived && <Badge variant="secondary" className="text-xs">Archived</Badge>}
            {user.dnaPending && <Badge className="text-xs bg-yellow-500 text-yellow-950">Assessment Pending</Badge>}
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-accent-foreground/80">
            {user.hireDate && (
              <span>Hired: {format(new Date(user.hireDate), "MMM d, yyyy")}</span>
            )}
            {user.startDate && (
              <span>Start: {format(new Date(user.startDate), "MMM d, yyyy")}</span>
            )}
            <span>Member since: {format(new Date(user.createdAt), "MMM d, yyyy")}</span>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-accent-foreground/70">
            <span>
              Last Login: {user.lastLoginAt ? format(new Date(user.lastLoginAt), "MMM d, yyyy 'at' h:mm a") : "Never"}
            </span>
            <span>Times Logged In: {user.loginCount ?? 0}</span>
          </div>
          {dnaScore !== null && (
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-2xl font-heading font-bold ${getScoreColor(dnaScore)}`} style={{ color: 'white', opacity: 0.9 }}>
                DNA: {dnaScore}/{MAX_SCORE}
              </span>
              <span className="text-sm text-accent-foreground/70">({user.alignmentCategory})</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Performance Stats */}
          {user.hasSalesMetrics && (
            <div>
              <h3 className="font-heading uppercase text-sm text-muted-foreground mb-3">Sales Performance</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Revenue", value: formatCurrency(user.approvedRevenue) },
                  { label: "Contracts", value: user.closedDeals },
                  { label: "Leads", value: user.leads },
                  { label: "Points", value: Number(user.points).toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-heading font-bold text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.hasCanvasserMetrics && (
            <div>
              <h3 className="font-heading uppercase text-sm text-muted-foreground mb-3">Canvasser Performance</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Leads Set", value: user.leadsSet },
                  { label: "Leads Closed", value: user.leadsClosed },
                  { label: "Points", value: Number(user.canvasserPoints).toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-heading font-bold text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DNA Assessment Section */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-4 py-3">
              <h3 className="font-heading uppercase text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                NGR DNA Assessment
              </h3>
            </div>

            {dnaScore !== null && hireApp ? (
              <div className="p-4 space-y-4">
                {/* Score bar */}
                <div>
                  <div className="flex items-end gap-2 mb-1">
                    <span className={`text-3xl font-heading ${getScoreColor(dnaScore)}`}>{dnaScore}/{MAX_SCORE}</span>
                    <span className="text-sm text-muted-foreground">({scorePercent}%)</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getScoreBarColor(dnaScore)}`}
                      style={{ width: `${scorePercent}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < stars ? "text-yellow-500 fill-yellow-500" : "text-muted"}`} />
                    ))}
                    <span className="ml-2 text-sm font-semibold">{hireApp.alignment_category}</span>
                  </div>
                </div>

                {/* Positive indicators */}
                {positiveIndicators.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {positiveIndicators.map((ind, i) => (
                      <Badge key={i} className="text-xs bg-green-50 text-green-800 border-l-4 border-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" /> {ind}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Red flags */}
                {redFlags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {redFlags.map((flag, i) => (
                      <Badge key={i} variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> {flag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Detailed breakdown collapsible */}
                <Collapsible open={dnaOpen} onOpenChange={setDnaOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      View Full DNA Breakdown
                      <ChevronDown className={`w-4 h-4 transition-transform ${dnaOpen ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 mt-3">
                    {/* Category scores summary */}
                    <div className="grid grid-cols-1 gap-2">
                      {dnaCategories.map((cat) => {
                        const { earned, total } = getCategoryScore(answers, cat);
                        const pct = total > 0 ? (earned / total) * 100 : 0;
                        return (
                          <div key={cat.name} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium">{cat.name}</span>
                              <span className={earned === total ? "text-green-600" : earned >= total / 2 ? "text-yellow-600" : "text-red-600"}>
                                {earned}/{total}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${earned === total ? "bg-green-500" : earned >= total / 2 ? "bg-yellow-500" : "bg-red-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Per-question detail */}
                    {dnaCategories.map((cat) => {
                      const { earned, total } = getCategoryScore(answers, cat);
                      return (
                        <div key={cat.name} className="border border-border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-heading uppercase text-xs">{cat.name}</h4>
                            <span className={`text-xs font-semibold ${earned === total ? "text-green-600" : earned >= total / 2 ? "text-yellow-600" : "text-red-600"}`}>
                              {earned}/{total}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {cat.questionIds.map((qId) => {
                              const q = dnaQuestions.find((dq) => dq.id === qId)!;
                              const ans = answers[qId];
                              const isB = ans === "B";
                              const weight = getQuestionWeight(qId);
                              return (
                                <div key={qId} className="border border-border rounded p-2 text-xs space-y-1">
                                  <div className="flex items-center gap-2 font-semibold">
                                    <span>Q{q.number}: {q.topic}</span>
                                    {weight >= 2 && (
                                      <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                                        {getQuestionWeightLabel(qId)}
                                      </span>
                                    )}
                                    <span className={`ml-auto ${isB ? "text-green-600" : "text-red-500"}`}>
                                      {ans}
                                    </span>
                                  </div>
                                  <div className={`p-1.5 rounded ${ans === "B" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                                    <span className="text-muted-foreground">{isB ? "B:" : "A:"}</span>{" "}
                                    {isB ? q.optionB : q.optionA}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ) : (
              <div className="p-6 text-center space-y-3">
                <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground text-sm">No DNA assessment on file for this team member.</p>
                {user.dnaPending ? (
                  <Badge className="bg-yellow-100 text-yellow-800">Assessment has been assigned — pending completion</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAssignAssessment(user.id)}
                  >
                    Assign DNA Assessment
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Team DNA Score Trend Chart */}
          {trendData.length >= 2 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/30 px-4 py-3">
                <h3 className="font-heading uppercase text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Team DNA Score Trend
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Running team average as members completed assessments
                </p>
              </div>
              <div className="p-4">
                <ChartContainer config={chartConfig} className="h-[180px] w-full">
                  <LineChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, MAX_SCORE]}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => [
                            <span key="val" className="font-mono font-bold">{value}/{MAX_SCORE}</span>,
                            "Team Avg",
                          ]}
                          labelFormatter={(label, payload) => {
                            const item = payload?.[0]?.payload;
                            return item ? `${item.memberName} joined` : label;
                          }}
                        />
                      }
                    />
                    {memberDnaScore !== null && (
                      <ReferenceLine
                        y={memberDnaScore}
                        stroke="hsl(var(--accent))"
                        strokeDasharray="4 2"
                        label={{ value: `${user.name.split(" ")[0]}: ${memberDnaScore}`, position: "insideTopRight", fontSize: 9, fill: "hsl(var(--accent))" }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="avg"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "hsl(var(--primary))" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ChartContainer>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{trendData.length} data points</span>
                  <span>
                    Latest avg: <strong className="text-foreground">{trendData[trendData.length - 1]?.avg}/{MAX_SCORE}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quarterly Performance Reviews */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
              <h3 className="font-heading uppercase text-sm flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Quarterly Performance Reviews
              </h3>
              {!showReviewForm && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-xs"
                  onClick={() => setShowReviewForm(true)}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add Review
                </Button>
              )}
            </div>

            {/* Inline Add Review Form */}
            {showReviewForm && (
              <div className="p-4 border-b border-border bg-muted/10 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Quarter</Label>
                    <Input
                      value={reviewForm.quarter}
                      onChange={(e) => setReviewForm((f) => ({ ...f, quarter: e.target.value }))}
                      placeholder="Q1 2026"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Overall Rating</Label>
                    <StarRating
                      value={reviewForm.overall_rating}
                      onChange={(v) => setReviewForm((f) => ({ ...f, overall_rating: v }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Performance Notes</Label>
                  <Textarea
                    value={reviewForm.review_notes}
                    onChange={(e) => setReviewForm((f) => ({ ...f, review_notes: e.target.value }))}
                    placeholder="How did this team member perform this quarter?"
                    rows={3}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Goals Set</Label>
                  <Textarea
                    value={reviewForm.goals_set}
                    onChange={(e) => setReviewForm((f) => ({ ...f, goals_set: e.target.value }))}
                    placeholder="Goals for next quarter..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Action Items</Label>
                  <Textarea
                    value={reviewForm.action_items}
                    onChange={(e) => setReviewForm((f) => ({ ...f, action_items: e.target.value }))}
                    placeholder="Follow-up items and action steps..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveReview} disabled={savingReview || !reviewForm.quarter}>
                    {savingReview ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                    Save Review
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowReviewForm(false);
                      setReviewForm(defaultReviewForm());
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Review History */}
            {reviews.length === 0 && !showReviewForm ? (
              <div className="p-6 text-center">
                <ClipboardCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No reviews on file yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setShowReviewForm(true)}
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  Add First Review
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {reviews.map((review: any) => (
                  <div key={review.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-heading font-bold text-sm">{review.quarter}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(review.review_date), "MMM d, yyyy")}
                        </span>
                        {review.overall_rating && (
                          <StarRating value={review.overall_rating} />
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteReview(review.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    {review.review_notes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">Notes</p>
                        <p className="text-sm">{review.review_notes}</p>
                      </div>
                    )}
                    {review.goals_set && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">Goals Set</p>
                        <p className="text-sm">{review.goals_set}</p>
                      </div>
                    )}
                    {review.action_items && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">Action Items</p>
                        <p className="text-sm">{review.action_items}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Files Section */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
              <h3 className="font-heading uppercase text-sm flex items-center gap-2">
                <File className="w-4 h-4" />
                Files & Documents
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span className="ml-1">{uploading ? "Uploading..." : "Upload"}</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv"
              />
            </div>

            {files.length === 0 ? (
              <div
                className="p-8 text-center border-2 border-dashed border-border m-4 rounded-lg cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload or drag & drop files</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, images, etc.</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {files.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20">
                    <File className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.file_size ? `${Math.round(f.file_size / 1024)}KB • ` : ""}
                        {format(new Date(f.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleDownload(f.file_path, f.file_name)}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteFileMutation.mutate({ fileId: f.id, filePath: f.file_path })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div
                  className="mt-2 p-3 border border-dashed border-border rounded-lg text-center cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <p className="text-xs text-muted-foreground">+ Add more files</p>
                </div>
              </div>
            )}
          </div>

          {/* Admin Notes */}
          {hireApp && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/30 px-4 py-3">
                <h3 className="font-heading uppercase text-sm">Admin Notes</h3>
              </div>
              <div className="p-4 space-y-3">
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  placeholder="Private admin notes about this team member..."
                />
                <Button
                  size="sm"
                  onClick={() => saveNotesMutation.mutate(adminNotes)}
                  disabled={saveNotesMutation.isPending}
                >
                  {saveNotesMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
