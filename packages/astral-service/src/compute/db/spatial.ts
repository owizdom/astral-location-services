import type { RawGeometryInput } from '../types/index.js';
import { pool } from './pool.js';

/**
 * Compute the distance between two geometries in meters.
 * Uses geography type for accurate distance on Earth's surface.
 * Returns result rounded to centimeter precision.
 */
export async function computeDistance(geom1: RawGeometryInput, geom2: RawGeometryInput): Promise<number> {
  const result = await pool.query<{ distance: number }>(
    `SELECT ST_Distance(
      ST_GeomFromGeoJSON($1)::geography,
      ST_GeomFromGeoJSON($2)::geography
    ) as distance`,
    [JSON.stringify(geom1), JSON.stringify(geom2)]
  );
  // Round to centimeter precision (2 decimal places)
  return Math.round(result.rows[0].distance * 100) / 100;
}

/**
 * Compute the area of a polygon in square meters.
 * Uses geography type for accurate area calculation.
 * Returns result rounded to square centimeter precision.
 */
export async function computeArea(geom: RawGeometryInput): Promise<number> {
  const result = await pool.query<{ area: number }>(
    `SELECT ST_Area(
      ST_GeomFromGeoJSON($1)::geography
    ) as area`,
    [JSON.stringify(geom)]
  );
  // Round to square centimeter precision
  return Math.round(result.rows[0].area * 10000) / 10000;
}

/**
 * Compute the length of a line in meters.
 * Uses geography type for accurate length on Earth's surface.
 * Returns result rounded to centimeter precision.
 */
export async function computeLength(geom: RawGeometryInput): Promise<number> {
  const result = await pool.query<{ length: number }>(
    `SELECT ST_Length(
      ST_GeomFromGeoJSON($1)::geography
    ) as length`,
    [JSON.stringify(geom)]
  );
  // Round to centimeter precision
  return Math.round(result.rows[0].length * 100) / 100;
}

/**
 * Check if geometry A contains geometry B.
 * Uses planar geometry (WGS84) for topological relationship.
 */
export async function computeContains(container: RawGeometryInput, containee: RawGeometryInput): Promise<boolean> {
  const result = await pool.query<{ contains: boolean }>(
    `SELECT ST_Contains(
      ST_GeomFromGeoJSON($1),
      ST_GeomFromGeoJSON($2)
    ) as contains`,
    [JSON.stringify(container), JSON.stringify(containee)]
  );
  return result.rows[0].contains;
}

/**
 * Check if a point is within a given distance (meters) of a target geometry.
 * Uses geography type for accurate distance measurement.
 */
export async function computeWithin(point: RawGeometryInput, target: RawGeometryInput, radiusMeters: number): Promise<boolean> {
  const result = await pool.query<{ within: boolean }>(
    `SELECT ST_DWithin(
      ST_GeomFromGeoJSON($1)::geography,
      ST_GeomFromGeoJSON($2)::geography,
      $3
    ) as within`,
    [JSON.stringify(point), JSON.stringify(target), radiusMeters]
  );
  return result.rows[0].within;
}

/**
 * Check if two geometries intersect.
 * Uses planar geometry for topological relationship.
 */
export async function computeIntersects(geom1: RawGeometryInput, geom2: RawGeometryInput): Promise<boolean> {
  const result = await pool.query<{ intersects: boolean }>(
    `SELECT ST_Intersects(
      ST_GeomFromGeoJSON($1),
      ST_GeomFromGeoJSON($2)
    ) as intersects`,
    [JSON.stringify(geom1), JSON.stringify(geom2)]
  );
  return result.rows[0].intersects;
}
