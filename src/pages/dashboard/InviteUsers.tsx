import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Copy, Trash2, Send, CheckCircle, Clock, XCircle, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { RANK_OPTIONS } from '@/lib/constants';

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
}

export default function InviteUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [salesRank, setSalesRank] = useState('SR1');
  const [yearlyGoal, setYearlyGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

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
          preset_sales_rank: salesRank,
          preset_yearly_goal: yearlyGoal ? parseFloat(yearlyGoal) : 0,
          preset_display_name: displayName.trim() || null,
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
      setYearlyGoal('');
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

  const copyInviteLink = (invitation: Invitation) => {
    const baseUrl = window.location.origin;
    const inviteLink = `${baseUrl}/auth?invite=${invitation.invite_code}&email=${encodeURIComponent(invitation.email)}`;
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
      const baseUrl = window.location.origin;
      const inviteLink = `${baseUrl}/auth?invite=${invitation.invite_code}&email=${encodeURIComponent(invitation.email)}`;

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Invite Users</h1>
        <p className="text-muted-foreground">Invite new team members to join the dashboard</p>
      </div>

      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send Invitation</CardTitle>
          <CardDescription>
            Enter an email address and set initial parameters for the new team member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
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
                <Label htmlFor="displayName">Display Name (optional)</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Enter display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salesRank">Starting Rank</Label>
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
              <div className="space-y-2">
                <Label htmlFor="yearlyGoal">Yearly Goal (optional)</Label>
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
            <Button type="submit" disabled={isSubmitting || !email.trim()}>
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
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Manage pending and used invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No invitations yet. Send your first invitation above.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{invitation.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Code: <span className="font-mono">{invitation.invite_code}</span>
                      {' • '}
                      Rank: {invitation.preset_sales_rank || 'SR1'}
                      {invitation.preset_yearly_goal ? ` • Goal: ${formatCurrency(invitation.preset_yearly_goal)}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
    </div>
  );
}
