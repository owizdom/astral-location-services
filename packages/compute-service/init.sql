-- PostGIS initialization script for Astral Location Services
-- This ensures PostGIS extension is available for spatial computations

CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS is working
SELECT PostGIS_Version();
