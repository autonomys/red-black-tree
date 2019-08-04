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

function uint8ArrayToBigInt(arr: Uint8Array): bigint {
    let result = 0n;

    const length = arr.length;
    for (let i = length - 1, multiplier = 2n ** (BigInt(i) * 8n); i >= 0n; --i, multiplier /= 256n) {
        result += BigInt(arr[i]) * multiplier;
    }

    return result;
}

/**
 * If one key is longer than other, extra length is not checked
 *
 * @param aKey
 * @param bKey
 */
export function uint8ArraysDiff(aKey: Uint8Array, bKey: Uint8Array): bigint {
    const aBigInt = uint8ArrayToBigInt(aKey);
    const bBigInt = uint8ArrayToBigInt(bKey);
    const diff = aBigInt - bBigInt;

    // Math.abs() doesn't work with BigInt
    return diff > 0 ? diff : -diff;
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

/**
 * @param source
 * @param offset At which offset in bytes to start reading a number
 * @param numberOfBytes How many bytes are used to store a number
 */
export function getNumberFromBytes(source: Uint8Array, offset: number, numberOfBytes: number): number {
    switch (numberOfBytes) {
        case 4: {
            return (source[offset] << 24) + (source[offset + 1] << 16) + (source[offset + 2] << 8) + source[offset + 3];
        }
        case 3: {
            return (source[offset] << 16) + (source[offset + 1] << 8) + source[offset + 2];
        }
        case 2: {
            return (source[offset] << 8) + source[offset + 1];
        }
        case 1:
            return source[offset];
        default:
            throw new RuntimeError("Unsupported number of nodes");
    }
}

/**
 * @param source
 * @param offset At which offset in bytes to start writing a number
 * @param numberOfBytes How many bytes are used to store a number
 * @param newNumber Number that should be set
 */
export function setNumberToBytes(source: Uint8Array, offset: number, numberOfBytes: number, newNumber: number): void {
    switch (numberOfBytes) {
        case 4: {
            const view = new DataView(source.buffer, source.byteOffset + offset, numberOfBytes);
            view.setUint32(0, newNumber, false);
            return;
        }
        case 3: {
            const view = new DataView(source.buffer, source.byteOffset + offset, numberOfBytes);
            view.setUint8(0, newNumber >> 16);
            view.setUint16(1, newNumber % (1 << 16), false);
            return;
        }
        case 2: {
            const view = new DataView(source.buffer, source.byteOffset + offset, numberOfBytes);
            view.setUint16(0, newNumber, false);
            return;
        }
        case 1:
            source.set([newNumber], offset);
            return;
        default:
            throw new RuntimeError("Unsupported number of nodes");
    }
}
