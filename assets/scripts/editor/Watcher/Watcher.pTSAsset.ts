
import { _decorator, Asset, Component } from "cc";
import { editor_ccclass, editor_property } from "db://pts-core/scripts/utils/pClass";
import { Watcher_Property } from "./Watcher.Property";
import { creator } from "./Watcher.Creator";

@editor_ccclass('Watcher_pTSAsset')
export class Watcher_pTSAsset extends Component {
    @editor_property(Asset)
    protected _target: Asset = null
    @editor_property(Asset, { writable: true })
    get target(): Asset { return this._target }
    set target(x) {
        this._target = x;
        creator(this._target, this.props)
    }

    @editor_property([Watcher_Property])
    props: Watcher_Property<any>[] = []

}
