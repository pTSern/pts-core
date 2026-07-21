import { _decorator, CCInteger, Node} from "cc";
import { editor_property } from "../../utils/pClass";
import { pConst } from "../../utils";
import { Shared_Updater } from "../../Components/Shared/Shared.Updater";

const { ccclass, property } = _decorator

@ccclass("Helper_UI_Loader")
export class Helper_UI_Loader {
    @property({ type: Node, group: pConst.GROUPS.OPTION })
    icon: Node = null;

    @property({ min: 0, group: pConst.GROUPS.OPTION })
    numAutoClose: number = 30;

    @property({ min: 0, max: 100, type: CCInteger, slide: true, group: pConst.GROUPS.OPTION })
    intMaxRef: number = 10;

    @property({ type: Shared_Updater, group: pConst.GROUPS.OPTION })
    updater: Shared_Updater = null;

    @editor_property()
    protected _ref: number = 0
    @editor_property()
    protected _ticked: boolean = false;
    @editor_property()
    protected _start: number = 0;
    @editor_property()
    protected _isSealedUpdater: boolean = false;

    show(status: boolean) {
        status ? this._ref ++ : this._ref --;
        this._ref = Math.max(this._ref, 0);
        const _will = this._ref == 0 ? false : true

        if(!this.icon.active && _will) {
            this._start = Date.now();
        }

        this.icon.active = _will
    }

    force(stats: boolean) {
        this.icon.active = stats;
        if(stats) {
            this._ref = 1;
            this._start = Date.now();
        } else {
            this._ref = 0;
        }
    }

    init() {
        if(!this.icon) {
            this.show = pConst.VOID_FUNC;
            return;
        }

        this.icon.active = false;
        this.updater?.on('onUpdate', { func: this.update, binder: this });
        this._isSealedUpdater = Boolean(this.updater);
    }

    protected _onUpdate(dt: number) {
        this._ticked = true;
        const _tick = dt + Date.now() / 1000;

        if(_tick - this._start >= this.numAutoClose) {
            this.force(false);
        }
    }

    update(dt: number) {
        if(this._isSealedUpdater) return;
        this._onUpdate(dt);
    }
}
