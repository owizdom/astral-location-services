# Astral Location Verification - Technical Specification

**Version:** 0.1.0 (Draft)
**Status:** Design Phase
**Last Updated:** 2025-02-04

---

## Table of Contents

1. [Overview](#overview)
2. [Conceptual Framework](#conceptual-framework)
3. [Architecture](#architecture)
4. [Data Models](#data-models)
5. [Plugin System](#plugin-system)
6. [Verification Flow](#verification-flow)
7. [SDK Design](#sdk-design)
8. [API Design](#api-design)
9. [EAS Schemas](#eas-schemas)
10. [Security Considerations](#security-considerations)
11. [Open Questions](#open-questions)
12. [Future Work](#future-work)

---

## Overview

### What This Is

The Astral Verification module provides **evidence-based verification of location claims**. The module consists of:

1. **Client SDK** — Collects location evidence on devices (mobile, server, IoT), builds signed location stamps, and bundles them into location proofs
2. **Verify Service** — TEE-hosted endpoint that evaluates evidence and returns a credibility assessment
3. **Integration** — Verified location proofs can serve as trusted inputs to the Geospatial Compute module

### Core Value Proposition

**Location stamps are evidence. Location claims are assertions. Location proofs bundle evidence with claims. Verification evaluates how well evidence supports the claim.**

| Component | Input | Output |
|-----------|-------|--------|
| Client SDK | Raw signals (sensors, network, documents) | Signed location stamps |
| Verify Service | Location proof (claim + stamps) | Credibility assessment |

### Relationship to Geospatial Compute

Location Verification is **upstream** of Geospatial Compute:

| Location Verification | Geospatial Compute |
|----------------------|-------------------|
| Evaluates evidence credibility | Computes spatial relationships |
| Input: location proof (claim + stamps) | Input: locations (claimed or verified) |
| Output: credibility assessment | Output: policy attestation |
| "How confident are we that X was at L?" | "Is A inside B?" |

Location proofs that pass verification can serve as **verified inputs** to geospatial operations, increasing trust in the computed results.

---

## Conceptual Framework

Drawing from [Towards Stronger Location Proofs](https://collective.flashbots.net/t/towards-stronger-location-proofs/5323), we adopt a **composable evidence model**:

```
Raw Signals → Location Stamps → Location Proofs → Credibility Assessments
```

### Key Concepts

**Location Claim** — An assertion about the timing and location of an event. The event could be: a person's presence, a transaction's origin, an asset's location, a delivery, etc. Claims conform to the [Location Protocol](https://github.com/DecentralizedGeo/location-protocol-spec) specification.

**Location Stamp** — Evidence from a proof-of-location system that can corroborate a location claim. Stamps are **independent of claims** — they provide evidence about the timing and location of an event, which may come from:
- **Direct observation**: Sensor data, network measurements, hardware attestation
- **Indirect/derived sources**: Documents, records, institutional attestations

**Location Proof** — A stamp (or collection of stamps) bundled with a location claim. This is the verifiable artifact submitted for evaluation.

**Verification (Evidence Evaluation)** — The process of evaluating whether stamps support a claim. This is a **probabilistic assessment**, not a simple geometric intersection. The output is a **credibility assessment** quantifying confidence.

### Uncertainty Model

Location proofs inherently involve uncertainty in both space and time. Verification asks: *Given this evidence, what is the probability that the claimed event occurred within the claimed spatiotemporal bounds?*

The tradeoff: **larger bounds = higher confidence, lower precision**. A claim of "somewhere in California during 2024" is easier to verify with high confidence but less useful. A claim of "within 10m at 14:32:07" is precise but harder to verify confidently.

Applications decide what precision/confidence balance they need. Broader claims may be valuable for privacy preservation.

### Forgery Resistance Principle

> **The cost of forging a location proof should exceed the economic value of the transaction it underpins.**

This is application-specific. A proof for a $10 check-in reward needs less forgery resistance than a proof for a $10M land title transfer. The credibility assessment helps applications make this determination.

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT DEVICE                              │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                      ASTRAL SDK + PLUGIN                          │ │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐             │ │
│  │  │   Collect   │ → │   Create    │ → │    Sign     │             │ │
│  │  │  (signals)  │   │  (stamp)    │   │ (device key)│             │ │
│  │  └─────────────┘   └─────────────┘   └─────────────┘             │ │
│  │        ↑                                     │                    │ │
│  │   Plugin A (ProofMode)                       │                    │ │
│  │   Plugin B (WitnessChain)                    │                    │ │
│  │   Plugin C (future...)                       ↓                    │ │
│  │                                    ┌─────────────────┐            │ │
│  │                                    │ Location Stamp  │            │ │
│  │                                    └────────┬────────┘            │ │
│  └─────────────────────────────────────────────┼─────────────────────┘ │
│                                                │                       │
│                            ┌───────────────────┴───────────────────┐   │
│                            │          Location Proof               │   │
│                            │   (Location Claim + Stamp(s))         │   │
│                            └───────────────────┬───────────────────┘   │
└────────────────────────────────────────────────┼───────────────────────┘
                                                 │
                                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           ASTRAL TEE SERVICE                            │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                         VERIFY MODULE                             │ │
│  │  ┌──────────────┐   ┌──────────────┐   ┌────────────────────────┐│ │
│  │  │ Verify Each  │ → │ Assess vs    │ → │ Assess Cross-          ││ │
│  │  │    Stamp     │   │    Claim     │   │ Correlation            ││ │
│  │  └──────────────┘   └──────────────┘   └────────────────────────┘│ │
│  │         │                                          │              │ │
│  │         ↓                                          ↓              │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │              Credibility Assessment                         │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                              │                                    │ │
│  │                              ↓                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │            Verified Location Proof (EAS)                    │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     GEOSPATIAL COMPUTE MODULE                     │ │
│  │            (consumes verified or unverified locations)            │ │
│  │                              │                                    │ │
│  │                              ↓                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │                Policy Attestation (EAS)                     │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

```mermaid
flowchart TB
    subgraph Client["Client Device"]
        subgraph SDK["Astral SDK + Plugin"]
            Collect["Collect\n(signals)"] --> Create["Create\n(stamp)"]
            Create --> Sign["Sign\n(device key)"]
            Sign --> Stamp["Location Stamp"]
        end
        Stamp --> Proof["Location Proof\n(Claim + Stamps)"]
    end

    subgraph TEE["Astral TEE Service"]
        subgraph Verify["Verify Module"]
            VerifyStamp["Verify Each\nStamp"] --> AssessClaim["Assess vs\nClaim"]
            AssessClaim --> CrossCorr["Assess Cross-\nCorrelation"]
            CrossCorr --> Credibility["Credibility\nAssessment"]
            Credibility --> VLP["Verified Location Proof\n(EAS Attestation)"]
        end

        subgraph Compute["Geospatial Compute Module"]
            ComputeOp["Spatial Operations"] --> Policy["Policy Attestation\n(EAS Attestation)"]
        end
    end

    Proof --> VerifyStamp
    VLP -.->|"optional input"| ComputeOp

    style SDK fill:#e1f5fe
    style Verify fill:#f3e5f5
    style Compute fill:#e8f5e9
    style VLP fill:#fff3e0
    style Policy fill:#fff3e0
```

### Key Architectural Decisions

1. **Proof = Claim + Stamp(s)** — A location proof bundles evidence (stamps) with an assertion (claim). This is the verifiable artifact.

2. **Three-phase verification** — (1) Verify each stamp independently, (2) Assess stamps against the claim, (3) Assess cross-correlation between stamps.

3. **Unified plugin interface** — One interface defines the full lifecycle (`collect`, `create`, `sign`, `verify`). Implementations vary by environment, but the contract is consistent.

4. **Distinct outputs** — Verify module outputs Verified Location Proofs. Compute module outputs Policy Attestations. These are different attestation types.

5. **Separation of concerns** — Verify is independent of Compute. Applications can use verification alone, or feed verified proofs into compute operations.

---

## Data Models

### LocationClaim

An assertion about the timing and location of an event. Conforms to [Location Protocol](https://github.com/DecentralizedGeo/location-protocol-spec) with additional fields.

```typescript
interface LocationClaim {
  // Subject of the claim (who/what was at the location)
  subject: SubjectIdentifier;

  // Location data per Location Protocol spec
  lp_version: string;           // "0.2"
  location_type: string;        // "geojson-point", "h3-index", etc.
  location: LocationData;       // Per Location Protocol
  srs: string;                  // Spatial reference system URI

  // Spatial uncertainty (optional, for point locations)
  radius?: number;              // meters

  // Temporal bounds
  time: {
    start: number;              // Unix timestamp (seconds)
    end: number;                // Unix timestamp (seconds)
  };

  // What event is being claimed
  event_type?: string;          // "presence", "transaction", "delivery", etc.
}
```

### SubjectIdentifier

The subject of a location claim. Extensible to support multiple identity systems.

```typescript
interface SubjectIdentifier {
  scheme: string;   // "eth-address" | "device-pubkey" | "did:web" | ...
  value: string;    // The actual identifier
}
```

For MVP: `scheme: "eth-address"` or `scheme: "device-pubkey"`.

### LocationStamp

Evidence from a proof-of-location system that can corroborate a location claim. Stamps are independent of claims.

```typescript
interface LocationStamp {
  // Plugin identification
  plugin: string;              // "proofmode" | "witnesschain" | ...
  version: string;             // Plugin version (semver)

  // Spatiotemporal footprint of the evidence
  spatial_footprint: GeoJSON.Geometry;  // Where evidence indicates
  temporal_footprint: {
    start: number;             // Unix timestamp (seconds)
    end: number;               // Unix timestamp (seconds)
  };

  // Plugin-specific evidence data
  signals: Record<string, unknown>;

  // Cryptographic binding
  signatures: Signature[];
}

interface Signature {
  signer: SubjectIdentifier;
  algorithm: string;           // "secp256k1" | "ed25519" | ...
  value: string;               // Hex-encoded signature
  timestamp: number;           // When signature was created
}
```

**Design notes:**
- `spatial_footprint` is a GeoJSON geometry (polygon, circle approximation, etc.), not a point
- `signals` contains plugin-specific evidence data — may be sensor readings, network measurements, or document extractions
- Multiple signatures support multi-party evidence (e.g., challenger attestations, institutional signatures)

### LocationProof

A stamp (or collection of stamps) bundled with a location claim. This is the artifact submitted for verification.

```typescript
interface LocationProof {
  claim: LocationClaim;
  stamps: LocationStamp[];     // One or more stamps
}
```

Single-stamp proofs are valid. Multi-stamp proofs enable cross-correlation analysis.

### CredibilityAssessment

The output of verification — a probabilistic assessment of how well evidence supports the claim.

```typescript
interface CredibilityAssessment {
  // Overall confidence (0-1)
  confidence: number;

  // Per-stamp verification results
  stamp_results: StampResult[];

  // Cross-correlation assessment (for multi-stamp proofs)
  correlation?: CorrelationAssessment;

  // Extensible dimensions (specific fields TBD)
  dimensions?: Record<string, number>;
}

interface StampResult {
  stamp_index: number;
  plugin: string;

  // Stamp-level checks
  signatures_valid: boolean;
  structure_valid: boolean;
  signals_consistent: boolean;

  // Assessment against claim
  supports_claim: boolean;
  claim_support_score: number;  // 0-1

  // Plugin-specific output
  plugin_result: Record<string, unknown>;
}

interface CorrelationAssessment {
  // Are stamps from independent systems?
  independence: number;         // 0-1, higher = more independent

  // Do stamps corroborate each other?
  agreement: number;            // 0-1, higher = better agreement

  // Notes
  notes: string[];
}
```

**Design notes:**
- Per-stamp results enable applications to reason about individual evidence sources
- Multi-stamp proofs from independent systems increase confidence (but redundant stamps from the same system don't add confidence — they simply don't subtract)
- The `dimensions` field is extensible for future confidence dimensions

### VerifiedLocationProof

The final output — an EAS attestation containing the proof and its credibility assessment.

```typescript
interface VerifiedLocationProof {
  // The original proof
  proof: LocationProof;

  // Verification result
  credibility: CredibilityAssessment;

  // Attestation metadata
  uid: string;
  attester: string;             // Astral service address
  timestamp: number;
  chain_id?: number;            // If submitted onchain
}
```

---

## Plugin System

### Plugin Interface

All verification plugins implement a unified interface. The same interface applies across environments; implementations differ.

```typescript
interface LocationProofPlugin {
  // Plugin metadata
  readonly name: string;        // "proofmode" | "witnesschain"
  readonly version: string;     // Semantic version

  // === Collection Phase (client-side) ===

  /**
   * Collect raw signals from the environment.
   * Implementation varies by device/platform.
   */
  collect(options?: CollectOptions): Promise<RawSignals>;

  /**
   * Process raw signals into an unsigned stamp.
   * Determines spatial/temporal footprint from signals.
   */
  create(signals: RawSignals): Promise<UnsignedStamp>;

  /**
   * Sign the stamp with device/node key.
   */
  sign(stamp: UnsignedStamp, signer: Signer): Promise<LocationStamp>;

  // === Verification Phase (server-side) ===

  /**
   * Verify a stamp's internal validity.
   * Checks signatures, structure, signal consistency.
   */
  verify(stamp: LocationStamp): Promise<StampVerificationResult>;

  /**
   * Assess how well a stamp supports a claim.
   * Probabilistic evaluation, not geometric intersection.
   */
  assess(stamp: LocationStamp, claim: LocationClaim): Promise<ClaimAssessment>;
}
```

### Environment Considerations

The plugin interface is environment-agnostic. In practice:

| Method | Mobile (ProofMode) | Server (WitnessChain) |
|--------|-------------------|----------------------|
| `collect()` | Hardware attestation, sensors | UDP ping, challenger network |
| `create()` | Fuse attestation data → region | Aggregate latencies → region |
| `sign()` | Device key (TEE-backed) | Node key, challenger sigs |
| `verify()` | Runs on TEE | Runs on TEE |
| `assess()` | Runs on TEE | Runs on TEE |

Collection methods may throw "not supported" in environments where they don't apply. Verification always runs server-side (TEE).

### MVP Plugins

**ProofMode** (priority)
- Type: Device attestation + sensor fusion
- Environment: Mobile (React Native / native)
- Evidence: Hardware attestation (Secure Enclave/TEE), sensor fusion
- Trust model: Device integrity, tamper-evident packaging

**WitnessChain** (secondary)
- Type: Infrastructure location proof
- Environment: Server/node
- Evidence: UDP ping latencies from challenger network
- Trust model: Physical network constraints (speed of light), cryptoeconomic security

Each plugin must document its own threat model and trust assumptions (see [Security Considerations](#security-considerations)).

---

## Verification Flow

### Single-Stamp Verification

```
1. Receive: LocationProof (claim + single stamp)
2. Load plugin for stamp.plugin
3. Verify stamp internally:
   a. plugin.verify(stamp)
   b. Check signatures valid
   c. Check structure valid
   d. Check signals internally consistent
4. Assess stamp against claim:
   a. plugin.assess(stamp, claim)
   b. Probabilistic evaluation of support
5. Generate CredibilityAssessment
6. Create VerifiedLocationProof attestation
7. Return VerifiedLocationProof
```

### Multi-Stamp Verification

```
1. Receive: LocationProof (claim + multiple stamps)
2. For each stamp (in parallel):
   a. Verify stamp internally
   b. Assess stamp against claim
   c. Collect StampResult
3. Cross-correlation analysis:
   a. Assess independence: Are stamps from different systems?
   b. Assess agreement: Do spatial/temporal footprints align?
   c. Note: Redundant stamps (same system) don't add confidence, but don't subtract either
4. Aggregate into CredibilityAssessment:
   a. Combine per-stamp results
   b. Weight by independence and agreement
   c. Compute overall confidence
5. Create VerifiedLocationProof attestation
6. Return VerifiedLocationProof
```

### Confidence Calculation (Conceptual)

```
confidence = f(
  stamp_validity[],        // Did each stamp pass internal verification?
  claim_support_scores[],  // How well does each stamp support the claim?
  independence,            // Are evidence sources uncorrelated?
  agreement                // Do sources agree with each other?
)
```

Key principle: **Independent, corroborating evidence increases confidence. Redundant evidence from the same system neither adds nor subtracts.**

---

## SDK Design

### Namespace

```typescript
// Stamp collection (client SDK)
astral.stamps.collect(plugin, options)    // Collect signals
astral.stamps.create(plugin, signals)     // Create unsigned stamp
astral.stamps.sign(stamp, signer)         // Sign stamp

// Proof construction
astral.proofs.create(claim, stamps)       // Bundle claim + stamps

// Verification operations
astral.verify.stamp(stamp)                // Verify stamp internally (no claim)
astral.verify.proof(proof)                // Full verification against claim
```

### Example Usage

```typescript
import { astral } from 'astral-sdk';  // TODO: confirm package name

// === Client Side: Collect Evidence ===

// Collect signals using ProofMode plugin
const signals = await astral.stamps.collect('proofmode', {
  timeout: 5000
});

// Create and sign stamp
const unsigned = await astral.stamps.create('proofmode', signals);
const stamp = await astral.stamps.sign(unsigned, device_signer);

// === Create Location Proof ===

// Define the claim (Location Protocol format)
const claim = {
  subject: { scheme: 'eth-address', value: '0x...' },
  lp_version: '0.2',
  location_type: 'geojson-point',
  location: { type: 'Point', coordinates: [-122.4194, 37.7749] },
  srs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
  radius: 100,  // 100 meter uncertainty
  time: { start: Date.now() / 1000 - 60, end: Date.now() / 1000 },
  event_type: 'presence'
};

// Bundle into proof
const proof = astral.proofs.create(claim, [stamp]);

// === Submit for Verification ===

const result = await astral.verify.proof(proof);

console.log(result.credibility.confidence);  // 0.85
console.log(result.uid);                     // 0xabc123...
```

### Multi-Stamp Example

```typescript
// Collect from multiple plugins
const proofmode_stamp = await collect_and_sign('proofmode');
const witness_stamp = await collect_and_sign('witnesschain');

// Bundle into proof with multiple stamps
const proof = astral.proofs.create(claim, [proofmode_stamp, witness_stamp]);

// Verify multi-stamp proof
const result = await astral.verify.proof(proof);

// Access cross-correlation analysis
console.log(result.credibility.correlation.independence);  // 0.95 (different systems)
console.log(result.credibility.correlation.agreement);     // 0.88 (they agree)
console.log(result.credibility.confidence);                // Higher than single-stamp
```

---

## API Design

### Endpoints

**POST /verify/stamp**

Verify a stamp's internal validity (no claim assessment).

```typescript
// Request
{
  stamp: LocationStamp
}

// Response
{
  valid: boolean,
  signatures_valid: boolean,
  structure_valid: boolean,
  signals_consistent: boolean,
  plugin_result: Record<string, unknown>
}
```

**POST /verify/proof**

Full verification of a location proof against its claim.

```typescript
// Request
{
  proof: LocationProof,
  options?: {
    chain_id?: number,         // For attestation signing
    submit_onchain?: boolean   // Default: false
  }
}

// Response
{
  uid: string,
  credibility: CredibilityAssessment,
  proof: LocationProof,
  attester: string,
  timestamp: number
}
```

**GET /verify/plugins**

List available verification plugins.

```typescript
// Response
{
  plugins: [
    {
      name: 'proofmode',
      version: '0.1.0',
      environments: ['mobile'],
      description: 'Device-based location attestation with hardware attestation'
    },
    {
      name: 'witnesschain',
      version: '0.1.0',
      environments: ['server'],
      description: 'Infrastructure-based verification via challenger network'
    }
  ]
}
```

---

## EAS Schemas

### VerifiedLocationProof

EAS attestation for verified location proofs. Can be onchain or offchain.

```solidity
// Schema fields
bytes32 claim_hash             // Hash of the LocationClaim
bytes32 proof_hash             // Hash of the full LocationProof
uint8 confidence               // 0-100 (scaled from 0-1)
string credibility_uri         // URI to full CredibilityAssessment (IPFS, etc.)
```

**Design notes:**
- Offchain attestations are valid — no requirement to submit onchain
- `claim_hash` and `proof_hash` enable verification without storing full data onchain
- `confidence` is the headline number for simple checks
- Full credibility assessment stored offchain, referenced by URI

### Integration with Policy Attestations

Verified Location Proofs can be **referenced** by Policy Attestations when location inputs have been verified:

```typescript
// Policy Attestation with verified location input
{
  operation: 'contains',
  inputs: [
    { type: 'verified-location', ref_uid: '0x...' },  // VerifiedLocationProof
    { type: 'location', uid: '0x...' }                 // Standard location
  ],
  result: true
}
```

---

## Security Considerations

### Forgery Resistance Principle

> **The cost of forging a location proof should exceed the economic value of the transaction it underpins.**

Application developers must assess whether the credibility level meets their security requirements for the value at stake.

### Plugin Threat Model Template

Each plugin MUST document:

1. **Evidence type**: What signals does this plugin collect?
2. **Trust assumptions**: What must be true for the evidence to be trustworthy?
3. **Attack vectors**: How could an adversary forge this evidence?
4. **Forgery cost**: What resources would forgery require?
5. **Mitigations**: How does the plugin resist these attacks?

#### Example: ProofMode (Draft)

| Aspect | Description |
|--------|-------------|
| Evidence type | Hardware attestation, device sensors |
| Trust assumptions | Device TEE/Secure Enclave not compromised |
| Attack vectors | Device rooting, TEE exploitation, emulation |
| Forgery cost | Requires compromised device or TEE exploit |
| Mitigations | Hardware attestation, SafetyNet/DeviceCheck |

#### Example: WitnessChain (Draft)

| Aspect | Description |
|--------|-------------|
| Evidence type | UDP ping latencies from challenger network |
| Trust assumptions | Speed of light constraints; majority challengers honest |
| Attack vectors | Challenger collusion, network manipulation |
| Forgery cost | Cryptoeconomic (must corrupt staked challengers) |
| Mitigations | EigenLayer restaking, distributed challenger set |

### General Threat Model

| Threat | Mitigation |
|--------|------------|
| Replay attacks | **[NEEDS DESIGN]** — See Open Questions |
| Signature forgery | Standard cryptographic verification |
| Collusion | Economic disincentives, independent systems |
| TEE compromise | Defense in depth, multiple attestation sources |

---

## Open Questions

### Replay Protection

**Problem:** How do we prevent replay of valid stamps?

If stamps aren't published to a public registry, we can't check for duplicates. Options to explore:

1. **Temporal bounds**: Stamps expire after a short window
2. **Challenge-response**: Verifier provides nonce that must be included in stamp
3. **Stamp registry**: Publish stamp hashes to detect reuse
4. **Application-level**: Let applications track stamp usage

**Status:** Needs design work.

### Stamp/Claim/Proof as Attestations

**Question:** Should stamps and claims be EAS attestations themselves, or just data structures?

Current design: Only the final VerifiedLocationProof is an attestation. Stamps and claims are data structures within it.

**Trade-offs:**
- Attestations for everything: More composable, but more complexity and gas
- Current approach: Simpler, stamps are ephemeral evidence

**Status:** Current design seems reasonable for MVP. Revisit if composability needs arise.

### TEE Remote Attestation

**Question:** How does EigenCompute handle TEE remote attestations? Should we bundle them with verification output?

**Status:** Dependent on Eigen implementation. Deferred.

---

## Future Work

### Deferred for v1+

1. **TEE Remote Attestation** — Bundle EigenCompute remote attestation with verification output
2. **Additional Plugins** — Beacon networks, Galileo signed signals, peer witness, document verification
3. **Confidence Calibration** — Empirical tuning of confidence calculations
4. **Onchain Verification** — Solidity verifier for credibility proofs
5. **Privacy Preservation** — Zero-knowledge proofs for location without revealing exact position

### Plugin Development Tasks

1. **ProofMode Plugin** — Full implementation with documented threat model
2. **WitnessChain Plugin** — Integration research, challenger network interface

---

## References

- [Towards Stronger Location Proofs](https://collective.flashbots.net/t/towards-stronger-location-proofs/5323) — Flashbots Research
- [Location Protocol v0.2](https://github.com/DecentralizedGeo/location-protocol-spec/tree/v0.2-draft) — DecentralizedGeo
- [WitnessChain Documentation](https://witnesschain.com/docs)
- [ProofMode Documentation](https://proofmode.org)
- [Ethereum Attestation Service](https://docs.attest.org)
