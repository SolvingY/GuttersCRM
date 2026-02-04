import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Copy, Trash2, Send, CheckCircle, Clock, XCircle, Mail, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { RANK_OPTIONS, CANVASSER_RANK_OPTIONS } from '@/lib/constants';

// Production URL for invite links
const PRODUCTION_URL = 'https://oknextgen.com';

interface Invitation {
  id: string;
  email: string;
  invite_code: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  is_used: boolean;
  preset_sales_rank?: string;
  preset_yearly_goal?: number;
  preset_display_name?: string;
  preset_role?: 'user' | 'canvasser' | 'admin';
}

export default function InviteUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Invite form state
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [salesRank, setSalesRank] = useState('SR1');
  const [canvasserRank, setCanvasserRank] = useState('C1');
  const [yearlyGoal, setYearlyGoal] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'canvasser'>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  
  // Manual user creation state
  const [manualEmail, setManualEmail] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualDisplayName, setManualDisplayName] = useState('');
  const [manualSalesRank, setManualSalesRank] = useState('SR1');
  const [manualCanvasserRank, setManualCanvasserRank] = useState('C1');
  const [manualYearlyGoal, setManualYearlyGoal] = useState('');
  const [manualRoleType, setManualRoleType] = useState<'admin_only' | 'sales_rep' | 'canvasser' | 'super_admin'>('sales_rep');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invitations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !user) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const inviteCode = generateInviteCode();
      
      const { error } = await supabase
        .from('invitations')
        .insert({
          email: email.trim().toLowerCase(),
          invite_code: inviteCode,
          invited_by: user.id,
          preset_sales_rank: inviteRole === 'user' ? salesRank : null,
          preset_canvasser_rank: inviteRole === 'canvasser' ? canvasserRank : null,
          preset_yearly_goal: inviteRole === 'user' && yearlyGoal ? parseFloat(yearlyGoal) : 0,
          preset_display_name: displayName.trim() || null,
          preset_role: inviteRole,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('An invitation for this email already exists');
        }
        throw error;
      }

      toast({
        title: 'Invitation Created',
        description: `Invitation sent to ${email} with rank ${salesRank}`,
      });
      setEmail('');
      setDisplayName('');
      setSalesRank('SR1');
      setCanvasserRank('C1');
      setYearlyGoal('');
      setInviteRole('user');
      fetchInvitations();
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invitation',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail.trim() || !manualPassword.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(manualEmail.trim())) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    if (manualPassword.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingUser(true);
    try {
      // Ensure we have a fresh/valid JWT before calling the protected backend function
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({
          title: 'Session expired',
          description: 'Please sign out and sign back in, then try again.',
          variant: 'destructive',
        });
        return;
      }

      const refreshRes = await supabase.auth.refreshSession();
      if (refreshRes.error) {
        toast({
          title: 'Session refresh failed',
          description: 'Please sign out and sign back in, then try again.',
          variant: 'destructive',
        });
        return;
      }

      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: manualEmail.trim().toLowerCase(),
          password: manualPassword,
          displayName: manualDisplayName.trim() || null,
          salesRank: manualSalesRank,
          canvasserRank: manualCanvasserRank,
          yearlyGoal: manualYearlyGoal ? parseFloat(manualYearlyGoal) : 0,
          roleType: manualRoleType,
        },
      });

      if (response.error) {
        const msg = response.error.message || 'Failed to create user';
        const looksLikeJwt = /invalid jwt|jwt/i.test(msg);

        toast({
          title: 'Error',
          description: looksLikeJwt
            ? 'Your session token is invalid. Please sign out and sign back in, then try again.'
            : msg,
          variant: 'destructive',
        });
        return;
      }

      const data = response.data;
      if (!data?.success) throw new Error(data?.error || 'Failed to create user');

      toast({
        title: 'User Created',
        description: `Account created for ${manualEmail}. They can now log in with the password you set.`,
      });

      // Reset form
      setManualEmail('');
      setManualPassword('');
      setManualDisplayName('');
      setManualSalesRank('SR1');
      setManualCanvasserRank('C1');
      setManualYearlyGoal('');
      setManualRoleType('sales_rep');
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const copyInviteLink = (invitation: Invitation) => {
    const inviteLink = `${PRODUCTION_URL}/auth?invite=${invitation.invite_code}&email=${encodeURIComponent(invitation.email)}`;
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: 'Link Copied',
      description: 'Invite link copied to clipboard',
    });
  };

  const deleteInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Invitation Deleted',
        description: 'The invitation has been revoked',
      });
      fetchInvitations();
    } catch (error: any) {
      console.error('Error deleting invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete invitation',
        variant: 'destructive',
      });
    }
  };

  const sendInviteEmail = async (invitation: Invitation) => {
    setSendingEmailId(invitation.id);
    try {
      const inviteLink = `${PRODUCTION_URL}/auth?invite=${invitation.invite_code}&email=${encodeURIComponent(invitation.email)}`;

      const response = await supabase.functions.invoke('send-invite-email', {
        body: {
          email: invitation.email,
          inviteCode: invitation.invite_code,
          displayName: invitation.preset_display_name,
          salesRank: invitation.preset_sales_rank,
          yearlyGoal: invitation.preset_yearly_goal,
          inviteLink,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (!data.success) throw new Error(data.error || 'Failed to send email');

      toast({
        title: 'Email Sent',
        description: `Invitation email sent to ${invitation.email}`,
      });
    } catch (error: any) {
      console.error('Error sending invite email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation email',
        variant: 'destructive',
      });
    } finally {
      setSendingEmailId(null);
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.is_used) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Used
        </Badge>
      );
    }
    
    const isExpired = new Date(invitation.expires_at) < new Date();
    if (isExpired) {
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground">Manage Users</h1>
        <p className="text-sm text-muted-foreground">Invite or create new team members</p>
      </div>

      <Tabs defaultValue="invite" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invite" className="text-xs sm:text-sm">
            <Send className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Send</span> Invite
          </TabsTrigger>
          <TabsTrigger value="create" className="text-xs sm:text-sm">
            <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Create</span> Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invite" className="space-y-4 sm:space-y-6 mt-4">
          {/* Invite Form */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Send Invitation</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                User will receive an invite link to create their own account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inviteRole" className="text-sm">User Type *</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'user' | 'canvasser')} disabled={isSubmitting}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Sales Rep</SelectItem>
                        <SelectItem value="canvasser">Canvasser</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-sm">Display Name (optional)</Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Enter display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  {inviteRole === 'user' && (
                    <div className="space-y-2">
                      <Label htmlFor="salesRank" className="text-sm">Starting Rank</Label>
                      <Select value={salesRank} onValueChange={setSalesRank} disabled={isSubmitting}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rank" />
                        </SelectTrigger>
                        <SelectContent>
                          {RANK_OPTIONS.map((rank) => (
                            <SelectItem key={rank} value={rank}>
                              {rank}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {inviteRole === 'canvasser' && (
                    <div className="space-y-2">
                      <Label htmlFor="canvasserRank" className="text-sm">Starting Rank</Label>
                      <Select value={canvasserRank} onValueChange={setCanvasserRank} disabled={isSubmitting}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rank" />
                        </SelectTrigger>
                        <SelectContent>
                          {CANVASSER_RANK_OPTIONS.map((rank) => (
                            <SelectItem key={rank} value={rank}>
                              {rank}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {inviteRole === 'user' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="yearlyGoal" className="text-sm">Yearly Goal (optional)</Label>
                      <Input
                        id="yearlyGoal"
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="e.g., 500000"
                        value={yearlyGoal}
                        onChange={(e) => setYearlyGoal(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}
                <Button type="submit" disabled={isSubmitting || !email.trim()} className="w-full sm:w-auto">
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Invitations List */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Invitations</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Manage pending and used invitations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">
                  No invitations yet. Send your first invitation above.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate text-sm">{invitation.email}</p>
                          <Badge variant="outline" className="text-xs">
                            {invitation.preset_role === 'canvasser' ? 'Canvasser' : 'Sales Rep'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Code: <span className="font-mono">{invitation.invite_code}</span>
                          {invitation.preset_role !== 'canvasser' && (
                            <>
                              {' • '}
                              Rank: {invitation.preset_sales_rank || 'SR1'}
                              {invitation.preset_yearly_goal ? ` • Goal: ${formatCurrency(invitation.preset_yearly_goal)}` : ''}
                            </>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(invitation)}
                        {!invitation.is_used && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => sendInviteEmail(invitation)}
                              disabled={sendingEmailId === invitation.id}
                              title="Send invite email"
                            >
                              {sendingEmailId === invitation.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyInviteLink(invitation)}
                              title="Copy invite link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteInvitation(invitation.id)}
                              title="Delete invitation"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          {/* Manual User Creation Form */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Create Account</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Directly create an account with a password. User can log in immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manualEmail" className="text-sm">Email Address *</Label>
                    <Input
                      id="manualEmail"
                      type="email"
                      placeholder="Enter email address"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      disabled={isCreatingUser}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manualPassword" className="text-sm">Password *</Label>
                    <Input
                      id="manualPassword"
                      type="password"
                      placeholder="Min 6 characters"
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      disabled={isCreatingUser}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manualDisplayName" className="text-sm">Display Name (optional)</Label>
                    <Input
                      id="manualDisplayName"
                      type="text"
                      placeholder="Enter display name"
                      value={manualDisplayName}
                      onChange={(e) => setManualDisplayName(e.target.value)}
                      disabled={isCreatingUser}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manualRoleType" className="text-sm">Account Type</Label>
                    <Select value={manualRoleType} onValueChange={(val) => setManualRoleType(val as 'admin_only' | 'sales_rep' | 'canvasser' | 'super_admin')} disabled={isCreatingUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin_only">Admin Only</SelectItem>
                        <SelectItem value="sales_rep">Sales Rep</SelectItem>
                        <SelectItem value="canvasser">Canvasser</SelectItem>
                        <SelectItem value="super_admin">Super Admin (All Roles)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Conditional rank and goal fields based on role type */}
                {(manualRoleType === 'sales_rep' || manualRoleType === 'super_admin') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualSalesRank" className="text-sm">Sales Rank</Label>
                      <Select value={manualSalesRank} onValueChange={setManualSalesRank} disabled={isCreatingUser}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rank" />
                        </SelectTrigger>
                        <SelectContent>
                          {RANK_OPTIONS.map((rank) => (
                            <SelectItem key={rank} value={rank}>
                              {rank}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualYearlyGoal" className="text-sm">Yearly Goal (optional)</Label>
                      <Input
                        id="manualYearlyGoal"
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="e.g., 500000"
                        value={manualYearlyGoal}
                        onChange={(e) => setManualYearlyGoal(e.target.value)}
                        disabled={isCreatingUser}
                      />
                    </div>
                  </div>
                )}
                {(manualRoleType === 'canvasser' || manualRoleType === 'super_admin') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualCanvasserRank" className="text-sm">Canvasser Rank</Label>
                      <Select value={manualCanvasserRank} onValueChange={setManualCanvasserRank} disabled={isCreatingUser}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rank" />
                        </SelectTrigger>
                        <SelectContent>
                          {CANVASSER_RANK_OPTIONS.map((rank) => (
                            <SelectItem key={rank} value={rank}>
                              {rank}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <Button type="submit" disabled={isCreatingUser || !manualEmail.trim() || !manualPassword.trim()} className="w-full sm:w-auto">
                  {isCreatingUser ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
