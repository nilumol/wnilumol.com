/**
 * Structured, hand-authored transcription of career/Winston Nilumol Resume_August_2026.pdf,
 * with personal contact info (phone/email/LinkedIn) deliberately excluded - this data flows
 * into LLM prompts (see scripts/job-scout/scoring.ts and tailor-suggestions.ts) and must not
 * carry it.
 *
 * This is source-of-truth data for job-scout fit scoring, decoupled from the printable PDF so
 * nothing has to parse it at runtime. Keep this in sync by hand if the resume changes.
 */

export interface ResumeRole {
  title: string;
  company: string;
  companyContext: string;
  dates: string;
  bullets: string[];
}

export interface ResumeData {
  headline: string;
  highlights: string[];
  roles: ResumeRole[];
  areasOfExpertise: {
    technologiesAndTools: string[];
    salesMethodologies: string[];
    keySkills: string[];
  };
  education: string[];
  executiveEndorsement: string;
}

export const resumeData: ResumeData = {
  headline:
    "10+ years of experience in technical program leadership and solutions consulting, specializing in the life sciences and biopharma industries.",
  highlights: [
    "Revenue Impact: Influenced $2M+ in ARR at Benchling with 5 new logo acquisitions in the Strategic Enterprise segment; ranked top 2 Solutions Consultant for FY24.",
    "Presales Leadership: Launched new GTM strategies, developed repeatable demo assets, contributed to product roadmap, and supported onboarding of new SCs.",
    "Biopharma Expertise: 10+ years working in highly regulated biopharma environments (21 CFR Part 11/210/211, ISO 13485); recognized SME in GMP manufacturing and facility commissioning.",
    "Demo Expertise: Delivered SQL-driven demos, led POCs, and scoped enterprise solutions across R&D environments, enabling global biopharma teams to streamline operations.",
    "Health & Life Sciences (HLS): 12+ years delivering technical solutions for global biopharma organizations, aligning SaaS platforms and lab infrastructure with regulatory standards to improve scientific outcomes.",
  ],
  roles: [
    {
      title: "Senior Implementations Manager",
      company: "Collate",
      companyContext: "AI for Life Sciences",
      dates: "May 2026 - Present",
      bullets: [
        "Led 0 -> 1 Implementation for AI software solutions across Enterprise Biopharma organizations, translating business requirements into production ready workflows.",
        "Developed implementation framework for build, test, and deploy sprints, enabling scalable customer onboarding and cross-functional collaboration across engineering and GTM.",
        "Drove customer success and user adoption through weekly user and stakeholder engagement, aligning teams on strategic priorities and product planning.",
        "Delivered product demonstrations and solution workshops to IT, Regulatory, and Clinical stakeholders, supporting expansion opportunities and new use case adoption.",
      ],
    },
    {
      title: "Personal Sabbatical",
      company: "Personal Sabbatical",
      companyContext: "Took time off to care for family and explore personal projects",
      dates: "Jun 2024 - Present",
      bullets: [
        "Maintained technical fluency by building applications with Python, SQL, and GenAI tools (ChatGPT, Cursor).",
      ],
    },
    {
      title: "Solutions Consultant",
      company: "Benchling",
      companyContext: "Life Sciences SaaS",
      dates: "Jan 2022 - Jun 2024",
      bullets: [
        "$2M+ in ARR within the Strategic Enterprise segment, with an average ACV of $150K.",
        "Led discovery, technical demos, and POCs across 3-12 month sales cycles; served as trusted advisor to global biopharma clients.",
        "Closed deals with new logos including GRAIL, Exelixis, and Google X, contributing to more than 20% of segment revenue in 2023.",
        "Delivered tailored SQL-driven product demos and scoped complex configurations for scientific R&D use cases.",
        "Supported GTM for a new vertical and product launch (Bioprocess); created demo assets and collaborated with marketing.",
        "Partnered with Product and Engineering to document product gaps and shape roadmap decisions.",
        "Supported RFI/RFP responses; developed reusable frameworks and knowledge base for team enablement.",
        "Promoted to handle Global Enterprise accounts due to performance and ability to manage complex deals in 2024.",
      ],
    },
    {
      title: "Scientific Program Manager",
      company: "Genentech",
      companyContext: "Biopharma R&D & Manufacturing",
      dates: "Jul 2013 - Dec 2021",
      bullets: [
        "Led scientific operations and capital projects supporting R&D and GMP manufacturing across process chemistry teams.",
        "Delivered $50M CapEx facility project on time and on budget over 4 years; led 25% of project team.",
        "Supported 30+ internal implementation projects to expand R&D capabilities, improve compliance, and onboard new technologies.",
        "Managed internal R&D and GMP manufacturing operations supporting clinical API delivery for early-stage programs.",
        "Recruited and developed team of 6, promoting 3 of the 6 within 3 years.",
        "Presented outcomes and operational metrics to executive leadership; received Genentech Key Researcher Award (Top 5%).",
        "SME for cleaning rationale and containment manufacturing; invited speaker at HP API Summit and Roche global forums.",
      ],
    },
    {
      title: "Sr. Bio-Process Technician",
      company: "Merck & Co., Inc.",
      companyContext: "Vaccine Manufacturing",
      dates: "Feb 2012 - Jul 2013",
      bullets: [
        "Led daily operations on the manufacturing floor with 30+ technicians; managed KPIs and ensured compliance.",
        "Conducted deviation investigations and maintained quality standards across MES and DeltaV systems.",
      ],
    },
  ],
  areasOfExpertise: {
    technologiesAndTools: [
      "AutoCAD",
      "Benchling",
      "DeltaV",
      "Firebase Studio",
      "Google Cloud",
      "HubSpot",
      "MES",
      "Python",
      "R",
      "Salesforce",
      "SAP",
      "SQL",
      "Tableau",
      "TrackWise",
      "Veeva",
    ],
    salesMethodologies: ["BANT", "Demo2Win", "MEDDIC/MEDDPICC", "Value Selling"],
    keySkills: [
      "Technical Discovery",
      "RFPs",
      "Technical Demos",
      "Product Feedback",
      "GMP Compliance",
      "Lab Infrastructure",
      "API",
    ],
  },
  education: ["B.S. in General Biology | University of California, San Diego"],
  executiveEndorsement:
    "Qian Dong, Solutions Team Lead at Benchling: \"Winston was a huge asset to our Solutions Consulting team. He ramped fast, jumped right into complex use cases, and immediately helped close new logos. What makes him stand out is his ability to turn scientific complexity into clear business impact. He adapts quickly to new products and GTM launches, reads the room across different personas, and flags potential blockers before they slow a deal. He's independent and resourceful, but also generous with his time, mentoring teammates and sharing knowledge across the team. I'm confident Winston will excel in any fast-moving environment where building trust, solving tough problems, and navigating ambiguity are key.\"",
};
