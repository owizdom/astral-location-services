# Goal: Verifiable Location-Based Services for Ethereum

## What We're Building

**Astral Location Services** - a verifiable geospatial computation oracle that makes location-based smart contracts possible. Think "PostGIS for Ethereum" - we provide verifiable geospatial operations that work onchain, executed in a TEE via EigenCompute.

## Core Concepts

**Location Attestations (Input)**
- EAS attestations conforming to Location Protocol schema
- Can be onchain (any EAS deployment) or offchain (EIP-712 signatures)
- Stored anywhere (IPFS, servers, local, etc.)
- Schema inspired by PostGIS geometry tables
- Referenced by UID or passed as raw GeoJSON

**Geospatial Operations (The Service)**
- Performs spatial computations on attestation UIDs or raw geometry
- MVP operations: distance, contains, intersects, within, area
- Runs in TEE (EigenCompute) for verifiable execution
- Stateless computation - each request brings all inputs
- **Complements Turf.js**: Turf for local/UX operations, Astral for verifiable/onchain operations

**Policy Attestations (Output)**
- Signed EAS attestations containing computation results
- Three schema types: Boolean, Numeric, Geometry (future)
- Usable offchain (direct consumption) and onchain (via delegated attestations)
- **EAS Resolver Integration**: Resolvers gate onchain actions based on policy attestation results

## What Already Exists

- Location Protocol data model & schema (EAS-based)
- SDK for interacting with the system
- Onchain registry (EAS contracts)
- API indexer (OGC API Features conformant) for spatial queries

## Developer Experience

**SDK Structure:**
```javascript
import { AstralSDK } from '@decentralized-geo/astral-sdk';

const astral = new AstralSDK();

// Work with location attestations
await astral.location.create(geojson);
await astral.location.get(uid);

// Compute with verification
const result = await astral.compute.distance(uid1, uid2);
const nearby = await astral.compute.within(pointUID, targetUID, 500);

// Submit onchain (developer pays gas, Astral is attester)
await astral.eas.submitDelegated(result.delegatedAttestation);
```

**Use Turf.js for local operations:**
```javascript
// Instant UX feedback (local, free)
const localDistance = turf.distance(point1, point2);

// Verifiable proof (calls service, returns signed attestation)
const attestedDistance = await astral.compute.distance(uid1, uid2);
```

**Onchain integration via EAS resolvers:**
```solidity
contract LocationGatedNFT is SchemaResolver {
    address public astralSigner;

    function onAttest(Attestation calldata attestation, uint256)
        internal override returns (bool) {
        // Verify from Astral
        require(attestation.attester == astralSigner, "Not from Astral");

        // Decode policy result (BooleanPolicyAttestation)
        (bool result, , , ) = abi.decode(
            attestation.data,
            (bool, bytes32[], uint64, string)
        );

        require(result, "Location check failed");
        _mint(attestation.recipient, tokenId);
        return true;
    }
}
```

## Architecture

- **Separate service** running in EigenCompute TEE
- **Self-contained container** with PostGIS inside for verifiable computation
- **Stateless model** - no persistent state, inputs passed per-request
- Accessed via `api.astral.global/compute/*`

**Trust Model:**
- Service runs in TEE (EigenCompute) with known signer
- Deterministic operations (same inputs → same outputs)
- Future: Additional verifiability options (AVS consensus, ZK proofs)

## Key Insights

1. **Verifiable by default**: TEE execution via EigenCompute provides attestation of correct computation
2. **Complement, don't replace Turf**: Developers use both - Turf for UX, Astral for verification
3. **EAS resolvers unlock the killer use case**: Location-gated smart contracts become trivial
4. **Delegated attestations**: Developer pays gas, Astral is recorded as attester
5. **Verifiability layer for geospatial web**: PostGIS/GeoJSON/Turf now compatible with Ethereum

---

*For detailed technical specification, see [SPEC.md](../SPEC.md).*
