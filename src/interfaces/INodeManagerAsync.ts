import {INodeAsync} from "./INodeAsync";
import {INodeManager} from "./INodeManager";

/**
 * Despite `INodeManagerAsync` extends `INodeManager`, its implementation has different properties:
 * * getting root must be done asynchronously the first time, later cache will allow synchronous method to work, otherwise `RuntimeError` exception will be
 *   thrown!
 * * setting is done synchronously using in-memory cache and asynchronously on disk, which means that there is no guarantee as to when data was actually
 *   persisted on disk, make sure to do multiple transactions (like removing one node, adding another node or getting closest node) each in callback specified
 *   as an argument to `readTransaction()` and `writeTransaction()` methods that will take care of making necessary transactions sequential
 */
export interface INodeManagerAsync<K, V> extends INodeManager<K, V> {
    /**
     * Takes care of making concurrent updates sequential
     *
     * There may be 2 or more concurrent read transactions, but only when there is no write transaction happening at the same time
     *
     * @param callback
     */
    readTransaction<R>(callback: () => Promise<R>): Promise<R>;

    /**
     * Takes care of making concurrent updates sequential
     *
     * There may be only 1 concurrent write transaction and only if there are no read transactions happening at the same time
     *
     * @param callback
     */
    writeTransaction<R>(callback: () => Promise<R>): Promise<R>;

    getRootAsync(): Promise<INodeAsync<K, V> | null>;
}
