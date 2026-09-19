# QA bug reporting

Use the `🐛 Bug Report` issue form to report one reproducible defect per issue.
Search existing issues first, then provide enough detail for another engineer
to reproduce the problem without a follow-up request.

## Required information

The form requires:

- affected area and environment;
- preconditions;
- numbered steps to reproduce;
- expected and actual behavior;
- safe test data;
- reproducibility;
- suggested severity; and
- confirmation that existing issues were searched.

Build/version, technical diagnostics, related issues or specifications, and
additional context are optional but useful. Screenshots and recordings are
optional because not every defect has visual evidence.

## Writing a reproducible report

Start from a known state and number every action. Include the account role,
subscription, feature flags, lobby membership, and existing records that matter.
Describe observable results rather than conclusions, and include exact error
messages or HTTP status codes when available. Link the relevant specification,
acceptance criterion, or test case when one exists.

## Attachments and safe test data

Attach screenshots, GIFs, or screen recordings in the upload field. Redact
passwords, access or refresh tokens, API keys, cookies, request headers, real
personal information, and other secrets before uploading.

Use synthetic or sanitized identifiers, such as
`qa-member@example.test`. Test data may include a role, subscription plan,
lobby configuration, event or task details, and sanitized API payloads, but must
never include credentials or production personal data.

## After a fix

Developers should link the fixing pull request and document any deployment or
configuration assumptions. QA should retest the original steps in the affected
environment, verify the expected behavior, and add regression coverage when
appropriate. If the fix works, comment with the tested build and environment
and close the issue according to the team's normal release process. If the
problem remains, reopen or comment with the new reproducible evidence.
