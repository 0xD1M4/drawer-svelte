import { WINDOW_TOP_OFFSET } from './constants.js'

export type TStyles = Partial<CSSStyleDeclaration>

export function preserveStyles(node: HTMLElement, rules: TStyles) {
  for (const style in rules) {
    rules[style] = node.style[style]
  }

  return rules
}

export function applyStyles(node: undefined | null | HTMLElement, rules: TStyles) {
  if (node) Object.assign(node.style, rules)
}

export const MODIFIED_STYLES: TStyles = {
  borderRadius: '',
  overflow: '',
  opacity: '',
  transition: '',
  transform: '',
  transformOrigin: '',
  transitionProperty: '',
  transitionDuration: '',
  transitionTimingFunction: '',
}

export function getScale() {
  return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth
}

export function dampenValue(v: number) {
  return 8 * (Math.log(v + 1) - 2)
}
