import {INode} from "./interfaces/INode";
import {INodeAsync} from "./interfaces/INodeAsync";
import {INodeManagerBase} from "./interfaces/INodeManagerBase";
import {RuntimeError} from "./RuntimeError";

function isNullOrBlack<K, V>(node: INode<K, V> | null): boolean {
    return (
        !node ||
        !node.getIsRed()
    );
}

function isRed<K, V>(node: INode<K, V> | null): boolean {
    return Boolean(node && node.getIsRed());
}

export function fixTree<K, V>(nodeManager: INodeManagerBase<K, V>, path: Array<INode<K, V>>): void {
    while (path.length) {
        const targetNode = path.pop();
        if (!targetNode) {
            throw new RuntimeError("Can't fix path without target node, this should never happen");
        }
        const parent = path.pop();
        // `targetNode` is root, nothing left to do
        if (!parent) {
            return;
        }
        // No conflict, nothing left to do
        if (!parent.getIsRed()) {
            return;
        }
        const grandParent = path.pop();
        if (!grandParent) {
            parent.setIsRed(false);
            return;
        }
        const grandParentLeft = grandParent.getLeft();
        const grandParentRight = grandParent.getRight();
        const uncle = grandParentLeft === parent ? grandParentRight : grandParentLeft;
        // Here we handle `null` as black `nil` node implicitly, since we do not create `nil` nodes as such
        if (uncle && uncle.getIsRed()) {
            parent.setIsRed(!parent.getIsRed());
            grandParent.setIsRed(grandParent === nodeManager.getRoot() ? false : !grandParent.getIsRed());
            uncle.setIsRed(false);
            path.push(grandParent);
            continue;
        }

        // Triangle cases
        if (
            parent.getLeft() === targetNode &&
            grandParentRight === parent
        ) {
            rotateRight(nodeManager, parent, grandParent);
            path.push(grandParent, targetNode, parent);
            continue;
        } else if (
            parent.getRight() === targetNode &&
            grandParentLeft === parent
        ) {
            rotateLeft(nodeManager, parent, grandParent);
            path.push(grandParent, targetNode, parent);
            continue;
        }

        const grandGrandParent = path.pop() || null;
        // Line cases
        if (parent.getLeft() === targetNode) {
            rotateRight(nodeManager, grandParent, grandGrandParent);
        } else {
            rotateLeft(nodeManager, grandParent, grandGrandParent);
        }
        parent.setIsRed(!parent.getIsRed());
        grandParent.setIsRed(!grandParent.getIsRed());
        break;
    }
}

/**
 * @param nodeManager
 * @param rotationNode
 * @param parent       `null` if `rotationNode` is root
 */
function rotateLeft<K, V>(nodeManager: INodeManagerBase<K, V>, rotationNode: INode<K, V>, parent: INode<K, V> | null): void {
    const originalRightNode = rotationNode.getRight();
    if (!originalRightNode) {
        throw new RuntimeError('Right children of rotation node is null, this should never happen');
    }
    rotationNode.setRight(originalRightNode.getLeft());
    originalRightNode.setLeft(rotationNode);

    rotateFixParentConnection(nodeManager, rotationNode, originalRightNode, parent);
}

/**
 * @param nodeManager
 * @param rotationNode
 * @param parent       `null` if `rotationNode` is root
 */
function rotateRight<K, V>(nodeManager: INodeManagerBase<K, V>, rotationNode: INode<K, V>, parent: INode<K, V> | null): void {
    const originalLeftNode = rotationNode.getLeft();
    if (!originalLeftNode) {
        throw new RuntimeError('Left children of rotation node is null, this should never happen');
    }
    rotationNode.setLeft(originalLeftNode.getRight());
    originalLeftNode.setRight(rotationNode);

    rotateFixParentConnection(nodeManager, rotationNode, originalLeftNode, parent);
}

function rotateFixParentConnection<K, V>(
    nodeManager: INodeManagerBase<K, V>,
    rotationNode: INode<K, V>,
    originalNode: INode<K, V>,
    parent: INode<K, V> | null,
): void {
    if (parent) {
        if (parent.getLeft() === rotationNode) {
            parent.setLeft(originalNode);
        } else {
            parent.setRight(originalNode);
        }
    } else {
        nodeManager.setRoot(originalNode);
    }
}

