import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Lock, Target } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [yearlyGoal, setYearlyGoal] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setFullName(profileData.full_name || '');
      }
      
      // Fetch yearly goal from user_metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('user_metrics')
        .select('yearly_goal')
        .eq('user_id', user.id)
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (metricsError) {
        console.error('Error fetching metrics:', metricsError);
      } else if (metricsData) {
        setYearlyGoal(String(metricsData.yearly_goal || 0));
      }
      
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    
    // Update profile table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);

    // Also update display_name in ALL user_metrics records for this user
    const { error: metricsError } = await supabase
      .from('user_metrics')
      .update({ display_name: fullName })
      .eq('user_id', user.id);

    if (profileError || metricsError) {
      toast({
        title: 'Error updating profile',
        description: profileError?.message || metricsError?.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Profile updated',
        description: 'Your name has been updated across the system.',
      });
    }
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: 'Error changing password',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Password changed',
        description: 'Your password has been updated.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setChangingPassword(false);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingGoal(true);
    
    const goalValue = parseFloat(yearlyGoal) || 0;
    
    const { error } = await supabase
      .from('user_metrics')
      .update({ yearly_goal: goalValue })
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Error updating goal',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Goal updated',
        description: 'Your yearly sales goal has been updated.',
      });
    }
    setSavingGoal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl min-w-0 w-full">
      <div>
        <h2 className="text-xl sm:text-2xl font-heading text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your account settings</p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-accent" />
            <CardTitle className="text-foreground">Profile</CardTitle>
          </div>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            <CardTitle className="text-foreground">Goals & Targets</CardTitle>
          </div>
          <CardDescription>Set your yearly sales goal to track progress</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveGoal} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="yearlyGoal" className="text-foreground">Yearly Sales Goal ($)</Label>
              <Input
                id="yearlyGoal"
                type="number"
                value={yearlyGoal}
                onChange={(e) => setYearlyGoal(e.target.value)}
                placeholder="500000"
                min="0"
                step="1000"
              />
              <p className="text-xs text-muted-foreground">
                Set a sales target for the fiscal year to track your progress
              </p>
            </div>
            <Button
              type="submit"
              disabled={savingGoal}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {savingGoal && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Goal
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-accent" />
            <CardTitle className="text-foreground">Change Password</CardTitle>
          </div>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-foreground">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={changingPassword}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
