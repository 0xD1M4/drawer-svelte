<script lang="ts">
  import { createDialog } from '@melt-ui/svelte'
  import {
    BASE_TRANSITION,
    BORDER_RADIUS,
    CLOSE_WHEN_HIDDEN_THRESHOLD,
    TIMING_FUNCTION,
    TRANSITIONS,
    VELOCITY_THRESHOLD,
    WINDOW_TOP_OFFSET,
  } from './constants.js'

  import { onMount } from 'svelte'
  import { dampenValue } from './helpers.js'
  import { getTranslate } from '$lib/helpers.js'
  import { applyStyles, MODIFIED_STYLES, preserveStyles } from './styles.js'

  let { closeThreshold = CLOSE_WHEN_HIDDEN_THRESHOLD } = $props()

  const {
    elements: { trigger, portalled, overlay, content, title, description, close },
    states: { open },
  } = createDialog({
    onOpenChange,
  })

  function onOpenClick() {
    open.set(true)
    scaleOpenBackground()
  }

  const shouldScaleBackground = true

  let wrapper: HTMLElement | null
  let oldStyles = ''
  let oldStyle = {} as any

  let wrapperBaseStyles = {} as Partial<CSSStyleDeclaration>

  let isRunningAnimation = false

  onMount(() => {
    wrapper = document.querySelector('[data-vaul-drawer-wrapper]')
    if (!wrapper) return

    oldStyles = wrapper.getAttribute('style') || ''
    wrapperBaseStyles = preserveStyles(wrapper, {
      borderRadius: '',
      transform: '',
      overflow: '',
      transition: '',
    })

    return () => {
      Object.assign(wrapper!.style, wrapperBaseStyles)
    }
  })

  function scaleOpenBackground() {
    if (!wrapper) return

    applyStyles(wrapper, {
      borderRadius: BORDER_RADIUS,
      overflow: 'hidden',
      transform: `scale(${getScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
      transformOrigin: 'top',
      transitionProperty: 'transform, border-radius',
      transitionDuration: `${TRANSITIONS.DURATION}s`,
      transitionTimingFunction: TIMING_FUNCTION,
    })
  }

  let drawerNode: HTMLElement
  let overlayNode: HTMLElement

  function closeDrawer() {
    open.set(false)
  }

  function applyCloseTransition() {
    applyStyles(drawerNode, {
      transform: '',
      transition: `transform ${BASE_TRANSITION}`,
    })

    applyStyles(overlayNode, {
      opacity: '',
      transition: `opacity ${BASE_TRANSITION}`,
    })

    applyStyles(wrapper!, {
      transform: wrapperBaseStyles.transform,
      borderRadius: wrapperBaseStyles.borderRadius,
      transition: `all ${BASE_TRANSITION}`,
    })
  }

  function getScale() {
    return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth
  }

  function onOpenChange({ curr, next }: { next: boolean }) {
    console.log({ next, isRunningAnimation })
    if (isRunningAnimation) return curr

    if (next === false) {
      applyCloseTransition()
    }

    return next
  }

  function outTransition(node: HTMLElement) {
    isRunningAnimation = true

    console.log('outTransition')

    queueMicrotask(() => {
      console.log(node, 'settings vaulDrawerVisible ', false)
      node.dataset.vaulDrawerVisible = 'false'
    })
    setTimeout(() => {
      isRunningAnimation = false
      if (wrapper) applyStyles(wrapper, wrapperBaseStyles)
    }, 500)

    return {
      duration: 500,
    }
  }
  function inTransition(node: HTMLElement) {
    isRunningAnimation = true

    queueMicrotask(() => {
      console.log(node, 'settings vaulDrawerVisible ', true)
      node.dataset.vaulDrawerVisible = 'true'
    })
    setTimeout(() => (isRunningAnimation = false), 500)

    return { duration: 0 }
  }

  const snapPoints = null
  const direction = 'bottom'

  function onPointerDown(e: PointerEvent & { target: HTMLElement }) {
    const handle = e.currentTarget as HTMLElement
    handle.setPointerCapture(e.pointerId)
    handle.addEventListener('pointermove', onPointerMove, { passive: true })
    handle.addEventListener('pointerup', onPointerUp, { once: true })

    let dragStartTime = Date.now()

    const drawerNode = handle.parentElement!
    console.log(drawerNode)
    const overlayNode = drawerNode.previousElementSibling as HTMLElement
    const drawerHeight = drawerNode.getBoundingClientRect().height || 0
    let pointerStart = e.clientY
    let drawerTranslateValue = 0

    const stylesToSave: Partial<CSSStyleDeclaration> = MODIFIED_STYLES
    const startWrapperStyles = preserveStyles(wrapper!, { ...stylesToSave })
    const startOverlayStyles = preserveStyles(overlayNode, { ...stylesToSave })
    const startDrawerStyles = preserveStyles(drawerNode, { ...stylesToSave })

    applyStyles(drawerNode, { transition: 'none' })
    applyStyles(overlayNode, { transition: 'none' })
    applyStyles(wrapper!, { transition: 'none' })

    function resetStyles() {
      applyStyles(drawerNode, startDrawerStyles)
      applyStyles(overlayNode, startOverlayStyles)
      applyStyles(wrapper!, startWrapperStyles)
    }

    function onPointerUp(e: PointerEvent) {
      handle.removeEventListener('pointermove', onPointerMove, { passive: true })
      handle.releasePointerCapture(e.pointerId)

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

      const visibleDrawerHeight = Math.min(
        drawerNode.getBoundingClientRect().height ?? 0,
        window.innerHeight,
      )

      if (drawerTranslateValue / visibleDrawerHeight > closeThreshold) {
        return closeDrawer()
      }

      resetStyles()
    }

    const scale = getScale()

    function onPointerMove(e: PointerEvent) {
      const draggedDistance = pointerStart - e.clientY
      const isDraggingInDirection = draggedDistance > 0

      // We need to capture last time when drag with scroll was triggered and have a timeout between
      const absDraggedDistance = Math.abs(draggedDistance)

      // Calculate the percentage dragged, where 1 is the closed position
      let percentageDragged = absDraggedDistance / drawerHeight

      // Run this only if snapPoints are not defined or if we are at the last snap point (highest one)
      if (isDraggingInDirection && !snapPoints) {
        const dampenedDraggedDistance = dampenValue(draggedDistance)
        const translateValue = Math.min(dampenedDraggedDistance * -1, 0)

        applyStyles(drawerNode, { transform: `translate3d(0, ${translateValue}px, 0)` })

        return
      }

      const opacityValue = 1 - percentageDragged

      applyStyles(overlayNode, { opacity: opacityValue.toString() })

      if (wrapper && overlayNode && shouldScaleBackground) {
        // Calculate percentageDragged as a fraction (0 to 1)
        const scaleValue = Math.min(scale + percentageDragged * (1 - scale), 1)
        const borderRadiusValue = 8 - percentageDragged * 8

        const translateValue = Math.max(0, 14 - percentageDragged * 14)

        applyStyles(wrapper, {
          borderRadius: `${borderRadiusValue}px`,
          transform: `scale(${scaleValue}) translate3d(0, ${translateValue}px, 0)`,
        })
      }

      if (!snapPoints) {
        drawerTranslateValue = absDraggedDistance

        applyStyles(drawerNode, {
          transform: `translate3d(0, ${drawerTranslateValue}px, 0)`,
        })
      }
    }
  }
</script>

<button {...$trigger} onclick={onOpenClick}> Open Dialog Test </button>

{#if $open}
  <div
    {...$portalled}
    use:portalled
    in:inTransition
    out:outTransition
    data-vaul-drawer-visible="false"
  >
    <div
      {...$overlay}
      use:overlay
      data-vaul-overlay
      class="fixed z-[1000] inset-0 bg-black/60"
      bind:this={overlayNode}
    ></div>

    <div
      {...$content}
      bind:this={drawerNode}
      use:content
      data-vaul-drawer
      data-vaul-drawer-direction="bottom"
      class="z-[1000] bg-zinc-100 flex fixed py-2 p-6 rounded-t-[10px] flex-col h-[96%] bottom-0 left-0 right-0"
    >
      <div
        class="handle-overlay flex items-center justify-center"
        onpointerdown={onPointerDown}
        style="touch-action: none;"
      >
        <div class="handle bg-[red] absolute w-[30px] h-[20px]"></div>
      </div>

      <h2 {...$title} use:title>Dialog Title</h2>
      <p {...$description} use:description>Dialog description</p>

      <input type="text" class="border text-base" />

      <button {...$close} use:close> Close Dialog </button>
    </div>
  </div>
{/if}

<style>
  :global {
    [data-vaul-drawer] {
      touch-action: none;
      transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }
    [data-vaul-drawer]::after {
      content: '';
      position: absolute;
      background: inherit;
      z-index: 1;
    }

    [data-vaul-drawer][data-vaul-drawer-direction='bottom'] {
      transform: translate3d(0, 100%, 0);

      &::after {
        top: 100%;
        bottom: initial;
        left: 0;
        right: 0;
        height: 200%;
      }
    }

    [data-vaul-overlay] {
      opacity: 0;
      transition: opacity 0.5s cubic-bezier(0.32, 0.72, 0, 1);
    }

    [data-vaul-drawer-visible='true'] {
      [data-vaul-overlay] {
        opacity: 1;
      }

      [data-vaul-drawer] {
        opacity: 1;
        transform: translate3d(0, var(--snap-point-height, 0), 0);
      }
    }
  }
</style>
