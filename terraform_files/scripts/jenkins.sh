#!/bin/bash
exec > /var/log/user-data.log 2>&1

echo "========== [1/5] System update =========="
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget gnupg2 gnupg software-properties-common apt-transport-https ca-certificates unzip fontconfig

echo "========== [2/5] Install Java 17 =========="
apt-get install -y openjdk-17-jdk
java -version

echo "========== [3/5] Install Jenkins via direct .deb =========="
JENKINS_VERSION="2.492.3"
wget -q "https://mirrors.jenkins.io/debian-stable/jenkins_${JENKINS_VERSION}_all.deb" -O /tmp/jenkins.deb

# Install dependencies first then the deb
apt-get install -y -f
dpkg -i /tmp/jenkins.deb
apt-get install -y -f
rm -f /tmp/jenkins.deb

systemctl enable jenkins
systemctl start jenkins

echo "Waiting for Jenkins to start..."
sleep 30
COUNT=0
until curl -s http://localhost:8080 > /dev/null 2>&1; do
    echo "Jenkins not ready yet, waiting... ($COUNT)"
    sleep 10
    COUNT=$((COUNT+1))
    if [ $COUNT -gt 30 ]; then
        echo "Jenkins took too long, moving on..."
        break
    fi
done
echo "Jenkins is up!"

echo "========== [4/5] Install Docker =========="
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu
usermod -aG docker jenkins
systemctl restart jenkins

echo "========== [5/5] Install Trivy =========="
rm -f /usr/share/keyrings/trivy.gpg
rm -f /etc/apt/sources.list.d/trivy.list

curl -fsSL https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor -o /usr/share/keyrings/trivy.gpg
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -cs) main" > /etc/apt/sources.list.d/trivy.list
apt-get update -y
apt-get install -y trivy
trivy --version

echo "========== Install kubectl =========="
curl -fsSL "https://dl.k8s.io/release/$(curl -fsSL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" -o /usr/local/bin/kubectl
chmod +x /usr/local/bin/kubectl
kubectl version --client

echo "========== Install sonar-scanner =========="
SONAR_VERSION="6.2.1.4610"
wget -q "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SONAR_VERSION}-linux-x64.zip" -O /opt/sonar-scanner.zip
unzip -q /opt/sonar-scanner.zip -d /opt/
mv /opt/sonar-scanner-* /opt/sonar-scanner 2>/dev/null || true
rm -f /opt/sonar-scanner.zip
ln -sf /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner
sonar-scanner --version

echo "========== Verify all tools =========="
java -version
systemctl is-active jenkins
docker --version
trivy --version
kubectl version --client
sonar-scanner --version

echo "========== JENKINS INITIAL PASSWORD =========="
cat /var/lib/jenkins/secrets/initialAdminPassword

echo "========== Jenkins setup complete =========="