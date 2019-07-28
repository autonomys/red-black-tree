/* tslint:disable:no-console */
import {randomBytes} from "crypto";
import {readdirSync, rmdirSync, unlinkSync} from "fs";
// @ts-ignore
import level = require('level-rocksdb');
import * as path from 'path';
import {NodeManagerBinaryDisk, NodeManagerBinaryMemory, NodeManagerJsUint8Array, Tree, TreeAsync} from "../src";

const LOOPS = 100;
const NUMBER_OF_ELEMENTS = 2 ** 14;

console.log('Preparing');

const uint8Arrays: Uint8Array[] = [];

for (let i = 0; i < NUMBER_OF_ELEMENTS; ++i) {
    const randomValue = randomBytes(32);
    uint8Arrays.push(
        Uint8Array.from(randomValue),
    );
}

const buffers = uint8Arrays.map((uint8Array) => {
    return Buffer.from(uint8Array);
});

console.log('Benchmarking');

const empty = new Uint8Array(0);
const emptyBuffer = Buffer.alloc(0);

function rmdirRecursiveSync(dir: string): void {
    const entries = readdirSync(dir, {withFileTypes: true});
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            rmdirRecursiveSync(fullPath);
        } else {
            unlinkSync(fullPath);
        }
    }
    rmdirSync(dir);
}

{
    {
        const start = process.hrtime.bigint();
        for (let l = 0; l < LOOPS; ++l) {
            const nodeManager = new NodeManagerJsUint8Array<Uint8Array>();
            const tree = new Tree(nodeManager);

            for (const key of uint8Arrays) {
                tree.addNode(key, empty);
            }
        }
        console.log(`JS addition: ${(process.hrtime.bigint() - start) / BigInt(LOOPS) / BigInt(NUMBER_OF_ELEMENTS)}ns / element`);
    }

    {
        const nodeManager = new NodeManagerJsUint8Array<Uint8Array>();
        const tree = new Tree(nodeManager);
        for (const key of uint8Arrays) {
            tree.addNode(key, empty);
        }

        const start = process.hrtime.bigint();

        for (let l = 0; l < LOOPS; ++l) {
            for (const key of uint8Arrays) {
                tree.getClosestNode(key);
            }
        }
        console.log(`JS search: ${(process.hrtime.bigint() - start) / BigInt(LOOPS) / BigInt(NUMBER_OF_ELEMENTS)}ns / element`);
    }

    if (global.gc) {
        global.gc();
        const usageBefore = process.memoryUsage().heapUsed;
        const nodeManager = new NodeManagerJsUint8Array<Uint8Array>();
        const tree = new Tree(nodeManager);
        for (const key of uint8Arrays) {
            tree.addNode(key, empty);
        }
        global.gc();

        console.log(`JS heap usage when idle: ${((process.memoryUsage().heapUsed - usageBefore) / 1024 / 1024).toFixed(2)}MiB`);
    } else {
        console.log(`Start with node --expose-gc (which ts-node) ${process.argv[1]} to enable heap usage measuring`);
    }
}

{
    {
        const start = process.hrtime.bigint();
        for (let l = 0; l < LOOPS; ++l) {
            const nodeManager = NodeManagerBinaryMemory.create(uint8Arrays.length, 32, 0);
            const tree = new Tree(nodeManager);

            for (const key of uint8Arrays) {
                tree.addNode(key, empty);
            }
        }
        console.log(`Binary Memory addition: ${(process.hrtime.bigint() - start) / BigInt(LOOPS) / BigInt(NUMBER_OF_ELEMENTS)}ns / element`);
    }

    {
        const nodeManager = NodeManagerBinaryMemory.create(uint8Arrays.length, 32, 0);
        const tree = new Tree(nodeManager);
        for (const key of uint8Arrays) {
            tree.addNode(key, empty);
        }

        const start = process.hrtime.bigint();
        for (let l = 0; l < LOOPS; ++l) {
            for (const key of uint8Arrays) {
                tree.getClosestNode(key);
            }
        }
        console.log(`Binary Memory search: ${(process.hrtime.bigint() - start) / BigInt(LOOPS) / BigInt(NUMBER_OF_ELEMENTS)}ns / element`);
    }

    if (global.gc) {
        global.gc();
        const usageBefore = process.memoryUsage().heapUsed;
        const nodeManager = NodeManagerBinaryMemory.create(uint8Arrays.length, 32, 0);
        const tree = new Tree(nodeManager);
        for (const key of uint8Arrays) {
            tree.addNode(key, empty);
        }
        global.gc();

        // TODO: Figure out why this thing gives negative memory difference, it doesn't make sense
        console.log(`Binary Memory heap usage when idle: ${((process.memoryUsage().heapUsed - usageBefore) / 1024 / 1024).toFixed(2)}MiB`);
    } else {
        console.log(`Start with node --expose-gc (which ts-node) ${process.argv[1]} to enable heap usage measuring`);
    }
}

