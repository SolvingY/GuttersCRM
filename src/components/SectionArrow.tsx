export function SectionArrow() {
  return (
    <div className="relative flex justify-center -mt-4 -mb-2">
      {/* Wide directional wedge */}
      <div className="flex flex-col items-center">
        <div className="w-2 h-10 bg-accent/50" />
        <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[18px] border-t-accent" />
      </div>
    </div>
  );
}