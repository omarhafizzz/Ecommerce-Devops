#!/bin/bash
exec > /var/log/user-data.log 2>&1

echo "========== [1/3] System update =========="
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget apt-transport-https ca-certificates gnupg

echo "========== [2/3] System tuning for SonarQube =========="
sysctl -w vm.max_map_count=524288
sysctl -w fs.file-max=131072

cat >> /etc/sysctl.conf <<EOF2
vm.max_map_count=524288
fs.file-max=131072
EOF2

echo "========== [3/3] Install Docker =========="
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

echo "========== Run SonarQube + PostgreSQL via Docker Compose =========="
mkdir -p /opt/sonarqube

cat > /opt/sonarqube/docker-compose.yml <<COMPOSE
version: "3"

services:
  sonarqube:
    image: sonarqube:lts-community
    container_name: sonarqube
    restart: always
    depends_on:
      - db
    environment:
      SONAR_JDBC_URL: jdbc:postgresql://db:5432/sonarqube
      SONAR_JDBC_USERNAME: sonarqube
      SONAR_JDBC_PASSWORD: sonarqube123
    ports:
      - "9000:9000"
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_logs:/opt/sonarqube/logs
      - sonarqube_extensions:/opt/sonarqube/extensions

  db:
    image: postgres:15
    container_name: sonarqube-db
    restart: always
    environment:
      POSTGRES_USER: sonarqube
      POSTGRES_PASSWORD: sonarqube123
      POSTGRES_DB: sonarqube
    volumes:
      - postgresql_data:/var/lib/postgresql/data

volumes:
  sonarqube_data:
  sonarqube_logs:
  sonarqube_extensions:
  postgresql_data:
COMPOSE

# Start SonarQube
docker compose -f /opt/sonarqube/docker-compose.yml up -d

echo "Waiting for SonarQube to start (~2 minutes)..."
sleep 60
COUNT=0
until curl -s http://localhost:9000/api/system/status | grep -q '"status":"UP"'; do
    echo "SonarQube not ready yet, waiting... ($COUNT)"
    sleep 15
    COUNT=$((COUNT+1))
    if [ $COUNT -gt 20 ]; then
        echo "SonarQube taking too long, check: docker logs sonarqube"
        break
    fi
done
echo "SonarQube is UP!"

echo "========== Verify =========="
docker ps
curl -s http://localhost:9000/api/system/status

echo "========== SonarQube setup complete =========="
echo "Access : http://<public-ip>:9000"
echo "Default: admin / admin"