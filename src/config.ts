import * as fs from 'fs';

import { stringifyProps } from './helpers/transform';
import { BranchBase, Port } from './serviceTypes/base/branch';
import * as buildContainer from './serviceTypes/buildContainer/module';
import * as dockerDeployment from './serviceTypes/dockerDeployment/module';
import * as dockerImage from './serviceTypes/dockerImage/module';
import * as pureHelm from './serviceTypes/pureHelm/module';

import { parseBuildContainerBranches } from './config/buildContainer';
import { parseDockerDeploymentBranches } from './config/dockerDeployment';
import { parseDockerImageBranches } from './config/dockerImage';
import { makeError } from './config/helpers';
import { parsePureHelmBranches } from './config/pureHelm';
import { ConfigBase, ConfigContext, ConfigParams, ConfigService, Service } from './config/types';

import * as Ajv from 'ajv';
const configSchema = JSON.parse(fs.readFileSync(`${__dirname}/../assets/schema.json`, 'utf8'));

const ajv = new Ajv();
const validateConfig = ajv.compile(configSchema);

type ValidationErrors = Ajv.ErrorObject[];

export class Config {
    public static parseRaw(json: {}): Config | ValidationErrors {
        const isValid = validateConfig(json);

        if (!isValid) {
            return validateConfig.errors!;
        }

        const data = json as ConfigBase;
        const context: ConfigContext = {
            registry: data.defaults && data.defaults.registry,
            chartmuseum: data.defaults && data.defaults.chartmuseum,
        };

        const project = data.project;
        const defaultService = data.defaults && data.defaults.service;
        const services = parseServices(context, data.services);

        return new Config({
            project,
            defaultService,
            services,
        });
    }

    public project: string;
    public defaultService?: string;
    public services: {[serviceName: string]: Service};

    private constructor(params: ConfigParams) {
        this.project = params.project;
        this.defaultService = params.defaultService;
        this.services = params.services;
    }
}

function parseServices(context: ConfigContext,
                       data: {[serviceName: string]: ConfigService},
): {[serviceName: string]: Service} {
    const services: {[serviceName: string]: Service} = {};

    // JSON schema already checks service names

    for (const serviceName in data) {
        const rawService = data[serviceName];
        const serviceContext = {...context, serviceName};

        let service: Service;

        switch (rawService.type) {
            case 'dockerImage':
                service = new dockerImage.Service();
                service.branches = parseDockerImageBranches(serviceContext, rawService.branches);
                break;

            case 'dockerDeployment':
                service = new dockerDeployment.Service();
                service.branches = parseDockerDeploymentBranches(serviceContext, rawService.branches);
                break;

            case 'buildContainer':
                service = new buildContainer.Service();
                service.branches = parseBuildContainerBranches(serviceContext, rawService.branches);
                break;

            case 'pureHelm':
                service = new pureHelm.Service();
                service.branches = parsePureHelmBranches(serviceContext, rawService.branches);
                break;

            default:
                throw new Error(`Reached the unreachable: parsing service ${serviceName}`);
        }

        // Check service's dependsOn properties all exist
        for (const branchName in service.branches) {
            const branch = service.branches[branchName] as any as {[envName: string]: BranchBase | undefined};

            for (const envName of ['dev', 'stage', 'prod']) {
                const env = branch[envName];

                if (env === undefined) {
                    continue;
                }
                if (env.dependsOn !== undefined) {
                    for (const dependency of env.dependsOn) {
                        if (!(dependency in data)) {
                            throw makeError({...serviceContext, branchName},
                                `cannot depend on nonexistent service ${env.dependsOn}`);
                        }
                    }
                }
            }
        }

        services[serviceName] = service;
    }

    return services;
}
