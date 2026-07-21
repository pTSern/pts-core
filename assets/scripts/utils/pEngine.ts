
import { Node, Component, NodeEventType, EventHandler, js, director, IVec3Like, v3, Layers, CCClass, Prefab, instantiate, JsonAsset, assetManager, Director, Scene, _decorator } from "cc";
import { DEBUG } from "cc/env";
import { EDITOR } from "cc/env";
import * as pArray from "./pArray";
import * as pClass from './pClass';
import * as pObject from "./pObject";

/**
 * pEngine: Comprehensive Cocos Creator engine utilities for Nodes, Components, and Assets.
 */

// --- Assets (Json) ---

export interface IJsonOption { isAutoReleased: boolean; }
interface IJsonData { sealed: boolean; listeners: pFlex.IBinder[]; options: IJsonOption; }
const _map = new WeakMap<JsonAsset, IJsonData>();

const _originJsonDestroyer = JsonAsset.prototype.destroy;
JsonAsset.prototype.destroy = function() {
    const data = _map.get(this);
    if (data?.options.isAutoReleased) {
        _map.delete(this);
        assetManager.releaseAsset(this);
    }
    return _originJsonDestroyer.call(this);
};

function _get(asset: JsonAsset): IJsonData | undefined {
    if (!asset || !asset.isValid) return undefined;
    let data = _map.get(asset);
    if (!data) {
        data = { sealed: false, listeners: [], options: { isAutoReleased: false } };
        _map.set(asset, data);
    }
    return data.sealed ? undefined : data;
}

interface _IJson {
    add: (asset: JsonAsset, ...ls: pFlex.THandler[]) => void;
    remove: (asset: JsonAsset, ...ls: pFlex.THandler[]) => void;
    invoke: (asset: JsonAsset, ...args: any[]) => void;
    seal: (asset: pFlex.TArray<JsonAsset>, status: boolean) => void;
}


export const Json = js.createMap<_IJson>();
Json.add = function(asset: JsonAsset, ...ls: pFlex.THandler[]) {
    const d = _get(asset);
    if (d) d.listeners.push(...pClass.mapper(ls));
}

Json.remove = function(asset: JsonAsset, ...ls: pFlex.THandler[]) {
    const d = _get(asset);
    if (d) {
        const rem = pClass.mapper(ls);
        d.listeners = d.listeners.filter(l => !rem.some(r => r.func === l.func && r.binder === l.binder));
    }
}

Json.invoke = function(asset: JsonAsset, ...args: any[]) {
    const d = _get(asset);
    if (d) return pClass.emit(d.listeners, ...args);
}

Json.seal = function(asset: pFlex.TArray<JsonAsset>, status: boolean) {
    pArray.flatter(asset).forEach(a => { const d = _get(a); if (d) d.sealed = status; });
}

// --- Nodes ---

export interface IHasNode { node: Node }
export type TFlexCCNode = Node | IHasNode;
export interface IPositionOpt<T extends IVec3Like = IVec3Like> { position: T; isWorldPos: boolean; }
export type TFlexPosition<T extends IVec3Like = IVec3Like> = TFlexCCNode | T | IPositionOpt<T>;

interface _IAttr {
    ctor?: pFlex.TCtor;
    default: null | number | string | boolean | pFlex.TFunc
    type?: string
}

interface _INodeUtils {
    getCCProps: (target: pFlex.TFunc | object, ...types: pFlex.TCtor[]) => string[];
    create: <T extends pFlex.TCtor<any, any>[]>(opt: { name?: string | ((n: Node) => string), layer?: Layers.Enum, parent?: Node, active?: boolean, pos?: TFlexPosition, fab?: Prefab, scale?: IVec3Like, rotation?: IVec3Like, isDisconnectPrefabLink?: boolean, isNotKeepWorldTransform?: boolean }, configs?: { [K in keyof T]: { type: T[K], opt?: Partial<any>, multiple?: boolean, modifier?: (i: any) => void } }) => { node: Node; comps: any[] };
    setPosition: <T extends IVec3Like>(target: TFlexCCNode, pos: TFlexPosition<T>, dif?: T) => void;
    getNodeInfo: (target: TFlexCCNode) => any;
    search: <T extends Component>(cls: pFlex.TCtor<any, T>, root?: Node) => T | null;
    lookup(uuid: string): Node | Component | null
    getAttr(target: pFlex.TFunc | object): Record<string, _IAttr>
}

