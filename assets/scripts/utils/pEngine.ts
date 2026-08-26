import { Node, Component, NodeEventType, EventHandler, js, director, IVec3Like, v3, Layers, CCClass, Prefab, instantiate, JsonAsset, assetManager, Director, Scene, _decorator, CCObject } from "cc";
import { DEBUG, DEV } from "cc/env";
import { EDITOR } from "cc/env";
import * as pArray from "./pArray";
import * as pClass from './pClass';
import * as pObject from "./pObject";
import * as pConst from "./pConst";
import * as pGlobal from "./pGlobal";
import * as cc from 'cc'
import * as pMath from "./pMath";

/**
 * pEngine: Comprehensive Cocos Creator engine utilities for Nodes, Components, and Assets.
 */

// --- Assets (Json) ---

const _$map = new WeakMap<JsonAsset, _IJson.Event.IData>();
const _$pdt = new WeakMap<JsonAsset, _IJson.Param.IData>();

const _originJsonDestroyer = JsonAsset.prototype.destroy;
JsonAsset.prototype.destroy = function() {
    const data = _$map.get(this);
    if (data?.options.isAutoReleased) {
        _$map.delete(this);
        _$pdt.delete(this);
        assetManager.releaseAsset(this);
    }
    return _originJsonDestroyer.call(this);
};

function _get(asset: JsonAsset): _IJson.Event.IData | undefined {
    if (!asset || !asset.isValid) return undefined;
    let data = _$map.get(asset);
    if (!data) {
        data = { sealed: false, listeners: [], options: { isAutoReleased: true } };
        _$map.set(asset, data);
    }
    return data.sealed ? undefined : data;
}

namespace _IJson {
    export interface Core {
        event: _IJson.Event.IMethods;
        param: _IJson.Param.IMethods;
        stringify(data: any): string
    }

    export namespace Event {
        export interface IMethods {
            add: (asset: pFlex.TArray<JsonAsset>, ...ls: pFlex.THandler[]) => void;
            remove: (asset: pFlex.TArray<JsonAsset>, ...ls: pFlex.THandler[]) => void;
            invoke: (asset: pFlex.TArray<JsonAsset>, ...args: any[]) => any[];
            seal: (asset: pFlex.TArray<JsonAsset>, status: boolean) => void;
            clean: (asset: pFlex.TArray<JsonAsset>) => void;
            previewer(data: JsonAsset): any
        }

        interface _IOption {
            isAutoReleased: boolean;
        }

        export interface IData {
            sealed: boolean;
            listeners: pFlex.IBinder[];
            options: _IOption;
        }
    }

    export namespace Param {
        export interface IMethods {
            set(target: JsonAsset, data: any): void
            get<_TObject>(target: JsonAsset): Partial<_TObject> | undefined
            lock(target: JsonAsset, status?: boolean): void
            previewer(data: JsonAsset): any
        }

        export interface IData {
            locked: boolean
            data: Record<pFlex.TKey, any>
            primary: boolean
        }
    }
}

export const Json = js.createMap<_IJson.Core>();
Json.event = js.createMap<_IJson.Event.IMethods>();
Json.param = js.createMap<_IJson.Param.IMethods>();

function _jsnode(_val: cc.Node, simple: boolean = false) {
    if(!_val) return null;
    const _data = {
        name: _val.name,
        uuid: _val.uuid,
        active: _val.active,
        activeInHierarchy: _val.activeInHierarchy,
        layer: Layers.Enum[_val.layer],
        flag: _val._objFlags,
        parent: _val.parent ? { name: _val.parent.name, uuid: _val.parent.uuid } : null,
        children: _val.children.map(c => ({ name: c.name, uuid: c.uuid })),
        comps: _val.components.map(c => _jscomp(c, true))
    }

    if(simple) return JSON.stringify(_data);
    _data['position'] = {
        lcal: _val.position.toString(),
        world: _val.worldPosition.toString()
    }
    _data['euler'] = _val.eulerAngles.toString();
    _data['angle'] = _val.angle;
    _data['scale'] = _val.scale.toString();
    _data['path'] = _getNodePath(_val);

    return JSON.stringify(_data);
}

function _jscomp(_val: cc.Component, simple: boolean = false) {
    if(!_val) return null;
    const _data = {
        name: _val.name,
        uuid: _val.uuid,
        flag: _val._objFlags,
    }

    if(simple) return JSON.stringify(_data);
    _data['node'] = _jsnode(_val.node, true);
    return JSON.stringify(_data);
}

