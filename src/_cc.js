/// <reference path="./_doc.js" />
'use strict';

/**
 * Cocos Creator Scene Process Bridge (pTS-Core)
 * Unified scene script for all pTS extensions.
 * Runs inside the Engine Scene execution context where `cc` and `cce` are globally available.
 */

// ─── Helpers: Node & Component Lookups ───

function findNodeByUuid(uuid) {
    if (!uuid) return null;
    const scene = cc.director.getScene();
    if (!scene) return null;

    if (scene.uuid === uuid || scene._id === uuid) return scene;

    function search(node) {
        if (!node) return null;
        if (node.uuid === uuid || node._id === uuid) return node;
        if (node.children) {
            for (let i = 0; i < node.children.length; i++) {
                const found = search(node.children[i]);
                if (found) return found;
            }
        }
        return null;
    }

    return search(scene);
}

function findComponent(node, componentType) {
    if (!node || !node.components) return null;

    const ctor = cc.js.getClassByName(componentType);
    if (ctor) {
        const comp = node.getComponent(ctor);
        if (comp) return comp;
    }

    for (let i = 0; i < node.components.length; i++) {
        const comp = node.components[i];
        if (!comp) continue;
        const compCtor = comp.constructor;
        const compName = compCtor ? compCtor.name : '';
        const compClassName = compCtor ? cc.js.getClassName(compCtor) : '';
        const compCid = compCtor ? cc.js._getClassId(compCtor) : '';
        const typeStr = comp.__type__ || '';

        if (
            compName === componentType ||
            compClassName === componentType ||
            compCid === componentType ||
            typeStr === componentType ||
            (comp.uuid && comp.uuid === componentType)
        ) {
            return comp;
        }
    }

    if (/^\d+$/.test(componentType)) {
        const idx = parseInt(componentType, 10);
        if (idx >= 0 && idx < node.components.length) {
            return node.components[idx];
        }
    }

    return null;
}

// ─── Helpers: Class Reflection & Attributes ───

function getCCClassAttrs(target) {
    if (!target) return {};
    const ctor = typeof target === 'function' ? target : target.constructor;
    if (!ctor) return {};

    const attrs = cc.Class.Attr.getClassAttrs(ctor) || {};
    const delimiter = cc.Class.Attr.DELIMETER || '$';
    const result = {};

    for (const key in attrs) {
        const parts = key.split(delimiter);
        const propName = parts[0];
        const attrKey = parts[1];
        if (!result[propName]) result[propName] = {};
        result[propName][attrKey] = attrs[key];
    }

    return {
        className: cc.js.getClassName(ctor) || ctor.name,
        props: ctor.__props__ || (ctor.prototype ? ctor.prototype.__props__ : []) || [],
        attributes: result
    };
}

function _getCCProps(target, ..._types) {
    const ctor = (typeof target === 'function' ? target : target.constructor);
    let props = ctor.__props__ ?? ctor.prototype?.__props__ ?? [];
    if (!Array.isArray(props)) return [];

    if (_types?.length > 0) {
        const _attrs = cc.Class.Attr.getClassAttrs(ctor);
        props = props.filter(_ => {
            const _key = `${_}${cc.Class.Attr.DELIMETER}ctor`;
            const _prop = _attrs[_key];
            if (!_prop) return false;

            return !!_types.find(_ctor => _ctor === _prop || _prop.prototype instanceof _ctor);
        });
    }

    return props;
}

function _getCCPropsInfo(target) {
    const _ctor = (typeof target === 'function' ? target : target.constructor);
    const _attrs = cc.Class.Attr.getClassAttrs(_ctor);

    const _obj = cc.js.createMap();
    for (const _key in _attrs) {
        const _prop = _attrs[_key];
        const _cut = _key.split(cc.Class.Attr.DELIMETER);
        const _first = _cut[0];
        const _second = _cut[1];

        if (!_obj[_first]) _obj[_first] = cc.js.createMap();
        _obj[_first][_second] = _prop;
    }
    return _obj;
}

function _getCCPropInfo(target, prop) {
    const _ctor = (typeof target === 'function' ? target : target.constructor);
    const _attrs = cc.Class.Attr.getClassAttrs(_ctor);

    const _obj = cc.js.createMap();
    for (const _key in _attrs) {
        if (_key.includes(prop)) {
            const _prop = _attrs[_key];
            const _cut = _key.split(cc.Class.Attr.DELIMETER);
            _obj[_cut[1]] = _prop;
        }
    }
    return _obj;
}

// ─── Helpers: Serialization & Dumper ───

function _toDumperData(target) {
    const _prop = _getCCPropsInfo(target);
    for (const _p in _prop) {
        const _val = target[_p];
        for (const _k in _val) {
            if (_k === 'default') {
                const _def = _val[_k];
                try {
                    const _test = typeof _def === 'function' ? _def() : _def;
                } catch {}
            }
        }
    }
}

function _findPropertyDescriptor(obj, prop) {
    let curr = obj;
    while (curr && curr !== Object.prototype) {
        const desc = Object.getOwnPropertyDescriptor(curr, prop);
        if (desc) return desc;
        curr = Object.getPrototypeOf(curr);
    }
    return null;
}

function _getGettersOfClass(ctor) {
    const getters = {};
    if (!ctor) return getters;
    const proto = ctor.prototype;
    if (!proto) return getters;

    const props = ctor.__props__ || [];
    for (const p of props) {
        const desc = _findPropertyDescriptor(proto, p);
        if (desc && typeof desc.get === 'function') {
            getters[p] = {
                hasSetter: typeof desc.set === 'function',
                readonly: typeof desc.set !== 'function'
            };
        }
    }
    return getters;
}

// ─── Monkeypatch cc.Class.Attr.setClassAttr for per-instance attributes ───
if (typeof cc !== 'undefined' && cc.Class && cc.Class.Attr) {
    if (!cc.Class.Attr.__pts_instance_patched__) {
        cc.Class.Attr.__pts_instance_patched__ = true;
        const _origSetClassAttr = cc.Class.Attr.setClassAttr;
        cc.Class.Attr.setClassAttr = function (target, propName, attrName, value) {
            if (target && typeof target === 'object' && typeof target !== 'function') {
                const del = cc.Class.Attr.DELIMETER || '$_$';
                const attrKey = propName + del + attrName;
                target.__instance_attrs__ = target.__instance_attrs__ || {};
                target.__instance_attrs__[attrKey] = value;
                target[attrKey] = value;
            }
            return _origSetClassAttr.apply(this, arguments);
        };
    }
}

function _isValEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null || a === undefined || b === undefined) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a === 'object') {
        const uuidA = a.__uuid__ || a.uuid;
        const uuidB = b.__uuid__ || b.uuid;
        if (uuidA !== undefined || uuidB !== undefined) {
            return uuidA === uuidB;
        }
        try {
            return JSON.stringify(a) === JSON.stringify(b);
        } catch {}
    }
    return false;
}

let _cachedInstanceAttrs = {};

