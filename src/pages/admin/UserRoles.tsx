import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Check, Pencil, Archive, ArchiveRestore, Trash2, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditUserRoleModal } from '@/components/admin/EditUserRoleModal';
import { format } from 'date-fns';

interface UserWithRole {
  id: string;
  email: string | null;
  fullName: string | null;
  role: 'admin' | 'user' | 'canvasser';
  rank: string | null;
  isArchived: boolean;
  archivedAt: string | null;
}

export default function UserRoles() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<UserWithRole | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch profiles with archive status
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, is_archived, archived_at');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Fetch roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      toast({
        title: 'Error',
        description: 'Failed to fetch user roles',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Fetch user_metrics for sales rep ranks
    const { data: userMetricsData } = await supabase
      .from('user_metrics')
      .select('user_id, sales_rank');

    // Fetch canvasser_metrics for canvasser ranks
    const { data: canvasserMetricsData } = await supabase
      .from('canvasser_metrics')
      .select('user_id, canvasser_rank');

    const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);
    const salesRankMap = new Map(userMetricsData?.map(m => [m.user_id, m.sales_rank]) || []);
    const canvasserRankMap = new Map(canvasserMetricsData?.map(m => [m.user_id, m.canvasser_rank]) || []);

    const combined: UserWithRole[] = (profilesData || []).map(profile => {
      const role = (rolesMap.get(profile.id) as 'admin' | 'user' | 'canvasser') || 'user';
      let rank: string | null = null;
      
      if (role === 'canvasser') {
        rank = canvasserRankMap.get(profile.id) || 'C1';
      } else if (role === 'user') {
        rank = salesRankMap.get(profile.id) || 'SR1';
      }
      
      return {
        id: profile.id,
        email: null, // Email fetched from edge function when needed
        fullName: profile.full_name,
        role,
        rank,
        isArchived: profile.is_archived || false,
        archivedAt: profile.archived_at,
      };
    });

    // Sort: admins first, then by name
    combined.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

    setUsers(combined);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const copyUserId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleArchive = async () => {
    if (!targetUser) return;
    
    setActionLoading(targetUser.id);
    try {
      const response = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'archive', targetUserId: targetUser.id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to archive user');
      }

      toast({
        title: 'User Archived',
        description: `${targetUser.fullName || 'User'} has been archived and can no longer log in.`,
      });
      fetchUsers();
    } catch (error) {
      console.error('Error archiving user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to archive user',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setArchiveDialogOpen(false);
      setTargetUser(null);
    }
  };

  const handleUnarchive = async (user: UserWithRole) => {
    setActionLoading(user.id);
    try {
      const response = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'unarchive', targetUserId: user.id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to unarchive user');
      }

      toast({
        title: 'User Restored',
        description: `${user.fullName || 'User'} has been restored and can now log in again.`,
      });
      fetchUsers();
    } catch (error) {
      console.error('Error unarchiving user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to restore user',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!targetUser) return;
    
    setActionLoading(targetUser.id);
    try {
      const response = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'delete', targetUserId: targetUser.id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete user');
      }

      toast({
        title: 'User Deleted',
        description: `${targetUser.fullName || 'User'} has been permanently deleted.`,
      });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setDeleteDialogOpen(false);
      setTargetUser(null);
    }
  };

  const handlePasswordReset = async (user: UserWithRole) => {
    setActionLoading(user.id);
    try {
      const response = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'reset-password', targetUserId: user.id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send password reset');
      }

      const data = response.data;
      toast({
        title: 'Password Reset Sent',
        description: `A password reset email has been sent to ${data.email || user.fullName || 'the user'}.`,
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send password reset',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Admin</Badge>;
      case 'canvasser':
        return <Badge className="bg-primary text-primary-foreground">Canvasser</Badge>;
      default:
        return <Badge variant="secondary">Sales Rep</Badge>;
    }
  };

  const filteredUsers = users.filter(u => 
    activeTab === 'active' ? !u.isArchived : u.isArchived
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading text-foreground">User Roles Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage user roles, ranks, and account status. Archive users to remove them from active views while keeping their metrics.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'archived')}>
        <TabsList>
          <TabsTrigger value="active">
            Active Users ({users.filter(u => !u.isArchived).length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived Users ({users.filter(u => u.isArchived).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Rank</TableHead>
                  {activeTab === 'archived' && <TableHead>Archived</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === 'archived' ? 5 : 4} className="text-center text-muted-foreground py-8">
                      {activeTab === 'active' ? 'No active users found' : 'No archived users'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.fullName || 'Unknown User'}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Badge variant="outline">{user.rank || '—'}</Badge>
                        )}
                      </TableCell>
                      {activeTab === 'archived' && (
                        <TableCell className="text-muted-foreground text-sm">
                          {user.archivedAt ? format(new Date(user.archivedAt), 'MMM d, yyyy') : '—'}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {user.role !== 'admin' && activeTab === 'active' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user);
                                  setEditModalOpen(true);
                                }}
                                disabled={actionLoading === user.id}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTargetUser(user);
                                  setArchiveDialogOpen(true);
                                }}
                                disabled={actionLoading === user.id}
                              >
                                {actionLoading === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Archive className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePasswordReset(user)}
                                disabled={actionLoading === user.id}
                                title="Send password reset email"
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setTargetUser(user);
                                  setDeleteDialogOpen(true);
                                }}
                                disabled={actionLoading === user.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {activeTab === 'archived' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnarchive(user)}
                                disabled={actionLoading === user.id}
                              >
                                {actionLoading === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ArchiveRestore className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setTargetUser(user);
                                  setDeleteDialogOpen(true);
                                }}
                                disabled={actionLoading === user.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyUserId(user.id)}
                            className="text-xs"
                          >
                            {copiedId === user.id ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Role Modal */}
      <EditUserRoleModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={editingUser}
        onSuccess={fetchUsers}
      />

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{targetUser?.fullName || 'this user'}</strong>?
              <br /><br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Prevent them from logging in</li>
                <li>Remove them from active user lists</li>
                <li>Keep their historical metrics and data</li>
              </ul>
              <br />
              You can restore them later from the Archived Users tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archive User</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Permanently Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure you want to delete <strong>{targetUser?.fullName || 'this user'}</strong>?
              <br /><br />
              <span className="text-destructive font-semibold">This action cannot be undone.</span>
              <br /><br />
              All of the user's data will be permanently removed:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>User account and login</li>
                <li>Profile information</li>
                <li>All metrics and historical data</li>
                <li>Contest entries and wagers</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
