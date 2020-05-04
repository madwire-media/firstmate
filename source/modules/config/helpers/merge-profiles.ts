import { isOnlyObject } from '@madwire-media/magic-object/utils';
import { InterpolatedString } from '../types/common/interpolated-string';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mergeProfiles<T>(profiles: T[]): T {
    const maps: Map<any, any>[] = [];
    const objects: T[] = [];

    for (const profile of profiles) {
        if (profile instanceof InterpolatedString) {
            if (maps.length > 0 || objects.length > 0) {
                break;
            } else {
                return profile;
            }
        } else if (profile instanceof Map) {
            if (objects.length > 0) {
                break;
            } else {
                maps.push(profile);
            }
        } else if (isOnlyObject(profile)) {
            if (maps.length > 0) {
                break;
            } else {
                objects.push(profile);
            }
        } else {
            if (maps.length > 0 || objects.length > 0) {
                break;
            } else {
                return profile;
            }
        }
    }

    if (maps.length > 0) {
        const unmergedMap = new Map<any, any[]>();

        for (const map of maps.reverse()) {
            for (const [key, value] of map) {
                let unmergedValues = unmergedMap.get(key);

                if (unmergedValues === undefined) {
                    unmergedValues = [];
                    unmergedMap.set(key, unmergedValues);
                }

                unmergedValues.push(value);
            }
        }

        const mergedMap = new Map();

        for (const [key, values] of unmergedMap) {
            mergedMap.set(key, mergeProfiles(values));
        }

        return mergedMap as any;
    } else if (objects.length > 0) {
        const unmergedMap = new Map<string | symbol | number, any[]>();

        for (const object of objects.reverse()) {
            const keys = (Object.getOwnPropertyNames(object) as (keyof T)[])
                .concat(Object.getOwnPropertySymbols(object) as (keyof T)[]);

            for (const key of keys) {
                let unmergedValues = unmergedMap.get(key);

                if (unmergedValues === undefined) {
                    unmergedValues = [];
                    unmergedMap.set(key, unmergedValues);
                }

                unmergedValues.push(object[key]);
            }
        }

        const mergedEntries = [];

        for (const [key, value] of unmergedMap) {
            mergedEntries.push([key, mergeProfiles(value)]);
        }

        return Object.fromEntries(mergedEntries);
    } else {
        return undefined as any;
    }
}
