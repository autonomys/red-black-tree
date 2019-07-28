import {INodeManager} from "../../..";
import {RuntimeError} from "../../../RuntimeError";
import {compareUint8Array, getNumberFromBytes, maxNumberToBytes, setNumberToBytes} from "../../../utils";
import {NodeBinaryMemory} from "./NodeBinaryMemory";

/**
 * Node manager implementation that can work with any data type supported in Node.js as a value
 */
export class NodeManagerBinaryMemory implements INodeManager<Uint8Array, Uint8Array> {
    /**
     * @param numberOfNodes Max number of nodes that are expected to be stored
     * @param keySize Size of the key in bytes
     * @param valueSize Size of the values associated with a key in bytes
     */
    public static create(numberOfNodes: number, keySize: number, valueSize: number): NodeManagerBinaryMemory {
        // offset starts from 0, but addresses with index of last possible node + 1 will be treated as `null` node for everyone to reference
        const nodeOffsetBytes = maxNumberToBytes(numberOfNodes);
        // 1 byte for red/black flag and 2 * nodeOffsetBytes for left and right children
        const nodeMetadataSize = 1 + nodeOffsetBytes * 2;
        const singleNodeAllocationSize = nodeMetadataSize + keySize + valueSize;
        /**
         * * one offset for the first free offset for the next node to be inserted
         * * one offset for last deleted node that can be used to add another node
         * * one offset for root node offset
         */
        const commonMetadataSize = nodeOffsetBytes * 3;
        const allocationSize = commonMetadataSize + numberOfNodes * singleNodeAllocationSize;
        const buffer = Buffer.allocUnsafe(allocationSize);
        const uint8Array = new Uint8Array(buffer.buffer);

        const instance = new NodeManagerBinaryMemory(
            uint8Array,
            numberOfNodes,
            nodeOffsetBytes,
            keySize,
            valueSize,
            singleNodeAllocationSize,
        );

        instance.setFreeNodeOffset(0);
        instance.setDeletedNodeOffset(numberOfNodes);
        instance.setRootNodeOffset(numberOfNodes);

        return instance;
    }

    public compare = compareUint8Array;

    private rootCache: NodeBinaryMemory | null | undefined = undefined;
    private freeNodeOffset: number;
    private deletedNodeOffset: number;
    private rootNodeOffset: number;

    private constructor(
        private readonly uint8Array: Uint8Array,
        private readonly numberOfNodes: number,
        private readonly nodeOffsetBytes: number,
        private readonly keySize: number,
        private readonly valueSize: number,
        private readonly singleNodeAllocationSize: number,
    ) {
        this.freeNodeOffset = getNumberFromBytes(this.uint8Array, 0, this.nodeOffsetBytes);
        this.deletedNodeOffset = getNumberFromBytes(this.uint8Array, nodeOffsetBytes, nodeOffsetBytes);
        this.rootNodeOffset = getNumberFromBytes(this.uint8Array, nodeOffsetBytes * 2, nodeOffsetBytes);
    }

    public getRoot(): NodeBinaryMemory | null {
        if (this.rootCache === undefined) {
            const offset = this.getRootNodeOffset();
            this.rootCache = offset === this.numberOfNodes ? null : this.getNode(offset);
        }

        return this.rootCache;
    }

    public setRoot(node: NodeBinaryMemory | null): void {
        this.rootCache = node;
        if (node === null) {
            this.setRootNodeOffset(this.numberOfNodes);
        } else {
            this.setRootNodeOffset(node.offset);
        }
    }

    public addNode(key: Uint8Array, value: Uint8Array): NodeBinaryMemory {
        const offset = this.allocateOffsetForAddition();
        const singleNodeAllocationSize = this.singleNodeAllocationSize;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        return NodeBinaryMemory.create(
            nodeOffsetBytes,
            this.numberOfNodes,
            this.uint8Array,
            nodeOffsetBytes * 3 + singleNodeAllocationSize * offset,
            offset,
            key,
            value,
            this.getNode.bind(this),
        );
    }

    public removeNode(node: NodeBinaryMemory): void {
        const singleNodeAllocationSize = this.singleNodeAllocationSize;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const offset = node.offset;
        const lastDeletedOffset = this.getDeletedNodeOffset();
        // Store previous last deleted node in currently deleting node data
        setNumberToBytes(
            this.uint8Array,
            nodeOffsetBytes * 3 + singleNodeAllocationSize * offset,
            nodeOffsetBytes,
            lastDeletedOffset,
        );
        // Update last deleted node offset
        this.setDeletedNodeOffset(offset);
    }

    public cleanup(): void {
        this.rootCache = undefined;
    }

    private allocateOffsetForAddition(): number {
        const numberOfNodes = this.numberOfNodes;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const singleNodeAllocationSize = this.singleNodeAllocationSize;

        const offset = this.getFreeNodeOffset();
        if (offset !== numberOfNodes) {
            this.setFreeNodeOffset(offset + 1);
            return offset;
        } else {
            const offset = this.getDeletedNodeOffset();
            if (offset === numberOfNodes) {
                throw new RuntimeError("No space left for new nodes");
            }
            // By convention deleted node stores offset of previous deleted node in its first bytes
            const previousOffset = getNumberFromBytes(
                this.uint8Array,
                nodeOffsetBytes * 3 + singleNodeAllocationSize * offset,
                nodeOffsetBytes,
            );
            this.setDeletedNodeOffset(previousOffset);
            return offset;
        }
    }

    private getNode(offset: number): NodeBinaryMemory {
        const singleNodeAllocationSize = this.singleNodeAllocationSize;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        return NodeBinaryMemory.read(
            nodeOffsetBytes,
            this.numberOfNodes,
            this.uint8Array,
            nodeOffsetBytes * 3 + singleNodeAllocationSize * offset,
            offset,
            this.keySize,
            this.valueSize,
            this.getNode.bind(this),
        );
    }

    private getFreeNodeOffset(): number {
        return this.freeNodeOffset;
    }

    private setFreeNodeOffset(offset: number): void {
        this.freeNodeOffset = offset;
        setNumberToBytes(this.uint8Array, 0, this.nodeOffsetBytes, offset);
    }

    private getDeletedNodeOffset(): number {
        return this.deletedNodeOffset;
    }

    private setDeletedNodeOffset(offset: number): void {
        this.deletedNodeOffset = offset;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        setNumberToBytes(this.uint8Array, nodeOffsetBytes, nodeOffsetBytes, offset);
    }

    private getRootNodeOffset(): number {
        return this.rootNodeOffset;
    }

    private setRootNodeOffset(offset: number): void {
        this.rootNodeOffset = offset;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        setNumberToBytes(this.uint8Array, nodeOffsetBytes * 2, nodeOffsetBytes, offset);
    }
}
