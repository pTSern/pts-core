
import { Component } from 'cc'
import { editor_ccclass, editor_property } from "db://pts-core/scripts/utils/pClass";
import { Watcher_Property } from "./Watcher.Property"

@editor_ccclass("Watcher_Component")
export class Watcher_Component extends Watcher_Property<Component>{

    @editor_property()
    protected _value = null;
}
