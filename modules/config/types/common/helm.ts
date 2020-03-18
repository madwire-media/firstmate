/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';
import { map } from './other';
import { InterpolatedString, interpolatedString } from './interpolated-string';
import { isDNS1123Label, DNS1123LabelBrand } from './k8s';

// Helm actually has no limitations to a repository's name
export type HelmRepository = t.TypeOf<typeof HelmRepository>;
export const HelmRepository = t.brand(
    t.string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_s): _s is t.Branded<string, HelmRepositoryBrand> => true,
    'HelmRepository',
);
export interface HelmRepositoryBrand {
    readonly HelmRepository: unique symbol;
}

export type HelmReleaseName = t.TypeOf<typeof HelmReleaseName>;
export const HelmReleaseName = t.brand(
    t.string,
    (s): s is t.Branded<string, HelmReleaseNameBrand> => isDNS1123Label(s),
    'HelmReleaseName',
);
export interface HelmReleaseNameBrand extends DNS1123LabelBrand {
    readonly HelmReleaseName: unique symbol;
}

export type InterpolatedHelmValue =
    | null
    | boolean
    | number
    | InterpolatedString
    | Map<InterpolatedString, InterpolatedHelmValue>
    | InterpolatedHelmValue[];
export const InterpolatedHelmValue: t.Type<InterpolatedHelmValue> = t.recursion(
    'InterpolatedHelmValue',
    () => t.union([
        t.null,
        t.boolean,
        t.number,
        interpolatedString,
        map(interpolatedString, InterpolatedHelmValue),
        t.array(InterpolatedHelmValue),
    ]),
);

export type InterpolatedHelmValues = t.TypeOf<typeof InterpolatedHelmValues>;
export const InterpolatedHelmValues = map(
    interpolatedString,
    InterpolatedHelmValue,
    'InterpolatedHelmValues',
);
