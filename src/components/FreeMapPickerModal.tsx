import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface SelectedLocationData {
  placeName: string;
  address: string;
  comuna: string;
  region: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
}

interface FreeMapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (loc: SelectedLocationData) => void;
  initialPlaceName?: string;
  initialAddress?: string;
  initialComuna?: string;
}

// Parques caninos populares en Chile (acceso rápido con 1 toque)
const POPULAR_CHILEAN_PARKS = [
  {
    name: 'Parque Bicentenario',
    address: 'Av. Bicentenario 3800',
    comuna: 'Vitacura',
    region: 'Metropolitana',
    lat: -33.3985,
    lon: -70.5982
  },
  {
    name: 'Parque Inés de Suárez',
    address: 'Antonio Varas 1510',
    comuna: 'Providencia',
    region: 'Metropolitana',
    lat: -33.4398,
    lon: -70.6125
  },
  {
    name: 'Parque Araucano',
    address: 'Av. Presidente Riesco 5877',
    comuna: 'Las Condes',
    region: 'Metropolitana',
    lat: -33.4035,
    lon: -70.5739
  },
  {
    name: 'Plaza Ñuñoa (Zona Canina)',
    address: 'Av. Irarrázaval 3555',
    comuna: 'Ñuñoa',
    region: 'Metropolitana',
    lat: -33.4542,
    lon: -70.5975
  },
  {
    name: 'Parque Forestal',
    address: 'Ismael Valdés Vergara s/n',
    comuna: 'Santiago',
    region: 'Metropolitana',
    lat: -33.4357,
    lon: -70.6441
  },
  {
    name: 'Parque Padre Hurtado (Intercomunal)',
    address: 'Av. Francisco Bilbao 8105',
    comuna: 'La Reina',
    region: 'Metropolitana',
    lat: -33.4328,
    lon: -70.5436
  }
];

