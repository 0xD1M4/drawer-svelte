import type { SS } from 'svelte-runes'
import { VELOCITY_THRESHOLD } from './constants.js'
import { applyStyles, dampenValue, MODIFIED_STYLES, preserveStyles } from './styles.js'

const DRAWER_SAFE_HEIGHT = 15

type THandleData = {
  contentRef: SS<null | HTMLElement>
  overlayRef: SS<null | HTMLElement>
  rootRef: SS<null | HTMLElement>
  direction: 'bottom'
  scale: number
  closeThreshold: number

  applyContentCloseAnimation: () => void
  applyRootCloseAnimation: () => void
  closeDrawer: () => void
}

export function useDragHandle({
  contentRef,
  overlayRef,
  rootRef,
  direction,
  scale,
  closeThreshold,
  applyContentCloseAnimation,
  applyRootCloseAnimation,
  closeDrawer,
}: THandleData) {
  function onDragHandlePointerDown(e: PointerEvent) {
    const contentNode = contentRef.$
    if (!contentNode) return

    const overlayNode = overlayRef.$
    if (!overlayNode) return

    const rootNode = rootRef.$
    if (!rootNode) return

    e.preventDefault()

    const pointerId = e.pointerId
    const pointerStart = e.clientY
    const handleNode = e.currentTarget as HTMLElement

    handleNode.setPointerCapture(pointerId)
    handleNode.addEventListener('pointermove', onPointerMove, { passive: true })
    handleNode.addEventListener('pointerup', onPointerUp, { once: true })
    handleNode.addEventListener('touchend', ensurePointerUp, { once: true })

    const contentHeight = contentNode.getBoundingClientRect().height || 0
    const dragStartTime = Date.now()

    const rootDragStartStyles = preserveStyles(rootNode, MODIFIED_STYLES)
    const overlayDragStartStyles = preserveStyles(overlayNode, MODIFIED_STYLES)
    const contentDragStartStyles = preserveStyles(contentNode, MODIFIED_STYLES)
    const bodyDragStartStyles = preserveStyles(document.body, { pointerEvents: '' })

    const ACTIVE_DRAG_STYLES = { transition: 'none', pointerEvents: 'none' }
    applyStyles(contentNode, ACTIVE_DRAG_STYLES)
    applyStyles(overlayNode, ACTIVE_DRAG_STYLES)
    applyStyles(rootNode, ACTIVE_DRAG_STYLES)
    applyStyles(document.body, { pointerEvents: 'none' })

    let contentTranslateValue = 0
    let isPointerUpCalled = false
    let isPointerMoved = false
    let isOutsideClicked = false
    if (e.target === handleNode) {
      const { top, height } = handleNode.getBoundingClientRect()
      isOutsideClicked = top + height - DRAWER_SAFE_HEIGHT >= pointerStart
    }

    function resetStyles() {
      applyStyles(contentNode, contentDragStartStyles)
      applyStyles(overlayNode, overlayDragStartStyles)
      applyStyles(rootNode, rootDragStartStyles)
      applyStyles(document.body, bodyDragStartStyles)
    }

    // NOTE: On iOS devices a quick pointer down->up action do not trigger pointerup event.
    function ensurePointerUp() {
      queueMicrotask(() => {
        if (isPointerUpCalled) return

        cleanPointerHandlers()

        return resetStyles()
      })
    }

    function cleanPointerHandlers() {
      // @ts-expect-error Ignoring options error
      handleNode.removeEventListener('pointermove', onPointerMove, { passive: true })
      handleNode.releasePointerCapture(pointerId)
    }

    function onPointerUp(e: PointerEvent) {
      isPointerUpCalled = true

      cleanPointerHandlers()

      const dragEndTime = Date.now()
      const distMoved = pointerStart - e.clientY
      const velocity = Math.abs(distMoved) / (dragEndTime - dragStartTime)

      if (isOutsideClicked && isPointerMoved === false) {
        return closeDrawer()
      }

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

      if (isPointerMoved === false && Math.abs(draggedDistance) > 4) {
        isPointerMoved = true
      }

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

  return {
    dragOverlay: (node: HTMLElement) => {
      node.setAttribute('data-vaul-drag-handle', '')
      node.addEventListener('pointerdown', onDragHandlePointerDown)
    },
  }
}
