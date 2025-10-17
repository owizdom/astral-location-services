# Goal: Location-Based Services MVP for Ethereum

## What We're Building
A **hosted geospatial policy engine** that evaluates spatial computations and outputs results as signed EAS attestations, usable offchain, in servers, and onchain in smart contracts.

## Core Concepts

**Location Attestations (Input)**
- EAS attestations conforming to Location Protocol schema
- Can be onchain (any EAS deployment) or offchain (EIP-712 signatures)
- Stored anywhere (IPFS, servers, local, etc.)
- Schema inspired by PostGIS geometry tables
- Referenced by UID (or raw geometry data accepted)
- These are atomic records in a universal geospatial database

**Policy Engine (The Service)**
- Performs geospatial computations on attestation UIDs or raw geometry
- Operations: distance, contains, intersects, within, buffer, etc.
- Simple, composable functions (NOT custom stored policies)
- Stateless computation service

**Policy Results (Output)**
- Signed EAS attestations containing computation results
- Developer specifies offchain or onchain submission
- Schema question to resolve: single universal schema vs. multiple schemas
- Service holds signing keys to attest to results

## What Already Exists
- Location Protocol data model & schema (EAS-based)
- SDK for interacting with the system
- Onchain registry (EAS contracts)
- API indexer (OGC API Features conformant) for spatial queries
- Plans for location verification/proofs

## Developer Experience (MVP)
```javascript
// 1. Query for locations if needed (existing API)
const places = await api.query({ filter: ... })

// 2. Evaluate policy (new service)
const result = await policyEngine.evaluate({
  operation: 'distance',
  inputs: [uid1, uid2],
  submitOnchain: false
})

// 3. Use result (it's a signed EAS attestation)
// Offchain: use result.data directly
// Onchain: submit result attestation to contract
```

## MVP Constraints
- Centralized service (trust the operator)
- No query integration in policy engine (devs orchestrate separately)
- Defer verification (AVS/ZK/TEE) until after validation
- Focus on clarity and developer experience
- Web3 native, geospatial-friendly

## Open Questions
1. Output schema design (single vs. multiple)
2. Which geospatial operations to support first
3. Input/output API format
4. Signature scheme details