function _to(_val: any) {
    switch(typeof _val) {
        case "number":
        case "boolean":
        case "bigint": return String(_val)
        case "string":
        case "symbol": return `"${String(_val)}"`
        case "undefined": return `"[undefined]"`;
        case "object": {
            if(_val === null) {
                return `null`;
            }

            if(_val instanceof cc.Component) {
                return _jscomp(_val);
            }

            if(_val instanceof cc.Node) {
                return _jsnode(_val);
            }

            if(Array.isArray(_val)) {
                let _arr = "[";
                for(const _item of _val) {
                    _arr += `${_to(_item)}, `;
                }
                _arr = _arr.endsWith(', ') ? _arr.slice(0, -2) : _arr;
                return `${_arr}]`;
            }
            break;
        }
        case "function": {
            return `"${_val.name || 'anonymous'}: ${String(_val)}"`;
        }
    }
}

Json.stringify = function(data: any) {
    if(data instanceof cc.Node) return _jsnode(data);
    if(data instanceof cc.Component) return _jscomp(data);

    let _out = "{";
    for(const _key in data) {
        if(pObject.isWriteOnlyProperty(data, _key)) continue;
        const _val = data[_key];
        _out += `"${_key}": ${_to(_val)}, `;
    }
    _out = _out.endsWith(', ') ? _out.slice(0, -2) : _out;

    return `${_out}}`;
}

if(DEV) {
    const { editor_ccclass, editor_property } = pClass;

    @editor_ccclass('pEngine.JsonEventPreviewer')
    class _JsonPreviewer {
        @editor_property()
        sealed: boolean = false;

        @editor_property(undefined, { name: 'options.isAutoReleased' })
        isAutoReleased: boolean = false;

        @editor_property([cc.CCString])
        listeners: string[] = [];
    }

    Json.event.previewer = function(data) {
        const _out = new _JsonPreviewer();
        const _data = _$map.get(data);
        if(_data) {
            _out.sealed = _data.sealed;
            _out.isAutoReleased = _data.options.isAutoReleased;
            _out.listeners = _data.listeners.map(l => `${l.binder?.name || 'null'}::${l.func?.name || 'anonymous'}`)
        }
        return _out;
    }
    window['$json'] = window['$json'] || {};
    window['$json']['map'] = _$map;

} else {
    Json.event.previewer = function() { return pConst.EMPTY }
}


function _$jpget(asset: JsonAsset) {
    if(!asset || !asset.isValid) return undefined

    let _out = _$pdt.get(asset);
    if(!_out) {
        _out = { locked: false, data: {}, primary: false };
        _$pdt.set(asset, _out);
    }

    return _out;
}

if(DEV) {
    const { editor_ccclass, editor_property } = pClass;

    @editor_ccclass('pEngine.JsonParamPreviewer')
    class _JsonParam {
        @editor_property()
        locked: boolean = false;

        @editor_property([cc.CCString])
        data: string[] = [];
    }

    Json.param.previewer = function(data) {
        const _out = new _JsonParam();
        const _data = _$pdt.get(data);
        if(_data) {
            _out.locked = _data.locked;
            for(const _key in _data.data) {
                _out.data.push(`${_key}: ${Json.stringify(_data.data[_key])}`)
            }
        }

        return _out;
    }

    window['$json'] = window['$json'] || {};
    window['$json']['param'] = _$pdt;

} else {
    Json.param.previewer = function() { return pConst.EMPTY }
}

const _$key = Symbol('__$pEngine.JsonParam.primary');
Json.param.set = function(target: JsonAsset, data: any) {
    const _data = _$jpget(target);
    if(!_data || _data.locked) return;

    switch(typeof data) {
        case "string":
        case "number":
        case "bigint":
        case "boolean":
        case "symbol":
        case "function":
        case "undefined": {
            _data.data[_$key] = data;
            _data.primary = true;
            break;
        }
        case "object": {
            if(!data) {
                _data.data[_$key] = null;
                _data.primary = true;
                break;
            }
            if(Array.isArray(data)) {
                _data.data[_$key] = data;
                _data.primary = true;
                break;
            }
            for(const _key in data) {
                if(pObject.isWriteOnlyProperty(data, _key)) continue;
                _data.data[_key] = data[_key];
            }
            _data.primary = false;
            break;
        }
    }
    console.log(`Json.param.set: ${target.name} => ${Json.stringify(_data.data)}`);
}

Json.param.get = function<_TObject>(target: JsonAsset): _TObject | undefined {
    const _data = _$jpget(target);
    return _data ? (_data.primary ? _data.data[_$key] : _data.data) : undefined;
}

