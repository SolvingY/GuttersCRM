import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Send, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface StaleContract {
  id: string;
  signing_token: string;
  token_expires_at: string | null;
  sent_for_signing_at: string;
  quote_requests: {
    id: string;
    full_name: string;
    street_address: string;
    city: string;
    assigned_to: string | null;
    profiles: { full_name: string | null } | null;
  };
}

interface StaleContractsWidgetProps {
  isAdmin: boolean;
}

export function StaleContractsWidget({ isAdmin }: StaleContractsWidgetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<StaleContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchStaleContracts();
  }, [user]);

  const fetchStaleContracts = async () => {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('lead_forms')
      .select(`
        id, signing_token, token_expires_at, sent_for_signing_at,
        quote_requests!inner(
          id, full_name, street_address, city, assigned_to,
          profiles!quote_requests_assigned_to_fkey(full_name)
        )
      `)
      .eq('form_type', 'contract')
      .eq('status', 'sent')
      .lt('sent_for_signing_at', fortyEightHoursAgo);

    if (!isAdmin) {
      query = query.eq('quote_requests.assigned_to', user!.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stale contracts:', error);
      // Try without the profiles join as fallback
      let fallbackQuery = supabase
        .from('lead_forms')
        .select(`
          id, signing_token, token_expires_at, sent_for_signing_at,
          quote_requests!inner(id, full_name, street_address, city, assigned_to)
        `)
        .eq('form_type', 'contract')
        .eq('status', 'sent')
        .lt('sent_for_signing_at', fortyEightHoursAgo);

      if (!isAdmin) {
        fallbackQuery = fallbackQuery.eq('quote_requests.assigned_to', user!.id);
      }

      const { data: fallbackData } = await fallbackQuery;
      setContracts((fallbackData as any) || []);
    } else {
      setContracts((data as any) || []);
    }
    setLoading(false);
  };

  const handleResend = async (contract: StaleContract) => {
    setResending(contract.id);
    try {
      const lead = contract.quote_requests;
      let signingToken = contract.signing_token;
      const isExpired = contract.token_expires_at && new Date(contract.token_expires_at) < new Date();

      if (isExpired) {
        // Generate new token
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 7);
        const newToken = crypto.randomUUID();

        const { error: updateError } = await supabase
          .from('lead_forms')
          .update({
            token_expires_at: newExpiry.toISOString(),
            signing_token: newToken,
          })
          .eq('id', contract.id);

        if (updateError) throw updateError;
        signingToken = newToken;
      }

      // Get customer email from quote_requests
      const { data: leadData } = await supabase
        .from('quote_requests')
        .select('email, quote_amount')
        .eq('id', lead.id)
        .single();

      if (!leadData?.email) {
        toast({ title: 'No email found for customer', variant: 'destructive' });
        return;
      }

      // Get rep name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user!.id)
        .single();

      await supabase.functions.invoke('send-contract-signing-email', {
        body: {
          clientName: lead.full_name,
          clientEmail: leadData.email,
          signingToken,
          contractAmount: leadData.quote_amount,
          repName: profile?.full_name || 'Your NGR Representative',
          expiresAt: isExpired
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : contract.token_expires_at,
        },
      });

      toast({ title: 'Contract reminder sent' });
    } catch (err: any) {
      toast({ title: 'Failed to resend', description: err.message, variant: 'destructive' });
    } finally {
      setResending(null);
    }
  };

  const handleView = (leadId: string) => {
    if (isAdmin) {
      navigate(`/admin/leads/${leadId}`);
    } else {
      navigate(`/dashboard/leads/${leadId}`);
    }
  };

  if (loading || contracts.length === 0) return null;

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          Contracts Awaiting Signature ({contracts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="space-y-2">
          {contracts.map((contract) => {
            const lead = contract.quote_requests;
            const sentAgo = formatDistanceToNow(new Date(contract.sent_for_signing_at), { addSuffix: true });
            const repName = (lead as any).profiles?.full_name;

            return (
              <div
                key={contract.id}
                className="flex items-center justify-between gap-2 p-2 bg-card rounded-md border border-border text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">
                    {lead.full_name} — {lead.street_address}, {lead.city}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sent {sentAgo}
                    {isAdmin && repName && ` • Rep: ${repName}`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => handleResend(contract)}
                    disabled={resending === contract.id}
                  >
                    {resending === contract.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    Resend
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => handleView(lead.id)}
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