function _applyInstanceAttrsToDump(instance, dump, className = null) {
    if (!instance || !dump || !dump.value) return;
    const del = cc.Class.Attr.DELIMETER || '$_$';

    if (instance.__instance_attrs__) {
        for (const [attrFullKey, attrVal] of Object.entries(instance.__instance_attrs__)) {
            const [pName, aName] = attrFullKey.split(del);
            if (dump.value[pName]) {
                dump.value[pName][aName] = attrVal;
            }
        }
    }

    for (const propName of Object.keys(instance)) {
        if (Array.isArray(instance[propName]) && dump.value[propName] && Array.isArray(dump.value[propName].value)) {
            for (let i = 0; i < instance[propName].length; i++) {
                const itemInst = instance[propName][i];
                const itemDump = dump.value[propName].value[i];
                if (itemInst && itemInst.__instance_attrs__ && itemDump) {
                    for (const [attrFullKey, attrVal] of Object.entries(itemInst.__instance_attrs__)) {
                        const [pName, aName] = attrFullKey.split(del);
                        const targetSub = (itemDump.value && itemDump.value[pName]) || itemDump[pName];
                        if (targetSub) {
                            targetSub[aName] = attrVal;
                        }
                    }
                }
            }

            if (instance[propName].length > 0 && dump.value[propName].elementTypeData) {
                const firstItem = instance[propName][0];
                if (firstItem && firstItem.__instance_attrs__) {
                    for (const [attrFullKey, attrVal] of Object.entries(firstItem.__instance_attrs__)) {
                        const [pName, aName] = attrFullKey.split(del);
                        const elemTarget = (dump.value[propName].elementTypeData.value && dump.value[propName].elementTypeData.value[pName]) || dump.value[propName].elementTypeData[pName];
                        if (elemTarget) {
                            elemTarget[aName] = attrVal;
                        }
                    }
                }
            }
        }
    }

    for (const propName of Object.keys(dump.value)) {
        const itemDump = dump.value[propName];
        if (!itemDump) continue;
        const valInst = instance[propName];
        if (valInst && !Array.isArray(valInst)) {
            const u = valInst._uuid || valInst.uuid || (valInst.__value__ && (valInst.__value__.uuid || valInst.__value__._uuid));
            if (u) {
                const isAsset = itemDump.type === 'cc.Asset' || (Array.isArray(itemDump.extends) && itemDump.extends.includes('cc.Asset')) || (itemDump.type && (itemDump.type.startsWith('pTSAsset') || itemDump.type.includes('Asset')));
                if (isAsset) {
                    itemDump.value = { uuid: u };
                }
            }
        }
    }

    if (className) {
        _cachedInstanceAttrs[className] = _extractInstanceAttrs(instance);
    }
}

function _recoverUnknownDumpTypes(instance, dump, className, currentValues) {
    if (!dump || !dump.value) return;
    const ctor = (className ? cc.js.getClassByName(className) : null) || instance?.constructor;
    const attrs = ctor ? cc.Class.Attr.getClassAttrs(ctor) : {};
    const del = cc.Class.Attr.DELIMETER || '$_$';

    for (const p of Object.keys(dump.value)) {
        const item = dump.value[p];
        if (!item) continue;

        if (item.type === 'Unknown' || !item.type) {
            // 1. Try CCClass reflection
            let targetCtor = attrs[`${p}${del}ctor`] || attrs[`${p}${del}type`];
            let typeName = '';
            if (targetCtor) {
                typeName = cc.js.getClassName(targetCtor) || targetCtor.name || (typeof targetCtor === 'string' ? targetCtor : '');
            }
            // 2. Try currentValues[p] __type__
            if (!typeName && currentValues && currentValues[p] && currentValues[p].__type__) {
                typeName = currentValues[p].__type__;
                targetCtor = cc.js.getClassByName(typeName);
            }
            // 3. Check if instance has __type__
            if (!typeName && instance && instance[p] && instance[p].__type__) {
                typeName = instance[p].__type__;
                targetCtor = cc.js.getClassByName(typeName);
            }

            if (typeName) {
                item.type = typeName;
                const isAsset = targetCtor ? (cc.js.isChildClassOf(targetCtor, cc.Asset) || targetCtor === cc.Asset) : (typeName.startsWith('pTSAsset') || typeName.includes('Asset'));
                if (isAsset) {
                    item.extends = ['cc.Asset', 'pTSAsset', typeName];
                    const uuid = (currentValues?.[p]?.__value__?.uuid || currentValues?.[p]?.uuid || instance?.[p]?._uuid || instance?.[p]?.uuid || '');
                    item.value = { uuid };
                }
                console.log(`[pTS-Core] Recovered Unknown dump type for ${className}.${p} -> ${typeName}`);
            }
        }
    }
}

function _translateDump(dumpValue, path = '') {
    if (!dumpValue || typeof dumpValue !== 'object') return;
    if (Array.isArray(dumpValue)) {
        dumpValue.forEach((item, index) => {
            if (item && typeof item === 'object') {
                item.name = `[${index}]`;
                item.path = path ? `${path}.${index}` : `${index}`;
                if (item.value && typeof item.value === 'object') {
                    _translateDump(item.value, item.path);
                }
                delete item.displayName;
            }
        });
        return;
    }
    for (const name of Object.keys(dumpValue)) {
        const item = dumpValue[name];
        if (item && typeof item === 'object') {
            item.name = name;
            item.path = path ? `${path}.${name}` : name;
            if (item.value && typeof item.value === 'object') {
                _translateDump(item.value, item.path);
            }
        }
    }
}

function _serializeInstance(instance) {
    if (!instance || typeof instance !== 'object') return instance;
    const ctor = instance.constructor;
    if (!ctor || ctor === Object) return instance;

    const props = ctor.__props__ || Object.keys(instance);
    const gettersInfo = _getGettersOfClass(ctor);
    const result = {};

    // 1. Process CCClass declared properties
    for (const p of props) {
        if (gettersInfo[p] && gettersInfo[p].readonly) {
            continue;
        }

        const val = instance[p];
        if (val === undefined) continue;

        if (Array.isArray(val)) {
            result[p] = val.map(item => {
                if (item && typeof item === 'object') {
                    if (item instanceof cc.Asset) {
                        const itemCtor = item.constructor;
                        const itemTypeName = cc.js.getClassName(itemCtor) || itemCtor.name;
                        return {
                            __type__: itemTypeName,
                            __value__: { uuid: item._uuid || item.uuid || '' }
                        };
                    }
                    if (item.constructor && item.constructor !== Object) {
                        const itemCtor = item.constructor;
                        const itemTypeName = cc.js.getClassName(itemCtor) || itemCtor.name;
                        if (cc.js.isChildClassOf(itemCtor, cc.Asset)) {
                            return {
                                __type__: itemTypeName,
                                __value__: { uuid: item._uuid || item.uuid || '' }
                            };
                        }
                        return {
                            __type__: itemTypeName,
                            __value__: _serializeInstance(item)
                        };
                    }
                    if (item.uuid || (item.__value__ && item.__value__.uuid)) {
                        const u = item.uuid || item.__value__.uuid;
                        return {
                            __type__: item.__type__ || 'cc.Asset',
                            __value__: { uuid: u }
                        };
                    }
                }
                return item;
            });
        } else if (val && typeof val === 'object') {
            const valCtor = val.constructor;
            if (valCtor && valCtor !== Object) {
                const valTypeName = cc.js.getClassName(valCtor) || valCtor.name;
                if (cc.js.isChildClassOf(valCtor, cc.Asset)) {
                    result[p] = {
                        __type__: valTypeName,
                        __value__: { uuid: val._uuid || val.uuid || '' }
                    };
                } else if (cc.js.isChildClassOf(valCtor, cc.ValueType)) {
                    result[p] = {
                        __type__: valTypeName,
                        __value__: Object.assign({}, val)
                    };
                } else {
                    result[p] = {
                        __type__: valTypeName,
                        __value__: _serializeInstance(val)
                    };
                }
            } else {
                result[p] = val;
            }
        } else {
            result[p] = val;
        }
    }

    // 2. Include backing fields starting with '_' that might not be in __props__
    for (const k of Object.keys(instance)) {
        if (k.startsWith('_') && !(k in result) && !k.startsWith('__')) {
            const v = instance[k];
            if (v && typeof v === 'object' && v.constructor && v.constructor !== Object && !Array.isArray(v)) {
                const vCtor = v.constructor;
                const vTypeName = cc.js.getClassName(vCtor) || vCtor.name;
                result[k] = {
                    __type__: vTypeName,
                    __value__: _serializeInstance(v)
                };
            } else {
                result[k] = v;
            }
        }
    }

    return result;
}

