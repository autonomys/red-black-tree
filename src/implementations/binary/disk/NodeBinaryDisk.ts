import {INodeAsync} from "../../..";
import {RuntimeError} from "../../../RuntimeError";
import {setNumberToBytes} from "../../../utils";
import {File} from "./File";
import {getNumberFromFileBytes, setNumberToFileBytes} from "./utils";

export class NodeBinaryDisk implements INodeAsync<Uint8Array, Uint8Array> {
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
    public static async create(
        nodeOffsetBytes: number,
        numberOfNodes: number,
        source: File,
        sourceOffset: number,
        offset: number,
        key: Uint8Array,
        value: Uint8Array,
        getNode: (offset: number) => Promise<NodeBinaryDisk>,
    ): Promise<NodeBinaryDisk> {
        const keySize = key.length;
        const valueSize = value.length;
        const nodeData = new Uint8Array(1 + nodeOffsetBytes * 2 + keySize + valueSize);
        // Set `isRed` to `true`
        nodeData.set([1]);
        // Set left child to `null`
        setNumberToBytes(
            nodeData,
            1,
            nodeOffsetBytes,
            numberOfNodes,
        );
        // Set right child to `null`
        setNumberToBytes(
            nodeData,
            1 + nodeOffsetBytes,
            nodeOffsetBytes,
            numberOfNodes,
        );
        // Set key
        nodeData.set(key, 1 + nodeOffsetBytes * 2);
        // Set value
        nodeData.set(value, 1 + nodeOffsetBytes * 2 + keySize);

        await source.write(sourceOffset, nodeData);

        return new NodeBinaryDisk(
            offset,
            true,
            key,
            valueSize,
            source,
            sourceOffset,
            nodeOffsetBytes,
            numberOfNodes,
            getNode,
        );
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
    public static async read(
        nodeOffsetBytes: number,
        numberOfNodes: number,
        source: File,
        sourceOffset: number,
        offset: number,
        keySize: number,
        valueSize: number,
        getNode: (offset: number) => Promise<NodeBinaryDisk>,
    ): Promise<NodeBinaryDisk> {
        const isRed = (await source.read(sourceOffset, 1))[0] === 1;
        const baseOffset = sourceOffset + 1 + nodeOffsetBytes * 2;
        const key = await source.read(baseOffset, keySize);
        return new NodeBinaryDisk(
            offset,
            isRed,
            key,
            valueSize,
            source,
            sourceOffset,
            nodeOffsetBytes,
            numberOfNodes,
            getNode,
        );
    }

    private leftCache: NodeBinaryDisk | null | undefined = undefined;
    private rightCache: NodeBinaryDisk | null | undefined = undefined;
    private valueCache: Uint8Array | undefined = undefined;

    /**
     * @param offset
     * @param isRedInternal
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
        private isRedInternal: boolean,
        private readonly key: Uint8Array,
        private readonly valueSize: number,
        private readonly source: File,
        private readonly sourceOffset: number,
        private readonly nodeOffsetBytes: number,
        private readonly numberOfNodes: number,
        private readonly getNode: (offset: number) => Promise<NodeBinaryDisk>,
    ) {
    }

    public getIsRed(): boolean {
        return this.isRedInternal;
    }

    public setIsRed(isRed: boolean): void {
        if (isRed !== this.isRedInternal) {
            this.isRedInternal = isRed;
            this.source.write(this.sourceOffset, Uint8Array.of(isRed ? 1 : 0))
                .catch(() => {
                    // Just to avoid unhandled promise exception
                });
        }
    }

    public getKey(): Uint8Array {
        return this.key;
    }

    public async getLeftAsync(): Promise<NodeBinaryDisk | null> {
        if (this.leftCache === undefined) {
            const offset = await getNumberFromFileBytes(
                this.source,
                this.sourceOffset + 1,
                this.nodeOffsetBytes,
            );

            this.leftCache = offset === this.numberOfNodes ? null : await this.getNode(offset);
        }

        return this.leftCache;
    }

    public async getRightAsync(): Promise<NodeBinaryDisk | null> {
        if (this.rightCache === undefined) {
            const nodeOffsetBytes = this.nodeOffsetBytes;
            const offset = await getNumberFromFileBytes(
                this.source,
                this.sourceOffset + 1 + nodeOffsetBytes,
                nodeOffsetBytes,
            );

            this.rightCache = offset === this.numberOfNodes ? null : await this.getNode(offset);
        }

        return this.rightCache;
    }

    public async getValueAsync(): Promise<Uint8Array> {
        if (this.valueCache === undefined) {
            const baseOffset = this.sourceOffset + 1 + this.nodeOffsetBytes * 2 + this.key.length;
            this.valueCache = await this.source.read(baseOffset, this.valueSize);
        }

        return this.valueCache;
    }

    public getLeft(): NodeBinaryDisk | null {
        if (this.leftCache === undefined) {
            throw new RuntimeError('getLeftAsync() needs to be called first');
        }

        return this.leftCache;
    }

    public setLeft(node: NodeBinaryDisk | null): void {
        this.leftCache = node;

        setNumberToFileBytes(
            this.source,
            this.sourceOffset + 1,
            this.nodeOffsetBytes,
            node ? node.offset : this.numberOfNodes,
        )
            .catch(() => {
                // Just to avoid unhandled promise exception
            });
    }

    public getRight(): NodeBinaryDisk | null {
        if (this.rightCache === undefined) {
            throw new RuntimeError('getRightAsync() needs to be called first');
        }

        return this.rightCache;
    }

    public setRight(node: NodeBinaryDisk | null): void {
        this.rightCache = node;

        const nodeOffsetBytes = this.nodeOffsetBytes;
        setNumberToFileBytes(
            this.source,
            this.sourceOffset + 1 + nodeOffsetBytes,
            nodeOffsetBytes,
            node ? node.offset : this.numberOfNodes,
        )
            .catch(() => {
                // Just to avoid unhandled promise exception
            });
    }

    public getValue(): Uint8Array {
        if (this.valueCache === undefined) {
            throw new RuntimeError('getValueAsync() needs to be called first');
        }

        return this.valueCache;
    }
}
