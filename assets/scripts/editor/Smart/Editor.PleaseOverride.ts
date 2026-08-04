import { _decorator, Component } from 'cc';
import { EDITOR } from 'cc/env';

const { ccclass } = _decorator;

@ccclass('Editor_PleaseOverride')
export class Editor_PleaseOverride extends Component {
    protected static _$list: string[]

    onFocusInEditor(): void {
        this._$check();
        this._onFocusInEditor?.();
    }

    protected _onFocusInEditor?(): void;
    protected _onLostFocusInEditor?(): void;
    protected _onResetInEditor?(didResetToDefault: boolean): void

    onLostFocusInEditor(): void {
        this._$check();
        this._onLostFocusInEditor?.();
    }

    protected _$check() {
        if(!EDITOR) return;

        const _list = this.constructor['_$list']
        if(!_list) {
            this.destroy();
            return;
        }

        for(const _method of _list) {
            if(!this[_method as string]) {
                this.destroy();
                return;
            }
        }
    }

    resetInEditor(didResetToDefault?: boolean): void {
        this._$check();
        this._onResetInEditor?.(didResetToDefault);
    }
}
