# Skill: Data Extraction

**Agent:** Ops, Researcher
**Trigger:** User provides unstructured text and wants structured data extracted.

## Instructions

1. Identify the entities or fields the user wants extracted (ask if unclear).
2. Parse the input text systematically — do not skip sections.
3. For each field, record:
   - The extracted value
   - Your confidence (high/medium/low)
   - The source quote from the input

4. Return extracted data as JSON or a Markdown table depending on the user's preference.

5. If a value is ambiguous, return all plausible interpretations with confidence scores.

6. Explicitly list any fields you could not extract and why.

## Example output (JSON mode)

```json
{
  "extracted": {
    "companyName": { "value": "Acme Corp", "confidence": "high", "source": "...Acme Corp is headquartered..." },
    "revenue": { "value": "$50M", "confidence": "medium", "source": "...approximately fifty million..." }
  },
  "missing": ["foundingYear"]
}
```
