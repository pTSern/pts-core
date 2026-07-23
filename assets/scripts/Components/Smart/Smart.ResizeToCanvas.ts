import { _decorator, sys, view, game, Component, UITransform, Widget } from 'cc';
import { EDITOR } from 'cc/env';
import { pArray, pEngine } from '../../utils';

const { ccclass, property } = _decorator;

@ccclass('Smart_ResizeToCanvas')
export class Smart_ResizeToCanvas extends Component {

    @property({})
    isNoCorssDesign: boolean = true;

    @property({})
    protected _isSmart: boolean = true;

    @property({})
    get isSmart(): boolean { return this._isSmart }
    set isSmart(x: boolean) {
        this._isSmart = x
        x && !EDITOR && this._smart();
    }

    @property({ type: [UITransform] })
    protected _targets: UITransform[] = []
    @property({ type: [UITransform], readonly: false })
    get targets() { return this._targets }
    set targets(x: UITransform[]) {
        this._targets = x;
        this._targets = pArray.unique(x, 'uuid');
        !EDITOR && this._resize();
    }

    protected _$func: pFlex.TFunc<[UITransform[], number, number]> = null

    protected onLoad(): void {
        if(!sys.isBrowser) {
            this.destroy();
            return;
        }

        pEngine.CompUtils.removes(this.targets, Widget);
        view.on('canvas-resize', this._resize, this);
        this._smart();
    }

    protected onDestroy(): void {
        view.off('canvas-resize', this._resize, this);
    }

    protected start(): void {
        this._resize();
    }

    protected _smart() {
        this._$func = this._isSmart ? (list, w, h) => list.forEach( _ => _.isValid && _?.node?.activeInHierarchy && !!_['_contentSize'] && _?.setContentSize(w, h) ) : (list, w, h) => list.forEach(_ => !!_['_contenSize'] && _?.setContentSize(w, h))
    }

    protected _resize() {

        const _rect = game.canvas;
        const _sx = view.getScaleX();
        const _sy = view.getScaleY();

        let _w = _rect.width / _sx
        let _h = _rect.height / _sy

        if(this.isNoCorssDesign) {
            const _ds = view.getDesignResolutionSize();
            _w = Math.max(_w, _ds.width);
            _h = Math.max(_h, _ds.height);
        }

        this._$func(this._targets, _w, _h);
    }

}
