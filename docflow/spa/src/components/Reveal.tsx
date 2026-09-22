import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'

/**
 * useReveal — returns a ref and whether the element has entered the viewport.
 *
 * Uses IntersectionObserver so it fires once, off the main thread, and only when
 * the element is actually visible. Honours `prefers-reduced-motion`: when a user
 * asks for less motion we mark it revealed immediately so nothing animates.
 */
export function useReveal<T extends Element>({ threshold = 0.15, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return { ref, visible }
}

interface RevealProps {
  children: ReactNode
  /** Delay in ms before the reveal (used for staggering lists). */
  delay?: number
  className?: string
  /** Direction the element slides in from. */
  from?: 'up' | 'down' | 'left' | 'right' | 'none'
  as?: 'div' | 'section' | 'li' | 'article'
}

const FROM_CLASS: Record<NonNullable<RevealProps['from']>, string> = {
  up: 'translate-y-6',
  down: '-translate-y-6',
  left: '-translate-x-6',
  right: 'translate-x-6',
  none: '',
}

/**
 * Reveal — wraps content and fades/slides it into view on scroll.
 * Restrained by design: 500ms ease-out, small offset, runs once.
 */
export function Reveal({ children, delay = 0, className, from = 'up', as = 'div' }: RevealProps) {
  const { ref, visible } = useReveal<HTMLElement>()
  const Tag = as as 'div'

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={clsx(
        'transition-[opacity,transform] duration-500 ease-out will-change-[opacity,transform]',
        visible ? 'opacity-100 translate-x-0 translate-y-0' : clsx('opacity-0', FROM_CLASS[from]),
        className,
      )}
    >
      {children}
    </Tag>
  )
}