function _extractInstanceAttrs(instance) {
    const del = cc.Class.Attr.DELIMETER || '$_$';
    const enumLists = {};
    if (instance && instance.__instance_attrs__) {
        for (const [attrKey, attrVal] of Object.entries(instance.__instance_attrs__)) {
            const [p, a] = attrKey.split(del);
            if (a === 'enumList') {
                enumLists[p] = attrVal;
            }
        }
    }
    return enumLists;
}

function _populateInstance(instance, values, prevValues = null, skipSetters = false) {
    if (!instance || !values || typeof values !== 'object') return;
    // Sort keys so backing fields (e.g. _bundle) are populated before getter/setter properties (e.g. bundle)
    const keys = Object.keys(values).sort((a, b) => {
        const aIsUnder = a.startsWith('_');
        const bIsUnder = b.startsWith('_');
        if (aIsUnder && !bIsUnder) return -1;
        if (!aIsUnder && bIsUnder) return 1;
        return a.localeCompare(b);
    });

    for (const k of keys) {
        if (k === '__type__') continue;
        const val = values[k];
        try {
            const desc = _findPropertyDescriptor(instance, k);
            if (desc && desc.get && !desc.set) {
                continue;
            }

            if (val && typeof val === 'object') {
                if (val.__type__) {
                    const subCtor = cc.js.getClassByName(val.__type__);
                    if (subCtor) {
                        const isAsset = cc.js.isChildClassOf(subCtor, cc.Asset);
                        if (isAsset) {
                            const uuid = val.__value__?.uuid || val.uuid || val._uuid;
                            const asset = (uuid && cc.assetManager && cc.assetManager.assets) ? cc.assetManager.assets.get(uuid) : null;
                            instance[k] = asset || (uuid ? { _uuid: uuid, uuid, __type__: cc.js.getClassName(subCtor) } : null);
                            if (uuid && !asset && cc.assetManager && cc.assetManager.loadAny) {
                                try { cc.assetManager.loadAny({ uuid }, () => {}); } catch (e) {}
                            }
                            continue;
                        }
                        if (!instance[k] || !(instance[k] instanceof subCtor)) {
                            instance[k] = new subCtor();
                        }
                        const subPrev = prevValues && prevValues[k] ? (prevValues[k].__value__ || prevValues[k]) : null;
                        _populateInstance(instance[k], val.__value__ || val, subPrev, skipSetters);
                        continue;
                    }
                } else if (Array.isArray(val)) {
                    const arr = [];
                    const prevArr = prevValues && Array.isArray(prevValues[k]) ? prevValues[k] : null;
                    for (let i = 0; i < val.length; i++) {
                        const itemVal = val[i];
                        if (itemVal && typeof itemVal === 'object') {
                            if (itemVal.__type__) {
                                const itemCtor = cc.js.getClassByName(itemVal.__type__);
                                if (itemCtor) {
                                    if (cc.js.isChildClassOf(itemCtor, cc.Asset)) {
                                        const uuid = itemVal.__value__?.uuid || itemVal.uuid || itemVal._uuid;
                                        const asset = (uuid && cc.assetManager && cc.assetManager.assets) ? cc.assetManager.assets.get(uuid) : null;
                                        arr.push(asset || (uuid ? { _uuid: uuid, uuid, __type__: cc.js.getClassName(itemCtor) } : null));
                                        if (uuid && !asset && cc.assetManager && cc.assetManager.loadAny) {
                                            try { cc.assetManager.loadAny({ uuid }, () => {}); } catch (e) {}
                                        }
                                        continue;
                                    }
                                    const itemInst = new itemCtor();
                                    const itemPrev = prevArr && prevArr[i] ? (prevArr[i].__value__ || prevArr[i]) : null;
                                    _populateInstance(itemInst, itemVal.__value__ || itemVal, itemPrev, skipSetters);
                                    arr.push(itemInst);
                                    continue;
                                }
                            }
                            if (itemVal.uuid || itemVal._uuid || (itemVal.__value__ && (itemVal.__value__.uuid || itemVal.__value__._uuid))) {
                                const uuid = itemVal._uuid || itemVal.uuid || itemVal.__value__?._uuid || itemVal.__value__?.uuid;
                                const asset = (uuid && cc.assetManager && cc.assetManager.assets) ? cc.assetManager.assets.get(uuid) : null;
                                arr.push(asset || (uuid ? { _uuid: uuid, uuid } : null));
                                if (uuid && !asset && cc.assetManager && cc.assetManager.loadAny) {
                                    try { cc.assetManager.loadAny({ uuid }, () => {}); } catch (e) {}
                                }
                                continue;
                            }
                        }
                        arr.push(itemVal);
                    }
                    instance[k] = arr;
                    continue;
                }
            }

            if (desc && desc.set) {
                if (skipSetters) {
                    const backingKey = '_' + k;
                    if (backingKey in instance || instance.hasOwnProperty(backingKey)) {
                        try { instance[backingKey] = val; } catch (e) {}
                    }
                    continue;
                }

                if (prevValues && k in prevValues && _isValEqual(prevValues[k], val)) {
                    const backingKey = '_' + k;
                    if (backingKey in instance || instance.hasOwnProperty(backingKey)) {
                        try { instance[backingKey] = val; } catch (e) {}
                    }
                    continue;
                }
            }

            instance[k] = val;
        } catch (e) {}
    }
}

