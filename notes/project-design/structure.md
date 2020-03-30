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
* There was only 1 Firstmate configuration file, and it became massive and unwieldy
* There was no templating for Firstmate service configuration, so there was a lot of config duplication
* Firstmate's service-types made some assumptions and limited flexibility

## Questions to answer for designing a new structure

#### Should the Firstmate services accompany the code, or stay strictly separated?
One of the big benefits of having all the Firstmate services together in one folder is that it's really easy to find them and figure out what can be deployed. I think it would be better to keep the Firstmate services separate from the code, because there will be cases of code duplication, there will be cases where Firstmate services have no code, and it can become really hard to manually discover Firstmate services in a project when they are scattered everywhere.

**Answer:** Keep Firstmate services and code separated

#### How should Firstmate config files be split up?
Since we won't have Firstmate services adjacent to code, and they will all live in the `fm` folder, there isn't much of a reason to configure workspaces and stuff like that. However, we will have service groups.

**Answer:** Add an `index.fm.hjson` or `[source/name].fm.hjson` for every module or service

## Changes to make to the structure
* Allow services to be grouped in folders
* Move Firstmate service config down to each service
* Add project-level service templates/bases
* Split code into 3 module types: "Sources", "Build Steps", and "Services"

## Types of Modules
* Sources
    * source/docker-image - A Dockerfile and dependencies
    * source/helm - A helm chart's source code
* Build steps
    * step/empty - Does nothing, intended for grouping dependencies
    * step/docker-push - Push a Docker image to a registry
    * step/container - Run a Docker container locally
    * step/deferred-container - Run a Docker container locally after everything else
    * step/helm-push - Push a Helm chart to a registry
    * step/helm-release - Create a Helm release on a cluster (aka run a Helm chart)
* Service
    * service/main - A versioned collection of build steps that you run commands on
    * service/child - A collection of build steps with an interpolated version param

## New file structure
* `/` (project root)
    * `firstmate.hjson` (head Firstmate config file)
    * `firstmate.lock` (top-level Firstmate config lock file)
    * `fm/` (Firstmate project data)
        * `my-image/` (Docker image source)
            * `index.fm.hjson`
            * `Dockerfile`
            * `.dockerignore`
            * (other custom files)
        * `my-helm/` (Helm chart source)
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
        * `my-service.fm.hjson` (Service)
        * `my-service.fm.hist` (Service history file)
    * `fm.template/` (Custom Firstmate templates)
        * `my-module-template/` (Firstmate template)
            * `fm/` (Modules)
                * `source/` (Source module)
                    * `index.fm.hjson`
                    * `Dockerfile`
                    * `.dockerignore`
                    * (other custom files)
                * `publish.fm.hjson` (Example build step or other module)
                * `index.fm.hjson` (Example service or other module)
            * `source/` (Initial source code, optional)
                * (source code files)
        * `my-service-template.fm.hjson`
    * `source/` (colloquial source code directory)

### Lockfile structure and contents
Top-level `firstmate.lock` (locks the lock files):
```json
{
    "my-service": "[hash]",
    "my-other-service": "[hash]"
}
```

`*.fm.hist` contents:
```json
{
    "history": {
        "[version]": {
            "git": "[git hash]",
            "lockfile": "[file hash]"
        }
    }
}
```

`*.fm.lock` contents (minified, since it disappears):
```json
{
    "version": "[version string]",
    "config": "[hash]",
    "resources": {
        "[step name]": {
            "config": "[hash]",
            "contents": "[hash]",
            "dependencies": {
                "[dep name]": "[you get the idea]"
            }
        }
    },
    "environment": {
        "[key]": {
            "[other key]": "[value]"
        }
    }
}
```

Algorithm for locking a version:
* Require clean git before starting
* Update service version if necessary
* Hash all of the build artifacts and steps
* Create a lock file with the current version, hashes, and environment
* Commit the lock file and changes:
    * Git add [service file] [lock file]
    * Git commit -m "Publish [service]@[version]"
* Update the history file
    * Add an entry with the hash of the current lock file and the current git hash
* Delete the lock file
* Update the `firstmate.lock` file
    * Set the service's hash to the lock file's hash
* Commit the history file
    * Git add [`firstmate.lock`] [history file] [lock file]
    * Git commit -m "Lock [service]@[version]"

<!-- Algorithm for validating a lock file for a particular version:
* Read, parse, and validate the top-level `firstmate.lock` file
    * If the file doesn't exist, exit (no versions deployed or root lock file deleted)
    * If the file is corrupted, exit (root lock file corrupted or modified)
    * If there isn't a hash for the given service, exit (no versions deployed or root lock file corrupted)
    * Otherwise, get the hash for the given service, hereby named `rootHash`
* Read and parse the service's `*.lock` file
    * If the file doesn't exist, exit (no versions deployed or service lock file deleted)
    * If the file is corrupted, exit (root lock file corrupted or modified)
* Hash the service's `*.lock` file by re-stringifying it
    * If the hash doesn't match, exit (service lock file does not match root lock hash)
* Validate the service's `*.lock` file
    * If the file is corrupted, exit (service lock file corrupted or invalid format)
* Validate the service's `*.lock` file hashes
    * Test the current -->
