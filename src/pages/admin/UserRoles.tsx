import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UserWithRole {
  id: string;
  fullName: string | null;
  role: 'admin' | 'user' | 'canvasser';
}

export default function UserRoles() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name');

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

    const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

    const combined: UserWithRole[] = (profilesData || []).map(profile => ({
      id: profile.id,
      fullName: profile.full_name,
      role: (rolesMap.get(profile.id) as 'admin' | 'user' | 'canvasser') || 'user',
    }));

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

  const handleRoleChange = async (userId: string, newRole: 'user' | 'canvasser') => {
    setUpdating(userId);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        });
        setUpdating(null);
        return;
      }

      const response = await supabase.functions.invoke('admin-set-user-role', {
        body: { targetUserId: userId, newRole },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to update role');
      }

      toast({
        title: 'Role Updated',
        description: `User role changed to ${newRole === 'user' ? 'Sales Rep' : 'Canvasser'}`,
      });

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const copyUserId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
        <h2 className="text-2xl font-heading text-foreground">User Roles</h2>
        <p className="text-sm text-muted-foreground">
          Manage user roles. Change between Sales Rep and Canvasser.
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Change Role</TableHead>
              <TableHead className="w-24">User ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.fullName || 'Unknown User'}
                </TableCell>
                <TableCell>{getRoleBadge(user.role)}</TableCell>
                <TableCell>
                  {user.role === 'admin' ? (
                    <span className="text-xs text-muted-foreground">Cannot change admin role</span>
                  ) : (
                    <Select
                      value={user.role}
                      onValueChange={(value: 'user' | 'canvasser') => handleRoleChange(user.id, value)}
                      disabled={updating === user.id}
                    >
                      <SelectTrigger className="w-32">
                        {updating === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Sales Rep</SelectItem>
                        <SelectItem value="canvasser">Canvasser</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyUserId(user.id)}
                    className="text-xs"
                  >
                    {copiedId === user.id ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    Copy
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