(async () => {
    {
        const nodeManager = await NodeManagerBinaryDisk.create(__dirname + '/binary-disk-benchmark.bin', NUMBER_OF_ELEMENTS, 32, 0);
        const start = process.hrtime.bigint();
        const tree = new TreeAsync(nodeManager);
        for (let i = 0; i < NUMBER_OF_ELEMENTS; ++i) {
            await tree.addNode(uint8Arrays[i], empty);
        }
        console.log(`Binary Disk addition: ${(process.hrtime.bigint() - start) / 1024n / BigInt(NUMBER_OF_ELEMENTS)}us / element`);
        await nodeManager.close();
    }

    {
        const nodeManager = await NodeManagerBinaryDisk.create(__dirname + '/binary-disk-benchmark.bin', NUMBER_OF_ELEMENTS, 32, 0);
        const tree = new TreeAsync(nodeManager);
        for (let i = 0; i < NUMBER_OF_ELEMENTS; ++i) {
            await tree.addNode(uint8Arrays[i], empty);
        }

        const start = process.hrtime.bigint();
        for (let i = 0; i < NUMBER_OF_ELEMENTS; ++i) {
            await tree.getClosestNode(uint8Arrays[i]);
        }
        console.log(`Binary Disk search: ${(process.hrtime.bigint() - start) / 1024n / BigInt(NUMBER_OF_ELEMENTS)}us / element`);
        await nodeManager.close();
    }

    if (global.gc) {
        global.gc();
        const usageBefore = process.memoryUsage().heapUsed;
        const nodeManager = await NodeManagerBinaryDisk.create(__dirname + '/binary-disk-benchmark.bin', NUMBER_OF_ELEMENTS, 32, 0);
        const tree = new TreeAsync(nodeManager);
        for (let i = 0; i < NUMBER_OF_ELEMENTS; ++i) {
            await tree.addNode(uint8Arrays[i], empty);
        }
        global.gc();
        await nodeManager.close();

        // TODO: Figure out why this thing gives negative memory difference, it doesn't make sense
        console.log(`Binary Disk heap usage when idle: ${((process.memoryUsage().heapUsed - usageBefore) / 1024 / 1024).toFixed(2)}MiB`);
    } else {
        console.log(`Start with node --expose-gc (which ts-node) ${process.argv[1]} to enable heap usage measuring`);
    }

    // unlinkSync(__dirname + '/binary-disk-benchmark.bin');

    {
        const rocksDb = level(__dirname + '/rocksdb-benchmark.bin');
        const start = process.hrtime.bigint();
        for (let i = 0; i < NUMBER_OF_ELEMENTS; ++i) {
            await rocksDb.put(buffers[i], emptyBuffer);
        }
        console.log(`RocksDB addition: ${(process.hrtime.bigint() - start) / 1024n / BigInt(NUMBER_OF_ELEMENTS)}us / element`);
        await rocksDb.close();
        rmdirRecursiveSync(__dirname + '/rocksdb-benchmark.bin');
    }

    {
        const rocksDb = level(__dirname + '/rocksdb-benchmark.bin');
        for (let i = 0; i < NUMBER_OF_ELEMENTS; ++i) {
            await rocksDb.put(buffers[i], emptyBuffer);
        }

        const start = process.hrtime.bigint();
        for (let i = 0; i < NUMBER_OF_ELEMENTS; ++i) {
            await rocksDb.get(buffers[i]);
        }
        console.log(`RocksDB search: ${(process.hrtime.bigint() - start) / 1024n / BigInt(NUMBER_OF_ELEMENTS)}us / element`);
        await rocksDb.close();
        rmdirRecursiveSync(__dirname + '/rocksdb-benchmark.bin');
    }

    if (global.gc) {
        global.gc();
        const usageBefore = process.memoryUsage().heapUsed;

        const rocksDb = level(__dirname + '/rocksdb-benchmark.bin');
        for (let i = 0; i < NUMBER_OF_ELEMENTS; ++i) {
            await rocksDb.put(buffers[i], emptyBuffer);
        }
        global.gc();
        await rocksDb.close();
        // rmdirRecursiveSync(__dirname + '/rocksdb-benchmark.bin');

        // TODO: Figure out why this thing gives negative memory difference, it doesn't make sense
        console.log(`RocksDB heap usage when idle: ${((process.memoryUsage().heapUsed - usageBefore) / 1024 / 1024).toFixed(2)}MiB`);
    } else {
        console.log(`Start with node --expose-gc (which ts-node) ${process.argv[1]} to enable heap usage measuring`);
    }
})();
