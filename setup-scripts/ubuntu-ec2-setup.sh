########################################################
# Sparkswap hosted broker setup for an AWS Ubuntu 16.04 LTS EC2 instance
#
# These steps are intended to work with a newly created, default Ubuntu EC2 instance.
#
# EC2 Setup Steps:
# 1. update system deps
# 2. Add Docker CE repo to apt-get
# 3. Install dev deps (nvm, pip, build tools, docker-compose)
# 4. Add our current user to the docker group
# 5. restart the session so permissions will take effect
#
########################################################

#
sudo apt-get update
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common

# Add docker's gpg key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# And verify the last 8 digits
sudo apt-key fingerprint 0EBFCD88

# Setup the Docker CE ubuntu stable repo
sudo add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"

## END OF DOCKER STEPS

# Now we can install dependencies
sudo apt-get update
sudo apt-get install -y docker-ce python-setuptools python-pip build-essential libssl-dev

# Installing NVM for use w/ the CLI
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash

# Install our node version which is 8.11.x
nvm install 8.11 --latest-npm

# We use pip as an alternative way to install the latest docker-compose instead
# of apt-get/curl. Currently, apt-get is out-of-date and curl would require additional
# steps to install AND upgrade the packages.
pip install docker-compose

# Now we need to add our current user to the docker group which will allow us to use
# docker without root permission
sudo usermod -aG docker $USER

echo "Your current user will be logged out/in to allow user permissions to be"
echo "updated for the current user: $USER"
echo ""
echo "After this step is completed you can install the broker"
echo "For more info about remote brokers, see the docs: https://sparkswap.com/docs/"
echo ""

# Relog to let the user group take effect
exec sudo su -l ubuntu
