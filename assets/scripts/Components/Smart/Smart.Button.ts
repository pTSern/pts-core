import { Button, Component, JsonAsset, _decorator } from "cc";
import { pConst, pEngine } from "../../utils";
import { editor_property } from "../../utils/pClass";

const { ccclass, property, requireComponent } = _decorator;

@ccclass('Smart_Button')
@requireComponent(Button)
export class Smart_Button extends Component {
    @property({ type: JsonAsset, group: pConst.GROUPS.EVENT })
    onClicks: JsonAsset[] = [];

    @editor_property(undefined, { kill: true })
    protected get __$see() {
        return pEngine.Json.event.previewer(this.onClicks[0]);
    }

    protected __preload(): void {
        if(!this.onClicks.length) {
            this.destroy();
            return;
        }
        this.node.on(Button.EventType.CLICK, this._onClick, this);
    }

    protected onDestroy(): void {
        this.node.off(Button.EventType.CLICK, this._onClick, this);
    }

    protected _onClick() {
        pEngine.Json.event.invoke(this.onClicks);
    }
}
