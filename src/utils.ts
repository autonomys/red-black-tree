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
    const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
    switch (nodeOffsetBytes) {
        case 4:
            return view.getUint32(0, false);
        case 3:
            return (view.getUint8(0) << 16) + view.getUint16(1, false);
        case 2:
            return view.getUint16(0, false);
        case 1:
            return view.getUint8(0);
        default:
            throw new RuntimeError("Unsupported number of nodes");
    }
}

export function setOffsetToBytes(source: Uint8Array, nodeOffsetBytes: number, offset: number): void {
    const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
    switch (nodeOffsetBytes) {
        case 4:
            view.setUint32(0, offset, false);
            return;
        case 3:
            view.setUint8(0, offset >> 16);
            view.setUint16(1, offset % (2 ** 16), false);
            return;
        case 2:
            view.setUint16(0, offset, false);
            return;
        case 1:
            view.setUint8(0, offset);
            return;
        default:
            throw new RuntimeError("Unsupported number of nodes");
    }
}
