/**
 * GuardianMark — the Guardian "vigil beacon" mark.
 * A filled diamond with a concentric vergence line: reads as a tracking
 * beacon / a guard's lamp, not a literal shield. Burnt-amber signal on
 * graphite. Replace the cliché shield icon across the brand.
 */
export default function GuardianMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" className={className} aria-hidden="true">
      {/* Outer vergence ring */}
      <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      {/* Inner tracking ring */}
      <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.65" />
      {/* Filled beacon diamond (the signal) */}
      <rect x="14.5" y="14.5" width="19" height="19" rx="4"
        transform="rotate(45 24 24)" fill="currentColor" />
      {/* Crosshair center — the fixed vigil point */}
      <circle cx="24" cy="24" r="3.2" fill="#1B1815" />
    </svg>
  );
}
