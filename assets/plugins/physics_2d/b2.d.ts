declare namespace b2 {
    export class b2World {
        CreateParticleSystem(def: b2ParticleSystemDef): b2ParticleSystem;
        GetGravity(): { x: number; y: number };
        m_contactManager?: {
            m_broadPhase?: {
                m_tree?: {
                    m_stack?: {
                        Pop(): any;
                    }
                }
            }
        };
    }

    export class b2ParticleSystemDef {
        radius: number;
    }

    export class b2ParticleSystem {
        GetParticleCount(): number;
        GetPositionBuffer(): { x: number; y: number }[];
        GetVelocityBuffer(): { x: number; y: number }[];
        GetUserDataBuffer<T = any>(): T[];
        CreateParticle(def: b2ParticleDef): number;
        DestroyParticle(index: number): void;
    }

    export class b2ParticleDef {
        flags: number;
        position: {
            x: number;
            y: number;
            Set(x: number, y: number): void;
        };
    }

    export enum b2ParticleFlag {
        b2_waterParticle = 0,
        b2_zombieParticle = 1,
        b2_wallParticle = 2,
        b2_springParticle = 4,
        b2_elasticParticle = 8,
        b2_viscousParticle = 16,
        b2_powderParticle = 32,
        b2_tensileParticle = 64,
        b2_colorMixingParticle = 128,
        b2_destructionListenerParticle = 256,
        b2_barrierParticle = 512,
        b2_staticPressureParticle = 1024,
        b2_reactiveParticle = 2048,
        b2_repulsiveParticle = 4096,
        b2_fixtureContactListenerParticle = 8192,
        b2_particleContactListenerParticle = 16384,
        b2_fixtureContactFilterParticle = 32768,
        b2_particleContactFilterParticle = 65536
    }
}

interface Window {
    b2: typeof b2;
}

declare var b2: typeof b2;
