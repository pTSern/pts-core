import {
    _decorator,
    UIRenderer,
    SpriteFrame,
    RenderData,
    IAssembler,
    InstanceMaterialType,
    DynamicAtlasManager,
} from "cc";
import { JSB } from "cc/env";
import { editor_property } from "../../utils/pClass";

const { ccclass, menu } = _decorator;

/**
 * Cocos Creator 3.8.8 default StaticVBAccessor buffer is 144 KB (`macro.BATCHER2D_MEM_INCREMENT`).
 * At 9 floats (36 bytes) per vertex x 4 vertices per quad = 144 bytes/quad -> max 1,024 quads/chunk.
 * Keeping MAX_QUADS_PER_CHUNK = 1024 guarantees zero errorID(9004) while scaling to 10,000+ sprites.
 */
const MAX_QUADS_PER_CHUNK = 1024;
const FLOATS_PER_VERT = 9; // vfmtPosUvColor: x, y, z, u, v, r, g, b, a
const FLOATS_PER_QUAD = FLOATS_PER_VERT * 4; // 36 floats

interface _IBatchQuad {
    x: number;
    y: number;
    hw: number;
    hh: number;
    frame: SpriteFrame;
    r: number;
    g: number;
    b: number;
    a: number;
}

interface _IBatchChunk {
    rd: RenderData;
    capacity: number; // quad capacity currently allocated in rd.chunk
    active_quads: number;
    assembler: IAssembler;
}

interface _ITextureBucket {
    tex_hash: number;
    sample_frame: SpriteFrame;
    count: number;
    quads: _IBatchQuad[];
    chunks: _IBatchChunk[];
}

function _create_chunk_assembler(chunk_holder: _IBatchChunk): IAssembler {
    return {
        createData(comp: UIRenderer): RenderData {
            return comp.requestRenderData();
        },
        updateRenderData(): void {
            // Vertex buffers are synchronized in bulk by Renderer_SpriteBatcher.sync_buffers()
        },
        fillBuffers(_comp: UIRenderer, _renderer: any): void {
            const _n = chunk_holder.active_quads;
            if (_n <= 0) return;
            const _chunk = chunk_holder.rd.chunk;
            if (!_chunk) return;

            const _mesh_buf = _chunk.meshBuffer;
            const _ib = _mesh_buf.iData;
            let _idx_off = _mesh_buf.indexOffset;
            let _vid = _chunk.vertexOffset;

            for (let i = 0; i < _n; i++) {
                _ib[_idx_off++] = _vid;
                _ib[_idx_off++] = _vid + 1;
                _ib[_idx_off++] = _vid + 2;
                _ib[_idx_off++] = _vid + 1;
                _ib[_idx_off++] = _vid + 3;
                _ib[_idx_off++] = _vid + 2;
                _vid += 4;
            }
            _mesh_buf.indexOffset = _idx_off;
        },
    };
}

const _$root_assembler: IAssembler = {
    createData(_comp: UIRenderer): RenderData | null {
        return null;
    },
    updateRenderData(comp: Renderer_SpriteBatcher): void {
        comp.sync_buffers();
    },
    fillBuffers(): void {
        // Each active chunk commits with its own bound chunk assembler inside _render()
    },
};

/**
 * Single-Node Multi-Quad 2D UIRenderer Sprite Batcher for Cocos Creator 3.8.8+.
 *
 * - Renders thousands of animated sprites inside **1 single Node**.
 * - Auto-buckets by texture hash:
 *     * Build (AutoAtlas merged into 1 sheet): collapses to 1 bucket = 1 Draw Call per 1,024 sprites.
 *     * Preview (separate atlases/PNGs): renders every texture cleanly inside the exact same Node.
 * - Zero per-frame JS allocations: reuses quad objects, bucket arrays, and StaticVBChunks.
 */
@ccclass("Renderer_SpriteBatcher")
@menu("pTS/Renderer/SpriteBatcher")
export class Renderer_SpriteBatcher extends UIRenderer {
    @editor_property()
    protected _sprite_count: number = 0;
    @editor_property()
    protected _bucket_count: number = 0;
    @editor_property()
    protected _chunk_count: number = 0;

    private _buckets: Map<number, _ITextureBucket> = new Map();
    private _active_buckets: _ITextureBucket[] = [];

    public get sprite_count(): number { return this._sprite_count; }
    public get bucket_count(): number { return this._bucket_count; }
    public get chunk_count(): number { return this._chunk_count; }

    constructor() {
        super();
        // Required so builtin-sprite compiles with USE_TEXTURE = true (base UIRenderer defaults to ADD_COLOR)
        this._instanceMaterialType = InstanceMaterialType.ADD_COLOR_AND_TEXTURE;
    }

