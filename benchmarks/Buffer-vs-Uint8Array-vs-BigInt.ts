/* tslint:disable:no-console */
import {randomBytes} from "crypto";

const LOOPS = 100;

console.log('Preparing');

const buffers: Buffer[] = [];
const uint8Arrays: Uint8Array[] = [];
const bigInts: Array<bigint> = [];

function bufferToBigInt(buffer: Buffer): bigint {
    let bigIntResult = 1n;

    for (let i = 3n, offset = 0; i >= 0; --i, offset += 8) {
        bigIntResult *= buffer.readBigUInt64BE(offset) * (2n ** i);
    }

    return bigIntResult;
}

for (let i = 0; i < 10 ** 6; ++i) {
    const randomValue = randomBytes(32);
    buffers.push(randomValue);
    uint8Arrays.push(
        Uint8Array.from(randomValue),
    );
    bigInts.push(
        bufferToBigInt(randomValue),
    );
}

const targetBuffer = buffers[0];
const targetUint8Array = uint8Arrays[0];
const targetBigInt = bigInts[0];

console.log('Benchmarking');

{
    const start = process.hrtime.bigint();
    for (let l = 0; l < LOOPS; ++l) {
        for (const value of buffers) {
            for (let i = 0; i < 32; ++i) {
                if (value[i] < targetBuffer[i]) {
                    break;
                }
            }
        }
    }
    console.log(`Buffer: ${(process.hrtime.bigint() - start) / 1000000n}ms`);
}

{
    const start = process.hrtime.bigint();
    for (let l = 0; l < LOOPS; ++l) {
        for (const value of uint8Arrays) {
            for (let i = 0; i < 32; ++i) {
                if (value[i] < targetUint8Array[i]) {
                    break;
                }
            }
        }
    }
    console.log(`Uint8Array: ${(process.hrtime.bigint() - start) / 1000000n}ms`);
}

{
    const start = process.hrtime.bigint();
    for (let l = 0; l < LOOPS; ++l) {
        for (const value of bigInts) {
            // tslint:disable-next-line:no-unused-expression
            value < targetBigInt;
        }
    }
    console.log(`BigInt: ${(process.hrtime.bigint() - start) / 1000000n}ms`);
}
