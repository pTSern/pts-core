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

// ─── RealCurve Support Helpers ──────────────────────────────
function _isRealCurve(val) {
    if (!val || typeof val !== 'object') return false;
    if (typeof cc !== 'undefined' && cc.RealCurve && val instanceof cc.RealCurve) return true;
    const ctor = val.constructor;
    if (!ctor) return false;
    const ctorName = (typeof cc !== 'undefined' && cc.js && cc.js.getClassName(ctor)) || ctor.name;
    return ctorName === 'cc.RealCurve' || ctorName === 'RealCurve';
}

function _isRealCurveProp(ctor, propName) {
    if (!ctor) return false;
    try {
        const attr = typeof cc !== 'undefined' && cc.Class && cc.Class.attr(ctor, propName);
        if (!attr) return false;
        if (typeof cc !== 'undefined' && cc.RealCurve && (attr.type === cc.RealCurve || attr.ctor === cc.RealCurve)) return true;
        const typeName = attr.type ? ((cc?.js?.getClassName && cc.js.getClassName(attr.type)) || attr.type.name) : '';
        if (typeName === 'cc.RealCurve' || typeName === 'RealCurve') return true;
    } catch {}
    return false;
}

function _ensureRealCurveDefaultKeyframes(curve) {
    if (!_isRealCurve(curve)) return;
    const count = typeof curve.keyFramesCount === 'number'
        ? curve.keyFramesCount
        : (typeof curve.keyframes === 'function' ? [...curve.keyframes()].length : 0);
    if (count === 0 && typeof curve.assignSorted === 'function') {
        curve.assignSorted([
            [0, {
                value: 0,
                leftTangent: 1,
                rightTangent: 1,
                interpolationMode: 0,
                tangentWeightMode: 0,
                leftTangentWeight: 1,
                rightTangentWeight: 1
            }],
            [1, {
                value: 1,
                leftTangent: 1,
                rightTangent: 1,
                interpolationMode: 0,
                tangentWeightMode: 0,
                leftTangentWeight: 1,
                rightTangentWeight: 1
            }]
        ]);
    }
    if (curve.preExtrapolation === undefined) curve.preExtrapolation = 1;
    if (curve.postExtrapolation === undefined) curve.postExtrapolation = 1;
}

function _decodeCurveValue(curve, data) {
    if (!_isRealCurve(curve)) {
        if (typeof cc !== 'undefined' && cc.RealCurve) {
            curve = new cc.RealCurve();
        } else {
            return curve;
        }
    }
    if (!data || typeof data !== 'object') {
        _ensureRealCurveDefaultKeyframes(curve);
        return curve;
    }

    const raw = (data && typeof data === 'object' && '__value__' in data) ? data.__value__ : data;
    if (!raw || typeof raw !== 'object') {
        _ensureRealCurveDefaultKeyframes(curve);
        return curve;
    }

    const keyFramesSource = raw.keyFrames || raw.keys || null;

    if (Array.isArray(keyFramesSource) && keyFramesSource.length > 0) {
        const sortedFrames = keyFramesSource.map(kf => {
            const time = typeof kf.time === 'number' ? kf.time : (kf.point && typeof kf.point.x === 'number' ? kf.point.x : 0);
            const value = typeof kf.value === 'number' ? kf.value : (kf.point && typeof kf.point.y === 'number' ? kf.point.y : 0);
            const leftTangent = typeof kf.leftTangent === 'number' ? kf.leftTangent : (typeof kf.inTangent === 'number' ? kf.inTangent : 0);
            const rightTangent = typeof kf.rightTangent === 'number' ? kf.rightTangent : (typeof kf.outTangent === 'number' ? kf.outTangent : 0);
            const leftTangentWeight = typeof kf.leftTangentWeight === 'number' ? kf.leftTangentWeight : (typeof kf.inTangentWeight === 'number' ? kf.inTangentWeight : 1);
            const rightTangentWeight = typeof kf.rightTangentWeight === 'number' ? kf.rightTangentWeight : (typeof kf.outTangentWeight === 'number' ? kf.outTangentWeight : 1);
            const interpolationMode = typeof kf.interpolationMode === 'number' ? kf.interpolationMode : (typeof kf.interpMode === 'number' ? kf.interpMode : 0);
            const tangentWeightMode = typeof kf.tangentWeightMode === 'number' ? kf.tangentWeightMode : 0;

            return [time, {
                value,
                leftTangent,
                rightTangent,
                interpolationMode,
                tangentWeightMode,
                leftTangentWeight,
                rightTangentWeight
            }];
        });

        sortedFrames.sort((a, b) => a[0] - b[0]);
        if (typeof curve.assignSorted === 'function') {
            curve.assignSorted(sortedFrames);
        }
    } else if (Array.isArray(raw._times) && Array.isArray(raw._values) && raw._times.length > 0) {
        const sortedFrames = [];
        for (let i = 0; i < raw._times.length; i++) {
            const time = raw._times[i];
            const v = raw._values[i] || {};
            sortedFrames.push([time, {
                value: typeof v.value === 'number' ? v.value : 0,
                leftTangent: typeof v.leftTangent === 'number' ? v.leftTangent : (typeof v.inTangent === 'number' ? v.inTangent : 0),
                rightTangent: typeof v.rightTangent === 'number' ? v.rightTangent : (typeof v.outTangent === 'number' ? v.outTangent : 0),
                leftTangentWeight: typeof v.leftTangentWeight === 'number' ? v.leftTangentWeight : (typeof v.inTangentWeight === 'number' ? v.inTangentWeight : 1),
                rightTangentWeight: typeof v.rightTangentWeight === 'number' ? v.rightTangentWeight : (typeof v.outTangentWeight === 'number' ? v.outTangentWeight : 1),
                interpolationMode: typeof v.interpolationMode === 'number' ? v.interpolationMode : (typeof v.interpMode === 'number' ? v.interpMode : 0),
                tangentWeightMode: typeof v.tangentWeightMode === 'number' ? v.tangentWeightMode : 0
            }]);
        }
        sortedFrames.sort((a, b) => a[0] - b[0]);
        if (typeof curve.assignSorted === 'function') {
            curve.assignSorted(sortedFrames);
        }
    } else {
        _ensureRealCurveDefaultKeyframes(curve);
    }

    const preExtrap = typeof raw.preExtrapolation === 'number'
        ? raw.preExtrapolation
        : (typeof raw.preExtrap === 'number' ? raw.preExtrap : (typeof raw.preWrapMode === 'number' ? raw.preWrapMode : undefined));
    if (preExtrap !== undefined) {
        curve.preExtrapolation = preExtrap;
    }

    const postExtrap = typeof raw.postExtrapolation === 'number'
        ? raw.postExtrapolation
        : (typeof raw.postExtrap === 'number' ? raw.postExtrap : (typeof raw.postWrapMode === 'number' ? raw.postWrapMode : undefined));
    if (postExtrap !== undefined) {
        curve.postExtrapolation = postExtrap;
    }

    return curve;
}

function _serializeRealCurve(val) {
    const keyFrames = (val && typeof val.keyframes === 'function') ? [...val.keyframes()].map(([time, kf]) => ({
        time,
        value: typeof kf.value === 'number' ? kf.value : 0,
        inTangent: typeof kf.leftTangent === 'number' ? kf.leftTangent : 0,
        outTangent: typeof kf.rightTangent === 'number' ? kf.rightTangent : 0,
        inTangentWeight: typeof kf.leftTangentWeight === 'number' ? kf.leftTangentWeight : 1,
        outTangentWeight: typeof kf.rightTangentWeight === 'number' ? kf.rightTangentWeight : 1,
        interpMode: typeof kf.interpolationMode === 'number' ? kf.interpolationMode : 0,
        tangentWeightMode: typeof kf.tangentWeightMode === 'number' ? kf.tangentWeightMode : 0
    })) : [];

    return {
        __type__: 'cc.RealCurve',
        __value__: {
            preExtrapolation: (val && typeof val.preExtrapolation === 'number') ? val.preExtrapolation : 1,
            postExtrapolation: (val && typeof val.postExtrapolation === 'number') ? val.postExtrapolation : 1,
            keyFrames: keyFrames
        }
    };
}

function _ensureAllRealCurvesValid(obj, ctor = null, visited = new Set()) {
    if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
    visited.add(obj);

    if (_isRealCurve(obj)) {
        _ensureRealCurveDefaultKeyframes(obj);
        return;
    }

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            _ensureAllRealCurvesValid(obj[i], null, visited);
        }
        return;
    }

    const targetCtor = ctor || obj.constructor;
    for (const k of Object.keys(obj)) {
        if (k.startsWith('__')) continue;
        const v = obj[k];
        if (_isRealCurve(v)) {
            _ensureRealCurveDefaultKeyframes(v);
        } else if (_isRealCurveProp(targetCtor, k) || (v && typeof v === 'object' && (v.__type__ === 'cc.RealCurve' || v.__type__ === 'RealCurve' || Array.isArray(v.keyFrames) || Array.isArray(v.keys)))) {
            if (typeof cc !== 'undefined' && cc.RealCurve) {
                const newCurve = new cc.RealCurve();
                _decodeCurveValue(newCurve, v);
                obj[k] = newCurve;
            }
        } else if (v && typeof v === 'object') {
            _ensureAllRealCurvesValid(v, null, visited);
        }
    }
}

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