Json.param.lock = function(target: JsonAsset, status: boolean = true) {
    const _data = _$jpget(target);
    if(!_data) return;
    _data.locked = status;
}

Json.event.add = function(asset, ...ls: pFlex.THandler[]) {
    const _assets = pArray.flatter(asset);
    const mappedLs = pClass.mapper(ls);
    for(const _ret of _assets) {
        const d = _get(_ret);
        if (d) d.listeners.push(...mappedLs);
    }
}

Json.event.remove = function(asset, ...ls: pFlex.THandler[]) {
    const _assets = pArray.flatter(asset);
    const rem = pClass.mapper(ls);
    for(const _ret of _assets) {
        const d = _get(_ret);
        if (d) {
            d.listeners = d.listeners.filter(l => !rem.some(r => r.func === l.func && r.binder === l.binder));
        }
    }
}

Json.event.clean = function(asset) {
    const _assets = pArray.flatter(asset);
    for(const _ret of _assets) {
        const _out = _get(_ret);

        if(!_out) continue;
        _out.listeners.length = 0;
    }
}

Json.event.invoke = function(asset, ...args: any[]) {
    const _assets = pArray.flatter(asset);
    for(const _ret of _assets) {
        const d = _get(_ret);
        pGlobal.log('DEV', '[Json.event.invoke] >>', _ret.name, ' with args ', ...args, "\nList: ", _assets);
        if (d) return pClass.emit(d.listeners, ...args);
    }
}

Json.event.seal = function(asset: pFlex.TArray<JsonAsset>, status: boolean) {
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
    create: <T extends pFlex.TCtorFlex<any, any>[]>(opt: _INodeUtilsCreator, configs?: { [K in keyof T]: { type: T[K], opt?: { [ _K in keyof InstanceType<T[K]> as InstanceType<T[K]>[_K] extends Function ? never : _K]?: InstanceType<T[K]>[_K] }, multiple?: boolean, modifier?: (i: InstanceType<T[K]>, parent: Node) => void } }) => { node: Node; comps: any[] };
    setPosition: <T extends IVec3Like>(target: TFlexCCNode, pos: TFlexPosition<T>, dif?: T) => void;
    getNodeInfo: (target: TFlexCCNode) => any;
    search: <T extends Component>(cls: pFlex.TCtor<any, T>, root?: Node) => T | null;
    lookup(uuid: string): Node | Component | null
    findNodeOrCompViaZid(ref: string | { zid?: string, uuid?: string }): Node | Component | null
    getAttr(target: pFlex.TFunc | object): Record<string, _IAttr>
    getLocalPosition<TPosition extends IVec3Like>(_self: TFlexCCNode, _target: TFlexPosition<TPosition>, _dif?: TPosition): cc.Vec3
    getNodePath(target: TFlexCCNode): string
}

interface _INodeUtilsCreator {
    name?: string | pFlex.TFunc<[Node], string>;
    layer?: Layers.Enum;
    parent?: Node;
    active?: boolean;
    pos?: TFlexPosition;
    fab?: pFlex.TArray<Prefab>;
    scale?: IVec3Like;
    rotation?: IVec3Like;
    isDisconnectPrefabLink?: boolean;
    isNotKeepWorldTransform?: boolean
    pool?: cc.NodePool
}

const __$lookup_ = new Map<string, Node | Component>();
const __$persistents_ = new Map<string, Node | Component>();
const __$zidLookup_ = new Map<string, Node | Component>();

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
    __$zidLookup_.clear();

    _$add(_scene, __$lookup_);
})

function _getNodePath(target: TFlexCCNode): string {
    const _node = target instanceof Node ? target : target.node;
    if(!_node) return '';
    let _path = _node.name;
    let _parent = _node.parent;
    while(_parent) {
        _path = `${_parent.name}/${_path}`;
        _parent = _parent.parent;
    }
    return _path;
}



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
    if ((node as any).zid) __$zidLookup_.delete((node as any).zid);
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
    if (!_comp) return;
    const pool = _comp.node._persistNode ? __$persistents_ : __$lookup_;
    pool.set(_comp.uuid, _comp);
    if ((_comp as any).zid) __$zidLookup_.set((_comp as any).zid, _comp);
})

_$replacer(Component, '_onPreDestroy', function(_this) {
    const pool = _this.node._persistNode ? __$persistents_ : __$lookup_;
    pool.delete(_this.uuid);
    if ((_this as any).zid) __$zidLookup_.delete((_this as any).zid);
})


