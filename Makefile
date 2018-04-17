# This MAKEFILE is meant to provide simple helpers to build and run containers needed
# to setup the Broker/Relayer for the Kinesis Exchange
#
# Any advanced functionality should be omitted from this file.
#
# If you need to run specific commands in one of the associated docker folders, please
# `cd` and run docker-compose from there.
#

build_broker:
	docker-compose -f ./docker/docker-compose.yml build --force-rm

start_broker:
	docker-compose -f ./docker/docker-compose.yml up -d

build_client:
	docker-compose -f ./docker-user/docker-compose.yml build --force-rm

start_client:
	docker-compose -f ./docker-user/docker-compose.yml up -d

start: start_client start_broker


.PHONY: build_broker build_client start start_broker start_client
