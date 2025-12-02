# Docker Compose to K3s Migration Summary

## Key Changes

### 1. Cron Container → Kubernetes CronJobs

**Before (Docker Compose):**
- Single `cron-scheduler` container running crond
- 6 crontab entries in one container
- Scripts baked into Docker image
- Logs to mounted volume

**After (Kubernetes):**
- 6 independent CronJob resources
- Each CronJob creates pods on schedule
- Scripts stored in ConfigMap (not in image)
- Native Kubernetes scheduling with timezone support
- Better observability (each job has its own logs and history)

**Why:** Kubernetes has native CronJob support, making a separate cron container unnecessary. This is more cloud-native and provides better scheduling, monitoring, and failure handling.

### 2. Nginx Proxy → Kubernetes Ingress

**Before (Docker Compose):**
- Nginx container proxying `/api/*` to backend
- Web server serving static files
- Manual configuration in `nginx/default.conf`

**After (Kubernetes):**
- Web service serves only static files
- API is internal-only (ClusterIP)
- Ingress controller (Traefik) handles external routing
- No need for custom nginx proxy configuration

**Why:** In Kubernetes, Ingress controllers provide native reverse proxy capabilities. The web container only needs to serve static files - routing is handled at the cluster level.

### 3. Docker Networks → Kubernetes Services

**Before (Docker Compose):**
- 4 separate Docker networks: app-network, cron-network, minio-network, nsq-network
- Containers on same network can communicate

**After (Kubernetes):**
- All resources in same namespace can communicate via DNS
- Services provide stable DNS names
- Network policies can restrict traffic if needed

**Why:** Kubernetes provides built-in service discovery via DNS. All services in a namespace can reach each other using service names (e.g., `http://qlhv-api:8080`).

### 4. Docker Volumes → Kubernetes Volumes

**Before (Docker Compose):**
```yaml
volumes:
  - ../apps/api/templates/:/workspace/apps/api/templates
  - ../apps/api/local.db/:/workspace/apps/api/local.db
```

**After (Kubernetes):**
```yaml
volumes:
  - name: database
    hostPath:
      path: /path/to/apps/api/local.db
      type: FileOrCreate
volumeMounts:
  - name: database
    mountPath: /workspace/apps/api/local.db
```

**Note:** You'll need to update the hostPath to absolute paths on your K3s node.

### 5. Dependencies: NSQ and MinIO

**Before (Docker Compose):**
- Custom container definitions
- Manual configuration

**After (Kubernetes):**
- Using official Helm charts:
  - `nsqio/nsq` for NSQ
  - `bitnami/minio` for MinIO
- Community-maintained, production-ready
- Easy upgrades and configuration

**Why:** Official Helm charts are maintained by the community, battle-tested, and follow best practices. No need to reinvent the wheel.

### 6. Health Checks

**Before (Docker Compose):**
```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:8080/healthz']
  interval: 30s
  timeout: 10s
  retries: 3
```

**After (Kubernetes):**
```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 40
  periodSeconds: 30
  timeoutSeconds: 10
  failureThreshold: 3
```

More sophisticated with separate liveness and readiness probes.

## File Structure

```
.
├── values-api.yaml                          # Helm values for API service
├── values-web.yaml                          # Helm values for web service
├── configmap-cron-scripts.yaml              # ConfigMap with all cron scripts
├── cronjob-weekly-birthday.yaml             # CronJob manifest
├── cronjob-monthly-birthday.yaml            # CronJob manifest
├── cronjob-quarterly-birthday.yaml          # CronJob manifest
├── cronjob-weekly-cpv-official.yaml         # CronJob manifest
├── cronjob-monthly-cpv-official.yaml        # CronJob manifest
├── cronjob-quarterly-cpv-official.yaml      # CronJob manifest
└── DEPLOYMENT.md                            # Deployment instructions
```

## Important Actions Required

1. **Update hostPath volumes** in `values-api.yaml` to point to actual file locations on your K3s node
2. **Update domain** in `values-web.yaml` ingress configuration
3. **Create environment secret** with your `.env.prod` values
4. **Review and adjust** resource limits based on your cluster capacity
5. **Update cron scripts** if the Alpine image doesn't have `curl` (switched to `wget`)

## Benefits of K8s Migration

1. **Native scheduling**: CronJobs are first-class citizens
2. **Better scaling**: Can scale API and Web independently
3. **Health management**: Automatic restart, rolling updates
4. **Service discovery**: Built-in DNS for service communication
5. **Resource management**: CPU/memory limits enforced by cluster
6. **Observability**: Better logging, monitoring integration
7. **Production-ready dependencies**: Official Helm charts with community support

## Scripts Changed

The cron scripts were modified to use `wget` instead of `curl` since Alpine's base image might not include curl by default. The functionality remains the same:

- Health check before running
- Retry logic with exponential backoff
- Proper logging with timestamps
- Exit codes for monitoring
