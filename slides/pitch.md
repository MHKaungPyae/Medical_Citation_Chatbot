---
marp: true
paginate: true
transition: fade
# PechaKucha: 6 slides, 20s auto-advance. Do not change the count.
auto-advance: 20
---

<!-- slide 1 -->
# Who's my person?
<!-- 20s -->

**Anyone with a medical question.**

- Someone wondering "why do I have a rash after taking paracetamol with glucosamine?"
- A parent asking "is ibuprofen safe for my child's fever?"
- A patient wanting to understand the side effects of their medication

They don't need a doctor's appointment — they need **quick, cited, reliable answers** grounded in live medical data, not a chatbot's stale training set.

---

<!-- slide 2 -->
# Their problem
<!-- 20s -->

**Google gives links. ChatGPT gives hallucinations. Neither gives citations.**

- Medical information changes — FDA labels update, guidelines evolve
- AI models can't distinguish between current facts and outdated training data
- Most chatbots either reject medical questions entirely or answer without sources

People need an **explainable, generative answer** — one that tells them *what*, explains *why*, and shows *where* the information came from. No keyword gatekeeping, no hardcoded scripts.

---

<!-- slide 3 -->
# What I built
<!-- 20s -->

**Medical Citation Chatbot** — a generative RAG system that answers any medical question with live data.

```
User registers / logs in (Supabase Auth)
                              ↓
"Explain about paracetamol and I took glucosamine
 and now I have a rash — what is happening to me?"
                              ↓
     Wikipedia → Paracetamol article, Glucosamine article
     OpenFDA   → FDA drug labels for both drugs
     Ollama    → qwen2.5:7b streams response token-by-token
                              ↓
"Paracetamol can rarely cause skin rashes… [Wikipedia ↗]
 FDA labels note rash as a potential adverse reaction… [FDA ↗]
 ⚠️ This is not medical advice. Please see a doctor."
                              ↓
Session saved to Supabase PostgreSQL (persistent across devices)
```

Clickable `[Wikipedia ↗]` and `[FDA ↗]` citations inline — every claim is traceable.

---

<!-- slide 4 -->
# How I built it
<!-- 20s -->

**Stack:** FastAPI · Next.js 16 · Ollama (`qwen2.5:7b`) · Supabase · TypeScript · Tailwind

**Design:** No hardcoded prompts, no classifiers, no drug lists. LLM handles everything generatively. Drug names extracted heuristically (3-pass). Deleted 5 modules over time — each replaced by simpler alternatives.

**AI tooling used:**
- **MCP** — GitHub server for issue/PR management
- **Skill** — `SKILL.md` enforces stack constraints (FastAPI, Ollama, live APIs)
- **Agent** — subagents for parallel builds + adversarial code review
- **Spec-Kit** — spec-driven development with 11 slash commands

---

<!-- slide 5 -->
# Why it matters
<!-- 20s -->

**1. Real citations build trust.**
Every answer links to Wikipedia articles and FDA drug labels. Users can verify every claim — no blind faith in AI.

**2. Generative over prescriptive.**
No hardcoded "suggest OTC medication" scripts. The model adapts to any question — drug interactions, side effects, pregnancy safety, mechanism of action.

**3. Local LLM, zero cost per query.**
`qwen2.5:7b` runs on-device via Ollama. Wikipedia and OpenFDA need no API keys. The LLM never sends your data to the cloud.

**4. Persistent user accounts.**
Supabase Auth handles registration and login. Chat history persists in PostgreSQL across sessions and devices — no more lost conversations on page refresh.

**5. Built the hard way — then simplified.**
Started with PubMed literature search, pivoted to keyword classification, then removed it all for a pure generative approach. The product got *simpler* over time — fewer files, fewer abstractions, fewer failure modes.

---

<!-- slide 6 -->
# Done checklist
<!-- 20s -->

- [x] Repo public — [github.com/MHKaungPyae/Medical_Citation_Chatbot](https://github.com/MHKaungPyae/Medical_Citation_Chatbot)
- [x] MCP used — GitHub MCP server in `.claude/mcp.json` + Spec-Kit integration
- [x] Skill used — project-scoped skill at `.claude/skills/medical-rag/SKILL.md`
- [x] Agent used — multi-agent development with adversarial review (see `docs/superpowers/specs/`)
- [x] Auth + Database — Supabase Auth (JWT) + PostgreSQL for persistent sessions
- [x] Report in team repo — copy `_TEMPLATE.md` to `ch-3/<your-github-username>/report.md`
