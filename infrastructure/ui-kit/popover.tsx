"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@/infrastructure/ui";

/**
 * shadcn's popover, kept to the three parts this app uses.
 *
 * Two departures from what the generator wrote, both deliberate:
 *
 * The animation utilities are gone. They come from `tw-animate-css`, which
 * this project does not install, so every one of them was a class that styled
 * nothing. A popover that simply appears also matches the design's rule that
 * motion is close to nothing.
 *
 * `outline-hidden` stays. Radix moves focus to the panel when it opens, and a
 * ring around a whole container reads as an error rather than as a focus
 * position. The controls inside it keep the app-wide ring, which is what a
 * keyboard user actually needs to see.
 */

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "start",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground border-border z-50 w-72 rounded-xl border outline-hidden",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
