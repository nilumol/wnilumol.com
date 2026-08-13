# Inserting AI into Regulated Information Flows

**V1 · Working architecture thesis · Unlisted**

## The opportunity

Regulated work produces electronic records, data, and documents that provide evidence of what was planned, performed, reviewed, and approved. Today, people spend substantial effort turning that information into controlled artifacts and checking those artifacts for accuracy, completeness, consistency, and compliance with expected structure.

AI can assist at three points in this flow:

- **Generation:** Drafting content from authorized source information using defined logic, instructions, and templates.
- **Quality control:** Checking an artifact against its sources, required structure, terminology, and deterministic business rules before formal review.
- **Content extraction:** Identifying and structuring relevant information from large volumes of content for a defined business task while retaining links to the source evidence.

The opportunity is larger than adding an LLM to a document editor. Useful information may originate in QMS, LIMS, MES, EDC, CTMS, regulatory, automation, electronic health record (EHR), collaboration, or file-based systems owned by different functions. AI must be inserted into this landscape without obscuring where information came from, whether it is approved, which requirements govern its use, or who remains accountable for the final decision.

## Representative information landscape

The artifacts below illustrate the range of information an AI-enabled workflow may need to generate, review, or use as evidence. They do not all belong in one system, and the applicable requirements depend on the product, jurisdiction, organization, record type, and intended use.

| Function | Representative records, data, and documents | Examples of governing requirements or standards |
| --- | --- | --- |
| Clinical development | Protocols, informed-consent forms, case report forms, statistical analysis plans, clinical study reports, safety narratives | FDA clinical-investigation requirements, including applicable provisions of 21 CFR Parts 50, 54, 56, and 312; ICH E6 Good Clinical Practice; ICH E3 for the structure and content of clinical study reports |
| Quality | SOPs, deviations, investigations, CAPAs, change controls, training records, audit reports | Applicable GxP predicate rules; 21 CFR Part 11 when covered records or signatures are maintained electronically; data-integrity expectations including ALCOA+ |
| Manufacturing and process | Master and executed batch records, equipment logs, continuous process verification reports and data, validation protocols and reports, annual product reviews or product quality reviews | Drug CGMP requirements such as 21 CFR Parts 210 and 211; applicable biologics requirements; 21 CFR Part 11 for covered electronic records and signatures; relevant FDA and ICH quality guidance |
| Laboratory | Specifications, analytical methods, sample records, test results, certificates of analysis, out-of-specification investigations | Applicable GLP or CGMP requirements, including 21 CFR Parts 58, 210, and 211 depending on context; 21 CFR Part 11 for covered electronic records and signatures |
| Regulatory | IND, NDA, BLA, and amendment content; labeling; health-authority questions and responses; commitments; CMC, nonclinical, and clinical summaries | FDA application requirements; eCTD technical standards and content organization: Module 1 regional administrative information, Module 2 summaries, Module 3 quality, Module 4 nonclinical, and Module 5 clinical |
| Healthcare and real-world data | EHR encounter notes, medication and allergy lists, diagnoses, laboratory and imaging results, discharge summaries, claims, patient-reported outcomes | HIPAA Privacy, Security, and Breach Notification Rules when protected health information is handled by a covered entity or business associate; HITECH; applicable state privacy law and organizational policies |

These frameworks overlap but are not interchangeable. For example, 21 CFR Part 11 applies when records required by FDA regulations are maintained or submitted electronically; it is not a universal label for every electronic document. Likewise, eCTD defines how regulatory submission content is organized and transmitted, while the underlying content obligations come from applicable laws, regulations, and guidance. HIPAA governs protected health information in covered contexts and does not automatically apply to every health-related dataset.

## The problem statement

Inserting AI into a regulated information flow is not only a model problem. Information crosses functional, technical, and GxP boundaries before it becomes an approved artifact. Organizations must align on scope, process ownership, authoritative sources, data-integrity controls, and acceptable AI performance.

The architecture must preserve provenance and human accountability while allowing AI to reduce repetitive authoring and quality-review work.

## Reference architecture

```text
INFORMATION SOURCES
──────────────────────────────────────────────────────────
Informational / supporting              Controlled / GxP
SharePoint · files · EHR/RWD            QMS · LIMS · MES
reference and collaboration data        EDC · CTMS · approved documents
                 │                              │
                 └──────────────┬───────────────┘
                                │
                       INTEGRATION BOUNDARY
               identity · permissions · provenance
              versions · mappings · reconciliation
                                │
                                ▼
                        CONTROLLED AI LAYER
             context of use · authorized sources · logic
              templates · instructions · model · audit trail
                  ┌─────────────┼─────────────┐
                  ▼             ▼             ▼
           AI extraction  AI generation  AI-assisted QC
           structured data draft content rules + model review
                  └─────────────┼─────────────┘
                                ▼
                         HUMAN DECISION
                      review · edit · approve
                                │
                                ▼
                    CONTROLLED DESTINATION
          system of record · EHR · eCTD submission
             controlled record · approved document
```

