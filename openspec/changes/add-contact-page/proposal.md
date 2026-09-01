## Why

The public home page currently has no clear way for prospective users to contact the team. A dedicated contact flow gives visitors a lightweight way to share their needs while keeping the initial implementation frontend-only.

## What Changes

- Add a contact call-to-action at the bottom of the public home page.
- Add a responsive `/contact` page that follows the existing Mira visual language.
- Add a contact form for name, work email, company, optional role, and project details.
- Simulate submission locally with loading and success states; no message is sent to a backend.
- Add localized English and Chinese copy for the entry point, form, validation, and success state.

## Impact

- Affected specs: `contact-page`
- Affected code: public home page, locale messages, route layout behavior, and new contact page/components
- External services: none

