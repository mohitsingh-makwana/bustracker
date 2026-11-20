import apiClient from '../../../services/apiClient';

const unwrap = (data) => {
  let value = data;
  for (let i = 0; i < 3; i += 1) {
    if (value && typeof value === 'object' && !Array.isArray(value) && value.data !== undefined) value = value.data;
    else break;
  }
  return value;
};

export function normalizePage(data, page = 0, size = 10) {
  const body = unwrap(data);
  const items = Array.isArray(body)
    ? body
    : body?.content ?? body?.items ?? body?.results ?? (Array.isArray(body?.data) ? body.data : null);
  if (!Array.isArray(items)) {
    if (body == null) return { items: [], pageInfo: { page, size, totalElements: 0, totalPages: 0, last: true } };
    throw new Error('The server returned an unexpected list response.');
  }
  const totalElements = Number(body?.totalElements ?? items.length);
  return {
    items,
    pageInfo: {
      page: Number(body?.number ?? body?.page ?? page),
      size: Number(body?.size ?? size),
      totalElements,
      totalPages: Number(body?.totalPages ?? (items.length < size ? page + 1 : page + 2)),
      last: Boolean(body?.last ?? items.length < size),
    },
  };
}

export async function getSummary() {
  return unwrap((await apiClient.get('/admin/dashboard/summary')).data);
}

export async function getTripFilterOptions() {
  return unwrap((await apiClient.get('/trips/admin/filter-options')).data);
}

export const ADMIN_RESOURCES = {
  buses: {
    path: '/buses', title: 'Buses', singular: 'Bus', filters: ['status', 'busNumber', 'registrationNumber', 'model', 'lastServiceDate', 'nextServiceDate'],
    fields: [
      { name: 'busNumber', label: 'Bus number', required: true },
      { name: 'registrationNumber', label: 'Registration number', required: true },
      { name: 'model', label: 'Model or type', required: true },
      { name: 'capacity', label: 'Capacity (seats)', type: 'number', required: true },
      { name: 'lastServiceDate', label: 'Last service date', type: 'date' },
      { name: 'nextServiceDate', label: 'Next service date', type: 'date' },
    ],
  },
  trips: { path: '/trips/transport-system', title: 'Trips', singular: 'Trip', filters: ['status', 'routePatternId', 'driverId', 'busId', 'date', 'startTime', 'endTime'], fields: [] },
  schedules: { path: '/trip-schedules/transport-system', title: 'Schedules', singular: 'Schedule', filters: ['routePatternId', 'driverId', 'day', 'startTime', 'endTime'], fields: [] },
  routes: { path: '/routes', title: 'Routes', singular: 'Route', filters: [], fields: [{ name: 'routeCode', label: 'Route code', required: true }, { name: 'name', label: 'Route name', required: true }, { name: 'originStopId', label: 'Origin stop', type: 'number', required: true }, { name: 'destinationStopId', label: 'Destination stop', type: 'number', required: true }] },
  stops: { path: '/stops', title: 'Stops', singular: 'Stop', filters: ['name', 'address'], fields: [{ name: 'stopCode', label: 'Stop code', required: true }, { name: 'name', label: 'Stop name', required: true }, { name: 'address', label: 'Address', required: true }, { name: 'latitude', label: 'Latitude', type: 'number', required: true }, { name: 'longitude', label: 'Longitude', type: 'number', required: true }] },
  patterns: { path: '/route-patterns', title: 'Route patterns', singular: 'Route pattern', filters: ['name', 'code', 'routeId'], fields: [{ name: 'routeId', label: 'Route', type: 'number', required: true }, { name: 'code', label: 'Pattern code', required: true }, { name: 'name', label: 'Pattern name', required: true }] },
  members: { path: '/transport-members', title: 'Members', singular: 'Member', filters: ['role', 'status'], fields: [] },
  drivers: { path: '/drivers', title: 'Drivers', singular: 'Driver', filters: ['name', 'address', 'licenseNumber', 'status'], fields: [{ name: 'licenseNumber', label: 'License number', required: true }, { name: 'licenseExpiryDate', label: 'License expiry date', type: 'date', required: true }] },
  requests: { path: '/transport-members/membership-requests', title: 'Member requests', singular: 'Request', filters: ['status'], fields: [] },
};

