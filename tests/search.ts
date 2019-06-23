import * as test from "tape";
import {Tree} from "../src/Tree";

test('Search', (t) => {
    const keys: Uint8Array[] = [];
    for (let i = 10; i < 250; ++i) {
        keys.push(Uint8Array.of(i));
    }

    const tree = new Tree();
    for (const key of keys) {
        tree.addNode(key, null);
    }

    t.same(
        tree.getClosestNode(Uint8Array.of(1)),
        Uint8Array.of(10),
        'Non-existing lower end takes closest key',
    );

    t.same(
        tree.getClosestNode(Uint8Array.of(255)),
        Uint8Array.of(249),
        'Non-existing higher end takes closest key',
    );

    t.same(
        tree.getClosestNode(Uint8Array.of(128)),
        Uint8Array.of(128),
        'Existing takes exact key',
    );

    t.end();
});
