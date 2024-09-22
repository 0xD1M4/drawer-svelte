import './main.css'

import type { Readable } from 'svelte/store'
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

export const useDrawer = (
  ...props: Parameters<typeof setDrawerCtx>
): ReturnType<typeof setDrawerCtx> => getContext(CTX) || setDrawerCtx(...props)

export function setDrawerCtx({
  forceVisible = true,
  animationDelay = 60,
  wrapperOverflow = '',
  closeThreshold = CLOSE_WHEN_HIDDEN_THRESHOLD,
  onClosed: _onClosed = () => {},
} = {}) {
  const meltDialog = createDialog({ forceVisible, onOpenChange })

  const direction = 'bottom'

  const rootRef = ss<HTMLElement | null>(null)
  const contentRef = ss<HTMLElement | null>(null)
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
  }

  function onOpenChange({ curr, next }: { curr: boolean; next: boolean }) {
    return isRunningAnimation ? curr : next
  }

  function onClosed() {
    isRunningAnimation = false
    applyStyles(rootRef.$, rootBaseStyles)
    _onClosed?.()
  }

  function outTransition(node: HTMLElement): TransitionConfig {
    isRunningAnimation = true

    setTimeout(() => {
      node.dataset.vaulDrawerVisible = 'false'
      applyCloseAnimation()
    }, animationDelay)
    setTimeout(onClosed, 550 + animationDelay)

    return { duration: 550 + animationDelay }
  }
  function inTransition(node: HTMLElement) {
    isRunningAnimation = true

    setTimeout(() => {
      node.dataset.vaulDrawerVisible = 'true'
      applyOpenAnimation()
    }, animationDelay)
    setTimeout(() => {
      applyStyles(contentRef.$, { pointerEvents: '' })
      isRunningAnimation = false
    }, 500 + animationDelay)

    return { duration: 0 }
  }

  function applyOpenAnimation() {
    applyStyles(contentRef.$, { pointerEvents: 'none' })

    applyStyles(rootRef.$, {
      borderRadius: BORDER_RADIUS,
      overflow: wrapperOverflow,
      transform: `scale(${scale}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
      transformOrigin: 'top',
      transitionProperty: 'transform, border-radius',
      transitionDuration: TRANSITION_DURATION,
      transitionTimingFunction: TIMING_FUNCTION,
    })
  }

  function applyContentCloseAnimation() {
    applyStyles(contentRef.$, {
      transform: 'translate3d(0, 100%, 0)',
      transition: `transform ${BASE_TRANSITION}`,
    })
  }

  function applyRootCloseAnimation() {
    applyStyles(rootRef.$, {
      transform: rootBaseStyles.transform || 'translate3d(0, 0, 0)',
      borderRadius: rootBaseStyles.borderRadius,
      transition: `transform ${BASE_TRANSITION}, border-radius ${BASE_TRANSITION}`,
    })
  }

  function applyCloseAnimation() {
    applyContentCloseAnimation()

    applyStyles(overlayRef.$, {
      opacity: '0',
      transition: `opacity ${BASE_TRANSITION}`,
    })

    applyRootCloseAnimation()
  }

  function onDragHandlePointerDown(e: PointerEvent & { currentTarget: HTMLElement }) {
    const contentNode = contentRef.$
    if (!contentNode) return

    const overlayNode = overlayRef.$
    if (!overlayNode) return

    const rootNode = rootRef.$
    if (!rootNode) return

    e.preventDefault()

    const handleNode = e.currentTarget

    handleNode.setPointerCapture(e.pointerId)
    handleNode.addEventListener('pointermove', onPointerMove, { passive: true })
    handleNode.addEventListener('pointerup', onPointerUp, { once: true })

    const contentHeight = contentNode.getBoundingClientRect().height || 0
    const dragStartTime = Date.now()
    const pointerStart = e.clientY

    const startRootStyles = preserveStyles(rootNode, { ...MODIFIED_STYLES })
    const startOverlayStyles = preserveStyles(overlayNode, { ...MODIFIED_STYLES })
    const startContentStyles = preserveStyles(contentNode, { ...MODIFIED_STYLES })

    applyStyles(contentNode, { transition: 'none', pointerEvents: 'none' })
    applyStyles(overlayNode, { transition: 'none' })
    applyStyles(rootNode, { transition: 'none' })

    let contentTranslateValue = 0

    function resetStyles() {
      applyStyles(contentNode, startContentStyles)
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
        // NOTE: Starting drawer's container close animation right away, otherwise `animationDelay` causes visible lag
        applyContentCloseAnimation()
        applyRootCloseAnimation()
        return closeDrawer()
      }

      const visibleContentHeight = Math.min(contentHeight, window.innerHeight)

      if (contentTranslateValue / visibleContentHeight > closeThreshold) {
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
      const percentageDragged = absDraggedDistance / contentHeight

      // Run this only if snapPoints are not defined or if we are at the last snap point (highest one)
      if (isDraggingInDirection) {
        const dampenedDraggedDistance = dampenValue(draggedDistance)
        const translateValue = Math.min(dampenedDraggedDistance * -1, 0)

        return applyStyles(contentNode, { transform: `translate3d(0, ${translateValue}px, 0)` })
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

      contentTranslateValue = absDraggedDistance

      applyStyles(contentNode, {
        transform: `translate3d(0, ${contentTranslateValue}px, 0)`,
      })
    }
  }

  const { portalled, overlay, content } = meltDialog.elements

  function appendElementStore<T extends typeof portalled | typeof overlay | typeof content>(
    elementStore: T,
    appendedData: Record<string, number | string>,
  ) {
    const subscribe = elementStore.subscribe as Readable<never>['subscribe']

    return Object.assign(elementStore, {
      subscribe(run: Parameters<T['subscribe']>[0], invalidate: Parameters<T['subscribe']>[1]) {
        return subscribe((value) => run(Object.assign(value, appendedData)), invalidate)
      },
    })
  }

  return setContext(CTX, {
    meltDialog,

    openDrawer,
    closeDrawer,

    outTransition,
    inTransition,

    onDragHandlePointerDown,

    portalled: appendElementStore(portalled, { 'data-vaul-drawer-visible': 'false' }),

    overlay: Object.assign(
      (node: HTMLElement) => overlay((overlayRef.$ = node)),
      appendElementStore(overlay, { 'data-vaul-overlay': '' }),
    ),

    content: Object.assign(
      (node: HTMLElement) => content((contentRef.$ = node)),
      appendElementStore(content, {
        'data-vaul-drawer': '',
        'data-vaul-drawer-direction': 'bottom',
      }),
    ),
  })
}
