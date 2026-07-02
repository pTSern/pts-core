
import { easing, IVec3Like, js, math, Size, TweenEasing, v3, Vec3 } from "cc";
import * as pArray from "./pArray";

/**
 * pMath: Mathematical utilities.
 * redundant methods (clamp, randomRange, toDegree, toRadian) are deferred to cc.math.
 */

interface _IAngle {
    unit: (angle: number, input: 'degree' | 'radian', output: 'degree' | 'radian') => number;
    length: (start: IVec3Like, target: IVec3Like) => number;
    between: (start: IVec3Like, target: IVec3Like, type?: 'Ox' | 'Oy' | 'Oz' | 'Between', unit?: 'degree' | 'radian') => number;
}
export const Angle = js.createMap<_IAngle>();
/**
 * Angle utilities.
 */
Angle.unit = function(angle: number, input: 'degree' | 'radian', output: 'degree' | 'radian') {
    if (input === output) return angle;
    return input === 'degree' ? math.toRadian(angle) : math.toDegree(angle);
}

Angle.length = function(start: IVec3Like, target: IVec3Like) {
    return Math.sqrt((start.x - target.x) ** 2 + (start.y - target.y) ** 2);
}

Angle.between = function(start: IVec3Like, target: IVec3Like, type: 'Ox' | 'Oy' | 'Oz' | 'Between' = 'Between', unit: 'degree' | 'radian' = 'radian') {
    const dx = start.x - target.x;
    const dy = start.y - target.y;
    const dz = start.z - target.z;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return 0;

    let angle = 0;
    switch (type) {
        case 'Ox': angle = Math.atan2(dy, dx); break;
        case 'Oy': angle = Math.atan2(dx, dy); break;
        case 'Oz': angle = Math.atan2(dx, dz); break;
        case 'Between':
            const dot = start.x * target.x + start.y * target.y + start.z * target.z;
            const magS = Math.sqrt(start.x ** 2 + start.y ** 2 + start.z ** 2);
            const magT = Math.sqrt(target.x ** 2 + target.y ** 2 + target.z ** 2);
            if (magS === 0 || magT === 0) return 0;
            angle = Math.acos(Math.max(-1, Math.min(1, dot / (magS * magT))));
            break;
    }
    return Angle.unit(angle, 'radian', unit);
}

export function scaleImageInsideBound(boundWidth: number, boundHeight: number, iWidth: number, iHeight: number): Size {
    const scale = Math.min(boundWidth / iWidth, boundHeight / iHeight);
    return new Size(iWidth * scale, iHeight * scale);
}

export function getEasing(e: ((t: number) => number) | TweenEasing) {
    if (!e) return easing.linear;
    if (typeof e === 'function') return e;
    return (easing as any)[e] || easing.linear;
}

export function convertDirToEuler(dir: IVec3Like): Vec3 {
    const yaw = Math.atan2(dir.x, dir.z);
    const pitch = Math.asin(-dir.y);
    return v3(math.toDegree(pitch), math.toDegree(yaw), 0);
}

export function getQuadraticBezier(start: IVec3Like, control: IVec3Like, end: IVec3Like, t: number, out?: Vec3): IVec3Like {
    t = Math.max(0, Math.min(1, t));
    const u = 1 - t;
    const uu = u * u;
    const tt = t * t;

    const x = (uu * start.x) + (2 * u * t * control.x) + (tt * end.x);
    const y = (uu * start.y) + (2 * u * t * control.y) + (tt * end.y);
    const z = (uu * start.z) + (2 * u * t * control.z) + (tt * end.z);

    if (out) {
        out.x = x; out.y = y; out.z = z;
        return out;
    }
    return { x, y, z };
}

let _id = 0;
export function getNextId(): number {
    const current = _id++;
    return (current % Number.MAX_SAFE_INTEGER) < 0 ? 0 : current;
}

export function isOdd(num: number): boolean {
    return num % 2 !== 0;
}

export function getMostSignificantDigit(value: number): number {
    if (value === 0) return 0;
    const magnitude = Math.floor(Math.log10(Math.abs(value)));
    const multiplier = Math.pow(10, magnitude);
    const firstDigit = Math.floor(Math.abs(value) / multiplier);
    return firstDigit * multiplier * (value < 0 ? -1 : 1);
}

/**
 * Optimized random element from array.
 * Time: O(1) after flattening.
 */
export function rand<T>(arr: pFlex.TArray<T>, ...arrs: T[]): T {
    const list = pArray.flatter(arr, ...arrs);
    if (list.length === 0) return undefined;
    return list[Math.floor(Math.random() * list.length)];
}

/**
 * Get multiple unique random elements.
 * Time: O(n) - Fisher-Yates partial shuffle.
 */
export function rands<T>(amount: number, arr: pFlex.TArray<T>, ...arrs: T[]): T[] {
    const list = pArray.flatter(arr, ...arrs);
    if (amount >= list.length) return list;

    for (let i = 0; i < amount; i++) {
        const j = i + Math.floor(Math.random() * (list.length - i));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list.slice(0, amount);
}

export function toClock(time: number, hasHour: boolean = false) {
    const hh = hasHour ? Math.floor(time / 3600) : 0;
    const left = hasHour ? time % 3600 : time;
    const mm = Math.floor(left / 60);
    const ss = Math.floor(left % 60);
    return { hh, mm, ss };
}
