
import { Enum } from "cc";
import * as cc from "cc";
import * as pArray from "./pArray";
import { EDITOR_ONLY_IN_PREVIEW } from "./pConst";

/**
 * pGlobal: System-wide utilities, logging, and miscellaneous helpers.
 */

// Time
export function getCurrentTime(): string {
    const now = new Date();
    return `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}:${now.getMilliseconds()}`;
}

// Enum Helpers
export function isValidEnumValue<T extends object>(Enum: T, value: any): boolean {
    return Object.values(Enum).includes(value);
}

export function registerEnums(enums: pFlex.TArray<object>, editorOnly: boolean = false) {
    if (editorOnly && !EDITOR_ONLY_IN_PREVIEW) return;
    const list = pArray.flatter(enums);
    list.forEach(e => Enum(e));
}

// Browser / System
export function addToClipboard(content: string) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(content).catch(err => {
            console.error('[PrimeUtils] Clipboard error:', err);
        });
        return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = content;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('[PrimeUtils] Copy fallback failed:', err);
    }
    document.body.removeChild(textArea);
}

export function download(fileName: string, content: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Logging
export interface ILogOption {
    title: string;
    color?: string;
    weight?: "bold" | "light" | "italic";
}

export function log(...args: any[]) { console.log(...args); }
export function warn(...args: any[]) { console.warn(...args); }
export function error(...args: any[]) { console.error(...args); }

export function group(opt: string | ILogOption, ...args: any[]) {
    const { title, color = "#3498db", weight = "bold" } = typeof opt === 'string' ? { title: opt } : opt;
    console.groupCollapsed(`%c ${title}`, `color: ${color}; font-weight: ${weight}`);
    args.forEach(arg => console.log(arg));
    console.groupEnd();
}

// Compression / Decompression
export async function gzip(content: string): Promise<string> {
    if (typeof CompressionStream !== "undefined") {
        const blob = new Blob([new TextEncoder().encode(content)]);
        const stream = blob.stream().pipeThrough(new CompressionStream("gzip"));
        const response = new Response(stream);
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binString = "";
        for (let i = 0; i < bytes.length; i++) {
            binString += String.fromCharCode(bytes[i]);
        }
        return btoa(binString);
    }
    throw new Error("[pGlobal] CompressionStream is not supported on this platform.");
}

export async function unzip(base64: string): Promise<string> {
    const binString = atob(base64);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
        bytes[i] = binString.charCodeAt(i);
    }

    if (typeof DecompressionStream !== "undefined") {
        const blob = new Blob([bytes as any]);
        const stream = blob.stream().pipeThrough(new DecompressionStream("gzip"));
        const response = new Response(stream);
        return await response.text();
    } else {
        const cocosZipUtils = (cc as any).zipUtils;
        if (cocosZipUtils && typeof cocosZipUtils.inflateMemory === "function") {
            const inflated = cocosZipUtils.inflateMemory(bytes);
            if (inflated) {
                return new TextDecoder().decode(inflated);
            }
            throw new Error("[pGlobal] unzip failed via zipUtils.inflateMemory");
        } else {
            throw new Error("[pGlobal] DecompressionStream or zipUtils.inflateMemory is not supported on this platform.");
        }
    }
}

