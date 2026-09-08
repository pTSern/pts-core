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

function _getComponentDumpByName(className) {
    const ctor = cc.js.getClassByName(className);
    if (!ctor) {
        console.error(`[pTS-Core] Class not found: ${className}`);
        return null;
    }
    _toDumperData(ctor);

    const instance = new ctor();
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

    try {
        const dump = cce.Dump.encode.encodeObject(instance, n, null, className, false);

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

// ─── Lifecycle Exports ───

exports.load = function() {
    console.log('[pTS-Core] Scene script loaded');
};

exports.unload = function() {
    console.log('[pTS-Core] Scene script unloaded');
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

    dump(what) {
        return _getComponentDumpByName(what);
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
            if (typeof cls === 'function' && cls !== baseCtor && cc.js.isChildClassOf(cls, baseCtor)) {
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
            return ['cc.Asset', 'Asset', 'pTSAsset', className];
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
            if (typeof cls === 'function' && (cls === baseCtor || cc.js.isChildClassOf(cls, baseCtor))) {
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
