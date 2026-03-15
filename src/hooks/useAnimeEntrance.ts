import { useEffect, useRef, type RefObject } from 'react';
import { animate, stagger, createScope } from 'animejs';

interface EntranceOptions {
    /** CSS selector for items to stagger (relative to root). Default: '.anime-stagger-item' */
    selector?: string;
    /** Delay before animation starts (ms). Default: 100 */
    delay?: number;
    /** Duration per item (ms). Default: 600 */
    duration?: number;
    /** Stagger offset between items (ms). Default: 60 */
    staggerMs?: number;
    /** Y offset to animate from (px). Default: 24 */
    translateY?: number;
}

/**
 * Hook that applies a staggered fade-in-up entrance animation
 * to child elements using anime.js v4 scoped animations.
 *
 * Usage:
 *   const root = useAnimeEntrance<HTMLDivElement>();
 *   return <div ref={root}>
 *     <div className="anime-stagger-item">...</div>
 *     <div className="anime-stagger-item">...</div>
 *   </div>
 */
export function useAnimeEntrance<T extends HTMLElement>(
    options: EntranceOptions = {},
): RefObject<T | null> {
    const root = useRef<T>(null);

    const {
        selector = '.anime-stagger-item',
        delay = 80,
        duration = 500,
        staggerMs = 50,
        translateY = 20,
    } = options;

    useEffect(() => {
        if (!root.current) return;

        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // Just show everything immediately
            root.current.querySelectorAll(selector).forEach((el) => {
                (el as HTMLElement).style.opacity = '1';
                (el as HTMLElement).style.transform = 'none';
            });
            return;
        }

        const scope = createScope({ root }).add(() => {
            animate(selector, {
                opacity: [0, 1],
                translateY: [translateY, 0],
                delay: stagger(staggerMs, { start: delay }),
                duration,
                ease: 'out(3)',
            });
        });

        return () => scope.revert();
    }, [selector, delay, duration, staggerMs, translateY]);

    return root;
}