const __$lookup_ = new Map<string, Node | Component>();
const __$persistents_ = new Map<string, Node | Component>();

const __$scenes_ = js.createMap<Record<string, Scene>>(true);

if(DEBUG) {
    window['__pool_'] = __$lookup_;
}

director.on(Director.EVENT_BEFORE_SCENE_LAUNCH, function(_scene: Scene) {
    for(const _key in __$scenes_) {
        delete __$scenes_[_key];
    }

    __$scenes_[_scene.uuid] = _scene;
    __$lookup_.clear();

    _$add(_scene, __$lookup_);
})


function _$replacer<T = any, TKey extends keyof T = keyof T>(
    target: pFlex.TCtor<any[], T>, 
    method: TKey, 
    before: pFlex.TFunc<[T, ...Parameters<Extract<T[TKey], (...args: any[]) => any>>]>,
    after?: pFlex.TFunc<[T, ReturnType<Extract<T[TKey], (...args: any[]) => any>>]>,
) {
    const _$origin = target.prototype[method];
    if (typeof _$origin !== 'function') return;

    target.prototype[method] = function (this: T, ...args: any[]) {
        before?.(this as any, ...args as any);
        const _out = _$origin.apply(this, args);
        after?.(this as any, _out);
        return _out;
    };
}

_$replacer(Director, 'reset', function(_this) {
    const _per: Record<string, Node> = _this['_persistRootNodes']
    if(!_per) return;
    for(const _key in _per) {
        __$persistents_.delete(_key);
    }
})

_$replacer(Director, 'addPersistRootNode', function(_this, node) {
    _$add(node, __$persistents_);
})

_$replacer(Director, 'removePersistRootNode', function(_this, node) {
    __$persistents_.delete(node.uuid);
})

_$replacer(Node, '_onHierarchyChangedBase' as keyof Node, function(_this: Node, _old: Node) {
    const _new = _this.parent;
    if(!_old && _new) {
        _$add(_this, __$lookup_);
    } else if(_old && !_new) {
        _$rem(_this, __$lookup_);
    }
} as never)

_$replacer(Node, '_onPreDestroyBase' as keyof Node, function(_this: Node) {
    if(__$lookup_.has(_this.uuid)) { _$rem( _this, __$lookup_ ); return }
    if(__$persistents_.has(_this.uuid)) { _$rem( _this, __$persistents_ ); return }
} as never)

_$replacer(Node, 'addComponent', function(_this) {}, function(_this, _comp) {
    _comp && (_comp.node._persistNode ? __$persistents_ : __$lookup_).set(_comp.uuid, _comp);
})

_$replacer(Component, '_onPreDestroy', function(_this) {
    (_this.node._persistNode ? __$persistents_ : __$lookup_).delete(_this.uuid)
})


function _$rem(target: Node, pool: Map<string, Node | Component>) {
    const _children = target.children;

    for(const _child of _children) {
        _$rem(_child, pool);
    }

    const _comps = target.components
    for(const _comp of _comps) {
        pool.delete(_comp.uuid);
    }
    (target._persistNode ? __$persistents_ : pool).delete(target.uuid);
}

function _$add(target: Node, pool: Map<string, Node | Component>) {
    (target._persistNode ? __$persistents_ : pool).set(target.uuid, target);
    const _comps = target.components;

    for(const _comp of _comps) {
        pool.set(_comp.uuid, _comp);
    }

    for(const _child of target.children) {
        _$add(_child, pool);
    }

}

export const NodeUtils = js.createMap<_INodeUtils>();

NodeUtils.lookup = function(uuid: string) {
    return __$lookup_[uuid] ?? __$persistents_[uuid] ?? null
}

