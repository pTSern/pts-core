import { _decorator, Color, Tween } from "cc";
import { pConst } from "../../utils";

const { ccclass, property } = _decorator;
import { Helper_Action } from "./Helper.Action";

@ccclass("Helper_Color")
export class Helper_Color extends Helper_Action {
    @property({ group: pConst.GROUPS.CORE })
    color: Color = Color.WHITE.clone();

    tween<_TTarget extends Object>(tween: Tween<_TTarget>, key: pFlex.TKeyOf<_TTarget>, overrideDuration?: number) {
        const dur = (typeof overrideDuration === 'number' && overrideDuration >= 0) ? overrideDuration : this.duration;
        // @ts-ignore
        return tween[this.byto](dur, { [key]: this.color }, { easing: this.easing })
    }
}
