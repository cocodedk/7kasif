#!/bin/bash
set -euo pipefail

# One-time setup for a fresh Ubuntu 24.04 Hetzner VPS
# Run as root: curl -sL <raw-url> | bash
# Or: ssh root@<ip> 'bash -s' < setup-server.sh

REPO_URL="git@github.com:cocodedk/7kasif.git"
APP_DIR="/opt/7kasif"
DEPLOY_USER="deploy"
DOMAIN="7kasif.dk"
ADMIN_EMAIL="babak@cocode.dk"

echo "==> Installing Docker..."
curl -fsSL https://get.docker.com | sh

echo "==> Installing Nginx, Certbot, Git, UFW..."
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx git ufw

echo "==> Creating deploy user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"

echo "==> Granting deploy user passwordless sudo for apt-get..."
cat > /etc/sudoers.d/$DEPLOY_USER <<SUDOEOF
Defaults:$DEPLOY_USER env_keep += "DEBIAN_FRONTEND"
$DEPLOY_USER ALL=(ALL) NOPASSWD: /usr/bin/apt-get
SUDOEOF
chmod 440 /etc/sudoers.d/$DEPLOY_USER

echo "==> Setting up SSH for deploy user..."
mkdir -p /home/$DEPLOY_USER/.ssh
cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/authorized_keys
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh
chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys

cp /root/.ssh/hetzner_deploy /home/$DEPLOY_USER/.ssh/hetzner_deploy
chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh/hetzner_deploy
chmod 600 /home/$DEPLOY_USER/.ssh/hetzner_deploy

echo "==> Configuring SSH for GitHub access..."
cat > /home/$DEPLOY_USER/.ssh/config <<SSHEOF
Host github.com
  IdentityFile /home/$DEPLOY_USER/.ssh/hetzner_deploy
  StrictHostKeyChecking accept-new
SSHEOF
chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh/config
chmod 600 /home/$DEPLOY_USER/.ssh/config

echo "==> Cloning repository..."
if [ -d "$APP_DIR" ]; then
  echo "    $APP_DIR already exists, pulling latest..."
  cd "$APP_DIR" && sudo -u $DEPLOY_USER git pull origin main
else
  sudo -u $DEPLOY_USER git clone "$REPO_URL" "$APP_DIR"
fi

echo "==> Generating database password..."
if [ ! -f "$APP_DIR/deploy/.db_password" ]; then
  openssl rand -base64 32 > "$APP_DIR/deploy/.db_password"
  chown $DEPLOY_USER:$DEPLOY_USER "$APP_DIR/deploy/.db_password"
  chmod 600 "$APP_DIR/deploy/.db_password"
fi

echo "==> Configuring Nginx..."
rm -f /etc/nginx/sites-enabled/default
ln -sf "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-enabled/hafte-kasif
nginx -t
systemctl reload nginx

echo "==> Configuring firewall..."
ufw --force enable
ufw allow 22
ufw allow 80
ufw allow 443

echo "==> Building and starting containers..."
cd "$APP_DIR"
sudo -u $DEPLOY_USER docker compose build
sudo -u $DEPLOY_USER docker compose up -d

echo "==> Enabling HTTPS with certbot..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL"

echo ""
echo "========================================="
echo "  Setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Add these GitHub secrets to your repo:"
echo "   HETZNER_HOST  = $(curl -s4 ifconfig.me)"
echo "   HETZNER_USER  = $DEPLOY_USER"
echo "   HETZNER_SSH_KEY = <your private SSH key>"
echo ""
echo "2. Point your domain's DNS A record to $(curl -s4 ifconfig.me)"
echo ""
