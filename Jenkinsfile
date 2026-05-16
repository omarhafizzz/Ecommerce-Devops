pipeline {
    agent any

    environment {
        DOCKERHUB_USERNAME  = "omarhafiz"
        BACKEND_IMAGE       = "${DOCKERHUB_USERNAME}/ecommerce-backend"
        FRONTEND_IMAGE      = "${DOCKERHUB_USERNAME}/ecommerce-frontend"
        IMAGE_TAG           = "${BUILD_NUMBER}"
        SONAR_PROJECT_KEY   = "ecommerce"
        K8S_NAMESPACE       = "ecommerce"
    }

    stages {

        // ── 1. Clone ──────────────────────────────────────────────────────
        stage('Clone Repository') {
            steps {
                echo '>>> Cloning repository...'
                git branch: 'main',
                    url: 'https://github.com/omarhafizzz/ecommerce.git'
            }
        }

        // ── 2. SonarQube Analysis ─────────────────────────────────────────
        stage('SonarQube Analysis') {
            steps {
                echo '>>> Running SonarQube analysis...'
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                          -Dsonar.projectName="Ecommerce" \
                          -Dsonar.sources=. \
                          -Dsonar.exclusions=**/node_modules/**,**/dist/**
                    '''
                }
            }
        }

        // ── 3. Quality Gate ───────────────────────────────────────────────
        stage('Quality Gate') {
            steps {
                echo '>>> Waiting for SonarQube Quality Gate...'
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ── 4. Build Docker Images ────────────────────────────────────────
        stage('Build Docker Images') {
            steps {
                echo '>>> Building Backend and Frontend images...'
                sh '''
                    docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} ./backend
                    docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} ./frontend
                '''
            }
        }

        // ── 5. Trivy Security Scan ────────────────────────────────────────
        stage('Trivy Security Scan') {
            steps {
                echo '>>> Scanning images with Trivy...'
                sh '''
                    trivy image \
                      --exit-code 0 \
                      --severity HIGH,CRITICAL \
                      --format table \
                      --output trivy-backend-report.txt \
                      ${BACKEND_IMAGE}:${IMAGE_TAG}

                    trivy image \
                      --exit-code 0 \
                      --severity HIGH,CRITICAL \
                      --format table \
                      --output trivy-frontend-report.txt \
                      ${FRONTEND_IMAGE}:${IMAGE_TAG}

                    echo ">>> Backend Report:"
                    cat trivy-backend-report.txt
                    echo ">>> Frontend Report:"
                    cat trivy-frontend-report.txt
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-*.txt', allowEmptyArchive: true
                }
            }
        }

        // ── 6. Push to Docker Hub ─────────────────────────────────────────
        stage('Push to Docker Hub') {
            steps {
                echo '>>> Pushing images to Docker Hub...'
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "${DOCKER_PASS}" | docker login -u "${DOCKER_USER}" --password-stdin

                        # Backend
                        docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                        docker tag  ${BACKEND_IMAGE}:${IMAGE_TAG} ${BACKEND_IMAGE}:latest
                        docker push ${BACKEND_IMAGE}:latest

                        # Frontend
                        docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                        docker tag  ${FRONTEND_IMAGE}:${IMAGE_TAG} ${FRONTEND_IMAGE}:latest
                        docker push ${FRONTEND_IMAGE}:latest
                    '''
                }
            }
        }

        // ── 7. Remove Local Images ────────────────────────────────────────
        stage('Remove Local Images') {
            steps {
                echo '>>> Removing local Docker images...'
                sh '''
                    docker rmi ${BACKEND_IMAGE}:${IMAGE_TAG}  || true
                    docker rmi ${BACKEND_IMAGE}:latest        || true
                    docker rmi ${FRONTEND_IMAGE}:${IMAGE_TAG} || true
                    docker rmi ${FRONTEND_IMAGE}:latest       || true
                    docker image prune -f                     || true
                '''
            }
        }

        // ── 8. Deploy to Kubernetes ───────────────────────────────────────
        stage('Deploy to Kubernetes') {
            steps {
                echo '>>> Deploying to Kubernetes...'
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    sh '''
                        export KUBECONFIG=${KUBECONFIG}

                        # Apply all k8s manifests
                        kubectl apply -f k8s/00-namespace.yaml
                        kubectl apply -f k8s/01-secrets.yaml
                        kubectl apply -f k8s/02-postgres-pvc.yaml
                        kubectl apply -f k8s/03-postgres-configmap.yaml
                        kubectl apply -f k8s/04-postgres-deployment.yaml
                        kubectl apply -f k8s/05-backend-deployment.yaml
                        kubectl apply -f k8s/06-frontend-deployment.yaml
                        kubectl apply -f k8s/07-ingress.yaml

                        # Update images to the new build
                        kubectl set image deployment/backend \
                            backend=${BACKEND_IMAGE}:${IMAGE_TAG} \
                            --namespace=${K8S_NAMESPACE}

                        kubectl set image deployment/frontend \
                            frontend=${FRONTEND_IMAGE}:${IMAGE_TAG} \
                            --namespace=${K8S_NAMESPACE}

                        # Wait for rollouts
                        kubectl rollout status deployment/backend \
                            --namespace=${K8S_NAMESPACE} --timeout=120s

                        kubectl rollout status deployment/frontend \
                            --namespace=${K8S_NAMESPACE} --timeout=120s

                        echo ">>> Deployment complete!"
                        kubectl get pods --namespace=${K8S_NAMESPACE}
                    '''
                }
            }
        }
    }

    // ── Post Actions ──────────────────────────────────────────────────────
    post {
        success {
            echo """
            ============================================
             Pipeline SUCCESS
             Backend  : ${BACKEND_IMAGE}:${IMAGE_TAG}
             Frontend : ${FRONTEND_IMAGE}:${IMAGE_TAG}
             Build    : #${BUILD_NUMBER}
            ============================================
            """
        }
        failure {
            echo """
            ============================================
             Pipeline FAILED at stage: ${env.STAGE_NAME}
             Check the logs above for details.
            ============================================
            """
            sh 'docker image prune -f || true'
        }
        always {
            cleanWs()
        }
    }
}
