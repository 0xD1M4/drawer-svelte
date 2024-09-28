import './main.css'

import type { Readable } from 'svelte/store'
import type { TransitionConfig } from 'svelte/transition'
import type { TStyles } from './styles.js'

import { getContext, onMount, setContext } from 'svelte'
import { ss } from 'svelte-runes'
import { BROWSER } from 'esm-env'
import { createDialog } from '@melt-ui/svelte'
import {
  applyStyles,
  getScale,
  MODIFIED_STYLES,
  preserveStyles,
  dampenValue,
  BODY_STYLES,
} from './styles.js'
import {
  BASE_TRANSITION,
  BORDER_RADIUS,
  CLOSE_WHEN_HIDDEN_THRESHOLD,
  TIMING_FUNCTION,
  TRANSITION_DURATION,
  VELOCITY_THRESHOLD,
} from './constants.js'
import { useDragHandle } from './dragHandle.js'

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
  const meltDialog = createDialog({ preventScroll: false, forceVisible, onOpenChange })

  const direction = 'bottom'

  const rootRef = ss<HTMLElement | null>(null)
  const contentRef = ss<HTMLElement | null>(null)
  const overlayRef = ss<HTMLElement | null>(null)
  const scale = BROWSER ? getScale() : 1
  const { dragOverlay } = useDragHandle({
    rootRef,
    contentRef,
    overlayRef,
    scale,
    direction,
    closeThreshold,
    applyContentCloseAnimation,
    applyRootCloseAnimation,
    closeDrawer,
  })

  let rootBaseStyles: TStyles = {}
  let bodyBaseStyles: TStyles = {}
  let isRunningAnimation = false

  onMount(() => {
    const root = document.querySelector('[data-vaul-drawer-wrapper]') as null | HTMLElement
    rootRef.$ = root

    if (!root) return

    rootBaseStyles = preserveStyles(root, MODIFIED_STYLES)
    bodyBaseStyles = preserveStyles(document.body, BODY_STYLES)

    return () => {
      applyStyles(root, rootBaseStyles)
      applyStyles(document.body, bodyBaseStyles)
    }
  })

  function closeDrawer() {
    meltDialog.states.open.set(false)
  }
  function openDrawer() {
    applyStyles(document.body, { overflow: 'hidden', pointerEvents: 'none' })
    meltDialog.states.open.set(true)
  }

  function onOpenChange({ curr, next }: { curr: boolean; next: boolean }) {
    return isRunningAnimation ? curr : next
  }

  function onClosed() {
    isRunningAnimation = false
    applyStyles(rootRef.$, rootBaseStyles)
    applyStyles(document.body, bodyBaseStyles)
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
      applyStyles(document.body, { pointerEvents: '' })
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

    dragOverlay,

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
