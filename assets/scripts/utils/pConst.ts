
import { js } from "cc";
import { EDITOR, EDITOR_NOT_IN_PREVIEW, DEV } from "cc/env";

/**
 * pConst: Project constants, environment flags, and keys.
 */

// Macros / Env Flags
export const IS_TEST = DEV;
export const IS_EDITOR = EDITOR;
export const LOG_LEVEL = 0;

const __pool__ = js.createMap(true);

// Constants
export const VOID_FUNC = () => void 0;
export const ME_FUNC = _ => _;

export function getNumFunc(num: number) {
    num = typeof num == 'number' ? num : 0
    let _func = __pool__[num]
    if(!_func) {
        _func = () => num;
        __pool__[num] = _func;
    }

    return _func
}

export const LOG_LEVELS = ['log', 'warn', 'error'] as const;
export const EDITOR_ONLY_IN_PREVIEW = EDITOR && !EDITOR_NOT_IN_PREVIEW;
export const RESOLVER = Promise.resolve()
export const THROWER = (me: string) => { throw new Error(`${me} does not being initialized. Please double check`) }
export const EDITOR_VISIBLE_IN_PREVIEW = () => EDITOR_ONLY_IN_PREVIEW

export const KEYS = {
    POOL: {
        SINGLETON: Symbol("__pTS_singleton_"),
        PERSISTENT: Symbol("__pTS_persistent_"),
    },
    SINGLETON: {
        INSTANCE: Symbol('__pTS_instance__'),
        GETTER: Symbol('__pTS_get_instance__'),
        OPTION: Symbol('__pTS_option__'),
        IMPL: Symbol('__pTS_implements__'),
    }
};

export const GROUPS = {
    CORE: { name: "Core", id: "0", displayOrder: 1000 },
    DEBUGGER: { name: "Debug", id: "0" },
    UI: { name: "UI", id: "0" },
    AUDIO: { name: "Audio", id: "0" },
    ANIM: { name: "Anim", id: "0" },
    EDITOR: { name: "Editor", id: "0", displayOrder: 999 },
    CONTENT: { name: "Content", id: "0", displayOrder: 999 },
    EVENT: { name: "Event", id: "0" },
    HELPER: { name: "Helper", id: "0" },
    OPTION: { name: "Option", id: "0", displayOrder: 2000 },
    CONFIG: { name: "Config", id: "0" },
    DETAIL: { name: "Detail", id: "0" },
    
    get: (name: string, id: string = "0") => ({ name, id })
};

export const LINE = "---------------------------------------------------------------";
