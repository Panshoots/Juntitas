import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface ChileRegion {
  id: string;
  name: string;
  roman: string;
  comunas: string[];
}

export const MASTER_CHILE_REGIONS: ChileRegion[] = [
  {
    id: 'metropolitana',
    name: 'Región Metropolitana de Santiago',
    roman: 'RM',
    comunas: [
      'Santiago', 'Las Condes', 'Providencia', 'Vitacura', 'Lo Barnechea', 'Ñuñoa', 'La Reina',
      'Peñalolén', 'Macul', 'La Florida', 'Maipú', 'Puente Alto', 'San Miguel', 'San Joaquín',
      'La Cisterna', 'San Ramón', 'La Granja', 'La Pintana', 'El Bosque', 'Pedro Aguirre Cerda',
      'Lo Espejo', 'Estación Central', 'Cerrillos', 'Quinta Normal', 'Lo Prado', 'Pudahuel',
      'Cerro Navia', 'Renca', 'Conchalí', 'Independencia', 'Recoleta', 'Huechuraba', 'Quilicura',
      'Colina', 'Lampa', 'Til Til', 'San Bernardo', 'Buin', 'Calera de Tango', 'Paine',
      'Melipilla', 'Alhué', 'Curacaví', 'María Pinto', 'San Pedro', 'Talagante', 'El Monte',
      'Isla de Maipo', 'Padre Hurtado', 'Peñaflor', 'Pirque', 'San José de Maipo'
    ]
  },
  {
    id: 'valparaiso',
    name: 'Región de Valparaíso',
    roman: 'V',
    comunas: [
      'Valparaíso', 'Viña del Mar', 'Concón', 'Quilpué', 'Villa Alemana', 'Limache', 'Olmué',
      'Quillota', 'La Calera', 'Hijuelas', 'La Cruz', 'Nogales', 'San Antonio', 'Algarrobo',
      'Cartagena', 'El Quisco', 'El Tabo', 'Santo Domingo', 'Casablanca', 'Puchuncaví',
      'Quintero', 'San Felipe', 'Catemu', 'Llaillay', 'Panquehue', 'Putaendo', 'Santa María',
      'Los Andes', 'Calle Larga', 'Rinconada', 'San Esteban', 'La Ligua', 'Cabildo', 'Papudo',
      'Petorca', 'Zapallar', 'Isla de Pascua', 'Juan Fernández'
    ]
  },
  {
    id: 'biobio',
    name: 'Región del Biobío',
    roman: 'VIII',
    comunas: [
      'Concepción', 'San Pedro de la Paz', 'Talcahuano', 'Chiguayante', 'Coronel', 'Hualpén',
      'Lota', 'Penco', 'Tomé', 'Florida', 'Hualqui', 'Santa Juana', 'Los Ángeles', 'Antuco',
      'Cabrero', 'Laja', 'Mulchén', 'Nacimiento', 'Negrete', 'Quilaco', 'Quilleco', 'San Rosendo',
      'Santa Bárbara', 'Tucapel', 'Yumbel', 'Alto Biobío', 'Lebu', 'Arauco', 'Cañete',
      'Contulmo', 'Curanilahue', 'Los Álamos', 'Tirúa'
    ]
  },
  {
    id: 'araucania',
    name: 'Región de La Araucanía',
    roman: 'IX',
    comunas: [
      'Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón', 'Angol', 'Carahue', 'Cholchol',
      'Collipulli', 'Cunco', 'Curacautín', 'Curarrehue', 'Ercilla', 'Freire', 'Galvarino',
      'Gorbea', 'Lautaro', 'Loncoche', 'Lonquimay', 'Los Sauces', 'Lumaco', 'Melipeuco',
      'Nueva Imperial', 'Perquenco', 'Pitrufquén', 'Purén', 'Renaico', 'Saavedra',
      'Teodoro Schmidt', 'Toltén', 'Traiguén', 'Victoria', 'Vilcún'
    ]
  },
  {
    id: 'coquimbo',
    name: 'Región de Coquimbo',
    roman: 'IV',
    comunas: [
      'La Serena', 'Coquimbo', 'Andacollo', 'La Higuera', 'Paiguano', 'Vicuña', 'Illapel',
      'Canela', 'Los Vilos', 'Salamanca', 'Ovalle', 'Combarbalá', 'Monte Patria', 'Punitaqui', 'Río Hurtado'
    ]
  },
  {
    id: 'antofagasta',
    name: 'Región de Antofagasta',
    roman: 'II',
    comunas: [
      'Antofagasta', 'Calama', 'Mejillones', 'Sierra Gorda', 'Taltal', 'Ollagüe',
      'San Pedro de Atacama', 'Tocopilla', 'María Elena'
    ]
  },
  {
    id: 'los_lagos',
    name: 'Región de Los Lagos',
    roman: 'X',
    comunas: [
      'Puerto Montt', 'Puerto Varas', 'Osorno', 'Castro', 'Ancud', 'Calbuco', 'Cochamó',
      'Fresia', 'Frutillar', 'Los Muermos', 'Llanquihue', 'Maullín', 'Chonchi', 'Curaco de Vélez',
      'Dalcahue', 'Puqueldón', 'Queilén', 'Quellón', 'Quemchi', 'Quinchao', 'Puerto Octay',
      'Purranque', 'Puyehue', 'Río Negro', 'San Juan de la Costa', 'San Pablo', 'Chaitén',
      'Futaleufú', 'Hualaihué', 'Palena'
    ]
  },
  {
    id: 'ohiggins',
    name: "Región del Libertador Bernardo O'Higgins",
    roman: 'VI',
    comunas: [
      'Rancagua', 'Machalí', 'Rengo', 'San Fernando', 'Pichilemu', 'Codegua', 'Coinco',
      'Coltauco', 'Doñihue', 'Graneros', 'Las Cabras', 'Malloa', 'Mostazal', 'Olivar',
      'Peumo', 'Pichidegua', 'Quinta de Tilcoco', 'Requínoa', 'San Vicente', 'La Estrella',
      'Litueche', 'Marchihue', 'Navidad', 'Paredones', 'Chépica', 'Chimbarongo', 'Lolol',
      'Nancagua', 'Palmilla', 'Peralillo', 'Placilla', 'Pumanque', 'Santa Cruz'
    ]
  },
  {
    id: 'maule',
    name: 'Región del Maule',
    roman: 'VII',
    comunas: [
      'Talca', 'Curicó', 'Linares', 'Constitución', 'Cauquenes', 'Chanco', 'Pelluhue',
      'Curepto', 'Empedrado', 'Maule', 'Pelarco', 'Pencahue', 'Río Claro', 'San Clemente',
      'San Rafael', 'Hualañé', 'Licantén', 'Molina', 'Rauco', 'Romeral', 'Sagrada Familia',
      'Teno', 'Vichuquén', 'Colbún', 'Longaví', 'Parral', 'Retiro', 'San Javier', 'Villa Alegre', 'Yerbas Buenas'
    ]
  },
  {
    id: 'nuble',
    name: 'Región de Ñuble',
    roman: 'XVI',
    comunas: [
      'Chillán', 'Chillán Viejo', 'San Carlos', 'Bulnes', 'Cobquecura', 'Coelemu', 'Coihueco',
      'El Carmen', 'Ninhue', 'Ñiquén', 'Pemuco', 'Pinto', 'Portezuelo', 'Quillón', 'Quirihue',
      'Ránquil', 'San Fabián', 'San Ignacio', 'San Nicolás', 'Treguaco', 'Yungay'
    ]
  },
  {
    id: 'los_rios',
    name: 'Región de Los Ríos',
    roman: 'XIV',
    comunas: [
      'Valdivia', 'La Unión', 'Corral', 'Lanco', 'Los Lagos', 'Máfil', 'Mariquina',
      'Paillaco', 'Panguipulli', 'Futrono', 'Lago Ranco', 'Río Bueno'
    ]
  },
  {
    id: 'tarapaca',
    name: 'Región de Tarapacá',
    roman: 'I',
    comunas: [
      'Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Camiña', 'Colchane', 'Huara', 'Pica'
    ]
  },
  {
    id: 'arica',
    name: 'Región de Arica y Parinacota',
    roman: 'XV',
    comunas: [
      'Arica', 'Camarones', 'Putre', 'General Lagos'
    ]
  },
  {
    id: 'atacama',
    name: 'Región de Atacama',
    roman: 'III',
    comunas: [
      'Copiapó', 'Vallenar', 'Caldera', 'Tierra Amarilla', 'Chañaral', 'Diego de Almagro',
      'Alto del Carmen', 'Freirina', 'Huasco'
    ]
  },
  {
    id: 'aysen',
    name: 'Región de Aysén',
    roman: 'XI',
    comunas: [
      'Coyhaique', 'Aysén', 'Chile Chico', 'Cochrane', "O'Higgins", 'Tortel', 'Lago Verde',
      'Cisnes', 'Guaitecas', 'Río Ibáñez'
    ]
  },
  {
    id: 'magallanes',
    name: 'Región de Magallanes y de la Antártica Chilena',
    roman: 'XII',
    comunas: [
      'Punta Arenas', 'Puerto Natales', 'Porvenir', 'Cabo de Hornos', 'Antártica',
      'Laguna Blanca', 'Río Verde', 'San Gregorio', 'Primavera', 'Timaukel', 'Torres del Paine'
    ]
  }
];

