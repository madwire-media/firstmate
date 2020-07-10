```
 _,_____                    _                        _
(  ,____/                 _| |__                   _| |__
 | |     (*)             \_   __`\                \_   __`\  __
 | |___   ., .-,..  ,-^^,  | |   _ ,-. ,-.   .-^||  | |    ,`  \
 \ ,--.| | | | ,-v ( (`-*  | |  | //| //||  / / ||  | |   / /* /
 | |     | | | |    `-.*.  | |  | / | / ||  | |/ |  | |   | ,-*,
 | |     |_| |_\   ( `-`*  |_\  |_| |_| |_\ *._.;_\ |_\    \__,*
 |.*                ^^^^
```

Firstmate is a tool to quicken and simplify your software development workflow on Kubernetes. With just a few commands you could create a new node.js or Apache project and get it running on Kubernetes.

If you want to try out V2 alpha, try the [v2 branch](https://github.com/madwire-media/firstmate/tree/v2).


## Install
In the future there could be binary releases for Firstmate, but for now just use NPM

### From NPM (not working yet)
```
$ npm install -g firstmate
```

### From Source
```
$ git clone https://github.com/madwire-media/firstmate
$ cd firstmate
$ npm i
$ npm run build
$ npm link
```


## Quickstart
Start by creating a new project

```
$ fm new project1
Copying files
Initializing Git Repository
Done
```

A project is a git repository that contains one or more services. Each service is a unit of code, like a website or database deployment, for example. We don't have any services in our project yet, and before we can add any we need to finish setting up our git repository.

Go setup a new blank repository on GitHub, GitLab, or wherever you host your git repositories, and then run this command:

```
$ cd project1
$ git remote add origin [repo url here]
```

Now we can add a new service, in this case a node.js express server.

```
$ fm add dockerDeployment node-js-express svc1
Copying from /usr/lib/node_modules/Firstmate/templates/dockerDeployment/node-js-express/source to source/svc1
Copying from /usr/lib/node_modules/Firstmate/templates/dockerDeployment/node-js-express/service to fm/svc1
```

Now you should have some node.js source code at `source/svc1` and some Docker and Helm stuff in `fm/svc1`. Firstmate also put some stuff into your `firstmate.hjson` file. Hjson is a human-readable extension of JSON, and it looks like this: (if you want to learn more, see [hjson.org](http://hjson.org/))

```hjson
{
    project: project1
    services: {
        svc1: {
            type: dockerDeployment

            branches: {
                ~default: {
                    inheritFrom: master
                }
                master: {
                    version: 0.1.0

                    cluster: "" // TODO: change this
                    registry: "" // TODO: change this if no default registry is set
                    chartmuseum: "" // TODO: change this for prod
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
                }
            }
        }
    }
}
```

**From here on out, this tutorial assumes you have a working Kubernetes cluster, access to a docker registry, and both Docker and Helm installed locally.** If you need some help with this, see [these installation instructions](./docs/Depencencies.md).

We're almost there, we just have to tell Firstmate where to push our Docker image to and where to host our service. Go ahead and fill in the `cluster` and `registry` properties and then add an `allowedModes` property like below. If you followed the local installation instructions then your urls should look something like `localhost:[port]`.

```
                    cluster: my.kubectl.context.here
                    registry: my.docker.registry.here
                    chartmuseum: "" // TODO: change this for prod
                    namespace: project1

                    allowedModes: ['dev']
```

Now you should be able to run `fm validate` without any issues:

```
$ fm validate
Detected git branch master

No issues detected
```

And then there's one last thing... we have to generate a `package-lock.json` file for our node service. Normally you would already have this generated if you were testing locally, but all we have to do is run:

```
$ cd source/svc1
$ npm i
npm notice created a lockfile as package-lock.json. You should commit this file.

added 623 packages from 381 contributors and audited 17429 packages in 9.72s
found 0 vulnerabilities
```

And finally we can go back to our project directory and run our new service in dev mode:

```
$ cd ../..
$ fm run dev svc1
[lots of output here]
```

And its up!

In a separate terminal you can run a kubectl command to access your new service:

```
$ kubectl -n project1 port-forward svc/svc1 8080:80
```

If you see a message about pods in the Pending status, just wait a little and try again.

Now if you head to [http://localhost:8080](http://localhost:8080) you should see a cheezy `(⌐■_■) #Yeeeaaahhh Boi!!!!!!!`

## So what just happened?
We:
* Created a new Firstmate project
* Created a Git repository for it and hooked it up
* Added a node.js express service to our new project
* Configured and validated the node.js service
* Initialized the source code for our service
* Pushed and ran our service on a Kubernetes cluster
* Tunneled your computer's port 8080 to your service's port 80

From here you can start editing the code for your node.js service, and when you are ready to test it out just run this command again:

```
$ fm run dev svc1
[lots of output here again]
```

**If you want to learn more about how to use Firstmate, [read the docs](./docs/)**