const clean = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined));

// Bus filters use BusStatusFilter, including ALL. Always send status=ALL when
// no bus status has been selected so the backend can handle the ALL case explicitly.
export async function listResource(key, { page = 0, size = 10, filters = {} } = {}) {
  const config = ADMIN_RESOURCES[key];
  if (!config) throw new Error(`Unknown admin resource: ${key}`);

  const activeFilters = { ...(filters ?? {}) };
  if (key === 'buses' && !String(activeFilters.status ?? '').trim()) {
    activeFilters.status = 'ALL';
  }

  const params = clean({ page, size, ...activeFilters });
  const response = await apiClient.get(config.path, { params });
  return normalizePage(response.data, page, size);
}

export async function getResource(key, id) {
  const paths = {
    buses: `/buses/${id}`, trips: `/trips/${id}`, schedules: `/trip-schedules/${id}`, routes: `/routes/${id}`,
    stops: `/stops/${id}`, patterns: `/route-patterns/${id}`, members: `/transport-members/${id}`, drivers: `/drivers/${id}`,
  };
  if (!paths[key]) throw new Error(`Unsupported detail resource: ${key}`);
  return unwrap((await apiClient.get(paths[key])).data);
}

export async function createResource(key, payload) {
  const paths = {
    buses: '/buses', trips: '/trips', schedules: '/trip-schedules', routes: '/routes', stops: '/stops', patterns: '/route-patterns',
    members: '/transport-members/member', drivers: '/transport-members/driver',
  };
  if (!paths[key]) throw new Error(`Unsupported create resource: ${key}`);
  return unwrap((await apiClient.post(paths[key], payload)).data);
}

export async function updateResource(key, id, payload) {
  const paths = {
    buses: `/buses/${id}`, schedules: `/trip-schedules/${id}/status`, routes: `/routes/${id}`, stops: `/stops/${id}`,
    patterns: `/route-patterns/${id}`, members: `/transport-members/${id}`, drivers: `/drivers/${id}`,
  };
  if (key === 'trips') throw new Error('Trip updates use the dedicated trip actions.');
  if (key === 'drivers' && Object.keys(payload).length === 1 && payload.status) {
    return unwrap((await apiClient.patch(`/drivers/${id}/update-status`, JSON.stringify(payload.status))).data);
  }
  if (!paths[key]) throw new Error(`Unsupported update resource: ${key}`);
  return unwrap((await apiClient.patch(paths[key], payload)).data);
}

export async function deleteResource(key, id) {
  const paths = {
    buses: `/buses/${id}`, trips: `/trips/${id}`, schedules: `/trip-schedules/${id}`, routes: `/routes/${id}`,
    stops: `/stops/${id}`, patterns: `/route-patterns/${id}`, members: `/transport-members/${id}`, drivers: `/drivers/${id}`,
  };
  if (!paths[key]) throw new Error(`Unsupported delete resource: ${key}`);
  return apiClient.delete(paths[key]);
}

export async function listPatternStops(routePatternId) {
  // The single-stop endpoint is /pattern-stops/{id}; pattern details require the
  // dedicated endpoint that returns every stop for the selected pattern.
  const result = unwrap((await apiClient.get(`/pattern-stops/by-pattern/${routePatternId}`)).data);
  return Array.isArray(result) ? result.slice().sort((a, b) => Number(a.sequence) - Number(b.sequence)) : result;
}

export async function updateRouteStatus(routeId, status) {
  return unwrap((await apiClient.patch(`/routes/${routeId}/status/${status}`)).data);
}
export async function updatePatternStops(routePatternId, patternStopRequests) {
  const updatePatternStopRequest = { patternStopRequests };
  return unwrap((await apiClient.put(`/pattern-stops/by-pattern/${routePatternId}`, updatePatternStopRequest)).data);
}
export async function approveMember(memberId, payload) {
  return unwrap((await apiClient.patch(`/transport-members/membership-requests/${memberId}/approve`, payload)).data);
}
export async function rejectMember(memberId) {
  return unwrap((await apiClient.patch(`/transport-members/membership-requests/${memberId}/reject`)).data);
}
