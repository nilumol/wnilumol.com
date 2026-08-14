# Project Page Content and Visual System

## Status

Working specification for constructing project pages on wnilumol.com.

This document defines how a project idea becomes a useful reading experience. It sits between raw research or working notes and implementation in JSX/CSS.

The goal is not to make every project page look identical. The goal is to give every page a clear argument, useful evidence, intentional visual hierarchy, and a reason for the reader to continue.

---

## 1. What a project page must prove

Each project page should prove at least three things:

1. **I understand a meaningful problem.**
2. **I can make a defensible technical or product decision about it.**
3. **I can explain how I would move from ambiguity to measurable value.**

A project page is not a repository for everything learned about a topic. It is a designed argument supported by selected evidence.

### Reader test

After 30 seconds, a reader should be able to answer:

- What problem is Winston examining?
- Why does it matter?
- What is his central point of view?
- What kind of contribution could he make?

After 2–4 minutes, an interested reader should also be able to answer:

- How does the proposed system or workflow operate?
- What decisions and tradeoffs matter?
- What would be tested first?
- How would value and risk be measured?

If the page does not make those answers easier, more content is not the solution.

---

## 2. Required page contract

Before designing or coding a page, write a one-page content contract.

| Field | Required answer |
| --- | --- |
| Primary reader | One primary role or closely related group |
| Reader situation | Why this person is looking at the page |
| 30-second takeaway | One sentence the reader should remember |
| Central problem | The specific friction, risk, or unmet need |
| Point of view | The non-obvious conclusion or decision being argued |
| Evidence | Observations, experience, research, prototype, or measured result supporting the argument |
| Featured example | One concrete workflow, artifact, or scenario |
| Contribution | What Winston could actually do in this situation |
| Next test | The smallest credible experiment that reduces uncertainty |
| Success measure | The user, quality, risk, time, or financial result that would matter |
| Confidence | Observed, inferred, proposed, or validated |

The page should not be implemented until these fields are specific enough to constrain the design.

---

## 3. Default narrative structure

Use five primary movements. Additional sections must justify their place in the reading path.

### Movement 1: Orient

**Reader question:** What is this, and why should I care?

Include:

- A short project label
- A specific title
- A problem statement of one or two sentences
- A clear point of view
- A byline: author name and estimated reading time (for example, `Winston Nilumol · 4 min read`)

The hero should not contain background research, a capability list, or implementation details.

The byline is a project-page convention only. Do not add it to non-project pages (About, Career, the Projects index).

**Target:** 40–70 words after the title.

### Movement 2: Make the problem visible

**Reader question:** Where does the friction occur today?

Show one current-state workflow, before/after contrast, annotated artifact, or system interaction. Prefer a concrete example over four abstract categories.

If categories are needed, each must explain a distinct consequence rather than repeat a different version of “this is complex.”

**Target:** One visual plus no more than 120 supporting words.

### Movement 3: Show the key idea

**Reader question:** What would you change, and why?

Present the proposed architecture, operating model, or intervention. Accompany it with two or three design decisions that explain:

- Why the component or boundary exists
- Which failure mode it addresses
- What tradeoff or limitation it introduces

The visual shows structure. The decisions show judgment. Both are required.

### Movement 4: Make it concrete

**Reader question:** How would this work in a real scenario?

Walk one example from input to output. Name the user, source, task, transformation, review, and destination. The example should make the architecture easier to understand rather than introduce a second architecture.

Include how success would be measured. Do not claim an outcome that has not been tested.

### Movement 5: Establish fit and momentum

**Reader question:** Why are you useful here, and what would happen next?

Connect relevant experience to three or four actions. Close with a bounded next experiment and its acceptance measures.

The page should end in forward motion—not a disclaimer, biography, or generic summary.

---

## 4. Content hierarchy

Every page should distinguish among three levels of content.

### Primary content

Required to understand the central argument:

- Problem
- Point of view
- Main visual
- Design decisions
- Concrete example
- Contribution
- Next test

