# Contributing

Thank you for helping make warnahead more accurate.

warnahead is proprietary software, free to use under the terms in [LICENSE.md](LICENSE.md). Its
source code is not in this repository, so this repository does not accept pull requests. Every
contribution comes through an issue:

- **A date or rule is wrong:** use the "Wrong date or rule" form. Link the platform's own page
  (Google Play, Apple, GitHub, Expo, the runtime's release page) and quote the sentence that shows
  it. Every entry in the dataset needs a primary source, so a link and a quote are what let us fix
  it quickly.
- **A deadline is missing:** use the "Missing deadline" form, with the same kind of link and quote.
- **The CLI or the Action did something wrong:** use the "Bug report" form. Include the command or
  workflow step, the version (`npx warnahead --version`), and the output. Please do not paste
  secrets, tokens or private code; a small made-up repository that shows the problem is best.

Data corrections are checked against their source and then published in a data update. A clean
result from warnahead means nothing it can detect, not that nothing is due.

Security problems: please do not open a public issue; see [SECURITY.md](SECURITY.md).
