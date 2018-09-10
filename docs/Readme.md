# Overview
A Firstmate project is a Git repository that contains all of the application code, infrastructure, and build instructions to get one or more applications deployed on Kubernetes. Firstmate projects also support git flow-based workflows, since the build instructions can be configured differently for different branches.


## Service Types
Firstmate projects contain one or more Firstmate services, and there are 4 types of these services:

* `dockerImage`: **Builds and pushes a Docker image using a Dockerfile**
  * Can be used to publish a Docker image to the Docker Hub or another registry
  * Can be used as a base Dockerfile for other services to build on
* `pureHelm`: **Builds, pushes, and runs a Helm chart**
  * Usually used for databases or other Helm charts
* `dockerDeployment`: **A combination of a Helm chart and one or more Docker images to be included with a Helm release**
  * Usually used as an all-in-one service deployment
* `buildContainer`: **A docker container that runs locally as part of the build process**
  * Usually used to compile or lint your code
  * Can be used to run any arbitrary commands on files

The most common service in a traditional use case is a `dockerDeployment`, since it adds a couple features tailored to application development.

## Service Depencencies
Firstmate services can depend on other services within the same project, so that when a service is run or deployed, its dependencies are run or deployed ahead of it. This is useful for example when a project has multiple `dockerImage`s that share parts of a Dockerfile from another `dockerImage`, or when a `dockerDeployment` contains compiled code generated from a `buildContainer`.

## Run Modes
Firstmate currently has three different modes to run and deploy your code in: `dev`, `stage`, and `prod`. Each is a little different:

