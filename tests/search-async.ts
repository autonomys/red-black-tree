import * as test from "tape";
import {NodeManagerBinaryDisk, TreeAsync} from "../src";

test('Search', async (t) => {
    const keys: number[] = [];
    for (let i = 10; i < 250; ++i) {
        keys.push(i);
    }

    const nodeManager = await NodeManagerBinaryDisk.create(__dirname + '/binary-disk-test.bin', 300, 1, 0);
    const tree = new TreeAsync(nodeManager);
    for (const key of keys) {
        await tree.addNode(Uint8Array.of(key), new Uint8Array(0));
    }

    {
        const result = await tree.getClosestNode(Uint8Array.of(1));
        t.same(
            result && result[0][0],
            10,
            'Non-existing lower end takes closest key',
        );
    }

    {
        const result = await tree.getClosestNode(Uint8Array.of(255));
        t.same(
            result && result[0][0],
            249,
            'Non-existing higher end takes closest key',
        );
    }

    {
        const result = await tree.getClosestNode(Uint8Array.of(128));
        t.same(
            result && result[0][0],
            128,
            'Existing takes exact key',
        );
    }

    t.end();
});
