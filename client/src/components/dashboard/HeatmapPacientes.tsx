/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import ChartCard from "@/components/dashboard/ChartCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Map, Loader2, Flame, Eye, EyeOff, Maximize2, Minimize2, Info } from "lucide-react";

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

let scriptLoaded = false;
let scriptLoading: Promise<void> | null = null;

function loadHeatmapScript(): Promise<void> {
  if (scriptLoaded && window.google?.maps?.visualization) {
    return Promise.resolve();
  }

  if (scriptLoading) return scriptLoading;

  scriptLoading = new Promise<void>((resolve, reject) => {
    // Check if google maps is already loaded with visualization
    if (window.google?.maps?.visualization) {
      scriptLoaded = true;
      resolve();
      return;
    }

    // Remove any existing google maps scripts to avoid conflicts
    const existingScripts = document.querySelectorAll('script[src*="maps/api/js"]');
    existingScripts.forEach(s => s.remove());

    // Clear google maps from window to force reload with visualization
    if (window.google?.maps) {
      delete (window as any).google.maps;
    }

    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry,visualization`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      scriptLoading = null;
      reject(new Error("Failed to load Google Maps script with visualization library"));
    };
    document.head.appendChild(script);
  });

  return scriptLoading;
}

interface HeatmapPacientesProps {
  dataInicio: string;
  dataFim: string;
  enabled: boolean;
}

export default function HeatmapPacientes({ dataInicio, dataFim, enabled }: HeatmapPacientesProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(false);
  const [radius, setRadius] = useState([30]);
  const [opacity, setOpacity] = useState([0.7]);
  const [expanded, setExpanded] = useState(false);

  // Stabilize query input
  const queryInput = useMemo(() => ({
    dataInicio,
    dataFim,
  }), [dataInicio, dataFim]);

  // Fetch heatmap data from backend
  const { data: heatmapData, isLoading, error } = trpc.relatorioAtendimentos.mapaCalor.useQuery(
    queryInput,
    { enabled: enabled && !!dataInicio && !!dataFim }
  );

  // Initialize map
  const initMap = usePersistFn(async () => {
    try {
      await loadHeatmapScript();

      if (!mapContainer.current) return;

      const center = heatmapData?.centroMapa || { lat: -16.3286, lng: -49.2733 }; // Goiânia default
      const zoom = heatmapData?.zoomInicial || 12;

      mapRef.current = new google.maps.Map(mapContainer.current, {
        zoom,
        center,
        mapTypeControl: true,
        fullscreenControl: false,
        zoomControl: true,
        streetViewControl: false,
        mapId: "HEATMAP_MAP_ID",
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      setMapReady(true);
      setMapError(null);
    } catch (err) {
      console.error("[HeatmapPacientes] Erro ao inicializar mapa:", err);
      setMapError("Erro ao carregar o mapa. Tente novamente.");
    }
  });

  // Initialize map when data is available
  useEffect(() => {
    if (heatmapData && !mapReady && mapContainer.current) {
      initMap();
    }
  }, [heatmapData, mapReady, initMap]);

  // Update heatmap layer when data changes
  useEffect(() => {
    if (!mapReady || !mapRef.current || !heatmapData?.pontos?.length) return;

    // Clear existing heatmap
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }

    // Create heatmap data points with weights
    const heatmapPoints = heatmapData.pontos.map(p => ({
      location: new google.maps.LatLng(p.latitude, p.longitude),
      weight: p.totalAtendimentos,
    }));

    // Create heatmap layer
    heatmapRef.current = new google.maps.visualization.HeatmapLayer({
      data: heatmapPoints,
      map: showHeatmap ? mapRef.current : null,
      radius: radius[0],
      opacity: opacity[0],
      gradient: [
        "rgba(0, 255, 255, 0)",
        "rgba(0, 255, 255, 1)",
        "rgba(0, 191, 255, 1)",
        "rgba(0, 127, 255, 1)",
        "rgba(0, 63, 255, 1)",
        "rgba(0, 0, 255, 1)",
        "rgba(0, 0, 223, 1)",
        "rgba(0, 0, 191, 1)",
        "rgba(0, 0, 159, 1)",
        "rgba(0, 0, 127, 1)",
        "rgba(63, 0, 91, 1)",
        "rgba(127, 0, 63, 1)",
        "rgba(191, 0, 31, 1)",
        "rgba(255, 0, 0, 1)",
      ],
    });

    // Center map
    if (heatmapData.centroMapa) {
      mapRef.current.setCenter(heatmapData.centroMapa);
      mapRef.current.setZoom(heatmapData.zoomInicial || 12);
    }
  }, [mapReady, heatmapData, showHeatmap]);

  // Update heatmap radius
  useEffect(() => {
    if (heatmapRef.current) {
      heatmapRef.current.set("radius", radius[0]);
    }
  }, [radius]);

  // Update heatmap opacity
  useEffect(() => {
    if (heatmapRef.current) {
      heatmapRef.current.set("opacity", opacity[0]);
    }
  }, [opacity]);

  // Toggle heatmap visibility
  useEffect(() => {
    if (heatmapRef.current && mapRef.current) {
      heatmapRef.current.setMap(showHeatmap ? mapRef.current : null);
    }
  }, [showHeatmap]);

  // Toggle markers
  useEffect(() => {
    if (!mapReady || !mapRef.current || !heatmapData?.pontos?.length) return;

    // Clear existing markers
    markersRef.current.forEach(m => (m.map = null));
    markersRef.current = [];

    if (!showMarkers) return;

    // Create info window
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    // Add markers for each CEP
    heatmapData.pontos.forEach(ponto => {
      const cepFormatado = ponto.cep.length === 8
        ? `${ponto.cep.slice(0, 5)}-${ponto.cep.slice(5)}`
        : ponto.cep;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: { lat: ponto.latitude, lng: ponto.longitude },
        title: `CEP ${cepFormatado}: ${ponto.totalAtendimentos} atendimentos`,
      });

      marker.addListener("click", () => {
        const content = `
          <div style="padding: 8px; font-family: system-ui, sans-serif; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e293b;">
              CEP ${cepFormatado}
            </h3>
            <div style="font-size: 13px; color: #475569; line-height: 1.6;">
              <div><strong>${ponto.totalAtendimentos.toLocaleString("pt-BR")}</strong> atendimentos</div>
              ${ponto.bairro ? `<div>Bairro: ${ponto.bairro}</div>` : ""}
              ${ponto.cidade ? `<div>Cidade: ${ponto.cidade}</div>` : ""}
              ${ponto.estado ? `<div>Estado: ${ponto.estado}</div>` : ""}
            </div>
          </div>
        `;
        infoWindowRef.current!.setContent(content);
        infoWindowRef.current!.open(mapRef.current!, marker);
      });

      markersRef.current.push(marker);
    });
  }, [mapReady, heatmapData, showMarkers]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
      }
      markersRef.current.forEach(m => (m.map = null));
      markersRef.current = [];
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, []);

  if (!enabled) return null;

  if (isLoading) {
    return (
      <ChartCard title="Distribuição Geográfica dos Pacientes" icon={Map}>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Geocodificando CEPs e preparando mapa de calor...</p>
          <p className="text-xs text-muted-foreground">Este processo pode levar alguns segundos na primeira vez</p>
        </div>
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title="Distribuição Geográfica dos Pacientes" icon={Map}>
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <Info className="h-8 w-8 opacity-40" />
          <p className="text-sm">Erro ao carregar dados geográficos</p>
          <p className="text-xs">{(error as any)?.message || "Tente novamente mais tarde"}</p>
        </div>
      </ChartCard>
    );
  }

  if (!heatmapData || heatmapData.pontos.length === 0) {
    return (
      <ChartCard title="Distribuição Geográfica dos Pacientes" icon={Map}>
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <Map className="h-8 w-8 opacity-40" />
          <p className="text-sm">Nenhum dado geográfico disponível</p>
          <p className="text-xs">Verifique se os CEPs dos pacientes estão preenchidos</p>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Distribuição Geográfica dos Pacientes"
      icon={Map}
      className={expanded ? "col-span-full" : ""}
      action={
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {heatmapData.totalCeps} CEPs
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {heatmapData.totalAtendimentos.toLocaleString("pt-BR")} atendimentos
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Reduzir" : "Expandir"}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      }
    >
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3 pb-3 border-b border-border">
        <Button
          variant={showHeatmap ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => setShowHeatmap(!showHeatmap)}
        >
          <Flame className="h-3 w-3" />
          Mapa de Calor
        </Button>
        <Button
          variant={showMarkers ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => setShowMarkers(!showMarkers)}
        >
          {showMarkers ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          Marcadores
        </Button>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Raio:</span>
          <Slider
            value={radius}
            onValueChange={setRadius}
            min={10}
            max={80}
            step={5}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground w-6">{radius[0]}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Opacidade:</span>
          <Slider
            value={opacity}
            onValueChange={setOpacity}
            min={0.1}
            max={1}
            step={0.1}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground w-8">{Math.round(opacity[0] * 100)}%</span>
        </div>
      </div>

      {/* Map */}
      {mapError ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <Info className="h-8 w-8 opacity-40" />
          <p className="text-sm">{mapError}</p>
          <Button variant="outline" size="sm" onClick={() => { setMapReady(false); setMapError(null); initMap(); }}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div
          ref={mapContainer}
          className={cn(
            "w-full rounded-lg border border-border overflow-hidden transition-all duration-300",
            expanded ? "h-[600px]" : "h-[450px]"
          )}
        />
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2 rounded-sm" style={{ background: "linear-gradient(to right, rgba(0,255,255,1), rgba(0,0,255,1), rgba(191,0,31,1), rgba(255,0,0,1))" }} />
          <span>Menor &rarr; Maior concentração</span>
        </div>
        <span>Top {heatmapData.totalCeps} CEPs com mais atendimentos</span>
      </div>
    </ChartCard>
  );
}
