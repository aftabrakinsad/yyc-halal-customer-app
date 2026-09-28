/* eslint-disable @next/next/no-img-element */
export function Logo({ size = 44, className = "" }: { size?: number; className?: string }) {
  return <img src="/brand/logo.svg" width={size} height={size} alt="YYC Halal" className={className} />;
}
