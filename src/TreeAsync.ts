import {INode} from "./interfaces/INode";
import {INodeAsync} from "./interfaces/INodeAsync";
import {INodeManagerAsync} from "./interfaces/INodeManagerAsync";
import {fixTree, removeNodeImplementationAsync} from "./RedBlackTreeMechanics";

export class TreeAsync<K, V> {
    constructor(private nodeManager: INodeManagerAsync<K, V>) {
    }

    /**
     * Add nodes to a tree one by one (for incremental updates)
     *
     * @param key  A key to be indexed, e.g. a 32 byte piece id
     * @param value Value to be associated with a key
     */
    public async addNode(key: K, value: V): Promise<void> {
        await this.nodeManager.writeTransaction(() => {
            return this.addNodeInternal(key, value);
        });
        this.nodeManager.cleanup();
    }

    /**
     * Remove a node from the tree
     *
     * @param key A key to be removed, e.g. a 32 byte piece id
     */
    public async removeNode(key: K): Promise<void> {
        await this.nodeManager.writeTransaction(() => {
            return this.removeNodeInternal(key);
        });
        this.nodeManager.cleanup();
    }

    /**
     * Get the node value by target key
     *
     * @param targetKey
     *
     * @return
     */
    public async getNodeValue(targetKey: K): Promise<V | null> {
        const result = await this.getClosestNodeInternal(targetKey);
        if (result && this.nodeManager.compare(result[0], targetKey) === 0) {
            return result[1];
        }
        return null;
    }

    /**
     * Get the closest node key/value in a tree to a given target key
     *
     * @param targetKey
     *
     * @return The closest key and its value to the challenge or `null` if no nodes are available
     */
    public async getClosestNode(targetKey: K): Promise<[K, V] | null> {
        const result = await this.nodeManager.readTransaction(() => {
            return this.getClosestNodeInternal(targetKey);
        });
        this.nodeManager.cleanup();
        return result;
    }

    private async addNodeInternal(key: K, value: V): Promise<void> {
        const nodeManager = this.nodeManager;
        const nodeToInsert = await nodeManager.addNodeAsync(key, value);

        const root = await nodeManager.getRootAsync();
        if (!root) {
            nodeToInsert.setIsRed(false);
            nodeManager.setRoot(nodeToInsert);
        } else {
            let currentNode = root;
            const path: Array<INode<K, V>> = [];
            while (true) {
                path.push(currentNode);
                // Force reading both children, we may need them during tree fixing process and unless they are in cache, `getLeft()` and `getRight()` methods
                // will fail for `INodeAsync`
                const left = await currentNode.getLeftAsync();
                const right = await currentNode.getRightAsync();
                switch (nodeManager.compare(nodeToInsert.getKey(), currentNode.getKey())) {
                    case -1:
                        if (left) {
                            currentNode = left;
                            break;
                        } else {
                            currentNode.setLeft(nodeToInsert);
                            path.push(nodeToInsert);
                            fixTree(this.nodeManager, path);
                            return;
                        }
                    case 1:
                        if (right) {
                            currentNode = right;
                            break;
                        } else {
                            currentNode.setRight(nodeToInsert);
                            path.push(nodeToInsert);
                            fixTree(this.nodeManager, path);
                            return;
                        }
                    default:
                        // We do not insert the same key again
                        return;
                }
            }
        }
    }

    private async removeNodeInternal(key: K): Promise<void> {
        const nodeManager = this.nodeManager;
        const root = await nodeManager.getRootAsync();

        if (!root) {
            throw new Error("Tree is empty, nothing to delete");
        }

        if (!await root.getLeftAsync() && !await root.getRightAsync()) {
            nodeManager.setRoot(null);
            return;
        }
        let currentNode = root;
        const path: Array<INodeAsync<K, V>> = [];
        while (true) {
            path.push(currentNode);
            switch (nodeManager.compare(key, currentNode.getKey())) {
                case -1:
                    const left = await currentNode.getLeftAsync();
                    if (left) {
                        currentNode = left;
                        break;
                    } else {
                        throw new Error("Can't delete a key, it doesn't exist");
                    }
                case 1:
                    const right = await currentNode.getRightAsync();
                    if (right) {
                        currentNode = right;
                        break;
                    } else {
                        throw new Error("Can't delete a key, it doesn't exist");
                    }
                default:
                    if (currentNode === root && !root.getLeft() && !root.getRight()) {
                        nodeManager.setRoot(null);
                        return;
                    }
                    await removeNodeImplementationAsync(this.nodeManager, path);
                    await nodeManager.removeNodeAsync(currentNode);
                    return;
            }
        }
    }

    private async getClosestNodeInternal(targetKey: K): Promise<[K, V] | null> {
        const nodeManager = this.nodeManager;
        let currentNode = await nodeManager.getRootAsync();
        if (!currentNode) {
            return null;
        }
        while (true) {
            const key = currentNode.getKey();
            switch (nodeManager.compare(targetKey, key)) {
                case -1:
                    // TypeScript fails to infer type, so have to specify it explicitly
                    const left: INodeAsync<K, V> | null = await currentNode.getLeftAsync();
                    if (left) {
                        currentNode = left;
                        break;
                    } else {
                        return [key, await currentNode.getValueAsync()];
                    }
                case 1:
                    // TypeScript fails to infer type, so have to specify it explicitly
                    const right: INodeAsync<K, V> | null = await currentNode.getRightAsync();
                    if (right) {
                        currentNode = right;
                        break;
                    } else {
                        return [key, await currentNode.getValueAsync()];
                    }
                default:
                    return [key, await currentNode.getValueAsync()];
            }
        }
    }
}