NodeUtils.getCCProps = function (target: pFlex.TFunc | object, ...types: pFlex.TCtor[]): string[] {
    const _ctor = (typeof target === 'function' ? target : target.constructor) as any;
    let _props = _ctor.__props__ ?? _ctor.prototype?.__props__ ?? [];

    if (!Array.isArray(_props)) return [];
    if (types.length > 0) {
        const attrs = CCClass.Attr.getClassAttrs(_ctor);
        _props = _props.filter(p => {
            const cp = attrs[`${p}${CCClass.Attr.DELIMETER}ctor`];
            return cp && types.some(t => t === cp || cp.prototype instanceof t);
        });
    }
    return _props;
}

NodeUtils.create = function<T extends pFlex.TCtor<any, any>[]>(opt: { name?: string | ((n: Node) => string), layer?: Layers.Enum, parent?: Node, active?: boolean, pos?: TFlexPosition, fab?: Prefab, scale?: IVec3Like, rotation?: IVec3Like, isDisconnectPrefabLink?: boolean, isNotKeepWorldTransform?: boolean }, configs?: { [K in keyof T]: { type: T[K], opt?: Partial<any>, multiple?: boolean, modifier?: (i: any) => void } }) {
    const node = opt.fab ? instantiate(opt.fab) : new Node();
    if (opt.name) node.name = typeof opt.name === 'function' ? opt.name(node) : opt.name;
    if (opt.isDisconnectPrefabLink && EDITOR) (node as any)._prefab = null;
    node.layer = opt.layer ?? Layers.Enum.UI_2D;
    node.active = opt.active ?? true;
    if (opt.scale) node.setScale(opt.scale.x, opt.scale.y, opt.scale.z);
    if (opt.rotation) node.setRotationFromEuler(opt.rotation.x, opt.rotation.y, opt.rotation.z);
    const comps = configs ? configs.map(c => {
        const i = c.multiple ? node.addComponent(c.type) : (node.getComponent(c.type) || node.addComponent(c.type));
        if (c.opt) pObject.assign(i, c.opt);
        if (c.modifier) c.modifier(i);
        return i;
    }) : [];
    if (opt.parent) {
        node.setParent(opt.parent, !opt.isNotKeepWorldTransform);
        if (opt.pos) NodeUtils.setPosition(node, opt.pos);
    }
    return { node, comps: comps as any };
}

NodeUtils.setPosition = function<T extends IVec3Like>(target: TFlexCCNode, pos: TFlexPosition<T>, dif?: T) {
    const node = target instanceof Node ? target : target.node;
    const off = dif ?? { x: 0, y: 0, z: 0 };
    if (pos instanceof Node) { node.setWorldPosition(v3(pos.worldPosition.x + (off.x || 0), pos.worldPosition.y + (off.y || 0), pos.worldPosition.z + (off.z || 0))); return; }
    if (pObject.isFlexKey(pos)) { const p = pos as any; if (p.node) { node.setWorldPosition(v3(p.node.worldPosition.x + (off.x || 0), p.node.worldPosition.y + (off.y || 0), p.node.worldPosition.z + (off.z || 0))); return; } }
    const p = pos as any;
    if ('position' in p && 'isWorldPos' in p) {
        const { x, y, z = 0 } = p.position;
        const f = v3(x + (off.x || 0), y + (off.y || 0), z + (off.z || 0));
        p.isWorldPos ? node.setWorldPosition(f) : node.setPosition(f);
        return;
    }
    const { x, y, z = 0 } = p;
    node.setPosition(x + (off.x || 0), y + (off.y || 0), z + (off.z || 0));
}

NodeUtils.getNodeInfo = function(target: TFlexCCNode): any {
    const n = target instanceof Node ? target : target.node;
    if (!n) return null;
    return { name: n.name, active: n.active, uuid: n.uuid, zid: n.zid, layer: Layers.Enum[n.layer], children: n.children.map(c => NodeUtils.getNodeInfo(c)), components: (n as any)._components?.map((c: any) => ({ type: c.constructor.name, name: c.name })) };
}

NodeUtils.search = function<T extends Component>(cls: pFlex.TCtor<any, T>, root?: Node): T | null {
    return root ? root.getComponentInChildren(cls) : director.getScene()?.getComponentInChildren(cls);
}

