import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-white/[0.04] motion-reduce:animate-none",
        className
      )}
      aria-hidden
      {...rest}
    />
  );
}
