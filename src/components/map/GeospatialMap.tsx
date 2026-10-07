// SCIP - Interactive Geospatial Intelligence Map with Real Leaflet Engine
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Report, Incident } from '../../types/scip';
import {
  Layers,
  Eye,
  Navigation,
  Search,
  Filter,
  Maximize2,
  AlertTriangle,
  FileText,
  MapPin,
  Flame,
  CheckCircle2
} from 'lucide-react';

interface GeospatialMapProps {
  reports: Report[];
  incidents: Incident[];
  onSelectReport?: (report: Report) => void;
  onSelectIncident?: (incident: Incident) => void;
  selectedReportId?: string;
  selectedIncidentId?: string;
}

export const GeospatialMap: React.FC<GeospatialMapProps> = ({
  reports,
  incidents,
  onSelectReport,
  onSelectIncident,
  selectedReportId,
  selectedIncidentId
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circlesLayerRef = useRef<L.LayerGroup | null>(null);

  // Filter States
  const [showReports, setShowReports] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showClusters, setShowClusters] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<{ type: 'report' | 'incident'; data: any } | null>(null);

  // Category Colors
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Water & Drainage': return '#2563EB'; // Blue
      case 'Roads & Infrastructure':
      case 'Roads & Traffic': return '#D97706'; // Amber
      case 'Power & Lighting': return '#DC2626'; // Crimson
      case 'Sanitation & Waste':
      case 'Public Sanitation': return '#059669'; // Emerald
      case 'Public Safety': return '#7C3AED'; // Purple
      default: return '#475569';
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default to Metro Municipal District coordinates (28.625, 77.218)
      const map = L.map(mapContainerRef.current, {
        center: [28.625, 77.218],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      // Add zoom control top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Add high-clarity CartoDB Voyager / Positron tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      // Attribution control bottom-right
      L.control.attribution({ position: 'bottomright', prefix: 'SCIP GIS · Leaflet' }).addTo(map);

      mapInstanceRef.current = map;
      circlesLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers and Clusters
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current || !circlesLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    circlesLayerRef.current.clearLayers();

    const bounds = L.latLngBounds([]);

    // Filter Reports
    const filteredReports = reports.filter(r => {
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
      if (urgencyFilter !== 'ALL' && r.urgency !== urgencyFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(query);
        const matchLoc = r.locationName.toLowerCase().includes(query);
        if (!matchTitle && !matchLoc) return false;
      }
      return true;
    });

    // Filter Incidents
    const filteredIncidents = incidents.filter(i => {
      if (categoryFilter !== 'ALL' && i.category !== categoryFilter) return false;
      if (urgencyFilter !== 'ALL' && i.priority !== urgencyFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = i.title.toLowerCase().includes(query);
        const matchLoc = (i.locationName || '').toLowerCase().includes(query);
        if (!matchTitle && !matchLoc) return false;
      }
      return true;
    });

    // 1. Render Incident Cluster Radii & Hotspots (Background Circles)
    if (showClusters || showHotspots) {
      filteredIncidents.forEach(inc => {
        const lat = inc.latitude;
        const lng = inc.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

        bounds.extend([lat, lng]);

        const radiusMeters = inc.radiusMeters || Math.min(1200, Math.max(350, (inc.reportIds?.length || 3) * 120));
        const color = inc.priority === 'P1_CRITICAL' ? '#DC2626' : inc.priority === 'P2_HIGH' ? '#EA580C' : '#2563EB';

        // Hotspot Glow Circle
        if (showHotspots) {
          L.circle([lat, lng], {
            radius: radiusMeters * 1.3,
            color: 'transparent',
            fillColor: color,
            fillOpacity: 0.12,
            interactive: false
          }).addTo(circlesLayerRef.current!);
        }

        // Spatio-Temporal Cluster Perimeter
        if (showClusters) {
          L.circle([lat, lng], {
            radius: radiusMeters,
            color: color,
            weight: 1.5,
            dashArray: '4, 4',
            fillColor: color,
            fillOpacity: 0.08,
            interactive: false
          }).addTo(circlesLayerRef.current!);
        }
      });
    }

    // 2. Render Incident Markers
    if (showIncidents) {
      filteredIncidents.forEach(inc => {
        const lat = inc.latitude;
        const lng = inc.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

        bounds.extend([lat, lng]);

        const isSelected = selectedIncidentId === inc.id;
        const color = inc.priority === 'P1_CRITICAL' ? '#DC2626' : inc.priority === 'P2_HIGH' ? '#EA580C' : '#2563EB';
        const repCount = inc.reportIds?.length || 1;

        const incidentHtml = `
          <div class="relative group cursor-pointer">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center shadow-md font-bold text-xs text-white border-2 border-white transition-transform ${isSelected ? 'scale-125 ring-3 ring-red-400' : 'hover:scale-110'}" style="background-color: ${color};">
              <span class="text-[11px]">⚡</span>
            </div>
            <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center border border-white">
              ${repCount}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: incidentHtml,
          className: 'scip-incident-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18]
        });

        const marker = L.marker([lat, lng], { icon }).addTo(markersLayerRef.current!);

        // Popup Content
        const popupContent = `
          <div class="p-2 min-w-[220px] font-sans text-slate-800">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">${inc.id}</span>
              <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${inc.priority === 'P1_CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}">${inc.priority.replace('_', ' ')}</span>
            </div>
            <div class="font-bold text-xs text-slate-900 mb-1 leading-tight">${inc.title}</div>
            <div class="text-[11px] text-slate-500 mb-1.5">📍 ${inc.locationName}</div>
            <div class="text-[11px] text-slate-600 mb-2">Category: <strong>${inc.category}</strong> · Reports: <strong>${repCount}</strong></div>
            <button id="btn-inc-${inc.id}" class="w-full text-center py-1 px-2 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors cursor-pointer">
              Investigate Incident Hypothesis
            </button>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 280 });

        marker.on('click', () => {
          setSelectedItem({ type: 'incident', data: inc });
          setTimeout(() => {
            const btn = document.getElementById(`btn-inc-${inc.id}`);
            if (btn && onSelectIncident) {
              btn.onclick = () => onSelectIncident(inc);
            }
          }, 50);
        });
      });
    }

    // 3. Render Individual Report Markers
    if (showReports) {
      filteredReports.forEach(rep => {
        const lat = rep.latitude;
        const lng = rep.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

        bounds.extend([lat, lng]);

        const isSelected = selectedReportId === rep.id;
        const color = getCategoryColor(rep.category);

        const reportHtml = `
          <div class="relative group cursor-pointer">
            <div class="w-6 h-6 rounded-full flex items-center justify-center shadow-xs text-white border-2 border-white transition-transform ${isSelected ? 'scale-125 ring-2 ring-emerald-500' : 'hover:scale-110'}" style="background-color: ${color};">
              <div class="w-2 h-2 rounded-full bg-white"></div>
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: reportHtml,
          className: 'scip-report-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -14]
        });

        const marker = L.marker([lat, lng], { icon }).addTo(markersLayerRef.current!);

        // Popup Content
        const popupContent = `
          <div class="p-2 min-w-[210px] font-sans text-slate-800">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">${rep.id}</span>
              <span class="text-[10px] font-semibold text-slate-500">${rep.status}</span>
            </div>
            <div class="font-bold text-xs text-slate-900 mb-1 leading-tight">${rep.title}</div>
            <div class="text-[11px] text-slate-500 mb-1">📍 ${rep.locationName}</div>
            <div class="text-[11px] text-slate-600 mb-2">Category: <strong>${rep.category}</strong> · Urgency: <strong>${rep.urgency}</strong></div>
            <button id="btn-rep-${rep.id}" class="w-full text-center py-1 px-2 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer">
              Inspect Report & AI Analysis
            </button>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 260 });

        marker.on('click', () => {
          setSelectedItem({ type: 'report', data: rep });
          setTimeout(() => {
            const btn = document.getElementById(`btn-rep-${rep.id}`);
            if (btn && onSelectReport) {
              btn.onclick = () => onSelectReport(rep);
            }
          }, 50);
        });
      });
    }

    // Adjust Map View if bounds are valid
    if (bounds.isValid() && filteredReports.length + filteredIncidents.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [
    reports,
    incidents,
    showReports,
    showIncidents,
    showClusters,
    showHotspots,
    categoryFilter,
    urgencyFilter,
    searchQuery,
    selectedReportId,
    selectedIncidentId
  ]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([28.625, 77.218], 13);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[600px] shadow-xs">
      {/* Top Map Control Bar */}
      <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-emerald-600" />
            Metro Municipal District GIS (Leaflet Engine)
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-mono text-[11px]">
            {reports.length} observations · {incidents.length} active incidents
          </span>
        </div>

        {/* Search & Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search address or title..."
              className="pl-8 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 w-44 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            <option value="Water & Drainage">Water & Drainage</option>
            <option value="Roads & Traffic">Roads & Traffic</option>
            <option value="Power & Lighting">Power & Lighting</option>
            <option value="Sanitation & Waste">Sanitation & Waste</option>
            <option value="Public Safety">Public Safety</option>
          </select>

          {/* Urgency Dropdown */}
          <select
            value={urgencyFilter}
            onChange={e => setUrgencyFilter(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-hidden"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Reset View Button */}
          <button
            onClick={handleResetView}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            title="Reset to Municipal Center"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Map Viewport & Overlay */}
      <div className="relative flex-1">
        {/* Leaflet Map Div Container */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Layer Controls Badge */}
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200/90 shadow-md text-xs space-y-2">
          <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Map Layers</span>
          </div>

          <div className="space-y-1.5 text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
              <input
                type="checkbox"
                checked={showReports}
                onChange={e => setShowReports(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                Reports ({reports.length})
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
              <input
                type="checkbox"
                checked={showIncidents}
                onChange={e => setShowIncidents(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-md bg-amber-600 inline-block" />
                Incidents ({incidents.length})
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
              <input
                type="checkbox"
                checked={showClusters}
                onChange={e => setShowClusters(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span>DBSCAN Clusters</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
              <input
                type="checkbox"
                checked={showHotspots}
                onChange={e => setShowHotspots(e.target.checked)}
                className="rounded text-rose-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Density Hotspots</span>
            </label>
          </div>
        </div>

        {/* Floating Legend Badge */}
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-xl border border-slate-200 shadow-md text-[11px] text-slate-600 flex items-center gap-4 hidden sm:flex">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span>Water / Drainage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
            <span>Roads / Traffic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span>Power / High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Sanitation</span>
          </div>
        </div>

        {/* Selected Item Floating Inspection Card */}
        {selectedItem && (
          <div className="absolute top-3 right-14 z-10 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 max-w-xs text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] text-slate-500 font-bold">{selectedItem.data.id}</span>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <h4 className="font-bold text-slate-900 leading-snug mb-1">{selectedItem.data.title}</h4>
            <div className="text-slate-500 text-[11px] mb-2">📍 {selectedItem.data.locationName || 'Municipal District'}</div>
            
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">
                {selectedItem.type === 'report' ? `Urgency: ${selectedItem.data.urgency}` : `Priority: ${selectedItem.data.priority}`}
              </span>
              <button
                onClick={() => {
                  if (selectedItem.type === 'report' && onSelectReport) {
                    onSelectReport(selectedItem.data);
                  } else if (selectedItem.type === 'incident' && onSelectIncident) {
                    onSelectIncident(selectedItem.data);
                  }
                }}
                className="px-2 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
              >
                Open Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
