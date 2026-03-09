import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionButtonProps {
  id: string;
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

export function AccordionButton({ id, title, icon: Icon, isOpen, onToggle, children }: AccordionButtonProps) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={cn(
          "w-full flex items-center gap-3 py-3 px-4 border transition-all duration-200 cursor-pointer",
          isOpen
            ? "rounded-t-xl bg-primary/5 border-primary/40 shadow-md"
            : "rounded-xl bg-card border-border shadow-sm hover:shadow-md hover:border-primary/30"
        )}
      >
        <Icon className="h-5 w-5 text-primary shrink-0" />
        <span className="font-semibold text-sm sm:text-base text-foreground flex-1 text-left">{title}</span>
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
            isOpen && "rotate-90"
          )}
        />
      </button>
      {isOpen && (
        <div className="border border-t-0 border-primary/40 rounded-b-xl bg-card p-4 shadow-md">
          {children}
        </div>
      )}
    </div>
  );
}
