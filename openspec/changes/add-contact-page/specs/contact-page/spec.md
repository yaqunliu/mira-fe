## ADDED Requirements

### Requirement: Contact entry point

The public home page SHALL provide a clearly labeled contact action near the bottom of the page that navigates to the localized contact page.

#### Scenario: Visitor opens the contact page

- **WHEN** a visitor activates the contact action on the home page
- **THEN** the application navigates to the contact page without requiring authentication

### Requirement: Contact form

The contact page SHALL present fields for full name, work email, company, optional role, and a project message, together with direct contact information.

#### Scenario: Visitor views the form

- **WHEN** the contact page loads
- **THEN** all contact fields, the submit action, and direct contact information are visible in the active locale

#### Scenario: Required information is missing

- **WHEN** a visitor submits the form without a valid name, email, company, or project message
- **THEN** the page prevents submission and identifies the fields that require attention

### Requirement: Simulated contact submission

The contact page SHALL simulate a successful submission locally without calling an external service.

#### Scenario: Valid form is submitted

- **WHEN** a visitor submits valid required information
- **THEN** the submit action briefly shows a pending state and the form transitions to a success confirmation

#### Scenario: Visitor sends another message

- **WHEN** a visitor activates the send-another-message action from the success confirmation
- **THEN** the page returns to a cleared contact form
