# Security

## Reporting a vulnerability

Please report security problems privately, not in a public issue: open the **Security** tab of
this repository and choose **Report a vulnerability**. If that option is not available, open an
issue that only asks for a private contact, without any details of the problem.

You can expect a first reply within 7 days. Please give us a reasonable time to fix the problem
before you share it with others.

## Supported versions

Fixes go into the latest release. Pin the Action to `warnahead/action@v0` (or a full release tag)
and use the latest `warnahead` from npm to receive them.

## What warnahead does with your repository

- The CLI reads files in the directory you point it at. It never reads `.env` files and never
  prints tokens.
- The CLI makes one network request: a GET of the public deadline dataset. `--offline` turns off
  all network access. No telemetry; no repository content is sent anywhere.
- The Action uses only the `GITHUB_TOKEN` of the workflow, to manage its issues and, when allowed,
  to read `action.yml` of the actions your workflows use.