Primary content belongs in the main reading path.

### Supporting content

Strengthens credibility but is not required for immediate understanding:

- Regulations and standards
- Evaluation criteria
- Detailed system mappings
- Artifact inventories
- Alternative architectures
- Terminology and limitations

Supporting content belongs in a compact callout, expandable disclosure, linked technical note, or secondary page.

### Working material

Useful during research but not automatically useful to the reader:

- Brainstorming lists
- Every question considered
- Repeated qualifications
- Full research notes
- Unselected examples
- Internal page-design instructions

Working material stays in Markdown source documents and should not appear on the page unless promoted deliberately.

---

## 5. Visual hierarchy

The page should have one dominant idea, one dominant visual, and no more than two supporting visual patterns.

### Visual priority

1. **Hero thesis** — establishes the argument.
2. **Primary visual** — explains the system, workflow, or contrast.
3. **Decision or evidence blocks** — explain why the design matters.
4. **Supporting prose** — provides context and qualifications.

If every section uses large headings, numbered labels, bordered cards, and equal spacing, nothing feels important. Section treatment should reflect information importance.

### Recommended patterns

| Content relationship | Preferred pattern |
| --- | --- |
| Sequence or transformation | Horizontal or vertical flow |
| System ownership or boundaries | Architecture diagram |
| Current versus proposed state | Before/after comparison |
| Exact mappings | Table |
| Three or four distinct decisions | Numbered decision list |
| One important statement | Pull quote or callout |
| Supporting technical depth | Disclosure or linked note |

Do not use a card grid merely because there are four items. Cards are useful when the items can be understood independently and compared at the same level.

---

## 6. Diagram rules

A diagram should answer one question. If it tries to explain the business process, integration architecture, AI internals, governance, and outputs simultaneously, split it.

### Before drawing

Write the diagram's question as a sentence:

> This diagram helps the reader understand ________.

If the blank contains “and” more than once, the scope is probably too broad.

### Diagram content limits

- Prefer 5–7 primary nodes.
- Use one reading direction.
- Use no more than three visual encodings, such as solid arrows, dotted inputs, and highlighted boundaries.
- Label arrows with actions or information being exchanged.
- Make system ownership or trust boundaries visually explicit.
- Explain acronyms on first use.
- Remove any node that does not affect the argument.

### Architecture views

When a subject needs depth, use separate views:

1. **Business view:** User, task, input, output, and value.
2. **System view:** Applications, APIs, boundaries, and direction of information.
3. **Control view:** Permissions, provenance, validation, review, and auditability.

The main page normally shows only one view. Other views belong in technical notes unless they are essential to the argument.

---

## 7. Writing rules

### Prefer

- Specific actors, artifacts, and decisions
- Short claims followed by evidence or rationale
- Active language
- Observed facts separated from hypotheses
- Outcomes meaningful to a user or business
- Plain language with precise technical terms where needed

### Avoid

- Broad industry claims without evidence
- Long lists of systems, frameworks, or features
- Repeating the same idea as a title, paragraph, card, and diagram
- Treating complexity as insight
- Presenting an untested architecture as a proven solution
- Using regulations as decoration rather than explaining their design consequence

### Claim labels

Use language that matches confidence:

- **Observed:** “In workflows I have seen…”
- **Inferred:** “This suggests…”
- **Proposed:** “A reference architecture could…”
- **Validated:** “Testing showed…”

---

## 8. Showing regulations usefully

Do not lead with a catalog of regulations. Show how a requirement changes the design.

Weak:

> The workflow may be subject to 21 CFR Part 11, GxP, HIPAA, and ICH guidance.

Stronger:

> Because the output may support a regulated record, the workflow must preserve user identity, source provenance, version context, review, and approval.

A technical note may map each design consequence to representative frameworks. The main page should prioritize the consequence.

---

## 9. Demonstrating business value

ROI should follow a causal chain:

```text
Architecture capability
        ↓
Workflow change
        ↓
User behavior or quality change
        ↓
Operational measure
        ↓
Business value
```

