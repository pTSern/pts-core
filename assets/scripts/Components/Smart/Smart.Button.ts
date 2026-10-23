import { Button, Component, JsonAsset, _decorator } from "cc";
import { pClass, pConst, pEngine, pObject } from "../../utils";
import { editor_property } from "../../utils/pClass";
import { Event_ClickableAsset } from "../Event/Event.Clickable";

const { ccclass, property, requireComponent } = _decorator;

@ccclass('Smart_Button')
@requireComponent(Button)
export class Smart_Button extends Component {
    @property({ type: JsonAsset, group: pConst.GROUPS.EVENT })
    onClicks: JsonAsset[] = [];

    @property({ type: Event_ClickableAsset, group: pConst.GROUPS.EVENT })
    clickers: Event_ClickableAsset[] = [];

    @property({})
    isSynchronized: boolean = false;

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

    @editor_property(Button)
    protected _button: Button = null;
    protected onLoad(): void {
        this._button = this.getComponent(Button);
    }

    protected onDestroy(): void {
        this.node.off(Button.EventType.CLICK, this._onClick, this);
    }

    protected async _onClick() {
        const _arr = []
        _arr.push(pEngine.Json.event.invoke(this.onClicks));
        const _button = this.getComponent(Button);
        for(const _clicker of this.clickers) {
            _arr.push(_clicker.onClick(_button));
        }

        if(this.isSynchronized) {
            this._button.interactable = false;
            const _prm = pObject.query(_arr, Promise)
            await Promise.all(_prm);
            this._button.interactable = true;
        }
    }
}
