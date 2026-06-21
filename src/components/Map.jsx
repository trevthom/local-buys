/* MAP — OpenStreetMap (Leaflet) + SVG fallback + QR.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";
import { DEFAULT_LOCATION } from "@/config";
import { useTheme } from "@/theme/ThemeContext";
import { FONT_BODY } from "@/theme/theme";

const LEAFLET_JS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";

const LEAFLET_CSS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";


function useLeaflet() {
  const [status, setStatus] = useState(window.L ? "ready" : "loading");
  useEffect(() => {
    if (window.L) { setStatus("ready"); return; }
    let cancelled = false;
    if (!document.getElementById("leaflet-css")) {
      const css = document.createElement("link"); css.id = "leaflet-css"; css.rel = "stylesheet"; css.href = LEAFLET_CSS;
      document.head.appendChild(css);
    }
    let script = document.getElementById("leaflet-js");
    const onload = () => !cancelled && setStatus("ready");
    const onerror = () => !cancelled && setStatus("failed");
    if (!script) {
      script = document.createElement("script"); script.id = "leaflet-js"; script.src = LEAFLET_JS;
      script.onload = onload; script.onerror = onerror;
      document.body.appendChild(script);
    } else { script.addEventListener("load", onload); script.addEventListener("error", onerror); }
    const timer = setTimeout(() => { if (!cancelled && !window.L) setStatus("failed"); }, 6000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);
  return status;
}


function pinIcon(L, color) {
  return L.divIcon({
    className: "",
    html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:' + color +
          ';border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"><div style="width:8px;height:8px;background:white;border-radius:50%;position:absolute;top:7px;left:7px"></div></div>',
    iconSize: [26, 26], iconAnchor: [13, 24],
  });
}


function LeafletMap({ sellers = [], userLoc, onSelect, onBounds, placeMode, placeValue, placeArea, onPlace, dark, height = 360 }) {
  const status = useLeaflet();
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  // keep the latest onBounds without re-creating the map
  const onBoundsRef = useRef(onBounds);
  useEffect(() => { onBoundsRef.current = onBounds; }, [onBounds]);

  // create the map once Leaflet is ready
  useEffect(() => {
    if (status !== "ready" || !elRef.current || mapRef.current) return;
    const L = window.L;
    const center = placeMode
      ? (placeValue ? [placeValue.lat, placeValue.lng] : userLoc ? [userLoc.lat, userLoc.lng] : [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng])
      : (userLoc ? [userLoc.lat, userLoc.lng] : [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng]);
    const map = L.map(elRef.current, { center, zoom: placeMode ? 13 : 9, zoomControl: true, scrollWheelZoom: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    if (placeMode) map.on("click", (e) => onPlace && onPlace({ lat: e.latlng.lat, lng: e.latlng.lng }));
    // report the visible area so the listing list can follow the map (browse-by-map)
    const emitBounds = () => {
      if (!onBoundsRef.current) return;
      const b = map.getBounds();
      onBoundsRef.current({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    };
    if (!placeMode) { map.on("moveend", emitBounds); map.on("zoomend", emitBounds); }
    mapRef.current = map;
    setTimeout(() => { map.invalidateSize(); emitBounds(); }, 120);
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line
  }, [status]);

  // when the container height changes (e.g. grid <-> map view), tell Leaflet to re-measure
  useEffect(() => {
    const map = mapRef.current;
    if (map) setTimeout(() => map.invalidateSize(), 120);
  }, [height]);

  // dark mode: filter the tile layer imperatively. We must NOT toggle a React
  // className on the map element — Leaflet writes its own classes onto that same
  // node, and React would wipe them on re-render (which blanked the map before).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getPane) return;
    const pane = map.getPane("tilePane");
    if (pane) pane.style.filter = dark ? "invert(1) hue-rotate(180deg) brightness(1.05) contrast(.92)" : "";
    if (elRef.current) elRef.current.style.background = dark ? "#1c1917" : "";
  }, [dark, status]);

  // redraw markers when data changes
  useEffect(() => {
    const map = mapRef.current, L = window.L;
    if (!map || !layerRef.current || !L) return;
    layerRef.current.clearLayers();

    if (userLoc) {
      L.circleMarker([userLoc.lat, userLoc.lng], { radius: 7, color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 1, weight: 3 })
        .addTo(layerRef.current).bindTooltip("You", { direction: "top" });
    }

    if (placeMode) {
      if (placeValue) {
        if (placeArea) {
          L.circle([placeValue.lat, placeValue.lng], { radius: 400, color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.18, weight: 2 }).addTo(layerRef.current);
        } else {
          L.marker([placeValue.lat, placeValue.lng], { icon: pinIcon(L, "#c2410c") }).addTo(layerRef.current);
        }
      }
    } else {
      const cityDrawn = new Set(); // one generic dot per city centre
      sellers.forEach((s) => {
        const color = s.type === "service" ? "#15803d" : "#c2410c";
        if (s.cityOnly) {
          // city/area listings have no exact spot. Draw ONE neutral, non-clickable dot
          // per city centre that just signals "unpinned listings here" — never a business
          // name, never opens a listing (those are reachable from the list instead).
          const key = s.lat.toFixed(3) + "," + s.lng.toFixed(3);
          if (cityDrawn.has(key)) return;
          cityDrawn.add(key);
          const c = L.circleMarker([s.lat, s.lng], { radius: 9, color: "#6b7280", weight: 2, fillColor: "#9ca3af", fillOpacity: 0.35 }).addTo(layerRef.current);
          c.bindTooltip("Unpinned listings in this city", { direction: "top" });
        } else if (s.area) {
          const c = L.circle([s.lat, s.lng], { radius: 400, color, fillColor: color, fillOpacity: 0.14, weight: 1.5 }).addTo(layerRef.current);
          c.on("click", () => onSelect && onSelect(s));
          c.bindTooltip(s.title + " (approx. area)", { direction: "top" });
        } else {
          const mk = L.marker([s.lat, s.lng], { icon: pinIcon(L, color) }).addTo(layerRef.current);
          mk.on("click", () => onSelect && onSelect(s));
          mk.bindTooltip(s.title, { direction: "top" });
        }
      });
    }
  }, [sellers, userLoc, placeMode, placeValue, placeArea, onSelect]);

  if (status === "loading") {
    return <div style={{ height }} className="flex items-center justify-center"><Loader2 className="animate-spin text-stone-400" size={28} /></div>;
  }
  if (status === "failed") {
    return <FallbackMap sellers={sellers} userLoc={userLoc} onSelect={onSelect} placeMode={placeMode} placeValue={placeValue} placeArea={placeArea} onPlace={onPlace} height={height} />;
  }
  return <div ref={elRef} style={{ height, width: "100%", borderRadius: 16, overflow: "hidden", zIndex: 0 }} />;
}


// Simple SVG fallback if Leaflet/OSM can't load (offline or sandbox blocked tiles)
function FallbackMap({ sellers = [], userLoc, onSelect, placeMode, placeValue, placeArea, onPlace, height = 360 }) {
  const { t } = useTheme();
  const pts = placeMode ? [] : sellers;
  const all = [...pts.map((s) => ({ lat: s.lat, lng: s.lng })), userLoc].filter(Boolean);
  if (placeValue) all.push(placeValue);
  const lats = all.map((p) => p.lat), lngs = all.map((p) => p.lng);
  const minLat = Math.min(...lats, userLoc ? userLoc.lat : DEFAULT_LOCATION.lat) - 0.1;
  const maxLat = Math.max(...lats, userLoc ? userLoc.lat : DEFAULT_LOCATION.lat) + 0.1;
  const minLng = Math.min(...lngs, userLoc ? userLoc.lng : DEFAULT_LOCATION.lng) - 0.1;
  const maxLng = Math.max(...lngs, userLoc ? userLoc.lng : DEFAULT_LOCATION.lng) + 0.1;
  const W = 600, H = height;
  const px = (lng) => ((lng - minLng) / (maxLng - minLng || 1)) * W;
  const py = (lat) => H - ((lat - minLat) / (maxLat - minLat || 1)) * H;
  const click = (e) => {
    if (!placeMode || !onPlace) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const lng = minLng + (x / W) * (maxLng - minLng);
    const lat = minLat + ((H - y) / H) * (maxLat - minLat);
    onPlace({ lat, lng });
  };
  return (
    <div>
      <div className={"mb-2 text-xs " + t.muted} style={FONT_BODY}>
        Detailed map couldn't load (offline or blocked) — showing a simple position map instead.
      </div>
      <svg viewBox={"0 0 " + W + " " + H} onClick={click}
        style={{ width: "100%", height, borderRadius: 16, cursor: placeMode ? "crosshair" : "default" }}
        className={t.panelAlt}>
        <rect width={W} height={H} fill="currentColor" className={t.panelAlt} />
        {[0.25, 0.5, 0.75].map((f) => <line key={"h" + f} x1={0} y1={H * f} x2={W} y2={H * f} stroke="currentColor" strokeOpacity="0.08" />)}
        {[0.25, 0.5, 0.75].map((f) => <line key={"v" + f} x1={W * f} y1={0} x2={W * f} y2={H} stroke="currentColor" strokeOpacity="0.08" />)}
        {!placeMode && sellers.map((s) => {
          const color = s.type === "service" ? "#15803d" : "#c2410c";
          if (s.cityOnly) // neutral, non-clickable area dot
            return <circle key={s.d} cx={px(s.lng)} cy={py(s.lat)} r={8} fill="#9ca3af" fillOpacity="0.4" stroke="#6b7280" strokeWidth="2" />;
          return s.area
            ? <circle key={s.d} cx={px(s.lng)} cy={py(s.lat)} r={26} fill={color} fillOpacity="0.18" stroke={color} onClick={(e) => { e.stopPropagation(); onSelect && onSelect(s); }} style={{ cursor: "pointer" }} />
            : <g key={s.d} onClick={(e) => { e.stopPropagation(); onSelect && onSelect(s); }} style={{ cursor: "pointer" }}>
                <circle cx={px(s.lng)} cy={py(s.lat)} r={7} fill={color} stroke="white" strokeWidth="2" /></g>;
        })}
        {placeValue && (placeArea
          ? <circle cx={px(placeValue.lng)} cy={py(placeValue.lat)} r={26} fill="#16a34a" fillOpacity="0.2" stroke="#16a34a" />
          : <circle cx={px(placeValue.lng)} cy={py(placeValue.lat)} r={8} fill="#c2410c" stroke="white" strokeWidth="2" />)}
        {userLoc && <circle cx={px(userLoc.lng)} cy={py(userLoc.lat)} r={6} fill="#0ea5e9" stroke="white" strokeWidth="2" />}
      </svg>
    </div>
  );
}


/* ---- QR code (lazy-loaded from CDN; falls back to copyable text) ---- */
const QR_JS = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";

