

import { editor_ccclass, editor_property } from "db://pts-core/scripts/utils/pClass";
import { Watcher_Property } from "./Watcher.Property"

@editor_ccclass("Watcher_Number")
export class Watcher_Number extends Watcher_Property<number>{

    @editor_property()
    protected _value = -999;

}
