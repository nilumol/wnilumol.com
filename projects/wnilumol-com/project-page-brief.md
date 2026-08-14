# The Genesis of wnilumol.com

> wnilumol.com presents my body of work — and, just as much, the work itself: how I think, how I build, how I use the tools in front of me.

I built wnilumol.com so I could reevaluate my own workflows, examine opportunities to improve how I work, and follow skilled developers that are using AI to greatly improve productivity. I also wanted a place where I could clearly articulate what I have learned through my experiences—to prospective employers, peers, and anyone interested in how I think and work.

The site is a portfolio, but that description only captures part of its purpose. It is also an ongoing learning lab: a place where I can move beyond reading about new technology and develop an informed perspective by building with it myself.

## Learning by building

**The beauty of building is that it creates a different kind of understanding.** It forces me to make decisions, confront tradeoffs, and see where my assumptions break down. A tool can sound compelling in an article or demonstration, but its value becomes clearer when I have to decide where it fits, what information it needs, how it interacts with other tools, and whether its output actually improves the result.

That is what this site gives me: a real project with real constraints. I have to consider how information is organized, how a reader moves through a page, how a design becomes a reusable component, how a change is tested, and how the finished work reaches its audience. I am learning Next.js, React, TypeScript, GitHub, AI SDK, and MCPs but the larger lesson is how these technologies are orchestrated in a complete system.

Vercel has been particularly useful in understanding how to deploy modern web applications and integrate with AI products. Working within that ecosystem helps me understand the path from a local idea to a version that can be previewed, evaluated, and ultimately shared. Deployment is not a final administrative step. It is part of the feedback loop: once something is live, I can experience it as a user, identify what is unclear, and decide what to improve next.

wnilumol.com has also become a reason to study my own work more closely.

I've been particularly focused on working with modern tools, architecting my workflow in a way that allows for 10x-ing my output by leveraging an agent that can oversee my work and manage multiple agents at the same time. I'm also using loop-style work to let my agents run overnight and build something I have never built before. For instance, this website is the first time I've ever built a website purely using Next.js, GitHub, and Vercel.

I'm learning specifically how to work with AI by building skills.md and agent.md files which hold project-level principles and rules for the agents, and how to iterate on those files. For example when I recognize that an agent is potentially going in the wrong direction or making a mistake, I can course-correct and ask that agent to summarize the lesson learned into my agent.md file. By doing this I can constantly look to improve on the accuracy in which the agent is producing its output and architect my own workflow that way. So far the tools that I have used to generate a v1 of wnilumol.com are:
- WezTerm
- Tmux
- Codex
- Claude Code
- Wispr Flow
- GitHub
- Vercel

I can then compare my approach with how experienced engineers, designers, and AI practitioners structure their work. The objective is not to imitate every new technique or maximize output for its own sake. It is to understand which practices produce better thinking, clearer communication, and more useful results. So far my favorite developer to follow is Kun Chen, who showed me that optimizing for workflow is really optimizing for output. Something as simple as using Wispr Flow to jot down ideas instead of typing them—speaking is roughly 3x faster—or building harnesses around AI agents, can drastically change what you're able to produce.

This makes the site a safe place to experiment. By generating content, it allows me to think deeply about what I want to convey and how I package ideas. And with AI, a successful example can become a reusable template. An unsuccessful attempt can be used as a rule on what not to do on the next iteration.

## Architecture is more than code

One of the most important things I have learned is that **architecture shapes how work gets done.**

I initially thought about folder structure mainly as a way to keep files organized. Working with AI coding agents showed me that the hierarchy also affects what an agent can find, which instructions it follows, and how agents can be optimized by filtering out irrelevant context it must navigate before completing a task.

If repository guidance, project knowledge, examples, and task-specific instructions are repeated or placed without a clear hierarchy, the system becomes harder to understand and maintain. Files such as `AGENTS.md` and `CLAUDE.md` may serve different AI tools, but they still need to express an aligned view of the project. Broad guidance should be available where it applies across the site, while specialized knowledge should remain close to the work that needs it.

It is not simply the technical structure underneath a finished product. It is a way of deciding what belongs together, what should remain separate, which source is authoritative, and what context should be available at a particular moment.

Those same principles matter for enterprise technology systems as well as my own personal workflow with AI. A clear structure makes the project easier to navigate, reduces duplicated knowledge, and clearly points to a single source of truth. As a project grows, early decisions about hierarchy can either support that growth or create friction that must later be untangled.


## An evolving practice

This site is intentionally a work in progress. I want it to evolve as I do.

My next area of exploration is orchestrating my own agent workflow and then building a prototype for public use. I also want to dive into understanding how frontier models are transitioning into frontier agents made for specialized tasks. As part of this exploration, I'd like to understand the underlying ML principles that are involved in optimizing, benchmarking, and producing better models for future use. As frontier models become more commonplace amongst households, like OpenAI and Claude, there are agents built specifically for complex tasks like protein structure prediction or exploiting software vulnerabilities.

As I uplevel my own understanding of what is the cutting edge of AI, I also want to uplevel my own personal workflow by incorporating a first mate where I can use an agent to direct multiple agents in delegating specialized work, reviewing the results, and summarizing all of this in an easy-to-read artifact. I'll be measuring my own success by building a workflow that is seamless and enables me to produce far more content and applications.

**The measure of success is not how many agents I can use or how much content they can generate.** It is whether the resulting system helps me think more clearly, make better decisions, communicate more effectively, and carry an idea through to a useful result.

## Why make the process visible?

My professional experience sits across several boundaries: science and software, technical systems and business value, strategy and implementation. Much of the value in that work comes from understanding how the pieces connect, translating between different perspectives, and turning an ambiguous problem into a practical path forward.

A traditional resume can describe where I have worked and what I have done. It is less effective at showing how I approach a new problem, how I develop judgment, or how I respond when the first answer is incomplete.

wnilumol.com gives me room to make that process visible. The projects I share here can show not only a finished result, but also the questions behind it, the architecture that supports it, the tradeoffs I considered, and what I would test next. They allow me to communicate what I have learned from my experience while continuing to challenge and expand that understanding.

That is why I chose to build the site myself. The site is not only a place to present my work. Building it is part of the work.
