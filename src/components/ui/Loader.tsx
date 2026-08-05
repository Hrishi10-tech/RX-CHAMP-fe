function Spinner({ size = 56, thickness = 5 }: { size?: number; thickness?: number }) {
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 rounded-full border-[rgba(34,34,204,0.15)]"
        style={{ borderWidth: thickness, borderStyle: "solid" }}
      />

      <span
        className="absolute inset-0 animate-spin rounded-full border-transparent border-r-[rgb(34_34_204)] border-t-[rgb(34_34_204)]"
        style={{ borderWidth: thickness, borderStyle: "solid" }}
      />
    </span>
  );
}

export function Loader({
  label,
  className = "px-6 py-16",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-slate-400 ${className}`}>
      <Spinner size={36} thickness={4} />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function LoadingOverlay({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-white/70 backdrop-blur-[3px]">
      <Spinner size={56} thickness={5} />
      {label && <p className="animate-pulse text-sm font-medium text-slate-600">{label}</p>}
    </div>
  );
}
