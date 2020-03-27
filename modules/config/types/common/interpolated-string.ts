/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { Result } from '@madwire-media/result';
import { isLeft } from 'fp-ts/lib/Either';
import { ParamName } from './config';
import { map } from './other';

const expressionRegex = /^[a-zA-Z]+(?:\.[a-zA-Z]+)*$/;

export type Expression = t.TypeOf<typeof Expression>;
export const Expression = t.brand(
    t.string,
    (s): s is t.Branded<string, ExpressionBrand> => expressionRegex.test(s),
    'Expression',
);
export interface ExpressionBrand {
    readonly Expression: unique symbol;
}

export type ExpressionContext = Map<ParamName, string | ExpressionContext>;
export const ExpressionContext: t.Type<ExpressionContext> = t.recursion(
    'ExpressionContext',
    () => map(
        ParamName,
        t.union([
            t.string,
            ExpressionContext,
        ]),
    ),
);

export class InterpolationError extends Error {
    constructor(source: string, message: string) {
        super(`${message} (in '${source}')`);
    }
}

function evaluateExpression(
    expression: Expression,
    context: ExpressionContext,
): Result<string, string> {
    let frame: ExpressionContext | string = context;

    if (expression.length === 0) {
        return Result.Err('Empty expression');
    }

    const parts = expression.split('.') as ParamName[];
    let i = 0;

    for (const part of parts) {
        if (typeof frame === 'string') {
            return Result.Err(`'${parts.slice(0, i).join('.')}' is a string`);
        }

        if (frame.has(part)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            frame = frame.get(part)!;
        } else {
            return Result.Err(`'.${part}' does not exist on '${parts.slice(0, i).join('.')}'`);
        }

        i += 1;
    }

    if (typeof frame !== 'string') {
        return Result.Err(`'${expression}' is not a string`);
    } else {
        return Result.Ok(frame);
    }
}

export class InterpolatedString<C extends string = string> {
    public static compile<T extends t.Type<string> = t.Mixed>(
        rawString: string,
        validator: T,
    ): Result<InterpolatedString<t.TypeOf<T>>, Error> {
        const openRegex = /\$(\\*)\{/;
        let match = openRegex.exec(rawString);
        const lastIndex = 0;
        let lastWasEscaped = false;

        const strings: string[] = [];
        const expressions: Expression[] = [];

        while (match !== null) {
            const scannedSegment = rawString.slice(lastIndex, match.index);

            if (lastWasEscaped) {
                strings[strings.length - 1] += scannedSegment;
                lastWasEscaped = false;
            } else {
                strings.push(scannedSegment);
            }

            if (match[1].length > 0) {
                strings[strings.length - 1] += `$${match[0].substr(2)}`;
                lastWasEscaped = true;
            } else {
                const nextIndex = rawString.indexOf('}', lastIndex);

                if (nextIndex === -1) {
                    return Result.Err(
                        new Error(`Unmatched closing bracket at index ${lastIndex + 1}`),
                    );
                }

                const rawExpression = rawString.slice(match.index + 2, nextIndex);
                const expressionResult = Expression.decode(rawExpression);

                if (isLeft(expressionResult)) {
                    return Result.Err(
                        new Error(`Invalid expression: '${rawExpression}'`),
                    );
                }

                expressions.push(expressionResult.right);

                openRegex.lastIndex = nextIndex;
            }

            match = openRegex.exec(rawString);
        }

        return Result.Ok(
            new InterpolatedString(strings, expressions, validator),
        );
    }

    public readonly strings: string[];

    public readonly expressions: Expression[];

    public readonly type: t.Type<C>;

    constructor(
        strings: string[],
        expressions: Expression[],
        type: t.Type<C>,
    ) {
        this.strings = strings;
        this.expressions = expressions;
        this.type = type;
    }

    public hasExpressions(): boolean {
        return this.expressions.length > 0;
    }

    public interpolate(context: ExpressionContext): Result<string, InterpolationError> {
        let output = '';

        for (let i = 0; i < this.strings.length; i += 1) {
            if (i > 0) {
                const expression = this.expressions[i - 1];

                if (expression === undefined) {
                    throw new Error('Missing expression in interpolated string');
                }

                const evalResult = evaluateExpression(expression, context);

                if (evalResult.isErr()) {
                    let before = this.strings[i - 1] ?? '';
                    let after = this.strings[i] ?? '';

                    if (before.length > 7) {
                        before = `...${before.slice(-4)}`;
                    }
                    if (after.length > 7) {
                        after = `${after.slice(4)}...`;
                    }

                    return Result.Err(
                        new InterpolationError(
                            `${before}\${${expression}}${after}`,
                            evalResult.error,
                        ),
                    );
                }

                output += evalResult.value;
            }

            output += this.strings[i];
        }

        if ((this.type as unknown) !== t.string) {
            const validateResult = this.type.decode(output);

            if (isLeft(validateResult)) {
                return Result.Err(
                    new InterpolationError(
                        output,
                        `Interpolated string is not a valid ${this.type.name}`,
                    ),
                );
            } else {
                return Result.Ok(validateResult.right);
            }
        } else {
            return Result.Ok(output);
        }
    }
}

export class InterpolatedStringType<
    C extends t.Mixed,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    A = any,
    O = A,
    I = unknown,
> extends t.Type<A, O, I> {
    public readonly _tag: 'InterpolatedStringType' = 'InterpolatedStringType';

    constructor(
        name: string,
        is: InterpolatedStringType<C, A, O, I>['is'],
        validate: InterpolatedStringType<C, A, O, I>['validate'],
        encode: InterpolatedStringType<C, A, O, I>['encode'],
        public readonly type: C,
    ) {
        super(name, is, validate, encode);
    }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InterpolatedStringC<
    C extends t.Mixed,
> extends InterpolatedStringType<
    C,
    InterpolatedString<t.TypeOf<C>>,
    t.OutputOf<C>,
    unknown
> {}

export const interpolated = <C extends t.Mixed>(
    codec: C,
    name = `InterpolatedString<${codec.name}>`,
): InterpolatedStringC<C> => new InterpolatedStringType(
    name,
    (u): u is InterpolatedString<t.TypeOf<C>> => {
        if (!(u instanceof InterpolatedString)) {
            return false;
        }

        if (u.type !== codec) {
            return false;
        }

        return true;
    },
    (inputString, context) => {
        if (typeof inputString !== 'string') {
            return t.failure(inputString, context);
        }

        const compileResult = InterpolatedString.compile(inputString, codec);

        if (compileResult.isErr()) {
            return t.failure(inputString, context, compileResult.error.message);
        } else {
            return t.success(compileResult.value);
        }
    },
    (a) => {
        let output = '';

        for (let i = 0; i < a.strings.length; i += 1) {
            if (i > 0) {
                output += `\${${a.expressions[i - 1]}}`;
            }

            output += a.strings[i]
                .replace(/\$(\\*)\{/g, (str, slashes) => {
                    if (slashes.length > 0) {
                        return `$/${str.substr(1)}`;
                    } else {
                        return str;
                    }
                });
        }

        return output;
    },
    codec,
);

export const interpolatedString = interpolated(t.string);
