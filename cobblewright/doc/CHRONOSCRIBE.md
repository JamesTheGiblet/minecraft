# ChronoSCRIBE in CobbleWright

ChronoSCRIBE is CobbleWright's append-only audit/provenance layer.

It records high-value runtime events (commands, advice generation, memory persistence, learning profile saves) into a signed hash chain so integrity can be verified later.

## What It Guarantees

- Authenticity: each record is signed with Ed25519.
- Integrity: each record links to the previous record via `prev_hash`.
- Tamper detection: changing one record breaks the chain from that point onward.

ChronoSCRIBE does not provide encryption/confidentiality by itself.

## Storage

ChronoSCRIBE stores data in:

- `cobblewright/data/chronoscribe/ledger.ndjson` (append-only records)
- `cobblewright/data/chronoscribe/state.json` (head pointer and sequence)
- `cobblewright/data/chronoscribe/ed25519_keypair.json` (local signing keypair, if not supplied via config)

## Configuration

Add to `config.json`:

```json
{
  "CHRONOSCRIBE_ENABLED": true,
  "CHRONOSCRIBE_KEY_ID": "cobblewright-ed25519-v1",
  "CHRONOSCRIBE_MAX_PAYLOAD_CHARS": 5000
}
```

Optional external keys:

- `CHRONOSCRIBE_PRIVATE_KEY_PEM`
- `CHRONOSCRIBE_PUBLIC_KEY_PEM`

If those are set, ChronoSCRIBE uses them instead of generating/storing a local keypair.

## Chat Commands

- `audit` or `verify`: verify chain integrity and signature validity.
- `audit path`: show the local ledger file path.

## Boot Attestation

On bot login, ChronoSCRIBE writes a `session_genesis` anchor record for session provenance.
