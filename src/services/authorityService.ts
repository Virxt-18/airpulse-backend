import { Authority } from '../types';

/**
 * Routing table for authority escalation. Matching is substring-based so a
 * hotspot like "Ranchi metro cluster" or "Patna East" routes correctly.
 */
const AUTHORITIES: Authority[] = [
  { zone: 'Delhi', body: 'CPCB / CAQM', officer: 'CAQM Nodal Officer', channel: 'caqm-north@cpcb.gov.in' },
  { zone: 'Bengaluru', body: 'Karnataka State Pollution Control Board', officer: 'KSPCB Member Secretary', channel: 'member-secretary@kspcb.karnataka.gov.in' },
  { zone: 'Mumbai', body: 'Maharashtra Pollution Control Board', officer: 'MPCB Regional Officer, Mumbai', channel: 'romumbai@mpcb.gov.in' },
  { zone: 'Chennai', body: 'Tamil Nadu Pollution Control Board', officer: 'TNPCB District Engineer', channel: 'tnpcb-chennai@tn.gov.in' },
  { zone: 'Hyderabad', body: 'Telangana State Pollution Control Board', officer: 'TSPCB Member Secretary', channel: 'secy@tspcb.telangana.gov.in' },
  { zone: 'Kolkata', body: 'West Bengal Pollution Control Board', officer: 'WBPCB Regional Officer', channel: 'wbpcb-kolkata@wbpcb.gov.in' },
  { zone: 'Ranchi', body: 'Jharkhand State Pollution Control Board', officer: 'JSPCB Regional Officer, Ranchi', channel: 'ro-ranchi@jspcb.in' },
  { zone: 'Patna', body: 'Bihar State Pollution Control Board', officer: 'BSPCB Regional Officer, Patna', channel: 'bspcb-patna@state.bihar.gov.in' },
  { zone: 'Pune', body: 'Maharashtra Pollution Control Board', officer: 'MPCB Regional Officer, Pune', channel: 'ropune@mpcb.gov.in' },
  { zone: 'Nagpur', body: 'Maharashtra Pollution Control Board', officer: 'MPCB Regional Officer, Nagpur', channel: 'ronagpur@mpcb.gov.in' },
  { zone: 'Jaipur', body: 'Rajasthan State Pollution Control Board', officer: 'RSPPCB Regional Officer', channel: 'ro.jaipur@rspcb.rajasthan.gov.in' },
  { zone: 'Guwahati', body: 'Assam State Pollution Control Board', officer: 'ASPCB District Officer', channel: 'aspb.dibrugarh@assam.gov.in' }
];

const CENTRAL_FALLBACK: Authority = {
  zone: 'National',
  body: 'Central Pollution Control Board - Air Quality Cell',
  officer: 'Joint Director (AQM)',
  channel: 'aqm-cell@cpcb.nic.in'
};

export function routeAuthority(location: string): Authority {
  const query = location.toLowerCase();
  const match = AUTHORITIES.find((authority) => query.includes(authority.zone.toLowerCase()));
  return match ?? CENTRAL_FALLBACK;
}

export function listAuthorities(): Authority[] {
  return AUTHORITIES;
}