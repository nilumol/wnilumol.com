# Project Page Brief: AI Architecture for Regulated Information

**Status:** Working design brief · Unlisted  
**Target reading time:** 2–4 minutes  
**Primary readers:** Founders, startup leaders, functional leaders, and hiring managers

## Purpose of the page

This page should demonstrate that I understand how enterprises can gain value from AI and the underlying architecture that must be designed, pressure-tested, and iterated. It should show that I can communicate technical ideas clearly, connect architecture to user and business value, and identify where an implementation can produce measurable return on investment.

### Desired 30-second takeaway

> Winston understands how enterprises can gain value from AI, as well as the architecture, controls, and iteration required to make that value real. He can communicate across technical and business audiences and connect an AI implementation to measurable ROI.

## Recommended page narrative

### 1. Hero: the thesis

**Working title:** Inserting AI into Regulated Information Flows

> AI can accelerate how regulated information is extracted, authored, and reviewed. The harder problem is connecting it to the right source information, business workflow, regulatory requirements, and accountable people.

Supporting line:

> The model is only one component. The product is the controlled information flow around it.

The page should be presented as a **reference architecture and working thesis**, not as a completed customer implementation or a universal design.

### 2. Why is this difficult?

Use four concise cards. Each card should name a boundary and the practical question it creates.

#### Functional

Which business workflows are appropriate for AI, who performs them today, and how will the new working model improve the user's output rather than simply add another tool?

#### Source information

Where does the required information originate—for example, clinical systems, laboratory instrumentation, an ELN, executed batch records, a LIMS, an EHR, or controlled documents—and which source is authoritative for each fact?

#### Technical

How will systems exchange identities, records, events, permissions, and errors while preserving provenance, version context, and system-of-record boundaries?

#### Regulations

Which requirements govern the workflow and its outputs? Depending on context, examples may include FDA GMP and GCP requirements, 21 CFR Part 11, ICH guidance, eCTD submission standards, HIPAA and HITECH, CLIA, the FDA Quality System Regulation, ISO 13485, and applicable privacy or records-retention requirements.

The regulatory card should make clear that applicability depends on the artifact, intended use, product, organization, and jurisdiction. The page should not suggest that every listed framework applies to every implementation.

### 3. Current information flow

Before presenting the proposed architecture, show the generalized business flow that already exists:

```text
SOURCE INFORMATION
Clinical data · experiments · instruments · batch execution · health records
                                ↓
HUMAN INTERPRETATION
Find · reconcile · interpret · summarize · format · review
                                ↓
BUSINESS OR REGULATED ARTIFACT
Decision summary · study report · technical report · submission content
```

The point is not that every process is manual. The point is that people frequently reconstruct context across systems before information can be understood by stakeholders or reused in a controlled artifact.

### 4. Reference architecture

The architecture should show how an existing system of record—using an ELN as the example—can connect to an AI-enabled application without losing identity, permissions, provenance, or human accountability.

```text
                                         USER-PROVIDED CONTEXT
                                  templates · examples · gold standards
                                                  ┊
                                                  ▼
ELN / SYSTEM OF RECORD                       AI APPLICATION
experiment · EXP ID                    authentication · authorization
results · metadata                     permissions · workflow boundary
        │                              validation · auditability
        │ API retrieval                           │
        └─────────────────────────────────────────┤
                                                  ▼
                                            AI PLATFORM
                                orchestration · retrieval · business logic
                                prompt design · structured transformations
                                      │                         │
                                      ▼                         ▼
                               SOURCE EXTRACTION       REQUIREMENTS CONTEXT
                              experiment boundaries    applicable guidance
                              results · evidence       CMC structures/examples
                                      └───────────┬─────────────┘
                                                  ▼
                                              LLM CALLS
                                  summarize · transform · draft · check
                                                  │
                                                  ▼
                                         HUMAN REVIEW & DECISION
                                      verify · revise · approve · reject
                                          ┌───────┴────────┐
                                          ▼                ▼
                                  STAKEHOLDER OUTPUT   TECHNICAL OUTPUT
                                  decision-ready brief CMC package content
```

Arrows should show the direction of information explicitly. Connections may be:

- **Unidirectional** when the application reads from the system of record but cannot modify it.
- **Bidirectional** when an approved output or workflow status must be written back.
- **Dotted** when users supply contextual material such as templates, controlled examples, or gold-standard outputs.

“System of record” is the preferred technical term on the page. “System of truth” can be used conversationally, but it may imply that one system is authoritative for every element of a cross-functional workflow.

### 5. Example: ELN experiment to two useful outputs

A user starts with a unique experiment identifier in an ELN. The application authenticates the user, checks permissions, and retrieves the authorized experimental record through an API. A natural-language request might ask:

> Summarize the results of this experiment and present them for a cross-functional stakeholder review.

