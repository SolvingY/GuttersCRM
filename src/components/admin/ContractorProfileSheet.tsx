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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
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
  User,
  Briefcase,
  Lock,
  FolderOpen,
  Circle,
  Send,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { PerformanceReviewForm, ReviewScoreBreakdown, defaultReviewFormData } from "./PerformanceReviewForm";
import type { ReviewFormData } from "./PerformanceReviewForm";
import { ProfilePDFExport } from "./ProfilePDFExport";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

const roleColors: Record<string, string> = {
  admin: "bg-accent text-accent-foreground",
  user: "bg-primary text-primary-foreground",
  canvasser: "bg-green-600 text-white",
};

export interface ContractorUser {
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

const COMPENSATION_TYPES = [
  { value: "hourly", label: "Hourly" },
  { value: "retainer", label: "Retainer" },
  { value: "commission", label: "Commission" },
  { value: "profit_split", label: "Profit Split" },
];

export function ContractorProfileSheet({ user, open, onClose, onAssignAssessment }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dnaOpen, setDnaOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewFormData>(defaultReviewFormData());
  const [savingReview, setSavingReview] = useState(false);
  const [uploadCategoryId, setUploadCategoryId] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Personal/contract info state
  const [personalInfo, setPersonalInfo] = useState<Record<string, any>>({});
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Fetch profile extended fields
  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ["contractor-profile-ext", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("phone, birthday, start_date, street_address, city, state, zip_code, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, compensation_type, hourly_rate, retainer_annual, commission_percentage, profit_split_percentage, manager_id")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch admins for manager dropdown
  const { data: adminUsers = [] } = useQuery({
    queryKey: ["admin-users-list"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (!roles || roles.length === 0) return [];
      const ids = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      return profiles ?? [];
    },
  });

  // Fetch document categories
  const { data: docCategories = [] } = useQuery({
    queryKey: ["doc-categories"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_document_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

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

  // Fetch onboarding progress
  const { data: onboardingProgress = [] } = useQuery({
    queryKey: ["contractor-onboarding", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_onboarding_progress")
        .select("*, step:onboarding_steps(step_key, step_name, step_type, required, sort_order)")
        .eq("user_id", user!.id)
        .order("step(sort_order)");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch pending mandatory actions for this user
  const { data: memberMandatoryActions = [], refetch: refetchActions } = useQuery({
    queryKey: ["contractor-mandatory-actions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mandatory_actions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Load profile data into personal info state
  useEffect(() => {
    if (profileData) {
      setPersonalInfo(profileData as any);
    }
  }, [profileData]);

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
      setReviewForm(defaultReviewFormData());
      setCategoryFilter("all");
      setUploadCategoryId("");
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

  // Save personal/contract info
  const handleSavePersonalInfo = async () => {
    if (!user) return;
    setSavingPersonal(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          phone: personalInfo.phone || null,
          birthday: personalInfo.birthday || null,
          start_date: personalInfo.start_date || null,
          street_address: personalInfo.street_address || null,
          city: personalInfo.city || null,
          state: personalInfo.state || null,
          zip_code: personalInfo.zip_code || null,
          emergency_contact_name: personalInfo.emergency_contact_name || null,
          emergency_contact_phone: personalInfo.emergency_contact_phone || null,
          emergency_contact_relationship: personalInfo.emergency_contact_relationship || null,
          compensation_type: personalInfo.compensation_type || null,
          hourly_rate: personalInfo.hourly_rate || null,
          retainer_annual: personalInfo.retainer_annual || null,
          commission_percentage: personalInfo.commission_percentage || null,
          profit_split_percentage: personalInfo.profit_split_percentage || null,
          manager_id: personalInfo.manager_id || null,
        } as any)
        .eq("id", user.id);
      if (error) throw error;
      refetchProfile();
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSavingPersonal(false);
    }
  };

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
        category_id: uploadCategoryId || null,
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
        communication_score: reviewForm.communication_score,
        productivity_score: reviewForm.productivity_score,
        quality_score: reviewForm.quality_score,
        teamwork_score: reviewForm.teamwork_score,
        reliability_score: reviewForm.reliability_score,
        customer_service_score: reviewForm.customer_service_score,
        review_notes: reviewForm.review_notes || null,
        goals_set: reviewForm.goals_set || null,
        action_items: reviewForm.action_items || null,
        strengths: reviewForm.strengths || null,
        areas_for_improvement: reviewForm.areas_for_improvement || null,
        manager_signature: reviewForm.manager_signature || null,
        contractor_signature: reviewForm.contractor_acknowledged ? (reviewForm.contractor_signature || null) : null,
        contractor_acknowledged_at: reviewForm.contractor_acknowledged ? new Date().toISOString() : null,
      });
      if (error) throw error;
      refetchReviews();
      setShowReviewForm(false);
      setReviewForm(defaultReviewFormData());
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
  const memberDnaScore = dnaScore;

  // Group files by category
  const getCategoryName = (catId: string | null) => {
    if (!catId) return "Uncategorized";
    const cat = docCategories.find((c: any) => c.id === catId);
    return cat ? cat.name : "Uncategorized";
  };

  const filteredFiles = categoryFilter === "all"
    ? files
    : files.filter((f: any) => (f as any).category_id === categoryFilter);

  const filesGroupedByCategory = filteredFiles.reduce((acc: Record<string, any[]>, f: any) => {
    const catName = getCategoryName((f as any).category_id);
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(f);
    return acc;
  }, {});

  const managerName = personalInfo.manager_id
    ? adminUsers.find((a: any) => a.id === personalInfo.manager_id)?.full_name || null
    : null;

  // Build PDF data
  const pdfData = {
    name: user.name,
    roles: user.roles,
    phone: personalInfo.phone,
    birthday: personalInfo.birthday,
    startDate: personalInfo.start_date,
    streetAddress: personalInfo.street_address,
    city: personalInfo.city,
    state: personalInfo.state,
    zipCode: personalInfo.zip_code,
    emergencyContactName: personalInfo.emergency_contact_name,
    emergencyContactPhone: personalInfo.emergency_contact_phone,
    emergencyContactRelationship: personalInfo.emergency_contact_relationship,
    compensationType: personalInfo.compensation_type,
    hourlyRate: personalInfo.hourly_rate,
    retainerAnnual: personalInfo.retainer_annual,
    commissionPercentage: personalInfo.commission_percentage,
    profitSplitPercentage: personalInfo.profit_split_percentage,
    managerName,
    approvedRevenue: user.approvedRevenue,
    closedDeals: user.closedDeals,
    leads: user.leads,
    points: user.points,
    leadsSet: user.leadsSet,
    leadsClosed: user.leadsClosed,
    canvasserPoints: user.canvasserPoints,
    dnaScore: user.dnaScore,
    alignmentCategory: user.alignmentCategory,
    reviews,
    files: files.map((f: any) => ({ ...f, category_name: getCategoryName((f as any).category_id) })),
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-accent text-accent-foreground p-6">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <SheetTitle className="text-accent-foreground font-heading text-2xl uppercase text-left">
                {user.name}
              </SheetTitle>
              <ProfilePDFExport data={pdfData} />
            </div>
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
            {personalInfo.start_date && (
              <span>Contract Start: {format(new Date(personalInfo.start_date), "MMM d, yyyy")}</span>
            )}
            {!personalInfo.start_date && user.hireDate && (
              <span>Contract Start: {format(new Date(user.hireDate), "MMM d, yyyy")}</span>
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
          {/* Onboarding Status Section */}
          {onboardingProgress.length > 0 && (() => {
            const completed = onboardingProgress.filter((p: any) => p.status === "completed").length;
            const total = onboardingProgress.length;
            const pct = Math.round((completed / total) * 100);
            const isComplete = pct === 100;
            const pendingActions = memberMandatoryActions.filter((a: any) => a.status === "pending");

            return (
              <div className={`border rounded-lg overflow-hidden ${isComplete ? "border-green-200" : "border-amber-200"}`}>
                <div className={`px-4 py-3 flex items-center justify-between ${isComplete ? "bg-green-50" : "bg-amber-50"}`}>
                  <h3 className="font-heading uppercase text-sm flex items-center gap-2">
                    {isComplete ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    Onboarding {isComplete ? "Complete" : `In Progress (${pct}%)`}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{completed}/{total} steps</span>
                    <Progress value={pct} className="w-20 h-1.5" />
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {onboardingProgress
                      .sort((a: any, b: any) => (a.step?.sort_order || 0) - (b.step?.sort_order || 0))
                      .map((p: any) => (
                        <div
                          key={p.id}
                          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                            p.status === "completed"
                              ? "bg-green-50 text-green-700"
                              : "bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          {p.status === "completed" ? (
                            <CheckCircle className="w-3 h-3 shrink-0" />
                          ) : (
                            <Circle className="w-3 h-3 shrink-0" />
                          )}
                          <span className="truncate">{p.step?.step_name}</span>
                        </div>
                      ))}
                  </div>

                  {/* Pending mandatory actions */}
                  {pendingActions.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Pending Mandatory Actions</p>
                      {pendingActions.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200 text-sm">
                          <span>{a.title}</span>
                          <div className="flex items-center gap-1.5">
                            {a.blocks_access && (
                              <Badge className="bg-red-100 text-red-800 text-[10px]">Blocks</Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={async () => {
                                await supabase.from("mandatory_actions").update({ status: "dismissed" }).eq("id", a.id);
                                refetchActions();
                                toast({ title: "Action dismissed" });
                              }}
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Personal Information Section */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-4 py-3">
              <h3 className="font-heading uppercase text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                Personal Information
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={personalInfo.phone || ""}
                    onChange={(e) => setPersonalInfo((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="(555) 555-5555"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Birthday</Label>
                  <Input
                    type="date"
                    value={personalInfo.birthday || ""}
                    onChange={(e) => setPersonalInfo((p) => ({ ...p, birthday: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Street Address</Label>
                <Input
                  value={personalInfo.street_address || ""}
                  onChange={(e) => setPersonalInfo((p) => ({ ...p, street_address: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">City</Label>
                  <Input
                    value={personalInfo.city || ""}
                    onChange={(e) => setPersonalInfo((p) => ({ ...p, city: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">State</Label>
                  <Input
                    value={personalInfo.state || "Oklahoma"}
                    onChange={(e) => setPersonalInfo((p) => ({ ...p, state: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Zip Code</Label>
                  <Input
                    value={personalInfo.zip_code || ""}
                    onChange={(e) => setPersonalInfo((p) => ({ ...p, zip_code: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="border-t border-border pt-3 mt-3">
                <Label className="text-xs font-heading uppercase text-muted-foreground">Emergency Contact</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={personalInfo.emergency_contact_name || ""}
                      onChange={(e) => setPersonalInfo((p) => ({ ...p, emergency_contact_name: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={personalInfo.emergency_contact_phone || ""}
                      onChange={(e) => setPersonalInfo((p) => ({ ...p, emergency_contact_phone: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Relationship</Label>
                    <Input
                      value={personalInfo.emergency_contact_relationship || ""}
                      onChange={(e) => setPersonalInfo((p) => ({ ...p, emergency_contact_relationship: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Information Section */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-4 py-3">
              <h3 className="font-heading uppercase text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Contract Information
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Contract Start Date</Label>
                  <Input
                    type="date"
                    value={personalInfo.start_date || ""}
                    onChange={(e) => setPersonalInfo((p) => ({ ...p, start_date: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Manager</Label>
                  <Select
                    value={personalInfo.manager_id || ""}
                    onValueChange={(v) => setPersonalInfo((p) => ({ ...p, manager_id: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {adminUsers.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Compensation Type</Label>
                  <Select
                    value={personalInfo.compensation_type || ""}
                    onValueChange={(v) => setPersonalInfo((p) => ({ ...p, compensation_type: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPENSATION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  {personalInfo.compensation_type === "hourly" && (
                    <>
                      <Label className="text-xs">Hourly Rate ($)</Label>
                      <Input
                        type="number"
                        value={personalInfo.hourly_rate || ""}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, hourly_rate: e.target.value ? Number(e.target.value) : null }))}
                        className="h-8 text-sm"
                      />
                    </>
                  )}
                  {personalInfo.compensation_type === "retainer" && (
                    <>
                      <Label className="text-xs">Annual Retainer ($)</Label>
                      <Input
                        type="number"
                        value={personalInfo.retainer_annual || ""}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, retainer_annual: e.target.value ? Number(e.target.value) : null }))}
                        className="h-8 text-sm"
                      />
                    </>
                  )}
                  {personalInfo.compensation_type === "commission" && (
                    <>
                      <Label className="text-xs">Commission Percentage (%)</Label>
                      <Input
                        type="number"
                        value={personalInfo.commission_percentage || ""}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, commission_percentage: e.target.value ? Number(e.target.value) : null }))}
                        className="h-8 text-sm"
                      />
                    </>
                  )}
                  {personalInfo.compensation_type === "profit_split" && (
                    <>
                      <Label className="text-xs">Profit Split Percentage (%)</Label>
                      <Input
                        type="number"
                        value={personalInfo.profit_split_percentage || ""}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, profit_split_percentage: e.target.value ? Number(e.target.value) : null }))}
                        className="h-8 text-sm"
                      />
                    </>
                  )}
                  {!personalInfo.compensation_type && (
                    <div className="h-8" />
                  )}
                </div>
              </div>
              <Button size="sm" onClick={handleSavePersonalInfo} disabled={savingPersonal}>
                {savingPersonal ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                Save Profile
              </Button>
            </div>
          </div>

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

            {/* Enhanced Review Form */}
            {showReviewForm && (
              <PerformanceReviewForm
                form={reviewForm}
                onChange={setReviewForm}
                onSave={handleSaveReview}
                onCancel={() => {
                  setShowReviewForm(false);
                  setReviewForm(defaultReviewFormData());
                }}
                saving={savingReview}
              />
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
                    {/* Score breakdown */}
                    <ReviewScoreBreakdown review={review} />
                    {review.strengths && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">Strengths</p>
                        <p className="text-sm">{review.strengths}</p>
                      </div>
                    )}
                    {review.areas_for_improvement && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-0.5">Areas for Improvement</p>
                        <p className="text-sm">{review.areas_for_improvement}</p>
                      </div>
                    )}
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
                    {(review.manager_signature || review.contractor_signature) && (
                      <div className="border-t border-border pt-2 mt-2 flex gap-4 text-xs text-muted-foreground">
                        {review.manager_signature && <span>Manager: {review.manager_signature}</span>}
                        {review.contractor_signature && (
                          <span>Contractor: {review.contractor_signature} {review.contractor_acknowledged_at && `(${format(new Date(review.contractor_acknowledged_at), "MMM d, yyyy")})`}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Files & Documents Section */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
              <h3 className="font-heading uppercase text-sm flex items-center gap-2">
                <File className="w-4 h-4" />
                Files & Documents
              </h3>
              <div className="flex items-center gap-2">
                <Select value={uploadCategoryId} onValueChange={setUploadCategoryId}>
                  <SelectTrigger className="h-7 text-xs w-[130px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {docCategories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span className="ml-1">{uploading ? "Uploading..." : "Upload"}</span>
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv"
              />
            </div>

            {/* Category filter */}
            {files.length > 0 && (
              <div className="px-4 py-2 border-b border-border flex gap-1 flex-wrap">
                <Button
                  size="sm"
                  variant={categoryFilter === "all" ? "default" : "ghost"}
                  className="h-6 text-xs px-2"
                  onClick={() => setCategoryFilter("all")}
                >
                  All
                </Button>
                {docCategories.map((c: any) => {
                  const count = files.filter((f: any) => (f as any).category_id === c.id).length;
                  if (count === 0) return null;
                  return (
                    <Button
                      key={c.id}
                      size="sm"
                      variant={categoryFilter === c.id ? "default" : "ghost"}
                      className="h-6 text-xs px-2"
                      onClick={() => setCategoryFilter(c.id)}
                    >
                      {c.name} ({count})
                    </Button>
                  );
                })}
                {files.filter((f: any) => !(f as any).category_id).length > 0 && (
                  <Button
                    size="sm"
                    variant={categoryFilter === "uncategorized" ? "default" : "ghost"}
                    className="h-6 text-xs px-2"
                    onClick={() => setCategoryFilter("uncategorized")}
                  >
                    Uncategorized ({files.filter((f: any) => !(f as any).category_id).length})
                  </Button>
                )}
              </div>
            )}

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
                {Object.entries(filesGroupedByCategory).map(([catName, catFiles]) => (
                  <Collapsible key={catName} defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1.5 hover:bg-muted/20 rounded px-2 -mx-2">
                      <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-heading uppercase">{catName}</span>
                      <Badge variant="secondary" className="text-[10px] ml-auto">{(catFiles as any[]).length}</Badge>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1.5 mt-1">
                      {(catFiles as any[]).map((f: any) => (
                        <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20">
                          {(f as any).is_sensitive ? (
                            <Lock className="w-4 h-4 text-destructive shrink-0" />
                          ) : (
                            <File className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
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
                    </CollapsibleContent>
                  </Collapsible>
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
