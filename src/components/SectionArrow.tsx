export function SectionArrow() {
  return (
    <div className="relative py-2 flex justify-center">
      {/* Continuous navigation line with arrow */}
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-8 bg-accent/40" />
        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-accent" />
      </div>
    </div>
  );
}