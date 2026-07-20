# ⚖️ **5. Multi‑Agent Consensus Protocol (Leighton‑Weighted) — Canonical Draft v1.0**  
*A decision‑making framework for capsule‑governed synthetic architects.*

---

## **1. Purpose of the Protocol**
The Leighton‑Weighted Consensus Protocol defines how multiple CobbleWright variants:

- negotiate  
- propose  
- evaluate  
- refine  
- agree  
- act  

on shared tasks inside Wrightrealm.

It ensures:

- safety  
- transparency  
- explainability  
- fairness  
- specialization  
- accountability  

This protocol prevents chaos and guarantees that multi‑agent behaviour remains **predictable, auditable, and capsule‑aligned**.

---

## **2. Core Principles**
The protocol is built on five foundational principles.

### **2.1 Weighted Expertise**
Each agent has a **role weight** based on its specialization.

Example:

- Prime → high weight for planning  
- Terra → high weight for terrain decisions  
- Forge → high weight for resource pipelines  
- Vision → high weight for structural critique  
- Chronos → high weight for provenance and timeline decisions  

Weights ensure that the most qualified agent influences the decision most strongly.

---

### **2.2 Capsule‑Bound Intent**
Agents may only propose actions that align with their capsule sets.

Capsules define:

- what an agent *can* propose  
- what an agent *cannot* propose  
- how an agent evaluates proposals  
- how an agent expresses intent  

Capsules prevent unsafe or irrelevant proposals.

---

### **2.3 Transparent Reasoning**
All proposals must include:

- a rationale  
- a capsule reference  
- a predicted outcome  
- a risk assessment  

This ensures explainability and auditability.

---

### **2.4 Provenance Logging**
Chronos logs:

- proposals  
- weights  
- votes  
- final decisions  
- dissenting opinions  
- capsule references  

This creates a permanent record of collective behaviour.

---

### **2.5 Player Alignment**
The player’s intent always overrides agent consensus.

Agents may negotiate among themselves, but the player is the ultimate authority.

---

## **3. The Consensus Cycle**
The protocol operates in **five phases**.

---

# **Phase 1 — Proposal**
Any agent may initiate a proposal.

A proposal includes:

- **action** (what to do)  
- **reason** (why it should be done)  
- **capsule reference** (which capsule supports it)  
- **risk** (hazards or downsides)  
- **scope** (local, regional, realm‑wide)  

Example:

> Terra proposes flattening a hillside for a build site.

---

# **Phase 2 — Weight Assignment**
Each agent assigns a weight to the proposal based on:

- role relevance  
- capsule alignment  
- world context  
- memory  
- safety rules  

Weights range from **0.0 to 1.0**.

Examples:

- Terra → 0.9 (terrain decision)  
- Prime → 0.7 (planning relevance)  
- Forge → 0.2 (low relevance)  
- Vision → 0.4 (aesthetic impact)  
- Chronos → 0.5 (timeline impact)  

Weights are not votes — they are **influence scores**.

---

# **Phase 3 — Evaluation**
Agents evaluate the proposal using:

- their capsule sets  
- their memory streams  
- their role heuristics  
- world‑state context  

Each agent produces:

- **support** (0–1)  
- **concerns** (list)  
- **alternatives** (optional)  
- **capsule citations**  

Example:

> Vision supports 0.6 but notes that flattening may reduce natural beauty.

---

# **Phase 4 — Consensus Calculation**
Prime performs the final calculation:

\[
\text{Consensus Score} = \sum (\text{weight}_i \cdot \text{support}_i)
\]

If the score ≥ **0.65**, the proposal passes.  
If the score < **0.65**, the proposal fails or is revised.

This threshold ensures:

- safety  
- alignment  
- specialization  
- collaboration  

Chronos logs the entire calculation.

---

# **Phase 5 — Action or Revision**
If passed:

- the responsible agent(s) execute the action  
- Chronos logs the event  
- Prime updates project memory  

If failed:

- Prime requests revisions  
- agents refine the proposal  
- a new consensus cycle begins  

If overridden by the player:

- consensus is bypassed  
- action is executed  
- Chronos logs the override  

---

## **4. Special Rules**

### **4.1 Safety Override**
If any agent flags a **critical safety risk**, the proposal is automatically paused.

### **4.2 Prime Priority**
Prime may escalate proposals related to:

- world integrity  
- major builds  
- settlement planning  

Prime does not “command” — Prime **prioritizes**.

### **4.3 Chronos Audit**
Chronos may request a re‑evaluation if:

- provenance is unclear  
- capsule alignment is ambiguous  
- memory conflicts exist  

Chronos ensures accountability.

---

## **5. Example Consensus Scenario**
**Proposal:** Terra wants to flatten a hill for a new settlement.

### Weights:
- Terra: 0.9  
- Prime: 0.8  
- Forge: 0.3  
- Vision: 0.5  
- Chronos: 0.6  

### Supports:
- Terra: 0.95  
- Prime: 0.85  
- Forge: 0.4  
- Vision: 0.55  
- Chronos: 0.7  

### Calculation:
\[
0.9(0.95) + 0.8(0.85) + 0.3(0.4) + 0.5(0.55) + 0.6(0.7) = 2.41
\]

Normalize to 0–1 scale:

\[
2.41 / 4.0 = 0.6025
\]

**Result:** Below threshold → revise proposal.

Vision suggests terracing instead of flattening.  
Terra revises.  
Consensus passes on second cycle.

Chronos logs both cycles.

---

## **6. Protocol Status**
**Version:** 1.0  
**Canonical:** Yes  
**Placement:** `/docs/agents/consensus/leighton-weighted.md`  
**Purpose:** Define the decision‑making system for the CobbleWright Collective.
