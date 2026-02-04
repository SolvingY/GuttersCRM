import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { RANK_OPTIONS, CANVASSER_RANK_OPTIONS } from '@/lib/constants';

interface UserWithRole {
  id: string;
  fullName: string | null;
  roles: ('admin' | 'user' | 'canvasser')[];
  salesRank: string | null;
  canvasserRank: string | null;
  isArchived: boolean;
  archivedAt: string | null;
}

interface EditUserRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onSuccess: () => void;
}

export function EditUserRoleModal({ open, onOpenChange, user, onSuccess }: EditUserRoleModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminOnly, setIsAdminOnly] = useState(false);
  const [isSalesRep, setIsSalesRep] = useState(false);
  const [isCanvasser, setIsCanvasser] = useState(false);
  const [salesRank, setSalesRank] = useState<string>('SR1');
  const [canvasserRank, setCanvasserRank] = useState<string>('C1');

  useEffect(() => {
    if (user) {
      const hasAdmin = user.roles.includes('admin');
      const hasSales = user.roles.includes('user');
      const hasCanvasser = user.roles.includes('canvasser');
      
      // Admin-only: has admin but no sales/canvasser roles
      const adminOnly = hasAdmin && !hasSales && !hasCanvasser;
      
      setIsAdminOnly(adminOnly);
      setIsSalesRep(hasSales);
      setIsCanvasser(hasCanvasser);
      setSalesRank(user.salesRank || 'SR1');
      setCanvasserRank(user.canvasserRank || 'C1');
    }
  }, [user]);

  const handleAdminOnlyChange = (checked: boolean) => {
    setIsAdminOnly(checked === true);
    if (checked) {
      // When Admin Only is checked, disable other roles
      setIsSalesRep(false);
      setIsCanvasser(false);
    }
  };

  const handleSalesRepChange = (checked: boolean) => {
    setIsSalesRep(checked === true);
    if (checked) {
      setIsAdminOnly(false);
    }
  };

  const handleCanvasserChange = (checked: boolean) => {
    setIsCanvasser(checked === true);
    if (checked) {
      setIsAdminOnly(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate at least one role is selected
    if (!isAdminOnly && !isSalesRep && !isCanvasser) {
      toast({
        title: 'Error',
        description: 'Please select at least one role option',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Build roles array
      const roles: string[] = [];
      if (isAdminOnly) {
        roles.push('admin');
      } else {
        if (isSalesRep) roles.push('user');
        if (isCanvasser) roles.push('canvasser');
        // Preserve admin role if user was already an admin
        if (user.roles.includes('admin')) {
          roles.push('admin');
        }
      }

      const response = await supabase.functions.invoke('admin-set-user-role', {
        body: { 
          targetUserId: user.id, 
          roles,
          salesRank: isSalesRep ? salesRank : undefined,
          canvasserRank: isCanvasser ? canvasserRank : undefined,
          isAdminOnly,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to update roles');
      }

      // Build success message
      let roleMessage: string;
      if (isAdminOnly) {
        roleMessage = 'Admin Only';
      } else {
        const roleNames: string[] = [];
        if (isSalesRep) roleNames.push(`Sales Rep (${salesRank})`);
        if (isCanvasser) roleNames.push(`Canvasser (${canvasserRank})`);
        roleMessage = roleNames.join(' + ');
      }

      toast({
        title: 'Success',
        description: `Updated ${user.fullName || 'user'} to ${roleMessage}`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating roles:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update roles',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = isAdminOnly || isSalesRep || isCanvasser;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit User Roles & Ranks</DialogTitle>
          <DialogDescription>
            Update roles and ranks for {user?.fullName || 'user'}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Admin Only Option */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="adminOnly"
                  checked={isAdminOnly}
                  onCheckedChange={handleAdminOnlyChange}
                />
                <Label htmlFor="adminOnly" className="text-sm font-medium cursor-pointer">
                  Admin Only
                </Label>
              </div>
              {isAdminOnly && (
                <p className="ml-6 text-xs text-muted-foreground">
                  User will only have admin access. No sales or canvasser metrics will be tracked.
                </p>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Or select one or both operational roles:
              </p>

              {/* Sales Rep Role */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="salesRep"
                    checked={isSalesRep}
                    onCheckedChange={handleSalesRepChange}
                    disabled={isAdminOnly}
                  />
                  <Label 
                    htmlFor="salesRep" 
                    className={`text-sm font-medium cursor-pointer ${isAdminOnly ? 'text-muted-foreground' : ''}`}
                  >
                    Sales Rep
                  </Label>
                </div>
                {isSalesRep && (
                  <div className="ml-6">
                    <Label htmlFor="salesRank" className="text-sm text-muted-foreground">
                      Sales Rank
                    </Label>
                    <Select value={salesRank} onValueChange={setSalesRank}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select rank" />
                      </SelectTrigger>
                      <SelectContent>
                        {RANK_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Canvasser Role */}
              <div className="space-y-3 mt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canvasser"
                    checked={isCanvasser}
                    onCheckedChange={handleCanvasserChange}
                    disabled={isAdminOnly}
                  />
                  <Label 
                    htmlFor="canvasser" 
                    className={`text-sm font-medium cursor-pointer ${isAdminOnly ? 'text-muted-foreground' : ''}`}
                  >
                    Canvasser
                  </Label>
                </div>
                {isCanvasser && (
                  <div className="ml-6">
                    <Label htmlFor="canvasserRank" className="text-sm text-muted-foreground">
                      Canvasser Rank
                    </Label>
                    <Select value={canvasserRank} onValueChange={setCanvasserRank}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select rank" />
                      </SelectTrigger>
                      <SelectContent>
                        {CANVASSER_RANK_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {!isValid && (
              <p className="text-sm text-destructive">
                Please select at least one role option
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
