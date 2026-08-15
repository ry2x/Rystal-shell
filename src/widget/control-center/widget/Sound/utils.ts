import Wp from 'gi://AstalWp';

export function getEndpointLabel(endpoint: Wp.Endpoint) {
  return endpoint.description || endpoint.name || 'Unknown device';
}

export function getRouteLabel(endpoint: Wp.Endpoint) {
  return endpoint.route?.description || endpoint.route?.name || '';
}
