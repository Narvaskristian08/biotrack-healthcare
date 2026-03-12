'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DashboardLayout from '@/components/dashboard-layout';
import {
  createAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  updateProviderCredentialStatus,
  type AdminUser,
} from '@/lib/admin-role';

type NewUserForm = {
  role: 'patient' | 'provider' | 'admin';
  email: string;
  password: string;
  status: string;
  name: string;
  holderName: string;
  barangayName: string;
  cityMunicipality: string;
  healthCenterName: string;
  officialContactInfo: string;
  latitude: string;
  longitude: string;
  assignedProvidersCsv: string;
  healthCenterId: string;
  firstName: string;
  lastName: string;
  middleInitial: string;
};

const emptyForm: NewUserForm = {
  role: 'provider',
  email: '',
  password: '',
  status: 'pending',
  name: '',
  holderName: '',
  barangayName: '',
  cityMunicipality: '',
  healthCenterName: '',
  officialContactInfo: '',
  latitude: '',
  longitude: '',
  assignedProvidersCsv: '',
  healthCenterId: '',
  firstName: '',
  lastName: '',
  middleInitial: '',
};

type StatusChangeConfirmation = {
  userDisplayName: string;
  role: AdminUser['role'];
  previousStatus: string;
  nextStatus: string;
};

function parseAssignedProvidersCsv(value: string): Array<{ name: string }> {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function parseGoogleMapsCoordinates(raw: string): { lat: number; lng: number } | null {
  const input = raw.trim();
  if (!input) return null;

  // Supports links like .../@16.12345,120.12345,15z
  const atMatch = input.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (isValidCoordinate(lat, lng)) return { lat, lng };
  }

  // Supports links like ...!3d16.12345!4d120.12345
  const dMatch = input.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (dMatch) {
    const lat = Number(dMatch[1]);
    const lng = Number(dMatch[2]);
    if (isValidCoordinate(lat, lng)) return { lat, lng };
  }

  // Supports direct "lat,lng" paste
  const pairMatch = input.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (pairMatch) {
    const lat = Number(pairMatch[1]);
    const lng = Number(pairMatch[2]);
    if (isValidCoordinate(lat, lng)) return { lat, lng };
  }

  return null;
}

const CITY_COMPONENT_PRIORITY = [
  'locality',
  'administrative_area_level_3',
  'administrative_area_level_2',
  'postal_town',
  'sublocality_level_1',
  'neighborhood',
];

function extractCityMunicipalityFromComponents(
  components: Array<{ long_name?: string; types?: string[] }> = []
): string {
  if (!Array.isArray(components)) return '';
  for (const type of CITY_COMPONENT_PRIORITY) {
    const match = components.find((component) => Array.isArray(component?.types) && component.types.includes(type));
    if (match?.long_name) {
      const value = String(match.long_name).trim();
      if (value) return value;
    }
  }
  return '';
}

function extractCityMunicipality(
  results: Array<{ address_components?: Array<{ long_name?: string; types?: string[] }> }> = []
): string {
  if (!Array.isArray(results)) return '';
  for (const result of results) {
    const value = extractCityMunicipalityFromComponents(result?.address_components ?? []);
    if (value) return value;
  }
  return '';
}

const PHILIPPINES_CENTER = { lat: 14.5995, lng: 120.9842 };
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const GOOGLE_MAPS_SETUP_HINT =
  'Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, enable Maps JavaScript API and Places API, attach billing, and allow http://127.0.0.1:3001/* and http://localhost:3001/* as referrers.';

