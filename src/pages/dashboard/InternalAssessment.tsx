import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import {
  dnaQuestions,
  calculateDNAResult,
  desiredPositions,
  experienceOptions,
  availabilityOptions,
} from "@/lib/dnaAssessment";
import nextGenLogo from "@/assets/ngr-logo.png";

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const STEPS = ["DNA Assessment", "Your Story", "Complete"];

export default function InternalAssessment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const draftKey = useMemo(() => user?.id ? `ngr_draft_internal_assessment_${user.id}` : null, [user?.id]);

  // Pre-filled from profile
  const [desiredPosition, setDesiredPosition] = useState(() => {
    try { if (!user?.id) return ""; const s = localStorage.getItem(`ngr_draft_internal_assessment_${user.id}`); if (s) return JSON.parse(s).desiredPosition || ""; } catch {} return "";
  });
  const [yearsExperience, setYearsExperience] = useState("2-5 years");
  const [availability, setAvailability] = useState("Immediate");

  // DNA answers
  const [dnaAnswers, setDnaAnswers] = useState<Record<string, "A" | "B">>(() => {
    try { if (!user?.id) return {}; const s = localStorage.getItem(`ngr_draft_internal_assessment_${user.id}`); if (s) return JSON.parse(s).dnaAnswers || {}; } catch {} return {};
  });

  // Narratives
  const [narrativeOwnership, setNarrativeOwnership] = useState(() => {
    try { if (!user?.id) return ""; const s = localStorage.getItem(`ngr_draft_internal_assessment_${user.id}`); if (s) return JSON.parse(s).narrativeOwnership || ""; } catch {} return "";
  });
  const [narrativeMentor, setNarrativeMentor] = useState(() => {
    try { if (!user?.id) return ""; const s = localStorage.getItem(`ngr_draft_internal_assessment_${user.id}`); if (s) return JSON.parse(s).narrativeMentor || ""; } catch {} return "";
  });
  const [narrativeWhyNgr, setNarrativeWhyNgr] = useState(() => {
    try { if (!user?.id) return ""; const s = localStorage.getItem(`ngr_draft_internal_assessment_${user.id}`); if (s) return JSON.parse(s).narrativeWhyNgr || ""; } catch {} return "";
  });

  // Restore step from draft
  useEffect(() => {
    if (!draftKey) return;
    try {
      const s = localStorage.getItem(draftKey);
      if (s) { const parsed = JSON.parse(s); if (parsed.step) setStep(parsed.step); }
    } catch {}
  }, [draftKey]);

  // Autosave draft
  useEffect(() => {
    if (!draftKey || submitted) return;
    const draft = { dnaAnswers, narrativeOwnership, narrativeMentor, narrativeWhyNgr, desiredPosition, step };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [dnaAnswers, narrativeOwnership, narrativeMentor, narrativeWhyNgr, desiredPosition, step, draftKey, submitted]);

  // Fetch profile data to pre-fill
  const { data: profileData } = useQuery({
    queryKey: ["internal-assessment-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [salesRes, canvasserRes] = await Promise.all([
        supabase.from("user_metrics").select("display_name, sales_rank").eq("user_id", user!.id).maybeSingle(),
        supabase.from("canvasser_metrics").select("display_name, canvasser_rank").eq("user_id", user!.id).maybeSingle(),
      ]);
      return {
        salesMetrics: salesRes.data,
        canvasserMetrics: canvasserRes.data,
      };
    },
  });

  // Pre-set desired position from rank
  useEffect(() => {
    if (profileData) {
      if (profileData.salesMetrics?.sales_rank) {
        setDesiredPosition("Sales - Residential");
      } else if (profileData.canvasserMetrics?.canvasser_rank) {
        setDesiredPosition("Canvassing");
      }
    }
  }, [profileData]);

  const displayName =
    profileData?.salesMetrics?.display_name ||
    profileData?.canvasserMetrics?.display_name ||
    user?.email?.split("@")[0] ||
    "Team Member";

  const validateStep0 = (): boolean => {
    const answered = Object.keys(dnaAnswers).length;
    if (answered < 20) {
      setErrors({ dna: `Please answer all 20 questions (${answered}/20 completed)` });
      return false;
    }
    if (!desiredPosition) {
      setErrors({ desiredPosition: "Please select a desired position" });
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (wordCount(narrativeOwnership) < 25) errs.narrativeOwnership = `Minimum 25 words required (${wordCount(narrativeOwnership)} words)`;
    if (wordCount(narrativeMentor) < 25) errs.narrativeMentor = `Minimum 25 words required (${wordCount(narrativeMentor)} words)`;
    if (wordCount(narrativeWhyNgr) < 25) errs.narrativeWhyNgr = `Minimum 25 words required (${wordCount(narrativeWhyNgr)} words)`;
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1) {
      if (!validateStep1()) return;
      handleSubmit();
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const result = calculateDNAResult(dnaAnswers, desiredPosition);

    const { error: insertError } = await supabase.from("job_applications").insert({
      full_name: displayName,
      email: user.email ?? "",
      phone: "",
      current_job_title: desiredPosition,
      desired_position: desiredPosition,
      years_experience: yearsExperience,
      availability,
      dna_answers: dnaAnswers,
      dna_score: result.score,
      alignment_category: result.alignmentCategory,
      recommended_role: result.recommendedRole,
      red_flags: result.redFlags,
      narrative_ownership: narrativeOwnership.trim(),
      narrative_mentor: narrativeMentor.trim(),
      narrative_why_ngr: narrativeWhyNgr.trim(),
      status: "hired",
      hired_at: new Date().toISOString(),
      created_user_id: user.id,
    } as any);

    if (insertError) {
      toast({ title: "Error submitting assessment", description: "Please try again.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Clear draft and pending flag
    if (draftKey) localStorage.removeItem(draftKey);
    await supabase
      .from("profiles")
      .update({ dna_assessment_pending: false } as any)
      .eq("id", user.id);

    setSubmitting(false);
    setSubmitted(true);
    setStep(2);

    setTimeout(() => navigate("/dashboard/stats"), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-accent text-accent-foreground py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src={nextGenLogo} alt="NGR" className="h-10 w-auto [filter:drop-shadow(0_0_8px_rgba(255,255,255,0.6))]" />
          <div>
            <h1 className="font-heading text-xl uppercase">NGR DNA Assessment</h1>
            <p className="text-xs opacity-80">Welcome back, {displayName}</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1">
              <div className={`h-2 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-muted"}`} />
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-1">Step {step + 1} of {STEPS.length}</p>
        <h2 className="font-heading text-2xl uppercase mb-6">{STEPS[step]}</h2>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16">

        {/* Step 0: DNA Questions */}
        {step === 0 && (
          <div className="space-y-5">
            {/* Pre-fill notice */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-sm">
              <p className="font-medium">Your profile information has been pre-filled.</p>
              <p className="text-muted-foreground mt-1">Just confirm your desired position and complete the DNA assessment below.</p>
            </div>

            {/* Position selector */}
            <div>
              <Label className="font-heading uppercase text-sm">Desired Position *</Label>
              <Select value={desiredPosition} onValueChange={setDesiredPosition}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a position" /></SelectTrigger>
                <SelectContent>
                  {desiredPositions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.desiredPosition && <p className="text-destructive text-sm mt-1">{errors.desiredPosition}</p>}
            </div>

            {/* DNA Questions */}
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                For each scenario, select the statement that <strong>BEST</strong> describes your natural behavior. Be honest — there are no wrong answers.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{Object.keys(dnaAnswers).length}/20 answered</p>
            {errors.dna && <p className="text-destructive text-sm">{errors.dna}</p>}
            {dnaQuestions.map((q) => (
              <div key={q.id} className="bg-card border border-border rounded-lg p-4">
                <p className="font-heading text-sm uppercase text-accent mb-2">{q.number}. {q.topic}</p>
                <RadioGroup
                  value={dnaAnswers[q.id] || ""}
                  onValueChange={(v) => setDnaAnswers((prev) => ({ ...prev, [q.id]: v as "A" | "B" }))}
                  className="space-y-2"
                >
                  {[
                    { value: "A", text: q.optionA },
                    { value: "B", text: q.optionB },
                  ].map(({ value, text }) => (
                    <div key={value} className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value={value} id={`${q.id}-${value.toLowerCase()}`} className="mt-0.5" />
                      <Label htmlFor={`${q.id}-${value.toLowerCase()}`} className="font-normal cursor-pointer text-sm leading-relaxed">
                        <span className="font-semibold mr-1">{value}.</span> {text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Narratives */}
        {step === 1 && (
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Tell us your story. Be honest and specific. Each response requires a minimum of 25 words.
            </p>
            {[
              {
                key: "narrativeOwnership",
                title: "1. The Ownership Standard",
                prompt: "NGR is Veteran-operated. We live by a code of \"Extreme Ownership.\" Describe a time you failed at something. How did you handle the fallout and what did you learn?",
                value: narrativeOwnership,
                onChange: setNarrativeOwnership,
                error: errors.narrativeOwnership,
              },
              {
                key: "narrativeMentor",
                title: "2. The Mentor Mindset",
                prompt: "Why is it important to you to be in a role where you are constantly being coached and developed?",
                value: narrativeMentor,
                onChange: setNarrativeMentor,
                error: errors.narrativeMentor,
              },
              {
                key: "narrativeWhyNgr",
                title: "3. The \"Next Gen\" Why",
                prompt: "Why are you the right person to handle the pace and expectations of Oklahoma's premier roofing team?",
                value: narrativeWhyNgr,
                onChange: setNarrativeWhyNgr,
                error: errors.narrativeWhyNgr,
              },
            ].map(({ key, title, prompt, value, onChange, error }) => (
              <div key={key}>
                <Label className="text-base font-heading uppercase">{title}</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-2">{prompt}</p>
                <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={6} placeholder="Share your experience..." />
                <p className={`text-xs mt-1 ${wordCount(value) >= 25 ? "text-green-600" : "text-muted-foreground"}`}>
                  {wordCount(value)}/25 words minimum
                </p>
                {error && <p className="text-destructive text-sm">{error}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Complete */}
        {step === 2 && submitted && (
          <div className="text-center py-16">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="font-heading text-2xl uppercase mb-2">Assessment Complete!</h3>
            <p className="text-muted-foreground mb-4">
              Your DNA assessment has been submitted and added to your profile. Redirecting you back to your dashboard...
            </p>
          </div>
        )}

        {/* Navigation */}
        {step < 2 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            {step > 0 ? (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : (
              <div />
            )}
            <Button
              onClick={handleNext}
              disabled={submitting}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {step === 1 ? "Submit Assessment" : "Next Step"}
              {step < 1 && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
