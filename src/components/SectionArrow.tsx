export function SectionArrow() {
  return (
    <div className="relative flex justify-center -mt-1">
      {/* Continuous navigation line connected to section bottom */}
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-10 bg-accent/40" />
        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-accent" />
      </div>
    </div>
  );
}