    public onLoad(): void {
        super.onLoad();
        if (this._instanceMaterialType !== InstanceMaterialType.ADD_COLOR_AND_TEXTURE) {
            this._instanceMaterialType = InstanceMaterialType.ADD_COLOR_AND_TEXTURE;
            (this as any).updateMaterial?.();
        }
    }

    /** Call at the start of every frame before pushing sprites. */
    public begin(): void {
        for (let i = 0; i < this._active_buckets.length; i++) {
            const _b = this._active_buckets[i];
            _b.count = 0;
            for (let c = 0; c < _b.chunks.length; c++) {
                _b.chunks[c].active_quads = 0;
            }
        }
        this._active_buckets.length = 0;
        this._sprite_count = 0;
        this._bucket_count = 0;
        this._chunk_count = 0;
    }

    /** Push 1 sprite quad into the batch (zero per-frame allocations). */
    public push(
        x: number,
        y: number,
        frame: SpriteFrame,
        scale_x: number = 1,
        scale_y: number = 1,
        r: number = 1,
        g: number = 1,
        b: number = 1,
        a: number = 1,
    ): void {
        if (!frame || !frame.texture) return;

        // Allow Cocos Dynamic Atlas to pack small unpacked frames in Preview when enabled
        DynamicAtlasManager.instance.packToDynamicAtlas(this, frame);

        const _tex = frame.texture;
        if (!_tex) return;
        const _tex_hash = _tex.getHash();

        let _bucket = this._buckets.get(_tex_hash);
        if (!_bucket) {
            _bucket = {
                tex_hash: _tex_hash,
                sample_frame: frame,
                count: 0,
                quads: [],
                chunks: [],
            };
            this._buckets.set(_tex_hash, _bucket);
        }

        if (_bucket.count === 0) {
            _bucket.sample_frame = frame;
            this._active_buckets.push(_bucket);
        }

        const _idx = _bucket.count++;
        let _q = _bucket.quads[_idx];
        if (!_q) {
            _q = { x: 0, y: 0, hw: 0, hh: 0, frame, r: 1, g: 1, b: 1, a: 1 };
            _bucket.quads[_idx] = _q;
        }

        const _rect = frame.rect;
        _q.x = x;
        _q.y = y;
        _q.hw = _rect.width * 0.5 * scale_x;
        _q.hh = _rect.height * 0.5 * scale_y;
        _q.frame = frame;
        _q.r = r;
        _q.g = g;
        _q.b = b;
        _q.a = a;

        this._sprite_count++;
    }

    /** Call after all sprites for this frame have been pushed. */
    public end(): void {
        this._bucket_count = this._active_buckets.length;
        this.markForUpdateRenderData(true);
    }

    private _ensure_bucket_chunk(bucket: _ITextureBucket, chunk_idx: number, needed_quads: number): _IBatchChunk {
        let _holder = bucket.chunks[chunk_idx];
        if (!_holder) {
            const _rd = RenderData.add();
            _rd.multiOwner = true;
            _rd.initRenderDrawInfo(this);
            _holder = {
                rd: _rd,
                capacity: 0,
                active_quads: 0,
                assembler: null!,
            };
            _holder.assembler = _create_chunk_assembler(_holder);
            bucket.chunks[chunk_idx] = _holder;
        }

        if (needed_quads > _holder.capacity) {
            let _cap = _holder.capacity > 0 ? _holder.capacity : 64;
            while (_cap < needed_quads) _cap <<= 1;
            if (_cap > MAX_QUADS_PER_CHUNK) _cap = MAX_QUADS_PER_CHUNK;

            _holder.rd.resize(_cap * 4, _cap * 6);
            _holder.capacity = _cap;

            if (JSB && _holder.rd.chunk) {
                const _indices = new Uint16Array(_cap * 6);
                let _io = 0;
                let _v = 0;
                for (let i = 0; i < _cap; i++) {
                    _indices[_io++] = _v;
                    _indices[_io++] = _v + 1;
                    _indices[_io++] = _v + 2;
                    _indices[_io++] = _v + 1;
                    _indices[_io++] = _v + 3;
                    _indices[_io++] = _v + 2;
                    _v += 4;
                }
                _holder.rd.chunk.setIndexBuffer(_indices);
            }
        }

        return _holder;
    }

