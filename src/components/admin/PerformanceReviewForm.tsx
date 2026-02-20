import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Save, Loader2 } from "lucide-react";

const SCORE_CATEGORIES = [
  { key: "communication_score", label: "Communication" },
  { key: "productivity_score", label: "Productivity" },
  { key: "quality_score", label: "Quality" },
  { key: "teamwork_score", label: "Teamwork" },
  { key: "reliability_score", label: "Reliability" },
  { key: "customer_service_score", label: "Customer Service" },
] as const;

type ScoreKey = typeof SCORE_CATEGORIES[number]["key"];

export interface ReviewFormData {
  quarter: string;
  communication_score: number;
  productivity_score: number;
  quality_score: number;
  teamwork_score: number;
  reliability_score: number;
  customer_service_score: number;
  review_notes: string;
  goals_set: string;
  action_items: string;
  strengths: string;
  areas_for_improvement: string;
  manager_signature: string;
  contractor_signature: string;
  contractor_acknowledged: boolean;
}

const getCurrentQuarter = () => {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
};

export const defaultReviewFormData = (): ReviewFormData => ({
  quarter: getCurrentQuarter(),
  communication_score: 3,
  productivity_score: 3,
  quality_score: 3,
  teamwork_score: 3,
  reliability_score: 3,
  customer_service_score: 3,
  review_notes: "",
  goals_set: "",
  action_items: "",
  strengths: "",
  areas_for_improvement: "",
  manager_signature: "",
  contractor_signature: "",
  contractor_acknowledged: false,
});

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${i < value ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"} ${!readonly && onChange ? "cursor-pointer hover:text-yellow-400" : ""}`}
          onClick={() => !readonly && onChange?.(i + 1)}
        />
      ))}
    </div>
  );
}

interface Props {
  form: ReviewFormData;
  onChange: (form: ReviewFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

export function PerformanceReviewForm({ form, onChange, onSave, onCancel, saving }: Props) {
  const scores = SCORE_CATEGORIES.map((c) => form[c.key]).filter((s) => s > 0);
  const overallAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const updateField = <K extends keyof ReviewFormData>(key: K, value: ReviewFormData[K]) => {
    onChange({ ...form, [key]: value });
  };

  return (
    <div className="p-4 border-b border-border bg-muted/10 space-y-4">
      {/* Quarter */}
      <div className="space-y-1">
        <Label className="text-xs">Quarter</Label>
        <Input
          value={form.quarter}
          onChange={(e) => updateField("quarter", e.target.value)}
          placeholder="Q1 2026"
          className="h-8 text-sm max-w-[200px]"
        />
      </div>

      {/* Category Scores */}
      <div>
        <Label className="text-xs mb-2 block">Category Scores</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SCORE_CATEGORIES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
              <span className="text-sm">{label}</span>
              <StarRating
                value={form[key]}
                onChange={(v) => updateField(key, v)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Auto-calculated overall */}
      <div className="flex items-center gap-3 bg-accent/10 rounded-md px-3 py-2">
        <span className="text-sm font-medium">Overall Rating (auto-calculated):</span>
        <StarRating value={Math.round(overallAvg)} readonly />
        <span className="text-sm text-muted-foreground">{overallAvg.toFixed(1)}/5</span>
      </div>

      {/* Text fields */}
      <div className="space-y-1">
        <Label className="text-xs">Strengths</Label>
        <Textarea
          value={form.strengths}
          onChange={(e) => updateField("strengths", e.target.value)}
          placeholder="Key strengths demonstrated this quarter..."
          rows={2}
          className="text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Areas for Improvement</Label>
        <Textarea
          value={form.areas_for_improvement}
          onChange={(e) => updateField("areas_for_improvement", e.target.value)}
          placeholder="Areas where growth is needed..."
          rows={2}
          className="text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Performance Notes</Label>
        <Textarea
          value={form.review_notes}
          onChange={(e) => updateField("review_notes", e.target.value)}
          placeholder="How did this team member perform this quarter?"
          rows={3}
          className="text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Goals Set</Label>
        <Textarea
          value={form.goals_set}
          onChange={(e) => updateField("goals_set", e.target.value)}
          placeholder="Goals for next quarter..."
          rows={2}
          className="text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Action Items</Label>
        <Textarea
          value={form.action_items}
          onChange={(e) => updateField("action_items", e.target.value)}
          placeholder="Follow-up items and action steps..."
          rows={2}
          className="text-sm"
        />
      </div>

      {/* Manager Signature */}
      <div className="space-y-1">
        <Label className="text-xs">Manager Signature</Label>
        <Input
          value={form.manager_signature}
          onChange={(e) => updateField("manager_signature", e.target.value)}
          placeholder="Type your full name as signature"
          className="h-8 text-sm"
        />
      </div>

      {/* Contractor Acknowledgement */}
      <div className="border border-border rounded-md p-3 space-y-2 bg-muted/20">
        <Label className="text-xs font-heading uppercase">Contractor Acknowledgement</Label>
        <div className="flex items-center gap-2">
          <Checkbox
            id="ack"
            checked={form.contractor_acknowledged}
            onCheckedChange={(checked) => updateField("contractor_acknowledged", !!checked)}
          />
          <label htmlFor="ack" className="text-xs">I acknowledge receipt of this review</label>
        </div>
        {form.contractor_acknowledged && (
          <div className="space-y-1">
            <Label className="text-xs">Contractor Signature</Label>
            <Input
              value={form.contractor_signature}
              onChange={(e) => updateField("contractor_signature", e.target.value)}
              placeholder="Contractor's full name as signature"
              className="h-8 text-sm"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving || !form.quarter}>
          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
          Save Review
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Display scores for a saved review */
export function ReviewScoreBreakdown({ review }: { review: any }) {
  const scores = SCORE_CATEGORIES
    .map(({ key, label }) => ({ label, score: review[key] as number | null }))
    .filter(({ score }) => score != null);

  if (scores.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">
      {scores.map(({ label, score }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">{label}:</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < (score ?? 0) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
