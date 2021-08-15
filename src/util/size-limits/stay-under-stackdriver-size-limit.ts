// @ts-ignore
import solveFractionalKnapsack from 'dsa.js/src/algorithms/knapsack-fractional';
import {
    flatten,
    isEmpty,
    isObjectLike,
    omit,
    pick,
} from 'lodash';
import sizeof = require('object-sizeof');
import { ulid } from 'ulid';
import config from '../../config';

interface IKnapsackSolution {
    weight: number;
    value: number;
    items: IKnapsackItem[];
}

interface IKnapsackItem {
    key: string;
    value: number;
    weight: number;
    proportion: number;
}


const recursion = {
    /**
     * If individual fields are larger than the stackdriver limit, we wont be able to break them down via knapsack anyway.
     * So break them down here and return two parts
     * @param object
     * @note unloggableLargeFieldKeys are too large to log AND cannot be broken down further because they are atomic/primitive values (like strings)
     */
    findLoggableAndUnloggableKeys: (object: {[key: string]: any}) => {
        const largeFieldKeys: string[] = recursion.workers.getLargeFields(object, false);
        const unloggableLargeFieldKeys: string[] = recursion.workers.getLargeFields(object, true);

        const tooLargeToLog = pick(object, largeFieldKeys);
        const unloggableFields = pick(object, unloggableLargeFieldKeys);
        const smallEnoughToLog = omit(object, [...largeFieldKeys, ...unloggableLargeFieldKeys]);

        return {
            smallEnoughToLog,
            tooLargeToLog,
            unloggableFields,
        };
    },
    workers: {
        /**
         * Get the keys in an object corresponding to too-large values.
         * Large values should be classified as either "object like" (can be broken down) or not "object like" (cannot be broken down).
         * @param obj
         * @param isAtomic - filter for entries in the object which are object like or atomic (i.e. cannot be broken down)
         */
        getLargeFields: (obj: {[key: string]: any}, isAtomic: boolean) => Object.entries(obj)
                .filter(([_, value]: [string, any]) => (isAtomic ? !isObjectLike(value) : isObjectLike(value)))
                .filter(([_, value]: [string, any]) => is.overStackDriverLimit(value))
                .map(
                    ([key, _]: [string, any]) => key,
                ),
    },
};

export const is = {
    /**
     * Check if an object is over the Stackdriver logging limit
     * @param object
     */
    overStackDriverLimit: (object: any) => {
        try {
            // @ts-ignore
            const size = sizeof(object);
            console.log(size);
            return size > config.stackdriver.maxLogSize.bytes;
        } catch (e) {
            console.error(e);
            throw e;
        }
    },
};

const knapsack = {
    map: {
        /**
         * Get keys from an array of knapsack items
         * @param knapsackItems
         */
        knapsackKeys: (knapsackItems: IKnapsackItem[]) => {
            return knapsackItems.map((item: IKnapsackItem) => item.key);
        },
        /**
         * Create weights from an object to be used in the knapsack algorithm
         * @param object
         */
        knapsackWeights: (object: {[key: string]: any}) => {
            // @ts-ignore that
            return Object.entries(object).map(([key, value]: [string, any]) => {
                return {
                    key,
                    value: 1,
                    // @ts-ignore
                    weight: sizeof(value),
                };
            });
        },
    },
    recompose: {
        /**
         * Choose just the fields of an object selected by the Knapsack solution
         * @param object
         * @param knapsackItems
         */
        objectFromKnapsackSolution: (object: {[key: string]: any}, knapsackItems: IKnapsackItem[]) => {
            const keys = knapsack.map.knapsackKeys(knapsackItems);
            return pick(object, keys);
        },
    },
};

const stackdriver = {
    map: {
        logBody: (object: {[key: string]: any}, solution: IKnapsackSolution, id: string, depth: number, rootKeyName?: string) => {
            let logPart = {
                ...knapsack.recompose.objectFromKnapsackSolution(object, solution.items),
            };
            if (rootKeyName) {
                logPart = {
                    [rootKeyName]: logPart,
                };
            }

            const logObject: {[key: string]: any}  = {
                logPart,
                logPartMetadata: {
                    depth,
                    id,
                },
            };
            logObject.message = logPart.message ?  `😁[${id}] - ${logPart.message}` : `😁[${id}] - Logging large object part @ depth ${depth}${rootKeyName ? ` - ${rootKeyName}` : ''}`;
            return logObject;
        },
    },
};

/**
 * Stackdriver has a hard limit on the size of fields which can be logged
 * @param originalObject
 * @param depth
 * @param id
 * @param rootKeyName
 * @note we are using the knapsack algorithm internally to pull this off :)
 */
export function stayUnderStackDriverSizeLimit(originalObject: {[key: string]: any}, depth: number = 0, id: string = ulid(), rootKeyName?: string): Array<{[key: string]: any}> {
    try {
        if (!is.overStackDriverLimit(originalObject)) {
            return [originalObject];
        }

        // Break the object into the recursive case (too large to log) & base case (small enough to log)
        const {tooLargeToLog, smallEnoughToLog, unloggableFields} = recursion.findLoggableAndUnloggableKeys(originalObject);

        // Recursive case: if there are individual fields that are too big and need to be broken down further
        const brokenDownLargeFields: Array<{[key: string]: any}> = flatten(
            Object.entries(tooLargeToLog)
                .map(([key, field]: [string, any]) => stayUnderStackDriverSizeLimit(field, depth + 1, id, `${rootKeyName ? `${rootKeyName}.` : ''}${key}`)),
        );

        // Base case
        const fieldsSmallEnoughToLog: Array<{[key: string]: any}> = breakDownObject(smallEnoughToLog, depth, id, rootKeyName);
        // Add in a flag about the other keys being too large to log
        const tooLargeToLogWReplacedValues = fieldsSmallEnoughToLog.length ? remapTooLargeToLog(unloggableFields, fieldsSmallEnoughToLog[0]) : [];

        return [...fieldsSmallEnoughToLog, ...brokenDownLargeFields, ...tooLargeToLogWReplacedValues];
    } catch (e) {
        console.error(e);
        throw e;
    }

}

/**
 * So that we don't lose the keys entirely, store them with replaced values with a warning string
 * @param unloggableFields
 * @param logForThis
 */
function remapTooLargeToLog(unloggableFields: {[key: string]: any}, logForThis: {[key: string]: any}) {
    const logPart = Object.keys(unloggableFields).reduce(
        (all, key) => {
            all[key] = 'Too large to log';
            return all;
        },
        {} as {[key: string]: any},
    );

    return [{
        ...logForThis,
        logPart,
    }]
}

/**
 * Break down an object into parts which are small enough to log in Stackdriver
 * @param object
 * @param depth
 * @param id
 * @param rootKeyName
 * @returns an array of objects which are small enough to be logged
 */
function breakDownObject(object: {[key: string]: any}, depth: number, id: string, rootKeyName?: string) {
    const objectsSmallEnoughToLog = [];

    while (!isEmpty(object)) {
        const weights = knapsack.map.knapsackWeights(object);
        const solution: IKnapsackSolution = solveFractionalKnapsack(weights, config.stackdriver.maxLogSize.bytes);

        objectsSmallEnoughToLog.push(
            stackdriver.map.logBody(object, solution, id, depth, rootKeyName),
        );

        // Drop the fields which made it into the solution
        const knapsackKeys = knapsack.map.knapsackKeys(solution.items);
        // eslint-disable-next-line no-param-reassign
        object = omit(object, knapsackKeys);
    }

    return objectsSmallEnoughToLog;
}
