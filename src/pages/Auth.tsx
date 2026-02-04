import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const inviteCodeSchema = z.string().min(1, 'Invite code is required');

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; inviteCode?: string }>({});

  const { signIn, signUp, user, loading, isAdmin, isCanvasser, hasSalesRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const fromState = (location.state as { from?: { pathname: string } })?.from?.pathname;

  // Pre-fill from URL params (invite link)
  useEffect(() => {
    const inviteParam = searchParams.get('invite');
    const emailParam = searchParams.get('email');
    
    if (inviteParam) {
      setInviteCode(inviteParam);
      setIsLogin(false);
    }
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Role-based redirect after login with cross-portal protection
  useEffect(() => {
    if (!loading && user) {
      // Determine correct portal based on role priority:
      // 1. Admins always go to admin portal (they can also access sales dashboard)
      // 2. Canvasser-only users go to canvasser portal
      // 3. Sales rep (with or without canvasser) goes to dashboard
      let targetRoute = '/dashboard';
      
      if (isAdmin) {
        // Admin users always go to admin portal by default
        targetRoute = '/admin';
      } else if (isCanvasser && !hasSalesRole) {
        // Canvasser-only users go to canvasser portal
        targetRoute = '/canvasser';
      }
      // else: Sales rep (or dual role) goes to dashboard with toggle
      
      // Only honor fromState if it matches the user's allowed portals
      if (fromState) {
        const isCanvasserRoute = fromState.startsWith('/canvasser');
        const isAdminRoute = fromState.startsWith('/admin');
        const isDashboardRoute = fromState.startsWith('/dashboard');
        
        // Admins can go to admin or dashboard routes
        if (isAdmin && (isAdminRoute || isDashboardRoute)) {
          navigate(fromState, { replace: true });
          return;
        }
        // Canvasser-only users can only go to canvasser routes
        if (isCanvasser && !hasSalesRole && isCanvasserRoute) {
          navigate(fromState, { replace: true });
          return;
        }
        // Sales rep users (with or without canvasser) can go to dashboard or canvasser routes
        if (hasSalesRole && (isDashboardRoute || (isCanvasser && isCanvasserRoute))) {
          navigate(fromState, { replace: true });
          return;
        }
      }
      
      // Default to role-appropriate portal
      navigate(targetRoute, { replace: true });
    }
  }, [user, loading, navigate, fromState, isAdmin, isCanvasser, hasSalesRole]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; inviteCode?: string } = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    // Require invite code for signup
    if (!isLogin) {
      const inviteResult = inviteCodeSchema.safeParse(inviteCode);
      if (!inviteResult.success) {
        newErrors.inviteCode = inviteResult.error.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateInviteCode = async (): Promise<boolean> => {
    // Use the secure RPC function instead of direct table query
    const { data, error } = await supabase.rpc('verify_invite_code', {
      _invite_code: inviteCode.toUpperCase(),
      _email: email.toLowerCase()
    });

    if (error) {
      console.error('Error verifying invite code:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify invite code. Please try again.',
        variant: 'destructive',
      });
      return false;
    }

    const result = data?.[0];
    
    if (!result?.is_valid) {
      toast({
        title: 'Invalid invite',
        description: result?.error_message || 'Invalid invite code or email.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  // markInviteAsUsed is now handled by database trigger (handle_invitation_on_signup)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Login failed',
              description: 'Invalid email or password. Please try again.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Login failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        }
      } else {
        // Validate invite code first
        const isValidInvite = await validateInviteCode();
        if (!isValidInvite) {
          setIsSubmitting(false);
          return;
        }

        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Sign up failed',
              description: 'This email is already registered. Please log in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign up failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          // Invite is automatically marked as used by database trigger
          toast({
            title: 'Account created!',
            description: 'You have been signed in automatically.',
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-heading text-foreground">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLogin
              ? 'Sign in to access your performance dashboard'
              : 'Sign up with your invite code to join the team'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="inviteCode" className="text-foreground">
                    Invite Code
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="inviteCode"
                      type="text"
                      placeholder="Enter your invite code"
                      value={inviteCode}
                      onChange={(e) => {
                        setInviteCode(e.target.value.toUpperCase());
                        setErrors(prev => ({ ...prev, inviteCode: undefined }));
                      }}
                      className={`pl-10 uppercase ${errors.inviteCode ? 'border-destructive' : 'border-input'}`}
                    />
                  </div>
                  {errors.inviteCode && (
                    <p className="text-sm text-destructive">{errors.inviteCode}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="border-input"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors(prev => ({ ...prev, email: undefined }));
                }}
                className={errors.email ? 'border-destructive' : 'border-input'}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors(prev => ({ ...prev, password: undefined }));
                }}
                className={errors.password ? 'border-destructive' : 'border-input'}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              {isLogin
                ? "Have an invite code? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
