# `firstmate.hjson` Schema
You can find the JSON-Schema definition at `../assets/schema.json`.

* `project`: *string* **The name of your Firstmate project**
    * **Required**
* `defaults`: *object* **Default properties for your Firstmate project**
    * See section [Defaults](#Defaults)
* `services`: *object* **The configurations for every service of your Firstmate project**
    * **Required**
    * See section [Services](#Services)

## Defaults
As of now there are only a few defaults you can set:

* `registry`: *string* **The url of the default docker registry/hub for this project**
* `chartmuseum`: *string* **The url of the default chartmuseum for this project**
* `service`: *string* **The default service of this project**
    * By setting the default service you can usually omit the `[service]` parameter in Firstmate commands and Firstmate will infer you mean this service

## Services
The services object is indexed by the name of the service:

* `[service name]`: *object* **Configuration for a single Firstmate service**
    * `type`: *enum* **The type of service**
        * **Required**
        * Can be `dockerImage`, `pureHelm`, `dockerDeployment`, or `buildContainer`
    * `branches`: *object* **Branch-based configurations for this service**
        * `[branch name]`: *object* **Configuration for a branch of this service**
            * `copyFiles`: *object* **List of files/folders to copy before building/running this service**
            * `dependsOn`: *string[]* **List of services that need to be deployed before this one**
            * `dev`: *object* **Properties specific to `dev` mode**
            * `stage`: *object* **Properties specific to `stage` mode**
            * `prod`: *object* **Properties specific to `prod` mode**
            * Any properties specific to `dev`, `stage`, or `prod` properties are also valid at the branch config's root, and all other properties at the branch config's root are valid in every `dev`, `stage`, and `prod` object too.
            * *This object is incomplete*, for more specific information, go to the definitions for [`dockerImage`](#DockerImage), [`pureHelm`](#PureHelm), [`dockerDeployment`](#DockerDeployment), or [`buildContainer`](#BuildContainer)

### DockerImage
This section only contains additions to the base service object. For more information see [Services](#Services).

Properties for any mode:
* `registry`: *string* **The registry to publish the Docker image to**
    * **Required if default unset**
* `imageName`: *string* **Name to publish the image under**
* `dockerArgs`: *object* **List of Docker build arguments**
    * `[arg name]`: *string* **Argument value**

There are no additional `dev`-, `stage`-, or `prod`-specific properties for `dockerImage`.

### PureHelm
This section only contains additions to the base service object. For more information see [Services](#Services).

Properties for any mode:
* `chartmuseum`: *string* **The chartmuseum to publish the Helm chart to**
    * **Required for `publish` operation** (and therefore for `prod` mode too)
* `cluster`: *string* **The name of the kubectl context to use**
    * **Required**
* `namespace`: *string* **The name of the Kubernetes namespace to deploy the Helm chart under**
    * **Required**
* `releaseName`: *string* **What to name the release when it is published**
* `helmArgs`: *object* **Values to set for deploying the Helm chart**
    * `[arg name]`: *string* **Argument value**

There are no additional `dev`-, `stage`-, or `prod`-specific properties for `pureHelm`.

### DockerDeployment
This section only contains additions to the base service object. For more information see [Services](#Services).

Properties for any mode:
* `registry`: *string* **The registry to publish the Docker images to**
    * **Required if default unset**
* `imageNamePrefix`: *string* **Prefix of the name to publish Docker images under**
* `containers`: *object* **Container-specific configurations**
    * `[container name]`: *object* **Configuration for a Docker container**
        * `dockerArgs`: *object* **List of Docker build arguments**
            * `[arg name]`: *string* **Argument value**
        * `volumes`: *object* **List of project files/folders to volume into the container**
            * `[container dest]`: *string* **Source file/folder**
            * Used only when debugging a container or otherwise running it locally
            * Helpful for live reloading
        * `k8sVolumes`: *object* **List of volumes mounted by Kubernetes**
            * `[container dest]`: *string* **Source file/folder**
            * **Requires `debugCMD`**
            * Used only when debugging a container
            * The source should be something under `/tmp/telepresence/*`
            * Telepresence doesn't mount your volumes directly to your locally running container, so this acts like a shim since telepresence's volumes are mounted under `/tmp/telepresence`
        * `ports`: *(number or object)[]* **List of ports to expose locally**
            * Used only when debugging a container
            * When a number is specified, that is assumed to be the local and remote component
            * Otherwise, `remote` is the container's port, and `local` is the port to forward to locally
        * `debugCMD`: *string* **Command to run when debugging**
            * Used only when debugging a container
            * Sets the command to run inside a debug container

Properties for `dev` mode only:
* `mode`: *enum* **The dev mode to run in**
    * `"proxy"`
        * **Default**
        * Runs everything in Kubernetes, except for an optional container run locally through Telepresence
    * `"local"`
        * Runs everything locally in a Docker network, but skips the Helm charts
* `pushDebugContainer`: *boolean* **Whether or not to still push the container being debugged to the Docker registry**
* `autodelete`: *boolean* **Whether or not to delete all resources when Firstmate exits**

There are no additional `dev`- or `prod`-specific properties for `dockerDeployment`.


### BuildContainer
This section only contains additions to the base service object. For more information see [Services](#Services).

Properties for any mode:
* `volumes`: *object* **List of project files/folders to volume into the container**
    * `[container dest]`: *string* **Source file/folder**
    * Mounted folders can also export data from the container
* `dockerArgs`: *object* **List of Docker build arguments**
    * `[arg name]`: *string* **Argument value**