export function removeNodeImplementation<K, V>(nodeManager: INodeManagerBase<K, V>, path: Array<INode<K, V>>): void {
    const nodeToRemove = path.pop() as INode<K, V>;
    const parentNode = path.pop() || null;
    const xPath = path.slice();
    const xAndReplacement = determineXAndReplacement(nodeToRemove, parentNode, xPath);
    const [x, replacement] = xAndReplacement;
    let replacementParent = xAndReplacement[2];

    if (!parentNode) {
        if (!replacement) {
            throw new Error('Deleting root mode, but replacement is null, this should never happen');
        }
        nodeManager.setRoot(replacement);
    } else {
        if (parentNode.getLeft() === nodeToRemove) {
            parentNode.setLeft(replacement);
        } else {
            parentNode.setRight(replacement);
        }
    }

    if (replacement) {
        const nodeToRemoveLeft = nodeToRemove.getLeft();
        const nodeToRemoveRight = nodeToRemove.getRight();
        if (nodeToRemoveRight === replacement) {
            replacement.setLeft(nodeToRemoveLeft);
            if (replacement !== x) {
                replacement.setRight(x);
                replacementParent = replacement;
                xPath.pop();
            }
        } else if (nodeToRemoveLeft === replacement) {
            replacement.setRight(nodeToRemoveRight);
            if (replacement !== x) {
                replacement.setLeft(x);
                replacementParent = replacement;
                xPath.pop();
            }
        } else {
            replacement.setLeft(nodeToRemoveLeft);
            replacement.setRight(nodeToRemoveRight);
            if (replacementParent) {
                if (replacementParent.getLeft() === replacement) {
                    replacementParent.setLeft(x);
                } else {
                    replacementParent.setRight(x);
                }
            }
        }
    }

    const nodeToRemoveIsRed = nodeToRemove.getIsRed();
    if (
        nodeToRemoveIsRed &&
        (
            !replacement ||
            replacement.getIsRed()
        )
    ) {
        return;
    }

    if (
        nodeToRemoveIsRed &&
        replacement &&
        !replacement.getIsRed()
    ) {
        replacement.setIsRed(true);
        handleRemovalCases(nodeManager, x, replacementParent, xPath);
        return;
    }

    if (
        !nodeToRemoveIsRed &&
        replacement &&
        replacement.getIsRed()
    ) {
        replacement.setIsRed(false);
        return;
    }

    handleRemovalCases(nodeManager, x, replacementParent, xPath);
}

/**
 * @param nodeToRemove
 * @param nodeToRemoveParent
 * @param xPath
 *
 * @return [x, replacement, replacementParent, replacementToTheLeft]
 */
function determineXAndReplacement<K, V>(
    nodeToRemove: INode<K, V>,
    nodeToRemoveParent: INode<K, V> | null,
    xPath: Array<INode<K, V>>,
): [
    INode<K, V> | null,
    INode<K, V> | null,
    INode<K, V> | null,
    boolean
] {
    const nodeToRemoveLeft = nodeToRemove.getLeft();
    const nodeToRemoveRight = nodeToRemove.getRight();
    if (!nodeToRemoveLeft || !nodeToRemoveRight) {
        const replacement = nodeToRemoveLeft || nodeToRemoveRight;
        return [
            replacement,
            replacement,
            replacement ? nodeToRemove : nodeToRemoveParent,
            Boolean(nodeToRemoveLeft),
        ];
    }

    let replacement = nodeToRemoveRight;
    let replacementParent = nodeToRemove;
    if (nodeToRemoveParent) {
        xPath.push(nodeToRemoveParent);
    }
    const xPathExtra: Array<INode<K, V>> = [];
    let left: INode<K, V> | null = replacement.getLeft();
    while (left) {
        replacementParent = replacement;
        replacement = left;
        xPathExtra.push(replacementParent);
        left = replacement.getLeft();
    }
    xPathExtra.pop();
    xPath.push(replacement, ...xPathExtra);

    return [
        replacement.getRight(),
        replacement,
        replacementParent,
        false,
    ];
}

