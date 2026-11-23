"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// `stackOnMobile`: below md each row becomes a labelled card (see [data-stack-mobile] in globals.css).
function Table({
  className,
  stackOnMobile = false,
  ...props
}: React.ComponentProps<"table"> & { stackOnMobile?: boolean }) {
  const ref = React.useRef<HTMLTableElement>(null)

  // Copies each column heading onto its cells as data-label; runs every render because rows change.
  React.useEffect(() => {
    const table = ref.current
    if (!stackOnMobile || !table) return
    const headings = [...table.querySelectorAll("thead tr:first-child > th")].flatMap((th) => {
      const label = (th.textContent ?? "").trim()
      const span = (th as HTMLTableCellElement).colSpan || 1
      return Array.from({ length: span }, () => label)
    })
    for (const row of table.querySelectorAll("tbody tr")) {
      let col = 0
      for (const cell of row.children) {
        const td = cell as HTMLTableCellElement
        const label = td.colSpan > 1 ? "" : headings[col]
        if (label) td.setAttribute("data-label", label)
        else td.removeAttribute("data-label")
        col += td.colSpan || 1
      }
    }
  })

  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        ref={ref}
        data-slot="table"
        data-stack-mobile={stackOnMobile ? "" : undefined}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
