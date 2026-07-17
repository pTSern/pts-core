
import { _decorator, Component } from 'cc';
import { editor_property } from '../../../utils/pClass';
import { DEV } from 'cc/env';
import { VOID_FUNC } from '../../../utils/pConst';

const { ccclass } = _decorator;

const _$log = DEV ? console.log.bind(console, "[XXX]") : VOID_FUNC

@ccclass('UI_DualScroller_Page')
export class UI_DualScroller_Page extends Component {

    @editor_property()
    get index() { return this._index }
    protected _index: number = 0

    @editor_property()
    protected _isSealed: boolean = false;

    init(index: number) {
        if(this._isSealed) return;

        this._index = index;
        this._isSealed = true

        this._onInit?.();
    }

    protected _onInit?(): void

    public actScrollUpdate(numNormalizedOffset: number) {
        this._onUpdate?.(numNormalizedOffset);
    }

    public actStartEntering() {
        this._onStartEntering?.();
    }

    public actStartExiting() {
        this._onStartExiting?.();
    }

    public actExitCompletely() {
        _$log("actExitCompletely", this.name);
        this._onExitCompletely?.();
    }

    public actEnterCompletely() {
        _$log("actEnterCompletely", this.name);
        this._onEnterCompletely?.();
    }

    public actCancelEnter() {
        _$log("actCancelEnter", this.name);
        this._onCancelEnter?.();
    }

    protected _onStartEntering?(): void
    protected _onStartExiting?(): void
    protected _onUpdate?(numNormalizedOffset: number): void
    protected _onExitCompletely?(): void
    protected _onEnterCompletely?(): void
    protected _onCancelEnter?(): void
}