let cachedRegions: ChileRegion[] | null = null;

export async function getChileRegions(): Promise<ChileRegion[]> {
  if (cachedRegions && cachedRegions.length > 0) {
    return cachedRegions;
  }

  try {
    const colRef = collection(db, 'chileLocations');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list: ChileRegion[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as ChileRegion);
      });
      // Priorizar RM al inicio, luego el resto
      list.sort((a, b) => {
        if (a.id === 'metropolitana') return -1;
        if (b.id === 'metropolitana') return 1;
        return a.name.localeCompare(b.name);
      });
      cachedRegions = list;
      return list;
    } else {
      // Auto-sembrar en Firestore en background
      syncLocationsToFirestore().catch(e => console.warn('Auto-seed locations error:', e));
    }
  } catch (error) {
    console.warn('Uso de catálogo local de regiones y comunas:', error);
  }

  cachedRegions = MASTER_CHILE_REGIONS;
  return MASTER_CHILE_REGIONS;
}

export function getComunasForRegion(regionId: string): string[] {
  const region = (cachedRegions || MASTER_CHILE_REGIONS).find(r => r.id === regionId);
  if (!region) return [];
  return [...region.comunas].sort((a, b) => a.localeCompare(b));
}

export async function syncLocationsToFirestore(): Promise<{ count: number }> {
  try {
    let count = 0;
    for (const reg of MASTER_CHILE_REGIONS) {
      await setDoc(doc(db, 'chileLocations', reg.id), reg, { merge: true });
      count++;
    }
    return { count };
  } catch (err) {
    console.error('Error sincronizando regiones a Firestore:', err);
    return { count: 0 };
  }
}
