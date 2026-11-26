"use client"

import * as React from "react"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { copy } from "@/config/admin"
import { cn } from "@/lib/utils"

// `stackOnMobile`: below md rows become labelled cards; wide tables get a screen-pinned scrollbar, ◀ ▶ buttons and edge shadows.
function Table({
  className,
  stackOnMobile = false,
  ...props
}: React.ComponentProps<"table"> & { stackOnMobile?: boolean }) {
  const ref = React.useRef<HTMLTableElement>(null)
  const scroller = React.useRef<HTMLDivElement>(null)
  const track = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{ x: number; left: number } | null>(null)
  const scrollerId = React.useId()
  const [edges, setEdges] = React.useState({ overflow: false, atStart: true, atEnd: true, size: 100, offset: 0 })

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

  const measure = React.useCallback(() => {
    const el = scroller.current
    if (!el) return
    const overflow = el.scrollWidth > el.clientWidth + 1
    // Handle length = share of the table on screen; handle position = how far it has scrolled.
    const size = overflow ? Math.max(8, (el.clientWidth / el.scrollWidth) * 100) : 100
    const range = el.scrollWidth - el.clientWidth
    const offset = overflow && range > 0 ? (el.scrollLeft / range) * (100 - size) : 0
    const next = {
      overflow,
      atStart: el.scrollLeft <= 1,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
      size,
      offset,
    }
    setEdges((prev) =>
      prev.overflow === next.overflow &&
      prev.atStart === next.atStart &&
      prev.atEnd === next.atEnd &&
      Math.abs(prev.size - next.size) < 0.1 &&
      Math.abs(prev.offset - next.offset) < 0.1
        ? prev
        : next,
    )
  }, [])

  // Re-measure when the container or the table changes size (sidebar toggle, new rows, card layout).
  React.useEffect(() => {
    const el = scroller.current
    if (!el) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [measure])

  // Dragging the handle: pixels moved on the track scale up to pixels of table.
  function onHandleDown(event: React.PointerEvent<HTMLSpanElement>) {
    const el = scroller.current
    if (!el) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, left: el.scrollLeft }
  }

  function onHandleMove(event: React.PointerEvent<HTMLSpanElement>) {
    const el = scroller.current
    const bar = track.current
    if (!drag.current || !el || !bar) return
    const ratio = el.scrollWidth / bar.clientWidth
    el.scrollLeft = drag.current.left + (event.clientX - drag.current.x) * ratio
  }

  // Clicking the track (not the handle) centres the view on that point.
  function onTrackDown(event: React.PointerEvent<HTMLDivElement>) {
    const el = scroller.current
    const bar = track.current
    if (!el || !bar || event.target !== bar) return
    const rect = bar.getBoundingClientRect()
    const fraction = (event.clientX - rect.left) / rect.width
    el.scrollTo({ left: fraction * el.scrollWidth - el.clientWidth / 2, behavior: "smooth" })
  }

  function step(direction: -1 | 1) {
    const el = scroller.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" })
  }

  const t = copy.common.table

  return (
    <div data-slot="table-scroll-root" className="relative">
      <div
        ref={scroller}
        id={scrollerId}
        data-slot="table-container"
        // The pinned bar below is the visible scrollbar; hiding this one avoids two stacked bars at the table end.
        className="relative w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
        onScroll={measure}
        tabIndex={edges.overflow ? 0 : undefined}
        role={edges.overflow ? "region" : undefined}
        aria-label={edges.overflow ? t.region : undefined}
      >
        <table
          ref={ref}
          data-slot="table"
          data-stack-mobile={stackOnMobile ? "" : undefined}
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
      {edges.overflow ? (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-foreground/10 to-transparent transition-opacity",
              edges.atStart ? "opacity-0" : "opacity-100",
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-foreground/10 to-transparent transition-opacity",
              edges.atEnd ? "opacity-0" : "opacity-100",
            )}
          />
          {/* Sticks to the bottom of the screen while the table is in view, then rests under the last row. */}
          <div className="sticky bottom-0 z-20 flex items-center gap-1.5 border-t bg-background/95 px-1.5 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={edges.atStart}
              aria-label={t.scrollLeft}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            {/* Drawn, not native: browser scrollbars hide until used on Mac and in some Chrome setups. */}
            <div
              ref={track}
              onPointerDown={onTrackDown}
              title={t.hint}
              className="relative h-2.5 min-w-0 flex-1 cursor-pointer rounded-full bg-muted"
            >
              <span
                role="scrollbar"
                aria-controls={scrollerId}
                aria-orientation="horizontal"
                aria-label={t.region}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(edges.size >= 100 ? 0 : (edges.offset / (100 - edges.size)) * 100)}
                onPointerDown={onHandleDown}
                onPointerMove={onHandleMove}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
                className="absolute inset-y-0 cursor-grab touch-none rounded-full bg-muted-foreground/45 transition-colors hover:bg-muted-foreground/70 active:cursor-grabbing active:bg-muted-foreground/80"
                style={{ width: `${edges.size}%`, left: `${edges.offset}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={edges.atEnd}
              aria-label={t.scrollRight}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </>
      ) : null}
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
