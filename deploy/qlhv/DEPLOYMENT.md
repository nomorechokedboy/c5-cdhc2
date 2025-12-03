# QLHV K3s Deployment Guide

This guide shows how to deploy the QLHV application to K3s using Helm charts and Kubernetes manifests.

## Prerequisites

1. K3s cluster running
2. kubectl configured
3. Helm 3 installed

## Architecture Overview

- **API Service**: Internal ClusterIP service (qlhv-api:8080)
- **Web Service**: Public-facing service with Ingress
- **NSQ**: Message queue (using official nsqio Helm chart)
- **MinIO**: Object storage (using Bitnami Helm chart)
- **CronJobs**: 6 independent Kubernetes CronJobs for scheduled tasks

## Deployment Steps

### 1. Add Helm Repositories

```bash
# Add NSQ Helm repository
helm repo add nsqio https://nsqio.github.io/helm-chart

# Add Bitnami repository for MinIO
helm repo add bitnami https://charts.bitnami.com/bitnami

# Update repositories
helm repo update
```

### 2. Install Dependencies

#### Install NSQ
```bash
helm install nsq nsqio/nsq \
  --namespace qlhv \
  --create-namespace \
  --set nsqlookupd.replicaCount=1 \
  --set nsqd.replicaCount=1
```

#### Install MinIO
```bash
helm install minio bitnami/minio \
  --namespace qlhv \
  --set auth.rootUser=admin.cdhc2 \
  --set auth.rootPassword=Cntt@Hc2 \
  --set defaultBuckets=my-first-bucket \
  --set service.type=ClusterIP \
  --set persistence.size=10Gi
```

### 3. Create Application Secret

Create a secret for your API environment variables (from .env.prod):

```bash
kubectl create secret generic qlhv-api-env \
  --namespace qlhv \
  --from-env-file=.env.prod
```

Or create manually:

```bash
kubectl create secret generic qlhv-api-env \
  --namespace qlhv \
  --from-literal=DATABASE_URL="file:/workspace/apps/api/local.db" \
  --from-literal=NSQ_LOOKUPD_HTTP_ADDRESS="nsq-nsqlookupd:4161" \
  --from-literal=NSQ_NSQD_TCP_ADDRESS="nsq-nsqd:4150" \
  --from-literal=MINIO_ENDPOINT="minio:9000" \
  --from-literal=MINIO_ROOT_USER="admin.cdhc2" \
  --from-literal=MINIO_ROOT_PASSWORD="Cntt@Hc2"
```

### 4. Create Helm Chart

Since you want to use the default Helm chart structure, create it:

```bash
helm create qlhv-chart
```

Then replace the default `values.yaml` with `values-api.yaml` or `values-web.yaml` when deploying.

### 5. Deploy API Service

```bash
helm install qlhv-api ./qlhv-chart \
  --namespace qlhv \
  --values values-api.yaml
```

### 6. Deploy Web Service

```bash
helm install qlhv-web ./qlhv-chart \
  --namespace qlhv \
  --values values-web.yaml
```

### 7. Deploy CronJobs

First, create the ConfigMap with cron scripts:

```bash
kubectl apply -f configmap-cron-scripts.yaml -n qlhv
```

Then deploy all CronJobs:

```bash
kubectl apply -f cronjob-weekly-birthday.yaml -n qlhv
kubectl apply -f cronjob-monthly-birthday.yaml -n qlhv
kubectl apply -f cronjob-quarterly-birthday.yaml -n qlhv
kubectl apply -f cronjob-weekly-cpv-official.yaml -n qlhv
kubectl apply -f cronjob-monthly-cpv-official.yaml -n qlhv
kubectl apply -f cronjob-quarterly-cpv-official.yaml -n qlhv
```

Or apply all at once:

```bash
kubectl apply -f cronjob-*.yaml -n qlhv
```

## Important Notes

### Volume Configuration

The `values-api.yaml` file uses hostPath volumes for:
- Templates directory: `/path/to/apps/api/templates`
- SQLite database: `/path/to/apps/api/local.db`

**YOU MUST UPDATE THESE PATHS** to match your actual file locations on the K3s node.

For production, consider using:
- **PersistentVolumeClaim** for the database
- **ConfigMap** for templates (if they're static)

Example PVC configuration:
```yaml
volumes:
  - name: database
    persistentVolumeClaim:
      claimName: qlhv-db-pvc
```

### Environment Variables

Update the `env` section in `values-api.yaml` with your actual environment variables. You can reference secrets:

```yaml
env:
  - name: DATABASE_URL
    value: "file:/workspace/apps/api/local.db"
  - name: MINIO_ROOT_USER
    valueFrom:
      secretKeyRef:
        name: qlhv-api-env
        key: MINIO_ROOT_USER
```

### Ingress Configuration

Update `values-web.yaml` with your actual domain:

```yaml
ingress:
  enabled: true
  className: "traefik"
  hosts:
    - host: qlhv.yourdomain.com  # Change this!
      paths:
        - path: /
          pathType: Prefix
```

## CronJob Schedules

The CronJobs are configured with the following schedules (Asia/Ho_Chi_Minh timezone):

- **Weekly jobs**: Every Monday at midnight (`0 0 * * 1`)
- **Monthly jobs**: First day of every month at midnight (`0 0 1 * *`)
- **Quarterly jobs**: First day of every 3rd month at midnight (`0 0 1 */3 *`)

## Verification

### Check all deployments
```bash
kubectl get all -n qlhv
```

### Check CronJobs
```bash
kubectl get cronjobs -n qlhv
```

### Check API logs
```bash
kubectl logs -f deployment/qlhv-api -n qlhv
```

### Check Web logs
```bash
kubectl logs -f deployment/qlhv-web -n qlhv
```

### Manually trigger a CronJob (for testing)
```bash
kubectl create job --from=cronjob/weekly-birthday-notification test-run -n qlhv
kubectl logs job/test-run -n qlhv
```

## Upgrading

To upgrade the API service:
```bash
helm upgrade qlhv-api ./qlhv-chart \
  --namespace qlhv \
  --values values-api.yaml
```

To upgrade the Web service:
```bash
helm upgrade qlhv-web ./qlhv-chart \
  --namespace qlhv \
  --values values-web.yaml
```

## Uninstalling

```bash
# Remove applications
helm uninstall qlhv-api -n qlhv
helm uninstall qlhv-web -n qlhv

# Remove CronJobs
kubectl delete -f cronjob-*.yaml -n qlhv
kubectl delete configmap qlhv-cron-scripts -n qlhv

# Remove dependencies
helm uninstall nsq -n qlhv
helm uninstall minio -n qlhv

# Remove namespace (if desired)
kubectl delete namespace qlhv
```

## Troubleshooting

### CronJob not running
```bash
# Check CronJob status
kubectl describe cronjob weekly-birthday-notification -n qlhv

# Check if jobs were created
kubectl get jobs -n qlhv

# Check pod logs
kubectl logs -l job-type=birthday -n qlhv
```

### API can't connect to NSQ
Verify NSQ service names:
```bash
kubectl get svc -n qlhv | grep nsq
```

The service names should be:
- `nsq-nsqlookupd` (port 4161 for HTTP, 4160 for TCP)
- `nsq-nsqd` (port 4151 for HTTP, 4150 for TCP)

### Database file permissions
If the API can't write to the database:
```bash
kubectl exec -it deployment/qlhv-api -n qlhv -- ls -la /workspace/apps/api/
```

Ensure the database file is writable by the container user.
