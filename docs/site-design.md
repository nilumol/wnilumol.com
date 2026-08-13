# Site Design: v0.1

## Status

Working design document for the first version of the personal portfolio website.

This document is intentionally lightweight. It captures the current purpose, audience, information architecture, UX principles, and MVP scope. Technical architecture and implementation details should only be added when a requirement gives them a reason to exist.

---

## 1. Purpose

The website should communicate my ability to:

- Understand the value technology can bring to enterprise customers.
- Translate technical capabilities into business value, workflow improvements, adoption plans, project plans, implementations, and stakeholder communication.
- Understand the underlying technology well enough to evaluate its strengths, limitations, tradeoffs, and cost.
- Apply my knowledge of biopharma organizations to technology adoption and problem solving.
- Use AI and other emerging technologies to continuously learn and expand my technical capabilities.
- Design functional systems and implement them.
- Communicate effectively across technical, business, and executive stakeholders.
- Show prospective employers how I approach problems, learn, make decisions, build, and communicate.
- Present my experience and perspective in a visually distinctive but professional way.

The site should serve as both:

1. A professional portfolio for recruiters, hiring managers, and industry professionals.
2. A growing body of evidence showing how I think about technology, systems architecture, and business problems.

---

## 2. Audience

Primary audiences:

- Recruiters
- Hiring managers
- Technology professionals
- Biotech and biopharma professionals
- Software professionals
- AI professionals
- Executives and cross-functional stakeholders evaluating my background or work

The site should be understandable to someone familiar with the industry without requiring deep engineering expertise.

Technical users should be able to progressively explore more detailed system designs, implementation choices, and tradeoffs.

---

## 3. Professional Positioning

### Working Primary Idea

My professional value sits at the intersection of:

- Enterprise technology and business value
- Technical fluency
- Biopharma domain experience - drug development & GxP scale-up and manufacturing

I understand how technology creates value for enterprise customers by considering:

- IT and business workflows
- Adoption
- Business outcomes
- Cost
- Technical capabilities
- Technical limitations and tradeoffs
- Executive stakeholder priorities
- Organizational context

I also maintain technical fluency by staying current with AI developments and by designing and building systems myself.

This is a working positioning statement, not final homepage copy.

### Supporting Experience

My background includes experience at:

- Merck
- Genentech
- Benchling
- Collate

Each experience should eventually allow users to explore:

- What I worked on
- Problems I helped solve
- Business or operational context
- Skills and perspective I developed
- Relevant outcomes and accomplishments

### Proof

The site should demonstrate capabilities through evidence rather than relying only on claims.

Evidence may include:

- Career history
- Accomplishments
- Projects
- System designs
- Implemented systems
- Certifications
- Technical learning
- Case studies

---

## 4. UX Hierarchy

The site should progressively disclose information.

### Level 1: Immediate Understanding

Goal: Within several seconds, a visitor should understand the general intersection of my work:

- Technology
- Enterprise value
- Biopharma
- Technical problem solving

The homepage should remain concise and visually simple.

### Level 2: Supporting Evidence

Goal: Within roughly 30-60 seconds, an interested visitor should be able to understand why the positioning is credible.

Examples:

- Career timeline
- Selected accomplishments
- Selected projects
- Certifications
- Short explanations of how I create value

### Level 3: Deep Exploration

Goal: Give interested users the ability to understand how I think and work.

Examples:

- Detailed career stories
- Project case studies
- System architecture
- Technology choices
- Tradeoffs
- Cost considerations
- Learning process
- Implementation details
- Lessons learned

Complexity should appear only when the user chooses to explore it.

---

## 5. Initial Information Architecture

### Home

Purpose:

- Communicate the primary professional positioning.
- Provide a concise overview of my background.
- Surface selected evidence.
- Route visitors into deeper pages.

Possible homepage sections:

- Hero / primary positioning
- How I create value
- Career overview
- Selected work or proof
- Navigation to deeper pages

Exact homepage layout and copy are not yet finalized.

### About

Purpose:

- Explain who I am beyond individual job titles.
- Describe my perspective on technology, learning, science, and problem solving.
- Introduce subtle personality without turning the site into a personal blog.

### Career

Purpose:

- Present my professional background in an easier-to-understand format than a traditional resume alone.
- Allow visitors to progressively explore individual experiences.

Initial experiences:

- Merck
- Genentech
- Benchling
- Collate

A future deeper layer may include individual case studies or accomplishment stories.

### Projects

For v0.1, Projects may exist only as a lightweight shell or placeholder.

The first content-oriented project may explore:

**AI in Biotech / Biopharma**

Potential topics for a future version:

- Where AI can create business value
- Enterprise workflows that may benefit from AI
- Different business models for companies innovating in this space
- Technical architectures that could support those products
- Risks, limitations, and tradeoffs

