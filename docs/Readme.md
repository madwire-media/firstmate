# Overview
A FirstMate project is a Git repository that contains all of the application code, infrastructure, and build instructions to get one or more applications deployed on Kubernetes. FirstMate projects also support git flow-based workflows, since the build instructions can vary based on.


A FirstMate project is a Git repository that contains one or more FirstMate services. There are four kinds of services:

* `dockerImage`: Builds and pushes a Docker image using a Dockerfile
  * Can be used to publish a Docker image to the Docker Hub or another registry
  * Can be used as a base Dockerfile for other services to build on
* `pureHelm`: Builds, pushes, and runs a Helm chart
  * Usually used for databases or other Helm charts
* `dockerDeployment`: A combination of a Helm chart and one or more Docker images to be included in the Helm chart
  * Usually used as an all-in-one service deployment
* `buildContainer`: A docker container that runs locally as part of the build process, usually to compile code
  * Usually used to compile or lint your code
  * Can be used to run any arbitrary commands on files

Most of the time when you are developing a codebase to be deployed on Kubernetes you will use `dockerDeployment` services.

Any service can depend on any other services as long as there aren't any loops, like maybe a `dockerDeployment` depends on a base Dockerfile from a `dockerImage` service, or maybe a `dockerImage` service depends on code compiled by a `buildContainer` service.

There are also three different modes to run your code in: `dev`, `stage`, and `prod`. Each mode is a little different:

* `dev`: Run your code in live development, maybe even with live reloading
    * Two `dev` modes for `dockerDeployment`s: `proxy` (default) and `local`
        * `proxy` mode runs everything on Kubernetes and optionally replaces a running container with a local one using Telepresence
        * `local` mode runs every container on a local docker network, skipping any helm charts - very limited
    * Both modes allow you to volume in your source code for live reloading
    * Every other kind of service is the same as in `stage`, just with a `dev` tag instead
* `stage`: Run your code in Kubernetes without jumping through any hoops
    * `dockerImage`s are pushed with the `stage` tag
    * `pureHelm` services are run with a `-stage` suffix
    * `dockerDeployments` also use `stage` tags and a `-stage` suffix for Docker and Helm, respectively
    * `buildContainer` just does its thing
* `prod`: Publish and version your code and then run it in Kubernetes
    * All code has to be versioned and published before it can be run
    * When code is published, a version lock/history file is updated - **this must be committed*
    * If a production push fails, you can revert the version in your `firstmate.hjson` file and re-run to revert everything back
    * Docker images are pushed to a registry with a versioned tag
    * Helm charts are pushed to a chartmuseum with a versioned tag

## File Structure
Required files have a `*` next to their name, and are only requried if their parent directory exists.
```
my-project/
  * .git/
  * fm/
        dockerImage/
          * Dockerfile
            bootstrap.sh, etc.
        pureHelm/
            charts/
                helmDep1/
                helmDep2/
          * templates/
                .note
                _helpers.tpl, etc.
                deployment.yaml, etc.
            .helmignore
          * Chart.yaml
          * values.yaml
        dockerDeployment/
            charts/
                helmDep1/
                helmDep2/
            docker/
                container1/
                  * Dockerfile
                    bootstrap.sh, etc.
                container2/
                  * Dockerfile
                    bootstrap.sh, etc.
          * templates/
                .note
                _helpers.tpl, etc.
                deployment.yaml, etc.
            .helmignore
          * Chart.yaml
          * values.yaml
        buildContainer/
          * Dockerfile
            bootstrap.sh, etc.
            output/
    source/
        dockerImage/
        dockerDeployment/
    .gitignore
  * firstmate.hjson (or firstmate.json, if you prefer)
```

## `firstmate.hjson`

Undoubtedly the most important file here is the `firstmate.hjson` file. It contains all the instructions for how to build, publish, and run your services. A simple example is shown below

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

In this example, I've made a project named `project1`, and it contains only one service, a `dockerDeployment` named `svc1`. Here, the `svc1` service has three different configurations, one for the `master` branch, one for the `stage` branch, and one for any other branch. Actual Git branches can't contain a tilde (`~`), so any branch configuration that starts with a `~` can only be used to inherit from, except for `~default`. When you are using FirstMate on a branch that isn't configured, then the `~default` configuration is used.

To save time and effort writing these configuration files, there is an `inheritFrom` property that copies all non-default properties from another branch. This means that in this
