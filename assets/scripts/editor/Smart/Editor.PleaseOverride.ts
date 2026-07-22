import { _decorator, Component } from 'cc';
import { EDITOR } from 'cc/env';

const { ccclass } = _decorator;

@ccclass('Editor_PleaseOverride')
export abstract class Editor_PleaseOverride extends Component {
    onFocusInEditor(): void {
        this._$check();
    }

    onLostFocusInEditor(): void {
        this._$check();
    }

    protected abstract _$methods: pFlex.TKeyOf<Editor_PleaseOverride>[]

    protected _$check() {
        if(!EDITOR) return;

        if(!this._$methods) {
            this.destroy();
            return;
        }

        for(const _method of this._$methods) {
            if(!this[_method]) {
                this.destroy();
                return;
            }
        }
    }

    resetInEditor(didResetToDefault?: boolean): void {
        this._$check();
    }
}
