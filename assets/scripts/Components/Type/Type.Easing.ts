import { _decorator, easing, TweenEasing } from "cc";
import { Handler_Selector } from "../Handler/Handler.Selector";
const { ccclass, property } = _decorator

const _$keys = Object.keys(easing) as Readonly<TweenEasing[]>
export const Type_CCEasing = _$keys.reduce( ( p, v ) => ( p[v] = v, p ) , { __enums__: null } )

@ccclass("Type_EasingSelector")
export class Type_EasingSelector {
    @property({ type: Type_CCEasing })
    easing: TweenEasing = 'linear'

    @property({ type: Handler_Selector })
    handler: Handler_Selector = new Handler_Selector();

    get get() {
        if(!this.handler.isValid(true)) return this.easing;

        return (...args: any[]) => this.handler.emit(...args)
    }
}
