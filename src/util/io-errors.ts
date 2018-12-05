import { Either, Left, Right } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { IoContext } from './io-context';

export interface IoValidationError extends t.ValidationError {
    message?: string;
}

export type IoErrors = IoValidationError[];

export function createError(value: t.mixed, context: IoContext | t.Context, message?: string): IoValidationError {
    return {value, context, message};
}

export function intoFailure<T>(errors: IoErrors | IoValidationError): t.Validation<T> {
    if (errors instanceof Array) {
        return new Left(errors);
   } else {
       return new Left([errors]);
   }
}

export function intoSuccess<T>(value: T): t.Validation<T> {
    return new Right(value);
}
