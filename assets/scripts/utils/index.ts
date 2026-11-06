
import * as pArray from "./pArray";
import * as pClass from "./pClass";
import * as pDriver from "./pDriver";
import * as pMath from "./pMath";
import * as pString from "./pString";
import * as pAsync from "./pAsync";
import * as pObject from "./pObject";
import * as pEngine from "./pEngine";
import * as pGlobal from "./pGlobal";
import * as pConst from "./pConst";
import * as pLazy from "./pLazy";
import { pECS } from "./pECS";
import * as pGizmo from "./pGizmo";
import { EditorGizmo, gizmo } from "./pGizmo";
import { MaskPolygon, MaskPolygonGizmo } from "../Components/Renderer/MaskPolygon";
import { MeshPolygonSprite, MeshPolygonSpriteGizmo } from "../Components/Renderer/MeshPolygonSprite";
import { DEBUG } from "cc/env";
import { js } from "cc";

export {
    pArray,
    pClass,
    pDriver,
    pMath,
    pString,
    pAsync,
    pObject,
    pEngine,
    pGlobal,
    pConst,
    pLazy,
    pECS
,
    pGizmo,
    EditorGizmo,
    gizmo
,
    MaskPolygon,
    MaskPolygonGizmo,
    MeshPolygonSprite,
    MeshPolygonSpriteGizmo
};

export { pTSAsset, implement, imps, getComponent, menu } from "../pTSAsset";

if(DEBUG) {
    window['pTS'] = window['pTS'] || js.createMap(true)
    window['pTS']['utils'] = {
        pArray, pClass, pDriver, pMath, pString, pAsync, pObject, pEngine, pGlobal, pConst, pLazy
, pGizmo
    }
}
