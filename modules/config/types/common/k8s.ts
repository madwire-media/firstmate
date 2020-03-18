/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

const dns1123LabelRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const dns1123LabelMaxLength = 63;

export const isDNS1123Label = (s: string) => (
    s.length <= dns1123LabelMaxLength
    && dns1123LabelRegex.test(s)
);

// Couldn't find any limitations in kubectl
export type K8sContext = t.TypeOf<typeof K8sContext>;
export const K8sContext = t.brand(
    t.string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_s): _s is t.Branded<string, K8sContextBrand> => true,
    'K8sContext',
);
export interface K8sContextBrand {
    readonly K8sContext: unique symbol;
}

export type DNS1123Label = t.TypeOf<typeof DNS1123Label>;
export const DNS1123Label = t.brand(
    t.string,
    (s): s is t.Branded<string, DNS1123LabelBrand> => isDNS1123Label(s),
    'DNS1123Label',
);
export interface DNS1123LabelBrand {
    readonly DNS1123Label: unique symbol;
}

export type K8sNamespace = t.TypeOf<typeof K8sNamespace>;
export const K8sNamespace = t.brand(
    t.string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_s): _s is t.Branded<string, K8sNamespaceBrand> => isDNS1123Label(s),
    'K8sNamespace',
);
export interface K8sNamespaceBrand extends DNS1123LabelBrand {
    readonly K8sNamespace: unique symbol;
}
