# Security policy

The security of Around the World and of the people who use it matters. Around the World is
played by children: it listens to a microphone for a shouted answer, and it joins children
together in a room in real time. We treat every report seriously.

## Supported versions

Around the World is under active development and has no released versions yet. Security fixes are made on
the `main` branch only.

| Version | Supported |
|---|---|
| `main` | Yes |
| Anything else | No |

## Reporting a vulnerability

**Do not report a security vulnerability in a public GitHub issue, discussion or pull request.**

Report it privately through GitHub's
[private vulnerability reporting](https://github.com/QuinntyneBrown/around-the-world/security/advisories/new)
for this repository. If that is not available to you, contact the repository owner privately
through their [GitHub profile](https://github.com/QuinntyneBrown).

Include as much of the following as you can:

- the kind of issue (for example, a way to send free text or audio to another player, to join or control
  a room without its code, to decide a duel from the client, a Content-Security-Policy bypass,
  injection or cross-site scripting);
- the affected page, endpoint or source file, with the branch or commit;
- the steps to reproduce it, and the browser and host it needs;
- a proof of concept, if you have one;
- the impact, and how an attacker could use it.

## What to expect

- We acknowledge a report within **three business days**.
- We confirm or rule out the issue and share an expected timeline within **ten business days**.
- We keep you informed until it is fixed, and credit you in the advisory unless you would rather
  stay anonymous.

Please give us reasonable time to fix an issue before you disclose it publicly.

## Scope

In scope: the code in this repository, the app and its backend, and anything that lets one player reach another beyond a sticker, that
records or sends microphone audio, or that identifies a child.

Out of scope: denial-of-service testing, social engineering, physical attacks, and findings in
third-party dependencies that are already publicly known (report those to the dependency's
maintainers).

Test only against your own copy of Around the World and rooms you made yourself, and never join
a room of children you do not know.
