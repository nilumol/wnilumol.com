export function DocumentOutputArchitecture() {
  return (
    <svg className="gxp-architecture-svg" viewBox="0 0 1100 760" role="img" aria-labelledby="architecture-title architecture-description">
      <title id="architecture-title">Controlled AI architecture for transforming a source document into reviewed outputs</title>
      <desc id="architecture-description">A user request and document system of record feed a controlled application boundary. Authorized context supplies templates and requirements. The workflow retrieves sources, applies logic, orchestrates model calls, and retains provenance before human review produces two evidence-linked outputs.</desc>
      <defs>
        <marker id="gxp-svg-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#191919" /></marker>
        <marker id="gxp-svg-arrow-dashed" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#666" /></marker>
      </defs>

      <rect x="300" y="55" width="500" height="580" className="boundary" />
      <text x="550" y="87" className="title">Controlled Application Boundary</text>
      <text x="550" y="106" className="sub">Identity · permissions · task boundary · auditability</text>

      <rect x="20" y="80" width="220" height="72" className="box" />
      <text x="130" y="110" className="title">User Request</text>
      <text x="130" y="132" className="sub">Natural language prompt + Document ID</text>

      <rect x="20" y="205" width="220" height="92" className="box" />
      <text x="130" y="235" className="title">System of Record</text>
      <text x="130" y="258" className="sub">Document</text>
      <text x="130" y="278" className="sub">content · metadata · tables · attachments</text>

      <rect x="20" y="390" width="220" height="112" className="soft-box" />
      <text x="130" y="420" className="title">Authorized Context</text>
      <text x="130" y="443" className="sub">Templates · example documents</text>
      <text x="130" y="463" className="sub">gold standards · terminology</text>
      <text x="130" y="483" className="sub">applicable regulatory requirements</text>

      <rect x="345" y="135" width="410" height="60" className="box" />
      <text x="550" y="162" className="title">1. Authenticate &amp; Define Context</text>
      <text x="550" y="182" className="sub">User · permissions · intended use · accessible records</text>

      <rect x="345" y="225" width="410" height="70" className="box" />
      <text x="550" y="252" className="title">2. Retrieve &amp; Extract Source Evidence</text>
      <text x="550" y="273" className="sub">Resolve Document ID · retrieve authorized content · retain provenance</text>

      <rect x="345" y="325" width="410" height="82" className="box" />
      <text x="550" y="352" className="title">3. Apply Business &amp; Regulatory Logic</text>
      <text x="550" y="373" className="sub">Document boundaries · mappings · required content</text>
      <text x="550" y="393" className="sub">Document structures · templates · formatting rules</text>

      <rect x="345" y="437" width="410" height="72" className="box" />
      <text x="550" y="465" className="title">4. Orchestrate LLM Calls</text>
      <text x="550" y="486" className="sub">Summarize · transform · draft · check</text>

      <rect x="345" y="539" width="410" height="64" className="box" />
      <text x="550" y="566" className="title">5. Assemble Evidence-Linked Drafts</text>
      <text x="550" y="586" className="sub">Structured output · claim-to-source links · audit record</text>

      <rect x="855" y="428" width="220" height="90" className="box" />
      <text x="965" y="458" className="title">AI Platform · LLM</text>
      <text x="965" y="481" className="sub">Task-specific model calls</text>
      <text x="965" y="501" className="sub">No direct system-of-record access</text>

      <rect x="370" y="670" width="360" height="66" className="soft-box" />
      <text x="550" y="697" className="title">Qualified Human Review &amp; Decision</text>
      <text x="550" y="718" className="sub">Verify · revise · approve · reject</text>

      <rect x="820" y="610" width="255" height="66" className="box" />
      <text x="947" y="637" className="title">Stakeholder Output</text>
      <text x="947" y="658" className="sub">Decision-ready summary</text>

      <rect x="820" y="694" width="255" height="66" className="box" />
      <text x="947" y="721" className="title">Technical Output</text>
      <text x="947" y="742" className="sub">Reviewed controlled document</text>

      <path d="M240 116H290V165H335" className="line" />
      <path d="M240 251H335" className="line" />
      <rect x="244" y="226" width="80" height="19" className="label-mask" />
      <text x="284" y="240" className="edge-label">API retrieval</text>
      <path d="M240 446H275V366H335" className="line-dashed" />
      <rect x="222" y="411" width="106" height="19" className="label-mask" />
      <text x="275" y="425" className="edge-label">controlled context</text>

      <path d="M550 195V215" className="line" />
      <path d="M550 295V315" className="line" />
      <path d="M550 407V427" className="line" />
      <path d="M550 509V529" className="line" />

      <path d="M755 461H845" className="line" />
      <path d="M845 490H765" className="line-dashed" />
      <rect x="753" y="436" width="98" height="19" className="label-mask" />
      <text x="802" y="450" className="edge-label">prompt + evidence</text>
      <rect x="760" y="497" width="90" height="19" className="label-mask" />
      <text x="805" y="511" className="edge-label">model response</text>

      <path d="M550 603V660" className="line" />
      <path d="M730 703H780V643H810" className="line" />
      <path d="M730 703H810" className="line" />
    </svg>
  );
}
