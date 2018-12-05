import * as t from 'io-ts';
import { ServiceType } from './service';
import { Registry, ChartMuseum, ServiceName, ProjectName } from './strings';

export interface IProject<S extends ServiceType<any, any>> {
    defaults?: {
        registry?: string,
        chartmuseum?: string,
        service?: string,
    };
    services: {[key: string]: t.TypeOf<S>};
    project: string;
}

export class ProjectType<
    S extends ServiceType<string, any>
> extends t.Type<IProject<S>> {
    // tslint:disable-next-line:variable-name
    public readonly _tag: 'ProjectType' = 'ProjectType';
    constructor(
        name: string,
        is: ProjectType<S>['is'],
        validate: ProjectType<S>['validate'],
        encode: ProjectType<S>['encode'],
        readonly serviceTypes: S[],
    ) {
        super(name, is, validate, encode);
    }
}

export function projectType<
    S extends ServiceType<any, any>
>(
    services: S[],
    name: string,
) {
    const project = t.intersection([
        t.type({
            project: ProjectName,
            services: t.dictionary(
                ServiceName,
                t.taggedUnion('type', services, 'AnyService'),
                'Services'
            ),
        }),
        t.partial({
            defaults: t.partial({
                registry: Registry,
                chartmuseum: ChartMuseum,
                service: ServiceName,
            }),
        }),
    ]);

    return new ProjectType(
        name,
        project.is,
        (m, cr): t.Validation<IProject<S>> => {
            return project.validate(m, cr);
        },
        (a) => {
            throw new Error('Cannot be decoded');
        },
        services,
    )
}
