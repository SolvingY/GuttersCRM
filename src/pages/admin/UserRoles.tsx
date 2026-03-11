import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Check, Pencil, Archive, ArchiveRestore, Trash2, KeyRound, Mail, Settings2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EditUserRoleModal } from '@/components/admin/EditUserRoleModal';
import { SetPasswordModal } from '@/components/admin/SetPasswordModal';
import { AssignPresetModal } from '@/components/admin/AssignPresetModal';
import { format } from 'date-fns';

interface UserWithRole {
  id: string;
  email: string | null;
  fullName: string | null;
  roles: ('admin' | 'user' | 'canvasser' | 'supplementer' | 'production')[];
  salesRank: string | null;
  canvasserRank: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  hiddenFromLeaderboard: boolean;
  adminPresetId: string | null;
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
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserWithRole | null>(null);
  const [editEmailDialogOpen, setEditEmailDialogOpen] = useState(false);
  const [editEmailUser, setEditEmailUser] = useState<UserWithRole | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [presetUser, setPresetUser] = useState<UserWithRole | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, is_archived, archived_at, hidden_from_leaderboard, admin_preset_id');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      toast({ title: 'Error', description: 'Failed to fetch user roles', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { data: userMetricsData } = await supabase
      .from('user_metrics')
      .select('user_id, sales_rank');

    const { data: canvasserMetricsData } = await supabase
      .from('canvasser_metrics')
      .select('user_id, canvasser_rank');

    const rolesMap = new Map<string, ('admin' | 'user' | 'canvasser' | 'supplementer' | 'production')[]>();
    for (const r of rolesData || []) {
      const existing = rolesMap.get(r.user_id) || [];
      existing.push(r.role as 'admin' | 'user' | 'canvasser' | 'supplementer' | 'production');
      rolesMap.set(r.user_id, existing);
    }

    const salesRankMap = new Map(userMetricsData?.map(m => [m.user_id, m.sales_rank]) || []);
    const canvasserRankMap = new Map(canvasserMetricsData?.map(m => [m.user_id, m.canvasser_rank]) || []);

    const combined: UserWithRole[] = (profilesData || []).map(profile => ({
      id: profile.id,
      email: null,
      fullName: profile.full_name,
      roles: rolesMap.get(profile.id) || ['user'],
      salesRank: salesRankMap.get(profile.id) || 'SR1',
      canvasserRank: canvasserRankMap.get(profile.id) || 'C1',
      isArchived: profile.is_archived || false,
      archivedAt: profile.archived_at,
      hiddenFromLeaderboard: (profile as any).hidden_from_leaderboard || false,
      adminPresetId: (profile as any).admin_preset_id || null,
    }));

    combined.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

