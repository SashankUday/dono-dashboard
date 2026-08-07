import { getInitials } from "@/lib/initials";

const TONE_CLASSES = {
  /** Solid green bubble used on the latest-merge card and the celebration. */
  solid: "bg-leaf text-white",
  /** Soft green bubble used in the activity feed. */
  soft: "bg-sprout text-leaf",
} as const;

export function Avatar({
  src,
  name,
  tone,
  className = "",
}: {
  src: string | null;
  name: string;
  tone: keyof typeof TONE_CLASSES;
  /** Size and type scale, so each usage can match its slot in the mockup. */
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full ${TONE_CLASSES[tone]} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
