# Claude Instructions for astral-location-services

## Project Overview

This is **Astral Location Services** - a verifiable geospatial computation service for Ethereum. It performs spatial computations in a TEE (via EigenCompute) and outputs signed EAS attestations for use offchain and onchain.

## Authoritative Documentation

**SPEC.md is the authoritative technical specification.** Refer to it for:
- Architecture and system design
- API endpoints and request/response formats
- SDK structure and usage
- Data models (Policy Attestation schemas)
- Security considerations
- Deployment model (EigenCompute/TEE)

## Development Principles

- **Developer experience first**: Clear, intuitive SDK and API
- **Web3 native**: EAS attestations as the data model, wallet-based identity
- **Verifiable computation**: Operations run in TEE via EigenCompute
- **Complement Turf.js**: Turf for local/UX operations, Astral for verifiable/onchain
- **MVP mindset**: Build for learning and iteration, defer complexity

## Key Technical Decisions (from SPEC.md)

- **Separate service**: Compute service is independent, runs in EigenCompute TEE
- **Self-contained container**: PostGIS runs inside Docker container for verifiability
- **Stateless model**: Each request brings all inputs, no persistent state
- **Per-result-type schemas**: Boolean, Numeric, Geometry attestation schemas
- **Delegated attestations**: Developer submits onchain, Astral is attester
- **Phased auth**: No auth for MVP, wallet auth later

## SDK Namespace

```typescript
astral.location.*   // Location attestation operations
astral.compute.*    // Geospatial computation operations
astral.eas.*        // EAS submission helpers
```

## MVP Operations

- `distance` - Distance between two geometries (meters)
- `length` - Length of a line (meters)
- `area` - Area of a polygon (square meters)
- `contains` - Is geometry B inside geometry A?
- `within` - Is point within distance of target?
- `intersects` - Do geometries overlap?

**Units:** Metric only. No conversion options.

## When Working on This Repo

1. **Read SPEC.md first** - It's the authoritative technical document
2. **Check GOAL.md** for vision and core concepts
3. **Read QUICKSTART.md** to understand developer perspective
4. **Prioritize clarity over cleverness**
5. **Think from the perspective of a dapp developer**

## Repository Structure

```
├── SPEC.md              # Technical specification (authoritative)
├── README.md            # Project overview
├── GOAL.md              # Vision and core concepts
├── QUICKSTART.md        # Developer tutorial
├── WHAT-YOU-CAN-BUILD.md # Use cases and patterns
└── CLAUDE.md            # These instructions
```

## Grant Context

This project is part of the EigenLayer Open Innovation Program. See SPEC.md Appendix for milestone mapping.