function handleRemovalCases<K, V>(nodeManager: INodeManagerBase<K, V>, x: INode<K, V> | null, xParent: INode<K, V> | null, xPath: Array<INode<K, V>>): void {
    while (true) {
        if (!xParent) {
            return;
        }

        let xParentLeft = xParent.getLeft();
        let xParentRight = xParent.getRight();
        if (!xParentLeft && !xParentRight) {
            xParent.setIsRed(false);
            return;
        }

        // Case 0
        if (x && x.getIsRed()) {
            x.setIsRed(false);
            return;
        }

        let w = xParentLeft === x ? xParentRight : xParentLeft;

        // Case 1
        if (
            (
                !x ||
                !x.getIsRed()
            ) &&
            (
                w &&
                w.getIsRed()
            )
        ) {
            w.setIsRed(false);
            xParent.setIsRed(true);
            const xParentParent = xPath.pop() || null;
            if (xParentLeft === x) {
                rotateLeft(nodeManager, xParent, xParentParent);
            } else {
                rotateRight(nodeManager, xParent, xParentParent);
            }
            xParentLeft = xParent.getLeft();
            xParentRight = xParent.getRight();
            xPath.push(w);

            w = xParentLeft === x ? xParentRight : xParentLeft;
        }

        let wLeft = w && w.getLeft();
        let wRight = w && w.getRight();

        // Case 2
        if (
            (
                !x ||
                !x.getIsRed()
            ) &&
            w &&
            !w.getIsRed() &&
            (
                isNullOrBlack(wLeft) &&
                isNullOrBlack(wRight)
            )
        ) {
            w.setIsRed(true);
            x = xParent;
            if (x.getIsRed()) {
                x.setIsRed(false);
                return;
            } else {
                xParent = xPath.pop() as INode<K, V>;
                if (!xParent) {
                    return;
                }
                continue;
            }
        }

        // Case 3
        if (
            (
                !x ||
                !x.getIsRed()
            ) &&
            w &&
            !w.getIsRed() &&
            (
                (
                    xParentLeft === x &&
                    isRed(wLeft) &&
                    isNullOrBlack(wRight)
                ) ||
                (
                    xParentRight === x &&
                    isRed(wRight) &&
                    isNullOrBlack(wLeft)
                )
            )
        ) {
            if (xParentLeft === x) {
                const left = wLeft;
                if (left) {
                    left.setIsRed(false);
                }
            } else if (xParentRight === x) {
                const right = wRight;
                if (right) {
                    right.setIsRed(false);
                }
            }
            w.setIsRed(true);
            if (xParentLeft === x) {
                rotateRight(nodeManager, w, xParent);
            } else {
                rotateLeft(nodeManager, w, xParent);
            }
            w = xParentLeft === x ? xParentRight : xParentLeft;
            wLeft = w && w.getLeft();
            wRight = w && w.getRight();
        }

        // Case 4
        if (
            (
                !x ||
                !x.getIsRed()
            ) &&
            w &&
            !w.getIsRed() &&
            (
                (
                    xParentLeft === x &&
                    isRed(wRight)
                ) ||
                (
                    xParentRight === x &&
                    isRed(wLeft)
                )
            )
        ) {
            w.setIsRed(xParent.getIsRed());
            xParent.setIsRed(false);
            const xParentParent = xPath.pop() || null;
            if (xParentLeft === x) {
                const right = wRight;
                if (right) {
                    right.setIsRed(false);
                }
                rotateLeft(nodeManager, xParent, xParentParent);
            } else if (xParentRight === x) {
                const left = wLeft;
                if (left) {
                    left.setIsRed(false);
                }
                rotateRight(nodeManager, xParent, xParentParent);
            }
            return;
        }
    }
}

// Functions below are exactly the same as above, but use asynchronous node API

/**
 * @param nodeManager
 * @param rotationNode
 * @param parent       `null` if `rotationNode` is root
 */
async function rotateLeftAsync<K, V>(nodeManager: INodeManagerBase<K, V>, rotationNode: INodeAsync<K, V>, parent: INodeAsync<K, V> | null): Promise<void> {
    const originalRightNode = await rotationNode.getRightAsync();
    if (!originalRightNode) {
        throw new RuntimeError('Right children of rotation node is null, this should never happen');
    }
    rotationNode.setRight(await originalRightNode.getLeftAsync());
    originalRightNode.setLeft(rotationNode);

    rotateFixParentConnectionAsync(nodeManager, rotationNode, originalRightNode, parent);
}

/**
 * @param nodeManager
 * @param rotationNode
 * @param parent       `null` if `rotationNode` is root
 */
async function rotateRightAsync<K, V>(nodeManager: INodeManagerBase<K, V>, rotationNode: INodeAsync<K, V>, parent: INodeAsync<K, V> | null): Promise<void> {
    const originalLeftNode = await rotationNode.getLeftAsync();
    if (!originalLeftNode) {
        throw new RuntimeError('Left children of rotation node is null, this should never happen');
    }
    rotationNode.setLeft(await originalLeftNode.getRightAsync());
    originalLeftNode.setRight(rotationNode);

    rotateFixParentConnectionAsync(nodeManager, rotationNode, originalLeftNode, parent);
}

