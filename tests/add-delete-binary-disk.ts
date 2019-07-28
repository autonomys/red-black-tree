import { unlinkSync } from "fs";
import shuffle = require("shuffle-array");
import * as test from "tape";
import {INodeAsync, NodeManagerBinaryDisk, TreeAsync} from "../src";

async function validateRulesFollowed(t: test.Test, baseMessage: string, nodesManager: NodeManagerBinaryDisk, expectedNumberOfNodes: number): Promise<void> {
    const root = await nodesManager.getRootAsync();
    if (root === null) {
        t.equal(expectedNumberOfNodes, 0, `${baseMessage}: Expected number of nodes is correct`);
        return;
    }

    t.ok(!root.getIsRed(), `${baseMessage}: Root is black`);
    t.equal(expectedNumberOfNodes, await getNumberOfNotNullNodes(root), `${baseMessage}: Expected number of nodes is correct`);
    t.ok(checkOrder(root), `${baseMessage}: Order of nodes is correct`);
    t.ok(checkHeight(root), `${baseMessage}: Height of sub-trees is correct`);
}

function checkOrder(node: INodeAsync<Uint8Array, Uint8Array>): boolean {
    const left = node.getLeft();
    const right = node.getRight();
    if (!node.getIsRed()) {
        return (
            (
                !left ||
                checkOrder(left)
            ) &&
            (
                !right ||
                checkOrder(right)
            )
        );
    }
    return (
        (
            !left ||
            (
                !left.getIsRed() &&
                checkOrder(left)
            )
        ) &&
        (
            !right ||
            (
                !right.getIsRed() &&
                checkOrder(right)
            )
        )
    );
}

function checkHeight(node: INodeAsync<Uint8Array, Uint8Array>): boolean {
    return getHeight(node) !== false;
}

function getHeight(node: INodeAsync<Uint8Array, Uint8Array> | null): number | false {
    if (!node) {
        return 1;
    }
    const leftHeight = getHeight(node.getLeft());
    const rightHeight = getHeight(node.getRight());
    if (leftHeight !== rightHeight || leftHeight === false) {
        return false;
    }
    return (node.getIsRed() ? 0 : 1) + leftHeight;
}

async function getNumberOfNotNullNodes(node: INodeAsync<Uint8Array, Uint8Array> | null): Promise<number> {
    if (node === null) {
        return 0;
    }

    return 1 + await getNumberOfNotNullNodes(await node.getLeftAsync()) + await getNumberOfNotNullNodes(await node.getRightAsync());
}

test('Basic test', async (t) => {
    const keys: Uint8Array[] = [];
    for (let i = 0; i < 8; ++i) {
        for (let j = 0; j < 255; ++j) {
            keys.push(Uint8Array.of(i, j));
        }
    }

    const nodeManager = await NodeManagerBinaryDisk.create(__dirname + '/binary-disk-test.bin', keys.length, 2, 0);
    const tree = new TreeAsync(nodeManager);
    let expectedNumberOfNodes = 0;
    for (const key of keys) {
        ++expectedNumberOfNodes;
        await tree.addNode(key, new Uint8Array(0));
        await validateRulesFollowed(t, `Inserting key [${key.join(', ')}]`, nodeManager, expectedNumberOfNodes);
    }
    shuffle(keys);

    for (const key of keys) {
        --expectedNumberOfNodes;
        await tree.removeNode(key);
        await validateRulesFollowed(t, `Deleting key [${key.join(', ')}]`, nodeManager, expectedNumberOfNodes);
    }

    await nodeManager.close();

    unlinkSync(__dirname + '/binary-disk-test.bin');

    t.end();
});
