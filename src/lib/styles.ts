import { WINDOW_TOP_OFFSET } from './constants.js'

export type TStyles = Partial<CSSStyleDeclaration>

export function preserveStyles(node: HTMLElement, rules: TStyles) {
  const _rules = Object.assign({}, rules)

  for (const style in _rules) {
    _rules[style] = node.style[style]
  }

  return _rules
}

export function applyStyles(node: undefined | null | HTMLElement, rules: TStyles) {
  if (node) Object.assign(node.style, rules)
}

export const BODY_STYLES: TStyles = {
  pointerEvents: '',
  overflow: '',
}

export const MODIFIED_STYLES: TStyles = {
  willChange: '',
  pointerEvents: '',
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
