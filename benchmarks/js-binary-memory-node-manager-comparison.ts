/* tslint:disable:no-console */
import {randomBytes} from "crypto";
import {NodeManagerJsUint8Array, Tree} from "../src";
import {NodeManagerBinaryMemory} from "../src/NodeManagerBinaryMemory";

const LOOPS = 100;

console.log('Preparing');

const uint8Arrays: Uint8Array[] = [];

for (let i = 0; i < 2 ** 14; ++i) {
    const randomValue = randomBytes(32);
    uint8Arrays.push(
        Uint8Array.from(randomValue),
    );
}

console.log('Benchmarking');

const empty = new Uint8Array(0);

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
        console.log(`JS addition: ${(process.hrtime.bigint() - start) / 1000000n}ms`);
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
        console.log(`JS search: ${(process.hrtime.bigint() - start) / 1000000n}ms`);
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
        console.log(`Binary Memory addition: ${(process.hrtime.bigint() - start) / 1000000n}ms`);
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
        console.log(`Binary Memory search: ${(process.hrtime.bigint() - start) / 1000000n}ms`);
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
