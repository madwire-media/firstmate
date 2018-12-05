import * as buildContainer from './config/buildContainer';
import * as dockerDeployment from './config/dockerDeployment';
import * as dockerImage from './config/dockerImage';
import * as pureHelm from './config/pureHelm';
import { projectType, IProject } from './config/types/project';

import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { ServiceType, IService } from './config/types/service';
import { BranchType } from './config/types/branch';
import { applyDefaults } from './config/types/serviceDefaults';
import { ServiceName } from './config/types/strings';
import { Left } from 'fp-ts/lib/Either';
import { IoContext } from './util/io-context';
import { merge } from './util/mergable';
import { inspect } from 'util';

const project = projectType([
    buildContainer.service,
    dockerDeployment.service,
    dockerImage.service,
    pureHelm.service,
], 'FirstmateProject');

type StrictService<
    S extends ServiceType<any, any>,
    BS extends BranchType<any, any, any, any>
> = IService<
    S['type'],
    BS
>;

type BuildContainerServiceStrict = StrictService<
    typeof buildContainer.service,
    typeof buildContainer.branch.strict
>;
type PureHelmServiceStrict = StrictService<
    typeof pureHelm.service,
    typeof pureHelm.branch.strict
>;
type DockerImageServiceStrict = StrictService<
    typeof dockerImage.service,
    typeof dockerImage.branch.strict
>;
type DockerDeploymentServiceStrict = StrictService<
    typeof dockerDeployment.service,
    typeof dockerDeployment.branch.strict
>;

export type Service =
    | BuildContainerServiceStrict
    | PureHelmServiceStrict
    | DockerImageServiceStrict
    | DockerDeploymentServiceStrict;

export type Config = IProject<
    | ServiceType<typeof buildContainer.branch.type, typeof buildContainer.branch.strict>
    | ServiceType<typeof pureHelm.branch.type, typeof pureHelm.branch.strict>
    | ServiceType<typeof dockerImage.branch.type, typeof dockerImage.branch.strict>
    | ServiceType<typeof dockerDeployment.branch.type, typeof dockerDeployment.branch.strict>
>;

export type Branch =
    | t.TypeOf<typeof buildContainer.branch.strict>
    | t.TypeOf<typeof pureHelm.branch.strict>
    | t.TypeOf<typeof dockerImage.branch.strict>
    | t.TypeOf<typeof dockerDeployment.branch.strict>;

export type BranchEnv = NonNullable<
    | Branch['dev']
    | Branch['stage']
    | Branch['prod']
>;

export function parseRaw(json: {}): Config | string[] {
    const result = project.decode(json);

    if (result.isLeft()) {
        return PathReporter.report(result);
    }

    const configPartial = result.value;
    const servicesPartial = configPartial.services;
    const strictServices: {[serviceName: string]: Service} = {};
    const baseContext = {
        registry: configPartial.defaults && configPartial.defaults.registry,
        chartmuseum: configPartial.defaults && configPartial.defaults.chartmuseum,
        project: configPartial.project,
    };
    const errors = [];
    const baseTContext = new IoContext()
        .sub('services', t.dictionary(ServiceName, t.union(project.serviceTypes, 'AnyService')));

    console.log(inspect(configPartial, {depth: 10, colors: true}));

    for (const serviceName in servicesPartial) {
        const servicePartial = servicesPartial[serviceName];
        const serviceContext = {
            service: serviceName,
            ...baseContext
        };

        if (servicePartial.type === 'buildContainer') {
            const serviceValid = applyDefaults<
                'buildContainer',
                typeof buildContainer.branch.exact.dev,
                typeof buildContainer.branch.exact.stage,
                typeof buildContainer.branch.exact.prod,
                typeof buildContainer.branch.strict.dev,
                typeof buildContainer.branch.strict.stage,
                typeof buildContainer.branch.strict.prod,
                typeof buildContainer.branch.exact,
                typeof buildContainer.branch.strict,
                typeof buildContainer.branch.defaults,
                typeof servicePartial
            >(
                buildContainer.branch.defaults,
                servicePartial,
                serviceContext,
                baseTContext
                    .sub(serviceName, buildContainer.branch.strict),
            );
            if (serviceValid.isLeft()) {
                errors.push(...serviceValid.value);
            } else {
                strictServices[serviceName] = serviceValid.value;
            }
        } else if (servicePartial.type === 'pureHelm') {
            const serviceValid = applyDefaults<
                'pureHelm',
                typeof pureHelm.branch.exact.dev,
                typeof pureHelm.branch.exact.stage,
                typeof pureHelm.branch.exact.prod,
                typeof pureHelm.branch.strict.dev,
                typeof pureHelm.branch.strict.stage,
                typeof pureHelm.branch.strict.prod,
                typeof pureHelm.branch.exact,
                typeof pureHelm.branch.strict,
                typeof pureHelm.branch.defaults,
                typeof servicePartial
            >(
                pureHelm.branch.defaults,
                servicePartial,
                serviceContext,
                baseTContext
                    .sub(serviceName, pureHelm.branch.strict),
            );
            if (serviceValid.isLeft()) {
                errors.push(...serviceValid.value);
            } else {
                strictServices[serviceName] = serviceValid.value;
            }
        } else if (servicePartial.type === 'dockerImage') {
            const serviceValid = applyDefaults<
                'dockerImage',
                typeof dockerImage.branch.exact.dev,
                typeof dockerImage.branch.exact.stage,
                typeof dockerImage.branch.exact.prod,
                typeof dockerImage.branch.strict.dev,
                typeof dockerImage.branch.strict.stage,
                typeof dockerImage.branch.strict.prod,
                typeof dockerImage.branch.exact,
                typeof dockerImage.branch.strict,
                typeof dockerImage.branch.defaults,
                typeof servicePartial
            >(
                dockerImage.branch.defaults,
                servicePartial,
                serviceContext,
                baseTContext
                    .sub(serviceName, dockerImage.branch.strict),
            );
            if (serviceValid.isLeft()) {
                errors.push(...serviceValid.value);
            } else {
                strictServices[serviceName] = serviceValid.value;
            }
        } else if (servicePartial.type === 'dockerDeployment') {
            const serviceValid = applyDefaults<
                'dockerDeployment',
                typeof dockerDeployment.branch.exact.dev,
                typeof dockerDeployment.branch.exact.stage,
                typeof dockerDeployment.branch.exact.prod,
                typeof dockerDeployment.branch.strict.dev,
                typeof dockerDeployment.branch.strict.stage,
                typeof dockerDeployment.branch.strict.prod,
                typeof dockerDeployment.branch.exact,
                typeof dockerDeployment.branch.strict,
                typeof dockerDeployment.branch.defaults,
                typeof servicePartial
            >(
                dockerDeployment.branch.defaults,
                servicePartial,
                serviceContext,
                baseTContext
                    .sub(serviceName, dockerDeployment.branch.strict),
            );
            if (serviceValid.isLeft()) {
                errors.push(...serviceValid.value);
            } else {
                strictServices[serviceName] = serviceValid.value;
            }
        }
    }

    if (errors.length > 0) {
        return PathReporter.report(new Left(errors));
    }

    if (Object.keys(strictServices).length > 0) {
        return merge(
            {
                services: strictServices,
            },
            {
                // Prevent configPartial.services from merging with strictServices
                services: null,
            },
            configPartial as any,
        );
    } else {
        return configPartial as any;
    }

}
