import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { ServiceSelection } from "@/components/quote/ServiceSelection";
import { CommercialQuestions } from "@/components/quote/CommercialQuestions";
import { ResidentialQuestions } from "@/components/quote/ResidentialQuestions";
import { GutterQuestions } from "@/components/quote/GutterQuestions";
import { RepairQuestions } from "@/components/quote/RepairQuestions";
import { ContactInfoStep } from "@/components/quote/ContactInfoStep";
import { QuoteConfirmation } from "@/components/quote/QuoteConfirmation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import logo from "@/assets/ngr-logo.png";

const stepLabels = ["Service", "Details", "Contact", "Confirmation"];

export default function GetQuote() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [serviceType, setServiceType] = useState("");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [contactData, setContactData] = useState<Record<string, any>>({ state: "Oklahoma" });
  const [submitting, setSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");

  const canProceedStep0 = serviceType !== "";
  const canProceedStep1 = (() => {
    if (serviceType === "repair") {
      const words = (formData.issueDescription || "").trim().split(/\s+/).filter(Boolean).length;
      return formData.repairTarget && formData.urgency && formData.propertyType && words >= 20;
    }
    return true;
  })();

  const canProceedStep2 = !!(
    contactData.fullName?.trim() &&
    contactData.email?.trim() &&
    contactData.phone?.trim() &&
    contactData.streetAddress?.trim() &&
    contactData.city?.trim() &&
    contactData.zipCode?.trim()
  );

  const handleSubmit = async () => {
    if (!canProceedStep2) return;
    setSubmitting(true);

    try {
      const { data: refNumber, error } = await supabase.rpc("submit_quote_request", {
        p_service_type: serviceType,
        p_form_data: formData,
        p_full_name: contactData.fullName.trim(),
        p_email: contactData.email.trim(),
        p_phone: contactData.phone.trim(),
        p_street_address: contactData.streetAddress.trim(),
        p_city: contactData.city.trim(),
        p_state: contactData.state || "Oklahoma",
        p_zip_code: contactData.zipCode.trim(),
        p_best_contact_time: contactData.bestContactTime || [],
        p_referral_source: contactData.referralSource || null,
        p_photo_urls: formData.photoUrls || [],
      });

      if (error) throw error;

      setReferenceNumber(refNumber);

      // Send confirmation email and team notification
      try {
        await Promise.allSettled([
          supabase.functions.invoke("send-quote-email", {
            body: {
              clientName: contactData.fullName.trim(),
              clientEmail: contactData.email.trim(),
              serviceType,
              referenceNumber: refNumber,
              type: "received",
            },
          }),
          supabase.functions.invoke("notify-new-lead", {
            body: {
              clientName: contactData.fullName.trim(),
              clientEmail: contactData.email.trim(),
              clientPhone: contactData.phone.trim(),
              serviceType,
              referenceNumber: refNumber,
              streetAddress: contactData.streetAddress.trim(),
              city: contactData.city.trim(),
              state: contactData.state || "Oklahoma",
              zipCode: contactData.zipCode.trim(),
              formData,
              bestContactTime: contactData.bestContactTime || [],
              referralSource: contactData.referralSource || null,
            },
          }),
        ]);
      } catch {
        // Email failure shouldn't block submission
      }

      setStep(3);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestions = () => {
    switch (serviceType) {
      case "commercial": return <CommercialQuestions data={formData} onChange={setFormData} />;
      case "residential": return <ResidentialQuestions data={formData} onChange={setFormData} />;
      case "gutters": return <GutterQuestions data={formData} onChange={setFormData} />;
      case "repair": return <RepairQuestions data={formData} onChange={setFormData} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="NGR" className="h-10 w-10 rounded-full [filter:drop-shadow(0_0_8px_rgba(255,255,255,0.6))]" />
            <span className="font-heading text-lg uppercase hidden sm:block">Next Generation Roofing</span>
          </Link>
          <Link to="/" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      {step < 3 && (
        <div className="bg-secondary border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              {stepLabels.map((label, i) => (
                <span key={label} className={cn("text-xs font-heading uppercase", i <= step ? "text-accent" : "text-muted-foreground")}>
                  {label}
                </span>
              ))}
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Form content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {step === 0 && <ServiceSelection value={serviceType} onChange={setServiceType} />}
        {step === 1 && renderQuestions()}
        {step === 2 && <ContactInfoStep data={contactData} onChange={setContactData} />}
        {step === 3 && (
          <QuoteConfirmation
            referenceNumber={referenceNumber}
            serviceType={serviceType}
            email={contactData.email}
          />
        )}

        {/* Navigation buttons */}
        {step < 3 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            ) : (
              <div />
            )}

            {step < 2 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
                className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceedStep2 || submitting}
                className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit Quote Request
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
