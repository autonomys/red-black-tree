import {INodeAsync} from "../interfaces/INodeAsync";
import {INodeManagerAsync} from "../interfaces/INodeManagerAsync";

/**
 * Generic implementation that has useful `readTransaction()` and `writeTransaction()` methods
 */
export abstract class NodeManagerAsyncGeneric<K, V> implements INodeManagerAsync<K, V> {
    private lastTransactionPromise: Promise<any> = Promise.resolve();

    public readTransaction<R>(callback: () => Promise<R>): Promise<R> {
        // TODO: Implement batching of read transactions for potentially better performance, potentially with higher priority than write transaction
        const transaction = this.lastTransactionPromise.then(callback);
        this.lastTransactionPromise = transaction.catch(() => {
            // Just to avoid unhandled promise exception
        });
        return transaction;
    }

    public writeTransaction<R>(callback: () => Promise<R>): Promise<R> {
        const transaction = this.lastTransactionPromise.then(callback);
        this.lastTransactionPromise = transaction.catch(() => {
            // Just to avoid unhandled promise exception
        });
        return transaction;
    }

    public abstract getRootAsync(): Promise<INodeAsync<K, V> | null>;

    public abstract getRoot(): INodeAsync<K, V> | null;

    public abstract setRoot(root: INodeAsync<K, V> | null): void;

    public abstract addNode(key: K, value: V): INodeAsync<K, V>;

    public abstract compare(aKey: K, bKey: K): -1 | 0 | 1;

    public abstract removeNode(node: INodeAsync<K, V>): void;

    public abstract cleanup(): void;
}
