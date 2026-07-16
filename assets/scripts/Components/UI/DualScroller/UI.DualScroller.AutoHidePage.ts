import { _decorator, Node, tween, Tween, UIOpacity } from "cc";
import { UI_DualScroller_Page } from "./UI.DualScroller.Page";
import { pConst } from "../../../utils";

const { ccclass, property } = _decorator;

@ccclass("UI_DualScroller_AutoHidePage")
export class UI_DualScroller_AutoHidePage extends UI_DualScroller_Page {

    @property({ type: Node, group: pConst.GROUPS.CORE })
    container: Node = null

    @property({ type: UIOpacity, group: pConst.GROUPS.OPTION })
    opacity: UIOpacity = null

    @property({ group: pConst.GROUPS.OPTION, min: 0, visible() { return !!this.opacity } })
    numShowDuration: number = 0.25

    @property({ group: pConst.GROUPS.OPTION, min: 0, visible() { return !!this.opacity } })
    numHideDuration: number = 0.25

    @property({ group: pConst.GROUPS.OPTION, visible() { return !!this.opacity } })
    isCompletelyInactive: boolean = true;

    onFocusInEditor(): void {
        if(!this.container) this.container = this.node
    }

    protected _onShowTween: Tween<any> = null;
    protected _onHideTween: Tween<any> = null;
    protected _onInit(): void {
        const _target = this.opacity || this.node;
        this._onShowTween = tween(_target);
        this._onHideTween = tween(_target);

        if(this.opacity) {
            this._onHideTween.to(this.numHideDuration, { opacity: 0 })

            if(this.isCompletelyInactive) {
                this._onShowTween.call( () => this.container.active = true );
                this._onHideTween.call( () => this.container.active = false );
            }

            this._onShowTween.to(this.numShowDuration, { opacity: 255 })
        } else {
            this._onShowTween.call( () => this.container.active = true );
            this._onHideTween.call( () => this.container.active = false );
        }
    }

    public actStartEntering() {
        super.actStartEntering();
        this._onHideTween.stop();
        this._onShowTween.start();
    }

    public actExitCompletely() {
        super.actExitCompletely();
        this._onHideTween.start();
        this._onShowTween.stop();
    }

    public actCancelEnter(): void {
        super.actCancelEnter();
        this._onShowTween.stop();
        this._onHideTween.start();
    }

}
