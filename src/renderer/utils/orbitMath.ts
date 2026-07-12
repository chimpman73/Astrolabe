import { CelestialObject, OrbitDirection } from '../../types/astrolabe';

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

interface PositionDetails {
  x: number;      // global X position in system scale
  y: number;      // global Y position in system scale
  angle: number;  // current active angle in degrees
  period: number; // active orbital period in days
}

/**
 * Hierarchical solver that resolves the global 2D positions of all objects.
 * Memoizes results to prevent redundant parent resolutions.
 */
export function calculateSystemPositions(
  objects: CelestialObject[],
  currentDays: number
): Record<string, PositionDetails> {
  const results: Record<string, PositionDetails> = {};
  const lookup = new Map<string, CelestialObject>();

  for (const obj of objects) {
    lookup.set(obj.name, obj);
  }

  function resolve(name: string): PositionDetails {
    if (results[name]) return results[name];

    const obj = lookup.get(name);
    if (!obj) {
      return { x: 0, y: 0, angle: 0, period: 1 };
    }

    const period = calculateOrbitalPeriod(obj.distanceOrbited, obj.orbitalPeriodDays);
    const angle = calculateAngle(obj.initialAngle, period, currentDays, obj.isStationary, obj.orbitDirection);

    // If it has no parent, it orbits the central star at coordinate (0, 0)
    if (!obj.orbitedObjectName || obj.orbitedObjectName === name) {
      const rel = calculateCoordinates(obj.distanceOrbited, angle, obj.orbitEccentricity, obj.orbitRotation);
      const res = { x: rel.x, y: rel.y, angle, period };
      results[name] = res;
      return res;
    }

    // Resolve parent global position recursively
    const parentPos = resolve(obj.orbitedObjectName);
    const rel = calculateCoordinates(obj.distanceOrbited, angle, obj.orbitEccentricity, obj.orbitRotation);
    const res = {
      x: parentPos.x + rel.x,
      y: parentPos.y + rel.y,
      angle,
      period,
    };
    results[name] = res;
    return res;
  }

  for (const obj of objects) {
    resolve(obj.name);
  }

  return results;
}
