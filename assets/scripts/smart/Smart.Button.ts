
import { __private, _decorator, Button, js } from "cc";

const { ccclass, property, menu } = _decorator;

@ccclass("Smart_Button")
@menu("Smart/Button")
export class Smart_Button extends Button  {
    @property({  })
    get see() { return false }
    set see(x) {
        if(!x) return

        console.log("ME: ", this.uuid, "\nBtn: ", this.getComponent(Button).uuid)
    }

    protected onLoad(): void {
    }

}
