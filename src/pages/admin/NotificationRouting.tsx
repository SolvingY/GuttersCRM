import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, X, Mail } from 'lucide-react';
import { toast } from 'sonner';
import ReportSettings from './ReportSettings';

const NOTIFICATION_TYPES: { key: string; label: string; description: string }[] = [
  { key: 'new_application', label: 'New Applications', description: 'Job application notifications' },
  { key: 'new_lead', label: 'New Internet Leads', description: 'When a new quote request is submitted' },
  { key: 'lead_assigned', label: 'Lead Assignments', description: 'When a lead is assigned to a rep' },
  { key: 'flagged_shift', label: 'Flagged Shifts', description: 'When a canvasser shift is flagged' },
  { key: 'auto_clockout', label: 'Auto Clock-Out', description: 'When a shift is auto-closed after 4 hours' },
];

interface RoutingEntry {
  id: string;
  notification_type: string;
  email: string;
  is_active: boolean;
}

export default function NotificationRouting() {
  const queryClient = useQueryClient();
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['notification-routing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_routing')
        .select('*')
        .order('notification_type')
        .order('email');
      if (error) throw error;
      return data as RoutingEntry[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ type, email }: { type: string; email: string }) => {
      const { data, error } = await supabase
        .from('notification_routing')
        .insert({ notification_type: type, email: email.trim().toLowerCase() })
        .select()
        .single();
      if (error) throw error;
      return data as RoutingEntry;
    },
    onMutate: async ({ type, email }) => {
      await queryClient.cancelQueries({ queryKey: ['notification-routing'] });
      const previous = queryClient.getQueryData<RoutingEntry[]>(['notification-routing']);
      const optimistic: RoutingEntry = {
        id: `temp-${Date.now()}`,
        notification_type: type,
        email: email.trim().toLowerCase(),
        is_active: true,
      };
      queryClient.setQueryData<RoutingEntry[]>(['notification-routing'], (old = []) => [...old, optimistic]);
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-routing'] });
      setNewEmail('');
      setAddingTo(null);
      toast.success('Recipient added');
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['notification-routing'], context.previous);
      if (err.message?.includes('duplicate')) {
        toast.error('This email is already added for this notification type');
      } else {
        toast.error('Failed to add: ' + err.message);
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('notification_routing')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ['notification-routing'] });
      const previous = queryClient.getQueryData<RoutingEntry[]>(['notification-routing']);
      queryClient.setQueryData<RoutingEntry[]>(['notification-routing'], (old = []) =>
        old.map((e) => (e.id === id ? { ...e, is_active } : e))
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-routing'] });
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['notification-routing'], context.previous);
      toast.error('Failed to update: ' + err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notification_routing')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notification-routing'] });
      const previous = queryClient.getQueryData<RoutingEntry[]>(['notification-routing']);
      queryClient.setQueryData<RoutingEntry[]>(['notification-routing'], (old = []) =>
        old.filter((e) => e.id !== id)
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-routing'] });
      toast.success('Recipient removed');
    },
    onError: (err: any, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['notification-routing'], context.previous);
      toast.error('Failed to remove: ' + err.message);
    },
  });

  const handleAdd = (type: string) => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    addMutation.mutate({ type, email: newEmail });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading text-foreground">Notifications & Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage notification routing and scheduled report settings.
        </p>
      </div>

      <Tabs defaultValue="routing" className="w-full">
        <TabsList>
          <TabsTrigger value="routing">Notification Routing</TabsTrigger>
          <TabsTrigger value="reports">Report Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="routing" className="space-y-6 mt-4">
          {NOTIFICATION_TYPES.map((type) => {
            const typeEntries = entries.filter((e) => e.notification_type === type.key);
            const isAdding = addingTo === type.key;

            return (
              <Card key={type.key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4 text-accent" />
                        {type.label}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">{type.description}</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setAddingTo(isAdding ? null : type.key); setNewEmail(''); }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isAdding && (
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd(type.key)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleAdd(type.key)} disabled={addMutation.isPending}>
                        {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setAddingTo(null); setNewEmail(''); }}>
                        Cancel
                      </Button>
                    </div>
                  )}

                  {typeEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No recipients configured. Fallback emails will be used.</p>
                  ) : (
                    <div className="space-y-2">
                      {typeEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={entry.is_active}
                              onCheckedChange={(checked) =>
                                toggleMutation.mutate({ id: entry.id, is_active: checked })
                              }
                            />
                            <span className={`text-sm ${!entry.is_active ? 'text-muted-foreground line-through' : ''}`}>
                              {entry.email}
                            </span>
                            {!entry.is_active && (
                              <Badge variant="secondary" className="text-[10px]">Paused</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteMutation.mutate(entry.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <ReportSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
