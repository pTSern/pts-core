
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
export const ME_FUNC = function(_: any) { return _ }
export const ARRAY_FUNC = function() { return [] };

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

const _$pool = js.createMap();

export const GROUPS = {
    CORE:       { name: "Core", id: "9", displayOrder: 1000 },
    DEBUGGER:   { name: "Debug", id: "9" },
    UI:         { name: "UI", id: "9" },
    AUDIO:      { name: "Audio", id: "9" },
    ANIM:       { name: "Anim", id: "9" },
    EDITOR:     { name: "Editor", id: "9", displayOrder: 999 },
    CONTENT:    { name: "Content", id: "9", displayOrder: 999 },
    EVENT:      { name: "Event", id: "9" },
    HELPER:     { name: "Helper", id: "9" },
    OPTION:     { name: "Option", id: "9", displayOrder: 2000 },
    CONFIG:     { name: "Config", id: "9" },
    DETAIL:     { name: "Detail", id: "9" },

    get: (name: string, id: string = "9", displayOrder: number = 1) => {
        const _sid = `${name}_${id}`;
        if(_$pool[_sid]) return _$pool[_sid];

        _$pool[_sid] = { name, id, displayOrder }
        return _$pool[_sid]
    }
};

export const LINE = "---------------------------------------------------------------";