The integration boundary is central to this design. Information should not silently become trusted because an LLM can access it. The workflow must retain its source, status, version, authorization, and intended use.

## Four implementation challenges

### 1. Establishing cross-functional scope

Quality, Manufacturing, Clinical, Regulatory, Automation, Validation, and IT may each own part of the information flow. An implementation requires agreement on the workflow boundary, intended use, accountable decision-makers, and definition of success. Executive IT leadership can help connect these groups, but the design must also reflect how the people closest to the work actually operate.

### 2. Managing information that crosses a GxP boundary

Useful context can originate in a system that is not itself treated as a GxP system, such as a collaboration repository, reference database, or healthcare data source. Once that information supports a regulated record or decision, its intended use may require additional controls. The architecture must determine how provenance, version, authorization, verification, privacy, retention, and ALCOA+ data-integrity principles are preserved across the flow.

The boundary therefore follows how information is used, not simply the application in which it resides.

### 3. Integrating systems and redefining process ownership

Integration changes more than data movement. It forces decisions about which system is authoritative for each object, how identities and records map across applications, which events trigger an action, and what happens when a transaction fails or two systems disagree.

A scalable design needs defined system-of-record boundaries, canonical objects, mappings, event flows, exception handling, reconciliation, and validation evidence. These technical decisions also redefine process ownership and must be agreed upon across functions.

### 4. Controlling and measuring AI performance

AI should not be accepted because its output appears polished or because it performs well in a general benchmark. Performance must be evaluated for a clearly defined task and context of use, with controls proportionate to the consequence of an incorrect output.

A practical assurance approach may include:

- Representative test cases and expert-reviewed expected results
- Risk-weighted error categories and acceptance criteria
- Required-content coverage and factual accuracy
- Claim-level provenance or source support where appropriate
- Tests for missing, conflicting, and unauthorized information
- Appropriate abstention when evidence is insufficient
- Human review before an output becomes an approved artifact
- Regression testing after changes to models, prompts, retrieval, logic, or templates
- Production monitoring and controlled lifecycle management

Human performance can be a useful comparator, but “human-equivalent” is not a sufficient requirement by itself. The system must demonstrate acceptable performance for its defined use.

## Controlling extraction, generation, and quality review

Reliable AI-assisted generation depends on the system around the model:

| Control | Question it answers |
| --- | --- |
| Templates and schemas | What content and structure are required? |
| Deterministic logic | Are required fields, dates, identifiers, references, and calculations consistent? |
| Retrieval and provenance | Is the output based on authorized and traceable source information? |
| Model instructions | What task, boundaries, terminology, and output behavior are expected? |
| AI-assisted QC | Is content missing, contradictory, unsupported, or inconsistent with requirements? |
| Human review | Is the artifact scientifically, procedurally, and contextually appropriate? |
| Auditability | Can the inputs, transformations, output, changes, and approval be reconstructed? |

Extraction, generation, and QC should not rely on the same control alone. Schemas can define extracted fields, templates can standardize generated structure, deterministic checks can catch known failure modes, and model-based review can identify contextual issues. Accountable people still make the final regulated decision.

## How I can contribute

### Workflow discovery and customer empathy

Understand how customers actually work, where friction occurs, which evidence matters, and how a proposed AI workflow will affect the people responsible for executing and reviewing it.

### Integration architecture

Translate the workflow into clear system boundaries, authoritative sources, canonical objects, mappings, event flows, permissions, provenance, exception handling, and reconciliation requirements.

### Cross-functional alignment

Connect Quality, Manufacturing, Clinical, Regulatory, Automation, Validation, business, and executive IT stakeholders around a bounded problem and an implementable path forward. I have worked with these functions across regulated operations and enterprise technology environments.

### Reusable implementation playbooks

Turn lessons from one deployment into repeatable discovery methods, architecture patterns, evaluation frameworks, validation approaches, and rollout plans. I have built reusable customer-facing practices as a Solutions Consultant and now contribute to building and scaling implementation practices.

## My perspective

My experience spans regulated biopharma operations, enterprise scientific software, solutions consulting, implementation, and AI-assisted regulatory authoring. I have seen that useful AI output does not come from the model alone. It depends on the logic, source context, instructions, controls, review process, and organizational alignment surrounding it.

I can help translate between customer workflows, technical architecture, quality expectations, and scalable implementation so that AI is not only compelling in a demonstration, but controlled and useful in the work it is intended to support.

---

*This is a working product and architecture perspective, not regulatory advice. The frameworks shown are representative rather than exhaustive. Controls, privacy obligations, and validation expectations must be assessed for each organization's intended use, record type, jurisdiction, applicable requirements, and risk.*
