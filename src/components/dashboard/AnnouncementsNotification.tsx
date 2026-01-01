import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

export function AnnouncementsNotification() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadAnnouncements = async () => {
      // Wait for welcome message to be shown first
      const welcomeShown = sessionStorage.getItem('welcomeShown');
      if (!welcomeShown) {
        // Check again in a second
        const timer = setTimeout(() => fetchUnreadAnnouncements(), 1000);
        return () => clearTimeout(timer);
      }

      // Check if we already showed announcements this session
      const announcementsShown = sessionStorage.getItem('announcementsShown');
      if (announcementsShown) {
        setLoading(false);
        return;
      }

      // Fetch active announcements
      const { data: allAnnouncements, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false });

      if (announcementsError) {
        console.error('Error fetching announcements:', announcementsError);
        setLoading(false);
        return;
      }

      if (!allAnnouncements || allAnnouncements.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch which announcements the user has already read
      const { data: readRecords } = await supabase
        .from('user_announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      const readIds = new Set(readRecords?.map(r => r.announcement_id) || []);
      
      // Filter to unread announcements
      const unread = allAnnouncements.filter(a => !readIds.has(a.id));

      if (unread.length > 0) {
        setAnnouncements(unread as Announcement[]);
        // Delay showing dialog to allow welcome message to close first
        setTimeout(() => {
          setShowDialog(true);
        }, 500);
      }

      setLoading(false);
    };

    // Start checking after a delay
    const timer = setTimeout(fetchUnreadAnnouncements, 1500);
    return () => clearTimeout(timer);
  }, [user]);

  const markAsRead = async (announcementId: string) => {
    if (!user) return;

    await supabase
      .from('user_announcement_reads')
      .insert({ user_id: user.id, announcement_id: announcementId });
  };

  const handleDismiss = async () => {
    // Mark all as read
    for (const announcement of announcements) {
      await markAsRead(announcement.id);
    }
    
    sessionStorage.setItem('announcementsShown', 'true');
    setShowDialog(false);
  };

  const handleNext = () => {
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'normal': return 'bg-blue-500 text-white';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading || announcements.length === 0) return null;

  const current = announcements[currentIndex];

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-lg" hideCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {announcements.length} unread announcement{announcements.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          <DialogTitle className="text-xl flex items-center gap-2">
            {current.title}
            <Badge className={getPriorityColor(current.priority)}>
              {current.priority}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-2">
            {format(new Date(current.created_at), 'MMM d, yyyy')}
          </p>
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
            {current.content}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {announcements.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentIndex + 1} of {announcements.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  disabled={currentIndex === announcements.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <Button onClick={handleDismiss}>
            Got It
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
