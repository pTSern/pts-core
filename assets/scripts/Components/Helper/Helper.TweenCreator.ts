//import { Tween, tween } from "cc";
//
//export class Helper_TweenHolder<T extends object> {
//    private static _index: number = 0;
//
//    private constructor() {  }
//
//    static create<T extends object>(target: T) {
//        const _ret = new Helper_TweenHolder<T>();
//        _ret._tween = tween(target);
//    }
//
//    protected _tween: Tween<T> = null
//    get tween() { return this._tween }
//
//    tag: number = -1;
//}
