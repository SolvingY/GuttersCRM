import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface SectionItemProps {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

function SectionItem({ children }: SectionItemProps) {
  return <>{children}</>;
}

interface SectionCarouselProps {
  activeSection: string | null;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

function SectionCarousel({ activeSection, onToggle, children }: SectionCarouselProps) {
  const items: SectionItemProps[] = [];

  React.Children.forEach(children, (child) => {
    if (React.isValidElement<SectionItemProps>(child) && child.type === SectionItem) {
      items.push(child.props);
    }
  });

  const activeItem = items.find((item) => item.id === activeSection);

  return (
    <div className="space-y-3">
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-card text-foreground border-border hover:border-primary/40 hover:shadow-sm"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {activeItem && (
        <div className="border border-border rounded-xl bg-card p-4 shadow-sm animate-in fade-in-50 duration-200">
          {activeItem.children}
        </div>
      )}
    </div>
  );
}

SectionCarousel.Item = SectionItem;

export { SectionCarousel };