async function rotateFixParentConnectionAsync<K, V>(
    nodeManager: INodeManagerBase<K, V>,
    rotationNode: INodeAsync<K, V>,
    originalNode: INodeAsync<K, V>,
    parent: INodeAsync<K, V> | null,
): Promise<void> {
    if (parent) {
        if (await parent.getLeftAsync() === rotationNode) {
            parent.setLeft(originalNode);
        } else {
            parent.setRight(originalNode);
        }
    } else {
        nodeManager.setRoot(originalNode);
    }
}

export async function removeNodeImplementationAsync<K, V>(nodeManager: INodeManagerBase<K, V>, path: Array<INodeAsync<K, V>>): Promise<void> {
    const nodeToRemove = path.pop() as INodeAsync<K, V>;
    const parentNode = path.pop() || null;
    const xPath = path.slice();
    const xAndReplacement = await determineXAndReplacementAsync(nodeToRemove, parentNode, xPath);
    const [x, replacement] = xAndReplacement;
    let replacementParent = xAndReplacement[2];

    if (!parentNode) {
        if (!replacement) {
            throw new Error('Deleting root mode, but replacement is null, this should never happen');
        }
        nodeManager.setRoot(replacement);
    } else {
        if (await parentNode.getLeftAsync() === nodeToRemove) {
            parentNode.setLeft(replacement);
        } else {
            parentNode.setRight(replacement);
        }
    }

    if (replacement) {
        const nodeToRemoveLeft = await nodeToRemove.getLeftAsync();
        const nodeToRemoveRight = await nodeToRemove.getRightAsync();
        if (nodeToRemoveRight === replacement) {
            replacement.setLeft(nodeToRemoveLeft);
            if (replacement !== x) {
                replacement.setRight(x);
                replacementParent = replacement;
                xPath.pop();
            }
        } else if (nodeToRemoveLeft === replacement) {
            replacement.setRight(nodeToRemoveRight);
            if (replacement !== x) {
                replacement.setLeft(x);
                replacementParent = replacement;
                xPath.pop();
            }
        } else {
            replacement.setLeft(nodeToRemoveLeft);
            replacement.setRight(nodeToRemoveRight);
            if (replacementParent) {
                if (await replacementParent.getLeftAsync() === replacement) {
                    replacementParent.setLeft(x);
                } else {
                    replacementParent.setRight(x);
                }
            }
        }
    }

    const nodeToRemoveIsRed = nodeToRemove.getIsRed();
    if (
        nodeToRemoveIsRed &&
        (
            !replacement ||
            replacement.getIsRed()
        )
    ) {
        return;
    }

    if (
        nodeToRemoveIsRed &&
        replacement &&
        !replacement.getIsRed()
    ) {
        replacement.setIsRed(true);
        await handleRemovalCasesAsync(nodeManager, x, replacementParent, xPath);
        return;
    }

    if (
        !nodeToRemoveIsRed &&
        replacement &&
        replacement.getIsRed()
    ) {
        replacement.setIsRed(false);
        return;
    }

    await handleRemovalCasesAsync(nodeManager, x, replacementParent, xPath);
}

/**
 * @param nodeToRemove
 * @param nodeToRemoveParent
 * @param xPath
 *
 * @return [x, replacement, replacementParent, replacementToTheLeft]
 */
async function determineXAndReplacementAsync<K, V>(
    nodeToRemove: INodeAsync<K, V>,
    nodeToRemoveParent: INodeAsync<K, V> | null,
    xPath: Array<INodeAsync<K, V>>,
): Promise<[
    INodeAsync<K, V> | null,
    INodeAsync<K, V> | null,
    INodeAsync<K, V> | null,
    boolean
]> {
    const nodeToRemoveLeft = await nodeToRemove.getLeftAsync();
    const nodeToRemoveRight = await nodeToRemove.getRightAsync();
    if (!nodeToRemoveLeft || !nodeToRemoveRight) {
        const replacement = nodeToRemoveLeft || nodeToRemoveRight;
        return [
            replacement,
            replacement,
            replacement ? nodeToRemove : nodeToRemoveParent,
            Boolean(nodeToRemoveLeft),
        ];
    }

    let replacement = nodeToRemoveRight;
    let replacementParent = nodeToRemove;
    if (nodeToRemoveParent) {
        xPath.push(nodeToRemoveParent);
    }
    const xPathExtra: Array<INodeAsync<K, V>> = [];
    let left: INodeAsync<K, V> | null = await replacement.getLeftAsync();
    while (left) {
        replacementParent = replacement;
        replacement = left;
        xPathExtra.push(replacementParent);
        left = await replacement.getLeftAsync();
    }
    xPathExtra.pop();
    xPath.push(replacement, ...xPathExtra);

    return [
        await replacement.getRightAsync(),
        replacement,
        replacementParent,
        false,
    ];
}