export default function AdminUsersPage() {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [form, setForm] = useState<NewUserForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [mapError, setMapError] = useState('');
  const [mapNotice, setMapNotice] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [mapsUrlInput, setMapsUrlInput] = useState('');
  const [updatingUserKey, setUpdatingUserKey] = useState<string | null>(null);
  const [statusChangeConfirmation, setStatusChangeConfirmation] = useState<StatusChangeConfirmation | null>(null);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);

  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const mapSearchRef = useRef<HTMLInputElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const placeAutocompleteRef = useRef<any>(null);
  const clickListenerRef = useRef<any>(null);
  const dragListenerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const geocodeRequestRef = useRef(0);

  const reverseGeocodeCityMunicipality = (lat: number, lng: number) => {
    if (form.role !== 'provider') return;
    const googleObj = (window as any).google;
    if (!googleObj?.maps?.Geocoder) return;
    if (!geocoderRef.current) {
      geocoderRef.current = new googleObj.maps.Geocoder();
    }

    const requestId = ++geocodeRequestRef.current;
    geocoderRef.current.geocode({ location: { lat, lng } }, (results: any, status: string) => {
      if (requestId !== geocodeRequestRef.current) return;
      if (status !== 'OK' || !Array.isArray(results)) {
        setMapNotice('');
        return;
      }
      const city = extractCityMunicipality(results);
      if (city) {
        setForm((prev) => ({ ...prev, cityMunicipality: city }));
        setMapNotice(`City / Municipality set to ${city}.`);
      } else {
        setMapNotice('City / Municipality not detected. You can type it manually.');
      }
    });
  };

  const applyCoordinates = (lat: number, lng: number, pan = true, resolveCity = true) => {
    setForm((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));

    if (mapInstanceRef.current && markerRef.current && pan) {
      const next = { lat, lng };
      markerRef.current.setPosition(next);
      mapInstanceRef.current.panTo(next);
      mapInstanceRef.current.setZoom(15);
    }

    if (resolveCity) {
      reverseGeocodeCityMunicipality(lat, lng);
    }
  };

  const initGoogleMap = () => {
    const googleObj = (window as any).google;
    if (!googleObj?.maps || !mapCanvasRef.current) {
      setMapReady(false);
      setMapError('Google Maps loaded incorrectly. Check API key, enabled APIs, billing, and HTTP referrer restrictions.');
      setMapNotice('');
      return;
    }
    if (mapInstanceRef.current) return;

    const startLat = Number(form.latitude);
    const startLng = Number(form.longitude);
    const center = isValidCoordinate(startLat, startLng) ? { lat: startLat, lng: startLng } : PHILIPPINES_CENTER;

    const map = new googleObj.maps.Map(mapCanvasRef.current, {
      center,
      zoom: isValidCoordinate(startLat, startLng) ? 15 : 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const marker = new googleObj.maps.Marker({
      map,
      position: center,
      draggable: true,
      title: 'Barangay/Clinic Location',
    });

    clickListenerRef.current = map.addListener('click', (event: any) => {
      if (!event?.latLng) return;
      const lat = Number(event.latLng.lat());
      const lng = Number(event.latLng.lng());
      applyCoordinates(lat, lng, false);
      marker.setPosition({ lat, lng });
      map.panTo({ lat, lng });
    });

    dragListenerRef.current = marker.addListener('dragend', (event: any) => {
      if (!event?.latLng) return;
      const lat = Number(event.latLng.lat());
      const lng = Number(event.latLng.lng());
      applyCoordinates(lat, lng, false);
    });

    if (mapSearchRef.current) {
      const autocomplete = new googleObj.maps.places.Autocomplete(mapSearchRef.current, {
        fields: ['geometry', 'formatted_address', 'name', 'address_components'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        const lat = place?.geometry?.location?.lat?.();
        const lng = place?.geometry?.location?.lng?.();
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setMapError('Selected place has no coordinates. Try another location.');
          return;
        }
        setMapError('');
        const cityFromPlace = extractCityMunicipalityFromComponents(place?.address_components ?? []);
        if (cityFromPlace) {
          setForm((prev) => ({ ...prev, cityMunicipality: cityFromPlace }));
          setMapNotice(`City / Municipality set to ${cityFromPlace}.`);
        }
        applyCoordinates(Number(lat), Number(lng), true, !cityFromPlace);
      });

      placeAutocompleteRef.current = autocomplete;
    }

    mapInstanceRef.current = map;
    markerRef.current = marker;
    setMapReady(true);
    setMapError('');
  };

  useEffect(() => {
    if (form.role !== 'provider') return;
    if (!GOOGLE_MAPS_API_KEY) {
      setMapReady(false);
      setMapError(`Google Maps API key is missing. ${GOOGLE_MAPS_SETUP_HINT}`);
      setMapNotice('');
      return;
    }

    const previousAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      setMapReady(false);
      setMapError(`Google Maps authentication failed. ${GOOGLE_MAPS_SETUP_HINT}`);
      setMapNotice('');
    };

    const existingScript = document.getElementById('google-maps-sdk');
    if (existingScript) {
      if ((window as any).google?.maps) {
        initGoogleMap();
      } else {
        setMapReady(false);
        setMapError(`Google Maps script is present but did not initialize correctly. ${GOOGLE_MAPS_SETUP_HINT}`);
        setMapNotice('');
      }
      return () => {
        (window as any).gm_authFailure = previousAuthFailure;
      };
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-sdk';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places`;
    script.onload = () => initGoogleMap();
    script.onerror = () => {
      setMapReady(false);
      setMapError(`Failed to load Google Maps script. ${GOOGLE_MAPS_SETUP_HINT}`);
      setMapNotice('');
    };
    document.head.appendChild(script);
    return () => {
      (window as any).gm_authFailure = previousAuthFailure;
    };
  }, [form.role]);

  useEffect(() => {
    if (!mapReady || !markerRef.current || !mapInstanceRef.current) return;
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!isValidCoordinate(lat, lng)) return;
    const next = { lat, lng };
    markerRef.current.setPosition(next);
    mapInstanceRef.current.panTo(next);
  }, [form.latitude, form.longitude, mapReady]);

  useEffect(() => {
    return () => {
      if (clickListenerRef.current?.remove) clickListenerRef.current.remove();
      if (dragListenerRef.current?.remove) dragListenerRef.current.remove();
    };
  }, []);

  const loadUsers = async (q = query, role = roleFilter, status = statusFilter) => {
    const res = await fetchAdminUsers({
      q,
      role: (role as 'patient' | 'provider' | 'admin' | '') || '',
      status,
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    setUsers(res.users ?? []);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetchAdminUsers();
      if (!active) return;
      if (res.error) {
        setError(res.error);
      } else {
        setUsers(res.users ?? []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const submitCreate = async () => {
    const submittingRole = form.role;
    const submittedStatus = form.status;
    setSaving(true);
    setError('');
    setMessage('');

    const payload: Record<string, unknown> = {
      role: form.role,
      email: form.email.trim(),
      password: form.password,
      status: form.status,
    };

    if (form.role === 'provider') {
      payload.name = form.name.trim();
      payload.holderName = form.holderName.trim();
      payload.barangayName = form.barangayName.trim();
      payload.cityMunicipality = form.cityMunicipality.trim();
      payload.healthCenterName = form.healthCenterName.trim();
      payload.officialContactInfo = form.officialContactInfo.trim();
      payload.latitude = form.latitude.trim() === '' ? null : Number(form.latitude);
      payload.longitude = form.longitude.trim() === '' ? null : Number(form.longitude);
      payload.assignedHealthcareProviders = parseAssignedProvidersCsv(form.assignedProvidersCsv);
    } else if (form.role === 'patient') {
      payload.healthCenterId = form.healthCenterId.trim();
      payload.firstName = form.firstName.trim();
      payload.lastName = form.lastName.trim();
      payload.middleInitial = form.middleInitial.trim();
    }

    const res = await createAdminUser(payload);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }

    const providerVisibilityNote =
      submittingRole === 'provider' && submittedStatus !== 'active'
        ? ` Provider status is '${submittedStatus}'. It appears on patient registration only when status is 'active'.`
        : '';

    if (submittingRole === 'provider' && res.notification?.attempted) {
      if (res.notification.delivered) {
        const recipient = res.notification.recipientMasked ? ` to ${res.notification.recipientMasked}` : '';
        setMessage(`User created successfully. Provider onboarding email sent${recipient}.${providerVisibilityNote}`);
      } else {
        const detail = res.notification.message ? ` ${res.notification.message}` : '';
        setMessage(`User created successfully, but provider email notification was not delivered.${detail}${providerVisibilityNote}`);
      }
    } else {
      setMessage(`User created successfully.${providerVisibilityNote}`);
    }

    setForm(emptyForm);
    await loadUsers();
  };

  const toggleStatus = async (user: AdminUser) => {
    setError('');
    setMessage('');
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    const userKey = `${user.role}-${user.id}`;
    setUpdatingUserKey(userKey);
    const res = await updateAdminUser(user.role, user.id, { status: nextStatus });
    if (res.error) {
      setError(res.error);
      setUpdatingUserKey(null);
      return;
    }
    await loadUsers();
    setStatusChangeConfirmation({
      userDisplayName: user.displayName,
      role: user.role,
      previousStatus: user.status,
      nextStatus,
    });
    setStatusChangeDialogOpen(true);
    setUpdatingUserKey(null);
  };

  const setBarangayStatus = async (provider: AdminUser, status: 'pending' | 'verified' | 'active') => {
    setError('');
    setMessage('');
    const userKey = `${provider.role}-${provider.id}`;
    setUpdatingUserKey(userKey);
    const res = await updateProviderCredentialStatus(provider.id, status);
    if (res.error) {
      setError(res.error);
      setUpdatingUserKey(null);
      return;
    }
    await loadUsers();
    setStatusChangeConfirmation({
      userDisplayName: provider.displayName,
      role: provider.role,
      previousStatus: provider.status,
      nextStatus: status,
    });
    setStatusChangeDialogOpen(true);
    setUpdatingUserKey(null);
  };

  const extractCoordinatesFromMapsUrl = () => {
    const parsed = parseGoogleMapsCoordinates(mapsUrlInput);
    if (!parsed) {
      setMapError('Could not parse coordinates from the provided Google Maps URL/text.');
      return;
    }
    setMapError('');
    applyCoordinates(parsed.lat, parsed.lng);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapError('Geolocation is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapError('');
        applyCoordinates(position.coords.latitude, position.coords.longitude);
      },
      (geoError) => {
        setMapError(`Unable to fetch current location: ${geoError.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Dialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Status changed</DialogTitle>
              <DialogDescription>
                {statusChangeConfirmation
                  ? `${statusChangeConfirmation.userDisplayName} (${statusChangeConfirmation.role}) was updated from ${statusChangeConfirmation.previousStatus} to ${statusChangeConfirmation.nextStatus}.`
                  : 'The account status was updated successfully.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={() => setStatusChangeDialogOpen(false)}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">Admin-controlled onboarding for users and barangay units</p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {message ? (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="pt-6 text-sm text-green-700">{message}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Create Account / Barangay Unit</CardTitle>
            <CardDescription>Barangay onboarding must be created by Admin and assigned an official lifecycle status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={form.role}
                onChange={(e) => {
                  const nextRole = e.target.value as 'patient' | 'provider' | 'admin';
                  setForm((prev) => ({
                    ...prev,
                    role: nextRole,
                    status: nextRole === 'provider' ? 'pending' : 'active',
                  }));
                }}
              >
                <option value="patient">Patient</option>
                <option value="provider">Barangay Unit (Provider)</option>
                <option value="admin">Admin</option>
              </select>

              <Input placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />

              <Input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />

              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                {form.role === 'provider' ? (
                  <>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="active">Active</option>
                  </>
                ) : (
                  <>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </>
                )}
              </select>
            </div>
            {form.role === 'provider' ? (
              <p className="text-xs text-muted-foreground">Provider onboarding notification will be sent to this email after account creation.</p>
            ) : null}

            {form.role === 'provider' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Barangay Name" value={form.barangayName} onChange={(e) => setForm((prev) => ({ ...prev, barangayName: e.target.value }))} />
                  <Input
                    placeholder="City / Municipality"
                    value={form.cityMunicipality}
                    onChange={(e) => setForm((prev) => ({ ...prev, cityMunicipality: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Health Center Name"
                    value={form.healthCenterName}
                    onChange={(e) => setForm((prev) => ({ ...prev, healthCenterName: e.target.value }))}
                  />
                  <Input
                    placeholder="Official Contact Info"
                    value={form.officialContactInfo}
                    onChange={(e) => setForm((prev) => ({ ...prev, officialContactInfo: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))} />
                  <Input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))} />
                </div>
                <div className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-sm font-medium">Google Maps Picker</p>
                  <p className="text-xs text-muted-foreground">
                    Click the map or search a place to auto-fill latitude/longitude. Valid range: latitude -90..90, longitude -180..180.
                  </p>
                  <Input ref={mapSearchRef} placeholder="Search in map (e.g., Longos Barangay, San Fabian)" />
                  <div className="relative h-64 w-full overflow-hidden rounded-md border border-border bg-muted">
                    <div ref={mapCanvasRef} className="absolute inset-0" />
                    {!mapReady ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/90 p-4 text-center">
                        <div className="max-w-lg space-y-2">
                          <p className="text-sm font-medium text-foreground">Map preview unavailable</p>
                          <p className="text-xs leading-5 text-muted-foreground">
                            {mapError || `Google Maps has not been initialized yet. ${GOOGLE_MAPS_SETUP_HINT}`}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={useCurrentLocation}>
                      Use Current Location
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.open('https://www.google.com/maps', '_blank', 'noopener,noreferrer')}
                    >
                      Open Google Maps
                    </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-3">
                    <Input
                      placeholder="Paste Google Maps link or 'lat,lng' then click Extract"
                        value={mapsUrlInput}
                        onChange={(e) => setMapsUrlInput(e.target.value)}
                      />
                  </div>
                  <Button type="button" variant="outline" onClick={extractCoordinatesFromMapsUrl}>
                    Extract
                  </Button>
                </div>
                {mapError ? <p className="text-xs text-destructive">{mapError}</p> : null}
                {!mapError && mapNotice ? <p className="text-xs text-muted-foreground">{mapNotice}</p> : null}
                {!mapError && mapReady ? <p className="text-xs text-muted-foreground">Map picker is ready.</p> : null}
              </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Assigned Healthcare Providers (comma separated)"
                    value={form.assignedProvidersCsv}
                    onChange={(e) => setForm((prev) => ({ ...prev, assignedProvidersCsv: e.target.value }))}
                  />
                  <Input placeholder="Display Name (optional)" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <Input placeholder="Holder Name (optional)" value={form.holderName} onChange={(e) => setForm((prev) => ({ ...prev, holderName: e.target.value }))} />
              </div>
            ) : null}

            {form.role === 'patient' ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input
                  placeholder="Health Center ID"
                  value={form.healthCenterId}
                  onChange={(e) => setForm((prev) => ({ ...prev, healthCenterId: e.target.value }))}
                />
                <Input placeholder="First name" value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} />
                <Input placeholder="Last name" value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} />
                <Input
                  placeholder="Middle initial"
                  value={form.middleInitial}
                  onChange={(e) => setForm((prev) => ({ ...prev, middleInitial: e.target.value }))}
                />
              </div>
            ) : null}

            <Button onClick={submitCreate} disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Accounts</CardTitle>
            <CardDescription>Manage lifecycle states for barangay units and account access for all users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Search users by name/email..."
                value={query}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  loadUsers(val, roleFilter, statusFilter);
                }}
              />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm sm:w-48"
                value={roleFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setRoleFilter(val);
                  loadUsers(query, val, statusFilter);
                }}
              >
                <option value="">All roles</option>
                <option value="patient">Patient</option>
                <option value="provider">Provider</option>
                <option value="admin">Admin</option>
              </select>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm sm:w-48"
                value={statusFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setStatusFilter(val);
                  loadUsers(query, roleFilter, val);
                }}
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading users...</p>
            ) : (
              <div className="space-y-2">
                {users.map((user) => {
                  const meta = user.meta as Record<string, unknown>;
                  const barangayName = String(meta.barangayName ?? '');
                  const cityMunicipality = String(meta.cityMunicipality ?? '');
                  const healthCenterName = String(meta.healthCenterName ?? '');
                  const userKey = `${user.role}-${user.id}`;
                  const isUpdating = updatingUserKey === userKey;

                  return (
                    <Card key={userKey}>
                      <CardContent className="pt-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                          <div>
                            <p className="font-medium">{user.displayName}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {user.role === 'provider' ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                {barangayName || 'Barangay'} | {cityMunicipality || 'City/Municipality'} | {healthCenterName || 'Health Center'}
                              </p>
                            ) : null}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{user.role}</Badge>
                              <Badge variant={user.status === 'active' ? 'secondary' : 'destructive'}>
                                {user.status}
                              </Badge>
                              {user.role === 'provider' ? <Badge variant="outline">barangay lifecycle</Badge> : null}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {user.role === 'provider' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isUpdating || user.status === 'pending'}
                                  onClick={() => setBarangayStatus(user, 'pending')}
                                >
                                  Set Pending
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isUpdating || user.status === 'verified'}
                                  onClick={() => setBarangayStatus(user, 'verified')}
                                >
                                  Set Verified
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isUpdating || user.status === 'active'}
                                  onClick={() => setBarangayStatus(user, 'active')}
                                >
                                  Set Active
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => toggleStatus(user)}>
                                {isUpdating ? 'Updating...' : user.status === 'active' ? 'Deactivate' : 'Activate'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {users.length === 0 ? <p className="text-sm text-muted-foreground">No users found.</p> : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
