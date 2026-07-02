
import * as pArray from "./pArray";
import { randomRangeInt, js } from 'cc'


/**
 * pString: String manipulation and formatting.
 */

export function cut(str: string, start: number = 0, end: number = -1): string {
    return str.slice(start, end < 0 ? str.length : end);
}

export function addSpace(str: string): string {
    return ` ${str} `;
}

export function toBoolean(str: string): boolean | undefined {
    try { return JSON.parse(str.toLowerCase()); } catch { return undefined; }
}

export function encodeMsg(msg: any): any {
    return JSON.parse(JSON.stringify(msg));
}

export function toHex(target: string): string {
    target = target.toLowerCase();
    return target.startsWith('#') ? target : `#${target}`;
}

export function randomColorHex(): string {
    const rand = Math.floor(Math.random() * 16777215).toString(16);
    return `#${rand.padStart(6, '0')}`;
}

export function uuid(): string {
    return `${randomRangeInt(1000, 9999)}_${Date.now()}_${js.IDGenerator.global.getNewId()}`;
}

/**
 * Format number with K/M/B/T suffixes.
 * Time: O(1) - Constant number of units.
 */
export function formatKMB(num: number, positive: string = "", negative: string = "-"): string {
    if (!num || isNaN(num)) return "0";
    const abs = Math.abs(num);
    const units = ["", "K", "M", "B", "T", "Q"];
    let unitIdx = 0;
    let value = abs;

    while (value >= 1000 && unitIdx < units.length - 1) {
        value /= 1000;
        unitIdx++;
    }

    const str = unitIdx === 0 ? String(abs) : value.toFixed(2).replace(/\.?0+$/, "");
    return `${num > 0 ? positive : negative}${str}${units[unitIdx]}`;
}

/**
 * Format number with dot separators (e.g., 1.000.000).
 * Time: O(n) - Single regex pass.
 */
export function formatWithDots(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Convert number to custom radix format (e.g., 10,50 for 10.5).
 */
export function formatWithCommas(value: number, radix: number = 100): string {
    const scaled = Math.round((value * 100) / radix);
    const integerPart = Math.floor(scaled / 100);
    const decimalPart = scaled % 100;
    if (decimalPart === 0) return integerPart.toString();
    const decStr = decimalPart < 10 ? `0${decimalPart}` : String(decimalPart);
    return `${integerPart},${decStr.replace(/0+$/, '')}`;
}

export interface IStringReplacer {
    find: string;
    replacer: string;
    time?: number;
}

/**
 * Replace multiple patterns in a string.
 * Time: O(n * m) where n is replacements and m is string length.
 */
export function replace(root: string, replacements: pFlex.TArray<IStringReplacer>, ...rest: IStringReplacer[]): string {
    const all = pArray.flatter(replacements, ...rest);
    return all.reduce((result, { find, replacer, time = 0 }) => {
        if (time > 0) {
            for (let i = 0; i < time; i++) result = result.replace(find, replacer);
        } else {
            result = result.replace(new RegExp(find, 'g'), replacer);
        }
        return result;
    }, String(root));
}

export function extractNumbers(str: string): number[] {
    const matches = str.match(/\d+/g);
    return matches ? matches.map(Number) : [];
}
