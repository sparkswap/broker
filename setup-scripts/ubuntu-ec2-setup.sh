########################################################
# Sparkswap hosted broker setup for AWS EC2
#
# NOTE: These steps make heavy use of sudo, so make sure you have access
#       before continuing.
########################################################

# In order to install the latest, stable Docker CE, we need to add the docker repository
# to our ubuntu instance
# These steps were taken directly from https://docs.docker.com/install/linux/docker-ce/ubuntu/#install-docker-ce
#
## START OF DOCKER STEPS
sudo apt-get update
sudo apt-get install \
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

# We use pip to install the latest docker-compose instead of apt-get
pip install docker-compose

# Now we need to add our current user to the docker group which will allow us to use
# docker without root permission
sudo usermod -aG docker $USER

echo "Your current user will not be logged out/in"
echo "After this step is completed you are free to install the broker"
echo "as normal on the machine"
echo "For more info about remote brokers, see the docs:"

# Relog to let the user take effect
exec sudo su -l ubuntu