The AI workflow extracts the relevant experimental design, observations, results, and boundaries. As an illustrative process-development scenario, the record could describe a pivotal Phase 2 experiment evaluating a redesigned crystallization process intended to increase the water tolerance of a salt-formation step.

The same verified source information can then support two transformations:

1. **Stakeholder output:** A concise, decision-oriented explanation of what was tested, what changed, what the results indicate, and what decision or follow-up may be needed.
2. **Technical output:** Structured content formatted for expert review and potential inclusion in a technical package supporting a future CMC regulatory submission.

The AI does not determine regulatory acceptability or approve submission content. It extracts, transforms, drafts, and checks within a defined context; qualified people verify the scientific interpretation, applicability of requirements, and final use.

This example should expose the implementation questions that matter:

- Which ELN fields and attachments may be retrieved?
- How is the EXP ID mapped to related samples, methods, results, and versions?
- What evidence distinguishes a pivotal experiment from exploratory work?
- Which regulatory requirements and controlled examples are applicable?
- How are claims linked back to source evidence?
- What must a reviewer confirm before either output is used?
- Can an approved result be written back, and if so, to which controlled system?

### 6. Architecture decisions

Highlight three decisions rather than displaying components without rationale.

#### Trust is established at the boundary

Information does not become authoritative because an LLM can retrieve it. Identity, permissions, source status, version, provenance, and intended use must be evaluated before transformation.

#### Generation and review need multiple controls

Schemas, templates, deterministic rules, retrieval, model instructions, AI-assisted checks, and human review address different failure modes. A single prompt or model benchmark is not sufficient.

#### Performance is evaluated for the task

The evaluation should measure whether the system performs acceptably for its defined context of use. Criteria may include extraction accuracy, required-content coverage, source support, unsupported-claim rate, appropriate abstention, and reviewer corrections.

### 7. What my experience has taught me

- Useful AI output depends on the source context, logic, instructions, and review workflow surrounding the model.
- Integrations encode decisions about data authority and process ownership, not only data movement.
- Successful adoption requires the business workflow, technical controls, regulatory expectations, and user experience to develop together.
- A compelling demonstration becomes a scalable product only when its patterns can be validated, monitored, and repeated.

### 8. How I can contribute

Use one focal word for each contribution.

#### Discovery

Understand the customer workflow, users, evidence, pain points, exceptions, current performance, and desired business outcome before defining the AI use case.

#### Design

Translate the workflow into system boundaries, authoritative sources, canonical objects, API mappings, permissions, event flows, provenance, exception handling, and user interactions.

#### Validate

Define the context of use, risk-based acceptance criteria, evaluation cases, source-grounding tests, human-review requirements, and evidence needed to build trust in the workflow.

#### Repeatability

Turn implementation learning into reusable discovery methods, architecture patterns, integration components, evaluation frameworks, validation approaches, and rollout playbooks.

### 9. What I would test next

Build a bounded proof of concept around an existing system of record rather than starting with a generalized enterprise platform:

1. Retrieve one authorized experiment and its supporting evidence from an ELN using an EXP ID.
2. Define a structured extraction schema and preserve source references for every material field.
3. Generate both a stakeholder summary and a technical CMC-oriented output from the same verified information.
4. Evaluate extraction accuracy, coverage, unsupported claims, source traceability, formatting, and reviewer corrections.
5. Test permission failures, missing evidence, conflicting versions, and requests that exceed the defined boundary.
6. Estimate value using time saved, review effort, right-first-time output, and time to a usable decision—not token volume or document count.

This experiment would demonstrate the complete information flow while keeping the context narrow enough to test credibly.

## Open scope decision

The ELN-to-CMC example is currently the most technically specific and differentiated scenario in this brief. Clinical studies may offer a larger or more immediate business opportunity, but that is a different first use case and would require a different source architecture—for example, EDC, CTMS, eTMF, safety, and biostatistics systems feeding clinical reports or study decisions.

Before implementing the page, choose one of these positions:

- Use **ELN-to-CMC** as the featured architecture because it best demonstrates technical depth and your HLS experience.
- Use **clinical studies** as the featured architecture because it represents the opportunity you most want to pursue, then redesign the example around a specific clinical artifact and decision.
- Present ELN-to-CMC as the detailed example while describing clinical studies as the next domain where the pattern could be applied.

The third option is the safest current narrative: it keeps the page concrete without claiming that the first illustrated use case necessarily has the highest ROI.

## Content kept below the primary reading path

The existing [problem statement](./problem-statement.md) should remain the deeper technical source. The project page can link to or progressively reveal its:

- Representative artifact and regulation landscape
- Detailed AI assurance measures
- ALCOA+ and GxP-boundary discussion
- Control matrix for extraction, generation, and QC
- Regulatory qualifications and limitations

This keeps the main page within a 2–4 minute reading time while preserving evidence for readers who want greater technical depth.
