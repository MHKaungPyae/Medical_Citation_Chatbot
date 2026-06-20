# Phase 8: Evaluation Baseline

**Status:** 🔲 Not started

## Goal
Measure answer quality with a fixed question set and scoring rubric.

## Steps

### 1. Create Question Set (15 questions)

| # | Category | Example Question |
|---|----------|-----------------|
| 1 | Drug info | "What is paracetamol used for?" |
| 2 | Side effects | "What are the side effects of ibuprofen?" |
| 3 | Drug interactions | "Can I take aspirin with warfarin?" |
| 4 | Symptoms | "I have a headache and fever, what can I take?" |
| 5 | Conditions | "What is type 2 diabetes?" |
| 6 | OTC recommendation | "What OTC medicine helps with allergies?" |
| 7 | Dosage | "How much paracetamol can I take in a day?" |
| 8 | Contraindications | "Who should not take aspirin?" |
| 9 | Pregnancy | "Is ibuprofen safe during pregnancy?" |
| 10 | Multi-drug | "I take metformin and lisinopril, any interactions?" |
| 11 | Vague query | "My stomach hurts" |
| 12 | Non-drug query | "What is migraine?" |
| 13 | Brand vs generic | "What is the difference between Tylenol and paracetamol?" |
| 14 | Rare drug | "Tell me about rosuvastatin" |
| 15 | Complex | "I have diabetes and high blood pressure, what should I avoid?" |

### 2. Scoring Rubric

| Dimension | Score | Criteria |
|-----------|-------|----------|
| **Groundedness** | 0–2 | 0 = hallucinated, 1 = partially supported, 2 = fully supported by sources |
| **Citation accuracy** | 0–2 | 0 = no citations, 1 = citations exist but don't match, 2 = citations correct |
| **Disclaimer** | 0–1 | 0 = no disclaimer, 1 = disclaimer present |
| **Relevance** | 0–2 | 0 = off-topic, 1 = partially relevant, 2 = directly answers question |

**Max score per question: 7** | **Max total: 105**

### 3. Run Evaluation

```bash
cd /Users/panda/Desktop/Medical_Citation_Chatbot
source backend/.venv/bin/activate
PYTHONPATH=. python backend/evaluate.py  # to be created
```

### 4. Output

- Per-question scores with reasoning
- Aggregate scores by category
- Overall baseline score
- Identified failure modes

## Verification
- All 15 questions answered
- Scores recorded for each dimension
- Results saved to `evaluation/results.json`

## Files to Create
- `backend/evaluate.py` — evaluation runner
- `evaluation/questions.json` — 15 questions with expected criteria
- `evaluation/results.json` — scores output
