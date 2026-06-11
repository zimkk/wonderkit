# Skill: Code Review

**Agent:** Ops, Orchestrator
**Trigger:** User shares code and asks for a review, feedback, or improvements.

## Instructions

1. Read the code carefully before commenting.
2. Evaluate across these dimensions:

| Dimension | What to check |
|-----------|--------------|
| Correctness | Does it do what the author intends? Any bugs or edge cases? |
| Security | OWASP top 10, input validation, secrets handling, SQL injection, XSS |
| Performance | Unnecessary N+1 queries, blocking operations, memory leaks |
| Readability | Naming, structure, comments (only where WHY is unclear) |
| Testability | Can it be tested? Is it already tested? |

3. Format output:

```
## Summary
[1-2 sentences overall assessment]

## Issues (critical → minor)
- **[CRITICAL/MAJOR/MINOR]** [location] — [description] → [suggestion]

## Positives
- [What was done well]

## Suggested changes (code blocks where helpful)
```

4. Do not rewrite the entire code unless asked. Suggest targeted changes.
