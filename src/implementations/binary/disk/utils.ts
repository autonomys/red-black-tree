/* tslint:disable:no-bitwise */
import * as fs from "fs";
import {RuntimeError} from "../../../RuntimeError";

/**
 * @param source
 * @param offset At which offset in bytes to start reading a number
 * @param numberOfBytes How many bytes are used to store a number
 */
export async function getNumberFromFileBytes(source: fs.promises.FileHandle, offset: number, numberOfBytes: number): Promise<number> {
    const sourceBytes = (await source.read(Buffer.allocUnsafe(numberOfBytes), offset, numberOfBytes)).buffer;
    switch (numberOfBytes) {
        case 4: {
            return (sourceBytes[offset] << 24) + (sourceBytes[offset + 1] << 16) + (sourceBytes[offset + 2] << 8) + sourceBytes[offset + 3];
        }
        case 3: {
            return (sourceBytes[offset] << 16) + (sourceBytes[offset + 1] << 8) + sourceBytes[offset + 2];
        }
        case 2: {
            return (sourceBytes[offset] << 8) + sourceBytes[offset + 1];
        }
        case 1:
            return sourceBytes[offset];
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
export async function setNumberToFileBytes(source: fs.promises.FileHandle, offset: number, numberOfBytes: number, newNumber: number): Promise<void> {
    switch (numberOfBytes) {
        case 4: {
            const view = new DataView(new Uint8Array(numberOfBytes));
            view.setUint32(0, newNumber, false);
            await source.write(view.buffer, offset);
            return;
        }
        case 3: {
            const view = new DataView(new Uint8Array(numberOfBytes));
            view.setUint8(0, newNumber >> 16);
            view.setUint16(1, newNumber % (1 << 16), false);
            await source.write(view.buffer, offset);
            return;
        }
        case 2: {
            const view = new DataView(new Uint8Array(numberOfBytes));
            view.setUint16(0, newNumber, false);
            await source.write(view.buffer, offset);
            return;
        }
        case 1:
            await source.write([newNumber], offset);
            return;
        default:
            throw new RuntimeError("Unsupported number of nodes");
    }
}
