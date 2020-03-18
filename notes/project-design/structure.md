# Project Design > Structure

With Firstmate v0.1, the file structure was as follows:
* `/` (project root)
    * `firstmate.hjson` (single Firstmate config file)
    * `fm/` (Firstmate project data)
        * `my-build-service/` (build container service)
            * `Dockerfile`
            * `.dockerignore`
            * (other custom files)
        * `my-helm-service/` (Helm service)
            * `Chart.yaml`
            * `values.yaml`
            * `charts/`
                * (subcharts)
            * `templates/`
                * (template files)
            * `.helmignore`
            * (other custom files)
        * `my-image-service/` (Docker image service)
            * `Dockerfile`
            * `.dockerignore`
            * (other custom files)
        * `my-deploy-service/` (Docker deployment service)
            * `docker/`
                * `image1/`
                    * `Dockerfile`
                    * (other custom files, maybe `.dockerignore`)
                * (other Docker images)
            * `Chart.yaml`
            * `values.yaml`
            * `charts/`
                * (subcharts)
            * `templates/`
                * (template files)
            * `.helmignore`
            * (other custom files)
    * `source/` (colloquial source code directory)

### Benefits to this structure
* Firstmate services are independent from the source code, so a single bit of code can be reused in multiple Firstmate services.

### Issues with this structure
* Firstmate services are independent from their code, so it can be hard to identify and cross-reference source to Firstmate service
* There was only 1 Firstmate configuration file, and it became massive and unwieldly
* There was no templating for Firstmate service configuration, so there was a lot of config duplication

## Questions to answer for designing a new structure

#### Should the Firstmate services accompany the code, or stay strictly separated?
One of the big benefits of having all the Firstmate services together in one folder is that it's really easy to find them and figure out what can be deployed. I think it would be better to keep the Firstmate services separate from the code, because there will be cases of code duplication, there will be cases where Firstmate services have no code, and it can become really hard to manually discover Firstmate services in a project when they are scattered everywhere.

**Answer:** Keep Firstmate services and code separated

#### How should Firstmate config files be split up?
Since we won't have Firstmate services adjacent to code, and they will all live in the `fm` folder, there isn't much of a reason to configure workspaces and stuff like that. However, we will have service groups.

**Answer:** Add an `fm.service.hjson` for each service, and an `fm.group.hjson` for each service group.

## Changes to make to the structure
* Add a service group construct
* Move Firstmate service config down to each service
* Add project-level service templates
* Add project-level service config bases
* Split code into "Modules" and "Services"

## Types of Modules and Services
* Modules
    * module/docker-image - A Dockerfile and dependencies
    * module/helm - A helm chart's source code
* Services
    * service/docker-image - Push a Docker image to a registry
    * service/container - Run a Docker container locally
    * service/helm-chart - Push a Helm chart to a registry
    * service/helm-release - Run a Helm chart on a cluster

## New file structure
* `/` (project root)
    * `firstmate.hjson` (head Firstmate config file)
    * `fm/` (Firstmate project data)
        * `my-image-module/` (Docker image module)
            * `index.fm.hjson`
            * `Dockerfile`
            * `.dockerignore`
            * (other custom files)
        * `my-helm-module/` (Helm chart module)
            * `index.fm.hjson`
            * `Chart.yaml`
            * `values.yaml`
            * `charts/`
                * (subcharts)
            * `templates/`
                * (template files)
            * `.helmignore`
            * (other custom files)
        * `my-whatever-module.fm.hjson` (Alternate module style)
        * `my-whatever-module/` (Alternate module contents)
            * (whatever)
        * `my-service.fm.hjson` (Any service)
    * `fm.template/` (Custom Firstmate templates)
        * `my-module-template/` (Firstmate module template)
            * `module/` (Service code)
                * `index.fm.hjson`
                * `Dockerfile`
                * `.dockerignore`
                * (other custom files)
            * `source/` (Initial source code)
                * (source code files)
        * `my-service-template.fm.hjson`
    * `source/` (colloquial source code directory)

