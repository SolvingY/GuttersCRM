import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, UserCheck, Loader2 } from "lucide-react";

interface HireApplicantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    desired_position: string;
  };
  onSuccess: (userId: string) => void;
}

const ROLE_MAPPING: Record<string, string> = {
  "Sales - Residential": "sales_rep",
  "Sales - Commercial": "sales_rep",
  "Sales - Gutters": "sales_rep",
  "Canvassing": "canvasser",
  "Admin": "admin_only",
  "Management": "super_admin",
  "Production": "sales_rep",
  "Service": "sales_rep",
};

function generatePassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function HireApplicantDialog({ isOpen, onClose, applicant, onSuccess }: HireApplicantDialogProps) {
  const { toast } = useToast();
  const [role, setRole] = useState(ROLE_MAPPING[applicant.desired_position] || "sales_rep");
  const [tempPassword] = useState(generatePassword);
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(false);

  const copyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    toast({ title: "Password copied to clipboard" });
  };

  const handleCreate = async () => {
    if (!startDate) {
      toast({ title: "Please select a start date", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: applicant.email,
          password: tempPassword,
          displayName: applicant.full_name,
          roleType: role,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create user");

      const newUserId = data.user.id;

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from("job_applications")
        .update({
          status: "hired",
          hired_at: new Date().toISOString(),
          created_user_id: newUserId,
          start_date: startDate,
          status_changed_by: currentUser?.id,
          status_changed_at: new Date().toISOString(),
        } as any)
        .eq("id", applicant.id);

      if (updateError) throw updateError;

      toast({ title: "Account created successfully!", description: `User account for ${applicant.full_name} is ready.` });
      onSuccess(newUserId);
      onClose();
    } catch (err: any) {
      console.error("Error creating account:", err);
      toast({ title: "Failed to create account", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">Create Account for {applicant.full_name}</DialogTitle>
          <DialogDescription>
            This will create a new user account, set their role, and mark the application as hired.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Email</Label>
            <Input value={applicant.email} readOnly className="bg-muted" />
          </div>
          <div>
            <Label>Full Name</Label>
            <Input value={applicant.full_name} readOnly className="bg-muted" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sales_rep">Sales Rep</SelectItem>
                <SelectItem value="canvasser">Canvasser</SelectItem>
                <SelectItem value="admin_only">Admin</SelectItem>
                <SelectItem value="super_admin">Manager (Super Admin)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Temporary Password</Label>
            <div className="flex gap-2">
              <Input value={tempPassword} readOnly className="bg-muted font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={copyPassword}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Share this with the new hire. They can change it after first login.</p>
          </div>
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
              {loading ? "Creating..." : "Create Account & Hire"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
