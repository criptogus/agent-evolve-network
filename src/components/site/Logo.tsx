export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill="var(--primary)" />
      <circle cx="8.5" cy="9" r="1.7" fill="white" />
      <circle cx="15.5" cy="9" r="1.7" fill="white" />
      <circle cx="8.5" cy="15.5" r="1.7" fill="white" />
      <circle cx="15.5" cy="15.5" r="1.7" fill="white" />
      <path d="M8.5 9 L15.5 15.5 M15.5 9 L8.5 15.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}