function _$rem(target: Node, pool: Map<string, Node | Component>) {
    const _children = target.children;
    for(const _child of _children) {
        _$rem(_child, pool);
    }

    const targetPool = target._persistNode ? __$persistents_ : pool;
    const _comps = target.components;
    for(const _comp of _comps) {
        targetPool.delete(_comp.uuid);
        if ((_comp as any).zid) __$zidLookup_.delete((_comp as any).zid);
    }
    targetPool.delete(target.uuid);
    if ((target as any).zid) __$zidLookup_.delete((target as any).zid);
}

function _$add(target: Node, pool: Map<string, Node | Component>) {
    const targetPool = target._persistNode ? __$persistents_ : pool;
    targetPool.set(target.uuid, target);
    if ((target as any).zid) __$zidLookup_.set((target as any).zid, target);

    const _comps = target.components;
    for(const _comp of _comps) {
        targetPool.set(_comp.uuid, _comp);
        if ((_comp as any).zid) __$zidLookup_.set((_comp as any).zid, _comp);
    }

    for(const _child of target.children) {
        _$add(_child, pool);
    }
}

export const NodeUtils = js.createMap<_INodeUtils>();

NodeUtils.getNodePath = _getNodePath
const _tempVec3 = v3();
const _tempWorldVec3 = v3();

function _getPosition<_TPosition extends IVec3Like>(_position: _TPosition) {
    const { x, y } = _position;
    const z = 'z' in _position ? (_position as any).z : 0;
    return { x, y, z };
}

function _extractPosition(target: TFlexPosition<IVec3Like>, outVec: cc.Vec3): { vec: cc.Vec3, isWorld: boolean } {
    if (target instanceof Node) {
        return { vec: outVec.set(target.worldPosition), isWorld: true };
    }
    if (pObject.isFlexKey(target)) {
        const p = target as any;
        if (p.node) {
            return { vec: outVec.set((p.node as Node).worldPosition), isWorld: true };
        }
        if ('position' in p) {
            const isWorld = 'isWorldPos' in p ? Boolean(p.isWorldPos) : false;
            const { x, y, z = 0 } = p.position;
            return { vec: outVec.set(x, y, z), isWorld };
        }
    }
    const { x, y, z = 0 } = _getPosition(target as any);
    return { vec: outVec.set(x, y, z), isWorld: false };
}

NodeUtils.getLocalPosition = function<TPosition extends IVec3Like>(_self: TFlexCCNode, _target: TFlexPosition<TPosition>, _dif?: TPosition): cc.Vec3 {
    _self = _self instanceof Node ? _self : _self.node;
    const { parent } = (_self as Node);
    const dx = _dif?.x || 0;
    const dy = _dif?.y || 0;
    const dz = _dif?.z || 0;

    if (!parent) return v3();

    const { vec, isWorld } = _extractPosition(_target as any, _tempVec3);

    if (parent instanceof Scene) {
        return v3(vec.x + dx, vec.y + dy, vec.z + dz);
    }

    if (isWorld) {
        const transform = CompUtils.get(parent, cc.UITransform);
        const localPos = transform.convertToNodeSpaceAR(vec, _tempWorldVec3);
        return v3(localPos.x + dx, localPos.y + dy, localPos.z + dz);
    }

    return v3(vec.x + dx, vec.y + dy, vec.z + dz);
}

NodeUtils.lookup = function(uuid: string) {
    return __$lookup_.get(uuid) ?? __$persistents_.get(uuid) ?? null;
}

function _decodeUuid(id: string): string {
    try {
        const _u = (assetManager as any).utils?.decodeUuid?.(id);
        return _u || id;
    } catch {
        return id;
    }
}

NodeUtils.findNodeOrCompViaZid = function(ref: string | { zid?: string, uuid?: string }) {
    if (!ref) return null;

    const _zid = typeof ref === 'string' ? ref : (ref.zid || ref.uuid || '');
    const _uuid = typeof ref === 'string' ? '' : (ref.uuid || '');

    const _cands: string[] = [];
    for (const _v of [_uuid, _zid]) {
        if (!_v || _cands.includes(_v)) continue;
        _cands.push(_v);
        const _d = _decodeUuid(_v);
        if (_d !== _v && !_cands.includes(_d)) _cands.push(_d);
    }
    if (!_cands.length) return null;

    // 1) Direct registry hit by uuid or zid (O(1))
    for (const _c of _cands) {
        const _hit = NodeUtils.lookup(_c) ?? __$zidLookup_.get(_c);
        if (_hit) return _hit;
    }

    // 2) Fallback linear scan if zid was assigned dynamically after node creation
    for (const _pool of [__$lookup_, __$persistents_]) {
        for (const _inst of _pool.values()) {
            const _iz = (_inst as any).zid;
            if ((_iz && _cands.includes(_iz)) || _cands.includes(_inst.uuid)) return _inst;
        }
    }

    return null;
}