* `dev`: **Run your code in live development, maybe even with live reloading**
    * There are two sub-modes for a `dockerDeployment` run in `dev` mode:
        * `proxy`: **Run everything on Kubernetes, except for an optional local container proxied through Telepresence**
        * `local`: **Run everything in Docker containers locally, skipping any Helm charts**
        * Both modes will allow you to volume in your source code for live reloading using the `services.myservice.containers.mycontainer.volumes{}` object ([see here for more info](./Schema.md#dockerdeployment))
    * `dockerImage` services are built and pushed with the `dev` tag
    * `pureHelm` services are run with a `-dev` suffix
    * `buildContainer` services just do their thing
* `stage`: **Run your production(ish) code in Kubernetes without jumping through any hoops**
    * `dockerImage` services are built and pushed with the `stage` tag
    * `pureHelm` services are run with a `-stage` suffix
    * `dockerDeployment` services also use `stage` tags and a `-stage` suffix for Docker and Helm, respectively
    * `buildContainer` services still do their thing
* `prod`: **Publish and version your code, then run it in Kubernetes**
    * All code must be versioned an published before it can be run in `prod` mode
    * When code is published, a version lock/history file is updated - **this must be committed**
    * **If a production push fails, you can revert the version in your `firstmate.hjson` file and re-run to revert everything back**
    * `dockerImage` services are built and pushed with a tag based on the service's version property
    * `pureHelm` services are pushed with the service's version to a chartmusem, and run without any suffixes
    * `dockerDeployment` services use the service's version property for Docker and Helm versioning
    * `buildContainer` services still don't change, but they are run during the publish operation

## Commands
* Project Management
    * `fm new <projectName>`: **Creates a new empty Firstmate project**
    * `fm add <type:enum> <template> <service> [--no-source]`: **Adds a new service to an existing Firstmate project**
        * `<type:enum>` can be any of `dockerImage`, `pureHelm`, `dockerDeployment`, or `buildContainer`
        * `<template>` is the name of the service template you want to install
        * `<service>` is the name of the new service
        * `[--no-source]` prevents copying the source code
    * `fm templates [type]`: **List templates to install with `fm add`**
        * `[type]` is optionally the template type to filter by
    * `fm clean`: **Clean up any dangling files if Firstmate crashed**
* Service Operations
    * `fm run <mode:enum> [service] [debug] [--dry]`: **Run a service**
        * May require Docker, Helm, and Telepresence depending on the service and what options are enabled
        * `<mode:enum>` can be any of `dev`, `stage`, or `prod`
        * `[service]` is the name of the service you want to run, or if omitted, the default service set in your `firstmate.hjson` file
        * `[debug]` only applies to `dockerDeployment` services, and is the name of the container you want to debug using Telepresence
        * `[--dry]` runs Helm in dry-run mode and builds Docker images, but never truly deploys any code to a Kubernetes cluster
    * `fm publish <mode:enum> [service]`: **Publish a service's images and charts**
        * *Only implemented for `prod` mode*
        * May require Docker and Helm, depending on the service and what options are enabled
        * `<mode:enum>` can be any of `dev`, `stage` or `prod`
        * `[service]` is the name of the service you want to publish, or if omitted, the default service set in your `firstmate.hjson` file
    * `fm purge <mode:enum> <service>`: **Delete all of a service's resources**
        * *Not implemented yet*
        * Requires Helm for any effect
        * Does not delete a service's dependencies
        * Depending on the mode, may confirm if you wish to delete resources
        * `<mode:enum>` can be any of `dev`, `stage`, or `prod`
        * `<service>` is the name of the service you want to purge
    * `fm debug <mode:enum> [service] <container>`: **Debug a container of a running service using Telepresence**
        * *Not implemented yet*
        * Requires Telepresence for any effect
        * Only works for `dockerDeployment` services
        * `<mode:enum>` can be any of `dev`, `stage`, or `prod`
        * `[service]` is the name of the service you want to debug, or if omitted, the default service set in your `firstmate.hjson` file
        * `<container>` is the name of the container you want to debug using Telepresence
    * `fm validate [service]`: **Validate one or all services' configurations**
        * `[service]` is the name of the service you want to validate, or if omitted, all services


## Basic File Structure
After completing the [Quickstart](../Readme.md#quickstart), you should have a file structure that looks roughly like this:

```
project1/
  * fm/
        svc1/
            charts/
            docker/
                main/
                  * Dockerfile
                    bootstrap.sh
          * templates
                .note
                _helpers.tpl
                NOTES.txt
                deployment.yaml
                routes.yaml
                service.yaml
          * Chart.yaml
          * values.yaml
    source/
        svc1/
            node_modules/
            src/
                app.js
                index.js
                index.test.js
            jest.config.js
            package.json
            package-lock.json
  * firstmate.hjson
```

A Firstmate project's files are usually split into three places, the `fm` folder, the `source` folder, and the `firstmate.hjson` file.

* `fm/`
    * Required
    * Contains all of the build files for every service (Dockerfiles and Helm Charts)
    * Each service type has a slightly different file structure, more info [here](./Filesystem.md)
* `source`
    * Optional
    * Usually contains the application source code for every service
* `firstmate.hjson`
    * Required
    * Contains instructions for Firstmate to build, run, and deploy each service of your project

## `firstmate.hjson`

Undoubtedly the most important file here is the `firstmate.hjson` file. A simple example is shown below

```hjson
{
    project: project1
    services: {
        svc1: {
            type: dockerDeployment

            branches: {
                ~default: {
                    inheritFrom: master

                    allowedModes: ['dev']
                }
                master: {
                    version: 0.1.0

                    cluster: my.kubectl.context.here
                    registry: my.docker.registry.here
                    chartmuseum: my.chartmuseum.here
                    namespace: project1

                    // Copy the package.json files and source code over
                    copyFiles: {
                        source/svc1/package.json: docker/main/package.json
                        source/svc1/package-lock.json: docker/main/package-lock.json
                        source/svc1/src: docker/main/src
                    }

                    dev: {
                        // Tell NPM to install dev packages
                        dockerArgs: {
                            NODE_ENV: development
                        }
                    }

                    allowedModes: ['prod']
                }
                stage: {
                    inheritFrom: master

                    allowedModes: ['stage']
                }
            }
        }
    }
}
```

This example is based on the [Quickstart](../Readme.md#quickstart) on the main README.

This `firstmate.hjson` file describes one service (`svc1`) for the project `project1`. That service has three different configurations - one for the `master` branch, one for the `stage` branch, and one for any other branch, presumably a feature branch.

The way we set configuration for all other branches is by using the `~default` branch name. `~default` can never be a real Git branch because `~` characters aren't allowed. You can also use a `~` at the beginning of any other branch name to indicate that it can still be inherited from, but never used directly.

Speaking of inheritance, branch configurations can inherit non-default properties from one or more other branches, as long as the inheritance never loops. When a configuration inherits from other configurations, objects are recursively merged and other types are overwritten.

Take the `stage` branch from the above example. It inherits all of the explicit properties from the `master` branch, but it overrides the `allowedModes` property to let the `stage` branch only run in `stage` mode. Same with the `~default` branch, except it allows only `dev` mode instead.
