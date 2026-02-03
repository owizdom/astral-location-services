# Astral Location Verification - Technical Specification

**Version:** 0.1.0 (Draft)
**Status:** Design Phase
**Last Updated:** 2025-02-02

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Plugin System](#plugin-system)
4. [Data Models](#data-models)
5. [SDK Design](#sdk-design)
6. [Verification Plugins](#verification-plugins)
7. [Trust Model](#trust-model)
8. [Evidence Aggregation](#evidence-aggregation)
9. [API Design](#api-design)
10. [Security Considerations](#security-considerations)

---

## Overview

### What This Is

The Astral Verification module provides **cryptographic verification of location proofs** from multiple sources. This module includes:


- An SDK or sidecar to install in the client (consumer device like phone or computer, or on a server). This collects location evidence and builds an unverified location proof (referred to as location evidence in the flashbots forum post below)
- The Verify endpoint sits alongside the Compute module on the hosted TEE, and analyzes location evidence to return an assessment of whether the location proof is credible (a credibility vector)
- Verify can be invoked separately, or automatically invoked prior to passing the location proof into the Compute module

There are multiple components, and the client SDK is particularly complex, since different plugin combinations will be useful in different devices and environments. 

Our goal is to build a prototype that we feel will support multiple plugins, but we don't need a hardened v1. 

### Conceptual Framework

Drawing from [Towards Stronger Location Proofs](https://collective.flashbots.net/t/towards-stronger-location-proofs/5323, aka https://raw.githubusercontent.com/AstralProtocol/research/refs/heads/main/docs/towards-harder-location-proofs.md), we adopt a **composable evidence model**:

```
Raw Signals → Cryptographic Stamps → Evidence Bundles → Verified Location Attestations
```

Each verification plugin processes different types of location evidence:
- **Infrastructure proofs** (i.e. WitnessChain): Physical network verification
- **Device proofs** (i.e. ProofMode): Sensor data + cryptographic binding
- **Future**: Civic, beacon, satellite, peer witness, etc.

### Core Value Proposition

Client SDK
- **Input:** Signals, processed into location stamps
- Signed by the client device, and possibly by other devices in the PoL system (depends on the plugin)
- **Output:** Signed location stamps, composed into a multifactor evidence bundle (what I'm calling an unverified location proof), ready for verification. Plus a location claim. It's unclear how location stamps relate to a location claim: I think that this relationship is only tested in the verification process, not on the edge device.

Verify module, a compute service running in the Astral TEE. 
- **Input:** Location claim + unverified locationproof, which includes evidence data (from various sources)
- **Processing:** Verification via pluggable providers (WitnessChain, ProofMode, etc.). Key point: verification assesses the trustworthiness of each stamp independently, AND how they relate to / corroborate each other. (Read https://raw.githubusercontent.com/AstralProtocol/research/refs/heads/main/docs/towards-harder-location-proofs.md) 
- **Output:** VerifiedLocationProof (EAS format) with credibility vector and verifiable references to input artifacts and remote attestations from the TEE.

### Design Principles

- **Plugin architecture:** Clean separation, standard interface
- **Composable evidence:** Multiple proofs strengthen confidence
- **Application-specific trust:** Verification metadata enables custom trust policies
- **Cryptographic verifiability:** All proofs include cryptographic commitments, though not all evidence will be cryptographically verifiable... sometimes signatures are only created on the client device. Depends on the PoL system. 
- **Forgery resistance:** As a design principle, the cost of faking evidence should exceed potential gains. This will be up to application developers to implement, though we can make recommendations. For now, we are just focused on getting one location proof plugin for consumer devices (ProofMode) and one for infrastructure devices (WitnessChain, if we can figure it out).

---

## Architecture

### System Overview

```
(deleted this so you wouldn't be misled, we need to think about what architecture makes sense. it should be pretty clear from the above description)
```

### Integration with Existing Architecture

The Verify module extends the existing Astral architecture:

```
astral.location.*  → Create/query location attestations (existing)
astral.verify.*    → Verify location proofs (new)
astral.compute.*   → Geospatial computations (existing, and some pathways might call astral.verify.*)
```

**Workflow:**

1. **Collect proof data** - App uses Astral SDK / plugin to gather location stamps from user/device
2. **Verify proof** - `astral.verify(proofData)`, with plugin type and version specified in the proof data. proofData might be an array of location stamps. We sort of scouted this out in v0.1 of the Location Protocol spec (recipeType, recipe), but I would like to rethink this from first principles. How does this look? Is it embedded in a location attestation, or is it a separate artifact, perhaps with a refUID pointing at a location attestation with the claimed location? Also we need to be explicit about the subject of the location claim (haven't figured this out ... some kind of device / human identifier or something?), the error / area (we can't prove something happened at a point, it always needs to be in some zone or vicinity, I think), time interval (is this a requirement? I think so ...) etc etc etc. 
3. **Get VerifiedLocationProof** - An attestation signed by the Astral key with verification metadata — the credibility vector from https://raw.githubusercontent.com/AstralProtocol/research/refs/heads/main/docs/towards-harder-location-proofs.md
4. **Use in computations** - Pass verified UID or raw signed VerifiedLocationProof to `astral.compute.*`. (Question: can we just pass an unverified location proof, and the compute service intelligently verifies it before passing it into the compute step??) Also as a side note, note that the Compute endpoint doesn't REQUIRE location proofs, but they can be used to improve the trustworthiness of the results. (otherwise locations are just claimed, not evidence-based ... see what I mean??)
5. **Return signed attestation; dev can optionally submit onchain** - Use in resolvers requiring verified locations

### Key Architectural Decisions

1. **Separate Verification Service:** Verification runs independently; can be called from Compute service

2. **Plugin-Based:** Each plugin provider is a self-contained plugin with standard interface. This defines a way to collect and structure evidence from the relevant proof-of-location system, plus security model, attack vectors, cost of forgery, how it relates to other systems, etc. We need to figure out exactly what the plugin does. On the client, it'll be something like `collect` -> something about processing observables into a location stamp → signing the stamp. Those stamps can then be composed into a multi-stamp unverified location proof. (A single-stamp proof is also valid.) The plugin also needs to have a `verify` method that takes an unverified location stamp and verifies it. We will have the verify method also running on the server side.... and on server side we will have multi-stamp evidence evaluation as well ... 

3. **Attestation-Centric:** All verification results are EAS attestations, enabling composability and onchain interaction

4. **Evidence Aggregation:** Multiple *uncorrelated* (or loosely correlated) stamps corroborating the same location claim create higher-confidence attestations

---

## Plugin System

### Plugin Interface

All verification plugins implement a standard interface:

```typescript
interface LocationProofPlugin {
  // Plugin metadata
  name: string;                     // "witnesschain", "proofmode"
  version: string;                  // Semantic version

  // Collect
  collect
  // something to create the stamp
  // something to sign the stamp
  verify(
    claim: LocationClaim,
    stamp: StampData,
    options?: VerifyOptions
  ): Promise<VerificationResult>;
}
```

### Plugin Discovery and Registration

We should build an extensible plugin system that allows for dynamic loading and registration of plugins. This system should include mechanisms for plugin discovery, registration, and lifecycle management.

On launch we will only have one or two plugins: ProofMode and WitnessChain. These are useful in different contexts, so I'm not sure how much they'll be used together ...

### Plugin Lifecycle

We need to figure this out. Note that different methods are used in different contexts, and it might not make a ton of sense to have all of this built into the same SDK. What do you think?? 

---

## Data Models

### LocationClaim

The location claim being verified is a location record that conforms to v0.2 of the Location Protocol. We might need additional fields to quantify uncertainty or error radius, if for example the location is a point ... for the MVP of this I think we should use the simplest possible representation. 



### VerifiedLocationProof Schema

EAS schema for verified location attestations — what does this look like? My instinct is that it should be quite minimal, the credibility vector with different fields quantified(so really an object), plus refUIDs pointing at the evidence attestations and location claim ... idk we should think this through tbh.

Open question: how do we handle multifactor location proofs? Do we verify each one independently, and then assess how well they relate to each other? 

---

## SDK Design

### Namespace Structure

---

## Verification Plugins

### WitnessChain Plugin

**Type:** Infrastructure location proof

**Description:** WitnessChain provides physical network-based location verification through a decentralized watchtower (challenger) network. The protocol uses UDP ping latency triangulation to verify a prover's claimed location.

**How It Works:**
1. A **prover** (node/TEE) claims a geographic location
2. Multiple **challengers** (watchtowers) send UDP pings to the prover
3. Each challenger measures network latency and signs the result
4. Latency is correlated with physical distance to triangulate location
5. Results are cross-referenced with IP geolocation databases (ipapi, ipregistry, MaxMind)
6. A consolidated result indicates verification status

**Trust Model:**
- High trust (70-95 confidence)
- Physical presence required (latency cannot be faked to appear closer)
- Cryptoeconomic security (EigenLayer restaking)
- 75 registered AVS operators, 92,953 restakers, 2.3M ETH restaked
- AVS Contract: `0xd25c2c5802198cb8541987b73a8db4c9bcae5cc7`

**Actual Proof Structure needs to be verified (we're working on it):**

- github.com/AstralProtocol/location-proofs-research/blob/main/FINDINGS.md

---

### ProofMode Plugin

**Type:** Device attestation + sensor fusion

**Description:** ProofMode creates tamper-evident location proofs using device sensors, hardware attestation, and cryptographic binding. Originally for photojournalism, adapted for location verification.

- Device hardware attestation (TEE/Secure Enclave)
- Multi-sensor fusion (GPS + accelerometer + gyroscope)
- Blockchain timestamp anchoring
- Subject to device compromise (lower than infrastructure)

**Proof Structure:**

tbd, but they have an open source library, standard structure, etc.... 

---

## Trust Model

### Confidence Scoring

We have been batting around the idea of grading proofs from level 1 to level 5 or 7, where a L7 proof would require nation state-level resources to forge, whereas L1 proofs are easily forged (but would require collusion, technical manipulation or fraud to forge. This is a woolly and subjective measure, but it's my working definition. For example, a VPN is technical manipulation *outside the intended usage of a system*. So an IP-based location verification system would constitute a location proof, but it's a very very weak one ..

### Forgery Resistance

Per the Flashbots framework, forgery resistance requires:

> "The anticipated cost of faking all contributing signals should outweigh potential gains"

This needs to be quantified in some kind of rigorous and cross-comparable way. That said, for v0 we shouldn't overthink this. 



## References

- [Towards Stronger Location Proofs](https://collective.flashbots.net/t/towards-stronger-location-proofs/5323) - Flashbots Research
- [WitnessChain Documentation](https://witnesschain.com/docs)
- [ProofMode Documentation](https://proofmode.org)
- [Ethereum Attestation Service](https://docs.attest.org)
- [Location Protocol Spec](https://easierdata.org/updates/2025/2025-05-19-location-protocol-spec)
