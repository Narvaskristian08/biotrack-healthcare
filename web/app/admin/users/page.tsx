'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, CheckCircle2, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DashboardLayout from '@/components/dashboard-layout';
import { useDashboardRole } from '@/hooks/use-dashboard-role';
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
  adminScope: 'global' | 'municipal';
  adminCityMunicipality: string;
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

const DEFAULT_PROVIDER_STATUS = 'active';

const emptyForm: NewUserForm = {
  role: 'provider',
  email: '',
  password: '',
  status: DEFAULT_PROVIDER_STATUS,
  adminScope: 'global',
  adminCityMunicipality: '',
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

type ProviderCreationConfirmation = {
  email: string;
  barangayName: string;
  cityMunicipality: string;
  healthCenterName: string;
  status: string;
  notificationMessage: string;
};

function formatStatusLabel(value: string): string {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 'Pending';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getStatusBadgeClassName(status: string): string {
  switch (String(status ?? '').trim().toLowerCase()) {
    case 'active':
      return 'border-emerald-200 bg-emerald-100 text-emerald-800';
    case 'verified':
      return 'border-sky-200 bg-sky-100 text-sky-800';
    default:
      return 'border-amber-200 bg-amber-100 text-amber-800';
  }
}

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

function normalizeCityKey(value: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^(city|municipality)\s+of\s+/i, '')
    .replace(/\s+(city|municipality)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSameCity(left: string, right: string): boolean {
  const leftKey = normalizeCityKey(left);
  const rightKey = normalizeCityKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

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
const DEFAULT_GOOGLE_MAPS_SETUP_HINT =
  'Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, enable Maps JavaScript API and Places API, attach billing, and allow the active web origin as a referrer.';

function getGoogleMapsSetupHint(): string {
  const base = 'Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, enable Maps JavaScript API and Places API, attach billing';
  if (typeof window === 'undefined') {
    return DEFAULT_GOOGLE_MAPS_SETUP_HINT;
  }

  const origin = String(window.location.origin ?? '').trim();
  if (!origin) {
    return DEFAULT_GOOGLE_MAPS_SETUP_HINT;
  }

  return `${base}, and allow ${origin}/* as a referrer.`;
}

function buildMunicipalValidationFallbackMessage(scopeCity: string): string {
  const targetCity = String(scopeCity ?? '').trim() || 'the assigned city/municipality';
  return `Automatic city validation is unavailable. Manual coordinates are still allowed, but they must be within ${targetCity}. Check Google Maps configuration to restore automatic validation.`;
}

export default function AdminUsersPage() {
  const { sessionUser } = useDashboardRole();
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
  const [providerCreationConfirmation, setProviderCreationConfirmation] = useState<ProviderCreationConfirmation | null>(null);
  const [providerCreationDialogOpen, setProviderCreationDialogOpen] = useState(false);

  const adminScope = sessionUser?.adminScope ?? 'global';
  const adminCityMunicipality = sessionUser?.adminCityMunicipality ?? '';
  const isMunicipalAdmin = adminScope === 'municipal';
  const [googleMapsSetupHint, setGoogleMapsSetupHint] = useState(DEFAULT_GOOGLE_MAPS_SETUP_HINT);

  const mapCanvasRef = useRef<HTMLDivElement | null>(null);
  const mapSearchRef = useRef<HTMLInputElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const placeAutocompleteRef = useRef<any>(null);
  const clickListenerRef = useRef<any>(null);
  const dragListenerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const geocodeRequestRef = useRef(0);
  const lastValidCoordinatesRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (isMunicipalAdmin && form.role === 'admin') {
      setForm((prev) => ({ ...prev, role: 'provider' }));
    }
  }, [form.role, isMunicipalAdmin]);

  useEffect(() => {
    setGoogleMapsSetupHint(getGoogleMapsSetupHint());
  }, []);

  const reverseGeocodeCityMunicipality = (lat: number, lng: number) => {
    if (form.role !== 'provider') return;
    if (isMunicipalAdmin) return;
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

  const resetMapRuntime = (resetState = true) => {
    const googleObj = (window as any).google;

    if (clickListenerRef.current?.remove) clickListenerRef.current.remove();
    if (dragListenerRef.current?.remove) dragListenerRef.current.remove();

    if (googleObj?.maps?.event?.clearInstanceListeners) {
      if (placeAutocompleteRef.current) {
        googleObj.maps.event.clearInstanceListeners(placeAutocompleteRef.current);
      }
      if (markerRef.current) {
        googleObj.maps.event.clearInstanceListeners(markerRef.current);
      }
      if (mapInstanceRef.current) {
        googleObj.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
    }

    clickListenerRef.current = null;
    dragListenerRef.current = null;
    placeAutocompleteRef.current = null;
    markerRef.current = null;
    mapInstanceRef.current = null;
    geocoderRef.current = null;

    if (mapCanvasRef.current) {
      mapCanvasRef.current.innerHTML = '';
    }

    if (resetState) {
      setMapReady(false);
    }
  };

  const applyCoordinatesInternal = (lat: number, lng: number, pan = true, resolveCity = true, remember = true) => {
    setForm((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));

    if (mapInstanceRef.current && markerRef.current && pan) {
      const next = { lat, lng };
      markerRef.current.setPosition(next);
      if (typeof markerRef.current.setVisible === 'function') {
        markerRef.current.setVisible(true);
      }
      mapInstanceRef.current.panTo(next);
      mapInstanceRef.current.setZoom(15);
    }

    if (mapInstanceRef.current && markerRef.current && !pan) {
      markerRef.current.setPosition({ lat, lng });
      if (typeof markerRef.current.setVisible === 'function') {
        markerRef.current.setVisible(true);
      }
    }

    if (remember) {
      lastValidCoordinatesRef.current = { lat, lng };
    }

    if (resolveCity) {
      reverseGeocodeCityMunicipality(lat, lng);
    }
  };

  const validateMunicipalCoordinates = (lat: number, lng: number, pan = true) => {
    // Always update the map UI immediately so the user sees feedback (even if the city check fails).
    applyCoordinatesInternal(lat, lng, pan, false, false);

    const scopeCity = String(adminCityMunicipality || '').trim();
    if (!scopeCity) {
      setMapError('Municipal scope is missing a city/municipality. Contact a global admin to correct the account.');
      setMapNotice('');
      return;
    }

    const googleObj = (window as any).google;
    if (!googleObj?.maps?.Geocoder) {
      setMapError(buildMunicipalValidationFallbackMessage(scopeCity));
      setMapNotice('');
      lastValidCoordinatesRef.current = { lat, lng };
      return;
    }

    if (!geocoderRef.current) {
      geocoderRef.current = new googleObj.maps.Geocoder();
    }

    setMapError('');
    setMapNotice(`Validating city / municipality for ${scopeCity}...`);

    const requestId = ++geocodeRequestRef.current;
    geocoderRef.current.geocode({ location: { lat, lng } }, (results: any, status: string) => {
      if (requestId !== geocodeRequestRef.current) return;
      if (status !== 'OK' || !Array.isArray(results)) {
        setMapError(`Unable to verify the city/municipality for this location. Please choose a point within ${scopeCity}.`);
        setMapNotice('');
        return;
      }
      const city = extractCityMunicipality(results);
      if (!city) {
        setMapError(`City / Municipality could not be detected. Please choose a point within ${scopeCity}.`);
        setMapNotice('');
        return;
      }
      if (!isSameCity(city, scopeCity)) {
        setMapError(`Selected location is in ${city}. Municipal admins can only set locations in ${scopeCity}.`);
        setMapNotice('');
        return;
      }

      setMapError('');
      setMapNotice(`City / Municipality validated: ${city}.`);
      lastValidCoordinatesRef.current = { lat, lng };
    });
  };

  const applyCoordinates = (lat: number, lng: number, pan = true, resolveCity = true) => {
    if (isMunicipalAdmin) {
      validateMunicipalCoordinates(lat, lng, pan);
      return;
    }
    applyCoordinatesInternal(lat, lng, pan, resolveCity);
  };

  const verifyMunicipalCoordinates = async (lat: number, lng: number): Promise<boolean> => {
    const scopeCity = String(adminCityMunicipality || '').trim();
    if (!scopeCity) {
      setError('Municipal scope is missing a city/municipality. Contact a global admin to correct the account.');
      return false;
    }
    const googleObj = (window as any).google;
    if (!googleObj?.maps?.Geocoder) {
      setMapError(buildMunicipalValidationFallbackMessage(scopeCity));
      setMapNotice('');
      return true;
    }
    if (!geocoderRef.current) {
      geocoderRef.current = new googleObj.maps.Geocoder();
    }

    const requestId = ++geocodeRequestRef.current;
    return new Promise((resolve) => {
      geocoderRef.current.geocode({ location: { lat, lng } }, (results: any, status: string) => {
        if (requestId !== geocodeRequestRef.current) {
          resolve(false);
          return;
        }
        if (status !== 'OK' || !Array.isArray(results)) {
          setError(`Unable to verify the city/municipality for this location. Please choose a point within ${scopeCity}.`);
          resolve(false);
          return;
        }
        const city = extractCityMunicipality(results);
        if (!city) {
          setError(`City / Municipality could not be detected. Please choose a point within ${scopeCity}.`);
          resolve(false);
          return;
        }
        if (!isSameCity(city, scopeCity)) {
          setError(`Selected location is in ${city}. Municipal admins can only set locations in ${scopeCity}.`);
          resolve(false);
          return;
        }
        lastValidCoordinatesRef.current = { lat, lng };
        resolve(true);
      });
    });
  };

  const initGoogleMap = () => {
    const googleObj = (window as any).google;
    if (!googleObj?.maps || !mapCanvasRef.current) {
      setMapReady(false);
      setMapError(`Google Maps loaded incorrectly. ${googleMapsSetupHint}`);
      setMapNotice('');
      return;
    }
    if (mapInstanceRef.current) return;

    const startLat = Number(form.latitude);
    const startLng = Number(form.longitude);
    const hasStartCoordinates = isValidCoordinate(startLat, startLng);
    const preferredMunicipalCoordinates =
      isMunicipalAdmin && lastValidCoordinatesRef.current && isValidCoordinate(lastValidCoordinatesRef.current.lat, lastValidCoordinatesRef.current.lng)
        ? lastValidCoordinatesRef.current
        : null;
    const center = preferredMunicipalCoordinates
      ? preferredMunicipalCoordinates
      : !isMunicipalAdmin && hasStartCoordinates
        ? { lat: startLat, lng: startLng }
        : PHILIPPINES_CENTER;

    const map = new googleObj.maps.Map(mapCanvasRef.current, {
      center,
      zoom: preferredMunicipalCoordinates || (!isMunicipalAdmin && hasStartCoordinates) ? 15 : 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const marker = new googleObj.maps.Marker({
      map,
      position: center,
      draggable: true,
      title: 'Barangay/Clinic Location',
      visible: Boolean(preferredMunicipalCoordinates || (!isMunicipalAdmin && hasStartCoordinates)),
    });

    // In some layouts the map can render before the container size is finalized.
    // Triggering a resize + recenter helps prevent a blank/partial map view.
    if (googleObj?.maps?.event?.trigger) {
      requestAnimationFrame(() => {
        try {
          googleObj.maps.event.trigger(map, 'resize');
          map.setCenter(center);
        } catch {
          // ignore resize errors
        }
      });
    }

    if (preferredMunicipalCoordinates || (!isMunicipalAdmin && hasStartCoordinates)) {
      lastValidCoordinatesRef.current = preferredMunicipalCoordinates ?? { lat: startLat, lng: startLng };
    }

    if (isMunicipalAdmin && adminCityMunicipality.trim() && !preferredMunicipalCoordinates) {
      if (!geocoderRef.current) {
        geocoderRef.current = new googleObj.maps.Geocoder();
      }
      const requestId = ++geocodeRequestRef.current;
      geocoderRef.current.geocode({ address: adminCityMunicipality.trim(), region: 'PH' }, (results: any, status: string) => {
        if (requestId !== geocodeRequestRef.current) return;
        if (status !== 'OK' || !Array.isArray(results) || !results[0]?.geometry?.location) return;
        const loc = results[0].geometry.location;
        const resolvedLat = Number(loc.lat?.());
        const resolvedLng = Number(loc.lng?.());
        if (!isValidCoordinate(resolvedLat, resolvedLng)) return;
        const resolved = { lat: resolvedLat, lng: resolvedLng };
        map.setCenter(resolved);
        map.setZoom(12);
        marker.setPosition(resolved);
        if (typeof marker.setVisible === 'function') {
          marker.setVisible(false);
        }
        setMapError('');
        setMapNotice(`Map centered on ${adminCityMunicipality}. Click the map to set the facility location.`);
      });
    }

    clickListenerRef.current = map.addListener('click', (event: any) => {
      if (!event?.latLng) return;
      const lat = Number(event.latLng.lat());
      const lng = Number(event.latLng.lng());
      applyCoordinates(lat, lng, true);
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
        if (isMunicipalAdmin && cityFromPlace && !isSameCity(cityFromPlace, adminCityMunicipality)) {
          setMapError(`Selected location is in ${cityFromPlace}. Municipal admins can only set locations in ${adminCityMunicipality}.`);
          setMapNotice('');
          return;
        }
        if (cityFromPlace && !isMunicipalAdmin) {
          setForm((prev) => ({ ...prev, cityMunicipality: cityFromPlace }));
          setMapNotice(`City / Municipality set to ${cityFromPlace}.`);
        }
        applyCoordinates(Number(lat), Number(lng), true, !cityFromPlace || isMunicipalAdmin);
      });

      placeAutocompleteRef.current = autocomplete;
    }

    mapInstanceRef.current = map;
    markerRef.current = marker;
    setMapReady(true);
    setMapError('');
    setMapNotice('');
  };

  const reloadGoogleMap = () => {
    if (form.role !== 'provider') return;
    if (!GOOGLE_MAPS_API_KEY) {
      setMapReady(false);
      setMapError(`Google Maps API key is missing. ${googleMapsSetupHint}`);
      setMapNotice('');
      return;
    }

    setMapError('');
    setMapNotice('Reloading Google Maps...');
    resetMapRuntime();

    const existingScript = document.getElementById('google-maps-sdk');
    if (existingScript && (window as any).google?.maps) {
      requestAnimationFrame(() => initGoogleMap());
      return;
    }

    if (existingScript) {
      existingScript.remove();
    }

    try {
      delete (window as any).google;
    } catch {
      (window as any).google = undefined;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-sdk';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places`;
    script.onload = () => initGoogleMap();
    script.onerror = () => {
      setMapReady(false);
      setMapError(`Failed to load Google Maps script. ${googleMapsSetupHint}`);
      setMapNotice('');
    };
    document.head.appendChild(script);
  };

  useEffect(() => {
    if (form.role !== 'provider') return;
    if (!GOOGLE_MAPS_API_KEY) {
      setMapReady(false);
      setMapError(`Google Maps API key is missing. ${googleMapsSetupHint}`);
      setMapNotice('');
      return;
    }

    const previousAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      setMapReady(false);
      setMapError(`Google Maps authentication failed. ${googleMapsSetupHint}`);
      setMapNotice('');
    };

    const existingScript = document.getElementById('google-maps-sdk');
    if (existingScript) {
      if ((window as any).google?.maps) {
        initGoogleMap();
      } else {
        setMapReady(false);
        setMapError(`Google Maps script is present but did not initialize correctly. ${googleMapsSetupHint}`);
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
      setMapError(`Failed to load Google Maps script. ${googleMapsSetupHint}`);
      setMapNotice('');
    };
    document.head.appendChild(script);
    return () => {
      (window as any).gm_authFailure = previousAuthFailure;
    };
  }, [form.role, googleMapsSetupHint]);

  useEffect(() => {
    if (!mapReady || !markerRef.current || !mapInstanceRef.current) return;
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!isValidCoordinate(lat, lng)) return;
    const next = { lat, lng };
    markerRef.current.setPosition(next);
    if (typeof markerRef.current.setVisible === 'function') {
      markerRef.current.setVisible(true);
    }
    mapInstanceRef.current.panTo(next);
  }, [form.latitude, form.longitude, mapReady]);

  useEffect(() => {
    return () => {
      resetMapRuntime(false);
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
    const providerCityMunicipality = isMunicipalAdmin ? adminCityMunicipality.trim() : form.cityMunicipality.trim();
    const municipalScopeLabel = adminCityMunicipality ? ` (${adminCityMunicipality})` : '';

    if (submittingRole === 'admin' && isMunicipalAdmin) {
      setError('Municipal admins cannot create other admin accounts.');
      return;
    }
    if (submittingRole === 'admin' && form.adminScope === 'municipal' && !form.adminCityMunicipality.trim()) {
      setError('City / Municipality is required for municipal admin accounts.');
      return;
    }
    if (submittingRole === 'provider' && isMunicipalAdmin && !providerCityMunicipality) {
      setError(`Municipal admin scope is missing a city/municipality${municipalScopeLabel}.`);
      return;
    }
    if (submittingRole === 'provider' && isMunicipalAdmin) {
      const lat = Number(form.latitude);
      const lng = Number(form.longitude);
      if (!isValidCoordinate(lat, lng)) {
        setError(`Please provide a valid location within ${adminCityMunicipality || 'your assigned city/municipality'}.`);
        return;
      }
      const ok = await verifyMunicipalCoordinates(lat, lng);
      if (!ok) return;
    }

    const providerCreationSnapshot =
      form.role === 'provider'
        ? {
          email: form.email.trim(),
          barangayName: form.barangayName.trim(),
          cityMunicipality: providerCityMunicipality,
          healthCenterName: form.healthCenterName.trim(),
          status: form.status,
        }
        : null;
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
      payload.cityMunicipality = providerCityMunicipality;
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
    } else if (form.role === 'admin') {
      payload.adminScope = form.adminScope;
      if (form.adminScope === 'municipal') {
        payload.adminCityMunicipality = form.adminCityMunicipality.trim();
      }
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
        const notificationMessage = `Provider onboarding email sent${recipient}.`;
        setProviderCreationConfirmation({
          email: providerCreationSnapshot?.email ?? '',
          barangayName: providerCreationSnapshot?.barangayName ?? '',
          cityMunicipality: providerCreationSnapshot?.cityMunicipality ?? '',
          healthCenterName: providerCreationSnapshot?.healthCenterName ?? '',
          status: providerCreationSnapshot?.status ?? submittedStatus,
          notificationMessage: `${notificationMessage}${providerVisibilityNote}`.trim(),
        });
        setProviderCreationDialogOpen(true);
      } else {
        const detail = res.notification.message ? ` ${res.notification.message}` : '';
        setProviderCreationConfirmation({
          email: providerCreationSnapshot?.email ?? '',
          barangayName: providerCreationSnapshot?.barangayName ?? '',
          cityMunicipality: providerCreationSnapshot?.cityMunicipality ?? '',
          healthCenterName: providerCreationSnapshot?.healthCenterName ?? '',
          status: providerCreationSnapshot?.status ?? submittedStatus,
          notificationMessage: `Provider account created, but onboarding email was not delivered.${detail}${providerVisibilityNote}`.trim(),
        });
        setProviderCreationDialogOpen(true);
      }
      setMessage('');
    } else {
      if (submittingRole === 'provider') {
        const queuedMessage = String(res.notification?.message ?? '').trim();
        setProviderCreationConfirmation({
          email: providerCreationSnapshot?.email ?? '',
          barangayName: providerCreationSnapshot?.barangayName ?? '',
          cityMunicipality: providerCreationSnapshot?.cityMunicipality ?? '',
          healthCenterName: providerCreationSnapshot?.healthCenterName ?? '',
          status: providerCreationSnapshot?.status ?? submittedStatus,
          notificationMessage: `${queuedMessage || 'Provider account successfully created.'}${providerVisibilityNote}`.trim(),
        });
        setProviderCreationDialogOpen(true);
        setMessage('');
      } else {
        setMessage(`User created successfully.${providerVisibilityNote}`);
      }
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

  const providerLocationLabel = providerCreationConfirmation
    ? [providerCreationConfirmation.barangayName, providerCreationConfirmation.cityMunicipality].filter(Boolean).join(', ') || 'N/A'
    : 'N/A';
  const providerStatusLabel = formatStatusLabel(providerCreationConfirmation?.status ?? '');
  const providerStatusClassName = getStatusBadgeClassName(providerCreationConfirmation?.status ?? '');
  const providerAccessNote =
    String(providerCreationConfirmation?.status ?? '').trim().toLowerCase() === 'active'
      ? 'The account can sign in immediately and is already available in patient registration.'
      : 'Activate this account before provider login and patient registration become available.';
  const providerDescription = providerCreationConfirmation
    ? `${providerCreationConfirmation.barangayName || 'Barangay unit'} is now onboarded in BioTrack.`
    : 'The provider account was created successfully.';
  const accountTotals = users.reduce(
    (acc, user) => {
      acc.total += 1;
      if (user.role === 'provider') {
        acc.providers += 1;
        if (user.status === 'active') acc.activeProviders += 1;
        if (user.status === 'pending' || user.status === 'verified') acc.providersInSetup += 1;
      }
      if (user.role === 'patient') acc.patients += 1;
      if (user.role === 'admin') acc.admins += 1;
      return acc;
    },
    {
      total: 0,
      providers: 0,
      activeProviders: 0,
      providersInSetup: 0,
      patients: 0,
      admins: 0,
    }
  );
  const roleSetupSteps =
    form.role === 'provider'
      ? [
        '1. Choose the barangay account type and lifecycle status.',
        '2. Set the login credentials that will be sent to the provider.',
        '3. Fill in facility identity, location, and staffing details.',
        '4. Create the account, then verify whether it should already appear in patient registration.',
      ]
      : form.role === 'patient'
        ? [
          '1. Select the patient account type.',
          '2. Enter login credentials and the linked health center.',
          '3. Confirm the basic patient identity fields before creation.',
        ]
        : [
          '1. Select the admin account type.',
          '2. Enter secure login credentials.',
          '3. Create the account only for trusted operators who need system governance access.',
        ];
  const providerScopeCity = isMunicipalAdmin ? adminCityMunicipality.trim() : form.cityMunicipality.trim();
  const providerSetupLocation = [form.barangayName.trim(), providerScopeCity].filter(Boolean).join(', ') || 'Not set yet';
  const providerSetupStatus = formatStatusLabel(form.status);
  const providerWillAppearInRegistration = form.role === 'provider' && form.status === 'active';
  const accountScopeLabel =
    roleFilter || statusFilter || query
      ? `Filtered view: ${users.length} account${users.length === 1 ? '' : 's'}`
      : `All accounts: ${users.length}`;

  return (
    <DashboardLayout>
      <div className="space-y-4">
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

        <Dialog open={providerCreationDialogOpen} onOpenChange={setProviderCreationDialogOpen}>
          <DialogContent className="max-w-2xl overflow-hidden border-0 bg-white p-0 shadow-[0_36px_100px_rgba(15,23,42,0.22)]">
            <div className="overflow-hidden rounded-[28px]">
              <div className="relative border-b border-emerald-100 bg-[linear-gradient(135deg,#f0fdf4_0%,#ecfeff_52%,#ffffff_100%)] px-7 pb-7 pt-8 sm:px-8">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-300/30 blur-3xl" />
                <div className="absolute left-6 top-0 h-px w-24 bg-white/80" />
                <div className="relative flex flex-col gap-4 pr-10 sm:flex-row sm:items-start">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-[0_12px_30px_rgba(16,185,129,0.18)]">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-3">
                    <Badge className="rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 shadow-sm">
                      Provider Onboarding
                    </Badge>
                    <DialogHeader className="space-y-2">
                      <DialogTitle className="max-w-xl text-3xl font-semibold tracking-tight text-slate-900">
                        Healthcare provider account successfully created
                      </DialogTitle>
                      <DialogDescription className="max-w-xl text-[1rem] leading-7 text-slate-600">
                        {providerDescription}
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                </div>
              </div>

              <div className="space-y-6 px-7 py-7 sm:px-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Login Email</p>
                        <p className="mt-1 break-all text-base font-semibold text-slate-900">
                          {providerCreationConfirmation?.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Location</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{providerLocationLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Health Center</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">
                          {providerCreationConfirmation?.healthCenterName || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Account Status</p>
                        <Badge className={`mt-2 rounded-full border px-3 py-1 text-sm font-semibold ${providerStatusClassName}`}>
                          {providerStatusLabel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Notification Status</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {providerCreationConfirmation?.notificationMessage || 'Provider account successfully created.'}
                    </p>
                  </div>

                  <div
                    className={`rounded-2xl border p-5 ${String(providerCreationConfirmation?.status ?? '').trim().toLowerCase() === 'active'
                        ? 'border-emerald-200 bg-emerald-50/80'
                        : 'border-amber-200 bg-amber-50/80'
                      }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">What Happens Next</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{providerAccessNote}</p>
                  </div>
                </div>

                <DialogFooter className="mt-0 border-t border-slate-200 pt-5">
                  <p className="mr-auto text-xs text-slate-500">You can close this dialog and continue managing user onboarding.</p>
                  <Button
                    type="button"
                    className="min-w-28 rounded-xl bg-emerald-600 px-6 text-white shadow-[0_12px_28px_rgba(22,163,74,0.28)] hover:bg-emerald-700"
                    onClick={() => setProviderCreationDialogOpen(false)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">Admin-controlled onboarding for users and barangay units</p>
        </div>

        {isMunicipalAdmin ? (
          <Card className="border-sky-200 bg-sky-50/70">
            <CardContent className="pt-5 text-sm text-sky-800">
              You are signed in as a municipal admin. Actions are limited to {adminCityMunicipality || 'your assigned city/municipality'}.
            </CardContent>
          </Card>
        ) : null}

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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-slate-200">
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Total accounts</p>
              <p className="mt-2 text-3xl font-bold">{accountTotals.total}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Providers onboarded</p>
              <p className="mt-2 text-3xl font-bold">{accountTotals.providers}</p>
              <p className="mt-1 text-xs text-muted-foreground">{accountTotals.activeProviders} active and visible in registration</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Providers still in setup</p>
              <p className="mt-2 text-3xl font-bold">{accountTotals.providersInSetup}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Patients / Admins</p>
              <p className="mt-2 text-3xl font-bold">
                {accountTotals.patients} / {accountTotals.admins}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <div className="order-1 grid gap-4 lg:grid-cols-2">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Setup Guide</CardTitle>
                <CardDescription>Keep the creation flow consistent so administrators do not miss activation details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {roleSetupSteps.map((step) => (
                  <div key={step} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-700">
                    {step}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Current Draft</CardTitle>
                <CardDescription>Live summary of what will be created from the fields you entered.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Role</p>
                  <p className="mt-1 font-medium text-slate-900">{form.role === 'provider' ? 'Barangay Unit (Provider)' : form.role}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Login Email</p>
                  <p className="mt-1 break-all font-medium text-slate-900">{form.email.trim() || 'Not entered yet'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status On Creation</p>
                  <p className="mt-1 font-medium text-slate-900">{providerSetupStatus}</p>
                </div>
                {form.role === 'provider' ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Coverage Area</p>
                    <p className="mt-1 font-medium text-slate-900">{providerSetupLocation}</p>
                  </div>
                ) : null}
                {form.role === 'provider' ? (
                  <div
                    className={`md:col-span-2 xl:col-span-4 lg:col-span-2 rounded-xl border p-3 text-sm ${providerWillAppearInRegistration ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'
                      }`}
                  >
                    {providerWillAppearInRegistration
                      ? 'Patient registration will be able to select this provider immediately.'
                      : 'Patient registration will not show this provider until the account is set to active.'}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="order-2 border-slate-200 shadow-sm">
            <CardHeader className="space-y-3 border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Account Setup Flow</Badge>
                <Badge className="border-slate-200 bg-slate-100 text-slate-700">{form.role === 'provider' ? 'Healthcare account' : form.role}</Badge>
              </div>
              <div>
                <CardTitle>Create Account / Barangay Unit</CardTitle>
                <CardDescription>
                  {form.role === 'provider'
                    ? 'Follow the setup flow in order so the healthcare account is complete before activation.'
                    : 'Fill in the required fields for the selected role, then create the account.'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 1</p>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={form.role}
                    onChange={(e) => {
                      const nextRole = e.target.value as 'patient' | 'provider' | 'admin';
                      setForm((prev) => ({
                        ...prev,
                        role: nextRole,
                        status: nextRole === 'provider' ? DEFAULT_PROVIDER_STATUS : 'active',
                        adminScope: nextRole === 'admin' ? prev.adminScope : 'global',
                        adminCityMunicipality: nextRole === 'admin' ? prev.adminCityMunicipality : '',
                        cityMunicipality:
                          nextRole === 'provider' && isMunicipalAdmin ? adminCityMunicipality : prev.cityMunicipality,
                      }));
                    }}
                  >
                    <option value="patient">Patient</option>
                    <option value="provider">Barangay Unit (Provider)</option>
                    <option value="admin" disabled={isMunicipalAdmin}>
                      Admin
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 2</p>
                  <Input placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Lifecycle</p>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
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
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Secure Access</p>
                <Input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {form.role === 'provider'
                    ? 'Provider onboarding email will be sent after creation. Active providers can sign in immediately and appear in patient registration.'
                    : 'Use a strong password because this account becomes active immediately unless you choose disabled.'}
                </p>
              </div>

              {form.role === 'provider' ? (
                <>
                  <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 3</p>
                      <h3 className="mt-1 font-semibold text-slate-900">Facility Identity</h3>
                      <p className="text-sm text-muted-foreground">Enter the barangay and health-center details exactly as they should appear to staff and patients.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input placeholder="Barangay Name" value={form.barangayName} onChange={(e) => setForm((prev) => ({ ...prev, barangayName: e.target.value }))} />
                      <Input
                        placeholder="City / Municipality"
                        value={isMunicipalAdmin ? adminCityMunicipality : form.cityMunicipality}
                        onChange={(e) => setForm((prev) => ({ ...prev, cityMunicipality: e.target.value }))}
                        disabled={isMunicipalAdmin}
                      />
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
                    {isMunicipalAdmin ? (
                      <p className="text-xs text-muted-foreground">
                        Your admin scope is locked to {adminCityMunicipality || 'the assigned city/municipality'}.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 4</p>
                      <h3 className="mt-1 font-semibold text-slate-900">Location And Coverage</h3>
                      <p className="text-sm text-muted-foreground">Pin the official location so admins know exactly which healthcare unit is being activated.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))} />
                      <Input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))} />
                    </div>
                    <div className="space-y-2 rounded-xl border border-border bg-slate-50/70 p-3">
                      <p className="text-sm font-medium">Google Maps Picker</p>
                      <p className="text-xs text-muted-foreground">
                        Click the map or search a place to auto-fill latitude/longitude. If Google Maps is unavailable, you can still enter coordinates manually. Valid range: latitude -90..90, longitude -180..180.
                      </p>
                      <Input ref={mapSearchRef} placeholder="Search in map (e.g., Longos Barangay, San Fabian)" />
                      <div className="relative h-52 w-full overflow-hidden rounded-md border border-border bg-muted">
                        <div ref={mapCanvasRef} className="absolute inset-0" />
                        {!mapReady ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted/90 p-4 text-center">
                            <div className="max-w-lg space-y-2">
                              <p className="text-sm font-medium text-foreground">Map preview unavailable</p>
                              <p className="text-xs leading-5 text-muted-foreground">
                                {mapError || `Google Maps has not been initialized yet. ${googleMapsSetupHint}`}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={reloadGoogleMap}>
                          Reload Map
                        </Button>
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
                      <div className="grid gap-2 sm:grid-cols-4">
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
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 5</p>
                      <h3 className="mt-1 font-semibold text-slate-900">Staffing And Display</h3>
                      <p className="text-sm text-muted-foreground">Optional fields help admins recognize the healthcare account after creation.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Assigned Healthcare Providers (comma separated)"
                        value={form.assignedProvidersCsv}
                        onChange={(e) => setForm((prev) => ({ ...prev, assignedProvidersCsv: e.target.value }))}
                      />
                      <Input placeholder="Display Name (optional)" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <Input placeholder="Holder Name (optional)" value={form.holderName} onChange={(e) => setForm((prev) => ({ ...prev, holderName: e.target.value }))} />
                  </div>
                </>
              ) : null}

              {form.role === 'patient' ? (
                <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Patient Details</p>
                    <h3 className="mt-1 font-semibold text-slate-900">Linked Patient Identity</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
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
                </div>
              ) : null}

              {form.role === 'admin' ? (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Admin Scope</p>
                    <p className="mt-2 text-sm">
                      Admin accounts inherit governance access. Choose whether the admin is global or restricted to a single city/municipality.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      className="h-10 w-full rounded-md border border-amber-200 bg-white px-3 py-1 text-sm text-amber-900"
                      value={form.adminScope}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          adminScope: e.target.value as 'global' | 'municipal',
                          adminCityMunicipality: e.target.value === 'municipal' ? prev.adminCityMunicipality : '',
                        }))
                      }
                      disabled={isMunicipalAdmin}
                    >
                      <option value="global">Global Admin</option>
                      <option value="municipal">Municipal Admin</option>
                    </select>
                    {form.adminScope === 'municipal' ? (
                      <Input
                        placeholder="City / Municipality"
                        value={form.adminCityMunicipality}
                        onChange={(e) => setForm((prev) => ({ ...prev, adminCityMunicipality: e.target.value }))}
                      />
                    ) : null}
                  </div>
                  <p className="text-xs text-amber-800/80">
                    Municipal admins can manage only their jurisdiction and cannot change global RBAC or backup settings.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {form.role === 'provider'
                    ? providerWillAppearInRegistration
                      ? 'This provider will appear in patient registration immediately after creation.'
                      : 'This provider will be created, but will not appear in patient registration until status becomes active.'
                    : 'Review the required fields above, then create the account.'}
                </p>
                <Button onClick={submitCreate} disabled={saving} className="min-w-32">
                  {saving ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>Existing Accounts</CardTitle>
                <CardDescription>{accountScopeLabel}. Manage lifecycle states for barangay units and account access for all users.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Providers: {accountTotals.providers}</span>
                <span>Patients: {accountTotals.patients}</span>
                <span>Admins: {accountTotals.admins}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
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
                className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm"
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
                className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm"
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
              <div className="space-y-3">
                {users.map((user) => {
                  const meta = user.meta as Record<string, unknown>;
                  const barangayName = String(meta.barangayName ?? '');
                  const cityMunicipality = String(meta.cityMunicipality ?? '');
                  const healthCenterName = String(meta.healthCenterName ?? '');
                  const userKey = `${user.role}-${user.id}`;
                  const isUpdating = updatingUserKey === userKey;
                  const updatedAtLabel = user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'Unknown';

                  return (
                    <Card key={userKey} className="border-slate-200">
                      <CardContent className="space-y-4 pt-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">{user.displayName}</p>
                              <Badge variant="outline">{user.role}</Badge>
                              <Badge className={getStatusBadgeClassName(user.status)}>{formatStatusLabel(user.status)}</Badge>
                              {user.role === 'provider' ? <Badge variant="outline">barangay lifecycle</Badge> : null}
                            </div>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {user.role === 'provider' ? (
                              <p className="text-sm text-slate-700">
                                {[barangayName, cityMunicipality, healthCenterName].filter(Boolean).join(' • ') || 'Location details unavailable'}
                              </p>
                            ) : null}
                            {user.role === 'admin' ? (
                              <p className="text-sm text-slate-700">
                                Scope: {String(meta.adminScope ?? 'global')}
                                {meta.cityMunicipality ? ` • ${String(meta.cityMunicipality)}` : ''}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">Last updated: {updatedAtLabel}</p>
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
