
/// <reference path="../../../../../assets/.dev/pFlex.d.ts" />

/**
 * pArray: Array utilities.
 * redundant methods (remove, contains, copy) are replaced by cc.js.array.
 */

/**
 * Rotate array around a center value.
 */
export function shift(arr: number[], vcenter: number): number[] {
    if (arr.length === 0) return [];
    const idx = arr.indexOf(vcenter);
    if (idx === -1) return [...arr];
    const centerIdx = Math.floor((arr.length - 1) / 2);
    const rotateCount = (idx - centerIdx + arr.length) % arr.length;
    return [...arr.slice(rotateCount), ...arr.slice(0, rotateCount)];
}

/**
 * Basic concat-based flat.
 */
export function flat<T>(target: pFlex.TArray<T>, targets: T[]): T[] {
    if (target === undefined && targets.length <= 0) return [];
    return [target as any].concat(targets);
}

/**
 * Find minimum value above threshold.
 */
export function min(arr: number[], above: number = 0): number {
    const filtered = arr.filter(e => e > above);
    return filtered.length > 0 ? Math.min(...filtered) : above;
}

/**
 * Extract values equally across multiple passes.
 */
export function extractEqually(arr: number[], data: number[][] = []): number[][] {
    if (arr.every(a => a <= 0)) return data;
    const m = min(arr, 0);
    data.push(arr.map(() => m));
    return extractEqually(arr.map(a => Math.max(a - m, 0)), data);
}

/**
 * Split array into chunks of specified size.
 * Time: O(n) - Single pass to slice.
 * Space: O(n) - Resulting array of arrays.
 */
export function chunks<T>(array: T[], size: number): T[][] {
    if (size <= 0) return [array];
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

/**
 * Flatten nested arrays.
 * Time: O(n) - single pass via native flat.
 */
export function flatter<T>(target: pFlex.TArray<T>, ...targets: T[]): T[] {
    if (target === undefined && targets.length <= 0) return [];
    return [target as any, ...targets].flat();
}

/**
 * Remove duplicates from array based on a property or key function.
 * Time: O(n) - Single pass using Set for lookup.
 */
export function unique<T>(
    array: T[], 
    keySelector: keyof T | ((item: T) => any) = (item: T) => item,
    filter: (item: T) => boolean = Boolean
): T[] {
    const seen = new Set();
    const result: T[] = [];
    
    for (const item of array) {
        if (!filter(item)) continue;
        const key = typeof keySelector === 'function' ? keySelector(item) : item[keySelector];
        if (!seen.has(key)) {
            seen.add(key);
            result.push(item);
        }
    }
    return result;
}

/**
 * Fisher-Yates shuffle.
 * Time: O(n)
 * Space: O(1) in-place.
 */
export function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Find the nearest element smaller than value.
 * Time: O(n)
 */
export function findSmallerNearest<T>(
    list: T[], 
    prop: keyof T, 
    value: number
): T | undefined {
    let result: T | undefined = undefined;
    let maxVal = Number.NEGATIVE_INFINITY;

    for (const item of list) {
        const val = item[prop];
        if (typeof val === 'number' && val <= value && val > maxVal) {
            maxVal = val;
            result = item;
        }
    }
    return result;
}
