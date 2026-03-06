import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Clock, Loader2, AlertTriangle, Download } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContractSignStepProps {
  userId: string;
  isCompleted: boolean;
  onComplete: (metadata?: Record<string, any>) => void;
  isCompleting: boolean;
}

export default function ContractSignStep({ userId, isCompleted, onComplete, isCompleting }: ContractSignStepProps) {
  const { toast } = useToast();
  const [signatureName, setSignatureName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);

  const { data: offerLetter, refetch } = useQuery({
    queryKey: ["contractor-offer-letter", userId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("contractor_offer_letters" as any) as any)
        .select("*")
        .eq("contractor_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">
          Contract signed{offerLetter?.signed_at ? ` on ${format(new Date(offerLetter.signed_at), "MMM d, yyyy")}` : ""}.
          {offerLetter?.signed_by_name && ` Signed by: ${offerLetter.signed_by_name}`}
        </span>
      </div>
    );
  }

  // State A — No offer letter
  if (!offerLetter) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Clock className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">Your offer letter hasn't been sent yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your manager (Kara or Jonathan) will send it to you shortly. Check back soon.
          </p>
        </div>
      </div>
    );
  }

  // State: Declined
  if (offerLetter.status === "declined") {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-4">
        <AlertTriangle className="w-5 h-5" />
        <span className="text-sm font-medium">
          You declined this offer on {offerLetter.declined_at ? format(new Date(offerLetter.declined_at), "MMM d, yyyy") : "a previous date"}.
          Please contact your manager for next steps.
        </span>
      </div>
    );
  }

  // State: Already signed
  if (offerLetter.status === "signed") {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">
          Contract signed on {offerLetter.signed_at ? format(new Date(offerLetter.signed_at), "MMM d, yyyy") : "record"}.
          Signed by: {offerLetter.signed_by_name}
        </span>
      </div>
    );
  }

  // State B — Pending review
  const handleSign = async () => {
    if (!signatureName.trim() || !agreed) return;
    setSigning(true);
    try {
      await (supabase
        .from("contractor_offer_letters" as any) as any)
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          signed_by_name: signatureName.trim(),
        })
        .eq("id", offerLetter.id);

      toast({ title: "Contract signed successfully!" });
      onComplete({ signed_by_name: signatureName.trim(), signed_at: new Date().toISOString() });
    } catch (err: any) {
      toast({ title: "Error signing", description: err.message, variant: "destructive" });
    } finally {
      setSigning(false);
    }
  };

  const handleDecline = async () => {
    try {
      await (supabase
        .from("contractor_offer_letters" as any) as any)
        .update({
          status: "declined",
          declined_at: new Date().toISOString(),
        })
        .eq("id", offerLetter.id);

      toast({ title: "Offer declined", description: "Your manager has been notified." });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setShowDeclineDialog(false);
  };

  const isPdf = !!offerLetter.file_path || !!offerLetter.file_url;

  return (
    <div className="space-y-6">
      {/* Letter display */}
      <div className="bg-white border border-border rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg uppercase">Offer Letter — {offerLetter.position_title}</h3>
          {offerLetter.start_date && (
            <span className="text-xs text-muted-foreground">
              Start Date: {format(new Date(offerLetter.start_date), "MMM d, yyyy")}
            </span>
          )}
        </div>

        {isPdf ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Your offer letter has been uploaded as a document.</p>
            <Button variant="outline" asChild>
              <a href={offerLetter.file_url} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 mr-2" /> View / Download Offer Letter
              </a>
            </Button>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto border border-border rounded p-4 bg-muted/10 text-sm whitespace-pre-wrap leading-relaxed">
            {offerLetter.letter_content}
          </div>
        )}
      </div>

      {/* Signature area */}
      <div className="border-t border-border pt-6 space-y-4">
        <h4 className="font-medium text-sm">Electronic Signature</h4>

        <div>
          <label className="text-sm text-muted-foreground block mb-1">
            Type your full legal name to sign:
          </label>
          <Input
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            placeholder="Your Full Legal Name"
            className="max-w-sm"
          />
        </div>

        {signatureName && (
          <div className="pl-2">
            <p className="font-serif italic text-2xl border-b border-foreground/30 pb-1 inline-block">
              {signatureName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Date: {format(new Date(), "MMMM d, yyyy")}
            </p>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Checkbox
            id="offer-agree"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
          />
          <label htmlFor="offer-agree" className="text-sm cursor-pointer">
            I have read, understood, and agree to all terms in this offer letter.
          </label>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={handleSign}
            disabled={!signatureName.trim() || !agreed || signing || isCompleting}
          >
            {(signing || isCompleting) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Sign & Accept
          </Button>

          <button
            onClick={() => setShowDeclineDialog(true)}
            className="text-sm text-muted-foreground hover:text-destructive underline"
          >
            Decline Offer
          </button>
        </div>
      </div>

      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Offer?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline this offer? This will notify your manager.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDecline} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
