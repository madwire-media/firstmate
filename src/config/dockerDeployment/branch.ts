import * as t from 'io-ts';

import * as base from '../base/branch';
import * as pureHelm from '../pureHelm/branch';
import { getProps, intersection } from '../../util/io-util';
import { branchType } from '../types/branch';
import { Registry, ImageName } from '../types/strings';
import { Containers, DeploymentMode } from '../types/other';
import { ParsingContext } from '../types/parsingContext';
import { setDefault } from '../../util/defaultable';
import { defaultsFrom } from '../types/serviceDefaults';

export namespace env {
    export namespace atoms {
        export interface AllReq {}
        export interface AllOpt {
            registry?: Registry;
            imageNamePrefix?: ImageName;
            containers?: Containers;
        }

        export interface DevReq {}
        export interface DevOpt {
            mode?: DeploymentMode;
            pushDebugContainer?: boolean;
            autodelete?: boolean;
        }

        export interface StageReq {}
        export interface StageOpt {}

        export interface ProdReq {}
        export interface ProdOpt {}

        export const _allReq = t.type({});
        export const _allOpt = t.partial({
            registry: Registry,
            imageNamePrefix: ImageName,
            containers: Containers,
        });

        export const _devReq = t.type({});
        export const _devOpt = t.partial({
            mode: DeploymentMode,
            pushDebugContainer: t.boolean,
            autodelete: t.boolean,
        });

        export const _stageReq = t.type({});
        export const _stageOpt = t.type({});

        export const _prodReq = t.type({});
        export const _prodOpt = t.type({});

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
            pureHelm.env.comp.Dev,
            atoms.AllReq,
            atoms.AllOpt,
            atoms.DevReq,
            atoms.DevOpt
        {}

        export interface Stage
        extends
            base.env.comp.All,
            pureHelm.env.comp.Stage,
            atoms.AllReq,
            atoms.AllOpt,
            atoms.StageReq,
            atoms.StageOpt
        {}

        export interface Prod
        extends
            base.env.comp.All,
            pureHelm.env.comp.Prod,
            atoms.AllReq,
            atoms.AllOpt,
            atoms.ProdReq,
            atoms.ProdOpt
        {}

        // using custom definition of intersection for more types
        export const _dev = intersection([
            base.env.comp._all,

            pureHelm.env.comp._dev,

            atoms.allReq,
            atoms.allOpt,

            atoms.devReq,
            atoms.devOpt,
        ], 'DockerDeploymentDev');
        export const _devStrict = t.type(getProps(_dev), 'DockerDeploymentDevStrict');
        export const _devPartial = t.partial(getProps(_dev), 'DockerDeploymentDevPartial');
        export const _devExact = t.exact(_dev, 'DockerDeploymentDevExact');

        // using custom definition of intersection for more types
        export const _stage = intersection([
            base.env.comp._all,

            pureHelm.env.comp._stage,

            atoms.allReq,
            atoms.allOpt,

            atoms.stageReq,
            atoms.stageOpt,
        ], 'DockerDeploymentStage');
        export const _stageStrict = t.type(getProps(_stage), 'DockerDeploymentStageStrict');
        export const _stagePartial = t.partial(getProps(_stage), 'DockerDeploymentStagePartial');
        export const _stageExact = t.exact(_stage, 'DockerDeploymentStageExact');

        // using custom definition of intersection for more types
        export const _prod = intersection([
            base.env.comp._all,

            pureHelm.env.comp._prod,

            atoms.allReq,
            atoms.allOpt,

            atoms.prodReq,
            atoms.prodOpt,
        ], 'DockerDeploymentProd');
        export const _prodStrict = t.type(getProps(_prod), 'DockerDeploymentProdStrict');
        export const _prodPartial = t.partial(getProps(_prod), 'DockerDeploymentProdPartial');
        export const _prodExact = t.exact(_prod, 'DockerDeploymentProdExact');

        export const dev = t.clean<Dev>(_dev);
        export const devStrict = t.clean<Required<Dev>>(_devStrict as any);
        export const devPartial = t.clean<Partial<Dev>>(_devPartial as any);
        export const devExact = t.clean<Dev>(_devExact);

        export const stage = t.clean<Stage>(_stage);
        export const stageStrict = t.clean<Required<Stage>>(_stageStrict as any);
        export const stagePartial = t.clean<Partial<Stage>>(_stagePartial as any);
        export const stageExact = t.clean<Stage>(_stageExact);

        export const prod = t.clean<Prod>(_prod);
        export const prodStrict = t.clean<Required<Prod>>(_prodStrict as any);
        export const prodPartial = t.clean<Partial<Prod>>(_prodPartial as any);
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
                registry: context.registry,
                imageNamePrefix: context.service,
                containers: {},
            });
        }

        export function dev(input: devType, context: ParsingContext): devType {
            input = all(input, context);
            input = pureHelm.env.defaults.dev(input, context);

            return setDefault(input, {
                mode: 'proxy',
                pushDebugContainer: false,
                autodelete: false,
            });
        }

        export function stage(input: stageType, context: ParsingContext): stageType {
            input = all(input, context);
            input = pureHelm.env.defaults.stage(input, context);

            return setDefault(input, {
            });
        }

        export function prod(input: prodType, context: ParsingContext): prodType {
            input = all(input, context) as prodType;
            input = pureHelm.env.defaults.prod(input, context);

            return setDefault(input, {
            });
        }
    }
}

export namespace branch {
    export const type = 'dockerDeployment';

    export const basic = branchType(
        env.comp.dev,
        env.comp.stage,
        env.comp.prod,
        type,
        'DockerDeploymentBranch',
    );

    export const partial = branchType(
        env.comp.devPartial,
        env.comp.stagePartial,
        env.comp.prodPartial,
        type,
        'DockerDeploymentBranchPartial',
    );

    export const exact = branchType(
        env.comp.devExact,
        env.comp.stageExact,
        env.comp.prodExact,
        type,
        'DockerDeploymentBranchExact',
    );

    export const strict = branchType(
        env.comp.devStrict,
        env.comp.stageStrict,
        env.comp.prodStrict,
        type,
        'DockerDeploymentBranchStrict',
    );

    export const defaults = defaultsFrom(
        strict,
        env.defaults.dev,
        env.defaults.stage,
        env.defaults.prod,
    );
}
