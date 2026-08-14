import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md bg-accent bg-[length:200%_100%] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent animate-[shimmer_1.5s_infinite]", className)}
      {...props}
    />
  )
}

export { Skeleton }
