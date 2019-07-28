import {INode} from "../../..";
import {getNumberFromBytes, setNumberToBytes} from "../../../utils";

export class NodeBinaryMemory implements INode<Uint8Array, Uint8Array> {
    /**
     * @param nodeOffsetBytes
     * @param numberOfNodes
     * @param source Binary data where contents of the node is located
     * @param sourceOffset Offset in binary data in bytes where node is located
     * @param offset
     * @param key
     * @param value
     * @param getNode
     */
    public static create(
        nodeOffsetBytes: number,
        numberOfNodes: number,
        source: Uint8Array,
        sourceOffset: number,
        offset: number,
        key: Uint8Array,
        value: Uint8Array,
        getNode: (offset: number) => NodeBinaryMemory,
    ): NodeBinaryMemory {
        const keySize = key.length;
        // Set `isRed` to `true`
        source.set([1], sourceOffset);
        // Set left child to `null`
        setNumberToBytes(
            source,
            sourceOffset + 1,
            nodeOffsetBytes,
            numberOfNodes,
        );
        // Set right child to `null`
        setNumberToBytes(
            source,
            sourceOffset + 1 + nodeOffsetBytes,
            nodeOffsetBytes,
            numberOfNodes,
        );
        // Set key
        source.set(key, sourceOffset + 1 + nodeOffsetBytes * 2);
        // Set value
        source.set(value, sourceOffset + 1 + nodeOffsetBytes * 2 + keySize);

        const instance = new NodeBinaryMemory(
            offset,
            numberOfNodes,
            numberOfNodes,
            key,
            value.length,
            source,
            sourceOffset,
            nodeOffsetBytes,
            numberOfNodes,
            getNode,
        );

        instance.leftCache = null;
        instance.rightCache = null;

        return instance;
    }

    /**
     * @param nodeOffsetBytes
     * @param numberOfNodes
     * @param source Binary data where contents of the node is located
     * @param sourceOffset Offset in binary data in bytes where node is located
     * @param offset
     * @param keySize
     * @param valueSize
     * @param getNode
     */
    public static read(
        nodeOffsetBytes: number,
        numberOfNodes: number,
        source: Uint8Array,
        sourceOffset: number,
        offset: number,
        keySize: number,
        valueSize: number,
        getNode: (offset: number) => NodeBinaryMemory,
    ): NodeBinaryMemory {
        const baseOffset = sourceOffset + 1 + nodeOffsetBytes * 2;
        return new NodeBinaryMemory(
            offset,
            getNumberFromBytes(source, sourceOffset + 1, nodeOffsetBytes),
            getNumberFromBytes(source, sourceOffset + 1 + nodeOffsetBytes, nodeOffsetBytes),
            source.subarray(baseOffset, baseOffset + keySize),
            valueSize,
            source,
            sourceOffset,
            nodeOffsetBytes,
            numberOfNodes,
            getNode,
        );
    }

    private isRed: boolean;
    private leftCache: NodeBinaryMemory | null | undefined = undefined;
    private rightCache: NodeBinaryMemory | null | undefined = undefined;

    /**
     * @param offset
     * @param leftOffset
     * @param rightOffset
     * @param key
     * @param valueSize
     * @param source Binary data where contents of the node is located
     * @param sourceOffset Offset in binary data in bytes where node is located
     * @param nodeOffsetBytes
     * @param numberOfNodes
     * @param getNode
     */
    constructor(
        public readonly offset: number,
        private leftOffset: number,
        private rightOffset: number,
        private readonly key: Uint8Array,
        private readonly valueSize: number,
        private readonly source: Uint8Array,
        private readonly sourceOffset: number,
        private readonly nodeOffsetBytes: number,
        private readonly numberOfNodes: number,
        private readonly getNode: (offset: number) => NodeBinaryMemory,
    ) {
        this.isRed = source[sourceOffset] === 1;
    }

    public getIsRed(): boolean {
        return this.isRed;
    }

    public setIsRed(isRed: boolean): void {
        if (isRed !== this.isRed) {
            this.isRed = isRed;
            this.source.set([isRed ? 1 : 0], this.sourceOffset);
        }
    }

    public getKey(): Uint8Array {
        return this.key;
    }

    public getLeft(): NodeBinaryMemory | null {
        if (this.leftCache === undefined) {
            const offset = this.leftOffset;
            this.leftCache = offset === this.numberOfNodes ? null : this.getNode(offset);
        }

        return this.leftCache;
    }

    public setLeft(node: NodeBinaryMemory | null): void {
        this.leftCache = node;

        const offset = node ? node.offset : this.numberOfNodes;
        this.leftOffset = offset;
        setNumberToBytes(
            this.source,
            this.sourceOffset + 1,
            this.nodeOffsetBytes,
            offset,
        );
    }

    public getRight(): NodeBinaryMemory | null {
        if (this.rightCache === undefined) {
            const offset = this.rightOffset;
            this.rightCache = offset === this.numberOfNodes ? null : this.getNode(offset);
        }

        return this.rightCache;
    }

    public setRight(node: NodeBinaryMemory | null): void {
        this.rightCache = node;

        const nodeOffsetBytes = this.nodeOffsetBytes;
        const offset = node ? node.offset : this.numberOfNodes;
        this.rightOffset = offset;
        setNumberToBytes(
            this.source,
            this.sourceOffset + 1 + nodeOffsetBytes,
            nodeOffsetBytes,
            offset,
        );
    }

    public getValue(): Uint8Array {
        const baseOffset = this.sourceOffset + 1 + this.nodeOffsetBytes * 2 + this.key.length;
        return this.source.subarray(baseOffset, baseOffset + this.valueSize);
    }
}
