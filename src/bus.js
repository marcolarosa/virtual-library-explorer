const listeners = new Map()

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, [])
  listeners.get(event).push(fn)
}

export function off(event, fn) {
  if (!listeners.has(event)) return
  listeners.set(event, listeners.get(event).filter(f => f !== fn))
}

export function emit(event, data) {
  for (const fn of (listeners.get(event) || [])) fn(data)
}