function useQR() {
  const [ready, setReady] = useState(!!window.qrcode);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (window.qrcode) { setReady(true); return; }
    let s = document.getElementById("qr-js");
    if (!s) { s = document.createElement("script"); s.id = "qr-js"; s.src = QR_JS; document.body.appendChild(s); }
    const ok = () => setReady(true), bad = () => setFailed(true);
    s.addEventListener("load", ok); s.addEventListener("error", bad);
    const timer = setTimeout(() => { if (!window.qrcode) setFailed(true); }, 6000);
    return () => { clearTimeout(timer); s.removeEventListener("load", ok); s.removeEventListener("error", bad); };
  }, []);
  return { ready, failed };
}

function QRImage({ text, size = 220 }) {
  const { ready, failed } = useQR();
  const dataUrl = useMemo(() => {
    if (!ready || !window.qrcode) return null;
    try { const qr = window.qrcode(0, "M"); qr.addData(text); qr.make(); return qr.createDataURL(5, 8); } catch { return null; }
  }, [ready, text]);
  if (failed || (ready && !dataUrl)) {
    return <div className="text-xs text-stone-500" style={FONT_BODY}>QR couldn't render — copy the invoice text below instead.</div>;
  }
  if (!dataUrl) return <div style={{ height: size }} className="flex items-center justify-center"><Loader2 className="animate-spin text-stone-400" size={24} /></div>;
  return <img alt="invoice QR" src={dataUrl} width={size} height={size} style={{ borderRadius: 12, background: "white", padding: 8 }} />;
}

export { useLeaflet, pinIcon, LeafletMap, FallbackMap, useQR, QRImage };
