/* tslint:disable:no-bitwise */
import {RuntimeError} from "./RuntimeError";

export function compareUint8Array(aKey: Uint8Array, bKey: Uint8Array): -1 | 0 | 1 {
    const length = aKey.length;
    for (let i = 0; i < length; ++i) {
        const diff = aKey[i] - bKey[i];
        if (diff < 0) {
            return -1;
        } else if (diff > 0) {
            return 1;
        }
    }
    return 0;
}

export function maxNumberToBytes(maxNumber: number): number {
    if (maxNumber < 2 ** 8) {
        return 1;
    }
    if (maxNumber < 2 ** 16) {
        return 2;
    }
    if (maxNumber < 2 ** 24) {
        return 3;
    }
    if (maxNumber < 2 ** 32) {
        return 4;
    }
    throw new RuntimeError("Can't store that many nodes");
}

export function getOffsetFromBytes(source: Uint8Array, nodeOffsetBytes: number): number {
    switch (nodeOffsetBytes) {
        case 4: {
            return (source[0] << 24) + (source[1] << 16) + (source[2] << 8) + source[3];
        }
        case 3: {
            return (source[0] << 16) + (source[1] << 8) + source[2];
        }
        case 2: {
            return (source[0] << 8) + source[1];
        }
        case 1:
            return source[0];
        default:
            throw new RuntimeError("Unsupported number of nodes");
    }
}

export function setOffsetToBytes(source: Uint8Array, nodeOffsetBytes: number, offset: number): void {
    switch (nodeOffsetBytes) {
        case 4: {
            const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
            view.setUint32(0, offset, false);
            return;
        }
        case 3: {
            const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
            view.setUint8(0, offset >> 16);
            view.setUint16(1, offset % (1 << 16), false);
            return;
        }
        case 2: {
            const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
            view.setUint16(0, offset, false);
            return;
        }
        case 1:
            source.set([offset]);
            return;
        default:
            throw new RuntimeError("Unsupported number of nodes");
    }
}
