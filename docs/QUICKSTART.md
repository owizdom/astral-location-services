# Quickstart: Build a Location-Gated NFT

<aside>
<img src="/icons/science_yellow.svg" alt="/icons/science_yellow.svg" width="40px" />

**Note:** This is a conceptual sketch to demonstrate the flow of Astral Location Services. Code samples are illustrative and not production-ready. We're building this MVP now and would love your feedback!

</aside>

Build your first location-based smart contract. In this guide, you'll create an NFT that can only be minted by people physically at the Eiffel Tower — verified with Astral location proofs.

## What You'll Learn

- Collect [location stamps](https://docs.astral.global/location-proofs/plugins/) — evidence to corroborate a location claim — from mobile devices
- Submit location proofs to Astral Location Services for verification
- Gate smart contract execution based on verified location + geospatial policy
- Use EAS resolvers for atomic location-gated actions

## Prerequisites

```bash
npm install @decentralized-geo/astral-sdk @turf/turf ethers
```

You'll need:

- A wallet with some imaginary testnet ETH (this isn’t built yet!)
- Basic knowledge of TypeScript and Solidity
- 10 minutes

---

## Step 1: Set Up the Canonical Location

First, create a permanent, signed location attestation for the Eiffel Tower that everyone can reference.

```tsx
import { AstralSDK } from '@decentralized-geo/astral-sdk';
import { ethers } from 'ethers';

// Connect your wallet
const provider = new ethers.JsonRpcProvider('<https://sepolia.imaginary-eth.org>');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Initialize Astral SDK
const astral = new AstralSDK({
  signer: wallet,
  chainId: 84532  // Imaginary Sepolia
});

// Define the Eiffel Tower as a point
const eiffelTowerLocation = {
  type: 'Point',
  coordinates: [2.2945, 48.8584]  // [longitude, latitude]
};

// Create a location attestation
const eiffelTower = await astral.location.create(eiffelTowerLocation, {
  submitOnchain: true,
  metadata: {
    name: "Eiffel Tower",
    description: "Iconic Paris landmark",
    address: "Champ de Mars, Paris, France"
  }
});

console.log('Eiffel Tower UID:', eiffelTower.uid);
// Save this UID - it's a permanent reference to this location

```

**What happened:** You created a signed attestation stored onchain. Anyone can now reference the Eiffel Tower by UID instead of hardcoding coordinates.

---

## Step 2: User Experience - Show Real-Time Distance

When a user opens your app, give them instant feedback using **Turf.js** (client-side, unverified, free).

```tsx
import * as turf from '@turf/turf';

// User's current location (from navigator.geolocation or mobile SDK)
const userCoords = {
  type: 'Point',
  coordinates: [2.2951, 48.8580]  // Unverified GPS reading
};

// Calculate distance locally (instant)
const distanceKm = turf.distance(
  eiffelTowerLocation,
  userCoords,
  { units: 'kilometers' }
);

console.log(`You are ${distanceKm.toFixed(2)}km from the Eiffel Tower`);

// Show user feedback
if (distanceKm > 0.5) {
  alert(`Keep going! ${distanceKm.toFixed(2)}km to go.`);
} else {
  alert('You're close! Start collecting location stamps to claim your NFT.');
}

```

**Why Turf?** Instant, free, great for UX. But you can't trust it for minting — the user could spoof GPS. 

That's where location proofs come in.

---

## Step 3: Collect Location Stamps

When ready to claim, the user collects **location stamps** — corroborative evidence from multiple proof-of-location systems. [Stacking evidence makes location proofs harder to forge](https://collective.flashbots.net/t/towards-stronger-location-proofs/5323).

```tsx
// Collect location stamps from device plugins (future feature)
const locationStamps = await astral.stamps.collect({
  plugins: [
    'gps-timeseries',      // Multiple GPS readings over time
    'accelerometer',       // Movement patterns
    'nfc-eiffel-tower'     // NFC tag scan at physical location
  ],
  duration: 30000  // Collect for 30 seconds
});

console.log('Location stamps collected:', locationStamps);
// {
//   'gps-timeseries': { readings: [...], confidence: 0.92 },
//   'accelerometer': { patterns: [...], confidence: 0.88 },
//   'nfc-eiffel-tower': { tagId: '0xabc...', timestamp: 1234567890 }
// }

```

**What are location stamps?**

- GPS time series: Multiple readings show movement/stability
- Accelerometer: Detects if phone is actually moving around
- NFC/QR scan: Physical proof-of-presence at the location

These stamps **corroborate** the location claim. Diverse stamps from different systems create stronger location proofs.

---

## Step 4: Submit to Astral for Verification + Computation

Send the location stamps to Astral Location Services. The service:

1. **Verifies the location proof** (analyzes stamps to see how well they corroborate the claim)
2. **Computes the geospatial policy** (is user within 500m of Eiffel Tower?)
3. **Signs a policy attestation** if both checks pass

```tsx
// Submit location claim with stamps (future feature)
const locationClaim = await astral.location.createWithProof({
  coordinates: userCoords.coordinates,
  stamps: locationStamps
});

console.log('Location claim submitted:', locationClaim.uid);

// Compute proximity policy WITH automatic EAS submission
const result = await astral.compute.within(
  locationClaim.uid,      // User's verified location
  eiffelTower.uid,        // Canonical Eiffel Tower location
  500,                    // 500 meters radius
  {
    submitOnchain: true,          // Auto-submit to EAS
    schema: RESOLVER_SCHEMA_UID,  // Your resolver schema (defined below)
    recipient: wallet.address     // Who gets the NFT
  }
);

// Behind the scenes:
// 1. Astral analyzes location stamps → verifies authenticity
// 2. Astral computes distance to Eiffel Tower
// 3. Astral signs policy attestation: "User was within 500m at time T"
// 4. SDK submits attestation to EAS
// 5. EAS calls your resolver contract
// 6. Resolver mints NFT if policy passed

console.log('Policy attestation created:', result.uid);
console.log('NFT minted! 🎉');

```

**Key insight:** The service does **both** location proof verification (checking stamps) and geospatial computation (proximity check). The signed result proves both happened correctly. These processes can be unbundled.

**Offchain flexibility:** You could also call `submitOnchain: false` to get a signed offchain location proof or policy attestation, or in ZK proofs later. The signature proves Astral verified everything — no need to submit to EAS immediately.

---

## Step 5: The Smart Contract (EAS Resolver)

Your resolver contract gates NFT minting based on the policy attestation.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract EiffelTowerNFT is SchemaResolver, ERC721 {
    address public astralSigner;        // Astral's known signer address
    bytes32 public eiffelTowerUID;      // Canonical location UID
    uint256 public nextTokenId = 1;

    mapping(address => bool) public hasMinted;

    constructor(
        IEAS eas,
        address _astralSigner,
        bytes32 _eiffelTowerUID
    )
        SchemaResolver(eas)
        ERC721("Eiffel Tower Visitor", "EIFFEL")
    {
        astralSigner = _astralSigner;
        eiffelTowerUID = _eiffelTowerUID;
    }

    function onAttest(
        Attestation calldata attestation,
        uint256 /*value*/
    ) internal override returns (bool) {
        // 1. Verify attestation is from Astral
        require(attestation.attester == astralSigner, "Not from Astral");

        // 2. Decode the policy result
        (
            bool policyPassed,
            uint256 distance,
            bytes32 checkedLocationUID
        ) = abi.decode(attestation.data, (bool, uint256, bytes32));

        // 3. Verify correct location was checked
        require(checkedLocationUID == eiffelTowerUID, "Wrong location");

        // 4. Verify policy passed (within 500m)
        require(policyPassed, "Not close enough to Eiffel Tower");
        require(distance <= 500, "Must be within 500m");

        // 5. Ensure user hasn't already claimed
        require(!hasMinted[attestation.recipient], "Already minted");

        // 6. Mint NFT atomically
        hasMinted[attestation.recipient] = true;
        _mint(attestation.recipient, nextTokenId++);

        return true;  // Allow attestation
    }

    function onRevoke(Attestation calldata, uint256)
        internal pure override returns (bool) {
        return false;  // Don't allow revocation
    }
}

```

**Deploy and register schema:**

```tsx
// Deploy resolver
const Resolver = await ethers.getContractFactory("EiffelTowerNFT");
const resolver = await Resolver.deploy(
  EAS_ADDRESS,
  ASTRAL_SIGNER_ADDRESS,
  eiffelTower.uid
);
await resolver.deployed();

// Register schema with EAS
const schemaRegistry = new SchemaRegistry(SCHEMA_REGISTRY_ADDRESS);
const schema = "bool policyPassed,uint256 distance,bytes32 locationUID";

const tx = await schemaRegistry.register(
  schema,
  resolver.address,
  true  // revocable
);
const receipt = await tx.wait();

const RESOLVER_SCHEMA_UID = receipt.events[0].args.uid;
console.log('Schema UID:', RESOLVER_SCHEMA_UID);
// Use this UID when calling astral.compute.within() above

```

---

## The Complete Flow

```tsx
import { AstralSDK } from '@decentralized-geo/astral-sdk';
import * as turf from '@turf/turf';

const astral = new AstralSDK({ signer: wallet });

// 1. Create canonical location (one-time setup)
const landmark = await astral.location.create(landmarkGeoJSON, {
  submitOnchain: true
});

// 2. User opens app - instant feedback with Turf
const distance = turf.distance(userCoords, landmarkGeoJSON);
console.log(`${distance}km away - keep going!`);

// 3. User arrives - collect location stamps (future feature)
const stamps = await astral.stamps.collect({
  plugins: ['gps-timeseries', 'accelerometer', 'nfc-station']
});

// 4. Create verified location claim (future feature)
const claim = await astral.location.createWithProof({
  coordinates: userCoords.coordinates,
  stamps
});

// 5. Submit for verification + computation + onchain action
const result = await astral.compute.within(
  claim.uid,
  landmark.uid,
  500,
  {
    submitOnchain: true,
    schema: RESOLVER_SCHEMA_UID,
    recipient: userAddress
  }
);

// Done! Astral verified location → computed policy → signed attestation
//       → EAS called resolver → resolver minted NFT
console.log('NFT minted!', result.uid);

```

---

## Why This Works

**Location Proofs:** Multiple stamps corroborate the claim. Astral analyzes them for authenticity (time patterns, sensor consistency, physical tokens). The number and diversity of location stamps depends on the dev requirements — we don’t require any specific proof-of-location systems to be used.

**Geospatial Policy:** Astral computes the spatial relationship (distance, containment, etc.) using PostGIS. We have plans to decentralize this, perhaps as an AVS.

**Signed Attestation:** Astral's signature proves both verification and computation happened correctly.

**EAS Resolver:** Attestation creation triggers your business logic atomically. Permanent onchain record.

**Offchain Option:** You can also get signed results without submitting onchain—use in apps, ZK proofs, or submit later.

---

## What You Can Build

Now that you understand the pattern, here are some ideas:

**🌍 Local Currencies** - Geogated Uniswap pools (only swap if you're in the region)

**🏛️ Neighborhood DAOs** - Governance tokens only for local residents

**📦 Delivery Verification** - Release escrow when package proves it arrived at the right address

**🎮 Location-Based Games** - Capture territory, geocaching with tokens, AR treasure hunts

**🗳️ Proximity Voting** - Vote weight increases the closer you are to what's being decided

**🎪 Event POAPs** - Prove attendance at conferences, concerts, meetups

See [What You Can Build](./WHAT-YOU-CAN-BUILD.md) for detailed examples with code.

---

## Next Steps

**Questions? Feedback?** We're building this in public and would love to hear from you. Open an issue or reach out!

**Location-based smart contracts open a new design space. What will you create?**