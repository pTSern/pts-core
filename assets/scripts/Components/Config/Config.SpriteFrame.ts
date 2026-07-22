import { _decorator, CCClass, CCInteger, Component, js, SpriteFrame } from 'cc';
import { pConst } from '../../utils';
import { Config_Base } from './Config.Base';
import { Editor_PleaseOverride } from '../../editor/Smart/Editor.PleaseOverride';

const { ccclass, property } = _decorator;

@ccclass('Config_SpriteFrame')
export class Config_SpriteFrame extends Config_Base {
    protected _$methods: pFlex.TKeyOf<Config_SpriteFrame>[] = []
    @property({ type: SpriteFrame })
    protected _list: SpriteFrame[] = []
    @property({ type: SpriteFrame, group: pConst.GROUPS.CORE })
    get list() { return this._list }
    set list(x) {
        this._list = x;
        this.onFocusInEditor();
    }

    @property({ type: CCInteger, min: 0, max: 1, step: 1, slide: true, group: pConst.GROUPS.CORE })
    intDefaultIndex: number = 0;

    onFocusInEditor(): void {
        const _max = Math.max(0, this._list.length - 1)
        CCClass.Attr.setClassAttr(this, 'intDefaultIndex', 'max', _max);
    }

    protected _map: Record<string, SpriteFrame> = js.createMap(true);

    protected onLoad(): void {
        this._list.forEach(_ => this._map[_.name] = _);
        console.log("this", this.uuid)
    }

    get(index: number | string) {
        if(typeof index == 'number') return this._list[index];
        if(typeof index == 'string') return this._map[index];
        return null;
    }

}
