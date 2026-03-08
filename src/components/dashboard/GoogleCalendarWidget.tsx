import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

export function GoogleCalendarWidget() {
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchUrl = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'google_calendar_embed_url')
        .maybeSingle();
      setCalendarUrl(data?.value || null);
      setLoading(false);
    };
    fetchUrl();
  }, []);

  if (loading) return null;
  if (!calendarUrl) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 group">
        {isOpen ? <ChevronDown className="h-5 w-5 text-accent" /> : <ChevronRight className="h-5 w-5 text-accent" />}
        <Calendar className="h-5 w-5 text-accent" />
        <span className="font-heading font-semibold text-lg text-foreground">Team Calendar</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-b-lg">
            <iframe
              src={calendarUrl}
              className="w-full border-0"
              style={{ height: '400px' }}
              title="Team Calendar"
              loading="lazy"
            />
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
