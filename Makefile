ps-lnd:
	(cd docker/lnd-engine && docker-compose -p broker ps)

down-lnd:
	(cd docker/lnd-engine && docker-compose -p broker down)

up-lnd:
	(cd docker/lnd-engine && docker-compose -p broker up -d)

.PHONY: ps-lnd down-lnd up-lnd
