# How docker works for the Kinesis Broker

- Dockerfile
- Docker Compose
- Entry Points
- Environment
- Shared
- Secure

### Dockerfile

The purpose of the dockerfile is to create an 'image' that multiple services can use or define in the docker-compose files. Although we have the option of specifying images/commands inside of the docker-compose files, the separation of image/service allows us flexibility (multiple services using the same image).

At this point in development, all dockerfiles should be made generic. Commands and utilities that are required for each build of the image should be added here.

Good Examples: Copying files and directories
Bad Examples: npm installs, or building of binaries for a specific project

### DockerCompose

The purpose of docker-compose is to allow us creating a full service architecture for usage of the broker. One image can have many services in the dockercompose and allows us to create environments for our specific usage.

`Why do you have relative paths to dockerfiles, with the docker-compose file being at the root of the directory?`
Most of our time, either using git, or npm, will be spent at the root of the directory. It just makes more sense to have the docker-compose file at the root so we can run commands without specifying `-f` all the time (I also haven't gotten to adding makefile commands or fancy aliases).

### Entrypoints

We use endpoints to allow for easier communication of binaries/programs in the container. As an example, instead of calling the kcli like so `docker-compose run kcli ./bin/kcli buy 10 100... etc...`, we can simply use `docker-compose run kcli buy ...`.

### Environment

All environment variables for container will be processed through their associated `.env` files. In older setups of docker (including LND) environment variables were defined w/ bash scripts in entrypoint bash files. However, with new version of docker, we no longer need to specify environment variables in this way.

### Shared

### Secure