const __$ccPropsCache = new WeakMap<Function, string[]>();

NodeUtils.getCCProps = function (target: pFlex.TFunc | object, ...types: pFlex.TCtor[]): string[] {
    const _ctor = (typeof target === 'function' ? target : target.constructor) as any;
    let _props = __$ccPropsCache.get(_ctor);
    if (!_props) {
        _props = _ctor.__props__ ?? _ctor.prototype?.__props__ ?? [];
        if (!Array.isArray(_props)) _props = [];
        __$ccPropsCache.set(_ctor, _props);
    }

    if (types.length > 0 && _props.length > 0) {
        const attrs = CCClass.Attr.getClassAttrs(_ctor);
        return _props.filter(p => {
            const cp = attrs[`${p}${CCClass.Attr.DELIMETER}ctor`];
            return cp && types.some(t => t === cp || cp.prototype instanceof t);
        });
    }
    return _props;
}

NodeUtils.create = function(opt, configs?) {
    let node = null
    if(opt.pool) {
        node = opt.pool.get();
    }

    if(!node) {
        node = opt.fab ? Array.isArray(opt.fab) ? instantiate(pMath.rand(opt.fab)) : instantiate(opt.fab) : new Node();
    }

    if (opt.name) node.name = typeof opt.name === 'function' ? opt.name(node) : opt.name;
    if (opt.isDisconnectPrefabLink && EDITOR) (node as any)._prefab = null;

    node.layer = opt.layer ?? Layers.Enum.UI_2D;
    node.active = opt.active ?? true;

    if (opt.scale) node.setScale(opt.scale.x, opt.scale.y, opt.scale.z);
    if (opt.rotation) node.setRotationFromEuler(opt.rotation.x, opt.rotation.y, opt.rotation.z);

    if (opt.parent) {
        node.setParent(opt.parent, !opt.isNotKeepWorldTransform);
        if (opt.pos) NodeUtils.setPosition(node, opt.pos);
    }

    const comps = configs ? configs.map(c => {
        const i = c.multiple ? node.addComponent(c.type as any) : (node.getComponent(c.type) || node.addComponent(c.type as any));
        if (c.opt) pObject.assign(i, c.opt);
        if (c.modifier) c.modifier(i, node)
        return i;
    }) : [];

    return { node, comps: comps as any };
}

NodeUtils.setPosition = function<T extends IVec3Like>(target: TFlexCCNode, pos: TFlexPosition<T>, dif?: T) {
    const node = target instanceof Node ? target : target.node;
    const dx = dif?.x || 0;
    const dy = dif?.y || 0;
    const dz = dif?.z || 0;

    const { vec, isWorld } = _extractPosition(pos as any, _tempVec3);
    const targetVec = _tempWorldVec3.set(vec.x + dx, vec.y + dy, vec.z + dz);

    if (isWorld) {
        node.setWorldPosition(targetVec);
    } else {
        node.setPosition(targetVec);
    }
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
    isOnLoaded(target: Component): boolean
}


export const CompUtils = js.createMap<_ICompUtils>();

CompUtils.isOnLoaded = function(target: Component) {
    return Boolean(target && ((target as any)._objFlags & CCObject.Flags.IsOnLoadCalled));
}

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
    const configs = pArray.flatter(events);
    for (let i = 0; i < configs.length; ++i) {
        const config = configs[i];
        const options = pArray.flatter(config._options);
        const types = pArray.flatter(config._type);
        for (let j = 0; j < options.length; ++j) {
            const opt = options[j];
            const targets = pArray.flatter(opt._target);
            const handlers = pArray.flatter(opt._handlers);
            for (let k = 0; k < targets.length; ++k) {
                const t = targets[k];
                const n = t instanceof Node ? t : t.node;
                for (let m = 0; m < handlers.length; ++m) {
                    const h = handlers[m];
                    for (let nIdx = 0; nIdx < types.length; ++nIdx) {
                        n.on(types[nIdx] as any, h, config._binder, opt._capture);
                    }
                }
            }
        }
    }
}

interface _IDevice {
    vibrate(pattern: VibratePattern): void;
}

export const Device = js.createMap<_IDevice>();
Device.vibrate = function(pattern: VibratePattern) {
    try {
        if(cc.sys.isBrowser) {
            window.navigator.vibrate(pattern);
        }
    } catch(_error) {
        console.error("[VibrateAPI] >> Error >>", _error);
    }
}


