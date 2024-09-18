export const TRANSITIONS = {
  DURATION: 0.5,
  EASE: [0.32, 0.72, 0, 1],
}

export const VELOCITY_THRESHOLD = 0.4

export const CLOSE_WHEN_HIDDEN_THRESHOLD = 0.55

export const SCROLL_LOCK_TIMEOUT = 100

export const BORDER_RADIUS = 8 + 'px'

export const NESTED_DISPLACEMENT = 16

export const WINDOW_TOP_OFFSET = 26

export const DRAG_CLASS = 'vaul-dragging'

export const TRANSITION_DURATION = `${TRANSITIONS.DURATION}s`
export const TIMING_FUNCTION = `cubic-bezier(${TRANSITIONS.EASE.join(',')})`
export const BASE_TRANSITION = TRANSITION_DURATION + ' ' + TIMING_FUNCTION
