
import { easing, Enum } from "cc";

const _easing = Object.keys(easing);
export const Enums_EEasing = _easing.reduce( (a, b) => { a[b] = b; return a }, { __enums__: null })
export enum Enums_EByTo {
    By = 0,
    To = 1,
}

Enum(Enums_EByTo)