Example:

```text
Source-linked extraction
        ↓
Less manual evidence gathering
        ↓
Fewer reviewer corrections
        ↓
Shorter review cycle
        ↓
Lower cost and faster decision readiness
```

Do not jump directly from “uses AI” to “creates ROI.” If no baseline or test exists, state what would be measured rather than inventing a result.

---

## 10. Demonstrating personal contribution

Contribution sections should connect capability to an artifact or outcome.

| Contribution | Evidence of the work |
| --- | --- |
| Discovery | Workflow map, user needs, baseline, bounded use case |
| Design | Architecture, system boundaries, mappings, interaction model |
| Validate | Evaluation plan, acceptance criteria, test evidence, risk controls |
| Repeatability | Templates, reusable components, playbooks, rollout model |

Avoid biography in place of contribution. Experience is useful when it explains why the reader should trust the proposed action.

---

## 11. Page density and pacing

For a 2–4 minute project page:

- Target 700–1,100 visible words.
- Use 5 primary movements, not 7–10 equally weighted sections.
- Include one dominant visual.
- Keep paragraphs to roughly 2–4 sentences.
- Use no more than one large card grid.
- Reserve the largest typography for the thesis and one major section transition.
- Alternate dense information with whitespace or a simple visual.
- Move detailed qualifications below the primary path.

These are constraints, not automatic quality. A shorter page can still be confusing if the argument is weak.

---

## 12. Pre-build review gate

Before implementation, review the content brief against this checklist.

### Argument

- [ ] The problem is specific and consequential.
- [ ] The point of view is distinct from the problem statement.
- [ ] The page makes one central argument.
- [ ] Observations, hypotheses, and proposals are distinguishable.

### Reader value

- [ ] The primary reader is named.
- [ ] The 30-second takeaway is written in one sentence.
- [ ] Every primary section answers a reader question.
- [ ] The featured example makes the thesis more concrete.

### Evidence and credibility

- [ ] Claims are supported or appropriately qualified.
- [ ] Regulations are connected to design consequences.
- [ ] Business value follows a plausible causal chain.
- [ ] Personal contribution is connected to specific work products.

### Visual design

- [ ] One visual is clearly dominant.
- [ ] The visual answers one stated question.
- [ ] The diagram has a clear direction and limited node count.
- [ ] Sections do not all receive equal visual treatment.
- [ ] Technical depth is progressively disclosed.

### Execution

- [ ] The next test is bounded.
- [ ] Acceptance measures are named.
- [ ] The page does not imply unperformed work or unmeasured results.
- [ ] The main path can be read in 2–4 minutes.

If several boxes remain unchecked, revise the content brief before editing the page.

---

## 13. Current GxP page assessment

The existing GxP page contains useful material, but its current construction has several problems:

1. **Too many equal-weight sections.** Seven numbered sections make the page feel like a report rather than a guided argument.
2. **The architecture is overloaded.** It combines system integration, application controls, AI orchestration, regulatory context, human review, and two output types in one visual.
3. **The current-state flow is too generic.** It states that people reconstruct context but does not show a specific user, artifact, delay, or consequence.
4. **The example arrives after the architecture.** Readers must understand an abstract system before seeing the concrete workflow that would make it meaningful.
5. **Value is delayed until the end.** ROI measures appear in the next-test section rather than being connected to the workflow change.
6. **Regulations are listed more than interpreted.** The page names frameworks but does not consistently show which architectural control each one motivates.
7. **The personal contribution section is credible but detached.** It should connect each contribution directly to the featured example and the artifacts Winston would produce.

### Recommended next revision

Rebuild the page around five movements:

1. Thesis and intended reader outcome
2. Concrete ELN-to-CMC workflow and current friction
3. Simplified reference architecture
4. Three architecture decisions with business and control consequences
5. Discovery → Design → Validate → Repeatability, followed by the bounded test

The detailed regulation landscape and assurance framework should remain in the supporting Markdown rather than the primary page.
