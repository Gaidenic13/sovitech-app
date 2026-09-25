"use client"

import { useEffect, useRef, type RefObject } from "react"

type Options = {
  /** Move focus to the element after scrolling (default: true). */
  focus?: boolean
  /** Turn the behaviour off entirely without changing call sites (default: true). */
  enabled?: boolean
  /**
   * Skip the scroll when the element is already comfortably visible. Keeps the
   * page still when a transition happens in view (default: true).
   */
  skipIfVisible?: boolean
  /**
   * Height of any *additional* sticky bar stacked below the site header
   * (e.g. the tab bar on /servicii, the filter bar on /produse). The header
   * itself is measured automatically.
   */
  stackedBarHeight?: number
}

/** Breathing room between the sticky chrome and the target. */
const GAP = 24

/**
 * Total sticky chrome height. The site header is measured live rather than
 * hard-coded, so this stays correct if its height changes across breakpoints.
 * Applied as inline scroll-margin-top, which keeps the behaviour independent of
 * CSS build/layer specifics.
 */
function stickyOffset(stackedBarHeight: number) {
  if (typeof document === "undefined") return 64 + GAP
  const header = document.querySelector("header")
  const headerH = header instanceof HTMLElement ? header.offsetHeight : 64
  return headerH + stackedBarHeight + GAP
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function isComfortablyInView(el: HTMLElement, offset: number) {
  const rect = el.getBoundingClientRect()
  // Visible if its top sits below the sticky chrome and within the viewport.
  return rect.top >= offset && rect.top < window.innerHeight * 0.6
}

/**
 * Scrolls to (and optionally focuses) a section when `dependency` changes.
 *
 * Deliberate behaviours:
 *  - never fires on first mount, so landing on a page does not auto-scroll
 *  - honours prefers-reduced-motion by jumping instantly instead of animating
 *  - focuses with preventScroll so the focus jump does not cancel the animation
 *  - skips entirely when the target is already in view
 *
 * Vertical offset is handled in CSS via `scroll-mt-*` / `.scroll-target` on the
 * element, never by manual scrollTo arithmetic — the sticky bars change height
 * across breakpoints.
 */
export function useScrollToSection<T extends HTMLElement>(
  dependency: unknown,
  { focus = true, enabled = true, skipIfVisible = true, stackedBarHeight = 0 }: Options = {},
): RefObject<T | null> {
  const ref = useRef<T>(null)
  const mounted = useRef(false)

  useEffect(() => {
    // First run is the initial render — do not hijack the user's entry point.
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (!enabled) return

    const el = ref.current
    if (!el) return

    const offset = stickyOffset(stackedBarHeight)
    if (skipIfVisible && isComfortablyInView(el, offset)) return

    // Set the offset inline so scrollIntoView lands the element clear of the
    // sticky chrome. Doing it here (rather than in a CSS class) keeps the
    // behaviour correct regardless of how utilities are generated or layered.
    el.style.scrollMarginTop = `${offset}px`

    const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth"
    el.scrollIntoView({ behavior, block: "start" })

    if (focus) {
      // preventScroll is essential: without it the browser performs its own
      // instant scroll-into-view for the focused node and cancels the animation.
      el.focus({ preventScroll: true })
    }
  }, [dependency, enabled, focus, skipIfVisible, stackedBarHeight])

  return ref
}