The first version does not require working backend functionality.

### Hobbies

Deferred.

Hobbies may eventually provide a more personal view of who I am, but they are not part of the initial implementation scope.

---

## 6. Navigation

Primary navigation should be simple and persistent.

Initial navigation:

- Home
- About
- Career
- Projects

Users should always have an obvious way to return to the homepage or move between primary sections through a top navigation bar.

Navigation paths should remain shallow and intuitive. Utilize breadcrumbs to navigate back to previous page.

Future deeper content can branch from these primary pages without crowding the main navigation.

Example:

Home  
→ Projects
→ Project  
→ System Design / Build Process
→ Git repo / folder

---

## 7. Design Principles

### 7.1 Clarity

- Minimal design
- Easy-to-follow navigation
- Strong visual hierarchy
- Technical content should remain understandable to industry professionals
- Avoid unnecessary visual or technical complexity

### 7.2 Aesthetic Quality

- Use intentional typography
- Use an aesthetically pleasing and restrained color palette
- Maintain visual consistency
- Use whitespace deliberately

The visual system is not yet selected.

### 7.3 Professional with Personality

The default experience should feel professional.

Personality should appear subtly through:

- Writing style
- Typography
- Color
- Interaction
- Project selection
- Personal perspective

The site should not feel generic or overly corporate.

### 7.4 Evidence Over Claims

Whenever possible, capabilities should be demonstrated.

Examples:

Instead of only saying:

> I understand system design.

Show:

- Requirements
- Architecture
- Tradeoffs
- Implementation

Instead of only saying:

> I learn quickly.

Show:

- What I needed to learn
- How the design evolved
- What I built
- What changed after implementation

### 7.5 Progressive Disclosure

The experience should move from simple to complex.

Users should not be forced to consume detailed technical information.

Additional detail should become available through intentional interaction.

Example:

Project overview  
→ Project outcome  
→ System design  
→ Build process and lessons

### 7.6 Simple Navigation

- Keep primary navigation small.
- Avoid deep or confusing menu structures.
- Users should know where they are and how to return.
- Primary pages should remain easy to reach.

### 7.7 Separate Outcome from Process

Projects should first communicate:

- What problem existed
- What was built or proposed
- What value the solution provides

Interested users should then be able to separately explore:

- Why the solution was designed that way
- How it was built
- What needed to be learned
- Design iterations
- Tradeoffs
- Lessons learned

---

## 8. MVP Scope: v0.1

The initial version should focus on the portfolio foundation.

### In Scope

- Home page
- About page
- Career page
- Basic Projects page or project shell
- Top navigation
- Minimal visual design system
- Responsive website foundation
- Static content
- GitHub repository
- Deployment of the website

### Out of Scope

Do not build yet:

- LLM integrations
- OpenAI integrations
- Claude integrations
- MCP servers or connectors
- Databases
- Authentication
- User accounts
- Complex server-side functionality
- Enterprise infrastructure
- Hobbies page
- Complex interactive applications

These capabilities should only be introduced when future project requirements justify them.

---

## 9. Potential v0.2

The next iteration may introduce the first substantive project.

### AI in Biotech / Biopharma

Initially, this can remain a content-based project rather than a working application.

Possible structure:

1. Industry problem
2. Business opportunity
3. Relevant workflows
4. AI use cases
5. Business models
6. Potential system architecture
7. Risks and limitations
8. Cost considerations
9. Open questions

A later iteration may convert part of this work into an interactive or full-stack system.

---

## 10. Development Principle

Do not introduce infrastructure because it is considered standard or impressive.

Each new layer should answer a real requirement.

Example progression:

Static website  
→ interactive frontend  
→ server-side functionality  
→ API  
→ model provider  
→ provider abstraction  
→ MCP integration  
→ controls and observability

Every architectural addition should be explainable in terms of:

- What requirement created the need
- What problem the layer solves
- What tradeoffs it introduces
- Why it is appropriate at the current scale

---

## 11. Open Questions

The following decisions are intentionally unresolved:

- Final homepage copy
- Exact homepage layout
- Visual design direction
- Color palette
- Typography
- Styling approach
- Whether to use Tailwind
- Whether to use shadcn/ui, another component library, or custom components
- Exact project-page structure
- How career stories should be presented
- Whether certifications receive their own section
- How system-design documents will eventually appear on the public site
- Whether Markdown/MDX will be used directly as site content
- Technical architecture beyond the static MVP

These should be decided iteratively before implementation rather than assumed in advance.

---

## 12. Version History

### v0.1

Established:

- Website purpose
- Target audience
- Initial professional positioning
- Evidence-based content strategy
- Progressive-disclosure UX model
- Initial page structure
- Navigation concept
- Design principles
- MVP scope
- Explicit non-goals
- Initial direction for v0.2

Technical implementation decisions remain intentionally open.
