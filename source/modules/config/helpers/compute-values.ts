import { Result } from '@madwire-media/result';
import { InterpolatedHelmValue } from '../types/common/helm';
import { ExpressionContext, InterpolatedString } from '../types/common/interpolated-string';

type JsonData = null | boolean | number | string | {[key: string]: JsonData} | JsonData[];

export function computeValues(
    value: InterpolatedHelmValue,
    context: ExpressionContext,
): Result<JsonData, Error> {
    if (
        value === null
        || typeof value === 'boolean'
        || typeof value === 'number'
    ) {
        return Result.Ok(value);
    } else if (value instanceof InterpolatedString) {
        return value.interpolate(context);
    } else if (value instanceof Array) {
        const output: JsonData[] = [];

        for (const subValue of value) {
            output.push(computeValues(subValue, context).try());
        }

        return Result.Ok(output);
    } else {
        const output: {[key: string]: JsonData} = {};

        for (const [rawKey, rawSubValue] of value.entries()) {
            const key = rawKey.interpolate(context).try();
            const subValue = computeValues(rawSubValue, context).try();

            output[key] = subValue;
        }

        return Result.Ok(output);
    }
}
