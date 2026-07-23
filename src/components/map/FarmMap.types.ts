export interface FarmMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

export interface FarmMapProps {
  markers: FarmMarker[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  height?: number;
}
