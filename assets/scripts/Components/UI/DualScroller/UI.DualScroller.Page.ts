
import { _decorator, Component } from 'cc';
import { editor_property } from '../../../utils/pClass';

const { ccclass } = _decorator;

@ccclass('UI_DualScroller_Page')
export class UI_DualScroller_Page extends Component {
    protected _index: number = 0

    @editor_property()
    get index() { return this._index }
    set index(x) { this._index = x }

    public actScrollUpdate(numNormalizedOffset: number) {
        this._onPageUpdate?.(numNormalizedOffset);
    }

    public actEnterPage() {
        this._onPageEnter?.();
    }

    public actExitPage() {
        this._onPageExit?.();
    }

    protected _onPageEnter?(): void
    protected _onPageExit?(): void
    protected _onPageUpdate?(numNormalizedOffset: number): void
}