function _getComponentDumpByName(className, currentValues) {
    const ctor = cc.js.getClassByName(className);
    if (!ctor) {
        console.error(`[pTS-Core] Class not found: ${className}`);
        return null;
    }
    _toDumperData(ctor);

    const instance = new ctor();
    if (currentValues && typeof currentValues === 'object') {
        _populateInstance(instance, currentValues);
    }
    try {
        if (typeof instance.onFocusInEditor === 'function') {
            instance.onFocusInEditor();
        }
    } catch (err) {
        console.error(`[pTS-Core] Error in onFocusInEditor for ${className}:`, err);
    }

    const n = {
        type: className,
        default: null,
        visible: true,
        readonly: false,
        ctor
    };

    const isAsset = cc.js.isChildClassOf(ctor, cc.Asset) && ctor !== cc.Asset;
    let originalProto = null;
    if (isAsset && ctor.prototype) {
        originalProto = Object.getPrototypeOf(ctor.prototype);
        Object.setPrototypeOf(ctor.prototype, cc.Object.prototype);
    }

    // Stash dummy asset objects ({ _uuid, uuid }) so cce.Dump.encode doesn't produce 'Unknown'
    const stashedAssets = {};
    for (const k of Object.keys(instance)) {
        const v = instance[k];
        if (v && typeof v === 'object' && !(v instanceof cc.Object) && (v._uuid || v.uuid)) {
            stashedAssets[k] = v;
            instance[k] = null;
        } else if (Array.isArray(v)) {
            for (let i = 0; i < v.length; i++) {
                const item = v[i];
                if (item && typeof item === 'object' && !(item instanceof cc.Object) && (item._uuid || item.uuid)) {
                    stashedAssets[`${k}.${i}`] = item;
                    v[i] = null;
                }
            }
        }
    }

    try {
        const dump = cce.Dump.encode.encodeObject(instance, n, null, className, false);

        // Restore stashed dummy assets
        for (const [pathStr, item] of Object.entries(stashedAssets)) {
            if (pathStr.includes('.')) {
                const [k, idxStr] = pathStr.split('.');
                const idx = Number(idxStr);
                if (instance[k]) instance[k][idx] = item;
                const u = item._uuid || item.uuid;
                if (dump && dump.value && dump.value[k] && Array.isArray(dump.value[k].value) && dump.value[k].value[idx]) {
                    dump.value[k].value[idx].value = { uuid: u };
                }
            } else {
                instance[pathStr] = item;
                const u = item._uuid || item.uuid;
                if (dump && dump.value && dump.value[pathStr]) {
                    dump.value[pathStr].value = { uuid: u };
                }
            }
        }

        if (dump && dump.value) {
            _applyInstanceAttrsToDump(instance, dump, className);
            _recoverUnknownDumpTypes(instance, dump, className, currentValues);
            _translateDump(dump.value, '');

            const gettersInfo = _getGettersOfClass(ctor);
            dump.__getters__ = gettersInfo;
            for (const g in gettersInfo) {
                if (dump.value[g] && gettersInfo[g].readonly) {
                    dump.value[g].readonly = true;
                }
            }
        }

        if (instance instanceof cc.Object && typeof instance.destroy === 'function' && (instance['node'] instanceof cc.Node)) {
            instance.destroy();
        }

        return dump;
    } catch (err) {
        console.error(`[pTS-Core] Failed to dump ${className}:`, err);
        return null;
    } finally {
        if (isAsset && originalProto && ctor.prototype) {
            Object.setPrototypeOf(ctor.prototype, originalProto);
        }
    }
}

let _lastEvaluatedValues = {};

function _evaluatePtsLive(className, currentValues) {
    if (isPreviewModeRunning()) {
        return { isRuntime: true, error: 'Preview/Runtime mode is active' };
    }

    const ctor = cc.js.getClassByName(className);
    if (!ctor) {
        return { error: `Class ${className} not found` };
    }

    const instance = new ctor();
    if (currentValues && typeof currentValues === 'object') {
        _populateInstance(instance, currentValues, null, true);
    }
    _lastEvaluatedValues[className] = JSON.parse(JSON.stringify(currentValues || {}));

    try {
        if (typeof instance.onFocusInEditor === 'function') {
            instance.onFocusInEditor();
        }
    } catch (err) {
        console.error(`[pTS-Core] Error in onFocusInEditor for ${className}:`, err);
    }

    const gettersInfo = _getGettersOfClass(ctor);
    const gettersValues = {};
    for (const p in gettersInfo) {
        try {
            gettersValues[p] = instance[p];
        } catch (e) {
            console.warn(`[pTS-Core] Error evaluating getter ${p}:`, e);
        }
    }

    const attrs = cc.Class.Attr.getClassAttrs(ctor);
    const visibility = {};
    const props = ctor.__props__ || [];
    for (const p of props) {
        const visKey = `${p}${cc.Class.Attr.DELIMETER}visible`;
        const visFn = attrs[visKey];
        if (typeof visFn === 'function') {
            try {
                visibility[p] = !!visFn.call(instance);
            } catch (e) {
                visibility[p] = true;
            }
        } else if (typeof visFn === 'boolean') {
            visibility[p] = visFn;
        } else {
            visibility[p] = true;
        }
    }

    const del = cc.Class.Attr.DELIMETER || '$_$';
    const enumLists = {};
    if (instance.__instance_attrs__) {
        for (const [attrKey, attrVal] of Object.entries(instance.__instance_attrs__)) {
            const [p, a] = attrKey.split(del);
            if (a === 'enumList') {
                enumLists[p] = attrVal;
            }
        }
    }

    const arrayVisibility = {};
    const arrayGetters = {};
    if (currentValues && typeof currentValues === 'object') {
        for (const k in currentValues) {
            const arr = currentValues[k];
            if (Array.isArray(arr) && arr.length > 0) {
                const sample = arr[0];
                const itemTypeName = sample && typeof sample === 'object' ? sample.__type__ : null;
                const itemCtor = itemTypeName ? cc.js.getClassByName(itemTypeName) : null;
                if (itemCtor) {
                    const itemAttrs = cc.Class.Attr.getClassAttrs(itemCtor);
                    const itemGettersInfo = _getGettersOfClass(itemCtor);
                    const itemProps = itemCtor.__props__ || [];

                    arrayVisibility[k] = [];
                    arrayGetters[k] = [];

                    for (let i = 0; i < arr.length; i++) {
                        const rawItem = arr[i];
                        const itemInst = new itemCtor();
                        _populateInstance(itemInst, rawItem?.__value__ || rawItem, null, true);
                        try {
                            if (typeof itemInst.onFocusInEditor === 'function') {
                                itemInst.onFocusInEditor();
                            }
                        } catch (err) {}

                        const itemVis = {};
                        for (const ip of itemProps) {
                            const ivKey = `${ip}${cc.Class.Attr.DELIMETER}visible`;
                            const ivFn = itemAttrs[ivKey];
                            if (typeof ivFn === 'function') {
                                try {
                                    itemVis[ip] = !!ivFn.call(itemInst);
                                } catch (e) {
                                    itemVis[ip] = true;
                                }
                            } else if (typeof ivFn === 'boolean') {
                                itemVis[ip] = ivFn;
                            } else {
                                itemVis[ip] = true;
                            }
                        }
                        arrayVisibility[k].push(itemVis);

                        const itemGetVal = {};
                        for (const gp in itemGettersInfo) {
                            try {
                                itemGetVal[gp] = itemInst[gp];
                            } catch (e) {}
                        }
                        arrayGetters[k].push(itemGetVal);
                    }
                }
            }
        }
    }

    const cachedEnumLists = _cachedInstanceAttrs[className] || {};
    const finalEnumLists = Object.assign({}, cachedEnumLists);
    for (const [k, v] of Object.entries(enumLists)) {
        if (v && Object.keys(v).length > 0) {
            finalEnumLists[k] = v;
        }
    }

    return {
        getters: gettersValues,
        gettersInfo: gettersInfo,
        visibility: visibility,
        arrayVisibility: arrayVisibility,
        arrayGetters: arrayGetters,
        enumLists: finalEnumLists
    };
}

