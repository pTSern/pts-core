import { _decorator, CCClass, Enum } from "cc";
import { Editor_Smart_SelfFocus } from "../editor/Smart/Editor.Smart.SelfFocus";
import { pObject, pTSAsset } from "../utils";
import { CC_IEnumList } from "../interfaces/cc/CC.IEnumable";
import { pTSAsset_Data } from "./pTSAsset.Data";

const { ccclass, property } = _decorator;

@ccclass("pTSAsset_Handler")
export class pTSAsset_Handler extends Editor_Smart_SelfFocus {
    @property({ type: pTSAsset })
    asset: pTSAsset = null

    @property({ type: Enum({}) })
    listener: string = ''

    @property({ })
    isParamsOnEditorFirst: boolean = true

    @property({ type: [pTSAsset_Data] })
    params: pTSAsset_Data[] = []

    focus() {
        if(!this.asset) {
            CCClass.Attr.setClassAttr(this, 'listener', 'enumList', ['']);
            return;
        }

        const _methods = pObject.getAllMethodNames(this.asset, true);
        const _list = CC_IEnumList.generator(_methods);

        CCClass.Attr.setClassAttr(this, 'listener', 'enumList', _list);
    }

    emit(...args: any[]) {
        if (!this.listener || !this.asset) return;
        const _params = this.params.map(_p => _p.get());
        args = this.isParamsOnEditorFirst ? [..._params, ...args] : [...args, ..._params];

        try {
            const _func = (this.asset as any)[this.listener];
            if (typeof _func !== 'function') {
                return undefined
            }
            const res = _func.call(this.asset, ...args);
            return res;
        } catch (err) {
            return undefined
        }
    }
}

@ccclass("pTSAsset_Emitter")
export class pTSAsset_Emitter extends Editor_Smart_SelfFocus {

    @property({ type: pTSAsset })
    asset: pTSAsset = null

    @property({ })
    event: string = 'any'

    @property({ })
    isParamsOnEditorFirst: boolean = true

    @property({ type: [pTSAsset_Data] })
    params: pTSAsset_Data[] = []

    emit(...args: any[]) {
        if (!this.event || !this.asset) return;

        const _params = this.params.map(_p => _p.get());
        args = this.isParamsOnEditorFirst ? [..._params, ...args] : [...args, ..._params];

        try {
            const res = this.asset.emit(this.event as any, ...args);
            return res;
        } catch (err) {
            return undefined
        }
    }

    protected _focus() {
        const _events = this.asset ? pTSAsset.CCEvents(this.asset) : [];
        const _cc = _events && _events.length > 0;

        const _type = _cc ? 'Enum' : 'String';
        const _list = _cc ? _events : [];

        CCClass.Attr.setClassAttr(this, 'event', 'type', _type);
        CCClass.Attr.setClassAttr(this, 'event', 'enumList', _list);
    }
}
