🧠 16. Wright Universe Memory Architecture (Canonical Draft v1.0)
/docs/universe/memory-architecture.md

1. Purpose
Define how memory is stored, partitioned, retrieved, and shared across agents and realms.

2. Memory Types
2.1 Agent Memory
role‑specific

short‑term + long‑term

stored in pgvector

used for reasoning

2.2 Realm Memory
world‑specific

structural history

settlement records

terrain changes

2.3 Universal Memory
cross‑realm

capsule versions

Collective history

provenance summaries

3. Memory Rules
Prime manages canonical memory

Chronos manages provenance memory

Variants manage role memory

No memory deletion — only append

4. Memory Flow
Agent observes

Capsule filters

Memory stored

Prime integrates

Chronos logs

Variants retrieve

5. Cross‑Realm Memory
Allowed only when:

capsule rules permit

provenance is clear

memory is safe

Prime approves