    // Fetch emails from edge function
    const userIds = combined.map(u => u.id);
    if (userIds.length > 0) {
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('admin-manage-user', {
          body: { action: 'fetch-emails', userIds },
        });
        if (!emailError && emailData?.emailMap) {
          for (const u of combined) {
            u.email = emailData.emailMap[u.id] || null;
          }
        }
      } catch (err) {
        console.error('Error fetching emails:', err);
      }
    }

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
      if (response.error) throw new Error(response.error.message || 'Failed to archive user');
      toast({ title: 'User Archived', description: `${targetUser.fullName || 'User'} has been archived and can no longer log in.` });
      fetchUsers();
    } catch (error) {
      console.error('Error archiving user:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to archive user', variant: 'destructive' });
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
      if (response.error) throw new Error(response.error.message || 'Failed to unarchive user');
      toast({ title: 'User Restored', description: `${user.fullName || 'User'} has been restored and can now log in again.` });
      fetchUsers();
    } catch (error) {
      console.error('Error unarchiving user:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to restore user', variant: 'destructive' });
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
      if (response.error) throw new Error(response.error.message || 'Failed to delete user');
      toast({ title: 'User Deleted', description: `${targetUser.fullName || 'User'} has been permanently deleted.` });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete user', variant: 'destructive' });
    } finally {
      setActionLoading(null);
      setDeleteDialogOpen(false);
      setTargetUser(null);
    }
  };

  const handleUpdateEmail = async () => {
    if (!editEmailUser || !newEmail.trim()) return;
    setEmailSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'update-email', targetUserId: editEmailUser.id, newEmail: newEmail.trim() },
      });
      if (error) throw new Error(error.message || 'Failed to update email');
      toast({ title: 'Email Updated', description: `Email updated for ${editEmailUser.fullName || 'user'}.` });
      setEditEmailDialogOpen(false);
      setEditEmailUser(null);
      setNewEmail('');
      fetchUsers();
    } catch (error) {
      console.error('Error updating email:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update email', variant: 'destructive' });
    } finally {
      setEmailSaving(false);
    }
  };

  const getRoleBadges = (roles: string[]) => (
    <div className="flex flex-wrap gap-1">
      {roles.includes('admin') && <Badge variant="destructive">Admin</Badge>}
      {roles.includes('user') && <Badge variant="secondary">Sales Rep</Badge>}
      {roles.includes('canvasser') && <Badge className="bg-primary text-primary-foreground">Canvasser</Badge>}
      {roles.includes('supplementer') && <Badge className="bg-accent text-accent-foreground">Supplementer</Badge>}
      {roles.includes('production') && <Badge className="bg-amber-500 text-white">Production</Badge>}
    </div>
  );

  const getRankDisplay = (user: UserWithRole) => {
    const ranks: string[] = [];
    if (user.roles.length === 1 && user.roles.includes('admin')) {
      return <span className="text-muted-foreground">—</span>;
    }
    if (user.roles.includes('user')) ranks.push(user.salesRank || 'SR1');
    if (user.roles.includes('canvasser')) ranks.push(user.canvasserRank || 'C1');
    if (ranks.length === 0) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {ranks.map((rank, idx) => <Badge key={idx} variant="outline">{rank}</Badge>)}
      </div>
    );
  };

  const canEditUser = (_user: UserWithRole) => true;

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
          Manage user roles, ranks, and account status. Users can have both Sales Rep and Canvasser roles.
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
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Ranks</TableHead>
                  {activeTab === 'archived' && <TableHead>Archived</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === 'archived' ? 6 : 5} className="text-center text-muted-foreground py-8">
                      {activeTab === 'active' ? 'No active users found' : 'No archived users'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.fullName || 'Unknown User'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {user.email || '—'}
                          </span>
                          {user.email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setEditEmailUser(user);
                                setNewEmail(user.email || '');
                                setEditEmailDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadges(user.roles)}</TableCell>
                      <TableCell>{getRankDisplay(user)}</TableCell>
                      {activeTab === 'archived' && (
                        <TableCell className="text-muted-foreground text-sm">
                          {user.archivedAt ? format(new Date(user.archivedAt), 'MMM d, yyyy') : '—'}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEditUser(user) && activeTab === 'active' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => { setEditingUser(user); setEditModalOpen(true); }} disabled={actionLoading === user.id}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setTargetUser(user); setArchiveDialogOpen(true); }} disabled={actionLoading === user.id}>
                                {actionLoading === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setPasswordUser(user); setPasswordModalOpen(true); }} disabled={actionLoading === user.id} title="Set password">
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setPresetUser(user); setPresetModalOpen(true); }} disabled={actionLoading === user.id} title="Assign preset">
                                <Settings2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setTargetUser(user); setDeleteDialogOpen(true); }} disabled={actionLoading === user.id}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {activeTab === 'archived' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleUnarchive(user)} disabled={actionLoading === user.id}>
                                {actionLoading === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setTargetUser(user); setDeleteDialogOpen(true); }} disabled={actionLoading === user.id}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => copyUserId(user.id)} className="text-xs">
                            {copiedId === user.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
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
      <EditUserRoleModal open={editModalOpen} onOpenChange={setEditModalOpen} user={editingUser} onSuccess={fetchUsers} />

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
            <AlertDialogTitle>Delete User Permanently</AlertDialogTitle>
            <AlertDialogDescription className="text-destructive">
              ⚠️ This action cannot be undone!
              <br /><br />
              Are you sure you want to permanently delete <strong>{targetUser?.fullName || 'this user'}</strong>?
              <br /><br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remove all their metrics and historical data</li>
                <li>Delete their account completely</li>
                <li>Remove them from all leaderboards</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set Password Modal */}
      <SetPasswordModal open={passwordModalOpen} onOpenChange={setPasswordModalOpen} user={passwordUser} />

      {/* Assign Preset Modal */}
      <AssignPresetModal
        open={presetModalOpen}
        onOpenChange={setPresetModalOpen}
        userId={presetUser?.id || null}
        userName={presetUser?.fullName || null}
        currentPresetId={presetUser?.adminPresetId || null}
        onSuccess={fetchUsers}
      />

      {/* Edit Email Dialog */}
      <Dialog open={editEmailDialogOpen} onOpenChange={setEditEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Email</DialogTitle>
            <DialogDescription>
              Change the email address for <strong>{editEmailUser?.fullName || 'this user'}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="current-email">Current Email</Label>
              <Input id="current-email" value={editEmailUser?.email || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">New Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateEmail} disabled={emailSaving || !newEmail.trim() || newEmail === editEmailUser?.email}>
              {emailSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
