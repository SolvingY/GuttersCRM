import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  dnaQuestions,
  calculateDNAResult,
  desiredPositions,
  experienceOptions,
  availabilityOptions,
} from "@/lib/dnaAssessment";
import ngrLogo from "@/assets/next-gen-logo.png";

const intakeSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(20),
  currentJobTitle: z.string().max(100).optional(),
  desiredPosition: z.string().min(1, "Please select a desired position"),
  yearsExperience: z.string().min(1, "Please select your experience level"),
  availability: z.string().min(1, "Please select your availability"),
});

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const STEPS = ["The Basics", "DNA Assessment", "Your Story", "Confirmation"];

export default function JobApplication() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentJobTitle, setCurrentJobTitle] = useState("");
  const [desiredPosition, setDesiredPosition] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [availability, setAvailability] = useState("");

  // Step 2 state
  const [dnaAnswers, setDnaAnswers] = useState<Record<string, "A" | "B">>({});

  // Step 3 state
  const [narrativeOwnership, setNarrativeOwnership] = useState("");
  const [narrativeMentor, setNarrativeMentor] = useState("");
  const [narrativeWhyNgr, setNarrativeWhyNgr] = useState("");

  const validateStep1 = (): boolean => {
    const result = intakeSchema.safeParse({
      fullName, email, phone, currentJobTitle, desiredPosition, yearsExperience, availability,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as string;
        fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep2 = (): boolean => {
    const answered = Object.keys(dnaAnswers).length;
    if (answered < 20) {
      setErrors({ dna: `Please answer all 20 questions (${answered}/20 completed)` });
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};
    if (wordCount(narrativeOwnership) < 100) errs.narrativeOwnership = `Minimum 100 words required (${wordCount(narrativeOwnership)} words)`;
    if (wordCount(narrativeMentor) < 100) errs.narrativeMentor = `Minimum 100 words required (${wordCount(narrativeMentor)} words)`;
    if (wordCount(narrativeWhyNgr) < 100) errs.narrativeWhyNgr = `Minimum 100 words required (${wordCount(narrativeWhyNgr)} words)`;
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !validateStep2()) return;
    if (step === 2) {
      if (!validateStep3()) return;
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
    setSubmitting(true);
    const result = calculateDNAResult(dnaAnswers, desiredPosition);

    const { error } = await supabase.from("job_applications").insert({
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      current_job_title: currentJobTitle.trim() || null,
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
    } as any);

    setSubmitting(false);
    if (error) {
      toast({ title: "Error submitting application", description: "Please try again later.", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    setStep(3);
    setTimeout(() => navigate("/apply/thank-you"), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-accent text-accent-foreground py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src={ngrLogo} alt="NGR" className="h-10 w-auto" />
          <div>
            <h1 className="font-heading text-xl uppercase">Join Next Generation Roofing</h1>
            <p className="text-xs opacity-80">Start Your Application</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex items-center gap-2">
              <div className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-muted"}`} />
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-2">Step {Math.min(step + 1, 4)} of 4</p>
        <h2 className="font-heading text-2xl uppercase mb-6">{STEPS[Math.min(step, 3)]}</h2>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16">
        {/* Step 1: Intake */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Smith" />
              {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
              {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(405) 555-1234" />
              {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone}</p>}
            </div>
            <div>
              <Label htmlFor="currentJobTitle">Current Job Title</Label>
              <Input id="currentJobTitle" value={currentJobTitle} onChange={(e) => setCurrentJobTitle(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label>Desired Position *</Label>
              <Select value={desiredPosition} onValueChange={setDesiredPosition}>
                <SelectTrigger><SelectValue placeholder="Select a position" /></SelectTrigger>
                <SelectContent>
                  {desiredPositions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.desiredPosition && <p className="text-destructive text-sm mt-1">{errors.desiredPosition}</p>}
            </div>
            <div>
              <Label>Years of Experience *</Label>
              <RadioGroup value={yearsExperience} onValueChange={setYearsExperience} className="flex flex-wrap gap-4 mt-2">
                {experienceOptions.map((o) => (
                  <div key={o} className="flex items-center gap-2">
                    <RadioGroupItem value={o} id={`exp-${o}`} />
                    <Label htmlFor={`exp-${o}`} className="font-normal cursor-pointer">{o}</Label>
                  </div>
                ))}
              </RadioGroup>
              {errors.yearsExperience && <p className="text-destructive text-sm mt-1">{errors.yearsExperience}</p>}
            </div>
            <div>
              <Label>Availability *</Label>
              <RadioGroup value={availability} onValueChange={setAvailability} className="flex flex-wrap gap-4 mt-2">
                {availabilityOptions.map((o) => (
                  <div key={o} className="flex items-center gap-2">
                    <RadioGroupItem value={o} id={`avail-${o}`} />
                    <Label htmlFor={`avail-${o}`} className="font-normal cursor-pointer">{o}</Label>
                  </div>
                ))}
              </RadioGroup>
              {errors.availability && <p className="text-destructive text-sm mt-1">{errors.availability}</p>}
            </div>
          </div>
        )}

        {/* Step 2: DNA Assessment */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg mb-6">
              <p className="text-sm text-muted-foreground">
                This assessment helps us understand your natural work style. For each scenario, select the statement (A or B) that <strong>BEST</strong> describes your natural behavior. There is no right or wrong answer—be honest.
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
                  <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="A" id={`${q.id}-a`} className="mt-0.5" />
                    <Label htmlFor={`${q.id}-a`} className="font-normal cursor-pointer text-sm leading-relaxed">
                      <span className="font-semibold mr-1">A.</span> {q.optionA}
                    </Label>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="B" id={`${q.id}-b`} className="mt-0.5" />
                    <Label htmlFor={`${q.id}-b`} className="font-normal cursor-pointer text-sm leading-relaxed">
                      <span className="font-semibold mr-1">B.</span> {q.optionB}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Narrative */}
        {step === 2 && (
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Tell us your story. Be honest and specific—we want to know the real you. Each response requires a minimum of 100 words.
            </p>
            <div>
              <Label className="text-base font-heading uppercase">1. The Ownership Standard</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-2">
                NGR is Veteran-operated. We live by a code of "Extreme Ownership." Describe a time you failed at something. How did you handle the fallout and what did you learn?
              </p>
              <Textarea
                value={narrativeOwnership}
                onChange={(e) => setNarrativeOwnership(e.target.value)}
                rows={6}
                placeholder="Share your experience..."
              />
              <p className={`text-xs mt-1 ${wordCount(narrativeOwnership) >= 100 ? "text-green-600" : "text-muted-foreground"}`}>
                {wordCount(narrativeOwnership)}/100 words
              </p>
              {errors.narrativeOwnership && <p className="text-destructive text-sm">{errors.narrativeOwnership}</p>}
            </div>
            <div>
              <Label className="text-base font-heading uppercase">2. The Mentor Mindset</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-2">
                Our team includes dedicated trainers like Matt Fowler who invest in your success. Why is it important to you to be in a role where you are constantly being coached and developed?
              </p>
              <Textarea
                value={narrativeMentor}
                onChange={(e) => setNarrativeMentor(e.target.value)}
                rows={6}
                placeholder="Share your thoughts..."
              />
              <p className={`text-xs mt-1 ${wordCount(narrativeMentor) >= 100 ? "text-green-600" : "text-muted-foreground"}`}>
                {wordCount(narrativeMentor)}/100 words
              </p>
              {errors.narrativeMentor && <p className="text-destructive text-sm">{errors.narrativeMentor}</p>}
            </div>
            <div>
              <Label className="text-base font-heading uppercase">3. The "Next Gen" Why</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-2">
                We cover 1.15 million square feet of homes a year. Why are you the right person to handle the pace and expectations of Oklahoma's premier roofing team?
              </p>
              <Textarea
                value={narrativeWhyNgr}
                onChange={(e) => setNarrativeWhyNgr(e.target.value)}
                rows={6}
                placeholder="Tell us why you..."
              />
              <p className={`text-xs mt-1 ${wordCount(narrativeWhyNgr) >= 100 ? "text-green-600" : "text-muted-foreground"}`}>
                {wordCount(narrativeWhyNgr)}/100 words
              </p>
              {errors.narrativeWhyNgr && <p className="text-destructive text-sm">{errors.narrativeWhyNgr}</p>}
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 3 && submitted && (
          <div className="text-center py-16">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="font-heading text-2xl uppercase mb-2">Application Submitted!</h3>
            <p className="text-muted-foreground mb-6">
              Thank you for applying to Next Generation Roofing. Your application has been received and is being reviewed.
            </p>
            <Button onClick={() => navigate("/apply/thank-you")} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Continue to Learn More About NGR <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Navigation buttons */}
        {step < 3 && (
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
              {step === 2 ? "Submit Application" : "Next Step"}
              {step < 2 && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
