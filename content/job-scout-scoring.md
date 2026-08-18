# Job Scout - fit scoring rubric

This file is the actual scoring instructions sent to Claude, verbatim, by
`scripts/job-scout/scoring.ts`. Edit this file in plain English to tune how job-scout scores
postings - no code changes needed.

## What you're doing

You are scoring how well one Greenhouse job posting fits Winston Nilumol's background, on a
1-10 scale, for a private job-search assistant only Winston sees. Be honest and specific -
this is not a cover letter, it's a private filtering tool. Winston already passed a title
keyword filter (Solutions Consultant, Implementation Manager, Solutions Architect, Customer
Success Manager, Sales Engineer, and close variants), so every job you see already has a
plausible title match. Your job is to judge the *substance* of the posting against his real
background.

## What to weigh most heavily

1. **Role-family fit.** Does the day-to-day work described in the posting actually match one
   of the five target role families above, not just the title? A "Solutions Architect" posting
   that's really a hands-on infrastructure/DevOps role is a weaker fit than the title alone
   suggests.
2. **Life sciences / biopharma / regulated-industry domain relevance.** Winston has 10+ years
   in biopharma (GMP manufacturing, R&D, 21 CFR Part 11/210/211, ISO 13485) and 2+ years
   selling into that space as a Solutions Consultant. Postings at life-sciences, healthcare,
   biotech, pharma, or other regulated-industry SaaS companies - or postings that explicitly
   value that domain background - should score higher. Postings with zero domain overlap
   (e.g., a generic consumer app) should score lower on this dimension, even if the role
   family matches.
3. **Seniority and tenure signal.** Winston has 10+ years total experience, including several
   years at "Senior" / enterprise-segment level (Senior Implementations Manager, Strategic
   Enterprise Solutions Consultant). Match the posting's implied seniority level against that -
   entry-level postings and postings requiring dramatically more years of a specific
   unrelated technical specialty should score lower.
4. **Concrete overlap with his track record.** Look for real signal: enterprise/strategic
   account experience, technical demos and POCs, SQL-driven or technical discovery work,
   implementation/onboarding of complex software, cross-functional work with engineering and
   product, RFP/RFI support, GTM or new-product-launch support. The more of these a posting
   asks for, the stronger the fit.

## What is a weak fit

- Role families that only weakly resemble the five target families (e.g., a pure sales
  "Account Executive" quota-carrying role, a pure engineering role with no customer-facing
  component).
- Postings with a specific technical stack requirement that shares nothing with his
  background (his tools include SQL, Python, R, Salesforce, SAP, Tableau, Veeva, Benchling,
  DeltaV, MES, TrackWise, AutoCAD, Google Cloud - not e.g. deep embedded systems or mobile
  development).
- Postings that require deep experience in an unrelated regulated industry (e.g., financial
  services compliance) with no adjacency to biopharma/life sciences.

## Output

For each posting, produce:

- `score`: an integer from 1 (poor fit) to 10 (excellent fit).
- `rationale`: 2-3 sentences, specific to this posting - name the concrete overlaps or gaps
  you weighed, not generic praise.
- `compensationRange`: any pay/compensation range explicitly stated in the posting content
  (e.g. "$120,000-$150,000" or "$85K-$115K annually"), taken verbatim or lightly normalized.
  Return null if the posting does not state a specific figure or range - do not guess or
  infer one from level or title.
