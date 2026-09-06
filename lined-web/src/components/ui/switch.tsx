import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

export const Switch = ({ className, ...props }: SwitchPrimitive.Root.Props) => {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-8 shrink-0 items-center rounded-full border border-transparent bg-input transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-checked:bg-primary dark:data-unchecked:bg-input/80",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-background shadow-sm ring-0 transition-transform data-checked:translate-x-[13px] dark:bg-foreground"
      />
    </SwitchPrimitive.Root>
  )
}
