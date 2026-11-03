# AGENTS.md

See `CURRICULUM.md` for the course plan: structure, lesson list, and platform decisions.
All learner-facing text (lessons, quick start, site copy) follows the lesson format (§2) and writing style rules (§3) in `CURRICULUM.md`. Check new prose against them before finishing.
Code, demos and the code blocks in lessons use Prettier's default style. Run `npm run format` before finishing; the deploy fails on `npm run format:check`. Inline code in lesson prose quotes strings the way the formatted code does.

## Code health

Code health means keeping code simple to understand, change, and review. Complexity builds up from many small, individually reasonable decisions, is hard to reverse, and agents can pile it up fast; it counts most where people spend the most time, so a confusing shared interface costs more than a messy leaf function.
It shows up as **change amplification** (one change needs edits in many places), **cognitive load** (too much to hold in your head), and, worst, **unknown unknowns** (you can't tell what you need to know, so bugs land where nobody expected).

### Contracts and boundaries

A **boundary** is the line between code that uses something and code that provides it (functions, classes, components, modules, file formats, APIs); it decides what is *hidden*. A **contract** is the agreement across it: what callers provide, what the provider guarantees, and what stays true; it decides what is *promised*.

- **Draw boundaries around decisions likely to change**, such as data formats, storage, algorithms, and third-party APIs, so those decisions stay hidden and can change without touching callers.
- **Design the contract first**, before the interface or implementation. Ask who owns this behavior and what callers should be able to rely on.
- **Make it clear, concise, and complete.** Cover what applies: preconditions, guarantees, invariants, failure behavior, side effects, ownership, lifetime, and mutation.
- **Promise only what callers need.** By default, leave representation, ordering, threading, performance, and incidental output unpromised; with enough callers, anything observable gets relied on.
- **Enforce it at the boundary.** Callers own preconditions; providers own their guarantees, so callers don't need defensive checks. Prefer interfaces that make violations impossible to express; otherwise assert programmer errors and validate untrusted input, failing at the boundary instead of masking the violation.

### Interfaces

An interface is how a contract shows up in code: names, signatures, types, and errors. Every caller pays its cost on every use.

- **Keep it true.** Names, types, and docs must agree with what the code actually does. A name that promises more or less than the code does creates unknown unknowns. If something is hard to name, the concept is often muddled or sits at the wrong boundary.
- **Make it deep.** A deep interface hides real work (sequencing, bookkeeping, resource management, invariant enforcement) behind a few concepts. A shallow one exposes almost as much as it hides: forwarding wrappers, mirrors of internals, APIs that make callers coordinate state and ordering. Small is not the same as deep.
- **Make invalid states hard to express.** Prefer intention-revealing functions or types over broad option bags where only some field combinations are valid.

### Comments and docs

Document the contract, not the implementation. Every restated detail must change when the code does, and a stale comment misleads more than a missing one.

- Don't restate the body or its steps, name callers, or cite line numbers, usage counts, or another module's internals.
- Explain each fact once, at its owner. Elsewhere, point to the owner instead of copying the explanation.
- Don't copy values or message text that live in code. Name the constant or error code.

### Putting it together

Most tasks should be surgical changes that fit the existing design; keep these guidelines in mind anyway, since small changes are where complexity accumulates. When a task needs design, aim for the healthiest shape after the change, or, if that's out of scope, make the smaller change and call out the gap. Check the layers above in order of leverage: a well-designed interface on the wrong contract is wasted work.

1. **Requirements**: Is this the right problem? If the requirement is unclear or seems wrong, ask before designing.
2. **Boundaries and contracts**: What contract should exist afterward, and which existing module should own it? Will the next related change stay behind the boundary, or fan out to callers?
3. **Interfaces**: Does it tell the truth, hide real work, and make invalid states hard to express?
4. **Implementation**: Does this duplicate knowledge, add a dependency, or leave ordering, lifetime, or ownership assumptions implicit?
5. **Comments**: Does each comment state only the contract or a constraint the code can't show?

### Plan mode guidance

When creating a plan, make it specific enough for an engineer to review and
tweak directly. The plan should map out the intended changes, not defer design
decisions to implementation.

Avoid vague or conditional steps such as "add this if needed", "determine if X
is adequate", "consider whether", or similar fuzzy instructions. If more
investigation is required before the plan can be specific, do that investigation
first or call out the exact open question and what information is needed to
answer it.

Use this structure:

1. Objective of changes
   - State the intended outcome and why the change is needed.
2. Functionality and requirements
   - List the behaviors, constraints, compatibility concerns, and project rules
     the implementation must satisfy.
3. Interface and function changes
   - Identify any new or changed interfaces, functions, classes, or files.
   - Before adding anything new, first check whether the behavior belongs in an
     existing interface or module.
   - Add new files, classes, or functions only when the required code has no
     clean existing home.
   - For each proposed addition or change, include:
     - The shape of the interface or function as a code snippet.
     - Comments in the snippet describing what was added or changed.
     - Why the change is needed.
     - The file location where it should be added.
4. Implementation guidance
   - Describe the general implementation approach.
   - Prefer existing project patterns and local abstractions.
   - Keep code organized, avoid bloat, and avoid introducing shallow wrappers.
5. Phases
   - Break the work into reviewable phases.
   - Each phase should have a clear purpose and expected result.
   - Include an explicit cleanup phase for removing legacy, duplicated, or
     unneeded code created or exposed by the change, especially for refactors.
