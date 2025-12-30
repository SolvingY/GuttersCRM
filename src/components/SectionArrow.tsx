export function SectionArrow() {
  return (
    <div className="relative flex justify-center -mt-4 -mb-2">
      {/* Continuous navigation line connected to section bottom */}
      <div className="flex flex-col items-center">
        <div className="w-1 h-12 bg-accent/50" />
        <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[14px] border-t-accent" />
      </div>
    </div>
  );
}