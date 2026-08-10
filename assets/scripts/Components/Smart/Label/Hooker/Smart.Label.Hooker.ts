import { _decorator, JsonAsset, Label } from "cc";
import { Editor_PleaseOverride } from "db://pts-core/scripts/editor/Smart/Editor.PleaseOverride";
import { pConst, pEngine } from "db://pts-core/scripts/utils";
import { editor_property } from "db://pts-core/scripts/utils/pClass";

const { ccclass, property, requireComponent } = _decorator;

@ccclass('Smart_Label_Hooker')
@requireComponent(Label)
export abstract class Smart_Label_Hooker<_TType> extends Editor_PleaseOverride {
    protected static _$list: string[] = ['set'];

    @property({ group: pConst.GROUPS.CORE })
    prefix: string = '';

    @property({ group: pConst.GROUPS.CORE })
    suffix: string = '';

    @editor_property(Label)
    protected _label: Label = null;

    @property({ type: JsonAsset, group: pConst.GROUPS.EVENT })
    onChangerLookup: JsonAsset[] = [];

    abstract set(val: _TType): void;

    protected __preload(): void {
        this._label = this.getComponent(Label);
        pEngine.Json.add(this.onChangerLookup, { func: this._actLookUpBinder, binder: this });
        this._onPreLoad?.();
    }

    protected abstract _actLookUpBinder(...args: any[]): void;
    protected _onPreLoad?(): void;


}