    public sync_buffers(): void {
        this._chunk_count = 0;
        if (this._active_buckets.length === 0) return;

        const _m = this.node.worldMatrix;
        const _m00 = _m.m00;
        const _m01 = _m.m01;
        const _m04 = _m.m04;
        const _m05 = _m.m05;
        const _m12 = _m.m12;
        const _m13 = _m.m13;
        const _z = _m.m14;

        for (let bi = 0; bi < this._active_buckets.length; bi++) {
            const _bucket = this._active_buckets[bi];
            const _total = _bucket.count;
            if (_total <= 0) continue;

            const _num_chunks = Math.ceil(_total / MAX_QUADS_PER_CHUNK);
            for (let ci = 0; ci < _num_chunks; ci++) {
                const _start = ci * MAX_QUADS_PER_CHUNK;
                const _n = Math.min(MAX_QUADS_PER_CHUNK, _total - _start);
                const _holder = this._ensure_bucket_chunk(_bucket, ci, _n);
                const _chunk = _holder.rd.chunk;
                if (!_chunk) continue;

                _holder.active_quads = _n;
                const _vb = _chunk.vb;

                for (let i = 0; i < _n; i++) {
                    const _q = _bucket.quads[_start + i];
                    const _uv = _q.frame.uv; // [uBL, vBL, uBR, vBR, uTL, vTL, uTR, vTR]
                    const _lx0 = _q.x - _q.hw;
                    const _lx1 = _q.x + _q.hw;
                    const _ly0 = _q.y - _q.hh;
                    const _ly1 = _q.y + _q.hh;
                    const _r = _q.r;
                    const _g = _q.g;
                    const _b = _q.b;
                    const _a = _q.a;

                    let _o = i * FLOATS_PER_QUAD;

                    // Bottom-Left (0)
                    _vb[_o++] = _m00 * _lx0 + _m04 * _ly0 + _m12;
                    _vb[_o++] = _m01 * _lx0 + _m05 * _ly0 + _m13;
                    _vb[_o++] = _z;
                    _vb[_o++] = _uv[0];
                    _vb[_o++] = _uv[1];
                    _vb[_o++] = _r;
                    _vb[_o++] = _g;
                    _vb[_o++] = _b;
                    _vb[_o++] = _a;

                    // Bottom-Right (1)
                    _vb[_o++] = _m00 * _lx1 + _m04 * _ly0 + _m12;
                    _vb[_o++] = _m01 * _lx1 + _m05 * _ly0 + _m13;
                    _vb[_o++] = _z;
                    _vb[_o++] = _uv[2];
                    _vb[_o++] = _uv[3];
                    _vb[_o++] = _r;
                    _vb[_o++] = _g;
                    _vb[_o++] = _b;
                    _vb[_o++] = _a;

                    // Top-Left (2)
                    _vb[_o++] = _m00 * _lx0 + _m04 * _ly1 + _m12;
                    _vb[_o++] = _m01 * _lx0 + _m05 * _ly1 + _m13;
                    _vb[_o++] = _z;
                    _vb[_o++] = _uv[4];
                    _vb[_o++] = _uv[5];
                    _vb[_o++] = _r;
                    _vb[_o++] = _g;
                    _vb[_o++] = _b;
                    _vb[_o++] = _a;

                    // Top-Right (3)
                    _vb[_o++] = _m00 * _lx1 + _m04 * _ly1 + _m12;
                    _vb[_o++] = _m01 * _lx1 + _m05 * _ly1 + _m13;
                    _vb[_o++] = _z;
                    _vb[_o++] = _uv[6];
                    _vb[_o++] = _uv[7];
                    _vb[_o++] = _r;
                    _vb[_o++] = _g;
                    _vb[_o++] = _b;
                    _vb[_o++] = _a;
                }

                // Mark MeshBuffer dirty so Batcher2D uploads our freshly written VB to WebGL
                _chunk.meshBuffer.setDirty();
                if (_holder.rd.textureHash !== _bucket.sample_frame.getHash()) {
                    _holder.rd.textureDirty = true;
                }
                _holder.rd.updateRenderData(this, _bucket.sample_frame);
                this._chunk_count++;
            }
        }
    }

    protected _flushAssembler(): void {
        this._assembler = _$root_assembler;
    }

    protected _canRender(): boolean {
        return super._canRender() && this._active_buckets.length > 0;
    }

    protected _render(render: any): void {
        for (let bi = 0; bi < this._active_buckets.length; bi++) {
            const _bucket = this._active_buckets[bi];
            const _frame = _bucket.sample_frame;
            if (!_frame || !_frame.isValid) continue;

            for (let ci = 0; ci < _bucket.chunks.length; ci++) {
                const _holder = _bucket.chunks[ci];
                if (_holder.active_quads > 0 && _holder.rd.isValid()) {
                    render.commitComp(this, _holder.rd, _frame, _holder.assembler, null);
                }
            }
        }
    }

    public onDestroy(): void {
        this._buckets.forEach((_bucket) => {
            for (let i = 0; i < _bucket.chunks.length; i++) {
                RenderData.remove(_bucket.chunks[i].rd);
            }
            _bucket.chunks.length = 0;
            _bucket.quads.length = 0;
        });
        this._buckets.clear();
        this._active_buckets.length = 0;
        super.onDestroy();
    }
}
