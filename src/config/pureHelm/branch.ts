import * as t from 'io-ts';

import { setDefault } from '../../util/defaultable';
import { exact, getProps } from '../../util/io-util';
import * as base from '../base/branch';
import { branchType } from '../types/branch';
import { HelmArgs } from '../types/helm';
import { ParsingContext } from '../types/parsingContext';
import { defaultsFrom } from '../types/serviceDefaults';
import { ChartMuseum, ClusterName, Namespace, ReleaseName } from '../types/strings';

export namespace env {
    export namespace atoms {
        export interface AllReq {
            cluster: ClusterName;
            namespace: Namespace;
        }
        export interface AllOpt {
            releaseName?: ReleaseName;
            helmArgs?: HelmArgs;
            chartmuseum?: ChartMuseum;
        }

        // tslint:disable-next-line:no-empty-interface
        export interface DevReq {}
        export interface DevOpt {
            recreatePods?: boolean;
        }

        // tslint:disable-next-line:no-empty-interface
        export interface StageReq {}
        export interface StageOpt {
            recreatePods?: boolean;
        }

        export interface ProdReq {
            chartmuseum: ChartMuseum;
        }
        // tslint:disable-next-line:no-empty-interface
        export interface ProdOpt {}

        // tslint:disable:variable-name
        export const _allReq = t.type({
            cluster: ClusterName,
            namespace: Namespace,
        });
        export const _allOpt = t.partial({
            releaseName: ReleaseName,
            helmArgs: HelmArgs,
            chartmuseum: t.union([ChartMuseum, t.undefined]), // force partial
        });

        export const _devReq = t.type({});
        export const _devOpt = t.partial({
            recreatePods: t.boolean,
        });

        export const _stageReq = t.type({});
        export const _stageOpt = t.partial({
            recreatePods: t.boolean,
        });

        export const _prodReq = t.type({
            chartmuseum: ChartMuseum,
        });
        export const _prodOpt = t.partial({});
        // tslint:enable:variable-name

        export const allReq = t.alias(_allReq)<AllReq, AllReq>();
        export const allOpt = t.alias(_allOpt)<AllOpt, AllOpt>();

        export const devReq = t.alias(_devReq)<DevReq, DevReq>();
        export const devOpt = t.alias(_devOpt)<DevOpt, DevOpt>();

        export const stageReq = t.alias(_stageReq)<StageReq, StageReq>();
        export const stageOpt = t.alias(_stageOpt)<StageOpt, StageOpt>();

        export const prodReq = t.alias(_prodReq)<ProdReq, ProdReq>();
        export const prodOpt = t.alias(_prodOpt)<ProdOpt, ProdOpt>();
    }

    export namespace comp {
        export interface Dev
        extends
            base.env.comp.All,
            atoms.AllReq,
            atoms.AllOpt,
            atoms.DevReq,
            atoms.DevOpt {}

        export interface Stage
        extends
            base.env.comp.All,
            atoms.AllReq,
            atoms.AllOpt,
            atoms.StageReq,
            atoms.StageOpt {}

        export interface Prod
        extends
            base.env.comp.All,
            atoms.AllReq,
            atoms.AllOpt,
            atoms.ProdReq,
            atoms.ProdOpt {
            chartmuseum: ChartMuseum;
        }

        // tslint:disable:variable-name
        export const _dev = t.intersection([
            base.env.comp._all,

            atoms.allReq,
            atoms.allOpt,

            atoms.devReq,
            atoms.devOpt,
        ], 'PureHelmDev');
        export const _devStrict = t.type(getProps(_dev), 'PureHelmDevStrict');
        export const _devPartial = t.partial(getProps(_dev), 'PureHelmDevPartial');
        export const _devExact = exact(_dev, 'PureHelmDevExact');

        export const _stage = t.intersection([
            base.env.comp._all,

            atoms.allReq,
            atoms.allOpt,

            atoms.stageReq,
            atoms.stageOpt,
        ], 'PureHelmStage');
        export const _stageStrict = t.type(getProps(_stage), 'PureHelmStageStrict');
        export const _stagePartial = t.partial(getProps(_stage), 'PureHelmStagePartial');
        export const _stageExact = exact(_stage, 'PureHelmStageExact');

        export const _prod = t.intersection([
            base.env.comp._all,

            atoms.allReq,
            atoms.allOpt,

            atoms.prodReq,
            atoms.prodOpt,
        ], 'PureHelmProd');
        export const _prodStrict = t.type(getProps(_prod), 'PureHelmProdStrict');
        export const _prodPartial = t.partial(getProps(_prod), 'PureHelmProdPartial');
        export const _prodExact = exact(_prod, 'PureHelmProdExact');
        // tslint:enable:variable-name

        export const dev = t.clean<Dev>(_dev);
        export const devStrict = t.clean<Required<Dev>>(_devStrict as any);
        export const devPartial = t.clean<Partial<Dev>>(_devPartial);
        export const devExact = t.clean<Dev>(_devExact);

        export const stage = t.clean<Stage>(_stage);
        export const stageStrict = t.clean<Required<Stage>>(_stageStrict as any);
        export const stagePartial = t.clean<Partial<Stage>>(_stagePartial);
        export const stageExact = t.clean<Stage>(_stageExact);

        export const prod = t.clean<Prod>(_prod);
        export const prodStrict = t.clean<Required<Prod>>(_prodStrict as any);
        export const prodPartial = t.clean<Partial<Prod>>(_prodPartial);
        export const prodExact = t.clean<Prod>(_prodExact);
    }

    export namespace defaults {
        type devType = t.TypeOf<typeof comp.dev>;
        type stageType = t.TypeOf<typeof comp.stage>;
        type prodType = t.TypeOf<typeof comp.prod>;

        type allTypes = devType | stageType | prodType;

        export function all(input: devType, context: ParsingContext): devType;
        export function all(input: stageType, context: ParsingContext): stageType;
        export function all(input: prodType, context: ParsingContext): prodType;
        export function all(input: allTypes, context: ParsingContext): allTypes {
            input = base.env.defaults.all(input, context) as any;

            return setDefault(input, {
                releaseName: `${context.project}-${context.service}-${context.env}`,
                helmArgs: {},
                chartmuseum: context.chartmuseum,
            });
        }

        export function dev(input: devType, context: ParsingContext): devType {
            input = all(input, context);

            return setDefault(input, {
                recreatePods: false,
            });
        }

        export function stage(input: stageType, context: ParsingContext): stageType {
            input = all(input, context);

            return setDefault(input, {
                recreatePods: false,
            });
        }

        export function prod(input: prodType, context: ParsingContext): prodType {
            input = all(input, context) as prodType;

            return setDefault(input, {
            });
        }
    }
}

export namespace branch {
    export const type = 'pureHelm';

    export const basic = branchType(
        env.comp.dev,
        env.comp.stage,
        env.comp.prod,
        type,
        'PureHelmBranch',
    );

    export const partial = branchType(
        env.comp.devPartial,
        env.comp.stagePartial,
        env.comp.prodPartial,
        type,
        'PureHelmBranchPartial',
    );

    export const exact = branchType(
        env.comp.devExact,
        env.comp.stageExact,
        env.comp.prodExact,
        type,
        'PureHelmBranchExact',
    );

    export const strict = branchType(
        env.comp.devStrict,
        env.comp.stageStrict,
        env.comp.prodStrict,
        type,
        'PureHelmBranchStrict',
    );

    export const defaults = defaultsFrom(
        strict,
        env.defaults.dev,
        env.defaults.stage,
        env.defaults.prod,
    );
}
