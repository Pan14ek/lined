import { Select as SelectPrimitive } from "@base-ui/react/select"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export const Select = <Value, Multiple extends boolean | undefined = false>({
  ...props
}: SelectPrimitive.Root.Props<Value, Multiple>) => {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

export const SelectValue = ({ ...props }: SelectPrimitive.Value.Props) => {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

export const SelectTrigger = ({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & { size?: "default" | "sm" }) => {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm whitespace-nowrap transition-colors outline-none data-placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=sm]:h-7 dark:bg-input/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export const SelectPortal = ({ ...props }: SelectPrimitive.Portal.Props) => {
  return <SelectPrimitive.Portal data-slot="select-portal" {...props} />
}

export const SelectPositioner = ({
  className,
  sideOffset = 4,
  ...props
}: SelectPrimitive.Positioner.Props) => {
  return (
    <SelectPrimitive.Positioner
      data-slot="select-positioner"
      className={cn("isolate z-50 outline-none", className)}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

export const SelectContent = ({
  className,
  children,
  sideOffset = 4,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<SelectPrimitive.Positioner.Props, "sideOffset" | "align" | "side">) => {
  return (
    <SelectPortal>
      <SelectPositioner sideOffset={sideOffset} align={props.align} side={props.side}>
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPositioner>
    </SelectPortal>
  )
}

export const SelectItem = ({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) => {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="pointer-events-none absolute right-2 flex items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

export const SelectGroup = ({ ...props }: SelectPrimitive.Group.Props) => {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

export const SelectGroupLabel = ({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) => {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-group-label"
      className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  )
}

export const SelectSeparator = ({
  className,
  ...props
}: SelectPrimitive.Separator.Props) => {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}
