import { useEffect, useRef, type RefObject, type DependencyList } from 'react';
import { animate, stagger } from 'animejs';

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
    /** Extra deps that trigger re-animation when changed (e.g. data loading) */
    deps?: DependencyList;
}

const ANIMATED_ATTR = 'data-anime-done';

/**
 * Hook that applies a staggered fade-in-up entrance animation
 * to child elements using anime.js v4.
 *
 * Only animates elements that haven't been animated yet, so it's
 * safe to re-run when new async data causes new sections to mount.
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
        deps = [],
    } = options;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!root.current) return;

        // Find only items that haven't been animated yet
        const allItems = root.current.querySelectorAll(selector);
        const newItems = Array.from(allItems).filter(
            (el) => !el.hasAttribute(ANIMATED_ATTR),
        );

        if (newItems.length === 0) return;

        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            newItems.forEach((el) => {
                (el as HTMLElement).style.opacity = '1';
                (el as HTMLElement).style.transform = 'none';
                el.setAttribute(ANIMATED_ATTR, '1');
            });
            return;
        }

        // Mark items as animated before starting so re-runs don't double-animate
        newItems.forEach((el) => el.setAttribute(ANIMATED_ATTR, '1'));

        animate(newItems, {
            opacity: [0, 1],
            translateY: [translateY, 0],
            delay: stagger(staggerMs, { start: delay }),
            duration,
            ease: 'out(3)',
        });

        // No scope.revert() — we want elements to keep their final visible state
    }, [selector, delay, duration, staggerMs, translateY, ...deps]);

    return root;
}
