import './main.css'

import type { TransitionConfig } from 'svelte/transition'
import type { TStyles } from './styles.js'

import { getContext, onMount, setContext } from 'svelte'
import { ss } from 'svelte-runes'
import { BROWSER } from 'esm-env'
import { createDialog } from '@melt-ui/svelte'
import { applyStyles, getScale, MODIFIED_STYLES, preserveStyles, dampenValue } from './styles.js'
import {
  BASE_TRANSITION,
  BORDER_RADIUS,
  CLOSE_WHEN_HIDDEN_THRESHOLD,
  TIMING_FUNCTION,
  TRANSITION_DURATION,
  VELOCITY_THRESHOLD,
} from './constants.js'

export { applyStyles, preserveStyles }

export const CTX = 'SVELTE_DRAWER'

export function useDrawer(...props: Parameters<typeof setDrawerCtx>) {
  const ctx = getContext(CTX)
  if (ctx) return ctx as ReturnType<typeof setDrawerCtx>

  return setDrawerCtx(...props)
}

export function setDrawerCtx({ closeThreshold = CLOSE_WHEN_HIDDEN_THRESHOLD } = {}) {
  const meltDialog = createDialog({ onOpenChange })

  const direction = 'bottom'

  const rootRef = ss<HTMLElement | null>(null)
  const drawerRef = ss<HTMLElement | null>(null)
  const overlayRef = ss<HTMLElement | null>(null)
  const scale = BROWSER ? getScale() : 1

  let rootBaseStyles: TStyles = {}
  let isRunningAnimation = false

  onMount(() => {
    const root = document.querySelector('[data-vaul-drawer-wrapper]') as null | HTMLElement
    rootRef.$ = root

    if (!root) return

    rootBaseStyles = preserveStyles(root, MODIFIED_STYLES)

    return () => applyStyles(root, rootBaseStyles)
  })

  function closeDrawer() {
    meltDialog.states.open.set(false)
  }
  function openDrawer() {
    meltDialog.states.open.set(true)
    applyOpenAnimation()
  }

  function onOpenChange({ curr, next }: { curr: boolean; next: boolean }) {
    if (isRunningAnimation) return curr

    if (next === false) {
      applyCloseAnimation()
    }

    return next
  }

  function outTransition(node: HTMLElement): TransitionConfig {
    isRunningAnimation = true

    requestAnimationFrame(() => (node.dataset.vaulDrawerVisible = 'false'))
    setTimeout(() => {
      isRunningAnimation = false
      applyStyles(rootRef.$, rootBaseStyles)
    }, 500)

    return { duration: 500 }
  }
  function inTransition(node: HTMLElement) {
    isRunningAnimation = true

    requestAnimationFrame(() => (node.dataset.vaulDrawerVisible = 'true'))
    setTimeout(() => (isRunningAnimation = false), 500)

    return { duration: 0 }
  }

  function applyOpenAnimation() {
    applyStyles(rootRef.$, {
      borderRadius: BORDER_RADIUS,
      overflow: 'hidden',
      transform: `scale(${scale}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
      transformOrigin: 'top',
      transitionProperty: 'transform, border-radius',
      transitionDuration: TRANSITION_DURATION,
      transitionTimingFunction: TIMING_FUNCTION,
    })
  }

  function applyCloseAnimation() {
    applyStyles(drawerRef.$, {
      transform: '',
      transition: `transform ${BASE_TRANSITION}`,
    })

    applyStyles(overlayRef.$, {
      opacity: '',
      transition: `opacity ${BASE_TRANSITION}`,
    })

    applyStyles(rootRef.$, {
      transform: rootBaseStyles.transform,
      borderRadius: rootBaseStyles.borderRadius,
      transition: `all ${BASE_TRANSITION}`,
    })
  }

  function onDragHandlePointerDown(e: PointerEvent & { currentTarget: HTMLElement }) {
    const drawerNode = drawerRef.$
    if (!drawerNode) return

    const overlayNode = overlayRef.$
    if (!overlayNode) return

    const rootNode = rootRef.$
    if (!rootNode) return

    const handleNode = e.currentTarget

    handleNode.setPointerCapture(e.pointerId)
    handleNode.addEventListener('pointermove', onPointerMove, { passive: true })
    handleNode.addEventListener('pointerup', onPointerUp, { once: true })

    const drawerHeight = drawerNode.getBoundingClientRect().height || 0
    const dragStartTime = Date.now()
    const pointerStart = e.clientY

    const startRootStyles = preserveStyles(rootNode, { ...MODIFIED_STYLES })
    const startOverlayStyles = preserveStyles(overlayNode, { ...MODIFIED_STYLES })
    const startDrawerStyles = preserveStyles(drawerNode, { ...MODIFIED_STYLES })

    applyStyles(drawerNode, { transition: 'none' })
    applyStyles(overlayNode, { transition: 'none' })
    applyStyles(rootNode, { transition: 'none' })

    let drawerTranslateValue = 0

    function resetStyles() {
      applyStyles(drawerNode, startDrawerStyles)
      applyStyles(overlayNode, startOverlayStyles)
      applyStyles(rootNode, startRootStyles)
    }

    function onPointerUp(e: PointerEvent) {
      // @ts-expect-error Ignoring options error
      handleNode.removeEventListener('pointermove', onPointerMove, { passive: true })
      handleNode.releasePointerCapture(e.pointerId)

      const dragEndTime = Date.now()
      const distMoved = pointerStart - e.clientY
      const velocity = Math.abs(distMoved) / (dragEndTime - dragStartTime)

      // Moved upwards, don't do anything
      if (direction === 'bottom' ? distMoved > 0 : distMoved < 0) {
        return resetStyles()
      }

      if (velocity > VELOCITY_THRESHOLD) {
        return closeDrawer()
      }

      const visibleDrawerHeight = Math.min(drawerHeight, window.innerHeight)

      if (drawerTranslateValue / visibleDrawerHeight > closeThreshold) {
        return closeDrawer()
      }

      resetStyles()
    }

    function onPointerMove(e: PointerEvent) {
      const draggedDistance = pointerStart - e.clientY
      const isDraggingInDirection = draggedDistance > 0

      // We need to capture last time when drag with scroll was triggered and have a timeout between
      const absDraggedDistance = Math.abs(draggedDistance)

      // Calculate the percentage dragged, where 1 is the closed position
      const percentageDragged = absDraggedDistance / drawerHeight

      // Run this only if snapPoints are not defined or if we are at the last snap point (highest one)
      if (isDraggingInDirection) {
        const dampenedDraggedDistance = dampenValue(draggedDistance)
        const translateValue = Math.min(dampenedDraggedDistance * -1, 0)

        return applyStyles(drawerNode, { transform: `translate3d(0, ${translateValue}px, 0)` })
      }

      const opacityValue = 1 - percentageDragged

      applyStyles(overlayNode, { opacity: opacityValue.toString() })

      if (rootNode && overlayNode) {
        // Calculate percentageDragged as a fraction (0 to 1)
        const scaleValue = Math.min(scale + percentageDragged * (1 - scale), 1)
        const borderRadiusValue = 8 - percentageDragged * 8

        const translateValue = Math.max(0, 14 - percentageDragged * 14)

        applyStyles(rootNode, {
          borderRadius: `${borderRadiusValue}px`,
          transform: `scale(${scaleValue}) translate3d(0, ${translateValue}px, 0)`,
        })
      }

      drawerTranslateValue = absDraggedDistance

      applyStyles(drawerNode, {
        transform: `translate3d(0, ${drawerTranslateValue}px, 0)`,
      })
    }
  }

  return setContext(CTX, {
    meltDialog,

    openDrawer,
    closeDrawer,

    outTransition,
    inTransition,

    onDragHandlePointerDown,

    overlay: Object.assign(
      (node: HTMLElement) => {
        overlayRef.$ = node
        return meltDialog.elements.overlay(node)
      },
      meltDialog.elements.overlay,
      { 'data-vaul-overlay': '' },
    ),

    content: Object.assign(
      (node: HTMLElement) => {
        drawerRef.$ = node
        return meltDialog.elements.content(node)
      },
      meltDialog.elements.content,
      { 'data-vaul-drawer': '', 'data-vaul-drawer-direction': 'bottom' },
    ),
  })
}
