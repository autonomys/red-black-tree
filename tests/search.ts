import * as test from "tape";
import {NodeManagerJsNumber} from "../src/NodeManagerJsNumber";
import {Tree} from "../src/Tree";

test('Search', (t) => {
    const keys: number[] = [];
    for (let i = 10; i < 250; ++i) {
        keys.push(i);
    }

    const nodeManager = new NodeManagerJsNumber<null>();
    const tree = new Tree(nodeManager);
    for (const key of keys) {
        tree.addNode(key, null);
    }

    t.same(
        tree.getClosestNode(1),
        10,
        'Non-existing lower end takes closest key',
    );

    t.same(
        tree.getClosestNode(255),
        249,
        'Non-existing higher end takes closest key',
    );

    t.same(
        tree.getClosestNode(128),
        128,
        'Existing takes exact key',
    );

    t.end();
});
