/**
 * Schema UID configuration for policy attestations.
 *
 * Default schema UIDs are loaded from environment variables.
 * Clients can override with custom schemas (e.g., for resolver contracts).
 */

export interface SchemaConfig {
  numeric: string;
  boolean: string;
}

// Schema UIDs by chain ID
const schemaConfigs: Record<number, SchemaConfig> = {};

/**
 * Initialize schema configuration from environment variables.
 * Call this at startup after loading env vars.
 */
export function initSchemaConfig(chainId: number): void {
  const numericUid = process.env.NUMERIC_SCHEMA_UID;
  const booleanUid = process.env.BOOLEAN_SCHEMA_UID;

  if (!numericUid || !booleanUid) {
    console.warn(
      'Warning: Schema UIDs not configured. Set NUMERIC_SCHEMA_UID and BOOLEAN_SCHEMA_UID environment variables. ' +
      'Compute operations will require clients to provide schema UIDs.'
    );
    return;
  }

  // Validate format
  const schemaUidPattern = /^0x[a-fA-F0-9]{64}$/;
  if (!schemaUidPattern.test(numericUid)) {
    throw new Error(`Invalid NUMERIC_SCHEMA_UID format: ${numericUid}`);
  }
  if (!schemaUidPattern.test(booleanUid)) {
    throw new Error(`Invalid BOOLEAN_SCHEMA_UID format: ${booleanUid}`);
  }

  schemaConfigs[chainId] = {
    numeric: numericUid,
    boolean: booleanUid,
  };

  console.log(`Schema UIDs configured for chain ${chainId}:`);
  console.log(`  Numeric: ${numericUid}`);
  console.log(`  Boolean: ${booleanUid}`);
}

/**
 * Get the default numeric schema UID for compute operations (distance, area, length).
 * Returns undefined if not configured.
 */
export function getNumericSchemaUid(chainId: number): string | undefined {
  return schemaConfigs[chainId]?.numeric;
}

/**
 * Get the default boolean schema UID for compute operations (contains, within, intersects).
 * Returns undefined if not configured.
 */
export function getBooleanSchemaUid(chainId: number): string | undefined {
  return schemaConfigs[chainId]?.boolean;
}

/**
 * Check if schema configuration is available for a chain.
 */
export function hasSchemaConfig(chainId: number): boolean {
  return chainId in schemaConfigs;
}
