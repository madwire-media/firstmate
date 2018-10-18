import { Config, Service } from '../config';

export interface TestConfigSchema {
    [serviceName: string]: TestServiceSchema;
}

export interface TestServiceSchema {
    type: Service['type'];
    branches: {
        [branchName: string]: TestBranchSchema,
    };
}

export interface TestBranchSchema {
    dev?: null | TestBranchEnvSchema;
    stage?: null | TestBranchEnvSchema;
    prod?: null | TestBranchEnvSchema;
}

export interface TestBranchEnvSchema {
    [property: string]: any;
}

function matchArrays(a: any[], b: any[]) {
    a = a.slice().sort();
    b = b.slice().sort();

    expect(a).toEqual(b);
}

function matchObjects(schema: any, data: any) {
    for (const key in schema) {
        console.log(`        property ${key}`);
        if (schema[key] === undefined) {
            expect(data[key]).toBeUndefined();
        } else if (typeof schema[key] === 'object') {
            expect(typeof data[key]).toBe('object');
            matchObjects(schema[key], data[key]);
        } else {
            expect(data[key]).toEqual(schema[key]);
        }
    }
}

export function testServices(schema: TestConfigSchema, config: Config['services']) {
    // Test that both have the exact same service names
    matchArrays(Object.keys(config), Object.keys(schema));

    for (const serviceName in schema) {
        console.log(`service ${serviceName}`);
        const schemaService = schema[serviceName];
        const configService = config[serviceName];

        // Test that both services are the same type
        expect(configService.type).toBe(schemaService.type);

        // Test that both services have the exact same branch names
        matchArrays(
            Object.keys(configService.branches),
            Object.keys(schemaService.branches),
        );

        for (const branchName in schemaService.branches) {
            console.log(`    branch ${branchName}`);
            const schemaBranch = schemaService.branches[branchName];
            const configBranch = configService.branches[branchName];

            if (schemaBranch.dev === null) {
                expect(configBranch.dev).toBeUndefined();
            } else if (schemaBranch.dev !== undefined) {
                expect(configBranch.dev).toBeDefined();
                matchObjects(schemaBranch.dev, configBranch.dev);
            }

            if (schemaBranch.stage === null) {
                expect(configBranch.stage).toBeUndefined();
            } else if (schemaBranch.stage !== undefined) {
                expect(configBranch.stage).toBeDefined();
                matchObjects(schemaBranch.stage, configBranch.stage);
            }

            if (schemaBranch.prod === null) {
                expect(configBranch.prod).toBeUndefined();
            } else if (schemaBranch.prod !== undefined) {
                expect(configBranch.prod).toBeDefined();
                matchObjects(schemaBranch.prod, configBranch.prod);
            }
        }
    }
}