// ─── Helpers: Live Runtime Inspector Sync ───

function isPreviewModeRunning() {
    try {
        if (typeof globalThis !== 'undefined' && typeof globalThis.__pTS_IS_PREVIEW__ === 'boolean') {
            if (globalThis.__pTS_IS_PREVIEW__) return true;
        }
    } catch {}

    try {
        if (typeof cce !== 'undefined') {
            if (cce.Engine && (cce.Engine.isPlaying || cce.Engine.isPlayMode)) return true;
            if (cce.PlayMode && (cce.PlayMode.isPlaying || cce.PlayMode.isPlayMode)) return true;
        }
    } catch {}

    return false;
}

function getLiveInstance(uuid, className) {
    if (!uuid) return null;

    // 1. Check dedicated live map registered by pTSAsset / Json.Register
    try {
        if (globalThis['__pTS_LIVE_ASSETS__'] && typeof globalThis['__pTS_LIVE_ASSETS__'].get === 'function') {
            const inst = globalThis['__pTS_LIVE_ASSETS__'].get(uuid);
            if (inst) return inst;
        }
    } catch {}

    // 2. Check cc.assetManager.assets
    try {
        if (typeof cc !== 'undefined' && cc.assetManager && cc.assetManager.assets) {
            let inst = cc.assetManager.assets.get(uuid);
            if (inst) return inst;
            const utils = cc.assetManager.utils;
            if (utils) {
                if (typeof utils.decodeUuid === 'function') {
                    inst = cc.assetManager.assets.get(utils.decodeUuid(uuid));
                    if (inst) return inst;
                }
                if (typeof utils.compressUuid === 'function') {
                    inst = cc.assetManager.assets.get(utils.compressUuid(uuid));
                    if (inst) return inst;
                }
            }
        }
    } catch {}

    // 3. Check globalThis._$pTSAssets
    try {
        if (globalThis['_$pTSAssets']) {
            if (className && globalThis['_$pTSAssets'][className] && globalThis['_$pTSAssets'][className][uuid]) {
                return globalThis['_$pTSAssets'][className][uuid];
            }
            for (const cName in globalThis['_$pTSAssets']) {
                if (globalThis['_$pTSAssets'][cName] && globalThis['_$pTSAssets'][cName][uuid]) {
                    return globalThis['_$pTSAssets'][cName][uuid];
                }
            }
        }
    } catch {}

    // 4. Crawl active scene for pTSAsset_Register or node components referencing this asset
    try {
        if (typeof cc !== 'undefined' && cc.director) {
            const scene = cc.director.getScene();
            if (scene) {
                const search = (node) => {
                    if (!node) return null;
                    if (node.components) {
                        for (let i = 0; i < node.components.length; i++) {
                            const comp = node.components[i];
                            if (!comp) continue;
                            if (Array.isArray(comp.assets)) {
                                for (let j = 0; j < comp.assets.length; j++) {
                                    const a = comp.assets[j];
                                    if (a && (a._uuid === uuid || a.uuid === uuid)) return a;
                                }
                            }
                        }
                    }
                    if (node.children) {
                        for (let i = 0; i < node.children.length; i++) {
                            const found = search(node.children[i]);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                const found = search(scene);
                if (found) return found;
            }
        }
    } catch {}

    return null;
}

function _dumpLiveInstance(instance, className) {
    if (instance && typeof instance.onFocusInEditor === 'function') {
        try {
            instance.onFocusInEditor();
        } catch (err) {
            console.error(`[pTS-Core] Error in onFocusInEditor for live instance:`, err);
        }
    }
    const ctor = instance.constructor || (className ? cc.js.getClassByName(className) : null);
    if (!ctor) return null;
    _toDumperData(ctor);

    const typeName = className || (cc.js.getClassName(ctor) || ctor.name);
    const n = {
        type: typeName,
        default: null,
        visible: true,
        readonly: false,
        ctor
    };

    const isAsset = cc.js.isChildClassOf(ctor, cc.Asset) && ctor !== cc.Asset;
    let originalProto = null;
    if (isAsset && ctor.prototype) {
        originalProto = Object.getPrototypeOf(ctor.prototype);
        Object.setPrototypeOf(ctor.prototype, cc.Object.prototype);
    }

    // Stash dummy asset objects ({ _uuid, uuid }) so cce.Dump.encode doesn't produce 'Unknown'
    const stashedAssets = {};
    for (const k of Object.keys(instance)) {
        const v = instance[k];
        if (v && typeof v === 'object' && !(v instanceof cc.Object) && (v._uuid || v.uuid)) {
            stashedAssets[k] = v;
            instance[k] = null;
        } else if (Array.isArray(v)) {
            for (let i = 0; i < v.length; i++) {
                const item = v[i];
                if (item && typeof item === 'object' && !(item instanceof cc.Object) && (item._uuid || item.uuid)) {
                    stashedAssets[`${k}.${i}`] = item;
                    v[i] = null;
                }
            }
        }
    }

    try {
        const dump = cce.Dump.encode.encodeObject(instance, n, null, typeName, false);

        // Restore stashed dummy assets
        for (const [pathStr, item] of Object.entries(stashedAssets)) {
            if (pathStr.includes('.')) {
                const [k, idxStr] = pathStr.split('.');
                const idx = Number(idxStr);
                if (instance[k]) instance[k][idx] = item;
                const u = item._uuid || item.uuid;
                if (dump && dump.value && dump.value[k] && Array.isArray(dump.value[k].value) && dump.value[k].value[idx]) {
                    dump.value[k].value[idx].value = { uuid: u };
                }
            } else {
                instance[pathStr] = item;
                const u = item._uuid || item.uuid;
                if (dump && dump.value && dump.value[pathStr]) {
                    dump.value[pathStr].value = { uuid: u };
                }
            }
        }

        if (dump && dump.value) {
            _applyInstanceAttrsToDump(instance, dump, typeName);
            _recoverUnknownDumpTypes(instance, dump, typeName, instance);
            _translateDump(dump.value, '');
        }
        return dump;
    } catch (err) {
        console.error(`[pTS-Core] Failed to dump live instance ${typeName}:`, err);
        return null;
    } finally {
        if (isAsset && originalProto && ctor.prototype) {
            Object.setPrototypeOf(ctor.prototype, originalProto);
        }
    }
}

function _extractLiveValues(instance, className) {
    const ctor = instance.constructor || (className ? cc.js.getClassByName(className) : null);
    const props = ctor ? _getCCProps(ctor) : [];
    const values = {};
    for (const p of props) {
        try {
            values[p] = instance[p];
        } catch {}
    }
    for (const k of Object.keys(instance)) {
        if (!k.startsWith('_') && !(k in values)) {
            try {
                values[k] = instance[k];
            } catch {}
        }
    }
    return values;
}

// ─── Helpers: Deep Property Mutator ───

async function resolveAssetValue(val, expectedType) {
    if (val === null || val === undefined) return null;
    if (val instanceof cc.Asset) return val;

    let uuid = '';
    if (typeof val === 'string') {
        uuid = val;
    } else if (typeof val === 'object') {
        if (val.__uuid__) uuid = val.__uuid__;
        else if (val.uuid) uuid = val.uuid;
    }

    if (!uuid) return val;

    return new Promise((resolve) => {
        try {
            cc.assetManager.loadAny({ uuid: uuid }, (err, asset) => {
                if (!err && asset) {
                    resolve(asset);
                } else {
                    const expectedName = expectedType ? (cc.js.getClassName(expectedType) || expectedType.name || expectedType) : undefined;
                    resolve({ __uuid__: uuid, __expectedType__: expectedName });
                }
            });
        } catch (e) {
            resolve({ __uuid__: uuid });
        }
    });
}

async function setDeepProperty(target, pathStr, value) {
    if (!target) return false;

    const parts = pathStr.split('.');
    let current = target;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        let next = current[part];

        if (next === null || next === undefined) {
            const attrsInfo = getCCClassAttrs(current);
            const propAttr = attrsInfo.attributes ? attrsInfo.attributes[part] : null;

            if (propAttr && propAttr.ctor && typeof propAttr.ctor === 'function') {
                current[part] = new propAttr.ctor();
            } else if (propAttr && propAttr.type && typeof propAttr.type === 'function') {
                current[part] = new propAttr.type();
            } else if (!isNaN(Number(parts[i + 1]))) {
                current[part] = [];
            } else {
                current[part] = {};
            }
            next = current[part];
        }
        current = next;
    }

    const lastPart = parts[parts.length - 1];
    const targetAttrsInfo = getCCClassAttrs(current);
    const lastAttr = targetAttrsInfo.attributes ? targetAttrsInfo.attributes[lastPart] : null;

    if (lastAttr) {
        const attrCtor = lastAttr.ctor || (typeof lastAttr.type === 'function' ? lastAttr.type : null);
        const attrType = lastAttr.type;
        const isAssetType = (
            (attrCtor && cc.js.isChildClassOf(attrCtor, cc.Asset)) ||
            attrCtor === cc.Asset ||
            attrCtor === cc.JsonAsset ||
            attrType === cc.Asset ||
            attrType === cc.JsonAsset ||
            attrType === cc.SpriteFrame ||
            attrType === cc.Texture2D ||
            attrType === cc.Material ||
            attrType === cc.AudioClip ||
            attrType === cc.Prefab ||
            (typeof value === 'string' && (value.includes('-') || value.includes('@'))) ||
            (value && (value.__uuid__ || value.uuid))
        );

        if (Array.isArray(value)) {
            const isArrayOfAssets = Array.isArray(attrType) && (
                cc.js.isChildClassOf(attrType[0], cc.Asset) ||
                attrType[0] === cc.Asset ||
                attrType[0] === cc.JsonAsset
            );

            if (isArrayOfAssets || isAssetType) {
                const resolvedArray = [];
                for (const item of value) {
                    const resolved = await resolveAssetValue(item, attrCtor || attrType);
                    resolvedArray.push(resolved);
                }
                current[lastPart] = resolvedArray;
                return true;
            }
        } else if (isAssetType && (typeof value === 'string' || (value && value.__uuid__))) {
            current[lastPart] = await resolveAssetValue(value, attrCtor || attrType);
            return true;
        }
    }

    if (Array.isArray(value)) {
        current[lastPart] = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && typeof current[lastPart] === 'object' && current[lastPart] !== null) {
        for (const [k, v] of Object.entries(value)) {
            await setDeepProperty(current[lastPart], k, v);
        }
    } else {
        current[lastPart] = value;
    }

    return true;
}

// ─── Live Preview State Snapshot & Broadcast ───

function createLiveSnapshot() {
    const snapshot = {};
    
    // 1. Scan globalThis._$pTSAssets (grouped by name -> by uuid -> instance)
    try {
        const pTSAssets = globalThis['_$pTSAssets'];
        if (pTSAssets && typeof pTSAssets === 'object') {
            for (const name of Object.keys(pTSAssets)) {
                const byUuid = pTSAssets[name];
                if (byUuid && typeof byUuid === 'object') {
                    for (const uuid of Object.keys(byUuid)) {
                        const inst = byUuid[uuid];
                        if (inst) {
                            const vals = _extractLiveValues(inst);
                            snapshot[uuid] = {
                                uuid: uuid,
                                name: name,
                                values: vals
                            };
                            if (!snapshot[name]) {
                                snapshot[name] = snapshot[uuid];
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {}

    // 2. Scan __pTS_LIVE_ASSETS__ Map
    try {
        const liveMap = globalThis['__pTS_LIVE_ASSETS__'];
        if (liveMap && typeof liveMap.forEach === 'function') {
            liveMap.forEach((inst, uuid) => {
                if (inst && !snapshot[uuid]) {
                    const vals = _extractLiveValues(inst);
                    const name = inst.name || (inst.constructor ? inst.constructor.name : '');
                    snapshot[uuid] = {
                        uuid: uuid,
                        name: name,
                        values: vals
                    };
                    if (name && !snapshot[name]) {
                        snapshot[name] = snapshot[uuid];
                    }
                }
            });
        }
    } catch (e) {}

    return snapshot;
}

function isChildOfPtsAsset(cls, baseCtor) {
    if (!cls || typeof cls !== 'function') return false;
    if (cls === baseCtor) return true;
    try {
        if (cc.js.isChildClassOf(cls, baseCtor)) return true;
    } catch {}
    let cur = cls;
    while (cur && cur !== Object && cur !== Function) {
        try {
            const superCtor = cc.js.getSuper(cur);
            if (!superCtor || superCtor === Object || superCtor === Function) break;
            if (superCtor === baseCtor) return true;
            const superName = cc.js.getClassName(superCtor) || superCtor.name;
            if (superName === 'pTSAsset' || superName === 'pTSAsset_Data') return true;
            cur = superCtor;
        } catch {
            break;
        }
    }
    return false;
}

let _previewSyncInterval = null;

// ─── Lifecycle Exports ───

exports.load = function() {
    const isPreview = Boolean(typeof window !== 'undefined' && window.isPreviewProcess);
    console.log('[pTS-Core] Scene script loaded, isPreviewProcess:', isPreview);

    if (isPreview) {
        console.log('[pTS-Core] Initializing live preview sync ticker in [PreviewInEditor]...');
        if (_previewSyncInterval) clearInterval(_previewSyncInterval);
        _previewSyncInterval = setInterval(() => {
            try {
                const snapshot = createLiveSnapshot();
                if (typeof Editor !== 'undefined' && Editor.Message && typeof Editor.Message.send === 'function') {
                    Editor.Message.send('pts-asset', 'sync-preview-data', snapshot);
                }
            } catch (e) {}
        }, 300);
    }
};

exports.unload = function() {
    console.log('[pTS-Core] Scene script unloaded');
    if (_previewSyncInterval) {
        clearInterval(_previewSyncInterval);
        _previewSyncInterval = null;
    }
};

// ─── Method Registry ───

exports.methods = {
    log(...args) {
        cc.log('[pTS-Core:_cc]', ...args);
        return { success: true };
    },

    cc(what) {
        const _val = cc[what];
        console.log(`_cc.${what} =`, _val);
        return _val;
    },

    info(what) {
        const _val = cc[what] || cc.js.getClassByName(what);
        if (!_val || typeof _val !== 'function') {
            console.warn(`[pTS-Core] info(${what}) is not a valid class or constructor`);
            return null;
        }
        return _getCCPropsInfo(_val);
    },

    dump(what, currentValues) {
        return _getComponentDumpByName(what, currentValues);
    },

    evaluate_pts_live(className, currentValues) {
        return _evaluatePtsLive(className, currentValues);
    },

    on_pts_property_changed(className, currentValues, propPath, newValue) {
        const ctor = cc.js.getClassByName(className);
        if (!ctor) {
            return { success: false, error: `Class ${className} not found` };
        }

        // 1. Instantiate and populate initial state (skipping setters)
        const instance = new ctor();
        if (currentValues && typeof currentValues === 'object') {
            _populateInstance(instance, currentValues, null, true);
        }

        // 2. Navigate along propPath and apply the property change (calling the setter!)
        const parts = String(propPath).split('.');
        let target = instance;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (target && target[part] !== undefined) {
                target = target[part];
            }
        }
        const propName = parts[parts.length - 1];

        try {
            if (target) {
                if (Array.isArray(target) && !isNaN(Number(propName))) {
                    const idx = Number(propName);
                    let valToAssign = newValue;
                    let u = '';
                    if (typeof newValue === 'string' && (newValue.includes('-') || newValue.includes('@'))) {
                        u = newValue;
                    } else if (newValue && typeof newValue === 'object' && (newValue.uuid || newValue._uuid || newValue.__value__?.uuid || newValue.__value__?._uuid)) {
                        u = newValue._uuid || newValue.uuid || newValue.__value__?._uuid || newValue.__value__?.uuid;
                    }
                    if (u) {
                        const asset = (cc.assetManager && cc.assetManager.assets) ? cc.assetManager.assets.get(u) : null;
                        valToAssign = asset || { _uuid: u, uuid: u };
                        if (!asset && cc.assetManager && cc.assetManager.loadAny) {
                            try { cc.assetManager.loadAny({ uuid: u }, () => {}); } catch (e) {}
                        }
                    }
                    target[idx] = valToAssign;
                } else if (parts.length === 1 && Array.isArray(newValue)) {
                    // Array property was already populated with proper CCClass or Asset instances
                    // by _populateInstance(instance, currentValues). Only invoke setter if defined.
                    const desc = _findPropertyDescriptor(instance, propName);
                    if (desc && typeof desc.set === 'function') {
                        try {
                            target[propName] = instance[propName];
                        } catch (e) {}
                    }
                } else {
                    target[propName] = newValue;
                }
            }
        } catch (setErr) {
            console.error(`[pTS-Core] Error applying setter for ${propPath}:`, setErr);
        }

        // 3. Ensure backing field '_' + propName is synced if present
        const backingKey = '_' + propName;
        if (target && (backingKey in target || target.hasOwnProperty(backingKey))) {
            try {
                if (target[backingKey] === undefined || target[backingKey] === null || target[backingKey] === '') {
                    target[backingKey] = newValue;
                }
            } catch (e) {}
        }

        // 4. Serialize the updated instance (including backing fields like _bundle)
        const updatedValues = _serializeInstance(instance);

        // 5. Generate updated dump
        const updatedDump = _dumpLiveInstance(instance, className);

        // 6. Extract dynamic instance attributes (enumLists)
        const enumLists = _extractInstanceAttrs(instance);
        _cachedInstanceAttrs[className] = enumLists;

        // 7. Extract dynamic getters & visibility
        const evalResult = _evaluatePtsLive(className, updatedValues);

        return {
            success: true,
            values: updatedValues,
            dump: updatedDump,
            enumLists: Object.assign({}, evalResult.enumLists || {}, enumLists),
            visibility: evalResult.visibility,
            arrayVisibility: evalResult.arrayVisibility,
            getters: evalResult.getters,
            arrayGetters: evalResult.arrayGetters
        };
    },

    on_pts_focus(className, currentValues, uuid) {
        let instance = null;
        if (uuid) {
            instance = getLiveInstance(uuid, className);
        }
        if (!instance && className) {
            const ctor = cc.js.getClassByName(className);
            if (ctor) {
                instance = new ctor();
                if (currentValues && typeof currentValues === 'object') {
                    _populateInstance(instance, currentValues);
                }
            }
        }
        if (instance && typeof instance.onFocusInEditor === 'function') {
            try {
                instance.onFocusInEditor();
                return {
                    success: true,
                    focused: true,
                    values: className ? _extractLiveValues(instance, className) : null
                };
            } catch (err) {
                console.error(`[pTS-Core] Error executing onFocusInEditor:`, err);
                return { success: false, error: String(err) };
            }
        }
        return { success: true, focused: false };
    },

    is_preview_mode() {
        return isPreviewModeRunning();
    },

    debug_preview_info() {
        const info = {
            hasGlobalThis: typeof globalThis !== 'undefined',
            pTS_IS_PREVIEW: typeof globalThis !== 'undefined' ? globalThis.__pTS_IS_PREVIEW__ : undefined,
            hasLiveAssetsMap: typeof globalThis !== 'undefined' && !!globalThis['__pTS_LIVE_ASSETS__'],
            liveAssetsCount: (typeof globalThis !== 'undefined' && globalThis['__pTS_LIVE_ASSETS__']?.size) || 0,
            has_pTSAssets: typeof globalThis !== 'undefined' && !!globalThis['_$pTSAssets'],
            _pTSAssetsKeys: typeof globalThis !== 'undefined' && globalThis['_$pTSAssets'] ? Object.keys(globalThis['_$pTSAssets']) : [],
            gamePaused: typeof cc !== 'undefined' && cc.game ? cc.game.isPaused() : undefined,
            game_paused: typeof cc !== 'undefined' && cc.game ? cc.game._paused : undefined,
            sceneName: typeof cc !== 'undefined' && cc.director?.getScene() ? cc.director.getScene().name : undefined,
            isPreviewCalculated: isPreviewModeRunning()
        };
        cc.log('[pTS-Core] debug_preview_info:', JSON.stringify(info));
        return info;
    },

    get_pts_runtime_state(uuid, className) {
        const isPreview = isPreviewModeRunning();
        if (!isPreview) {
            return { isPreview: false };
        }

        const instance = getLiveInstance(uuid, className);
        if (!instance) {
            return { isPreview: true, found: false };
        }

        const dump = _dumpLiveInstance(instance, className);
        const values = _extractLiveValues(instance, className);
        return {
            isPreview: true,
            found: true,
            dump: dump,
            values: values
        };
    },

    props(what) {
        const _val = cc[what] || cc.js.getClassByName(what);
        if (!_val || typeof _val !== 'function') return null;
        const _props = _getCCProps(_val);
        const _new = new _val();

        return _props.reduce((_p, _c) => {
            _p[_c] = _new[_c];
            return _p;
        }, {});
    },

    is_component(what) {
        const _val = cc[what] || cc.js.getClassByName(what);
        if (!_val || typeof _val !== 'function') return false;
        return cc.js.isChildClassOf(_val, cc.Component);
    },

    script(what) {
        const _val = cc[what] || cc.js.getClassByName(what);
        return _val ? cc.js._getClassId(_val) : '';
    },

    get_registered_pts_classes() {
        const baseCtor = cc.js.getClassByName('pTSAsset');
        if (!baseCtor) {
            console.warn('[pTS-Core] pTSAsset not found in cc.js');
            return [];
        }
        const list = ['pTSAsset'];
        const nameMap = cc.js._nameToClass || {};
        for (const name in nameMap) {
            const cls = nameMap[name];
            if (typeof cls === 'function' && cls !== baseCtor && isChildOfPtsAsset(cls, baseCtor)) {
                if (!list.includes(name)) {
                    list.push(name);
                }
            }
        }
        return list.sort();
    },

    get_class_inheritance_chain(className) {
        const ctor = cc.js.getClassByName(className) || cc[className];
        if (!ctor || typeof ctor !== 'function') {
            return ['cc.Object', 'Eventified', 'cc.Asset', 'Asset', 'pTSAsset', className];
        }
        const getChain = (cc.Class && cc.Class.getInheritanceChain) || (cc.CCClass && cc.CCClass.getInheritanceChain);
        const chain = [];
        if (typeof getChain === 'function') {
            try {
                const raw = getChain(ctor) || [];
                for (const item of raw) {
                    const name = typeof item === 'string' ? item : (cc.js.getClassName(item) || item.name);
                    if (name && !chain.includes(name)) {
                        chain.push(name);
                    }
                }
                chain.reverse();
            } catch {}
        }
        if (chain.length === 0) {
            chain.push(className);
            let cur = ctor;
            while (cur) {
                const superCtor = cc.js.getSuper(cur);
                if (!superCtor || superCtor === Object || superCtor === Function) break;
                const superName = cc.js.getClassName(superCtor) || superCtor.name;
                if (superName && !chain.includes(superName)) {
                    chain.unshift(superName);
                }
                cur = superCtor;
            }
        }
        if (!chain.includes('pTSAsset')) chain.unshift('pTSAsset');
        if (!chain.includes('Asset')) chain.unshift('Asset');
        if (!chain.includes('cc.Asset')) chain.unshift('cc.Asset');
        if (!chain.includes('Eventified')) chain.unshift('Eventified');
        if (!chain.includes('cc.Object')) chain.unshift('cc.Object');
        return Array.from(new Set(chain));
    },

    get_all_pts_inheritance_chains() {
        const baseCtor = cc.js.getClassByName('pTSAsset');
        if (!baseCtor) return {};
        const map = {};
        const nameMap = cc.js._nameToClass || {};
        const getChain = (cc.Class && cc.Class.getInheritanceChain) || (cc.CCClass && cc.CCClass.getInheritanceChain);

        for (const name in nameMap) {
            const cls = nameMap[name];
            if (typeof cls === 'function' && (cls === baseCtor || isChildOfPtsAsset(cls, baseCtor))) {
                let chain = [];
                if (typeof getChain === 'function') {
                    try {
                        const raw = getChain(cls) || [];
                        for (const item of raw) {
                            const n = typeof item === 'string' ? item : (cc.js.getClassName(item) || item.name);
                            if (n && !chain.includes(n)) chain.push(n);
                        }
                        chain.reverse();
                    } catch {}
                }
                if (chain.length === 0) {
                    chain = [name];
                    let cur = cls;
                    while (cur) {
                        const superCtor = cc.js.getSuper(cur);
                        if (!superCtor || superCtor === Object || superCtor === Function) break;
                        const superName = cc.js.getClassName(superCtor) || superCtor.name;
                        if (superName && !chain.includes(superName)) {
                            chain.unshift(superName);
                        }
                        cur = superCtor;
                    }
                }
                if (!chain.includes('pTSAsset')) chain.unshift('pTSAsset');
                if (!chain.includes('Asset')) chain.unshift('Asset');
                if (!chain.includes('cc.Asset')) chain.unshift('cc.Asset');
                if (!chain.includes('Eventified')) chain.unshift('Eventified');
                if (!chain.includes('cc.Object')) chain.unshift('cc.Object');
                map[name] = Array.from(new Set(chain));
            }
        }
        return map;
    },

    getClassInfo(className) {
        try {
            const ctor = cc[className] || cc.js.getClassByName(className);
            if (!ctor || typeof ctor !== 'function') {
                return { success: false, error: 'Class not found: ' + className };
            }
            const info = getCCClassAttrs(ctor);
            return { success: true, data: info };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    getComponentInfo(nodeUuid, componentType) {
        try {
            const node = findNodeByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: 'Node not found: ' + nodeUuid };
            }
            const comp = findComponent(node, componentType);
            if (!comp) {
                return { success: false, error: 'Component not found: ' + componentType };
            }
            const classInfo = getCCClassAttrs(comp.constructor);
            const props = {};
            for (const p of classInfo.props) {
                props[p] = comp[p];
            }
            return {
                success: true,
                data: {
                    className: classInfo.className,
                    enabled: comp.enabled,
                    props: props,
                    attributes: classInfo.attributes
                }
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async updateComponent(nodeUuid, componentType, properties) {
        try {
            const node = findNodeByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: 'Node not found: ' + nodeUuid };
            }

            let comp = findComponent(node, componentType);
            if (!comp) {
                const ctor = cc.js.getClassByName(componentType);
                if (ctor) {
                    comp = node.addComponent(ctor);
                } else {
                    return { success: false, error: 'Component ' + componentType + ' not found on node and cannot be added' };
                }
            }

            const updatedKeys = [];
            for (const [propPath, val] of Object.entries(properties)) {
                await setDeepProperty(comp, propPath, val);
                updatedKeys.push(propPath);
            }

            try {
                if (typeof cce !== 'undefined' && cce.Node) {
                    cce.Node.emit('change', node);
                }
                if (typeof Editor !== 'undefined' && Editor.Message) {
                    Editor.Message.send('scene', 'snapshot');
                }
            } catch (notifyErr) {
                console.warn('[pTS-Core] Notification error:', notifyErr);
            }

            return {
                success: true,
                message: 'Successfully updated ' + updatedKeys.length + ' properties on ' + (comp.constructor.name || componentType),
                data: {
                    nodeUuid: node.uuid || node._id,
                    componentType: comp.constructor.name || componentType,
                    updatedProperties: updatedKeys
                }
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    setNodeProperty(nodeUuid, path, value) {
        try {
            const node = findNodeByUuid(nodeUuid);
            if (!node) return { success: false, error: 'Node not found: ' + nodeUuid };

            if (path === 'active') node.active = value;
            else if (path === 'name') node.name = value;
            else if (path === 'position') node.setPosition(value.x || 0, value.y || 0, value.z || 0);
            else if (path === 'rotation') node.setRotationFromEuler(value.x || 0, value.y || 0, value.z || 0);
            else if (path === 'scale') node.setScale(value.x || 1, value.y || 1, value.z || 1);
            else node[path] = value;

            return { success: true, message: 'Node property ' + path + ' updated' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    addComponentToNode(nodeUuid, componentType) {
        try {
            const node = findNodeByUuid(nodeUuid);
            if (!node) return { success: false, error: 'Node not found: ' + nodeUuid };

            const ctor = cc.js.getClassByName(componentType);
            if (!ctor) return { success: false, error: 'Component class not found: ' + componentType };

            const comp = node.addComponent(ctor);
            return { success: true, data: { uuid: comp.uuid, componentType } };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
};
