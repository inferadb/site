---
layout: docs
title: Kubernetes Deployment — InferaDB
doc_title: Kubernetes Deployment
doc_subtitle: Deploy InferaDB on Kubernetes with Helm charts and production-grade infrastructure.
---

## Overview

InferaDB provides Helm charts for deploying the full stack on Kubernetes. The reference infrastructure uses Talos Linux, Cilium CNI with WireGuard encryption, Flux CD for GitOps, and Terraform (or OpenTofu) for infrastructure provisioning.

## Helm Charts

Install the InferaDB Helm chart:

```bash
helm repo add inferadb https://charts.inferadb.com
helm repo update
helm install inferadb inferadb/inferadb
```

The chart deploys the Engine, Control, and Ledger as separate workloads with sensible defaults. Override values for production:

```bash
helm install inferadb inferadb/inferadb \
  -f values-production.yaml
```

## Engine

The Engine is deployed as a **StatefulSet** to maintain stable network identities for mesh communication.

| Setting        | Default | Description                        |
| -------------- | ------- | ---------------------------------- |
| Replicas       | 3       | Initial replica count              |
| HPA min        | 3       | Minimum replicas under autoscaling |
| HPA max        | 20      | Maximum replicas under autoscaling |
| CPU request    | 500m    | Requested CPU per pod              |
| Memory request | 512Mi   | Requested memory per pod           |

### Horizontal Pod Autoscaler

The Engine scales automatically based on CPU utilization and custom metrics (authorization check latency):

```yaml
engine:
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20
    targetCPUUtilizationPercentage: 70
```

### ServiceMonitor

A Prometheus `ServiceMonitor` is included for scraping Engine metrics:

```yaml
engine:
  serviceMonitor:
    enabled: true
    interval: 15s
```

## Ledger

The Ledger is deployed as a **StatefulSet** with persistent storage. Raft consensus requires an odd number of nodes for quorum.

| Setting       | Default | Description                |
| ------------- | ------- | -------------------------- |
| Replicas      | 3       | Must be odd (3, 5, 7)      |
| Storage size  | 10Gi    | PersistentVolumeClaim size |
| Storage class | default | Kubernetes StorageClass    |

```yaml
ledger:
  replicas: 3
  persistence:
    size: 10Gi
    storageClass: "fast-ssd"
```

Ledger pods must **not** be scheduled on spot/preemptible instances — data durability depends on stable storage.

## Infrastructure Stack

The reference deployment uses the following stack:

| Component | Tool                 | Purpose                             |
| --------- | -------------------- | ----------------------------------- |
| OS        | Talos Linux          | Immutable, API-driven Kubernetes OS |
| CNI       | Cilium (WireGuard)   | Encrypted pod networking            |
| GitOps    | Flux CD              | Continuous deployment               |
| IaC       | Terraform / OpenTofu | Infrastructure provisioning         |

## Multi-Cloud Support

InferaDB is tested on the following cloud providers:

| Provider     | Instance Type    | Notes                             |
| ------------ | ---------------- | --------------------------------- |
| AWS          | Graviton (ARM64) | Best price/performance for Engine |
| GCP          | T2A / C3         | Supported on GKE                  |
| DigitalOcean | Premium          | Supported on DOKS                 |

### Spot Instances

Spot (preemptible) instances can be used for **stateless workloads only** — the Engine and Control services. The Ledger must run on on-demand instances to prevent data loss during spot reclamation.

```yaml
engine:
  nodeSelector:
    node.kubernetes.io/instance-type: spot
ledger:
  nodeSelector:
    node.kubernetes.io/instance-type: on-demand
```

## Multi-Region Deployment

InferaDB supports multi-region deployments for low-latency global access and data residency compliance.

### Reference Topology

A two-region deployment with independent Ledger Raft groups:

| Region | Nodes | Purpose                    |
| ------ | ----- | -------------------------- |
| nyc1   | 3     | Primary region (US East)   |
| sfo1   | 3     | Secondary region (US West) |

Each region runs its own Ledger Raft group. Vaults are pinned to a region at creation time and their data never leaves that region.

### Deploying

```bash
# Region 1
helm install inferadb-nyc1 inferadb/inferadb \
  --set ledger.region=nyc1 \
  --set ledger.peers="ledger-0.nyc1,ledger-1.nyc1,ledger-2.nyc1"

# Region 2
helm install inferadb-sfo1 inferadb/inferadb \
  --set ledger.region=sfo1 \
  --set ledger.peers="ledger-0.sfo1,ledger-1.sfo1,ledger-2.sfo1"
```

Engine pods in each region connect to the local Ledger group, ensuring authorization checks are resolved within the region.
