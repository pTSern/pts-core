import { _decorator, CCClass } from "cc";
import { pConst } from "../../utils";
import { CC_IEnumList } from "../../interfaces/cc/CC.IEnumable";

const { ccclass, property } = _decorator

@ccclass("Helper_Skeleton")
export class Helper_Skeleton {
    @property({  })
    mixin: number = 0;

    @property({ type: pConst.ENUM })
    anim: string = '';

    @property({})
    loop: boolean = true;

    focus(list: CC_IEnumList<pFlex.TKey, pFlex.TKey>[]) {
        CCClass.Attr.setClassAttr(this, 'anim', 'enumList', list);
    }
}
