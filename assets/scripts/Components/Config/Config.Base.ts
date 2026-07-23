
import { _decorator } from 'cc';
import { Editor_PleaseOverride } from '../../editor/Smart/Editor.PleaseOverride';
import { Object_IIdHolder } from '../../interfaces/object/Object.IIdHolder';
import { Helper_IdSelector } from '../../helper/Helper.IdSelector';

const { ccclass, property } = _decorator;

@ccclass('Config_Base')
export abstract class Config_Base<T> extends Editor_PleaseOverride implements Object_IIdHolder<string> {

    private static _$pool = new Map<string, any>()

    abstract target: T
    protected abstract _getNewTarget(): T

    @property({ type: Helper_IdSelector })
    hid: Helper_IdSelector = new Helper_IdSelector();

    get id(): string {
        return this.hid.sid;
    }

    protected __preload(): void {
        const _ret = Config_Base._$pool.get(this.id);
        if(!_ret) {
            if(!this.target) {
                this.target = this._getNewTarget();
                if(!this.target) {
                    this.destroy();
                    console.warn("//")
                    return;
                } 
            }
            Config_Base._$pool.set(this.id, this.target);
        } else {
            this.target = _ret;
        }
    }
}
