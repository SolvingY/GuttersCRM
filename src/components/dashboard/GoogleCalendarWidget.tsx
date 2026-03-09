import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { AccordionButton } from '@/components/dashboard/AccordionButton';

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

  const toggle = () => setIsOpen(prev => !prev);

  return (
    <AccordionButton
      id="calendar"
      title="Team Calendar"
      icon={Calendar}
      isOpen={isOpen}
      onToggle={toggle}
    >
      <div className="-m-4 overflow-hidden rounded-b-xl">
        <iframe
          src={calendarUrl}
          className="w-full border-0"
          style={{ height: '400px' }}
          title="Team Calendar"
          loading="lazy"
        />
      </div>
    </AccordionButton>
  );
}