export const FreeMapPickerModal: React.FC<FreeMapPickerModalProps> = ({
  visible,
  onClose,
  onSelectLocation,
  initialPlaceName = '',
  initialAddress = '',
  initialComuna = 'Providencia'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);

  // Ubicación seleccionada por defecto (Santiago centro / Providencia)
  const [selectedLoc, setSelectedLoc] = useState<SelectedLocationData>({
    placeName: initialPlaceName || 'Parque Inés de Suárez',
    address: initialAddress || 'Antonio Varas 1510',
    comuna: initialComuna || 'Providencia',
    region: 'Región Metropolitana',
    latitude: -33.4398,
    longitude: -70.6125,
    googleMapsUrl: 'https://maps.google.com/?q=-33.4398,-70.6125'
  });

  const iframeRef = useRef<any>(null);

  // Escuchar mensajes del mapa Leaflet en Expo Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OSM_PICKED_COORDS') {
        const { lat, lon } = event.data;
        handleCoordinatesSelected(lat, lon);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Geocodificación inversa gratuita con Nominatim OpenStreetMap
  const handleCoordinatesSelected = async (lat: number, lon: number, customName?: string) => {
    setReverseLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'es',
          'User-Agent': 'JuntitasApp/1.0 (contacto@juntitas.app)'
        }
      });
      const data = await res.json();

      const addr = data.address || {};
      const comuna = addr.suburb || addr.city_district || addr.town || addr.city || addr.county || 'Santiago';
      const region = addr.state || 'Región Metropolitana';
      const road = addr.road ? `${addr.road}${addr.house_number ? ' ' + addr.house_number : ''}` : '';
      const autoPlaceName = customName || data.name || addr.amenity || addr.leisure || addr.park || (data.display_name ? data.display_name.split(',')[0] : 'Punto en el mapa');

      const updated: SelectedLocationData = {
        placeName: autoPlaceName,
        address: road || data.display_name?.slice(0, 50) || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        comuna,
        region,
        latitude: lat,
        longitude: lon,
        googleMapsUrl: `https://maps.google.com/?q=${lat},${lon}`
      };

      setSelectedLoc(updated);
    } catch (err) {
      console.warn('Error en reverse geocoding con Nominatim:', err);
      // Fallback manteniendo coordenadas
      setSelectedLoc(prev => ({
        ...prev,
        latitude: lat,
        longitude: lon,
        googleMapsUrl: `https://maps.google.com/?q=${lat},${lon}`
      }));
    } finally {
      setReverseLoading(false);
    }
  };

  // Buscar lugares en Chile con Nominatim OpenStreetMap
  const handleSearchNominatim = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const query = `${searchQuery.trim()}, Chile`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=cl&addressdetails=1&limit=5`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'es',
          'User-Agent': 'JuntitasApp/1.0 (contacto@juntitas.app)'
        }
      });
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.warn('Error buscando en Nominatim:', err);
    } finally {
      setSearching(false);
    }
  };

  // Seleccionar resultado de búsqueda
  const handleSelectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const addr = item.address || {};
    const comuna = addr.suburb || addr.city_district || addr.town || addr.city || addr.county || 'Santiago';
    const placeName = item.name || (item.display_name ? item.display_name.split(',')[0] : 'Lugar');
    const road = addr.road ? `${addr.road}${addr.house_number ? ' ' + addr.house_number : ''}` : item.display_name?.slice(0, 50);

    setSelectedLoc({
      placeName,
      address: road || item.display_name?.slice(0, 50),
      comuna,
      region: addr.state || 'Región Metropolitana',
      latitude: lat,
      longitude: lon,
      googleMapsUrl: `https://maps.google.com/?q=${lat},${lon}`
    });

    setSearchResults([]);
    setSearchQuery('');

    // Mover el mapa en Web
    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'PAN_TO_COORDS', lat, lon }, '*');
    }
  };

  // Seleccionar parque popular
  const handleSelectPopularPark = (park: typeof POPULAR_CHILEAN_PARKS[0]) => {
    setSelectedLoc({
      placeName: park.name,
      address: park.address,
      comuna: park.comuna,
      region: park.region,
      latitude: park.lat,
      longitude: park.lon,
      googleMapsUrl: `https://maps.google.com/?q=${park.lat},${park.lon}`
    });

    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'PAN_TO_COORDS', lat: park.lat, lon: park.lon }, '*');
    }
  };

  const handleConfirm = () => {
    onSelectLocation(selectedLoc);
    onClose();
  };

  // HTML interactivo de Leaflet + OpenStreetMap para Web
  const leafletMapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #F8FAFC; font-family: sans-serif; }
        .custom-paw-pin {
          background: #0284C7;
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          border: 2px solid white;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([${selectedLoc.latitude}, ${selectedLoc.longitude}], 15);
        
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        var pawIcon = L.divIcon({
          className: 'custom-paw-pin',
          html: '🐾',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        var marker = L.marker([${selectedLoc.latitude}, ${selectedLoc.longitude}], { 
          draggable: true, 
          icon: pawIcon 
        }).addTo(map);

        function notifyCoords(lat, lon) {
          window.parent.postMessage({ type: 'OSM_PICKED_COORDS', lat: lat, lon: lon }, '*');
        }

        map.on('click', function(e) {
          marker.setLatLng(e.latlng);
          notifyCoords(e.latlng.lat, e.latlng.lng);
        });

        marker.on('dragend', function(e) {
          var pos = marker.getLatLng();
          notifyCoords(pos.lat, pos.lng);
        });

        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'PAN_TO_COORDS') {
            map.setView([event.data.lat, event.data.lon], 16);
            marker.setLatLng([event.data.lat, event.data.lon]);
          }
        });
      </script>
    </body>
    </html>
  `;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="map" size={20} color="#0284C7" />
                <Text style={styles.modalTitle}>Elegir Ubicación en el Mapa</Text>
              </View>
              <Text style={styles.freeBadgeText}>
                🟢 100% Gratuito y Libre (OpenStreetMap • Sin cobros)
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Buscador Nominatim en Chile */}
          <View style={styles.searchBarRow}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar parque, plaza o calle en Chile..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchNominatim}
              returnKeyType="search"
            />
            {searching ? (
              <ActivityIndicator size="small" color="#0284C7" />
            ) : (
              <TouchableOpacity onPress={handleSearchNominatim} style={styles.searchActionBtn}>
                <Text style={styles.searchActionText}>Buscar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Resultados de búsqueda */}
          {searchResults.length > 0 && (
            <View style={styles.searchResultsBox}>
              <Text style={styles.searchResultsTitle}>Sugerencias encontradas:</Text>
              {searchResults.map((item, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.searchResultItem}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <Ionicons name="location-sharp" size={16} color="#0284C7" />
                  <Text style={styles.searchResultText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Chips de Parques Populares */}
          <View style={{ marginVertical: 8 }}>
            <Text style={styles.popularParksTitle}>Parques caninos recomendados:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularChipsScroll}>
              {POPULAR_CHILEAN_PARKS.map((park, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.popularChip,
                    selectedLoc.placeName.includes(park.name) && styles.popularChipActive
                  ]}
                  onPress={() => handleSelectPopularPark(park)}
                >
                  <Text style={[
                    styles.popularChipText,
                    selectedLoc.placeName.includes(park.name) && styles.popularChipTextActive
                  ]}>
                    🌳 {park.name} ({park.comuna})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Contenedor del Mapa Interactivo Leaflet en Web */}
          <View style={styles.mapContainer}>
            {Platform.OS === 'web' ? (
              <iframe
                ref={iframeRef}
                title="OpenStreetMap Picker"
                srcDoc={leafletMapHtml}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 12
                }}
              />
            ) : (
              <View style={styles.nonWebMapFallback}>
                <Ionicons name="map-outline" size={48} color="#0284C7" />
                <Text style={styles.nonWebFallbackTitle}>Punto fijado en {selectedLoc.placeName}</Text>
                <Text style={styles.nonWebFallbackSub}>Usa el buscador o los parques recomendados para seleccionar.</Text>
              </View>
            )}

            <View style={styles.mapHintBadge}>
              <Ionicons name="finger-print-outline" size={14} color="#FFFFFF" />
              <Text style={styles.mapHintText}>Haz clic o arrastra la huellita 🐾 para afinar el punto</Text>
            </View>
          </View>

          {/* Tarjeta de Resumen de Ubicación Seleccionada */}
          <View style={styles.selectedLocationCard}>
            {reverseLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4 }}>
                <ActivityIndicator size="small" color="#0284C7" />
                <Text style={styles.loadingGeoText}>Detectando dirección y comuna del punto...</Text>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.locCardTitle} numberOfLines={1}>
                    📍 {selectedLoc.placeName}
                  </Text>
                  <View style={styles.comunaBadge}>
                    <Text style={styles.comunaBadgeText}>{selectedLoc.comuna}</Text>
                  </View>
                </View>
                <Text style={styles.locCardAddress} numberOfLines={2}>
                  {selectedLoc.address} ({selectedLoc.region})
                </Text>
              </>
            )}
          </View>

          {/* Botones de Acción */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmLocBtn} onPress={handleConfirm}>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.confirmLocBtnText}>Confirmar Ubicación</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  searchActionBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  searchActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  searchResultsBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    maxHeight: 140,
  },
  searchResultsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    marginBottom: 4,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchResultText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  popularParksTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  popularChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  popularChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  popularChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  popularChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  popularChipTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  mapContainer: {
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    position: 'relative',
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  nonWebMapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  nonWebFallbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  nonWebFallbackSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  mapHintBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mapHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  selectedLocationCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  loadingGeoText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '600',
  },
  locCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
    flex: 1,
    marginRight: 8,
  },
  comunaBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  comunaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  locCardAddress: {
    fontSize: 11,
    color: '#475569',
    marginTop: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmLocBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0284C7',
  },
  confirmLocBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
