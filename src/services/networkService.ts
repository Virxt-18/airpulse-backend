import { FederatedNetwork, NetworkNode, SharedModel } from '../types';

const now = () => new Date().toISOString();
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

/**
 * Federation registry. Cities train locally and publish *gradient statistics
 * only* - the accuracy and residual summaries below are what other nodes consume.
 * No raw citizen readings, photos or coordinates ever leave the node.
 */
const nodes: NetworkNode[] = [
  { city: 'Delhi', modelVersion: 'v12', accuracy: 89, status: 'online', samples: 18420, lastSync: minutesAgo(12) },
  { city: 'Mumbai', modelVersion: 'v12', accuracy: 88, status: 'online', samples: 14210, lastSync: minutesAgo(18) },
  { city: 'Bengaluru', modelVersion: 'v12', accuracy: 87, status: 'online', samples: 11980, lastSync: minutesAgo(24) },
  { city: 'Chennai', modelVersion: 'v12', accuracy: 88, status: 'online', samples: 10540, lastSync: minutesAgo(31) },
  { city: 'Kolkata', modelVersion: 'v12', accuracy: 85, status: 'online', samples: 9310, lastSync: minutesAgo(42) },
  { city: 'Ranchi', modelVersion: 'v12', accuracy: 86, status: 'syncing', samples: 6120, lastSync: minutesAgo(64) },
  { city: 'Hyderabad', modelVersion: 'v12', accuracy: 84, status: 'offline', samples: 4870, lastSync: minutesAgo(310) }
];

const models: SharedModel[] = nodes.map((node, index) => ({
  city: node.city,
  version: node.modelVersion,
  accuracy: node.accuracy,
  publishedAt: minutesAgo(18 + index * 4),
  update: {
    samples: node.samples,
    meanResidual: Number((14 - index * 0.7).toFixed(2)),
    drift: Number((0.03 + index * 0.004).toFixed(4))
  }
}));

export function registerNode(city: string, accuracy: number, samples = 0, status: NetworkNode['status'] = 'online'): NetworkNode {
  const node: NetworkNode = {
    city,
    modelVersion: currentVersion(),
    accuracy: Math.max(0, Math.min(100, accuracy)),
    status,
    samples,
    lastSync: now()
  };
  const index = nodes.findIndex((item) => item.city.toLowerCase() === city.toLowerCase());
  if (index >= 0) nodes[index] = node;
  else nodes.push(node);
  return node;
}

/** Publish a node's model update for other cities to consume. */
export function publishModel(city: string, accuracy: number, update: SharedModel['update'], version = currentVersion()): SharedModel {
  const model: SharedModel = { city, version, accuracy, publishedAt: now(), update };
  const index = models.findIndex((item) => item.city.toLowerCase() === city.toLowerCase());
  if (index >= 0) models[index] = model;
  else models.push(model);
  return model;
}

export function listSharedModels(): SharedModel[] { return models; }

/** Sample-weighted accuracy across contributing nodes - the global model score. */
function aggregateAccuracy(): number {
  const totalSamples = nodes.reduce((sum, node) => sum + node.samples, 0);
  if (!totalSamples) return 0;
  const weighted = nodes.reduce((sum, node) => sum + node.accuracy * node.samples, 0);
  return Number((weighted / totalSamples).toFixed(1));
}

let aggregationCount = 42;
function currentVersion(): string {
  aggregationCount += 1;
  return `12.${aggregationCount}`;
}

export async function getFederatedNetwork(): Promise<FederatedNetwork> {
  const online = nodes.filter((node) => node.status === 'online');
  return {
    nodes,
    globalModel: {
      version: online[0]?.modelVersion?.replace(/^v/, '') ?? '12.0',
      accuracy: aggregateAccuracy(),
      lastAggregation: minutesAgo(18),
      rawDataShared: false
    },
    models
  };
}

export function federationStats() {
  return {
    contributingNodes: nodes.filter((node) => node.samples > 0).length,
    totalNodes: nodes.length,
    totalSamples: nodes.reduce((sum, node) => sum + node.samples, 0),
    globalAccuracy: aggregateAccuracy(),
    rawDataShared: false as const,
    privacyGuarantee: 'Only model updates are aggregated; citizen reports, images and precise locations stay on the city node.'
  };
}