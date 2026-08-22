import Image from "next/image";
import { cn } from "@/lib/utils";

type PageHeroImageProps = {
  src: string;
  alt: string;
  /** Tailwind aspect ratio class. Defaults to a wide 4:3 panel. */
  aspect?: string;
  className?: string;
  /** Set on the first meaningful image of a page so it is not lazy-loaded. */
  priority?: boolean;
};

/**
 * Shared framed hero image used across the public pages, so the treatment is
 * consistent rather than re-invented per page: a soft brand glow behind, a
 * rounded frame, and a gradient that lets the dark page ground meet the photo.
 */
export function PageHeroImage({
  src,
  alt,
  aspect = "aspect-[4/3]",
  className,
  priority = false,
}: PageHeroImageProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden="true"
        className="absolute -inset-5 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_70%_30%,rgba(38,145,240,0.3),transparent_65%)] blur-2xl"
      />
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border border-white/15 shadow-2xl shadow-black/50",
          aspect
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 620px, (min-width: 1024px) 45vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#041635]/55 via-transparent to-transparent" />
      </div>
    </div>
  );
}
