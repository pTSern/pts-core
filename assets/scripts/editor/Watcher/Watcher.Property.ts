import { editor_ccclass, editor_property } from "db://pts-core/scripts/utils/pClass";

@editor_ccclass('Watcher_Property')
export abstract class Watcher_Property<T> {
    @editor_property()
    name: string = ""

    protected abstract _value: T

    init(name: string, value: T) {
        this.name = name;
        this._value = value;

        console.log("[Watcher_Property] >> SET >>", name, " >>> ", value)
    }

}
