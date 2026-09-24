import Link from "next/link";

export function Brand({ compact = false, href = "/dashboard" }: { compact?: boolean; href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Hestra AI home">
      <span className="brand-mark" aria-hidden="true"><i /><b /></span>
      {!compact && <span><strong>HESTRA <em>AI</em></strong><small>Adaptive Nickel Intelligence</small></span>}
    </Link>
  );
}
