import { Component } from "cc";
import { pEngine } from "db://pts-core/scripts/utils";
import { Watcher_Component } from "./Watcher.Component";
import { Watcher_Node } from "./Watcher.Node";
import { Watcher_Property } from "./Watcher.Property";
import { Watcher_Number } from "./Watcher.Number";
import { Watcher_Boolean } from "./Watcher.Boolean";
import { Watcher_Object } from "./Watcher.Object";
import { Watcher_String } from "./Watcher.Primitive";

export function creator(_target: any, _out?: Watcher_Property<any>[]): Watcher_Property<any>[] {
    _out = _out || []
    if(!_target) return _out;

    const _props = pEngine.NodeUtils.getAttr(_target.constructor);
    console.log("{ OUT }", _props)
    const _keys = Object.keys(_props);

    if(_out.length === _keys.length) return _out;

    _out.length = 0
    for(const _key of _keys) {
        const _ret = _target[_key];

        let _ctor: pFlex.TCtor<any, Watcher_Property<any>> = Watcher_String;
        const _attr = _props[_key];

        if(_attr.default === null) {
            if(_ret instanceof Node) {
                _ctor = Watcher_Node;
            } else if (_ret instanceof Component) {
                _ctor = Watcher_Component;
            }
        } else {
            switch(typeof _attr.default) {
                case "bigint":
                case "number": {
                    _ctor = Watcher_Number
                    break;
                }
                case "boolean": {
                    _ctor = Watcher_Boolean;
                    break;
                }
                case 'function': {
                    _ctor = Watcher_Object;
                    break;
                }
            }
        }

        const _obj = new _ctor();
        _out.push(_obj)
        _obj.init(_key, _ret)
    }

    return _out;

}

Watcher_Object.creator = creator;
