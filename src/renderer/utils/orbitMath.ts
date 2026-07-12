import { 
  CrystalSphere, CelestialObject, OrbitDirection, 
  IPhysicalBody, IPhenomenon, IConstellation, IMapOverlay 
} from '../../types/astrolabe';

/**
 * Calculates the orbital period (P) in days using Keplerian scaling: P = k * d^1.5.
 * Defaults to k = 365, so a distance of 1.0 (Earth-like) equals 365 days.
 */
function calculateOrbitalPeriod(distance: number, override?: number): number {
  if (override !== undefined && override > 0) return override;
  if (distance <= 0) return 1;
  // Kepler's Third Law approximation: P = 365 * d^1.5
  return 365 * Math.pow(distance, 1.5);
}

/**
 * Calculates the active angle in degrees based on time elapsed.
 * Formula: theta(t) = (initialAngle ± (360 / P) * t) mod 360
 * @param isStationary - If true, always returns initialAngle (object is fixed in space).
 * @param direction - 'retrograde' reverses angular velocity, producing clockwise motion.
 */
function calculateAngle(
  initialAngle: number,
  periodDays: number,
  currentDays: number,
  isStationary?: boolean,
  direction?: OrbitDirection
): number {
  if (isStationary) return initialAngle;
  if (periodDays <= 0) return initialAngle;
  const dirMult = direction === 'retrograde' ? -1 : 1;
  const deltaAngle = dirMult * (360 / periodDays) * currentDays;
  let angle = (initialAngle + deltaAngle) % 360;
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * Converts polar distance (semi-major axis) and angle to 2D Cartesian offset coordinates,
 * supporting Keplerian elliptical orbits.
 */
function calculateCoordinates(
  distance: number, 
  angleDegrees: number,
  eccentricity: number = 0,
  rotationDegrees: number = 0
): { x: number; y: number } {
  const rad = (angleDegrees * Math.PI) / 180;
  
  if (eccentricity <= 0) {
    return {
      x: distance * Math.cos(rad),
      y: distance * Math.sin(rad),
    };
  }

  // Constrain eccentricity to valid elliptical bounds (0 to <1)
  const e = Math.min(Math.max(eccentricity, 0), 0.99);
  const rotRad = (rotationDegrees * Math.PI) / 180;

  // Polar equation of an ellipse relative to its focus:
  // r = (a * (1 - e^2)) / (1 + e * cos(theta - rotRad))
  const r = (distance * (1 - e * e)) / (1 + e * Math.cos(rad - rotRad));

  return {
    x: r * Math.cos(rad),
    y: r * Math.sin(rad),
  };
}

export interface PositionDetails {
  x: number;      // global X position in system scale
  y: number;      // global Y position in system scale
  angle: number;  // current active angle in degrees
  period: number; // active orbital period in days
}

/**
 * Helper to recursively flatten celestial bodies with subOrbiters.
 */
export function flattenCelestialTree(
  bodies: IPhysicalBody[], 
  parentMap: Map<string, string> = new Map()
): IPhysicalBody[] {
  let flat: IPhysicalBody[] = [];
  for (const body of bodies) {
    flat.push(body);
    if (body.subOrbiters && body.subOrbiters.length > 0) {
      for (const sub of body.subOrbiters) {
        if (sub.type !== 'cloud') {
          // It's a body
          parentMap.set(sub.id, body.id);
        }
      }
      flat = flat.concat(flattenCelestialTree(body.subOrbiters.filter(s => s.type !== 'cloud') as IPhysicalBody[], parentMap));
    }
  }
  return flat;
}

export function flattenPhenomenaTree(
  bodies: IPhysicalBody[], 
  parentMap: Map<string, string>
): IPhenomenon[] {
  let flat: IPhenomenon[] = [];
  for (const body of bodies) {
    if (body.subOrbiters && body.subOrbiters.length > 0) {
      for (const sub of body.subOrbiters) {
        if (sub.type === 'cloud') {
          parentMap.set(sub.id, body.id);
          flat.push(sub as IPhenomenon);
        }
      }
      flat = flat.concat(flattenPhenomenaTree(body.subOrbiters.filter(s => s.type !== 'cloud') as IPhysicalBody[], parentMap));
    }
  }
  return flat;
}

export function getAllSystemObjects(sphere: Pick<CrystalSphere, 'celestialBodies' | 'phenomena' | 'constellations' | 'mapOverlays' | 'groups'>): CelestialObject[] {
  const parentMap = new Map<string, string>();
  const flatBodies = flattenCelestialTree(sphere.celestialBodies || [], parentMap);
  const flatPhenomena = flattenPhenomenaTree(sphere.celestialBodies || [], parentMap);
  
  return [
    ...(sphere.groups || []),
    ...flatBodies,
    ...(sphere.phenomena || []),
    ...flatPhenomena,
    ...(sphere.constellations || []),
    ...(sphere.mapOverlays || [])
  ];
}

/**
 * Hierarchical solver that resolves the global 2D positions of all objects.
 * Memoizes results to prevent redundant parent resolutions.
 */
export function calculateSystemPositions(
  sphere: Pick<CrystalSphere, 'celestialBodies' | 'phenomena' | 'constellations' | 'mapOverlays'>,
  currentDays: number
): Record<string, PositionDetails> {
  const results: Record<string, PositionDetails> = {};
  
  const lookup = new Map<string, CelestialObject>();
  const parentMap = new Map<string, string>(); // child.id -> parent.id
  const nameToIdMap = new Map<string, string>(); // for legacy orbitedObjectName resolving

  // Flatten the nested bodies and phenomena
  const allObjects = getAllSystemObjects(sphere);

  for (const obj of allObjects as any[]) {
    lookup.set(obj.id, obj);
    nameToIdMap.set(obj.name, obj.id);
  }

  function resolve(id: string): PositionDetails {
    if (results[id]) return results[id];

    const obj = lookup.get(id);
    if (!obj) {
      return { x: 0, y: 0, angle: 0, period: 1 };
    }

    let distanceOrbited = 0;
    let initialAngle = 0;
    let orbitalPeriodDays = 0;
    let isStationary = false;
    let orbitDirection: OrbitDirection = 'prograde';
    let orbitEccentricity = 0;
    let orbitRotation = 0;

    // Type guard / extraction
    if ('distanceOrbited' in obj) {
      distanceOrbited = obj.distanceOrbited ?? 0;
      initialAngle = obj.initialAngle ?? 0;
      orbitalPeriodDays = (obj as any).orbitalPeriodDays ?? 0;
      isStationary = (obj as any).isStationary ?? false;
      orbitDirection = (obj as any).orbitDirection ?? 'prograde';
      orbitEccentricity = ('orbitEccentricity' in obj) ? (obj as any).orbitEccentricity ?? 0 : 0;
      orbitRotation = ('orbitRotation' in obj) ? (obj as any).orbitRotation ?? 0 : 0;
    } else if (obj.type === 'note' || obj.type === 'legend') {
      const ol = obj as IMapOverlay;
      distanceOrbited = (ol.type === 'note' ? ol.noteDistanceAU : ol.legendDistanceAU) ?? 0;
      initialAngle = (ol.type === 'note' ? ol.noteAngle : ol.legendAngle) ?? 0;
      isStationary = true;
    }

    const period = calculateOrbitalPeriod(distanceOrbited, orbitalPeriodDays);
    const angle = calculateAngle(initialAngle, period, currentDays, isStationary, orbitDirection);

    // Determine parent
    let parentId: string | null = null;
    
    // 1. Check tree nesting map
    if (parentMap.has(id)) {
      parentId = parentMap.get(id) || null;
    } 
    // 2. Check legacy orbitedObjectName
    else if ('orbitedObjectName' in obj && obj.orbitedObjectName) {
      parentId = nameToIdMap.get(obj.orbitedObjectName) || null;
    }

    // If it has no parent or orbits itself, it orbits the central star at coordinate (0, 0)
    if (!parentId || parentId === id) {
      const rel = calculateCoordinates(distanceOrbited, angle, orbitEccentricity, orbitRotation);
      const res = { x: rel.x, y: rel.y, angle, period };
      results[id] = res;
      if (obj.name) results[obj.name] = res;
      return res;
    }

    // Resolve parent global position recursively
    const parentPos = resolve(parentId);
    const rel = calculateCoordinates(distanceOrbited, angle, orbitEccentricity, orbitRotation);
    const res = {
      x: parentPos.x + rel.x,
      y: parentPos.y + rel.y,
      angle,
      period,
    };
    results[id] = res;
    if (obj.name) results[obj.name] = res;
    return res;
  }

  for (const obj of allObjects as any[]) {
    resolve(obj.id);
  }

  return results;
}
