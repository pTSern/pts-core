
import { Enum } from "cc";
import { pLazy } from "../../utils";

export enum Enums_EStartUp {
    None = "none",
    PreLoad = "__preload",
    OnLoad = "onLoad",
    OnStart = "start",
    OnEnable = "onEnable",
    OnDisable = "onDisable",
    OnDestroy = "onDestroy",
    OnJsonEvent = "onJsonEvent",
}

pLazy.enums(Enums_EStartUp)