NodeUtils.getAttr = function(target) {

    const _attr = CCClass.Attr.getClassAttrs(target);
    const _out = {}

    Object.keys(_attr).forEach(_ => {
        const [key, val] = _.split(CCClass.Attr.DELIMETER);
        _out[key] = _out[key] || {};
        _out[key][val] = _attr[_];
    })

    return _out;
}

// --- Components ---

export type TFlexTarget = Node | Component;
export interface IEventTarget { _target: pFlex.TArray<TFlexTarget>; _handlers: pFlex.TArray<pFlex.TFunc>; _capture?: any; }
export interface IEventBinders { _options: pFlex.TArray<IEventTarget>; _type: pFlex.TArray<string | NodeEventType>; _binder?: any; }
export interface IEventRemover { _target: pFlex.TArray<TFlexTarget>; _type: string | NodeEventType; }
export interface IEventBinder { _target: TFlexTarget; _type: string | NodeEventType; _handler: pFlex.TFunc; _binder?: any; _capture?: any; }

type _TComp = pFlex.TCtor<Component> | string

interface _ICompUtils {
    awake: (comp: Component) => void;
    get: <T extends Component>(target: TFlexTarget, cls: pFlex.TCtor<any, T>) => T;
    binds: (target: Component, key: string, binder: Component, handler: string) => void;
    appends: (events: pFlex.TArray<IEventBinders>) => void;

    removes(target: pFlex.TArray<TFlexTarget>, type: pFlex.TArray<_TComp>, ...types: _TComp[]): void

    //actBindBtn(target: pFlex.TArray<Button>, method: pFlex.TFunc<[Button], void>, binder?: any): void
}

export const CompUtils = js.createMap<_ICompUtils>(); 
//CompUtils.actBindBtn = function(target, method, binder) {
//    const _btns = pArray.flatter(target).filter(_ => !!_ && _.isValid && !!_.node && !_.node.isValid);
//
//    _btns.forEach(_ => _.node.on(Button.EventType.CLICK))
//
//}

CompUtils.removes = function(t, e, ...es) {
    es = pArray.flat(e, es).map(_ => typeof _ === 'string' ? js.getClassByName(_) : _);
    const _ns = pArray.flatter(t);

    for(const _t of _ns) {
        const _n = _t instanceof Node ? _t : _t.node;

        es.forEach((_: pFlex.TCtor<Component>) => {
            const cls = _;

            const comps = _n.components;
            if ((cls as any)._sealed) {
                for (let i = 0; i < comps.length; ++i) {
                    const comp = comps[i];
                    (comp.constructor === _) && comp.destroy();
                }
            } else {
                for (let i = 0; i < comps.length; ++i) {
                    const comp = comps[i];
                    (comp instanceof _) && comp.destroy();
                }
            }
        })

    }

}

CompUtils.awake = function(comp: Component) {
    if (!comp || (comp as any)._isOnLoadCalled) return;
    const _comp = comp as any;
    _comp.__preload?.(); _comp.onLoad?.(); _comp.onEnable?.(); _comp.start?.();
}

CompUtils.get = function<T extends Component>(target: TFlexTarget, cls: pFlex.TCtor<any, T>): T {
    const n = target instanceof Node ? target : target.node;
    return n.getComponent(cls) || n.addComponent(cls);
}

CompUtils.binds = function(target: Component, key: string, binder: Component, handler: string) {
    const arr = (target as any)[key];
    if (Array.isArray(arr)) {
        const ev = new EventHandler();
        ev.target = binder.node; ev.component = js.getClassName(binder); ev.handler = handler;
        arr.push(ev);
    }
}

CompUtils.appends = function(events: pFlex.TArray<IEventBinders>) {
    pArray.flatter(events).forEach(config => {
        pArray.flatter(config._options).forEach(opt => {
            const targets = pArray.flatter(opt._target);
            const handlers = pArray.flatter(opt._handlers);
            const types = pArray.flatter(config._type);
            targets.forEach(t => {
                const n = t instanceof Node ? t : t.node;
                handlers.forEach(h => types.forEach(type => n.on(type as any, h, config._binder, opt._capture)));
            });
        });
    });
}

