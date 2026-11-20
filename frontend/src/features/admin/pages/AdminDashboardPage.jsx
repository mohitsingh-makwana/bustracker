import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import BrandLogo from '../../../components/common/BrandLogo';
import Icon from '../../../components/common/Icon';
import LeafletMap from '../../../components/maps/LeafletMap';
import StopPickerMap from '../../../components/maps/StopPickerMap';
import useLiveBuses from '../hooks/useLiveBuses';
import {
  ADMIN_RESOURCES, approveMember, createResource, deleteResource, getResource, getSummary, updateRouteStatus,
  listPatternStops, listResource, rejectMember, updatePatternStops, updateResource, getTripFilterOptions,
} from '../services/adminService';
import { getPrivateTransportSystemById } from '../../transports/services/transportService';
import heroArt from '../../../assets/bustrackr/home-hero-art.png';
import noTripsArt from '../../../assets/bustrackr/no-trips-art.png';
import { handleIllustrationError } from '../../../components/common/imageFallback';
import '../../../styles/admin.css';
import { buildPatternStopRequests, formatStopArrivalTime, validatePatternStopTimes } from '../../../utils/stopArrivalTime';

const NAV = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'trips', label: 'Trips', icon: 'bus' },
  { key: 'members', label: 'Members', icon: 'users' },
  { key: 'requests', label: 'Requests', icon: 'mail' },
  { key: 'more', label: 'More', icon: 'menu' },
];
const MORE_LINKS = [
  { key: 'routes', label: 'Routes', description: 'Manage routes', icon: 'route', badge: 'routes' },
  { key: 'patterns', label: 'Route patterns', description: 'Create patterns and arrange their stop sequence', icon: 'route', badge: 'patterns' },
  { key: 'stops', label: 'Stops', description: 'Manage bus stops', icon: 'pin', badge: 'stops' },
  { key: 'buses', label: 'Buses', description: 'Manage buses in your system', icon: 'bus', badge: 'buses' },
  { key: 'liveMap', label: 'Live map', description: 'View active trips on map', icon: 'map', badge: null },
  { key: 'settings', label: 'Settings', description: 'App settings and preferences', icon: 'settings', badge: null },
  { key: 'switchSystem', label: 'Switch system', description: 'Switch to another transport system', icon: 'switch', badge: null },
  { key: 'logout', label: 'Logout', description: 'Sign out from this device', icon: 'logout', badge: null, danger: true },
];
const DAY_OPTIONS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const STATUS_TONE = {
  ACTIVE: 'green', LIVE: 'green', AVAILABLE: 'green', COMPLETED: 'green', APPROVED: 'green', PUBLIC: 'green',
  SCHEDULED: 'amber', PENDING: 'amber', ON_TRIP: 'amber', IN_USE: 'amber', MAINTENANCE: 'amber', IN_PROGRESS: 'amber',
  CANCELLED: 'red', CANCELED: 'red', REJECTED: 'red', TERMINATED: 'red', NOT_AVAILABLE: 'gray', INACTIVE: 'gray',
};
function liveDistanceLabel(meters) {
  if (meters == null || !Number.isFinite(Number(meters))) return '—';
  const value = Number(meters);
  return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1)} km`;
}
function liveSpeedLabel(kmh, mps) {
  const value = kmh ?? (mps == null ? 0 : Number(mps) * 3.6);
  return !Number.isFinite(Number(value)) ? '0 km/h' : `${Math.round(Number(value))} km/h`;
}
const pretty = (value) => String(value ?? '—').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
// Keep human-friendly role keys inside the UI, but send the exact ROLE_* enum
// constants expected by TransportMemberRole when calling the backend.
const roleKey = (value) => String(value ?? '').trim().toUpperCase().replace(/^ROLE_/, '');
const transportMemberRole = (value) => { const role = roleKey(value); return role ? `ROLE_${role}` : value; };
const idOf = (row) => row?.id ?? row?.tripId ?? row?.tripScheduleId ?? row?.memberId ?? row?.busId;
const errorText = (error, fallback) => {
  const body = error?.response?.data;
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (body && typeof body === 'object') {
    const candidate = body.message ?? body.msg ?? body.detail ?? body.errorDescription ?? body.error;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (Array.isArray(body.errors) && body.errors.length) {
      return body.errors.map((item) => typeof item === 'string' ? item : item?.defaultMessage ?? item?.message).filter(Boolean).join(' ');
    }
  }
  return error?.message || fallback;
};
const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const asLocalDateTime = (date, time) => `${date}T${time}:00`;
const timeLabel = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};
const dateLabel = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
};
const listData = (data) => Array.isArray(data) ? data : (data?.content ?? data?.items ?? data?.data ?? []);

function StatusPill({ value, children }) {
  const text = children ?? pretty(value);
  const tone = STATUS_TONE[String(value ?? '').toUpperCase()] ?? 'gray';
  return <span className={`adm-pill adm-pill--${tone}`}><i />{text}</span>;
}

function TopHeader({ systemName, accessType, onProfile }) {
  return <header className="adm-mobile-header">
    <div className="adm-header-top"><BrandLogo size="sm" /><button className="adm-avatar" onClick={onProfile} aria-label="Admin profile">AD</button></div>
    <button className="adm-system-row" onClick={onProfile}><span className="adm-system-bus"><Icon name="bus" size={16} /></span><strong>{systemName || 'Selected transport system'}</strong><span className={`adm-access-tag ${String(accessType).toUpperCase() === 'PRIVATE' ? 'is-private' : ''}`}>{accessType || 'PUBLIC'}</span><Icon name="chevron-right" size={15} /></button>
  </header>;
}

function SectionTitle({ title, subtitle, action, onAction }) {
  return <div className="adm-section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <button className="adm-link-button" onClick={onAction}>{action} <Icon name="chevron-right" size={16} /></button>}</div>;
}

function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return <label className="adm-searchbar"><Icon name="search" size={18} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /><button type="button" onClick={() => onChange('')} aria-label="Clear search" disabled={!value}>×</button></label>;
}

function EmptyState({ title, message, action, onAction }) {
  return <div className="adm-empty-state"><img src={noTripsArt} alt="Bus illustration" onError={handleIllustrationError} /><h3>{title}</h3><p>{message}</p>{action && <button className="adm-btn adm-btn--primary" onClick={onAction}>{action}</button>}</div>;
}

function Sheet({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="adm-sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="adm-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <div className="adm-sheet-handle" />
      <header><h2>{title}</h2><button className="adm-close" onClick={onClose} aria-label="Close"><Icon name="x" /></button></header>
      <div className="adm-sheet-content">{children}</div>
      {footer && <footer className="adm-sheet-footer">{footer}</footer>}
    </section>
  </div>;
}

function FormField({ label, name, value, onChange, type = 'text', required, options, hint, placeholder }) {
  return <label className="adm-form-field"><span>{label}{required && <b> *</b>}</span>
    {options ? <select required={required} value={value ?? ''} onChange={(event) => onChange(name, event.target.value)}><option value="">Choose {label.toLowerCase()}</option>{options.map((option) => {
      const item = typeof option === 'string' ? { value: option, label: pretty(option) } : option;
      return <option value={item.value} key={item.value}>{item.label}</option>;
    })}</select> : <input type={type} required={required} value={value ?? ''} onChange={(event) => onChange(name, event.target.value)} placeholder={placeholder ?? label} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} />}
    {hint && <small>{hint}</small>}
  </label>;
}

function RecordMenu({ row, resource, onClose, onView, onEdit, onDelete, onToggleStatus, onApprove, onReject, onCancelTrip }) {
  const status = String((resource === 'members' ? row?.driverStatus : null) ?? row?.status ?? '').toUpperCase();
  return <Sheet title={resource === 'trips' ? 'Trip actions' : `${ADMIN_RESOURCES[resource]?.singular ?? 'Member'} actions`} onClose={onClose}>
    <div className="adm-action-summary"><strong>{row?.routePatternName ?? row?.busNumber ?? row?.name ?? row?.fullName ?? row?.routeCode ?? 'Selected record'}</strong><span>{row?.routePatternCode ?? row?.registrationNumber ?? row?.email ?? row?.code ?? ''}</span><StatusPill value={row?.status ?? row?.scheduleStatus} /></div>
    <div className="adm-action-list">
      <button onClick={() => onView(row)}><Icon name="eye" /><span>View details</span><Icon name="chevron-right" /></button>
      {resource === 'requests' ? <>
        <button className="is-success" onClick={() => onApprove(row)}><Icon name="check-circle" /><span>Approve request</span></button>
        <button className="is-danger" onClick={() => onReject(row)}><Icon name="x" /><span>Reject request</span></button>
      </> : resource === 'trips' ? <>
        {['SCHEDULED', 'UPCOMING', 'PENDING'].includes(status) && <button className="is-danger" onClick={() => onCancelTrip(row)}><Icon name="x" /><span>Cancel trip</span></button>}
        <button disabled><Icon name="route" /><span>Reassign (endpoint not provided)</span></button>
      </> : <>
        <button onClick={() => onEdit(row)}><Icon name="settings" /><span>{resource === 'members' ? 'Change role' : 'Edit'}</span></button>
        {(resource === 'drivers' || (resource === 'members' && roleKey(row?.role) === 'DRIVER')) && <>
          <button disabled={status === 'ON_TRIP' || (resource === 'members' && !row.driverId)} onClick={() => onToggleStatus(row, 'AVAILABLE')}><Icon name="check-circle" /><span>Mark available</span></button>
          <button disabled={status === 'ON_TRIP' || (resource === 'members' && !row.driverId)} onClick={() => onToggleStatus(row, 'NOT_AVAILABLE')}><Icon name="x" /><span>Mark not available</span></button>
        </>}
        <button className="is-danger" disabled={['drivers', 'members'].includes(resource) && status === 'ON_TRIP'} onClick={() => onDelete(row)}><Icon name="x" /><span>{status === 'ON_TRIP' && ['drivers', 'members'].includes(resource) ? 'Remove (finish active trip first)' : 'Remove'}</span></button>
      </>}
      <button className="adm-action-cancel" onClick={onClose}>Cancel</button>
    </div>
  </Sheet>;
}

function FilterPills({ values, current, onChange }) {
  return <div className="adm-filter-pills">{values.map((item) => {
    const value = typeof item === 'string' ? item : item.value;
    const label = typeof item === 'string' ? pretty(item) : item.label;
    return <button type="button" key={value} className={current === value ? 'is-active' : ''} onClick={() => onChange(value)}>{label}</button>;
  })}</div>;
}

function TripCard({ trip, onOpen, compact = false }) {
  const status = String(trip?.status ?? 'SCHEDULED').toUpperCase();
  const start = trip?.scheduledTripStartTime ?? trip?.scheduledStartTime ?? trip?.scheduledTripScheduleStartTime;
  const bus = trip?.busNumber ?? trip?.bus?.busNumber ?? 'Bus not assigned';
  const driver = trip?.driverName ?? trip?.driver?.name ?? 'Driver not assigned';
  return <button className={`adm-trip-card ${compact ? 'is-compact' : ''}`} onClick={() => onOpen(trip)}>
    <div className="adm-trip-time">{timeLabel(start)}<small>{dateLabel(start)}</small></div>
    <div className="adm-trip-main"><span className="adm-route-code">{trip?.routePatternCode ?? 'Route'}</span><strong>{trip?.originStopName ?? 'Origin'} <span>→</span> {trip?.destinationStopName ?? 'Destination'}</strong><div className="adm-trip-meta"><span><Icon name="bus" size={14} />{bus}</span><span><Icon name="user" size={14} />{driver}</span>{trip?.tripType && <em>{pretty(trip.tripType)}</em>}</div></div>
    <div className="adm-trip-trailing"><StatusPill value={status} /><Icon name="chevron-right" size={19} /></div>
  </button>;
}

export default function AdminDashboardPage() {
  const { logout, transportSystemId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [transportSystemName, setTransportSystemName] = useState(location.state?.transportSystem?.name ?? '');
  const [accessType, setAccessType] = useState(location.state?.accessType ?? 'PUBLIC');
  const [section, setSection] = useState('home');
  const [summary, setSummary] = useState(null);
  const [todayTrips, setTodayTrips] = useState([]);
  const [liveTrips, setLiveTrips] = useState([]);
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 0, size: 10, totalElements: 0, totalPages: 1, last: true });
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [tripFilterOptions, setTripFilterOptions] = useState({ routePatterns: [], drivers: [], buses: [] });
  const [tripFilterOptionsLoading, setTripFilterOptionsLoading] = useState(false);
  const [tripFilterOptionsError, setTripFilterOptionsError] = useState('');
  const [tripTab, setTripTab] = useState('LIVE');
  const [memberRoleTab, setMemberRoleTab] = useState('DRIVER');
  const [memberStatusTab, setMemberStatusTab] = useState('ACTIVE');
  const [requestTab, setRequestTab] = useState('PENDING');
  const [stopDisplay, setStopDisplay] = useState('LIST');
  const [routeStatusTab, setRouteStatusTab] = useState('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({});
  const [formMode, setFormMode] = useState('create');
  const [formResource, setFormResource] = useState('');
  const [formReturnSection, setFormReturnSection] = useState('more');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalRole, setApprovalRole] = useState('PASSENGER');
  const [options, setOptions] = useState({ routes: [], patterns: [], buses: [], drivers: [], stops: [], members: [] });
  const [optionLoading, setOptionLoading] = useState(false);
  const [optionSearch, setOptionSearch] = useState('');
  const [optionType, setOptionType] = useState('');
  const [patternStops, setPatternStops] = useState([]);
  const [selectedStops, setSelectedStops] = useState([]);
  const [tripForm, setTripForm] = useState({ routeId: '', routePatternId: '', busId: '', driverId: '', tripType: 'ONE_TIME', date: localDate(), startTime: '08:00', endTime: '08:55', operatingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'], returnEnabled: false, returnPatternId: '', returnStartTime: '09:15' });
  const [memberFormRole, setMemberFormRole] = useState('DRIVER');
  const [mapRouteFilter, setMapRouteFilter] = useState('ALL');
  const [selectedLiveBus, setSelectedLiveBus] = useState(null);
  const [expandedRouteId, setExpandedRouteId] = useState(null);
  const [routePatternsById, setRoutePatternsById] = useState({});
  const [resourceCounts, setResourceCounts] = useState({ routes: null, stops: null, buses: null });
  // Prevent a slower response from an earlier tab/filter selection from overwriting the latest list.
  const resourceRequestSequence = useRef(0);

  useEffect(() => {
    if (sheet?.type !== 'tripFilters') return undefined;
    let cancelled = false;
    setTripFilterOptionsLoading(true);
    setTripFilterOptionsError('');
    getTripFilterOptions()
      .then((result) => {
        if (cancelled) return;
        setTripFilterOptions({
          routePatterns: Array.isArray(result?.routePatterns) ? result.routePatterns : [],
          drivers: Array.isArray(result?.drivers) ? result.drivers : [],
          buses: Array.isArray(result?.buses) ? result.buses : [],
        });
      })
      .catch((error) => {
        if (!cancelled) setTripFilterOptionsError(errorText(error, 'Could not load trip filter options.'));
      })
      .finally(() => { if (!cancelled) setTripFilterOptionsLoading(false); });
    return () => { cancelled = true; };
  }, [sheet?.type]);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);
  const notify = useCallback((message) => { setNotice(message); window.setTimeout(() => setNotice(''), 3600); }, []);
  const go = useCallback((next) => {
    setSection(next); setPage(0); setFilters({}); setSearch(''); setError(''); setFormError(''); setSheet(null); setDetail(null); setSelectedRow(null);
    if (next !== 'trips') setTripTab('LIVE');
  }, []);

  useEffect(() => {
    const nameFromState = location.state?.transportSystem?.name;
    const typeFromState = location.state?.accessType;
    if (nameFromState) setTransportSystemName(nameFromState);
    if (typeFromState) setAccessType(typeFromState);
    if (nameFromState || !transportSystemId) return undefined;
    let cancelled = false;
    getPrivateTransportSystemById(transportSystemId).then((result) => {
      const system = result?.data ?? result;
      if (!cancelled && system?.name) { setTransportSystemName(system.name); setAccessType(system.accessType ?? 'PRIVATE'); }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [location.state, transportSystemId]);

  const loadHome = useCallback(async () => {
    setSummaryLoading(true);
    const today = localDate();
    const tasks = await Promise.allSettled([
      getSummary(),
      listResource('trips', { page: 0, size: 6, filters: { date: today } }),
      listResource('trips', { page: 0, size: 20, filters: { status: 'ACTIVE' } }),
    ]);
    if (tasks[0].status === 'fulfilled') setSummary(tasks[0].value); else setError(errorText(tasks[0].reason, 'Dashboard summary could not be loaded.'));
    if (tasks[1].status === 'fulfilled') setTodayTrips(tasks[1].value.items); else setTodayTrips([]);
    const activeTrips = tasks[2].status === 'fulfilled' ? tasks[2].value.items : [];
    setLiveTrips(activeTrips);
    // Live coordinates arrive on the shared STOMP live-buses topic.
    setSummaryLoading(false);
  }, [accessType, transportSystemId]);

  const liveTripLocations = useLiveBuses(transportSystemId, ['home', 'liveMap'].includes(section), liveTrips);

  const loadResource = useCallback(async (key = section, targetPage = page, targetFilters = filters) => {
    if (!ADMIN_RESOURCES[key]) return;
    // A rapid switch between Pending / Approved / Rejected can leave multiple
    // requests in flight. Only the newest request may update visible state.
    const requestSequence = ++resourceRequestSequence.current;
    setLoading(true);
    setError('');
    try {
      const result = await listResource(key, { page: targetPage, size: 10, filters: targetFilters });
      let items = result.items;
      if (key === 'members' && roleKey(targetFilters?.role) === 'DRIVER') {
        const driverResult = await listResource('drivers', { page: targetPage, size: 10 }).catch(() => ({ items: [] }));
        const byMember = new Map(driverResult.items.map((driver) => [String(driver.memberId), driver]));
        items = items.map((member) => {
          const driver = byMember.get(String(idOf(member))) ?? driverResult.items.find((entry) => String(entry.name ?? '').toLowerCase() === String(member.name ?? '').toLowerCase());
          if (!driver) return { ...member, memberStatus: member.status, driverStatus: null, driverId: null };
          return { ...driver, id: idOf(member), memberId: idOf(member), driverId: driver.id, membershipStatus: member.status, memberStatus: member.status, role: member.role, driverStatus: driver.status };
        });
      }
      if (requestSequence !== resourceRequestSequence.current) return;
      setRows(items);
      setPageInfo(result.pageInfo);
    } catch (e) {
      if (requestSequence !== resourceRequestSequence.current) return;
      setRows([]);
      setPageInfo({ page: targetPage, size: 10, totalElements: 0, totalPages: 1, last: true });
      setError(errorText(e, `Couldn't load ${ADMIN_RESOURCES[key].title.toLowerCase()}. Check the endpoint and permissions.`));
    } finally {
      if (requestSequence === resourceRequestSequence.current) setLoading(false);
    }
  }, [section, page, filters]);



  useEffect(() => {
    if (['home', 'liveMap'].includes(section)) loadHome();
    else if (['trips'].includes(section)) {
      if (tripTab === 'SCHEDULES') loadResource('schedules', page, filters);
      else {
        const statusMap = { ALL: 'ALL', LIVE: 'ACTIVE', UPCOMING: 'SCHEDULED', COMPLETED: 'COMPLETED', TERMINATED: 'TERMINATED' };
        const nextFilters = { ...filters };
        delete nextFilters.busNumber;
        if (statusMap[tripTab]) nextFilters.status = statusMap[tripTab]; else delete nextFilters.status;
        loadResource('trips', page, nextFilters);
      }
    } else if (['buses', 'drivers', 'routes', 'stops', 'patterns', 'members', 'requests'].includes(section)) {
      const key = section === 'members' ? 'members' : section === 'requests' ? 'requests' : section;
      const nextFilters = { ...filters };
      // Filter members by their membership role/status on the server so pagination reflects the selection.
      if (key === 'members') {
        nextFilters.role = transportMemberRole(memberRoleTab);
        nextFilters.status = memberStatusTab;
      }
      // Apply membership-request status on the backend so pagination covers the selected status.
      if (key === 'requests') nextFilters.status = requestTab;
      loadResource(key, page, nextFilters);
    }
  }, [section, tripTab, page, filters, memberRoleTab, memberStatusTab, requestTab, refreshKey, loadHome, loadResource]);

  useEffect(() => {
    if (!['home', 'more'].includes(section)) return;
    let cancelled = false;
    Promise.all(['routes', 'stops', 'buses'].map(async (key) => {
      try { const pageResult = await listResource(key, { page: 0, size: 1 }); return [key, pageResult.pageInfo.totalElements]; }
      catch { return [key, null]; }
    })).then((entries) => { if (!cancelled) setResourceCounts(Object.fromEntries(entries)); });
    return () => { cancelled = true; };
  }, [section, refreshKey]);

  const currentItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    let data = rows;
    // Membership role/status are filtered server-side; do not re-filter a single page here.
    if (section === 'routes' && routeStatusTab) data = data.filter((row) => String(row.status ?? 'ACTIVE').toUpperCase() === routeStatusTab);
    if (section === 'trips' && filters.busNumber) data = data.filter((row) => String(row.busNumber ?? '').toLowerCase().includes(String(filters.busNumber).toLowerCase()));
    if (section === 'drivers' && filters.status) data = data.filter((row) => String(row.status).toUpperCase() === String(filters.status).toUpperCase());
    if (term) data = data.filter((row) => Object.values(row ?? {}).some((value) => String(value ?? '').toLowerCase().includes(term)));
    return data;
  }, [rows, search, section, memberRoleTab, filters, routeStatusTab]);

  const summaryTrips = summary?.tripsToday ?? {};
  const tripsTotal = Number(summaryTrips?.TOTAL ?? summaryTrips?.total ?? Object.entries(summaryTrips).filter(([key]) => key.toUpperCase() !== 'TOTAL').reduce((sum, [, count]) => sum + (Number(count) || 0), 0));
  const summaryCards = [
    { title: 'Live buses', value: summary?.liveBuses ?? 0, icon: 'bus', tone: 'green', onClick: () => go('liveMap') },
    { title: 'Trips today', value: tripsTotal, icon: 'calendar', tone: 'amber', onClick: () => go('trips') },
    { title: 'Available drivers', value: summary?.availableDrivers ?? 0, icon: 'users', tone: 'orange', onClick: () => { go('members'); setMemberRoleTab('DRIVER'); } },
    { title: 'Pending requests', value: summary?.pendingRequests ?? 0, icon: 'clock', tone: 'amber', onClick: () => go('requests') },
  ];

  async function fetchCreateOptions() {
    setOptionLoading(true);
    const load = async (key, params = {}) => {
      try { return (await listResource(key, { page: 0, size: 100, filters: params })).items; } catch { return []; }
    };
    const [routes, patterns, buses, drivers, stops, members] = await Promise.all([
      load('routes'), load('patterns'), load('buses'), load('drivers'), load('stops'), load('members'),
    ]);
    setOptions({ routes, patterns, buses, drivers, stops, members });
    setOptionLoading(false);
    return { routes, patterns, buses, drivers, stops, members };
  }

  const openTripCreate = async () => {
    setTripForm({ routeId: '', routePatternId: '', busId: '', driverId: '', tripType: 'ONE_TIME', date: localDate(), startTime: '08:00', endTime: '08:55', operatingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'], returnEnabled: false, returnPatternId: '', returnStartTime: '09:15' });
    setPatternStops([]); setFormError(''); setSection('createTrip'); await fetchCreateOptions();
  };

  const openForm = async (resource, mode = 'create', row = null) => {
    setFormResource(resource); setFormMode(mode); setFormError(''); setSearch(''); setSheet(null);
    const returnSection = ['home', 'more', 'resourceForm', 'createTrip'].includes(section)
      ? (resource === 'members' ? 'members' : resource)
      : section;
    setFormReturnSection(returnSection);
    setSection('resourceForm');
    let initial = row ? { ...row } : {};
    if (mode === 'edit' && row) {
      try { initial = { ...row, ...(await getResource(resource, idOf(row))) }; } catch { /* use list row values */ }
    }
    if (resource === 'members' && mode === 'create') { setMemberFormRole('DRIVER'); initial = {}; }
    if (resource === 'members' && mode === 'edit' && initial.role) initial = { ...initial, role: roleKey(initial.role) };
    setForm(initial);
    if (['routes', 'patterns', 'trips', 'schedules', 'stops'].includes(resource)) await fetchCreateOptions();
    if (resource === 'patterns' && mode === 'edit' && row) {
      const stops = await listPatternStops(idOf(row)).catch(() => []);
      setSelectedStops(listData(stops).sort((a, b) => a.sequence - b.sequence).map((item) => ({ stopId: item.stopId, stopName: item.stopName, sequence: item.sequence, stopArrivalTime: item.stopArrivalTime ?? '' })));
    } else setSelectedStops([]);
  };

  const handleFormChange = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const handleSaveResource = async (event) => {
    event?.preventDefault();
    setFormBusy(true); setFormError('');
    try {
      const payload = {};
      const keys = Object.keys(form);
      keys.forEach((key) => { if (form[key] !== '' && form[key] !== undefined && form[key] !== null) payload[key] = form[key]; });
      ['capacity', 'originStopId', 'destinationStopId', 'latitude', 'longitude', 'routeId', 'busId', 'driverId'].forEach((key) => { if (payload[key] !== undefined) payload[key] = Number(payload[key]); });
      if (formResource === 'stops') { if (!Number.isFinite(payload.latitude) || payload.latitude < -90 || payload.latitude > 90) throw new Error('Latitude must be between -90 and 90.'); if (!Number.isFinite(payload.longitude) || payload.longitude < -180 || payload.longitude > 180) throw new Error('Longitude must be between -180 and 180.'); }
      const requiredByResource = {
        buses: ['busNumber', 'registrationNumber', 'model', 'capacity'],
        routes: formMode === 'edit' ? ['routeCode', 'name', 'status'] : ['routeCode', 'name', 'originStopId', 'destinationStopId'],
        stops: ['stopCode', 'name', 'address', 'latitude', 'longitude'],
        patterns: formMode === 'edit' ? ['code', 'name'] : ['routeId', 'code', 'name'],
        drivers: formMode === 'edit' ? ['licenseNumber', 'licenseExpiryDate'] : ['name', 'address', 'email', 'phone', 'licenseNo', 'licenseExpiryDate'],
        members: formMode === 'edit' ? ['role'] : (memberFormRole === 'DRIVER' ? ['fullName', 'email', 'phone', 'address', 'licenseNo', 'licenseExpiryDate'] : ['fullName', 'email', 'phone']),
      };
      const requiredKeys = requiredByResource[formResource] ?? [];
      const missingKeys = requiredKeys.filter((key) => form[key] === undefined || form[key] === null || String(form[key]).trim() === '');
      if (missingKeys.length) throw new Error(`Please complete: ${missingKeys.join(', ')}.`);
      if (formResource === 'members' && formMode === 'create' && memberFormRole !== 'DRIVER') {
        if (!/^[0-9]{10}$/.test(String(payload.phone ?? ''))) {
          throw new Error('Mobile number must contain exactly 10 digits.');
        }
      }
      if (formResource === 'members' && formMode === 'create') {
        const role = memberFormRole;
        const fullName = payload.fullName ?? payload.name;
        if (role === 'DRIVER') {
          const driverPayload = { name: fullName, address: payload.address, email: payload.email, phone: payload.phone, licenseNo: payload.licenseNo ?? payload.licenseNumber, licenseExpiryDate: payload.licenseExpiryDate };
          await createResource('drivers', driverPayload);
        } else {
          await createResource('members', { email: payload.email, fullName, phone: payload.phone, role: transportMemberRole(role) });
        }
      } else if (formResource === 'patterns') {
        if (formMode === 'create') {
          payload.routeId = Number(payload.routeId);
          const timeErrors = validatePatternStopTimes(selectedStops);
          if (timeErrors.some(Boolean)) throw new Error(timeErrors.find(Boolean));
          payload.patternStopRequests = buildPatternStopRequests(selectedStops);
          if (payload.patternStopRequests.length < 2) throw new Error('Add at least two stops to a route pattern.');
          await createResource('patterns', payload);
        } else {
          if (selectedStops.length < 2) throw new Error('Add at least two stops to a route pattern.');
          const timeErrors = validatePatternStopTimes(selectedStops);
          if (timeErrors.some(Boolean)) throw new Error(timeErrors.find(Boolean));
          const edit = { code: payload.code, name: payload.name, originStopId: Number(selectedStops[0]?.stopId ?? payload.originStopId), destinationStopId: Number(selectedStops.at(-1)?.stopId ?? payload.destinationStopId) };
          await updateResource('patterns', idOf(form), edit);
          const patternStopRequests = buildPatternStopRequests(selectedStops);
          await updatePatternStops(idOf(form), patternStopRequests);
        }
      } else if (formMode === 'create') {
        await createResource(formResource, payload);
      } else {
        const id = idOf(form);
        const allowedEdit = {
          buses: ['busNumber', 'registrationNumber', 'model', 'capacity', 'lastServiceDate', 'nextServiceDate', 'status'],
          routes: ['routeCode', 'name', 'status'],
          stops: ['stopCode', 'name', 'address', 'latitude', 'longitude'],
          drivers: ['licenseNumber', 'licenseExpiryDate'],
          members: ['role'],
          schedules: ['scheduledStartTime', 'scheduledEndTime', 'busId', 'driverId', 'scheduleStatus'],
          patterns: ['code', 'name', 'originStopId', 'destinationStopId'],
        }[formResource] ?? keys;
        const update = Object.fromEntries(allowedEdit.filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]]));
        if (formResource === 'members' && update.role) update.role = transportMemberRole(update.role);
        await updateResource(formResource, id, update);
      }
      setSheet(null);
      if (formResource === 'patterns') { setRoutePatternsById({}); setExpandedRouteId(null); }
      setSection(formReturnSection);
      notify(`${ADMIN_RESOURCES[formResource]?.singular ?? 'Member'} ${formMode === 'create' ? 'created' : 'updated'} successfully.`); refresh();
    } catch (err) { setFormError(errorText(err, 'Could not save this record. Check the entered values and backend validation.')); }
    finally { setFormBusy(false); }
  };

  const handleDelete = async (resource, row) => {
    const id = idOf(row);
    if (id == null) { setSheet(null); setError('This record does not include an ID.'); return; }
    if (!window.confirm(`Remove ${ADMIN_RESOURCES[resource]?.singular.toLowerCase() ?? 'record'}? This action cannot be undone.`)) return;
    try { await deleteResource(resource, id); setSheet(null); notify('Record removed.'); refresh(); }
    catch (err) {
      setSheet(null);
      const fallback = resource === 'buses'
        ? 'This bus cannot be deleted because it is assigned to an active trip or a scheduled trip. Remove its trip/schedule assignment first.'
        : resource === 'drivers'
          ? 'This driver cannot be deleted because they are assigned to an active trip or a scheduled trip. Reassign or remove the trip/schedule first.'
          : resource === 'patterns'
            ? 'This route pattern cannot be deleted because it is used by a trip or schedule.'
            : 'Could not remove this record. It may be referenced by a trip or schedule.';
      setError(errorText(err, fallback));
    }
  };

  const handleRowView = async (row, resource = section) => {
    setSheet(null); setDetail({ ...row, _resource: resource });
    const id = idOf(row);
    if (resource !== 'requests' && id != null) {
      const updated = await getResource(resource, id).catch(() => null);
      if (updated) setDetail((old) => old ? { ...old, ...updated, _resource: resource } : { ...updated, _resource: resource });
    }
    if (resource === 'patterns' && id != null) {
      const stops = await listPatternStops(id).catch(() => []);
      setPatternStops(listData(stops).sort((a, b) => a.sequence - b.sequence));
    }
  };

  const handleMemberApprove = (row) => {
    setApprovalTarget(row);
    setApprovalRole(roleKey(row?.role ?? 'PASSENGER') || 'PASSENGER');
    setSheet({ type: 'approveRole' });
  };

  const confirmMemberApprove = async () => {
    const id = approvalTarget?.memberId ?? approvalTarget?.id;
    if (id == null) { setError('The membership request does not include a member ID.'); return; }
    try {
      await approveMember(id, { status: 'ACTIVE', role: transportMemberRole(approvalRole) });
      // The dashboard summary is not refreshed while the Requests section is open.
      // Decrement the pending badge immediately after the server confirms approval.
      setSummary((current) => current ? { ...current, pendingRequests: Math.max(0, Number(current.pendingRequests ?? 0) - 1) } : current);
      setSheet(null); setApprovalTarget(null); notify('Membership approved.'); refresh();
    } catch (err) { setError(errorText(err, 'Membership request could not be approved.')); }
  };
  const handleMemberReject = async (row) => {
    const id = row?.memberId ?? row?.id;
    if (!window.confirm('Reject this membership request?')) return;
    try {
      await rejectMember(id);
      setSummary((current) => current ? { ...current, pendingRequests: Math.max(0, Number(current.pendingRequests ?? 0) - 1) } : current);
      setSheet(null); notify('Membership request rejected.'); refresh();
    }
    catch (err) { setError(errorText(err, 'Membership request could not be rejected.')); }
  };

  const openRowSheet = (row, resource = section) => { setSelectedRow(row); setSheet({ type: 'actions', resource }); };

  async function toggleRouteStatus(route) {
    const id = idOf(route);
    const nextStatus = String(route.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateRouteStatus(id, nextStatus);
      notify(`Route ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
      refresh();
    } catch (err) { setError(errorText(err, 'Route status could not be updated.')); }
  }

  const toggleRoutePatterns = async (route) => {
    const routeId = idOf(route);
    if (String(expandedRouteId) === String(routeId)) { setExpandedRouteId(null); return; }
    setExpandedRouteId(routeId);
    if (routePatternsById[String(routeId)]) return;
    try {
      const result = await listResource('patterns', { page: 0, size: 50, filters: { routeId } });
      setRoutePatternsById((previous) => ({ ...previous, [String(routeId)]: result.items.map((pattern) => ({ ...pattern, routeId: pattern.routeId ?? routeId })) }));
    } catch (err) { setError(errorText(err, 'Route patterns could not be loaded.')); setRoutePatternsById((previous) => ({ ...previous, [String(routeId)]: [] })); }
  };

  const handleCreateTrip = async (event) => {
    event.preventDefault(); setFormBusy(true); setFormError('');
    try {
      if (!tripForm.routePatternId || !tripForm.busId || !tripForm.driverId) throw new Error('Select a route pattern, bus and driver.');
      if (tripForm.endTime <= tripForm.startTime) throw new Error('End time must be after the start time.');
      if (tripForm.returnEnabled && !tripForm.returnPatternId) throw new Error('Choose the return route pattern.');
      const durationMs = (new Date(asLocalDateTime(tripForm.date, tripForm.endTime))).getTime() - (new Date(asLocalDateTime(tripForm.date, tripForm.startTime))).getTime();
      const oneTimePayload = { routePatternId: Number(tripForm.routePatternId), busId: Number(tripForm.busId), driverId: Number(tripForm.driverId), tripType: 'SINGLE', scheduledStartTime: asLocalDateTime(tripForm.date, tripForm.startTime), scheduledEndTime: asLocalDateTime(tripForm.date, tripForm.endTime) };
      if (tripForm.tripType === 'DAILY') {
        if (!tripForm.operatingDays.length) throw new Error('Choose at least one operating day.');
        await createResource('schedules', { routePatternId: Number(tripForm.routePatternId), busId: Number(tripForm.busId), driverId: Number(tripForm.driverId), operatingDays: tripForm.operatingDays, scheduledStartTime: tripForm.startTime, scheduledEndTime: tripForm.endTime });
      } else await createResource('trips', oneTimePayload);
      if (tripForm.returnEnabled) {
        const returnStart = tripForm.returnStartTime;
        const endDate = new Date(asLocalDateTime(tripForm.date, returnStart)).getTime() + Math.max(durationMs, 15 * 60000);
        const returnEndDate = new Date(endDate);
        const returnEnd = `${String(returnEndDate.getHours()).padStart(2, '0')}:${String(returnEndDate.getMinutes()).padStart(2, '0')}`;
        if (tripForm.tripType === 'DAILY') {
          await createResource('schedules', { routePatternId: Number(tripForm.returnPatternId), busId: Number(tripForm.busId), driverId: Number(tripForm.driverId), operatingDays: tripForm.operatingDays, scheduledStartTime: returnStart, scheduledEndTime: returnEnd });
        } else {
          await createResource('trips', { ...oneTimePayload, routePatternId: Number(tripForm.returnPatternId), scheduledStartTime: asLocalDateTime(tripForm.date, returnStart), scheduledEndTime: asLocalDateTime(tripForm.date, returnEnd) });
        }
      }
      setSection('trips'); setTripTab('UPCOMING'); setFormBusy(false); notify(tripForm.tripType === 'DAILY' ? 'Recurring schedule created.' : 'Trip created successfully.'); refresh();
    } catch (err) { setFormError(errorText(err, 'Trip could not be created.')); setFormBusy(false); }
  };


  async function cancelTrip(row) {
    const id = idOf(row);
    if (!window.confirm('Cancel this scheduled trip?')) return;
    try {
      const { default: apiClient } = await import('../../../services/apiClient');
      await apiClient.patch(`/trips/${id}/cancel`);
      setSheet(null); notify('Trip cancelled.'); refresh();
    } catch (err) { setError(errorText(err, 'Trip could not be cancelled.')); }
  }

  async function toggleDriver(row, status) {
    if (String(row.driverStatus ?? row.status).toUpperCase() === 'ON_TRIP') { setError('A driver on a trip cannot change availability.'); return; }
    try { await updateResource('drivers', row.driverId ?? idOf(row), { status }); setSheet(null); notify(`Driver marked ${pretty(status).toLowerCase()}.`); refresh(); }
    catch (err) { setError(errorText(err, 'Driver availability could not be updated.')); }
  }

  const filteredTrips = useMemo(() => {
    if (section !== 'trips' || tripTab === 'SCHEDULES') return currentItems;
    let data = currentItems;
    if (tripTab === 'ALL') data = data;
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((item) => Object.values(item).some((value) => String(value ?? '').toLowerCase().includes(term)));
  }, [section, tripTab, currentItems, search]);

  const openOptionSheet = async (type) => {
    setOptionSearch(''); setOptionType(type); setSheet({ type: 'option', optionType: type });
    if (!options[type]?.length) await fetchCreateOptions();
  };
  const selectOption = async (type, row) => {
    const id = idOf(row);
    if (type === 'patterns') {
      setTripForm((old) => ({ ...old, routePatternId: String(id), routeId: String(row.routeId ?? old.routeId) }));
      const stops = await listPatternStops(id).catch(() => []);
      setPatternStops(listData(stops).sort((a, b) => a.sequence - b.sequence));
    } else if (type === 'returnPatterns') setTripForm((old) => ({ ...old, returnPatternId: String(id) }));
    else setTripForm((old) => ({ ...old, [`${type === 'buses' ? 'bus' : 'driver'}Id`]: String(id) }));
    setSheet(null);
  };

  function renderHeaderTitle(title, back = null, onRefresh = refresh, refreshing = false) {
    return <div className="adm-page-heading"><button className="adm-back-button" onClick={back ?? (() => go('home'))}><Icon name="arrow-left" /></button><h1>{title}</h1><button className={`adm-heading-action${refreshing ? ' is-refreshing' : ''}`} onClick={onRefresh} disabled={refreshing} aria-label="Refresh" title="Refresh"><Icon name="refresh" /></button></div>;
  }

  function renderHome() {
    return <>
      <div className="adm-hero"><div><p className="adm-greeting">Good morning, Admin</p><h1>{new Date().toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</h1><p className="adm-hero-copy">Keep your transport running smoothly.</p></div><img src={heroArt} alt="Bus and city illustration" onError={handleIllustrationError} /></div>
      <div className="adm-stat-grid">{summaryCards.map((card) => <button key={card.title} className="adm-stat-card" onClick={card.onClick}><span className={`adm-stat-icon tone-${card.tone}`}><Icon name={card.icon} size={23} /></span><span className="adm-stat-copy"><small>{card.title}</small><strong>{summaryLoading ? '—' : Number(card.value ?? 0).toLocaleString()}</strong></span><Icon name="chevron-right" size={17} className="adm-stat-chev" /></button>)}</div>
      {error && <div className="adm-alert"><Icon name="alert" /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">Dismiss</button></div>}
      <SectionTitle title="Live now" action="View all" onAction={() => go('liveMap')} />
      <div className="adm-live-map-preview"><LeafletMap buses={liveTripLocations.map(row => ({...row, point:{lat:Number(row.latitude),lng:Number(row.longitude)}, heading:row.headingDegrees, stale:Boolean(row.stale)}))} height={220} fitRoute adminRecenter roadRoutes={liveTripLocations.map(row => row.patternStops ?? [])} onBusClick={(trip) => handleRowView(trip, 'trips')} /><div className="adm-live-map-preview-footer"><span>{liveTripLocations.length} bus{liveTripLocations.length===1?'':'es'} with coordinates</span><button className="adm-map-open" onClick={() => go('liveMap')}><Icon name="map" size={15} /> View live map</button></div>{!liveTripLocations.length && <p className="adm-info-note">No live GPS positions are available yet. Buses appear when their drivers share coordinates.</p>}</div>
      <SectionTitle title="Needs attention" action={Number(summary?.pendingRequests) > 0 ? 'View requests' : undefined} onAction={() => go('requests')} />
      <div className="adm-attention-list">
        <button onClick={() => go('requests')}><i className="adm-attention-dot is-red" /><span><strong>Membership requests need review</strong><small>{Number(summary?.pendingRequests ?? 0)} pending request{Number(summary?.pendingRequests ?? 0) === 1 ? '' : 's'}</small></span><Icon name="chevron-right" /></button>
        <button onClick={() => go('drivers')}><i className="adm-attention-dot is-amber" /><span><strong>Review driver availability</strong><small>{Number(summary?.availableDrivers ?? 0)} drivers available for assignment</small></span><Icon name="chevron-right" /></button>
        <button onClick={() => go('buses')}><i className="adm-attention-dot is-gray" /><span><strong>Review fleet readiness</strong><small>{Number(summary?.availableBuses ?? 0)} buses currently available</small></span><Icon name="chevron-right" /></button>
      </div>
      <SectionTitle title="Today's trips" action="View all" onAction={() => go('trips')} />
      <div className="adm-trip-list">{summaryLoading ? <div className="adm-inline-loading">Loading today's trips…</div> : todayTrips.length ? todayTrips.slice(0, 5).map((trip) => <TripCard key={idOf(trip)} trip={trip} compact onOpen={(row) => handleRowView(row, 'trips')} />) : <div className="adm-inline-empty">No trips scheduled for today.</div>}</div>
      <div className="adm-create-fab-wrap"><button className="adm-fab" onClick={() => setSheet({ type: 'quickActions' })}><span>＋</span></button></div>
    </>;
  }

  function renderMore() {
    return <><div className="adm-more-heading"><h1>More</h1><p>Manage your transport system</p></div><div className="adm-more-system"><span className="adm-more-system-icon"><Icon name="building" size={23} /></span><span><strong>{transportSystemName || 'Selected transport system'}</strong><small>{accessType || 'PUBLIC'}</small></span></div><div className="adm-more-list">{MORE_LINKS.map((item) => <button key={item.key} className={item.danger ? 'is-danger' : ''} onClick={() => {
      if (item.key === 'logout') { if (window.confirm('Sign out of BusTrackr?')) { logout(); navigate('/login'); } }
      else if (item.key === 'switchSystem') navigate('/');
      else if (item.key === 'settings') notify('Settings will be added when the backend settings contract is available.');
      else go(item.key);
    }}><span className="adm-more-icon"><Icon name={item.icon} size={22} /></span><span><strong>{item.label}</strong><small>{item.description}</small></span>{item.badge && <b>{resourceCounts[item.badge] ?? '—'}</b>}<Icon name="chevron-right" size={19} /></button>)}</div><div className="adm-more-footer"><img src={heroArt} alt="BusTrackr transport illustration" onError={handleIllustrationError} /><span>BusTrackr v1.0.0</span></div></>;
  }

  function renderLiveMap() {
    const refreshLiveMap = () => { if (!summaryLoading) loadHome(); };
    const filteredTrips = liveTrips.filter((trip) => mapRouteFilter === 'ALL' || trip.routePatternCode === mapRouteFilter);
    const filteredLocations = liveTripLocations.filter((trip) => mapRouteFilter === 'ALL' || trip.routePatternCode === mapRouteFilter);
    return <>{renderHeaderTitle('Live map', () => go('home'), refreshLiveMap, summaryLoading)}<div className="adm-map-system-pill">{transportSystemName || 'Selected system'} <StatusPill value={accessType} /></div><FilterPills values={[{ value: 'ALL', label: 'All' }, ...[...new Set(liveTrips.map((trip) => trip.routePatternCode).filter(Boolean))].map((code) => ({ value: code, label: `Route ${code}` }))]} current={mapRouteFilter} onChange={setMapRouteFilter} />
      <LeafletMap buses={filteredLocations.map(row => ({ ...row, point:{lat:Number(row.latitude),lng:Number(row.longitude)}, heading:row.headingDegrees, stale:Boolean(row.stale) }))} height={390} fitRoute adminRecenter roadRoutes={filteredLocations.map(row => row.patternStops ?? [])} speedKmh={selectedLiveBus?.speedKmh ?? null} onBusClick={(trip) => setSelectedLiveBus(trip)} />
      {selectedLiveBus && <div className="adm-live-bus-popup"><button className="adm-live-bus-close" onClick={() => setSelectedLiveBus(null)} aria-label="Close bus details">×</button><strong>{selectedLiveBus.routePatternName ?? selectedLiveBus.routePatternCode ?? 'Live bus'}</strong><span>{selectedLiveBus.busNumber ?? 'Bus number unavailable'} · {(selectedLiveBus.driverName ?? selectedLiveBus.driver?.name ?? 'Driver unavailable').split(' ')[0]}</span><span>Next stop: {selectedLiveBus.nextStopName ?? selectedLiveBus.nextStop?.name ?? 'Not provided'}</span><span>Speed: {liveSpeedLabel(selectedLiveBus.speedKmh, selectedLiveBus.speedMetersPerSecond)}</span><span>Next stop distance: {liveDistanceLabel(selectedLiveBus.nextStopDistanceMeters)}</span><span>Remaining: {liveDistanceLabel(selectedLiveBus.remainingDistanceMeters)}</span><span>Route distance: {liveDistanceLabel(selectedLiveBus.totalRouteDistanceMeters)}</span><small>{selectedLiveBus.updatedAt ? `Updated ${new Date(selectedLiveBus.updatedAt).toLocaleTimeString()}` : 'Update time unavailable'}</small><button className="adm-btn adm-btn--primary" onClick={() => {
        const tripId = selectedLiveBus.tripId ?? selectedLiveBus.id;
        if (tripId == null) { setError('This live bus does not include a trip ID, so detailed tracking cannot be opened.'); return; }
        navigate(`/admin/trips/${encodeURIComponent(tripId)}/track`, {
          state: { trip: selectedLiveBus, isLive: true, accessType: 'PRIVATE', memberMode: true, transportSystemId }
        });
      }}>Track Now</button></div>}
      <SectionTitle title={`Live buses (${filteredTrips.length})`} subtitle={`${filteredLocations.length} with GPS coordinates`} />
      <div className="adm-trip-list">{filteredTrips.map((trip) => <TripCard key={idOf(trip)} trip={trip} onOpen={(row) => handleRowView(row, 'trips')} />)}{!filteredTrips.length && <EmptyState title="No live buses" message="There are no active trips to display right now." action="Refresh" onAction={refresh} />}</div>
      {filteredTrips.length > filteredLocations.length && <p className="adm-info-note"><Icon name="info" size={16} /> Some active trips have not reported coordinates yet. Their bus cards remain available below.</p>}
    </>;
  }

  function renderTrips() {
    const tabs = [{ value: 'ALL', label: 'All' }, { value: 'LIVE', label: 'Live' }, { value: 'UPCOMING', label: 'Upcoming' }, { value: 'COMPLETED', label: 'Completed' }, { value: 'TERMINATED', label: 'Terminated' }, { value: 'SCHEDULES', label: 'Schedules' }];
    const data = filteredTrips;
    const rowResource = tripTab === 'SCHEDULES' ? 'schedules' : 'trips';
    return <><div className="adm-page-heading adm-page-heading--section"><h1>Trips</h1><button className="adm-round-icon" onClick={() => setSheet({ type: 'tripFilters' })}><Icon name="sliders" /></button></div><SearchBar value={search} onChange={setSearch} placeholder="Search route, bus or driver..." /><FilterPills values={tabs} current={tripTab} onChange={(value) => { setTripTab(value); setPage(0); setFilters({}); }} /><div className="adm-filter-quick-row"><button onClick={() => setSheet({ type: 'tripFilters' })}><Icon name="route" size={15} /> Route <Icon name="chevron-down" size={14} /></button><button onClick={() => setSheet({ type: 'tripFilters' })}><Icon name="user" size={15} /> Driver <Icon name="chevron-down" size={14} /></button><button onClick={() => setSheet({ type: 'tripFilters' })}><Icon name="bus" size={15} /> Bus <Icon name="chevron-down" size={14} /></button><button onClick={() => setSheet({ type: 'tripFilters' })}><Icon name="calendar" size={15} /> Date <Icon name="chevron-down" size={14} /></button></div>
      {error && <div className="adm-alert"><Icon name="alert" /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">Dismiss</button></div>}
      <div className="adm-list-section-heading"><h3>{tabs.find((tab) => tab.value === tripTab)?.label} {rowResource === 'schedules' ? 'schedules' : 'trips'}</h3><span>{loading ? 'Loading…' : `${pageInfo.totalElements} ${pageInfo.totalElements === 1 ? 'item' : 'items'}`}</span></div>
      {loading ? <div className="adm-loading-cards">{[1, 2, 3, 4].map((n) => <div key={n} />)}</div> : data.length ? <div className="adm-trip-list">{data.map((row) => <div className="adm-card-row-wrap" key={idOf(row)}><TripCard trip={row} onOpen={(item) => openRowSheet(item, rowResource)} /><button className="adm-kebab" onClick={() => openRowSheet(row, rowResource)} aria-label="Trip actions">⋮</button></div>)}</div> : <EmptyState title={tripTab === 'SCHEDULES' ? 'No schedules found' : 'No trips found'} message="Try another filter, or create a trip to get started." action="Create trip" onAction={openTripCreate} />}
      <Pagination page={page} pageInfo={pageInfo} onPage={setPage} loading={loading} />
      <button className="adm-fab adm-fab--sticky" onClick={openTripCreate} aria-label="Create trip">＋</button>
    </>;
  }

  function Pagination({ page: currentPage, pageInfo: info, onPage, loading: isLoading }) {
    if (!info || info.totalPages <= 1) return null;
    return <div className="adm-pagination"><button disabled={currentPage <= 0 || isLoading} onClick={() => onPage((value) => Math.max(0, value - 1))}>Previous</button><span>Page {currentPage + 1} of {info.totalPages}</span><button disabled={info.last || isLoading} onClick={() => onPage((value) => value + 1)}>Next</button></div>;
  }

  function renderResourceList() {
    const config = ADMIN_RESOURCES[section];
    if (!config) return null;
    const heading = ({ buses: 'Buses', drivers: 'Drivers', routes: 'Routes', stops: 'Stops', patterns: 'Route patterns', members: 'Members', requests: 'Member requests' })[section] ?? config.title;
    const addAction = () => section === 'members' ? openForm('members', 'create') : openForm(section, 'create');
    const filtered = currentItems;
    return <><div className="adm-page-heading adm-page-heading--section"><h1>{heading}</h1><button className="adm-round-icon" onClick={refresh}><Icon name="search" /></button></div><SearchBar value={search} onChange={setSearch} placeholder={`Search ${heading.toLowerCase()}...`} />
      {section === 'members' && <><FilterPills values={[{ value: 'ADMIN', label: 'Admins' }, { value: 'DRIVER', label: 'Drivers' }, { value: 'PASSENGER', label: 'Passengers' }]} current={memberRoleTab} onChange={(value) => { setMemberRoleTab(value); setPage(0); }} /><FilterPills values={[{ value: 'ACTIVE', label: 'Active' }, { value: 'PENDING', label: 'Pending' }, { value: 'REJECTED', label: 'Rejected' }]} current={memberStatusTab} onChange={(value) => { setMemberStatusTab(value); setPage(0); }} /></>}
      {section === 'requests' && <FilterPills values={[{ value: 'PENDING', label: 'Pending' }, { value: 'ACTIVE', label: 'Approved' }, { value: 'REJECTED', label: 'Rejected' }]} current={requestTab} onChange={(value) => { setRows([]); setError(''); setRequestTab(value); setPage(0); }} />}
      {section === 'buses' && <FilterPills values={[{ value: 'ALL', label: 'All' }, { value: 'AVAILABLE', label: 'Available' }, { value: 'IN_USE', label: 'On trip' }, { value: 'MAINTENANCE', label: 'Maintenance' }, { value: 'INACTIVE', label: 'Inactive' }]} current={filters.status ?? 'ALL'} onChange={(value) => { setFilters((old) => ({ ...old, status: value })); setPage(0); }} />}
      {section === 'drivers' && <FilterPills values={[{ value: '', label: 'All' }, { value: 'AVAILABLE', label: 'Available' }, { value: 'ON_TRIP', label: 'On trip' }, { value: 'NOT_AVAILABLE', label: 'Not available' }]} current={filters.status ?? ''} onChange={(value) => { setFilters((old) => ({ ...old, status: value })); setPage(0); }} />}
      {section === 'routes' && <FilterPills values={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} current={routeStatusTab} onChange={setRouteStatusTab} />}
      {section === 'stops' && <FilterPills values={[{ value: 'LIST', label: 'List' }, { value: 'MAP', label: 'Map' }]} current={stopDisplay} onChange={setStopDisplay} />}
      {error && <div className="adm-alert"><Icon name="alert" /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">Dismiss</button></div>}
      {section === 'stops' && stopDisplay === 'MAP' && <section className="adm-stops-map-panel" aria-label="Stops on map">
        <div className="adm-stops-map-heading"><strong>Stops on map</strong><span>{filtered.filter((stop) => Number.isFinite(Number(stop.latitude ?? stop.lat)) && Number.isFinite(Number(stop.longitude ?? stop.lng))).length} with coordinates</span></div>
        <LeafletMap
          stops={filtered.map((stop) => ({ ...stop, id: idOf(stop), latitude: stop.latitude ?? stop.lat, longitude: stop.longitude ?? stop.lng }))}
          height={280}
          fitRoute
          showStopConnections={false}
          numberedStopsOnly
          className="adm-stops-real-map"
        />
        {!filtered.some((stop) => Number.isFinite(Number(stop.latitude ?? stop.lat)) && Number.isFinite(Number(stop.longitude ?? stop.lng))) && <p className="adm-info-note">No stops with valid coordinates are available on this page. Add coordinates to a stop to show it on the map.</p>}
        <p className="adm-info-note">Pins use each stop's saved latitude and longitude. Zoom and pan to inspect locations.</p>
      </section>}
      {loading ? <div className="adm-loading-cards">{[1, 2, 3, 4].map((n) => <div key={n} />)}</div> : filtered.length ? <div className="adm-resource-list">{filtered.map((row, index) => <div className="adm-resource-group" key={idOf(row) ?? index}><article className="adm-resource-card">
        <span className={`adm-resource-icon resource-${section}`}>{section === 'buses' ? <Icon name="bus" /> : section === 'drivers' || section === 'members' || section === 'requests' ? <Icon name="user" /> : section === 'routes' || section === 'patterns' ? <Icon name="route" /> : <Icon name="pin" />}</span>
        <button className="adm-resource-card-main" onClick={() => section === 'routes' ? toggleRoutePatterns(row) : handleRowView(row, section)}><strong>{section === 'buses' ? row.busNumber : section === 'drivers' || section === 'members' || section === 'requests' ? row.name ?? row.fullName ?? row.userName ?? row.email : section === 'routes' ? `${row.routeCode ?? ''} ${row.name ?? ''}` : section === 'patterns' ? `${row.code ?? row.routePatternCode ?? ''} · ${row.name ?? row.routePatternName ?? ''}` : row.name}</strong><small>{section === 'buses' ? `${row.model ?? 'Bus'} · ${row.capacity ?? '—'} seats` : section === 'drivers' ? `License: ${row.licenseNumber ?? '—'}` : section === 'members' || section === 'requests' ? `${pretty(roleKey(row.role))} · ${row.phone ?? row.email ?? 'No contact'}` : section === 'routes' ? `${row.patternCount ?? row.patternsCount ?? routePatternsById[String(idOf(row))]?.length ?? '—'} patterns` : section === 'patterns' ? `${row.routeName ?? row.routeCode ?? ''} · ${row.originStopName ?? '—'} → ${row.destinationStopName ?? '—'}` : `${row.address ?? 'Location not available'}${row.latitude != null && row.longitude != null ? ` · ${row.latitude}, ${row.longitude}` : ''}`}</small>{section === 'drivers' && <small>License valid until {row.licenseExpiryDate ?? '—'}</small>}</button>
        <div className="adm-resource-card-trailing">{section !== 'routes' && <StatusPill value={section === 'members' && memberRoleTab === 'DRIVER' ? row.driverStatus ?? row.status : row.status ?? row.scheduleStatus} />}{section === 'routes' && <button className={`adm-status-switch ${String(row.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'is-on' : ''}`} onClick={() => toggleRouteStatus(row)} aria-label={`Set route ${row.routeCode} ${String(row.status).toLowerCase() === 'active' ? 'inactive' : 'active'}`}><span /></button>}<button className="adm-kebab" onClick={() => openRowSheet(row, section)} aria-label="More actions">⋮</button>{section === 'routes' && <button className="adm-kebab" onClick={() => toggleRoutePatterns(row)} aria-label="Expand route patterns"><Icon name={String(expandedRouteId) === String(idOf(row)) ? 'chevron-up' : 'chevron-down'} size={17} /></button>}</div>
      </article>{section === 'routes' && String(expandedRouteId) === String(idOf(row)) && <div className="adm-nested-patterns">{(routePatternsById[String(idOf(row))] ?? []).map((pattern) => <button key={idOf(pattern)} onClick={() => handleRowView(pattern, 'patterns')}><span className="adm-nested-route-dot" /><span><strong>{pattern.name ?? pattern.routePatternName}</strong><small>{pattern.originStopName ?? row.name} → {pattern.destinationStopName ?? ''} · {pattern.stopCount ?? '—'} stops</small></span><Icon name="chevron-right" size={17} /></button>)}{!(routePatternsById[String(idOf(row))] ?? []).length && <p>No patterns yet. Add a pattern to define the stops for this route.</p>}<button className="adm-add-pattern-inline" onClick={async () => { await openForm('patterns', 'create'); setForm((previous) => ({ ...previous, routeId: String(idOf(row)) })); }}><span>＋</span> Add pattern</button></div>}</div>)}</div> : <EmptyState title={section === 'stops' ? 'No stops yet' : `No ${heading.toLowerCase()} found`} message={`Create or adjust filters to see ${heading.toLowerCase()} here.`} action={section === 'requests' ? undefined : `Add ${config.singular.toLowerCase()}`} onAction={addAction} />}
      <Pagination page={page} pageInfo={pageInfo} onPage={setPage} loading={loading} />
      {section !== 'requests' && <button className="adm-fab adm-fab--sticky" onClick={addAction} aria-label={`Add ${config.singular}`}>＋</button>}
    </>;
  }

  function renderCreateTrip() {
    const selectedPattern = options.patterns.find((item) => String(idOf(item)) === String(tripForm.routePatternId));
    const selectedReturnPattern = options.patterns.find((item) => String(idOf(item)) === String(tripForm.returnPatternId));
    const selectedBus = options.buses.find((item) => String(idOf(item)) === String(tripForm.busId));
    const selectedDriver = options.drivers.find((item) => String(idOf(item)) === String(tripForm.driverId));
    return <><div className="adm-page-heading"><button className="adm-back-button" onClick={() => go('home')}><Icon name="arrow-left" /></button><h1>Create trip</h1></div><form className="adm-create-trip-form" onSubmit={handleCreateTrip}>
      <section className="adm-form-step"><header><span>1</span><div><h2>Route and pattern</h2><p>Select a route and pattern for this trip.</p></div></header>
        <button type="button" className="adm-choice-field" onClick={() => openOptionSheet('routes')}><small>Route <b>*</b></small><strong>{options.routes.find((route) => String(idOf(route)) === String(tripForm.routeId))?.name ?? 'Select route'}</strong><Icon name="chevron-right" /></button>
        <button type="button" className="adm-choice-field" onClick={() => openOptionSheet('patterns')}><small>Pattern <b>*</b></small><strong>{selectedPattern?.name ?? selectedPattern?.routePatternName ?? 'Select pattern'}</strong><Icon name="chevron-right" /></button><p className="adm-help-copy">The route is used to find the matching route patterns.</p>
        {selectedPattern && <div className="adm-pattern-summary"><h3>Pattern summary</h3><div className="adm-summary-stop"><span className="summary-stop-icon"><Icon name="flag" /></span><span><small>Start</small><strong>{patternStops[0]?.stopName ?? selectedPattern.originStopName ?? 'Start stop'}</strong></span></div><div className="adm-summary-stop"><span className="summary-stop-icon"><Icon name="pin" /></span><span><small>Destination</small><strong>{patternStops.at(-1)?.stopName ?? selectedPattern.destinationStopName ?? 'Destination'}</strong></span><em>{patternStops.length || '—'} stops</em></div>{patternStops.length > 0 && <div className="adm-mini-stop-list">{patternStops.slice(0, 4).map((stop, index) => <span key={stop.id ?? stop.stopId}>{index + 1}. {stop.stopName} · {formatStopArrivalTime(stop.stopArrivalTime)}</span>)}</div>}<button type="button" className="adm-muted-full" onClick={() => setSheet({ type: 'patternStops' })}>View all stops <Icon name="chevron-down" size={15} /></button></div>}
      </section>
      <section className="adm-form-step"><header><span>2</span><div><h2>Assign</h2><p>Select a bus and driver for this trip.</p></div></header>
        <button type="button" className="adm-choice-field" onClick={() => openOptionSheet('buses')}><small>Bus <b>*</b></small><strong>{selectedBus?.busNumber ?? 'Select bus'}</strong><StatusPill value={selectedBus?.status ?? 'Choose'} /><Icon name="chevron-right" /></button>
        <button type="button" className="adm-choice-field" onClick={() => openOptionSheet('drivers')}><small>Driver <b>*</b></small><strong>{selectedDriver?.name ?? 'Select driver'}</strong><StatusPill value={selectedDriver?.status ?? 'Choose'} /><Icon name="chevron-right" /></button>
        {selectedDriver && <p className={`adm-inline-validation ${String(selectedDriver.status).toUpperCase() === 'AVAILABLE' ? 'is-ok' : 'is-error'}`}>{String(selectedDriver.status).toUpperCase() === 'AVAILABLE' ? 'Driver is available.' : `Driver is ${pretty(selectedDriver.status).toLowerCase()} and may not be assigned.`}</p>}
      </section>
      <section className="adm-form-step"><header><span>3</span><div><h2>Timing</h2><p>Set when this trip will run.</p></div></header><FilterPills values={[{ value: 'ONE_TIME', label: 'One-time' }, { value: 'DAILY', label: 'Daily (recurring)' }]} current={tripForm.tripType} onChange={(value) => setTripForm((old) => ({ ...old, tripType: value }))} />
        {tripForm.tripType === 'ONE_TIME' ? <FormField label="Date" name="date" value={tripForm.date} type="date" required onChange={(key, value) => setTripForm((old) => ({ ...old, [key]: value }))} /> : <div className="adm-days-grid">{DAY_OPTIONS.map((day) => <label key={day} className={tripForm.operatingDays.includes(day) ? 'selected' : ''}><input type="checkbox" checked={tripForm.operatingDays.includes(day)} onChange={(event) => setTripForm((old) => ({ ...old, operatingDays: event.target.checked ? [...old.operatingDays, day] : old.operatingDays.filter((item) => item !== day) }))} />{day.slice(0, 3)}</label>)}</div>}
        <div className="adm-time-grid"><FormField label="Start time" name="startTime" value={tripForm.startTime} type="time" required onChange={(key, value) => setTripForm((old) => ({ ...old, [key]: value }))} /><FormField label="End time" name="endTime" value={tripForm.endTime} type="time" required onChange={(key, value) => setTripForm((old) => ({ ...old, [key]: value }))} /></div>
        <label className="adm-toggle-line"><input type="checkbox" checked={tripForm.returnEnabled} onChange={(event) => setTripForm((old) => ({ ...old, returnEnabled: event.target.checked }))} /><span><strong>Also create a return trip</strong><small>Create a trip for the return route as well.</small></span></label>
        {tripForm.returnEnabled && <div className="adm-return-panel"><button type="button" className="adm-choice-field" onClick={() => openOptionSheet('returnPatterns')}><small>Return pattern <b>*</b></small><strong>{selectedReturnPattern?.name ?? selectedReturnPattern?.routePatternName ?? 'Select return pattern'}</strong><Icon name="chevron-right" /></button><FormField label="Return start time" name="returnStartTime" value={tripForm.returnStartTime} type="time" required onChange={(key, value) => setTripForm((old) => ({ ...old, [key]: value }))} /><div className="adm-info-note"><Icon name="info" size={15} /> The same bus and driver will be assigned to the return trip.</div></div>}
      </section>
      {formError && <div className="adm-form-error"><Icon name="alert" />{formError}</div>}
      <div className="adm-sticky-submit"><button type="submit" className="adm-btn adm-btn--primary" disabled={formBusy || optionLoading}>{formBusy ? 'Creating…' : tripForm.tripType === 'DAILY' ? 'Create schedule' : 'Create trip'}</button></div>
    </form></>;
  }

  function renderDetail() {
    if (!detail) return null;
    const resource = detail._resource ?? section;
    // Membership request DTO already returns `name` as a top-level String.
    // Use that exact response field for the request title and Name row.
    const memberName = resource === 'requests' ? detail['name'] : '';
    const fields = Object.entries(detail)
      .filter(([key, value]) => !key.startsWith('_') && !(resource === 'requests' && key === 'name') && value !== undefined && value !== null && typeof value !== 'object' && !['createdAt', 'updatedAt'].includes(key));
    return <Sheet title={`${ADMIN_RESOURCES[resource]?.singular ?? 'Record'} details`} onClose={() => setDetail(null)} footer={<><button className="adm-btn adm-btn--outline" onClick={() => setDetail(null)}>Close</button>{resource === 'trips' && ['ACTIVE', 'IN_PROGRESS'].includes(String(detail.status ?? detail.tripStatus ?? '').toUpperCase()) && <button className="adm-btn adm-btn--primary" onClick={() => { const tripId = detail.tripId ?? detail.id; if (tripId == null) { setError('This trip does not include a trip ID.'); return; } navigate(`/admin/trips/${encodeURIComponent(tripId)}/track`, { state: { trip: detail, isLive: true, accessType: 'PRIVATE', memberMode: true, transportSystemId } }); }}>Track Now</button>}{!['requests', 'trips'].includes(resource) && <button className="adm-btn adm-btn--primary" onClick={() => { const record = { ...detail }; setDetail(null); openForm(resource, 'edit', record); }}>Edit</button>}</>}>
      <div className="adm-detail-title"><strong>{(resource === 'requests' ? detail['name'] : null) ?? detail.routePatternName ?? detail.name ?? detail.fullName ?? detail.userName ?? detail.user?.name ?? detail.user?.fullName ?? detail.busNumber ?? detail.routeCode ?? 'Details'}</strong><StatusPill value={detail.status ?? detail.scheduleStatus} /></div>
      <div className="adm-detail-grid">{resource === 'requests' && <div><small>Name</small><strong>{typeof memberName === 'string' && memberName.trim() ? memberName : '—'}</strong></div>}{fields.slice(0, resource === 'requests' ? 21 : 22).map(([key, value]) => <div key={key}><small>{pretty(key.replace(/([A-Z])/g, ' $1'))}</small><strong>{Array.isArray(value) ? value.map(pretty).join(', ') : String(value)}</strong></div>)}{resource === 'schedules' && Array.isArray(detail.operatingDays) && <div className="adm-detail-field adm-detail-field--wide"><small>Operating days</small><strong>{detail.operatingDays.length ? detail.operatingDays.map((day) => pretty(String(day).toLowerCase())).join(', ') : 'Not specified'}</strong></div>}</div>
      {resource === 'trips' && (() => { const live = liveTripLocations.find(row => String(row.tripId ?? row.id) === String(detail.tripId ?? detail.id)); return live ? <section className="adm-detail-stops"><h3>Live bus location</h3><LeafletMap buses={[{...live,point:{lat:Number(live.latitude),lng:Number(live.longitude)},heading:live.headingDegrees,stale:Boolean(live.stale)}]} height={260} adminRecenter /><p className="adm-info-note">{live.stale ? 'Location is stale' : 'Latest server-reported location'} · {live.updatedAt ? new Date(live.updatedAt).toLocaleTimeString() : 'Update time unavailable'}</p></section> : null; })()}
      {resource === 'patterns' && <div className="adm-detail-stops"><h3>Stops in order</h3>{patternStops.length ? <ol>{patternStops.slice().sort((a, b) => a.sequence - b.sequence).map((stop, index) => <li key={stop.id ?? stop.stopId}><span>{index + 1}</span>{stop.stopName}<small>{index === 0 ? 'Start' : index === patternStops.length - 1 ? 'Destination' : ''}</small><b className="adm-stop-arrival-time">{formatStopArrivalTime(stop.stopArrivalTime)}</b></li>)}</ol> : <p>Stop sequence isn't available for this pattern.</p>}<button className="adm-btn adm-btn--outline" onClick={() => { setDetail(null); openForm('patterns', 'edit', detail); }}>Edit pattern</button></div>}
    </Sheet>;
  }

  const useCurrentLocationForStop = () => {
    setFormError('');
    if (!navigator.geolocation) { setFormError('Location is not supported by this browser.'); return; }
    navigator.geolocation.getCurrentPosition((position) => {
      setForm((previous) => ({ ...previous, latitude: Number(position.coords.latitude.toFixed(6)), longitude: Number(position.coords.longitude.toFixed(6)), address: previous.address || 'Current location' }));
      notify('Current coordinates added.');
    }, (geoError) => {
      setFormError(geoError.code === 1 ? 'Allow location access in your browser to use your current location.' : 'Could not read your current location. Enter the coordinates manually.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 });
  };

  function renderResourceFormPage() {
    if (section !== 'resourceForm') return null;
    const resource = formResource;
    const mode = formMode;
    const leaveForm = () => { setFormError(''); setSection(formReturnSection); };
    const configs = {
      buses: mode === 'edit' ? [...ADMIN_RESOURCES.buses.fields, { name: 'status', label: 'Status', options: ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE'], required: true }] : ADMIN_RESOURCES.buses.fields,
      routes: mode === 'edit' ? [{ name: 'routeCode', label: 'Route code', required: true }, { name: 'name', label: 'Route name', required: true }, { name: 'status', label: 'Status', options: ['ACTIVE', 'INACTIVE'], required: true }] : ADMIN_RESOURCES.routes.fields.map((field) => ['originStopId', 'destinationStopId'].includes(field.name) ? { ...field, options: options.stops.map((stop) => ({ value: String(idOf(stop)), label: stop.name })) } : field),
      stops: ['name', 'address', 'stopCode', 'latitude', 'longitude'].map((key) => ADMIN_RESOURCES.stops.fields.find((field) => field.name === key)),
      drivers: mode === 'edit' ? ADMIN_RESOURCES.drivers.fields : [{ name: 'name', label: 'Full name', required: true }, { name: 'address', label: 'Address', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'phone', label: 'Phone number', required: true }, { name: 'licenseNo', label: 'Driving license number', required: true }, { name: 'licenseExpiryDate', label: 'License expiry date', type: 'date', required: true }],
      members: mode === 'edit' ? [{ name: 'role', label: 'Role', options: ['ADMIN', 'DRIVER', 'PASSENGER'], required: true }] : [{ name: 'fullName', label: 'Full name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'phone', label: 'Phone number', required: true }, { name: 'address', label: 'Address', required: memberFormRole === 'DRIVER' }, ...(memberFormRole === 'DRIVER' ? [{ name: 'licenseNo', label: 'Driving license number', required: true }, { name: 'licenseExpiryDate', label: 'License expiry date', type: 'date', required: true }] : [])],
      schedules: mode === 'edit' ? [{ name: 'scheduledStartTime', label: 'Start time', type: 'time', required: true }, { name: 'scheduledEndTime', label: 'End time', type: 'time', required: true }, { name: 'busId', label: 'Bus ID', type: 'number', required: true }, { name: 'driverId', label: 'Driver ID', type: 'number', required: true }, { name: 'scheduleStatus', label: 'Schedule status', options: ['ACTIVE', 'INACTIVE', 'CANCELLED'], required: true }] : [],
      patterns: mode === 'edit' ? [{ name: 'code', label: 'Pattern code', required: true }, { name: 'name', label: 'Pattern name', required: true }] : [{ name: 'routeId', label: 'Route', options: options.routes.map((route) => ({ value: String(idOf(route)), label: `${route.routeCode ?? ''} · ${route.name ?? ''}` })), required: true }, { name: 'code', label: 'Pattern code', required: true }, { name: 'name', label: 'Pattern name', required: true }],
    };
    const fields = configs[resource] ?? [];
    const title = mode === 'edit' ? `Edit ${ADMIN_RESOURCES[resource]?.singular.toLowerCase()}` : resource === 'members' ? 'Add member' : `Create ${ADMIN_RESOURCES[resource]?.singular.toLowerCase()}`;
    return <div className="adm-resource-form-page">
      <div className="adm-form-brand-row"><BrandLogo size="sm" /><button type="button" className="adm-avatar" onClick={() => { leaveForm(); go('more'); }} aria-label="Admin profile">AD</button></div>
      <div className="adm-form-system-row"><span className="adm-system-bus"><Icon name="bus" size={16} /></span><strong>{transportSystemName || 'Selected transport system'}</strong><span className={`adm-access-tag ${String(accessType).toUpperCase() === 'PRIVATE' ? 'is-private' : ''}`}>{accessType || 'PUBLIC'}</span></div>
      <div className="adm-page-heading"><button type="button" className="adm-back-button" onClick={leaveForm}><Icon name="arrow-left" /></button><h1>{title}</h1></div>
      {resource === 'members' && mode === 'create' && <FilterPills values={[{ value: 'DRIVER', label: 'Driver' }, { value: 'ADMIN', label: 'Admin' }, { value: 'PASSENGER', label: 'Passenger' }]} current={memberFormRole} onChange={setMemberFormRole} />}
      {resource === 'buses' && mode === 'edit' && <p className="adm-info-note"><Icon name="info" size={15} /> A bus on an active trip should not be removed until the trip ends.</p>}
      <form className="adm-sheet-form adm-resource-form" onSubmit={handleSaveResource}>
        {(resource === 'stops' ? fields.filter((field) => !['latitude', 'longitude'].includes(field.name)) : fields).map((field) => {
          let optionsList = field.options;
          if (!optionsList && ['status', 'scheduleStatus', 'role'].includes(field.name)) optionsList = field.name === 'status' && resource === 'buses' ? ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'INACTIVE'] : field.name === 'status' && resource === 'routes' ? ['ACTIVE', 'INACTIVE'] : field.name === 'role' ? ['ADMIN', 'DRIVER', 'PASSENGER'] : ['ACTIVE', 'INACTIVE', 'CANCELLED'];
          const stopField = resource === 'stops' && field.name === 'address' ? { ...field, label: 'Search place / address', placeholder: 'LIG Square, Indore' } : field;
          return <FormField key={field.name} {...stopField} options={optionsList} value={form[field.name] ?? ''} onChange={handleFormChange} />;
        })}
        {resource === 'stops' && <><StopPickerMap value={form.latitude != null && form.longitude != null && form.latitude !== '' && form.longitude !== '' ? { lat:Number(form.latitude), lng:Number(form.longitude) } : null} existingStops={options.stops ?? []} onChange={(point) => setForm(previous => ({ ...previous, latitude:point.lat, longitude:point.lng }))} onSuggestName={(name) => setForm(previous => ({ ...previous, name: previous.name || name }))} height={300} /><div className="adm-time-grid"><FormField label="Latitude" name="latitude" value={form.latitude ?? ''} type="number" required onChange={handleFormChange} /><FormField label="Longitude" name="longitude" value={form.longitude ?? ''} type="number" required onChange={handleFormChange} /></div></>}
        {resource === 'patterns' && <><div className="adm-selected-stops-heading"><span>Stops in order</span><button type="button" className="adm-link-button" onClick={() => { setOptionSearch(''); setSheet({ type: 'patternStopPicker', returnTo: 'form' }); }}>＋ Add stops</button></div>{selectedStops.length ? <ol className="adm-edit-stop-list">{selectedStops.map((stop, index) => { const timeError = validatePatternStopTimes(selectedStops)[index]; return <li key={`${stop.stopId}-${index}`}><span className="adm-stop-order-index">{index + 1}</span><strong>{stop.stopName}</strong><label className="adm-pattern-stop-time"><span>Arrival <b>*</b></span><input aria-required="true" aria-label={`${stop.stopName} arrival time`} type="time" step="1" value={stop.stopArrivalTime ?? ''} onChange={(event) => setSelectedStops((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, stopArrivalTime: event.target.value } : item))} /></label><div><button type="button" disabled={index === 0} onClick={() => setSelectedStops((previous) => { const copy = [...previous]; [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]]; return copy; })}>↑</button><button type="button" disabled={index === selectedStops.length - 1} onClick={() => setSelectedStops((previous) => { const copy = [...previous]; [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]]; return copy; })}>↓</button><button type="button" onClick={() => setSelectedStops((previous) => previous.filter((item) => item.stopId !== stop.stopId))}>×</button></div>{timeError && <small className="adm-pattern-stop-error">{timeError}</small>}</li>; })}</ol> : <p className="adm-help-copy">Add at least two stops and arrange them in travel order.</p>}</>}
        {formError && <div className="adm-form-error">{formError}</div>}
        <div className="adm-resource-form-footer"><button type="submit" className="adm-btn adm-btn--primary" disabled={formBusy}>{formBusy ? 'Saving…' : mode === 'edit' ? 'Save changes' : `${resource === 'stops' ? 'Save stop' : resource === 'patterns' ? 'Save pattern' : resource === 'routes' ? 'Create route' : resource === 'buses' ? 'Save bus' : resource === 'members' ? 'Create member' : `Create ${ADMIN_RESOURCES[resource]?.singular.toLowerCase()}`}`}</button></div>
      </form>
    </div>;
  }

  function renderOptionSheet() {
    if (!sheet || sheet.type !== 'option') return null;
    const type = sheet.optionType;
    let source = type === 'returnPatterns' ? options.patterns : options[type] ?? [];
    if (type === 'patterns' && tripForm.routeId) source = source.filter((item) => String(item.routeId) === String(tripForm.routeId));
    const term = optionSearch.trim().toLowerCase();
    if (term) source = source.filter((item) => Object.values(item).some((value) => String(value ?? '').toLowerCase().includes(term)));
    const title = type === 'patterns' || type === 'returnPatterns' ? 'Select route pattern' : type === 'buses' ? 'Select bus' : type === 'drivers' ? 'Select driver' : 'Select route';
    return <Sheet title={title} onClose={() => setSheet(null)} footer={<button className="adm-btn adm-btn--primary" onClick={() => setSheet(null)}>Done</button>}>
      <SearchBar value={optionSearch} onChange={setOptionSearch} placeholder={`Search ${type === 'buses' ? 'bus number or model' : type === 'drivers' ? 'driver name or phone' : type === 'routes' ? 'route name or code' : 'pattern name'}`} />
      {optionLoading && !source.length ? <p className="adm-inline-loading">Loading options…</p> : source.length ? <div className="adm-option-list">{source.map((item, index) => {
        const id = idOf(item);
        const selected = String(id) === String(type === 'routes' ? tripForm.routeId : type === 'buses' ? tripForm.busId : type === 'drivers' ? tripForm.driverId : type === 'returnPatterns' ? tripForm.returnPatternId : tripForm.routePatternId);
        const disabled = ['ON_TRIP', 'NOT_AVAILABLE', 'INACTIVE', 'OUT_OF_SERVICE'].includes(String(item.status ?? '').toUpperCase());
        const label = type === 'routes' ? `${item.routeCode ?? 'Route'} · ${item.name ?? ''}` : type === 'patterns' || type === 'returnPatterns' ? `${item.code ?? item.routePatternCode ?? 'Pattern'} · ${item.name ?? item.routePatternName ?? ''}` : type === 'buses' ? item.busNumber : item.name ?? item.fullName;
        const sub = type === 'routes' ? `${item.status ?? 'Route'}` : type === 'patterns' || type === 'returnPatterns' ? `${item.originStopName ?? ''} → ${item.destinationStopName ?? ''}` : type === 'buses' ? `${item.model ?? 'Bus'} · ${item.capacity ?? '—'} seats` : `${item.phone ?? item.licenseNumber ?? ''}`;
        return <button key={id ?? index} disabled={disabled} className={`adm-option-row ${selected ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`} onClick={() => type === 'routes' ? (setTripForm((old) => ({ ...old, routeId: String(id), routePatternId: '' })), setSheet(null)) : selectOption(type, item)}><span><strong>{label}</strong><small>{sub}</small></span><StatusPill value={item.status ?? 'Available'} /><span className={`adm-radio ${selected ? 'checked' : ''}`} /></button>;
      })}</div> : <EmptyState title="Nothing found" message="Try another search term." />}
    </Sheet>;
  }

  function renderPatternStopsSheet() {
    if (!sheet || sheet.type !== 'patternStops') return null;
    const ordered = [...patternStops].sort((a, b) => a.sequence - b.sequence);
    return <Sheet title={`All stops (${ordered.length})`} onClose={() => setSheet(null)} footer={<button className="adm-btn adm-btn--primary" onClick={() => setSheet(null)}>Done</button>}>
      {ordered.length ? <ol className="adm-detail-stop-list">{ordered.map((stop, index) => <li key={stop.id ?? stop.stopId}><span>{index + 1}</span><strong>{stop.stopName ?? `Stop ${stop.stopId}`}</strong>{index === 0 ? <em>Start</em> : index === ordered.length - 1 ? <em>End</em> : null}<b className="adm-stop-arrival-time">{formatStopArrivalTime(stop.stopArrivalTime)}</b></li>)}</ol> : <EmptyState title="No stop details" message="The pattern stop response did not include an ordered stop list." />}
    </Sheet>;
  }

  function renderPatternStopPicker() {
    if (!sheet || sheet.type !== 'patternStopPicker') return null;
    const term = optionSearch.trim().toLowerCase();
    const available = options.stops.filter((stop) => !selectedStops.some((selected) => String(selected.stopId) === String(idOf(stop))) && (!term || `${stop.name} ${stop.address}`.toLowerCase().includes(term)));
    return <Sheet title="Add stops" onClose={() => setSheet(null)} footer={<button className="adm-btn adm-btn--primary" onClick={() => setSheet(null)}>Add {selectedStops.length} selected</button>}>
      <SearchBar value={optionSearch} onChange={setOptionSearch} placeholder="Search stops" />
      <div className="adm-option-list">{available.map((stop) => <button className={`adm-option-row ${selectedStops.some((item) => String(item.stopId) === String(idOf(stop))) ? 'is-selected' : ''}`} key={idOf(stop)} onClick={() => setSelectedStops((old) => [...old, { stopId: idOf(stop), stopName: stop.name, sequence: old.length + 1, stopArrivalTime: '' }])}><span><strong>{stop.name}</strong><small>{stop.address ?? 'Address unavailable'}</small></span><span className="adm-radio" /></button>)}</div>
    </Sheet>;
  }

  function renderTripFilterSheet() {
    if (!sheet || sheet.type !== 'tripFilters') return null;
    return <Sheet title="Filter trips" onClose={() => setSheet(null)} footer={<><button className="adm-btn adm-btn--outline" onClick={() => { setFilters({}); setPage(0); setSheet(null); }}>Clear filters</button><button className="adm-btn adm-btn--primary" onClick={() => { setPage(0); setSheet(null); refresh(); }}>Apply filters</button></>}>
      {tripFilterOptionsLoading && <p className="adm-form-hint">Loading route patterns, drivers, and buses…</p>}
      {tripFilterOptionsError && <p className="adm-form-error">{tripFilterOptionsError}</p>}
      <FormField label="Route pattern" name="routePatternId" value={filters.routePatternId ?? ''} options={tripFilterOptions.routePatterns.map((item) => ({ value: item.routePatternId, label: item.routePatternName }))} onChange={(key, value) => setFilters((old) => ({ ...old, [key]: value }))} />
      <FormField label="Driver" name="driverId" value={filters.driverId ?? ''} options={tripFilterOptions.drivers.map((item) => ({ value: item.driverId, label: item.driverName }))} onChange={(key, value) => setFilters((old) => ({ ...old, [key]: value }))} />
      {tripTab === 'SCHEDULES' ? <FormField label="Operating day" name="day" value={filters.day ?? ''} options={DAY_OPTIONS} onChange={(key, value) => setFilters((old) => ({ ...old, [key]: value }))} /> : <><FormField label="Bus number" name="busId" value={filters.busId ?? ''} options={tripFilterOptions.buses.map((item) => ({ value: item.busId, label: item.busNumber }))} onChange={(key, value) => setFilters((old) => ({ ...old, [key]: value }))} /><FormField label="Date" name="date" value={filters.date ?? ''} type="date" onChange={(key, value) => setFilters((old) => ({ ...old, [key]: value }))} /></>}
      <div className="adm-time-grid"><FormField label="Start time" name="startTime" value={filters.startTime ?? ''} type="time" onChange={(key, value) => setFilters((old) => ({ ...old, [key]: value }))} /><FormField label="End time" name="endTime" value={filters.endTime ?? ''} type="time" onChange={(key, value) => setFilters((old) => ({ ...old, [key]: value }))} /></div>
    </Sheet>;
  }

  function renderQuickActions() {
    if (!sheet || sheet.type !== 'quickActions') return null;
    return <div className="adm-quick-actions-overlay" onMouseDown={(event) => event.target === event.currentTarget && setSheet(null)}>
      <div className="adm-quick-actions-popover" role="menu" aria-label="Quick actions">
        <button role="menuitem" onClick={() => { setSheet(null); openTripCreate(); }}><Icon name="calendar" size={18} /><strong>Create trip</strong></button>
        <button role="menuitem" onClick={() => { setSheet(null); openForm('members', 'create'); }}><Icon name="users" size={18} /><strong>Add member</strong></button>
      </div>
      <button className="adm-fab adm-fab--close" onClick={() => setSheet(null)} aria-label="Close quick actions">×</button>
    </div>;
  }

  function renderApprovalRoleSheet() {
    if (!sheet || sheet.type !== 'approveRole' || !approvalTarget) return null;
    return <Sheet title="Approve membership" onClose={() => { setSheet(null); setApprovalTarget(null); }} footer={<><button className="adm-btn adm-btn--outline" onClick={() => { setSheet(null); setApprovalTarget(null); }}>Cancel</button><button className="adm-btn adm-btn--primary" onClick={confirmMemberApprove}>Approve member</button></>}>
      <div className="adm-action-summary"><strong>{approvalTarget.name ?? approvalTarget.fullName ?? approvalTarget.email ?? 'New member'}</strong><span>{approvalTarget.email ?? ''}</span><StatusPill value="PENDING" /></div>
      <p className="adm-help-copy">Choose the role this member will receive in the transport system.</p>
      <FilterPills values={[{ value: 'ADMIN', label: 'Admin' }, { value: 'DRIVER', label: 'Driver' }, { value: 'PASSENGER', label: 'Passenger' }]} current={approvalRole} onChange={setApprovalRole} />
    </Sheet>;
  }

  return <div className="adm-app">
    {!['createTrip', 'resourceForm'].includes(section) && <TopHeader systemName={transportSystemName} accessType={accessType} onProfile={() => go('more')} />}
    <main className={`adm-mobile-content ${['createTrip', 'resourceForm'].includes(section) ? 'has-form' : ''}`}>
      {section === 'home' && renderHome()}
      {section === 'liveMap' && renderLiveMap()}
      {section === 'trips' && renderTrips()}
      {['buses', 'drivers', 'routes', 'stops', 'patterns', 'members', 'requests'].includes(section) && renderResourceList()}
      {section === 'more' && renderMore()}
      {section === 'createTrip' && renderCreateTrip()}
      {section === 'resourceForm' && renderResourceFormPage()}
      {section === 'settings' && <><div className="adm-page-heading"><button className="adm-back-button" onClick={() => go('more')}><Icon name="arrow-left" /></button><h1>Settings</h1></div><EmptyState title="Settings are coming next" message="Your API contracts do not currently include admin preference endpoints." action="Back to More" onAction={() => go('more')} /></>}
    </main>
    {!['createTrip', 'resourceForm'].includes(section) && <nav className="adm-bottom-nav">{NAV.map((item) => <button key={item.key} className={section === item.key || (item.key === 'more' && ['buses', 'drivers', 'routes', 'stops', 'patterns', 'liveMap', 'settings'].includes(section)) ? 'is-active' : ''} onClick={() => go(item.key)}><Icon name={item.icon} size={22} /><span>{item.label}</span>{item.key === 'requests' && Number(summary?.pendingRequests) > 0 && <b>{summary.pendingRequests}</b>}</button>)}</nav>}
    {sheet?.type === 'actions' && selectedRow && <RecordMenu row={selectedRow} resource={sheet.resource} onClose={() => setSheet(null)} onView={(row) => handleRowView(row, sheet.resource)} onEdit={(row) => { if (sheet.resource === 'trips') { setSheet(null); setError('Trip reassignment/editing is not available in the supplied admin API contract yet.'); } else openForm(sheet.resource, 'edit', row); }} onDelete={(row) => handleDelete(sheet.resource, row)} onToggleStatus={toggleDriver} onApprove={handleMemberApprove} onReject={handleMemberReject} onCancelTrip={cancelTrip} />}
    {renderOptionSheet()}{renderPatternStopPicker()}{renderPatternStopsSheet()}{renderTripFilterSheet()}{renderQuickActions()}{renderApprovalRoleSheet()}{detail && renderDetail()}
    {notice && <div className="adm-toast"><span>✓</span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}
    {error && section !== 'home' && !['buses', 'drivers', 'routes', 'stops', 'patterns', 'members', 'requests'].includes(section) && <div className="adm-floating-error"><Icon name="alert" size={16} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
  </div>;
}
