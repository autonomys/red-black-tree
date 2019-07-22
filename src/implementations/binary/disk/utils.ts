/* tslint:disable:no-bitwise */
import {RuntimeError} from "../../../RuntimeError";
import {File} from "./File";

/**
 * @param source
 * @param offset At which offset in bytes to start reading a number
 * @param numberOfBytes How many bytes are used to store a number
 */
export async function getNumberFromFileBytes(source: File, offset: number, numberOfBytes: number): Promise<number> {
    const sourceBytes = await source.read(offset, numberOfBytes);
    switch (numberOfBytes) {
        case 4: {
            return (sourceBytes[0] << 24) + (sourceBytes[1] << 16) + (sourceBytes[2] << 8) + sourceBytes[3];
        }
        case 3: {
            return (sourceBytes[0] << 16) + (sourceBytes[1] << 8) + sourceBytes[2];
        }
        case 2: {
            return (sourceBytes[0] << 8) + sourceBytes[1];
        }
        case 1:
            return sourceBytes[0];
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
export async function setNumberToFileBytes(source: File, offset: number, numberOfBytes: number, newNumber: number): Promise<void> {
    const uint8array = new Uint8Array(numberOfBytes);
    const view = new DataView(uint8array.buffer);
    switch (numberOfBytes) {
        case 4: {
            view.setUint32(0, newNumber, false);
            await source.write(offset, uint8array);
            return;
        }
        case 3: {
            view.setUint8(0, newNumber >> 16);
            view.setUint16(1, newNumber % (1 << 16), false);
            await source.write(offset, uint8array);
            return;
        }
        case 2: {
            view.setUint16(0, newNumber, false);
            await source.write(offset, uint8array);
            return;
        }
        case 1:
            uint8array.set([newNumber]);
            await source.write(offset, uint8array);
            return;
        default:
            throw new RuntimeError("Unsupported number of nodes");
    }
}