function _enrichDumpWithGetters(dump, ctor) {
    if (!dump || !dump.value || !ctor) return;
    const gettersInfo = _getGettersOfClass(ctor);
    for (const g in gettersInfo) {
        if (dump.value[g] && typeof dump.value[g] === 'object') {
            dump.value[g].isGetter = true;
            if (gettersInfo[g].hasSetter) {
                dump.value[g].hasSetter = true;
            }
            if (gettersInfo[g].readonly) {
                dump.value[g].readonly = true;
            }
        }
    }
    for (const key of Object.keys(dump.value)) {
        const item = dump.value[key];
        if (item && item.value && typeof item.value === 'object' && !Array.isArray(item.value)) {
            const nestedType = item.actualType || item.type;
            const nestedCtor = nestedType ? cc.js.getClassByName(nestedType) : null;
            if (nestedCtor) {
                _enrichDumpWithGetters(item, nestedCtor);
            }
        } else if (item && Array.isArray(item.value)) {
            for (const elem of item.value) {
                if (elem && elem.value && typeof elem.value === 'object') {
                    const elemType = elem.actualType || elem.type;
                    const elemCtor = elemType ? cc.js.getClassByName(elemType) : null;
                    if (elemCtor) {
                        _enrichDumpWithGetters(elem, elemCtor);
                    }
                }
            }
        }
    }
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
                } else if (typeName === 'cc.RealCurve' || typeName === 'RealCurve') {
                    item.type = 'cc.RealCurve';
                    item.extends = ['cc.RealCurve'];
                    if (!item.value || !item.value.keyFrames) {
                        const curveInst = instance?.[p];
                        if (_isRealCurve(curveInst)) {
                            _ensureRealCurveDefaultKeyframes(curveInst);
                            item.value = {
                                postExtrap: curveInst.postExtrapolation ?? 1,
                                preExtrap: curveInst.preExtrapolation ?? 1,
                                keyFrames: (typeof curveInst.keyframes === 'function') ? [...curveInst.keyframes()].map(([time, kf]) => ({
                                    time,
                                    value: typeof kf.value === 'number' ? kf.value : 0,
                                    inTangent: typeof kf.leftTangent === 'number' ? kf.leftTangent : 0,
                                    outTangent: typeof kf.rightTangent === 'number' ? kf.rightTangent : 0,
                                    inTangentWeight: typeof kf.leftTangentWeight === 'number' ? kf.leftTangentWeight : 1,
                                    outTangentWeight: typeof kf.rightTangentWeight === 'number' ? kf.rightTangentWeight : 1,
                                    interpMode: typeof kf.interpolationMode === 'number' ? kf.interpolationMode : 0,
                                    tangentWeightMode: typeof kf.tangentWeightMode === 'number' ? kf.tangentWeightMode : 0
                                })) : []
                            };
                        }
                    }
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

const BASE_ASSET_IGNORED_PROPS = new Set([
    // cc.Object / cc.Asset engine internals
    '_name', '_objFlags', '__editorExtras__', '_native', '_nativeAsset', 'name', 'isValid',
    '_callbackTable', '_nativeUrl', '_file', '_ref', 'loaded', 'rawUrl', '_uuid', 'uuid',
    // pTSAsset internals
    '_isLoaded', '_ready', '_resolver', '_driver', '_onLoad', '_onReleased', '_onAwake', 'ready',
    // Event / callback internals
    '_eventTargets', '_callback', '_handlers', '__waiters_',
    // Inspector / UI internals
    'enabled', '_enabled', 'node'
]);

function _getEditorPropsOfClass(ctor, instance) {
    const ep = {};
    let cur = ctor;
    while (cur && cur !== Object && cur !== Function && cur !== cc.Asset) {
        if (cur.__editor_props__ && typeof cur.__editor_props__ === 'object') {
            Object.assign(ep, cur.__editor_props__);
        }
        if (cur.prototype && cur.prototype.__editor_props__ && typeof cur.prototype.__editor_props__ === 'object') {
            Object.assign(ep, cur.prototype.__editor_props__);
        }
        cur = Object.getPrototypeOf(cur);
    }
    if (instance && instance.__editor_props__ && typeof instance.__editor_props__ === 'object') {
        Object.assign(ep, instance.__editor_props__);
    }
    return ep;
}

function _isEditorProp(ctor, instance, key) {
    if (!key) return false;
    if (ctor && ctor.__pts_editor_props__ && ctor.__pts_editor_props__.has && ctor.__pts_editor_props__.has(key)) return true;
    if (instance && instance.__pts_editor_props__ && instance.__pts_editor_props__.has && instance.__pts_editor_props__.has(key)) return true;
    const ep = _getEditorPropsOfClass(ctor, instance);
    return Boolean(ep && ep[key]);
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
        if (BASE_ASSET_IGNORED_PROPS.has(p) || p.startsWith('__')) {
            continue;
        }
        if (_isEditorProp(ctor, instance, p)) {
            continue;
        }
        // Skip ALL getters and accessors! Every getter is non-serialized on disk.
        if (gettersInfo[p]) {
            continue;
        }
        if (('_' + p) in instance || (ctor.__props__ && ctor.__props__.includes('_' + p))) {
            continue;
        }

        const val = instance[p];
        if (val === undefined || typeof val === 'function') continue;
        if (val instanceof Promise || val instanceof Map || val instanceof Set) continue;

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
            if (_isRealCurve(val)) {
                result[p] = _serializeRealCurve(val);
            } else if (valCtor && valCtor !== Object) {
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
            if (BASE_ASSET_IGNORED_PROPS.has(k)) {
                continue;
            }
            if (_isEditorProp(ctor, instance, k)) {
                continue;
            }
            const publicPropName = k.slice(1);
            if (_isEditorProp(ctor, instance, publicPropName)) {
                continue;
            }
            const hasPublicProp = (ctor.__props__ && ctor.__props__.includes(publicPropName)) || (publicPropName in instance);
            if (!hasPublicProp) {
                continue;
            }

            const v = instance[k];
            if (v === undefined || typeof v === 'function') continue;
            if (v instanceof Promise || v instanceof Map || v instanceof Set) continue;

            if (v && typeof v === 'object' && v.constructor && v.constructor !== Object && !Array.isArray(v)) {
                if (_isRealCurve(v)) {
                    result[k] = _serializeRealCurve(v);
                } else {
                    const vCtor = v.constructor;
                    const vTypeName = cc.js.getClassName(vCtor) || vCtor.name;
                    result[k] = {
                        __type__: vTypeName,
                        __value__: _serializeInstance(v)
                    };
                }
            } else {
                result[k] = v;
            }
        }
    }

    // 3. Ensure backing fields starting with '_' are synced with their public getter/setter counterparts if empty
    for (const k of Object.keys(result)) {
        if (k.startsWith('_') && (result[k] === '' || result[k] === undefined)) {
            const pub = k.slice(1);
            const pubVal = (instance && instance[pub] !== undefined && instance[pub] !== '') ? instance[pub] : result[pub];
            if (pubVal !== undefined && pubVal !== '') {
                result[k] = pubVal;
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
        if (k === '__type__' || k.startsWith('__') || BASE_ASSET_IGNORED_PROPS.has(k)) continue;
        const val = values[k];
        try {
            const desc = _findPropertyDescriptor(instance, k);
            if (desc && desc.get && !desc.set) {
                continue;
            }

            if (val && typeof val === 'object') {
                if (_isRealCurve(instance[k]) || (instance.constructor && _isRealCurveProp(instance.constructor, k)) || val.__type__ === 'cc.RealCurve' || val.__type__ === 'RealCurve') {
                    if (!instance[k] || !_isRealCurve(instance[k])) {
                        if (typeof cc !== 'undefined' && cc.RealCurve) {
                            instance[k] = new cc.RealCurve();
                        }
                    }
                    if (_isRealCurve(instance[k])) {
                        _decodeCurveValue(instance[k], val);
                        continue;
                    }
                }
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
                } else if (!Array.isArray(val) && instance[k] && typeof instance[k] === 'object' && !Array.isArray(instance[k]) && instance[k].constructor && instance[k].constructor !== Object && !(instance[k] instanceof cc.Asset)) {
                    const subPrev = prevValues && prevValues[k] ? (prevValues[k].__value__ || prevValues[k]) : null;
                    _populateInstance(instance[k], val.__value__ || val, subPrev, skipSetters);
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

    _ensureAllRealCurvesValid(instance, ctor);

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
            _enrichDumpWithEditorProps(dump, instance, ctor);
            _translateDump(dump.value, '');

            const gettersInfo = _getGettersOfClass(ctor);
            dump.__getters__ = gettersInfo;
            _enrichDumpWithGetters(dump, ctor);
            dump.__editor_props__ = _getEditorPropsOfClass(ctor, instance);
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
    if (typeof window !== 'undefined' && window.isPreviewProcess) return Boolean(_previewSessionId);
    try {
        return Boolean(typeof cce !== 'undefined' && (
            (cce.Engine && (cce.Engine.isPlaying || cce.Engine.isPlayMode)) ||
            (cce.PlayMode && (cce.PlayMode.isPlaying || cce.PlayMode.isPlayMode))));
    } catch { return false; }
}

function _isHydratedLiveAsset(instance, uuid) {
    if (!instance || instance._isLoaded !== true || !(instance instanceof cc.Asset)) return false;
    if (typeof cc.isValid === 'function' && !cc.isValid(instance, true)) return false;
    const actual = instance._uuid || instance.uuid;
    if (actual === uuid) return true;
    const decode = cc.assetManager && cc.assetManager.utils && cc.assetManager.utils.decodeUuid;
    try { return Boolean(actual && decode && decode(actual) === decode(uuid)); } catch { return false; }
}

function _lookupLoadedLiveAsset(uuid) {
    const manager = cc.assetManager;
    if (!manager || !manager.assets) return null;
    const keys = [uuid];
    const utils = manager.utils;
    if (utils) {
        for (const name of ['decodeUuid', 'compressUuid']) {
            if (typeof utils[name] === 'function') {
                try { keys.push(utils[name](uuid)); } catch {}
            }
        }
    }
    for (const key of keys) {
        const instance = manager.assets.get(key);
        if (_isHydratedLiveAsset(instance, uuid)) return instance;
    }
    const lookup = globalThis[Symbol.for('pTS.preview.lookupLoadedAsset')];
    if (typeof lookup === 'function') {
        const instance = lookup(uuid);
        if (_isHydratedLiveAsset(instance, uuid)) return instance;
    }
    return null;
}

function getLiveInstance(uuid, className, observerId) {
    if (!isPreviewModeRunning() || !uuid) return null;
    for (const subscription of _previewObservers.values()) {
        if (subscription.uuid !== uuid || (observerId && subscription.observerId !== observerId)) continue;
        if (className && subscription.className && className !== subscription.className) continue;
        if (!_isHydratedLiveAsset(subscription.instance, uuid)) subscription.instance = null;
        if (!subscription.instance) {
            const instance = _lookupLoadedLiveAsset(uuid);
            const expectedClass = className || subscription.className;
            if (instance && (!expectedClass || _runtimeClassName(instance.constructor) === expectedClass)) subscription.instance = instance;
        }
        return subscription.instance;
    }
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

    _ensureAllRealCurvesValid(instance, ctor);

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
            _enrichDumpWithEditorProps(dump, instance, ctor);
            _translateDump(dump.value, '');
            const gettersInfo = _getGettersOfClass(ctor);
            dump.__getters__ = gettersInfo;
            _enrichDumpWithGetters(dump, ctor);
            dump.__editor_props__ = _getEditorPropsOfClass(ctor, instance);
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

function _hasProperty(obj, prop) {
    if (!obj) return false;
    try {
        if (prop in obj) return true;
    } catch {}
    let cur = obj;
    while (cur && cur !== Object.prototype && cur !== cc.Asset.prototype) {
        if (Object.prototype.hasOwnProperty.call(cur, prop)) return true;
        cur = Object.getPrototypeOf(cur);
    }
    return false;
}

function _enrichDumpWithEditorProps(dump, instance, ctor) {
    if (!dump || !dump.value || !ctor) return;
    const editorProps = _getEditorPropsOfClass(ctor, instance);
    if (!editorProps || typeof editorProps !== 'object') return;

    for (const [key, meta] of Object.entries(editorProps)) {
        // Defensive check: only include properties that actually exist on this instance or ctor prototype
        const exists = _hasProperty(instance, key) || (ctor.prototype && _hasProperty(ctor.prototype, key));
        if (!exists) continue;
        let rawVal = undefined;
        try {
            rawVal = instance ? instance[key] : undefined;
        } catch (e) {
            // Getter might fail on uninitialized state in editor
        }
        if (!dump.value[key]) {
            let typeName = 'Unknown';
            if (meta.type) {
                typeName = cc.js.getClassName(meta.type) || meta.type.name || String(meta.type);
            } else if (typeof rawVal === 'boolean') {
                typeName = 'Boolean';
            } else if (typeof rawVal === 'number') {
                typeName = Number.isInteger(rawVal) ? 'Integer' : 'Float';
            } else if (typeof rawVal === 'string') {
                typeName = 'String';
            }
            dump.value[key] = {
                name: key,
                type: typeName,
                default: rawVal,
                value: rawVal,
                visible: true,
                readonly: meta.readonly !== false,
                displayName: meta.name || key,
                group: meta.group || { name: "_Debugger", id: "0" },
                isEditorProp: true
            };
        } else {
            dump.value[key].visible = true;
            if (meta.readonly !== undefined) {
                dump.value[key].readonly = meta.readonly;
            }
            if (meta.group) {
                dump.value[key].group = meta.group;
            }
            dump.value[key].isEditorProp = true;
        }
    }
}

function _runtimeClassName(type) {
    if (Array.isArray(type)) return _runtimeClassName(type[0]);
    return typeof type === 'function' ? (cc.js.getClassName(type) || type.name) : (typeof type === 'string' ? type : '');
}

function _runtimeKeys(instance) {
    const editorProps = _getEditorPropsOfClass(instance.constructor, instance);
    return [...new Set([..._getCCProps(instance), ...Object.keys(editorProps)])].filter(key =>
        !key.startsWith('__') && (!BASE_ASSET_IGNORED_PROPS.has(key) || Object.prototype.hasOwnProperty.call(editorProps, key)));
}

// Transport only declared data. Engine identities are leaves, never engine graphs.
function _serializeRuntimeValue(value, allowReferences = false, seen = new Set(), depth = 0) {
    if (value === null) return null;
    if (value === undefined || depth > 20) return undefined;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value !== 'object') return undefined;
    if (value instanceof cc.Node || value instanceof cc.Component) {
        if (!allowReferences) return undefined;
        if (typeof cc.isValid === 'function' && !cc.isValid(value, true)) return null;
        const component = value instanceof cc.Component;
        const node = component ? value.node : value;
        if (!node || (typeof cc.isValid === 'function' && !cc.isValid(node, true))) return null;
        return {
            __runtimeReference__: component ? 'component' : 'node',
            uuid: value.uuid || value._id || '',
            nodeUuid: node.uuid || node._id || '',
            name: component ? (node.name || '') : (value.name || ''),
            ...(component ? { componentType: _runtimeClassName(value.constructor) } : {})
        };
    }
    if (value instanceof cc.Asset) return { uuid: value._uuid || value.uuid || '' };
    if (value instanceof Promise || value instanceof Map || value instanceof Set || seen.has(value)) return undefined;
    if (_isRealCurve(value)) return _serializeRealCurve(value);
    seen.add(value);
    try {
        if (Array.isArray(value)) return Array.from(value, item => _serializeRuntimeValue(item, allowReferences, seen, depth + 1) ?? null);
        const ctor = value.constructor;
        const mathType = cc.ValueType && value instanceof cc.ValueType;
        const plain = !ctor || ctor === Object;
        if (!plain && !mathType && !_getCCProps(value).length && !Object.keys(_getEditorPropsOfClass(ctor, value)).length) return undefined;
        const result = {};
        const editorProps = plain || mathType ? {} : _getEditorPropsOfClass(ctor, value);
        const keys = plain || mathType ? Object.keys(value) : _runtimeKeys(value);
        for (const key of keys) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
            const descriptor = _findPropertyDescriptor(value, key);
            if ((plain || mathType) && descriptor && typeof descriptor.get === 'function') continue;
            try {
                const serialized = _serializeRuntimeValue(value[key], allowReferences || !!editorProps[key], seen, depth + 1);
                if (serialized !== undefined) result[key] = serialized;
            } catch {}
        }
        return plain ? result : { __type__: _runtimeClassName(ctor), __value__: result };
    } finally {
        seen.delete(value);
    }
}

function _extractLiveValues(instance) {
    const result = {};
    const editorProps = _getEditorPropsOfClass(instance.constructor, instance);
    for (const key of _runtimeKeys(instance)) {
        try {
            const value = _serializeRuntimeValue(instance[key], !!editorProps[key], new Set([instance]));
            if (value !== undefined) result[key] = value;
        } catch {}
    }
    return result;
}

function _runtimeMetadata(meta) {
    const result = {};
    for (const [key, value] of Object.entries(meta || {})) {
        if (key === 'type' || key === 'ctor') {
            const type = _runtimeClassName(value);
            if (type) result.type = type;
            if (Array.isArray(value)) {
                result.isArray = true;
                result.elementTypeData = { type, value: null };
            }
            const ctor = Array.isArray(value) ? value[0] : value;
            if (typeof ctor === 'function') {
                if (ctor === cc.Node || ctor.prototype instanceof cc.Node) result.extends = ['cc.Node'];
                else if (ctor === cc.Component || ctor.prototype instanceof cc.Component) result.extends = ['cc.Component'];
                else if (ctor === cc.Asset || ctor.prototype instanceof cc.Asset) result.extends = ['cc.Asset'];
                if (result.elementTypeData && result.extends) result.elementTypeData.extends = result.extends;
            }
        } else if (key !== 'default' && typeof value !== 'function') {
            const serialized = _serializeRuntimeValue(value);
            if (serialized !== undefined) result[key] = serialized;
        }
    }
    if (typeof meta?.ctor === 'function') result.type = _runtimeClassName(meta.ctor);
    return result;
}

function _runtimePropertyAttrs(owner, key) {
    const attrs = { ..._getCCPropsInfo(owner)[key] };
    const delimiter = cc.Class.Attr.DELIMETER || '$_$';
    for (const [name, value] of Object.entries(owner.__instance_attrs__ || {})) {
        const [property, attribute] = name.split(delimiter);
        if (property === key) attrs[attribute] = value;
    }
    return { ...attrs, ..._getEditorPropsOfClass(owner.constructor, owner)[key] };
}

function _runtimePropertyDump(rawValue, value, meta, owner, key, seen = new Set()) {
    const dump = _runtimeMetadata(meta);
    const descriptor = _findPropertyDescriptor(owner, key);
    dump.name = key;
    dump.displayName = dump.displayName || meta.name || key;
    // Detect CC Enum type from meta.type (set by @editor_property(ETest) or @property({type:ETest}))
    const metaEnumType = Array.isArray(meta.type) ? meta.type[0] : (meta.ctor || meta.type);
    let isMetaEnum = false;
    let metaEnumList = null;
    if (metaEnumType && typeof metaEnumType === 'object') {
        try {
            isMetaEnum = cc.Enum.isEnum(metaEnumType);
            if (isMetaEnum) metaEnumList = cc.Enum.getList(metaEnumType).map(e => ({ name: e.name, value: e.value }));
        } catch { isMetaEnum = false; metaEnumList = null; }
    }
    dump.type = dump.type || (isMetaEnum ? 'Enum' :
        rawValue && typeof rawValue === 'object' ? _runtimeClassName(rawValue.constructor) :
        typeof rawValue === 'number' ? 'Float' : typeof rawValue === 'boolean' ? 'Boolean' : typeof rawValue === 'string' ? 'String' : 'Unknown');
    if (isMetaEnum && metaEnumList && !dump.enumList) {
        dump.enumList = metaEnumList;
    }
    dump.readonly = !!meta.readonly || !!(descriptor && ((descriptor.get && !descriptor.set) || descriptor.writable === false));
    dump.visible = true;
    try { dump.visible = typeof meta.visible === 'function' ? !!meta.visible.call(owner) : meta.visible !== false; } catch {}
    if (descriptor && descriptor.get) {
        dump.isGetter = true;
        dump.hasSetter = typeof descriptor.set === 'function';
    }
    dump.value = value;
    if (rawValue instanceof cc.Asset) dump.extends = ['cc.Asset'];
    if (rawValue instanceof cc.Node) dump.extends = ['cc.Node'];
    if (rawValue instanceof cc.Component) dump.extends = ['cc.Component'];
    if (_isRealCurve(rawValue)) {
        dump.type = 'cc.RealCurve';
        dump.extends = ['cc.RealCurve'];
        dump.value = {
            preExtrap: value.__value__.preExtrapolation,
            postExtrap: value.__value__.postExtrapolation,
            keyFrames: value.__value__.keyFrames
        };
    }
    if (rawValue && typeof rawValue === 'object' && !seen.has(rawValue)) {
        seen.add(rawValue);
        try {
            if (Array.isArray(rawValue)) {
                dump.isArray = true;
                const type = Array.isArray(meta.type) ? meta.type[0] : meta.ctor || meta.type;
                dump.value = Array.from(rawValue, (item, index) => _runtimePropertyDump(item, value && value[index], { type }, rawValue, String(index), seen));
                dump.elementTypeData = dump.value.length ? { ...dump.elementTypeData, ...dump.value[0] } :
                    { ..._runtimeMetadata({ type }), value: null };
            } else if (value && value.__type__ && value.__value__ && !_isRealCurve(rawValue)) {
                dump.value = {};
                for (const child of Object.keys(value.__value__)) {
                    dump.value[child] = _runtimePropertyDump(rawValue[child], value.__value__[child], _runtimePropertyAttrs(rawValue, child), rawValue, child, seen);
                }
            }
        } finally { seen.delete(rawValue); }
    }
    return dump;
}

function _captureRuntimeState(instance, className) {
    const values = _extractLiveValues(instance);
    const declaredEditorProps = _getEditorPropsOfClass(instance.constructor, instance);
    const editorProps = {};
    const dump = { type: className || _runtimeClassName(instance.constructor), value: {} };
    const visibility = {};
    const getters = {};
    const arrayVisibility = {};
    const arrayGetters = {};
    for (const key of Object.keys(values)) {
        const meta = _runtimePropertyAttrs(instance, key);
        const property = _runtimePropertyDump(instance[key], values[key], meta, instance, key, new Set([instance]));
        dump.value[key] = property;
        visibility[key] = property.visible;
        if (property.isGetter) getters[key] = values[key];
        if (declaredEditorProps[key]) editorProps[key] = { ..._runtimeMetadata(declaredEditorProps[key]), ...property };
        if (property.isArray && Array.isArray(property.value)) {
            arrayVisibility[key] = property.value.map(item => Object.fromEntries(Object.entries(item.value || {}).filter(([, child]) => child && typeof child === 'object').map(([name, child]) => [name, child.visible !== false])));
            arrayGetters[key] = property.value.map(item => Object.fromEntries(Object.entries(item.value || {}).filter(([, child]) => child && child.isGetter).map(([name, child]) => [name, child.value])));
        }
    }
    return { isPreview: true, found: true, values, editorProps, dump, visibility, getters, arrayVisibility, arrayGetters,
        enumLists: _serializeRuntimeValue(_extractInstanceAttrs(instance)) || {} };
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

// ─── Selected Preview Subscriptions ───

let _previewSessionId = null;
let _previewSyncInterval = null;
const _previewObservers = new Map();
const _previewObserverEpochs = new Map();
let _previewMessage = null;
let _previewControlIpc = null;

function _sendPreviewMessage(method, payload) {
    try {
        if (method === 'preview-session') {
            if (!_previewControlIpc) return false;
            _previewControlIpc.send('pts-asset:preview-session', payload);
        } else {
            if (!_previewMessage || typeof _previewMessage.send !== 'function') return false;
            _previewMessage.send('pts-asset', method, payload);
        }
        return true;
    } catch (err) {
        console.warn(`[pTS-Core] Failed to send ${method}:`, err);
        return false;
    }
}

function _announcePreviewSession() {
    if (_previewSessionId) _sendPreviewMessage('preview-session', { sessionId: _previewSessionId, running: true });
}

function _focusRuntimeInstance(instance) {
    try { instance.onFocusInEditor?.(); } catch (err) {
        console.error('[pTS-Core] Error in runtime onFocusInEditor:', err);
    }
}

function _publishRuntimeObserver(subscription) {
    if (!isPreviewModeRunning() || _previewObservers.get(subscription.observerId) !== subscription) return;
    const previous = subscription.instance;
    const instance = getLiveInstance(subscription.uuid, subscription.className, subscription.observerId);
    if (instance && previous !== instance) _focusRuntimeInstance(instance);
    const state = instance ? _captureRuntimeState(instance, subscription.className) : { isPreview: true, found: false };
    const signature = JSON.stringify(state);
    if (signature === subscription.signature) return state;
    if (_sendPreviewMessage('sync-preview-data', {
        sessionId: _previewSessionId,
        observerId: subscription.observerId,
        subscriptionId: subscription.subscriptionId,
        uuid: subscription.uuid,
        ...state
    })) subscription.signature = signature;
    return state;
}

function _updatePreviewTimer() {
    const hasObservers = (_previewObservers.size > 0 || _pTS_animgraphObservers.size > 0);
    if (hasObservers && _previewSessionId && !_previewSyncInterval) {
        _previewSyncInterval = setInterval(() => {
            for (const subscription of _previewObservers.values()) {
                try { _publishRuntimeObserver(subscription); } catch (err) {
                    console.warn('[pTS-Core] Failed to inspect selected runtime instance:', err);
                }
            }
            for (const subscription of _pTS_animgraphObservers.values()) {
                try { _pTS_publishAnimGraphObserver(subscription); } catch (err) {
                    console.warn('[pTS-Core] Failed to inspect selected animgraph instance:', err);
                }
            }
        }, 200);
    } else if (!hasObservers && _previewSyncInterval) {
        clearInterval(_previewSyncInterval);
        _previewSyncInterval = null;
    }
}

function _observeRuntime(info) {
    if (!info || info.sessionId !== _previewSessionId || !isPreviewModeRunning() || !info.observerId) return;
    const previous = _previewObservers.get(info.observerId);
    const epoch = _previewObserverEpochs.get(info.observerId);
    if (!Number.isSafeInteger(info.subscriptionId) || (epoch !== undefined &&
        (info.subscriptionId < epoch || (!previous && info.subscriptionId === epoch)))) return;
    _previewObserverEpochs.set(info.observerId, info.subscriptionId);
    if (!info.uuid) {
        _previewObservers.delete(info.observerId);
    } else if (!previous || previous.uuid !== info.uuid || previous.subscriptionId !== info.subscriptionId) {
        const subscription = {
            observerId: info.observerId, subscriptionId: info.subscriptionId,
            uuid: info.uuid, className: info.className, instance: null, signature: null
        };
        _previewObservers.set(info.observerId, subscription);
        _publishRuntimeObserver(subscription);
    }
    _updatePreviewTimer();
}

function _runtimeReadonly(target, key) {
    const descriptor = _findPropertyDescriptor(target, key);
    if (descriptor && ((descriptor.get && !descriptor.set) || descriptor.writable === false)) return true;
    return !!_runtimePropertyAttrs(target, key).readonly;
}

async function _resolveRuntimeEdit(value, currentValue, type, isCurrent) {
    const ctor = Array.isArray(type) ? type[0] : type;
    if (typeof ctor === 'function' && (ctor === cc.Node || ctor === cc.Component || ctor.prototype instanceof cc.Node || ctor.prototype instanceof cc.Component)) {
        throw new Error('Runtime scene references are locate-only');
    }
    const assetType = currentValue instanceof cc.Asset || (typeof ctor === 'function' && (ctor === cc.Asset || cc.js.isChildClassOf(ctor, cc.Asset)));
    if (value === null) return null;
    if (Array.isArray(value)) {
        const result = [];
        for (let i = 0; i < value.length; i++) {
            result.push(await _resolveRuntimeEdit(value[i], currentValue && currentValue[i], ctor, isCurrent));
            if (!isCurrent()) throw new Error('Runtime selection changed');
        }
        return result;
    }
    if (assetType) {
        const uuid = typeof value === 'string' ? value : value && (value.uuid || value.__uuid__ || value._uuid || value.__value__?.uuid);
        if (!uuid) throw new Error('Invalid runtime asset reference');
        const cached = cc.assetManager.assets.get(uuid);
        if (cached instanceof cc.Asset) return cached;
        return new Promise((resolve, reject) => {
            cc.assetManager.loadAny({ uuid }, (err, asset) => {
                if (!isCurrent()) reject(new Error('Runtime selection changed'));
                else if (err || !(asset instanceof cc.Asset)) reject(err || new Error(`Asset ${uuid} is unavailable`));
                else resolve(asset);
            });
        });
    }
    if (currentValue && cc.ValueType && currentValue instanceof cc.ValueType && value && typeof value === 'object') {
        const result = currentValue.clone();
        const fields = value.__value__ || value;
        for (const key of Object.keys(result)) {
            if (Object.prototype.hasOwnProperty.call(fields, key)) {
                result[key] = await _resolveRuntimeEdit(fields[key], result[key], null, isCurrent);
                if (!isCurrent()) throw new Error('Runtime selection changed');
            }
        }
        return result;
    }
    if (typeof currentValue === 'number' && typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
    return value;
}

async function _setRuntimeProperty(info) {
    const subscription = info && _previewObservers.get(info.observerId);
    if (!subscription || info.sessionId !== _previewSessionId || info.subscriptionId !== subscription.subscriptionId || info.uuid !== subscription.uuid) {
        return { success: false, error: 'Runtime subscription is no longer active' };
    }
    const sessionId = _previewSessionId;
    const instance = getLiveInstance(info.uuid, info.className, info.observerId);
    if (!instance) return { success: false, error: 'Waiting for instance live' };
    const isCurrent = () => sessionId === _previewSessionId && _previewObservers.get(info.observerId) === subscription && _isHydratedLiveAsset(instance, info.uuid);
    const parts = String(info.propPath || '').split('.');
    if (parts.some(key => !key || key === '__proto__' || key === 'constructor' || key === 'prototype')) return { success: false, error: 'Invalid runtime property path' };
    let target = instance;
    let inheritedType;
    try {
        for (let i = 0; i < parts.length; i++) {
            const key = parts[i];
            if (!target || typeof target !== 'object') throw new Error('Runtime property target is unavailable');
            const mathType = cc.ValueType && target instanceof cc.ValueType;
            const declared = Array.isArray(target) ? /^\d+$/.test(key) : mathType ? Object.prototype.hasOwnProperty.call(target, key) : _runtimeKeys(target).includes(key);
            if (!declared) throw new Error(`Property ${key} is not inspectable`);
            if (_runtimeReadonly(target, key)) return { success: false, readonly: true, error: `Property ${key} is readonly` };
            const propertyAttrs = _runtimePropertyAttrs(target, key);
            const propertyType = propertyAttrs.ctor || propertyAttrs.type || inheritedType;
            if (i < parts.length - 1) {
                inheritedType = Array.isArray(propertyType) ? propertyType[0] : propertyType;
                target = target[key];
                if (target instanceof cc.Node || target instanceof cc.Component || target instanceof cc.Asset) throw new Error('Runtime references cannot be edited through their owner');
            }
        }
        const key = parts[parts.length - 1];
        const attrs = _runtimePropertyAttrs(target, key);
        const previous = target[key];
        if (previous instanceof cc.Node || previous instanceof cc.Component || (info.newValue && info.newValue.__runtimeReference__)) throw new Error('Runtime scene references are locate-only');
        if (_isRealCurve(previous) || _isRealCurveProp(target.constructor, key)) {
            if (!isCurrent()) throw new Error('Runtime selection changed');
            const curve = _isRealCurve(previous) ? previous : new cc.RealCurve();
            _decodeCurveValue(curve, info.newValue);
            const descriptor = _findPropertyDescriptor(target, key);
            if (curve !== previous || (descriptor && descriptor.set)) target[key] = curve;
        } else {
            const value = await _resolveRuntimeEdit(info.newValue, previous, attrs.ctor || attrs.type || inheritedType, isCurrent);
            if (!isCurrent()) throw new Error('Runtime selection changed');
            target[key] = value;
        }
        _focusRuntimeInstance(instance);
        for (const observer of _previewObservers.values()) {
            if (observer.uuid === info.uuid) _publishRuntimeObserver(observer);
        }
        return { success: true, ..._captureRuntimeState(instance, info.className) };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

async function _onRuntimeProperty(info) {
    const sessionId = _previewSessionId;
    const subscription = info && _previewObservers.get(info.observerId);
    if (!subscription || info.sessionId !== sessionId || info.subscriptionId !== subscription.subscriptionId || info.uuid !== subscription.uuid) return;
    let result;
    try {
        result = await _setRuntimeProperty(info);
    } catch (err) {
        result = { success: false, error: String(err) };
    }
    if (sessionId !== _previewSessionId || _previewObservers.get(info.observerId) !== subscription) return;
    if (!result.success) {
        const instance = getLiveInstance(info.uuid, info.className, info.observerId);
        try {
            Object.assign(result, instance ? _captureRuntimeState(instance, info.className) : { isPreview: true, found: false });
        } catch (err) {
            result.error = `${result.error || 'Runtime edit failed'}; ${String(err)}`;
        }
    }
    _sendPreviewMessage('runtime-property-result', {
        sessionId, observerId: info.observerId, subscriptionId: info.subscriptionId, uuid: info.uuid, ...result
    });
}

function _receivePreviewObservation(_event, info) {
    _observeRuntime(info);
}

function _receiveRuntimeProperty(_event, info) {
    void _onRuntimeProperty(info);
}

function _receiveLogInstance(_event, info) {
    if (!info || !_previewSessionId || info.sessionId !== _previewSessionId) return;
    const instance = getLiveInstance(info.uuid, info.className);
    if (!instance) {
        console.warn(`[pTS Logger] No live instance for ${info.className} (${info.uuid})`);
        return;
    }
    console.log(`[pTS Logger] ${info.className} (${info.uuid}):`, instance);
}

const _pTS_animgraphObservers = new Map();

function _pTS_findActiveAnimController(uuid) {
    if (typeof cc === 'undefined' || !cc.director) return null;
    const scene = cc.director.getScene();
    if (!scene) return null;
    const CtlClass = cc.js.getClassByName('cc.animation.AnimationController');
    if (!CtlClass) return null;
    const controllers = scene.getComponentsInChildren(CtlClass);
    for (const ctl of controllers) {
        const g = ctl.graph || ctl._graph;
        if (!g) continue;
        const gUuid = g._uuid || g.uuid;
        if (gUuid === uuid) {
            return ctl;
        }
    }
    return null;
}

function _pTS_getNodeHierarchyPath(node) {
    if (!node) return '';
    const parts = [node.name];
    let cur = node.parent;
    while (cur && cur.parent) {
        parts.unshift(cur.name);
        cur = cur.parent;
    }
    return parts.join('/');
}

function _pTS_extractLiveVariables(ctl) {
    const variables = [];
    const varIter = (ctl._graphEval && typeof ctl._graphEval.getVariables === 'function')
        ? ctl._graphEval.getVariables()
        : (typeof ctl.getVariables === 'function' ? ctl.getVariables() : []);
    for (const [name, desc] of varIter) {
        const typeNum = desc.type !== undefined ? desc.type : 0;
        const typeNames = ['Float', 'Integer', 'Boolean', 'Trigger'];
        let val = undefined;
        try {
            val = typeof ctl.getValue === 'function' ? ctl.getValue(name) : (ctl._graphEval && typeof ctl._graphEval.getValue === 'function' ? ctl._graphEval.getValue(name) : undefined);
        } catch (e) {}
        variables.push({
            name,
            type: typeNum,
            typeName: typeNames[typeNum] || 'Unknown',
            value: val !== undefined ? val : false,
            isTrigger: typeNum === 3
        });
    }
    return variables;
}

function _pTS_extractLiveLayers(ctl) {
    const layers = [];
    const count = ctl.layerCount || (ctl._graphEval ? ctl._graphEval.layerCount : 0);
    for (let i = 0; i < count; i++) {
        let activeStatePath = null;
        let progress = 0;
        try {
            const status = typeof ctl.getCurrentStateStatus === 'function' ? ctl.getCurrentStateStatus(i) : null;
            if (status) {
                progress = typeof status.progress === 'number' ? status.progress : 0;
            }
            const root = ctl._graphEval && ctl._graphEval._rootPoseNode;
            const lsm = root && typeof root.getLayerTopLevelStateMachineEvaluation === 'function' && root.getLayerTopLevelStateMachineEvaluation(i);
            if (lsm && lsm._currentNode && lsm._currentNode.__DEBUG_ID__) {
                activeStatePath = lsm._currentNode.__DEBUG_ID__;
            }
        } catch (e) {}
        const layerObj = ctl.graph && ctl.graph.layers && ctl.graph.layers[i];
        layers.push({
            index: i,
            name: layerObj ? layerObj.name : `Layer ${i}`,
            weight: typeof ctl.getLayerWeight === 'function' ? ctl.getLayerWeight(i) : 1.0,
            activeStatePath,
            progress
        });
    }
    return layers;
}

function _pTS_extractLiveComponents(ctl) {
    const components = {};
    try {
        const root = ctl._graphEval && ctl._graphEval._rootPoseNode;
        if (!root || typeof root.getLayerTopLevelStateMachineEvaluation !== 'function') return components;
        const count = ctl.layerCount || (ctl._graphEval ? ctl._graphEval.layerCount : 0);
        for (let l = 0; l < count; l++) {
            const lsm = root.getLayerTopLevelStateMachineEvaluation(l);
            const motionStates = lsm && lsm._motionStates ? lsm._motionStates : [];
            for (const ms of motionStates) {
                const path = ms.__DEBUG_ID__;
                if (!path) continue;
                const rawComps = ms.components && ms.components._components ? ms.components._components : [];
                for (const comp of rawComps) {
                    const compCls = cc.js.getClassName(comp);
                    const values = {};
                    for (const k of Object.keys(comp)) {
                        if (!k.startsWith('_') && typeof comp[k] !== 'function') {
                            values[k] = _serializeRuntimeValue(comp[k], false, new Set(), 0);
                        }
                    }
                    components[path] = components[path] || {};
                    components[path][compCls] = values;
                }
            }
        }
    } catch (e) {}
    return components;
}

function _pTS_captureAnimGraphRuntimeState(uuid) {
    if (!isPreviewModeRunning()) return { isPreview: false, found: false, uuid };
    const ctl = _pTS_findActiveAnimController(uuid);
    if (!ctl) return { isPreview: true, found: false, uuid };
    return {
        isPreview: true,
        found: true,
        uuid,
        activeNode: {
            name: ctl.node.name,
            uuid: ctl.node.uuid,
            path: _pTS_getNodeHierarchyPath(ctl.node)
        },
        controllerClass: cc.js.getClassName(ctl),
        variables: _pTS_extractLiveVariables(ctl),
        layers: _pTS_extractLiveLayers(ctl),
        components: _pTS_extractLiveComponents(ctl)
    };
}

function _pTS_publishAnimGraphObserver(subscription) {
    const state = _pTS_captureAnimGraphRuntimeState(subscription.uuid);
    const signature = JSON.stringify(state);
    if (signature === subscription.signature) return state;
    if (_previewControlIpc) {
        _previewControlIpc.send('pts-animgraph:sync-animgraph', {
            sessionId: _previewSessionId,
            observerId: subscription.observerId,
            subscriptionId: subscription.subscriptionId,
            uuid: subscription.uuid,
            ...state
        });
        subscription.signature = signature;
    }
    return state;
}

function _pTS_announceAnimGraphPreviewSession() {
    if (_previewSessionId && _previewControlIpc) {
        _previewControlIpc.send('pts-animgraph:preview-session', { sessionId: _previewSessionId, running: true });
    }
}

function _pTS_receiveAnimGraphObservation(_event, info) {
    if (!info || info.sessionId !== _previewSessionId || !isPreviewModeRunning() || !info.observerId) return;
    if (!info.uuid) {
        _pTS_animgraphObservers.delete(info.observerId);
    } else {
        const sub = {
            observerId: info.observerId,
            uuid: info.uuid,
            subscriptionId: info.subscriptionId,
            signature: ''
        };
        _pTS_animgraphObservers.set(info.observerId, sub);
        _pTS_publishAnimGraphObserver(sub);
    }
    _updatePreviewTimer();
}

function _pTS_receiveAnimGraphSetVariable(_event, info) {
    if (!info || info.sessionId !== _previewSessionId || !isPreviewModeRunning()) return;
    const ctl = _pTS_findActiveAnimController(info.uuid);
    if (!ctl) return;
    try {
        if (typeof ctl.setValue === 'function') {
            ctl.setValue(info.name, info.value);
        } else if (ctl._graphEval && typeof ctl._graphEval.setValue === 'function') {
            ctl._graphEval.setValue(info.name, info.value);
        }
    } catch (e) {
        console.warn(`[pTS-Core] Failed to set animgraph variable ${info.name}:`, e);
    }
    for (const sub of _pTS_animgraphObservers.values()) {
        if (sub.uuid === info.uuid) _pTS_publishAnimGraphObserver(sub);
    }
}

function _pTS_receiveAnimGraphSetLayerWeight(_event, info) {
    if (!info || info.sessionId !== _previewSessionId || !isPreviewModeRunning()) return;
    const ctl = _pTS_findActiveAnimController(info.uuid);
    if (!ctl) return;
    try {
        if (typeof ctl.setLayerWeight === 'function') {
            ctl.setLayerWeight(info.layerIndex, info.weight);
        } else if (ctl._graphEval && typeof ctl._graphEval.setLayerWeight === 'function') {
            ctl._graphEval.setLayerWeight(info.layerIndex, info.weight);
        }
    } catch (e) {
        console.warn(`[pTS-Core] Failed to set animgraph layer weight:`, e);
    }
    for (const sub of _pTS_animgraphObservers.values()) {
        if (sub.uuid === info.uuid) _pTS_publishAnimGraphObserver(sub);
    }
}

function _pTS_receiveAnimGraphLogRuntime(_event, info) {
    if (!info || info.sessionId !== _previewSessionId || !isPreviewModeRunning()) return;
    const ctl = _pTS_findActiveAnimController(info.uuid);
    if (!ctl) {
        console.warn(`[pTS-AnimGraph Logger] No active AnimationController playing graph ${info.uuid}`);
        return;
    }
    console.log(`[pTS-AnimGraph Logger] Active AnimationController on "${_pTS_getNodeHierarchyPath(ctl.node)}":`, ctl, 'GraphEval:', ctl._graphEval);
}

function _stopPreviewSession() {
    const sessionId = _previewSessionId;
    _previewSessionId = null;
    _previewObservers.clear();
    _previewObserverEpochs.clear();
    _pTS_animgraphObservers.clear();
    clearInterval(_previewSyncInterval);
    _previewSyncInterval = null;
    if (sessionId) {
        _sendPreviewMessage('preview-session', { sessionId, running: false });
        if (_previewControlIpc) {
            _previewControlIpc.send('pts-animgraph:preview-session', { sessionId, running: false });
        }
    }
    if (_previewControlIpc) {
        _previewControlIpc.removeListener('pts-asset:observe-runtime', _receivePreviewObservation);
        _previewControlIpc.removeListener('pts-asset:set-runtime-property', _receiveRuntimeProperty);
        _previewControlIpc.removeListener('pts-asset:log-runtime-instance', _receiveLogInstance);
        _previewControlIpc.removeListener('pts-asset:request-preview-session', _announcePreviewSession);
        _previewControlIpc.removeListener('pts-animgraph:observe-runtime', _pTS_receiveAnimGraphObservation);
        _previewControlIpc.removeListener('pts-animgraph:set-variable', _pTS_receiveAnimGraphSetVariable);
        _previewControlIpc.removeListener('pts-animgraph:set-layer-weight', _pTS_receiveAnimGraphSetLayerWeight);
        _previewControlIpc.removeListener('pts-animgraph:log-runtime', _pTS_receiveAnimGraphLogRuntime);
        _previewControlIpc.removeListener('pts-animgraph:request-preview-session', _pTS_announceAnimGraphPreviewSession);
    }
    if (typeof window !== 'undefined') window.removeEventListener('beforeunload', _stopPreviewSession);
    _previewMessage = null;
    _previewControlIpc = null;
}

function _startPreviewSession() {
    _stopPreviewSession();
    if (typeof window === 'undefined' || !window.isPreviewProcess) return;
    const editor = globalThis.Editor || window.Editor;
    _previewMessage = editor && editor.Message;
    _previewSessionId = `pts-preview-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    _previewControlIpc = require('electron').ipcRenderer;
    _previewControlIpc.on('pts-asset:observe-runtime', _receivePreviewObservation);
    _previewControlIpc.on('pts-asset:set-runtime-property', _receiveRuntimeProperty);
    _previewControlIpc.on('pts-asset:log-runtime-instance', _receiveLogInstance);
    _previewControlIpc.on('pts-asset:request-preview-session', _announcePreviewSession);
    _previewControlIpc.on('pts-animgraph:observe-runtime', _pTS_receiveAnimGraphObservation);
    _previewControlIpc.on('pts-animgraph:set-variable', _pTS_receiveAnimGraphSetVariable);
    _previewControlIpc.on('pts-animgraph:set-layer-weight', _pTS_receiveAnimGraphSetLayerWeight);
    _previewControlIpc.on('pts-animgraph:log-runtime', _pTS_receiveAnimGraphLogRuntime);
    _previewControlIpc.on('pts-animgraph:request-preview-session', _pTS_announceAnimGraphPreviewSession);
    window.addEventListener('beforeunload', _stopPreviewSession);
    _announcePreviewSession();
    _pTS_announceAnimGraphPreviewSession();
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

// ─── Node Tree & Component Hooks for @implement ───

function _enrichNodeTreeContracts(node) {
    if (!node) return;
    if (Array.isArray(node.components)) {
        const implKey = Symbol.for('__pTS_implements__');
        node.components.forEach(comp => {
            if (!comp || !comp.type) return;
            const ctor = cc.js.getClassByName(comp.type);
            if (!ctor) return;

            let cur = ctor;
            const visited = new Set();
            comp.extends = Array.isArray(comp.extends) ? comp.extends : [];

            while (cur && cur !== Object && cur !== Function && !visited.has(cur)) {
                visited.add(cur);
                const impls = cur[implKey] || cur.__pTS_implements__;
                if (impls) {
                    const addExt = (item) => {
                        if (!item) return;
                        const name = typeof item === 'string' ? item : (cc.js.getClassName(item) || item.name);
                        if (name && !comp.extends.includes(name)) {
                            comp.extends.push(name);
                        }
                    };
                    if (impls instanceof Set) {
                        impls.forEach(addExt);
                    } else if (Array.isArray(impls)) {
                        impls.forEach(addExt);
                    } else if (typeof impls === 'object') {
                        Object.keys(impls).forEach(addExt);
                    }
                }
                cur = Object.getPrototypeOf(cur);
            }
        });
    }
    if (Array.isArray(node.children)) {
        node.children.forEach(_enrichNodeTreeContracts);
    }
}

let _isResolvingContractComponent = false;

function _hookNodeGetComponent() {
    try {
        if (typeof cc !== 'undefined' && cc.Node && cc.Node.prototype && !cc.Node.prototype.getComponent.__pts_hooked__) {
            const origGetComponent = cc.Node.prototype.getComponent;
            const hookedGetComponent = function(typeOrName) {
                const comp = origGetComponent.call(this, typeOrName);
                if (comp) return comp;
                if (_isResolvingContractComponent) return null;
                _isResolvingContractComponent = true;
                try {
                    if (this.components) {
                        const implKey = Symbol.for('__pTS_implements__');
                        const targetName = typeof typeOrName === 'string' ? typeOrName : (cc.js.getClassName(typeOrName) || (typeOrName && typeOrName.name));
                        for (let i = 0; i < this.components.length; i++) {
                            const c = this.components[i];
                            if (!c) continue;
                            const ctor = c.constructor;
                            if (!ctor) continue;
                            let cur = ctor;
                            const visited = new Set();
                            while (cur && cur !== Object && cur !== Function && !visited.has(cur)) {
                                visited.add(cur);
                                const impls = cur[implKey] || cur.__pTS_implements__;
                                if (impls) {
                                    if (impls.has && (impls.has(typeOrName) || (targetName && impls.has(targetName)))) return c;
                                    if (Array.isArray(impls) && (impls.includes(typeOrName) || (targetName && impls.includes(targetName)))) return c;
                                    if (typeof impls === 'object' && ((typeOrName in impls) || (targetName && targetName in impls))) return c;
                                }
                                cur = Object.getPrototypeOf(cur);
                            }
                        }
                    }
                } finally {
                    _isResolvingContractComponent = false;
                }
                return null;
            };
            hookedGetComponent.__pts_hooked__ = true;
            cc.Node.prototype.getComponent = hookedGetComponent;
            console.log('[pTS-Core] Successfully hooked cc.Node.prototype.getComponent for @implement');
        }
    } catch (e) {
        console.warn('[pTS-Core] _hookNodeGetComponent error:', e);
    }
}

let _lastSearchTarget = null;
let _lastSearchTime = 0;

function _enrichQueryClassesResult(targetType, result) {
    if (!targetType || !result || !Array.isArray(result)) return;
    try {
        const targetName = typeof targetType === 'string' ? targetType : (cc.js.getClassName(targetType) || targetType.name);
        if (!targetName) return;

        const isObjArray = result.length > 0 && typeof result[0] === 'object';
        const existingNames = new Set(result.map(item => typeof item === 'string' ? item : (item && item.name)));

        const implKey = Symbol.for('__pTS_implements__');
        const nameToClass = cc.js._nameToClass || {};

        for (const [clsName, ctor] of Object.entries(nameToClass)) {
            if (!ctor || typeof ctor !== 'function' || existingNames.has(clsName)) continue;

            let cur = ctor;
            const visited = new Set();
            let matches = false;

            while (cur && cur !== Object && cur !== Function && !visited.has(cur)) {
                visited.add(cur);
                const impls = cur[implKey] || cur.__pTS_implements__;
                if (impls) {
                    if ((impls.has && (impls.has(targetType) || impls.has(targetName))) ||
                        (Array.isArray(impls) && (impls.includes(targetType) || impls.includes(targetName))) ||
                        (typeof impls === 'object' && ((targetType in impls) || (targetName in impls)))) {
                        matches = true;
                        break;
                    }
                }
                cur = Object.getPrototypeOf(cur);
            }

            if (matches) {
                existingNames.add(clsName);
                if (isObjArray) {
                    result.push({ name: clsName });
                } else {
                    result.push(clsName);
                }
            }
        }
    } catch (e) {
        console.warn('[pTS-Core] _enrichQueryClassesResult error:', e);
    }
}

function _hookQueryClasses() {
    try {
        if (typeof cce !== 'undefined' && cce.SceneFacadeManager) {
            const mgr = cce.SceneFacadeManager;
            const targets = [mgr];
            if (mgr.constructor && mgr.constructor.prototype) {
                targets.push(mgr.constructor.prototype);
            }
            targets.forEach(target => {
                if (target && target.queryClasses && !target.queryClasses.__pts_hooked__) {
                    const origQueryClasses = target.queryClasses;
                    const hooked = async function(options, ...rest) {
                        _lastSearchTime = Date.now();
                        _lastSearchTarget = (options && options.extends) ? options.extends : null;
                        const result = await origQueryClasses.call(this, options, ...rest);
                        if (options && options.extends) {
                            _enrichQueryClassesResult(options.extends, result);
                        }
                        return result;
                    };
                    hooked.__pts_hooked__ = true;
                    target.queryClasses = hooked;
                    console.log('[pTS-Core] Successfully hooked queryClasses for searcher duplicate handling');
                }
            });
        }
    } catch (e) {
        console.warn('[pTS-Core] _hookQueryClasses error:', e);
    }
}

function _enrichNodeTreeForSearch(node, targetType) {
    if (!node) return;

    if (Array.isArray(node.components) && node.components.length > 0) {
        const virtualChildren = [];
        const compsToRemove = new Set();

        // 1. Check for duplicate components of the EXACT SAME type
        const typeGroups = new Map();
        for (const comp of node.components) {
            if (!comp || !comp.type) continue;
            if (!typeGroups.has(comp.type)) typeGroups.set(comp.type, []);
            typeGroups.get(comp.type).push(comp);
        }

        for (const [type, comps] of typeGroups.entries()) {
            if (comps.length > 1) {
                comps.forEach((comp, idx) => {
                    compsToRemove.add(comp);
                    virtualChildren.push({
                        name: `${node.name} [${type} #${idx + 1}]`,
                        uuid: node.uuid,
                        components: [comp],
                        children: []
                    });
                });
            }
        }

        // 2. Check for multiple components matching the search target (contracts/subtypes)
        if (targetType) {
            const targetName = typeof targetType === 'string' ? targetType : (cc.js.getClassName(targetType) || targetType.name);
            const remainingComps = node.components.filter(c => !compsToRemove.has(c));
            const matchingComps = remainingComps.filter(c => {
                if (!c) return false;
                if (c.type === targetName) return true;
                if (Array.isArray(c.extends) && c.extends.includes(targetName)) return true;
                return false;
            });

            if (matchingComps.length > 1) {
                const subTypeCount = new Map();
                matchingComps.forEach(c => {
                    subTypeCount.set(c.type, (subTypeCount.get(c.type) || 0) + 1);
                });
                const subTypeIdx = new Map();

                matchingComps.forEach(comp => {
                    compsToRemove.add(comp);
                    const totalForType = subTypeCount.get(comp.type) || 1;
                    let label = `${node.name} [${comp.type}]`;
                    if (totalForType > 1) {
                        const curIdx = (subTypeIdx.get(comp.type) || 0) + 1;
                        subTypeIdx.set(comp.type, curIdx);
                        label = `${node.name} [${comp.type} #${curIdx}]`;
                    }
                    virtualChildren.push({
                        name: label,
                        uuid: node.uuid,
                        components: [comp],
                        children: []
                    });
                });
            }
        }

        if (compsToRemove.size > 0) {
            node.components = node.components.filter(c => !compsToRemove.has(c));
            node.children = Array.isArray(node.children) ? node.children : [];
            node.children.push(...virtualChildren);
        }
    }

    if (Array.isArray(node.children)) {
        node.children.forEach(child => _enrichNodeTreeForSearch(child, targetType));
    }
}

function _hookQueryNodeTree() {
    try {
        if (typeof cce !== 'undefined' && cce.SceneFacadeManager) {
            const mgr = cce.SceneFacadeManager;
            const targets = [mgr];
            if (mgr.constructor && mgr.constructor.prototype) {
                targets.push(mgr.constructor.prototype);
            }
            targets.forEach(target => {
                if (target && target.queryNodeTree && !target.queryNodeTree.__pts_hooked__) {
                    const origQueryNodeTree = target.queryNodeTree;
                    const hooked = async function(...args) {
                        const tree = await origQueryNodeTree.apply(this, args);
                        if (tree) {
                            _enrichNodeTreeContracts(tree);

                            const isSearch = (Date.now() - _lastSearchTime) < 2000;
                            if (isSearch) {
                                const target = _lastSearchTarget;
                                _lastSearchTime = 0;
                                _enrichNodeTreeForSearch(tree, target);
                            }
                        }
                        return tree;
                    };
                    hooked.__pts_hooked__ = true;
                    target.queryNodeTree = hooked;
                    console.log('[pTS-Core] Successfully hooked queryNodeTree for searcher and @implement drag-and-drop');
                }
            });
        }
    } catch (e) {
        console.warn('[pTS-Core] _hookQueryNodeTree error:', e);
    }
}

// Initial hook pass
_hookNodeGetComponent();
_hookQueryClasses();
_hookQueryNodeTree();


// ─── Lifecycle Exports ───

exports.load = function() {
    const isPreview = Boolean(typeof window !== 'undefined' && window.isPreviewProcess);
    console.log('[pTS-Core] Scene script loaded, isPreviewProcess:', isPreview);

    try {
        if (typeof cc !== 'undefined' && cc.js && typeof cc.js.isChildClassOf === 'function' && !cc.js.isChildClassOf.__pts_hooked__) {
            const origIsChild = cc.js.isChildClassOf;
            const hooked = function(subClass, superClass) {
                if (origIsChild(subClass, superClass)) return true;
                if (typeof subClass === 'function' && typeof superClass === 'function') {
                    const implKey = Symbol.for('__pTS_implements__');
                    const superName = cc.js.getClassName(superClass) || superClass.name;
                    let cur = subClass;
                    const visited = new Set();
                    while (cur && cur !== Object && cur !== Function && !visited.has(cur)) {
                        visited.add(cur);
                        const impls = cur[implKey] || cur.__pTS_implements__;
                        if (impls) {
                            if (impls.has && (impls.has(superClass) || (superName && impls.has(superName)))) return true;
                            if (Array.isArray(impls) && (impls.includes(superClass) || (superName && impls.includes(superName)))) return true;
                            if (typeof impls === 'object' && ((superClass in impls) || (superName && impls[superName]))) return true;
                        }
                        cur = Object.getPrototypeOf(cur);
                    }
                }
                return false;
            };
            hooked.__pts_hooked__ = true;
            cc.js.isChildClassOf = hooked;
            console.log('[pTS-Core] Hooked cc.js.isChildClassOf for @implement multi-type support');
        }
    } catch (e) {}

    _hookNodeGetComponent();
    _hookQueryClasses();
    _hookQueryNodeTree();

    if (isPreview) _startPreviewSession();
};

exports.unload = function() {
    _stopPreviewSession();
};

// ─── Method Registry ───

exports.methods = {
    eval(code) {
        try {
            return eval(code);
        } catch (e) {
            return { error: e.message };
        }
    },

    async reimportAsset(url) {
        try {
            if (typeof Editor !== 'undefined' && Editor.Message) {
                const res = await Editor.Message.request('asset-db', 'reimport-asset', url);
                return { success: true, res };
            }
            return { success: false, error: 'Editor.Message not available' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async refreshAsset(url = 'db://assets') {
        try {
            if (typeof Editor !== 'undefined' && Editor.Message) {
                const res = await Editor.Message.request('asset-db', 'refresh-asset', url);
                return { success: true, res };
            }
            return { success: false, error: 'Editor.Message not available' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

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
        if (typeof currentValues === 'string') {
            try { currentValues = JSON.parse(currentValues); } catch (e) {}
        }
        if (typeof newValue === 'string' && (newValue.startsWith('[') || newValue.startsWith('{'))) {
            try { newValue = JSON.parse(newValue); } catch (e) {}
        }

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
                } else if (_isRealCurve(target[propName]) || (target.constructor && _isRealCurveProp(target.constructor, propName)) || (newValue && (newValue.__type__ === 'cc.RealCurve' || Array.isArray(newValue.keyFrames) || Array.isArray(newValue.keys)))) {
                    let curveInst = target[propName];
                    if (!_isRealCurve(curveInst)) {
                        if (typeof cc !== 'undefined' && cc.RealCurve) {
                            curveInst = new cc.RealCurve();
                            target[propName] = curveInst;
                        }
                    }
                    if (_isRealCurve(curveInst)) {
                        _decodeCurveValue(curveInst, newValue);
                        const desc = _findPropertyDescriptor(target, propName);
                        if (desc && typeof desc.set === 'function') {
                            try {
                                target[propName] = curveInst;
                            } catch (e) {}
                        }
                    } else {
                        target[propName] = newValue;
                    }
                } else if (Array.isArray(newValue)) {
                    // Array property was already populated with proper CCClass or Asset instances
                    // by _populateInstance(instance, currentValues). Only invoke setter if defined.
                    const desc = _findPropertyDescriptor(target, propName);
                    if (desc && typeof desc.set === 'function') {
                        try {
                            target[propName] = target[propName];
                        } catch (e) {}
                    } else if (!target[propName] || !Array.isArray(target[propName])) {
                        target[propName] = newValue;
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
                    target[backingKey] = _isRealCurve(target[propName]) ? target[propName] : newValue;
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
        if (!instance && className && !isPreviewModeRunning()) {
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
            sessionId: _previewSessionId,
            observerCount: _previewObservers.size,
            retainedInstanceCount: [..._previewObservers.values()].filter(observer => !!observer.instance).length,
            observerUuids: [..._previewObservers.values()].map(observer => observer.uuid),
            gamePaused: typeof cc !== 'undefined' && cc.game ? cc.game.isPaused() : undefined,
            game_paused: typeof cc !== 'undefined' && cc.game ? cc.game._paused : undefined,
            sceneName: typeof cc !== 'undefined' && cc.director?.getScene() ? cc.director.getScene().name : undefined,
            isPreviewCalculated: isPreviewModeRunning()
        };
        cc.log('[pTS-Core] debug_preview_info:', JSON.stringify(info));
        return info;
    },

    get_pts_runtime_state(uuid, className, observerId) {
        if (!isPreviewModeRunning()) return { isPreview: false, found: false };
        const instance = getLiveInstance(uuid, className, observerId);
        return instance ? _captureRuntimeState(instance, className) : { isPreview: true, found: false };
    },

    set_pts_runtime_property(uuid, className, propPath, newValue, observerId, subscriptionId, sessionId) {
        const info = uuid && typeof uuid === 'object' ? uuid :
            { uuid, className, propPath, newValue, observerId, subscriptionId, sessionId };
        return _setRuntimeProperty(info);
    },

    log_instance(uuid, className) {
        if (!isPreviewModeRunning()) { console.warn('[pTS-Core] log_instance: preview not running'); return; }
        const instance = getLiveInstance(uuid, className);
        if (!instance) { console.warn(`[pTS-Core] log_instance: no live instance for ${className} (${uuid})`); return; }
        console.log(`[pTS Logger] ${className} (${uuid}):`, instance);
    },

    async pTS_get_animgraph_dump(uuid) {
        if (!uuid) return null;
        let graphAsset = cc.assetManager.assets.get(uuid);
        if (!graphAsset) {
            graphAsset = await new Promise(resolve => {
                cc.assetManager.loadAny({ uuid }, (err, asset) => {
                    resolve(err ? null : asset);
                });
            });
        }
        if (!graphAsset) return null;

        const layers = [];
        const rawLayers = graphAsset.layers || graphAsset._layers || [];
        for (let lIdx = 0; lIdx < rawLayers.length; lIdx++) {
            const l = rawLayers[lIdx];
            const states = [];
            const transitions = [];
            const walkSM = (sm, path) => {
                if (!sm || typeof sm.states !== 'function') return;
                for (const st of sm.states()) {
                    const statePath = path + '/' + st.name;
                    const comps = [];
                    const rawComps = st._components || st.components || [];
                    for (const c of rawComps) {
                        const ctor = c.constructor;
                        const attrs = cc.Class.Attr.getClassAttrs(ctor) || {};
                        const delim = cc.Class.Attr.DELIMETER || '$_$';
                        const props = {};
                        const propAttrs = {};
                        for (const [attrKey, val] of Object.entries(attrs)) {
                            const parts = attrKey.split(delim);
                            if (parts.length === 2) {
                                const p = parts[0], a = parts[1];
                                propAttrs[p] = propAttrs[p] || {};
                                propAttrs[p][a] = val;
                            }
                        }
                        for (const p of Object.keys(propAttrs)) {
                            props[p] = c[p];
                        }
                        if (ctor.__editor_props__) {
                            for (const [epK, epV] of Object.entries(ctor.__editor_props__)) {
                                props[epK] = c[epK];
                                propAttrs[epK] = Object.assign({}, propAttrs[epK] || {}, epV);
                            }
                        }
                        comps.push({
                            className: cc.js.getClassName(c),
                            props,
                            attrs: propAttrs
                        });
                    }
                    let clipName = null;
                    let clipUuid = null;
                    if (st.motion && st.motion.clip) {
                        clipName = st.motion.clip.name || null;
                        clipUuid = st.motion.clip._uuid || null;
                    }
                    states.push({
                        name: st.name,
                        id: (st.__editorExtras__ && st.__editorExtras__.id) || st.name,
                        path: statePath,
                        type: st.name === 'Entry' ? 'Entry' : st.name === 'Exit' ? 'Exit' : st.name === 'Any' ? 'Any' : (st.stateMachine || st._stateMachine) ? 'SubStateMachine' : 'Motion',
                        centerX: (st.__editorExtras__ && st.__editorExtras__.centerX) !== undefined ? st.__editorExtras__.centerX : 0,
                        centerY: (st.__editorExtras__ && st.__editorExtras__.centerY) !== undefined ? st.__editorExtras__.centerY : 0,
                        speed: st.speed !== undefined ? st.speed : 1,
                        speedMultiplier: st.speedMultiplier || '',
                        speedMultiplierEnabled: !!st.speedMultiplierEnabled,
                        clipName,
                        clipUuid,
                        components: comps
                    });
                    const nested = st.stateMachine || st._stateMachine;
                    if (nested) walkSM(nested, statePath);
                }
                if (typeof sm.transitions === 'function') {
                    for (const tr of sm.transitions()) {
                        transitions.push({
                            from: tr.from ? tr.from.name : '',
                            to: tr.to ? tr.to.name : '',
                            duration: tr.duration !== undefined ? tr.duration : 0,
                            hasExitCondition: !!tr.exitConditionEnabled
                        });
                    }
                }
            };
            walkSM(l.stateMachine, l.name);
            layers.push({
                index: lIdx,
                name: l.name,
                weight: l.weight !== undefined ? l.weight : 1.0,
                additive: !!l.additive,
                mask: !!l.mask,
                states,
                transitions
            });
        }

        const variables = [];
        if (graphAsset.variables) {
            for (const [vName, vObj] of graphAsset.variables) {
                const typeNum = vObj._type !== undefined ? vObj._type : (cc.js.getClassName(vObj) === 'cc.animation.TriggerVariable' ? 3 : 0);
                const typeNames = ['Float', 'Integer', 'Boolean', 'Trigger'];
                variables.push({
                    name: vName,
                    type: typeNum,
                    typeName: typeNames[typeNum] || 'Unknown',
                    value: vObj._value !== undefined ? vObj._value : false,
                    isTrigger: typeNum === 3
                });
            }
        }

        return {
            uuid,
            name: graphAsset.name || '',
            layerCount: layers.length,
            layers,
            variables
        };
    },

    pTS_get_animgraph_runtime_state(uuid) {
        return _pTS_captureAnimGraphRuntimeState(uuid);
    },

    pTS_set_animgraph_variable(uuid, name, value) {
        _pTS_receiveAnimGraphSetVariable(null, { sessionId: _previewSessionId, uuid, name, value });
        return { success: true };
    },

    pTS_set_animgraph_layer_weight(uuid, layerIndex, weight) {
        _pTS_receiveAnimGraphSetLayerWeight(null, { sessionId: _previewSessionId, uuid, layerIndex, weight });
        return { success: true };
    },

    pTS_log_animgraph_runtime(uuid) {
        _pTS_receiveAnimGraphLogRuntime(null, { sessionId: _previewSessionId, uuid });
        return { success: true };
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
        const entries = [];
        const seen = new Set();
        const nameMap = cc.js._nameToClass || {};
        for (const name in nameMap) {
            const cls = nameMap[name];
            if (typeof cls === 'function' && cls !== baseCtor && isChildOfPtsAsset(cls, baseCtor)) {
                if (seen.has(name)) continue;
                seen.add(name);

                let menu = cls._pts_menu || cls.__menu__ || (typeof cls.menu === 'string' ? cls.menu : undefined);
                if (!menu && typeof cc !== 'undefined' && cc.CCClass && cc.CCClass.Attr) {
                    try {
                        menu = cc.CCClass.Attr.getClassAttr(cls, '', 'menu');
                    } catch {}
                }
                const hide = !!cls._pts_menu_hide;
                entries.push({
                    name: name,
                    menu: typeof menu === 'string' ? menu : undefined,
                    hide: hide
                });
            }
        }
        return entries;
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
    },

    reloadExtension(pkgName) {
        try {
            const name = pkgName || 'pts-asset';
            console.log('[pTS-Core] Reloading extension: ' + name + ', typeof Editor: ' + (typeof Editor));
            if (typeof Editor !== 'undefined' && Editor.Message) {
                Editor.Message.request('extension', 'reload', name).then(() => {
                    console.log('[pTS-Core] Extension reload successful: ' + name);
                }).catch((err) => {
                    console.log('[pTS-Core] request extension reload error:', err);
                });
                Editor.Message.send(name, 'reload');
                return { success: true, message: 'Reload request sent for ' + name };
            }
            return { success: false, error: 'Editor.Message not available' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async gameTap(x, y, duration, origin) {
        try {
            const canvas = (typeof cc !== 'undefined' && cc.game && cc.game.canvas) ||
                           (typeof document !== 'undefined' && document.querySelector('canvas'));
            let canvasW = 1280;
            let canvasH = 720;
            if (canvas) {
                canvasW = canvas.width || 1280;
                canvasH = canvas.height || 720;
            } else if (typeof cc !== 'undefined' && cc.view) {
                const sz = cc.view.getCanvasSize ? cc.view.getCanvasSize() : cc.view.getVisibleSize();
                if (sz) { canvasW = sz.width; canvasH = sz.height; }
            }

            let screenX = Number(x);
            let screenY = Number(y);
            if (screenX >= 0 && screenX <= 1 && screenY >= 0 && screenY <= 1) {
                screenX = screenX * canvasW;
                screenY = screenY * canvasH;
            }

            if (origin === 'top-left') {
                screenY = canvasH - screenY;
            }

            const hits = [];

            // 1. UI Hit-Testing & Direct Component Dispatch
            if (typeof cc !== 'undefined' && cc.director) {
                const scene = cc.director.getScene();
                if (scene) {
                    const uiTransforms = scene.getComponentsInChildren('cc.UITransform');
                    if (uiTransforms && uiTransforms.length) {
                        for (let i = uiTransforms.length - 1; i >= 0; i--) {
                            const uiTransform = uiTransforms[i];
                            const node = uiTransform.node;
                            if (!node || !node.activeInHierarchy) continue;

                            if (uiTransform.hitTest && uiTransform.hitTest(new cc.Vec2(screenX, screenY))) {
                                hits.push(node.name);

                                const btn = node.getComponent('cc.Button');
                                if (btn && btn.interactable && btn.enabled) {
                                    if (btn.clickEvents && btn.clickEvents.length) {
                                        const touch = cc.Touch ? new cc.Touch(screenX, screenY, 0) : { getID: () => 0 };
                                        const ev = cc.EventTouch ? new cc.EventTouch([touch], true, 'touch-end') : {};
                                        cc.Component.EventHandler.emitEvents(btn.clickEvents, ev);
                                    }
                                }

                                if (cc.Touch && cc.EventTouch) {
                                    const touch = new cc.Touch(screenX, screenY, 0);
                                    const evStart = new cc.EventTouch([touch], true, 'touch-start');
                                    const evEnd = new cc.EventTouch([touch], true, 'touch-end');
                                    evStart.touch = touch;
                                    evEnd.touch = touch;
                                    node.emit('touch-start', evStart);
                                    node.emit('touch-end', evEnd);
                                }
                                break;
                            }
                        }
                    }
                }
            }

            // 2. Global Input Dispatch (cc.input)
            if (typeof cc !== 'undefined' && cc.input) {
                if (cc.EventMouse) {
                    const mDown = new cc.EventMouse(cc.EventMouse.DOWN || 'mouse-down', true);
                    mDown.setLocation(screenX, screenY);
                    mDown.setButton(cc.EventMouse.BUTTON_LEFT || 0);
                    if (typeof cc.input._dispatchMouseDownEvent === 'function') cc.input._dispatchMouseDownEvent(mDown);
                    else cc.input.emit('mouse-down', mDown);

                    const mUp = new cc.EventMouse(cc.EventMouse.UP || 'mouse-up', true);
                    mUp.setLocation(screenX, screenY);
                    mUp.setButton(cc.EventMouse.BUTTON_LEFT || 0);
                    if (typeof cc.input._dispatchMouseUpEvent === 'function') cc.input._dispatchMouseUpEvent(mUp);
                    else cc.input.emit('mouse-up', mUp);
                }

                if (cc.EventTouch && cc.Touch) {
                    const touch = new cc.Touch(screenX, screenY, 0);
                    const evStart = new cc.EventTouch([touch], true, 'touch-start');
                    evStart.touch = touch;
                    if (typeof cc.input._dispatchTouchEvent === 'function') cc.input._dispatchTouchEvent(evStart);
                    else cc.input.emit('touch-start', evStart);

                    const evEnd = new cc.EventTouch([touch], true, 'touch-end');
                    evEnd.touch = touch;
                    if (typeof cc.input._dispatchTouchEvent === 'function') cc.input._dispatchTouchEvent(evEnd);
                    else cc.input.emit('touch-end', evEnd);
                }
            }

            return {
                success: true,
                data: {
                    x: Math.round(screenX),
                    y: Math.round(screenY),
                    canvasWidth: canvasW,
                    canvasHeight: canvasH,
                    hitNodes: hits
                },
                message: `Tap simulated at (${Math.round(screenX)}, ${Math.round(screenY)})` + (hits.length ? ` (hit: ${hits.join(', ')})` : '')
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async gameSwipe(startX, startY, endX, endY, durationMs, stepsCount, origin) {
        try {
            const canvas = (typeof cc !== 'undefined' && cc.game && cc.game.canvas) ||
                           (typeof document !== 'undefined' && document.querySelector('canvas'));
            let canvasW = 1280;
            let canvasH = 720;
            if (canvas) {
                canvasW = canvas.width || 1280;
                canvasH = canvas.height || 720;
            } else if (typeof cc !== 'undefined' && cc.view) {
                const sz = cc.view.getCanvasSize ? cc.view.getCanvasSize() : cc.view.getVisibleSize();
                if (sz) { canvasW = sz.width; canvasH = sz.height; }
            }

            let sx = Number(startX);
            let sy = Number(startY);
            let ex = Number(endX);
            let ey = Number(endY);

            if (sx >= 0 && sx <= 1 && sy >= 0 && sy <= 1) { sx *= canvasW; sy *= canvasH; }
            if (ex >= 0 && ex <= 1 && ey >= 0 && ey <= 1) { ex *= canvasW; ey *= canvasH; }

            if (origin === 'top-left') {
                sy = canvasH - sy;
                ey = canvasH - ey;
            }

            const steps = Math.max(2, Number(stepsCount) || 8);
            const duration = Math.max(30, Number(durationMs) || 200);
            const stepDelay = Math.floor(duration / steps);
            const touchId = 1;

            // TOUCH_START
            if (typeof cc !== 'undefined' && cc.input) {
                if (cc.EventTouch && cc.Touch) {
                    const tStart = new cc.Touch(sx, sy, touchId);
                    const evStart = new cc.EventTouch([tStart], true, 'touch-start');
                    evStart.touch = tStart;
                    if (typeof cc.input._dispatchTouchEvent === 'function') cc.input._dispatchTouchEvent(evStart);
                    else cc.input.emit('touch-start', evStart);
                }
                if (cc.EventMouse) {
                    const mDown = new cc.EventMouse(cc.EventMouse.DOWN || 'mouse-down', true);
                    mDown.setLocation(sx, sy);
                    mDown.setButton(cc.EventMouse.BUTTON_LEFT || 0);
                    if (typeof cc.input._dispatchMouseDownEvent === 'function') cc.input._dispatchMouseDownEvent(mDown);
                }
            }

            // Intermediate TOUCH_MOVE
            for (let i = 1; i <= steps; i++) {
                if (stepDelay > 0) {
                    await new Promise(r => setTimeout(r, stepDelay));
                }
                const progress = i / steps;
                const curX = sx + (ex - sx) * progress;
                const curY = sy + (ey - sy) * progress;

                if (typeof cc !== 'undefined' && cc.input) {
                    if (cc.EventTouch && cc.Touch) {
                        const tMove = new cc.Touch(curX, curY, touchId);
                        const evMove = new cc.EventTouch([tMove], true, 'touch-move');
                        evMove.touch = tMove;
                        if (typeof cc.input._dispatchTouchEvent === 'function') cc.input._dispatchTouchEvent(evMove);
                        else cc.input.emit('touch-move', evMove);
                    }
                    if (cc.EventMouse) {
                        const mMove = new cc.EventMouse(cc.EventMouse.MOVE || 'mouse-move', true);
                        mMove.setLocation(curX, curY);
                        mMove.setButton(cc.EventMouse.BUTTON_LEFT || 0);
                        if (typeof cc.input._dispatchMouseMoveEvent === 'function') cc.input._dispatchMouseMoveEvent(mMove);
                    }
                }
            }

            // TOUCH_END
            if (typeof cc !== 'undefined' && cc.input) {
                if (cc.EventTouch && cc.Touch) {
                    const tEnd = new cc.Touch(ex, ey, touchId);
                    const evEnd = new cc.EventTouch([tEnd], true, 'touch-end');
                    evEnd.touch = tEnd;
                    if (typeof cc.input._dispatchTouchEvent === 'function') cc.input._dispatchTouchEvent(evEnd);
                    else cc.input.emit('touch-end', evEnd);
                }
                if (cc.EventMouse) {
                    const mUp = new cc.EventMouse(cc.EventMouse.UP || 'mouse-up', true);
                    mUp.setLocation(ex, ey);
                    mUp.setButton(cc.EventMouse.BUTTON_LEFT || 0);
                    if (typeof cc.input._dispatchMouseUpEvent === 'function') cc.input._dispatchMouseUpEvent(mUp);
                }
            }

            return {
                success: true,
                data: {
                    from: { x: Math.round(sx), y: Math.round(sy) },
                    to: { x: Math.round(ex), y: Math.round(ey) },
                    duration,
                    steps
                },
                message: `Swipe simulated from (${Math.round(sx)}, ${Math.round(sy)}) to (${Math.round(ex)}, ${Math.round(ey)}) in ${duration}ms`
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    gameTapNode(target) {
        try {
            let node = findNodeByUuid(target);
            if (!node) {
                const scene = cc.director.getScene();
                if (scene) {
                    if (target.includes('/')) {
                        node = scene.getChildByPath ? scene.getChildByPath(target) : null;
                    }
                    if (!node) {
                        function search(n) {
                            if (!n) return null;
                            if (n.name === target) return n;
                            if (n.children) {
                                for (let i = 0; i < n.children.length; i++) {
                                    const found = search(n.children[i]);
                                    if (found) return found;
                                }
                            }
                            return null;
                        }
                        node = search(scene);
                    }
                }
            }

            if (!node) {
                return { success: false, error: 'Target node not found: ' + target };
            }

            let buttonTriggered = false;
            const btn = node.getComponent('cc.Button');
            if (btn && btn.interactable && btn.enabled) {
                if (btn.clickEvents && btn.clickEvents.length) {
                    const touch = cc.Touch ? new cc.Touch(0, 0, 0) : { getID: () => 0 };
                    const ev = cc.EventTouch ? new cc.EventTouch([touch], true, 'touch-end') : {};
                    cc.Component.EventHandler.emitEvents(btn.clickEvents, ev);
                    buttonTriggered = true;
                }
            }

            if (cc.Touch && cc.EventTouch) {
                const touch = new cc.Touch(0, 0, 0);
                const evStart = new cc.EventTouch([touch], true, 'touch-start');
                const evEnd = new cc.EventTouch([touch], true, 'touch-end');
                evStart.touch = touch;
                evEnd.touch = touch;
                node.emit('touch-start', evStart);
                node.emit('touch-end', evEnd);
            }

            let worldPos = null;
            const uiTransform = node.getComponent('cc.UITransform');
            if (uiTransform) {
                const wp = uiTransform.convertToWorldSpaceAR(cc.Vec3.ZERO);
                worldPos = { x: Math.round(wp.x), y: Math.round(wp.y) };
            }

            return {
                success: true,
                data: {
                    nodeName: node.name,
                    nodeUuid: node.uuid || node._id,
                    buttonTriggered,
                    worldPosition: worldPos
                },
                message: `Clicked node "${node.name}"` + (buttonTriggered ? ' (triggered cc.Button click event)' : '')
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async gameScreenshot(savePath, returnBase64, mode) {
        try {
            const fs = require('fs');
            const path = require('path');

            let dataUrl = '';
            let captureWidth = 0;
            let captureHeight = 0;

            const useCamera = mode !== 'canvas';
            if (useCamera && typeof cc !== 'undefined' && cc.director && cc.RenderTexture) {
                try {
                    const scene = cc.director.getScene();
                    let camera = null;
                    if (scene) {
                        const canvasNode = scene.getChildByName('Canvas');
                        const cameraNode = canvasNode ? canvasNode.getChildByName('$_camera') : null;
                        if (cameraNode) {
                            camera = cameraNode.getComponent('cc.Camera');
                        }
                        if (!camera) {
                            const cameraComp = scene.getComponentInChildren('cc.Camera');
                            if (cameraComp) camera = cameraComp;
                        }
                    }

                    if (camera) {
                        const w = 540;
                        const h = 960;
                        const rt = new cc.RenderTexture();
                        rt.reset({ width: w, height: h });
                        const oldTarget = camera.targetTexture;
                        camera.targetTexture = rt;

                        if (cc.director.tick && (typeof cc.game === 'undefined' || cc.game.isPaused())) {
                            cc.director.tick(0.016);
                        }

                        camera.targetTexture = oldTarget;
                        const pixels = rt.readPixels();

                        if (pixels && pixels.length >= w * h * 4) {
                            const flipped = new Uint8ClampedArray(w * h * 4);
                            const rowSize = w * 4;
                            for (let row = 0; row < h; row++) {
                                const srcOffset = (h - 1 - row) * rowSize;
                                const dstOffset = row * rowSize;
                                flipped.set(pixels.subarray(srcOffset, srcOffset + rowSize), dstOffset);
                            }

                            if (typeof document !== 'undefined') {
                                const offCanvas = document.createElement('canvas');
                                offCanvas.width = w;
                                offCanvas.height = h;
                                const ctx = offCanvas.getContext('2d');
                                const imgData = new ImageData(flipped, w, h);
                                ctx.putImageData(imgData, 0, 0);
                                dataUrl = offCanvas.toDataURL('image/png');
                                captureWidth = w;
                                captureHeight = h;
                            }
                        }
                    }
                } catch (cameraErr) {
                    console.warn('[pts-core] Camera RenderTexture capture failed, falling back to canvas:', cameraErr);
                }
            }

            if (!dataUrl) {
                const canvas = (typeof cc !== 'undefined' && cc.game && cc.game.canvas) ||
                               (typeof document !== 'undefined' && document.querySelector('canvas'));

                if (!canvas) {
                    return { success: false, error: 'Game canvas not found in scene execution context' };
                }

                captureWidth = canvas.width;
                captureHeight = canvas.height;

                await new Promise((resolve) => {
                    if (typeof cc !== 'undefined' && cc.director) {
                        const evt = cc.Director.EVENT_AFTER_DRAW || 'director_after_draw';
                        const onDraw = () => {
                            try {
                                dataUrl = canvas.toDataURL('image/png');
                            } catch (e) {}
                            resolve();
                        };
                        cc.director.once(evt, onDraw);
                        if (cc.director.tick && (typeof cc.game === 'undefined' || cc.game.isPaused())) {
                            cc.director.tick(0.016);
                        }
                        setTimeout(() => {
                            if (!dataUrl) {
                                try { dataUrl = canvas.toDataURL('image/png'); } catch (e) {}
                            }
                            resolve();
                        }, 500);
                    } else {
                        try { dataUrl = canvas.toDataURL('image/png'); } catch (e) {}
                        resolve();
                    }
                });
            }

            if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,')) {
                return {
                    success: false,
                    error: 'Could not capture canvas buffer. Canvas might be drawing with preserveDrawingBuffer disabled.'
                };
            }

            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
            const targetPath = savePath || path.join(process.cwd(), 'temp_game_screenshot.png');

            fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));

            return {
                success: true,
                data: {
                    filePath: targetPath,
                    width: captureWidth,
                    height: captureHeight,
                    base64: returnBase64 ? base64Data : undefined,
                    fileSize: (base64Data.length * 0.75) | 0
                },
                message: `Screenshot saved to ${targetPath} (${captureWidth}x${captureHeight})`
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    gameQueryState(evalExpr, includeUiNodes) {
        try {
            const scene = cc.director.getScene();
            const sceneName = scene ? scene.name : 'Unknown';

            const canvas = (typeof cc !== 'undefined' && cc.game && cc.game.canvas) ||
                           (typeof document !== 'undefined' && document.querySelector('canvas'));
            const canvasInfo = canvas ? { width: canvas.width, height: canvas.height } : null;

            let evalResult = undefined;
            if (evalExpr && typeof evalExpr === 'string') {
                try {
                    evalResult = eval(evalExpr);
                } catch (evalErr) {
                    evalResult = { error: evalErr.message };
                }
            }

            const buttons = [];
            if (includeUiNodes !== false && scene) {
                const btnComps = scene.getComponentsInChildren('cc.Button');
                if (btnComps) {
                    for (let i = 0; i < btnComps.length; i++) {
                        const btn = btnComps[i];
                        const node = btn.node;
                        if (!node || !node.activeInHierarchy) continue;
                        let worldPos = null;
                        const uiTransform = node.getComponent('cc.UITransform');
                        if (uiTransform) {
                            const wp = uiTransform.convertToWorldSpaceAR(cc.Vec3.ZERO);
                            worldPos = { x: Math.round(wp.x), y: Math.round(wp.y) };
                        }
                        buttons.push({
                            name: node.name,
                            interactable: btn.interactable,
                            worldPosition: worldPos
                        });
                    }
                }
            }

            return {
                success: true,
                data: {
                    sceneName,
                    canvas: canvasInfo,
                    isPaused: cc.director.isPaused ? cc.director.isPaused() : false,
                    evalResult,
                    activeButtons: buttons
                },
                message: `Runtime state queried for scene "${sceneName}"`
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async gameEval(code) {
        try {
            let result = eval(code);
            if (result && typeof result.then === 'function') {
                result = await result;
            }
            return {
                success: true,
                data: result,
                message: 'Code executed successfully'
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
};
