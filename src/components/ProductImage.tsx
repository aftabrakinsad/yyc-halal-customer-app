/* eslint-disable @next/next/no-img-element */
export function ProductImage({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  if (src) return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
  // Friendly placeholder when the store hasn't uploaded a photo yet.
  return (
    <div role="img" aria-label={alt} className={`flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 ${className}`}>
      <svg viewBox="0 0 64 64" className="h-1/2 w-1/2 text-brand-600/70" aria-hidden>
        <path
          fill="currentColor"
          d="M44 10c7 0 12 5.6 12 12.5 0 9.7-9.5 15.6-15 21.3-3.5 3.6-5.2 8.9-10.7 10.1-6.6 1.4-13.2-3.3-14-10-.6-4.7 1.6-8.4 5.2-11.3 5.2-4.2 6.7-10.9 11.5-16.6C36 12.4 39.8 10 44 10Z"
        />
        <circle cx="41" cy="23" r="4.5" fill="#fff" />
      </svg>
    </div>
  );
}
