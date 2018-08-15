### Hosting the Broker

Lets provide a secure connection between the CLI (from your local computer) and the daemon which would be running on a cloud provider such as GCP, DigitalOcean or AWS.

A public/private x509 key pair is generated for the broker at `/secure/broker-rpc-tls.cert` and `/secure/broker-rpc-tls.key` respectively. The default setup will have SSL enabled.

On the client machine, you must copy the public key `.cert` and save it to the certs directory in the `./broker-cli`.

```
# Grab the cert from the container and put it on the host
# NOTE: As an example we have the container name as `broker_sparkswapd_1` however you
#       may need to check docker ps for the container name
#
docker cp broker_sparkswapd_1:/secure/broker-rpc-tls.cert ./

# from the host SCP to your current installation
scp youruser@your.server.name:~/broker-rpc-tls.cert ./broker-cli/certs
```

If you are doing local development, you can simply use:
```
# NOTE: As an example we have the container name as `broker_sparkswapd_1` however you
#       may need to check docker ps for the container name
docker cp broker_sparkswapd_1:/secure/broker-rpc-tls.cert ./broker-cli/certs
```