async function handleRemovalCasesAsync<K, V>(nodeManager: INodeManagerBase<K, V>, x: INodeAsync<K, V> | null, xParent: INodeAsync<K, V> | null, xPath: Array<INodeAsync<K, V>>): Promise<void> {
    while (true) {
        if (!xParent) {
            return;
        }

        let xParentLeft = await xParent.getLeftAsync();
        let xParentRight = await xParent.getRightAsync();
        if (!xParentLeft && !xParentRight) {
            xParent.setIsRed(false);
            return;
        }

        // Case 0
        if (x && x.getIsRed()) {
            x.setIsRed(false);
            return;
        }

        let w = xParentLeft === x ? xParentRight : xParentLeft;

        // Case 1
        if (
            (
                !x ||
                !x.getIsRed()
            ) &&
            (
                w &&
                w.getIsRed()
            )
        ) {
            w.setIsRed(false);
            xParent.setIsRed(true);
            const xParentParent = xPath.pop() || null;
            if (xParentLeft === x) {
                await rotateLeftAsync(nodeManager, xParent, xParentParent);
            } else {
                await rotateRightAsync(nodeManager, xParent, xParentParent);
            }
            xParentLeft = await xParent.getLeftAsync();
            xParentRight = await xParent.getRightAsync();
            xPath.push(w);

            w = xParentLeft === x ? xParentRight : xParentLeft;
        }

        let wLeft = w && await w.getLeftAsync();
        let wRight = w && await w.getRightAsync();

        // Case 2
        if (
            (
                !x ||
                !x.getIsRed()
            ) &&
            w &&
            !w.getIsRed() &&
            (
                isNullOrBlack(wLeft) &&
                isNullOrBlack(wRight)
            )
        ) {
            w.setIsRed(true);
            x = xParent;
            if (x.getIsRed()) {
                x.setIsRed(false);
                return;
            } else {
                xParent = xPath.pop() as INodeAsync<K, V>;
                if (!xParent) {
                    return;
                }
                continue;
            }
        }

        // Case 3
        if (
            (
                !x ||
                !x.getIsRed()
            ) &&
            w &&
            !w.getIsRed() &&
            (
                (
                    xParentLeft === x &&
                    isRed(wLeft) &&
                    isNullOrBlack(wRight)
                ) ||
                (
                    xParentRight === x &&
                    isRed(wRight) &&
                    isNullOrBlack(wLeft)
                )
            )
        ) {
            if (xParentLeft === x) {
                const left = wLeft;
                if (left) {
                    left.setIsRed(false);
                }
            } else if (xParentRight === x) {
                const right = wRight;
                if (right) {
                    right.setIsRed(false);
                }
            }
            w.setIsRed(true);
            if (xParentLeft === x) {
                await rotateRightAsync(nodeManager, w, xParent);
            } else {
                await rotateLeftAsync(nodeManager, w, xParent);
            }
            w = xParentLeft === x ? xParentRight : xParentLeft;
            wLeft = w && await w.getLeftAsync();
            wRight = w && await w.getRightAsync();
        }

        // Case 4
        if (
            (
                !x ||
                !x.getIsRed()
            ) &&
            w &&
            !w.getIsRed() &&
            (
                (
                    xParentLeft === x &&
                    isRed(wRight)
                ) ||
                (
                    xParentRight === x &&
                    isRed(wLeft)
                )
            )
        ) {
            w.setIsRed(xParent.getIsRed());
            xParent.setIsRed(false);
            const xParentParent = xPath.pop() || null;
            if (xParentLeft === x) {
                const right = wRight;
                if (right) {
                    right.setIsRed(false);
                }
                await rotateLeftAsync(nodeManager, xParent, xParentParent);
            } else if (xParentRight === x) {
                const left = wLeft;
                if (left) {
                    left.setIsRed(false);
                }
                await rotateRightAsync(nodeManager, xParent, xParentParent);
            }
            return;
        }
    }
}
