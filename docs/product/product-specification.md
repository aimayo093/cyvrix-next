# CYVRIX AI AUTOMATED ASSESSMENT PLATFORM

## MASTER PRODUCT SPECIFICATION AND BUILD PROMPT

You are acting as the:

* Principal Software Architect
* Senior Full-Stack Engineer
* Cloud Security Architect
* Microsoft 365 Security Engineer
* Network Security Engineer
* DevSecOps Engineer
* SaaS Product Architect
* AI Systems Engineer
* Database Architect
* UX/UI Lead
* QA Lead

Your assignment is to design and build a production-grade multi-tenant SaaS platform for **Cyvrix Limited** called:

# Cyvrix Assessment Engine

The platform will automate IT infrastructure, cybersecurity, Microsoft 365, cloud, network and compliance assessments for organisations.

The system must securely collect technical evidence from authorised customer environments, analyse it using deterministic security rules, enrich the findings using AI, calculate risk scores, generate executive and technical reports, recommend remediation actions and convert findings into actionable Cyvrix consulting or managed-service opportunities.

Do not build this as a simple questionnaire application.

The long-term objective is to create an automated technology assessment and continuous security posture platform for Cyvrix.

---

# 1. CORE PRODUCT VISION

The platform should allow a business customer to:

1. Create an organisation account.
2. Select an assessment.
3. Authorise Cyvrix to inspect relevant systems.
4. Connect supported cloud or Microsoft environments.
5. Optionally deploy a network/endpoint discovery agent.
6. Automatically collect evidence.
7. Run deterministic technical checks.
8. Analyse findings.
9. Calculate risk and health scores.
10. Receive prioritised recommendations.
11. Generate professional assessment reports.
12. Request Cyvrix remediation.
13. Track remediation progress.
14. Repeat assessments.
15. Eventually enable continuous security monitoring.

The platform must initially support:

* Free IT Health Check
* Microsoft 365 Security Assessment
* Cybersecurity Assessment
* Cloud Readiness Assessment
* Network Assessment

The underlying engine must be modular so additional assessments can later be created without rebuilding the application.

Future modules should support:

* Cyber Essentials readiness
* Cyber Essentials Plus preparation
* CIS Controls
* CIS Benchmarks
* NIST Cybersecurity Framework
* ISO 27001 readiness
* GDPR technical readiness
* Backup and disaster recovery assessment
* Endpoint security assessment
* Vulnerability management assessment
* Active Directory assessment
* Azure security assessment
* AWS security assessment
* Google Cloud security assessment
* SaaS security assessment
* Zero Trust maturity assessment
* AI security assessment

---

# 2. PRODUCT PRINCIPLES

The platform must follow these principles.

## Evidence before AI

AI must never invent a security finding.

Every technical finding must originate from:

* collected evidence
* scanner output
* API response
* configuration state
* deterministic rule
* approved customer questionnaire response
* imported evidence

AI may explain, summarise, prioritise and recommend.

AI may not fabricate evidence.

---

## Read-only by default

All assessment integrations must request the minimum possible permissions.

Initial assessment functions must prefer:

* read-only access
* delegated access where appropriate
* scoped service principals
* temporary credentials where possible

Write access must not be required merely to perform an assessment.

---

## Explicit authorisation

Never scan infrastructure that has not been explicitly authorised by the customer.

Before any network scan, vulnerability check or active discovery process, collect:

* organisation
* authorised person
* approved IP ranges
* approved domains
* approved cloud accounts/subscriptions
* assessment scope
* assessment window if applicable
* acknowledgment of authority

Store this authorisation in the audit trail.

---

# 3. MULTI-TENANT SAAS ARCHITECTURE

Build a true multi-tenant SaaS application.

Every customer organisation must have logically isolated:

* users
* assessments
* findings
* evidence
* cloud integrations
* devices
* network information
* reports
* remediation projects
* documents
* audit events
* billing information

Never allow one tenant to access another tenant's data.

Implement tenant isolation at:

* API layer
* database layer
* object storage layer
* background-job layer
* reporting layer
* AI retrieval layer

Where supported, use database Row Level Security.

---

# 4. USER TYPES

Implement the following roles.

## Cyvrix Super Admin

Full platform control.

Can:

* manage organisations
* manage Cyvrix staff
* manage assessment templates
* manage scoring rules
* manage AI prompts
* manage integrations
* manage reports
* manage subscriptions
* view system health
* review audit logs
* configure remediation products
* manage compliance mappings
* configure platform settings

---

## Cyvrix Security Consultant

Can:

* review assessments
* review findings
* add analyst notes
* validate findings
* modify recommendations where authorised
* prepare remediation proposals
* generate reports
* interact with customers

Cannot modify global platform security settings unless separately authorised.

---

## Customer Organisation Owner

Can:

* manage organisation
* invite users
* authorise assessments
* connect services
* view all organisation findings
* approve remediation
* download reports
* manage subscription

---

## Customer Administrator

Can:

* run assessments
* manage integrations
* view technical findings
* upload evidence
* assign remediation tasks

---

## Customer Executive

Can primarily view:

* overall scores
* executive dashboards
* business risk
* trends
* recommendations
* reports

Technical credentials must never be visible to this role.

---

## Read-Only Auditor

Can inspect authorised assessment evidence and reports without changing configuration.

---

# 5. MAIN CUSTOMER DASHBOARD

The customer dashboard should display:

## Overall Technology Health

Example:

Technology Health Score

82 / 100

Status:

Good

---

## Security Posture

76 / 100

---

## Cloud Readiness

68 / 100

---

## Network Health

91 / 100

---

## Microsoft 365 Security

73 / 100

---

Display:

* Critical findings
* High findings
* Medium findings
* Low findings
* Passed controls
* Assessments in progress
* Last assessment
* Next recommended assessment
* Remediation progress

Include score trends over time.

Example:

January: 61
February: 69
March: 76
April: 84

---

# 6. ASSESSMENT CATALOGUE

Create an assessment catalogue.

Cards should include:

* category
* assessment name
* description
* estimated time
* required integrations
* whether an agent is required
* pricing status
* Start Assessment button

Initial assessments:

## Technology Foundations

### Free IT Health Check

Description:

Perform an automated review of fundamental IT systems, identity, endpoints, cloud services, email security, patching, backup readiness and infrastructure health.

---

## Identity & Collaboration Security

### Microsoft 365 Security Assessment

Review:

* Entra ID
* authentication
* privileged access
* Conditional Access
* Exchange Online
* Defender
* SharePoint
* OneDrive
* Teams
* Intune
* device compliance
* email security

---

## Security Readiness

### Cybersecurity Assessment

Assess overall cyber resilience across:

* identity
* endpoint
* infrastructure
* network
* cloud
* data
* backup
* vulnerability management
* email
* security operations
* logging
* incident response

---

## Cloud Planning

### Cloud Readiness Assessment

Support:

* Azure
* AWS
* Google Cloud
* on-premises infrastructure

Assess:

* workloads
* applications
* dependencies
* migration suitability
* modernisation opportunities
* security
* performance
* networking
* estimated cloud architecture

---

## Infrastructure & Connectivity

### Network Assessment

Assess:

* routers
* switches
* firewalls
* wireless
* VLANs
* servers
* WAN
* VPN
* DNS
* DHCP
* topology
* performance
* firmware
* segmentation
* security configuration

---

# 7. ASSESSMENT WORKFLOW

Use the following workflow.

## Step 1 — Select Assessment

Customer chooses an assessment.

---

## Step 2 — Scope

Collect relevant scope information.

Examples:

* domain
* number of employees
* offices
* Microsoft tenant
* cloud providers
* public IP ranges
* network ranges
* infrastructure type
* number of endpoints
* critical systems

---

## Step 3 — Authorisation

Customer confirms they are authorised to request the assessment.

Generate an assessment authorisation record containing:

* organisation
* user
* timestamp
* scope
* IP ranges
* services
* acknowledgement
* terms version

---

## Step 4 — Connect Systems

Offer applicable connectors.

Examples:

Microsoft 365

Azure

AWS

Google Cloud

Network Discovery Agent

Endpoint Agent

Firewall API

VMware

Hyper-V

Backup systems

---

## Step 5 — Preflight Validation

Verify:

* connectivity
* permissions
* API availability
* credentials
* scope
* agent health

Show failures before assessment begins.

---

## Step 6 — Collect Evidence

Run collectors.

Do not perform AI analysis yet.

---

## Step 7 — Normalise Evidence

Convert provider-specific information to a standard internal evidence model.

---

## Step 8 — Execute Rules

Run deterministic assessment rules.

---

## Step 9 — Calculate Scores

Calculate:

* control score
* domain score
* assessment score
* overall health score

---

## Step 10 — AI Analysis

AI converts technical findings into:

* business impact
* technical explanation
* recommended action
* remediation guidance
* executive summary

---

## Step 11 — Generate Report

Create:

* dashboard
* executive report
* technical report
* remediation roadmap

---

## Step 12 — Commercial Conversion

Offer:

* Request Remediation
* Book Consultation
* Request Managed IT Support
* Request Cybersecurity Support

---

# 8. ASSESSMENT ORCHESTRATOR

Create a central assessment orchestration service.

Responsibilities:

* start assessment
* validate scope
* launch collection jobs
* track job status
* manage dependencies
* handle retries
* enforce timeouts
* update progress
* coordinate evidence processing
* trigger rules engine
* trigger scoring
* trigger AI analysis
* generate report
* notify customer

Assessment statuses:

* draft
* awaiting_authorisation
* awaiting_connection
* queued
* collecting
* analysing
* generating_report
* completed
* partially_completed
* failed
* cancelled

---

# 9. MICROSOFT 365 CONNECTOR

Build Microsoft integration around Microsoft Graph and supported Microsoft service APIs.

Use OAuth.

Support secure tenant consent.

Collect appropriate information concerning:

## Entra ID

* users
* groups
* devices
* privileged roles
* role assignments
* guest users
* dormant accounts
* authentication methods
* MFA registration
* Conditional Access
* sign-in configuration
* risky identity information where licensing permits
* service principals
* enterprise applications

---

## Exchange Online

Assess:

* external forwarding
* accepted domains
* DKIM
* mailbox configuration
* anti-spam policies
* anti-phishing configuration
* outbound spam controls
* transport rules
* mailbox auditing where available

---

## Microsoft Defender

Where customer licensing permits:

* Defender configuration
* security recommendations
* alerts
* endpoint exposure
* security settings
* attack surface reduction

---

## Intune

Collect:

* managed devices
* compliance state
* encryption
* OS versions
* configuration policy
* security baselines
* update state

---

## SharePoint / OneDrive

Analyse:

* external sharing
* anonymous links
* guest access
* tenant sharing configuration

---

# 10. MICROSOFT 365 SECURITY RULE EXAMPLES

Create version-controlled deterministic rules.

Example:

Rule:

M365-ID-001

Name:

Privileged account without MFA

Logic:

IF privileged_role = true
AND strong_authentication_registered = false

Severity:

Critical

Category:

Identity

Framework mapping:

* CIS
* NIST
* Cyber Essentials
* Microsoft best practice

---

Example:

M365-ID-002

Name:

Excessive Global Administrators

Evaluate tenant against configurable threshold.

---

Example:

M365-EXO-001

Name:

Automatic external forwarding permitted.

---

Example:

M365-ID-003

Name:

Legacy authentication permitted.

---

Example:

M365-SPO-001

Name:

Overly permissive external sharing.

---

# 11. AZURE CONNECTOR

Support Azure environments.

Collect:

* subscriptions
* resource groups
* virtual machines
* virtual networks
* storage accounts
* NSGs
* public IPs
* Azure SQL
* Key Vault
* App Services
* Functions
* AKS where appropriate
* Defender for Cloud
* identities
* policy
* activity logging
* backup configuration

Assess:

* public exposure
* encryption
* logging
* identity
* permissions
* network security
* backup
* resource configuration
* resilience
* security recommendations

---

# 12. AWS CONNECTOR

Support secure AssumeRole access.

Collect:

* accounts
* IAM
* EC2
* VPC
* Security Groups
* S3
* RDS
* CloudTrail
* Config
* GuardDuty where enabled
* KMS
* Lambda
* EKS
* backups
* public resources

Assess:

* IAM
* root account protection
* MFA
* excessive permissions
* public buckets
* exposed services
* logging
* encryption
* backups
* network segmentation
* security controls

---

# 13. GOOGLE CLOUD CONNECTOR

Support Google Cloud Platform.

Collect:

* projects
* IAM
* Compute Engine
* VPC
* firewall rules
* Cloud Storage
* Cloud SQL
* Kubernetes
* logging
* security services
* service accounts
* encryption configuration

Assess:

* excessive privileges
* service account risks
* public resources
* exposed firewall rules
* logging
* encryption
* resilience
* network design

---

# 14. NETWORK DISCOVERY AGENT

Build a lightweight discovery agent.

The agent will be installed only in customer environments where explicit assessment authorisation has been granted.

Support:

* Windows
* Linux

Prefer eventually supporting Docker deployment.

The agent should perform approved inventory and configuration discovery using methods such as:

* ICMP where appropriate
* ARP
* SNMP
* LLDP
* CDP
* WMI
* WinRM
* SSH
* vendor APIs
* DNS information
* DHCP information

Support authorised device discovery for:

* Cisco
* Fortinet
* Aruba
* Ubiquiti
* HP/HPE
* Dell
* Juniper
* Sophos
* Palo Alto
* WatchGuard
* Meraki

Design a plugin architecture so additional vendors can be added.

Do not store plaintext network credentials.

---

# 15. NETWORK INVENTORY

Create inventory records for:

* device
* hostname
* IP address
* MAC address
* manufacturer
* model
* serial number where available
* firmware
* operating system
* interfaces
* VLAN
* role
* location
* management state
* discovered date
* last seen date

Potential roles:

* firewall
* router
* core switch
* access switch
* wireless controller
* wireless AP
* server
* hypervisor
* workstation
* printer
* storage
* VoIP
* IoT
* unknown

---

# 16. NETWORK TOPOLOGY ENGINE

Use discovery information to generate network topology.

Potential relationships:

Device A

connected_to

Device B

Use data including:

* LLDP
* CDP
* MAC tables
* ARP tables
* routing
* VLAN membership
* interface data

Generate interactive network diagrams.

Allow:

* zoom
* filtering
* search
* device selection
* export

---

# 17. NETWORK ASSESSMENT CHECKS

Examples:

* unsupported firmware
* flat network
* management interfaces exposed
* weak SNMP configuration
* insecure management protocols
* unnecessary services
* VLAN misconfiguration
* missing segmentation
* risky firewall policies
* missing redundancy
* DNS issues
* DHCP problems
* VPN configuration concerns
* wireless security issues
* outdated devices
* single points of failure

Passive inspection should be preferred.

Any active security testing must require explicit scope and authorisation.

---

# 18. ENDPOINT COLLECTION

Where an organisation chooses to deploy endpoint collection, collect information such as:

* hostname
* OS
* OS version
* installed patches
* encryption
* antivirus
* EDR
* firewall
* hardware details
* uptime
* disk capacity
* local administrative configuration
* update status

Do not collect personal user files.

---

# 19. FREE IT HEALTH CHECK

The Free IT Health Check should provide rapid lead-generation value.

Analyse relevant available information across:

* Microsoft 365
* email security
* identity
* endpoint
* patching
* backup
* DNS
* domain configuration
* cloud
* network
* server health

Do not require every connector.

Generate a partial assessment where some systems are unavailable.

Clearly indicate:

Coverage: 68%

for example.

Do not imply checks were completed where evidence was unavailable.

---

# 20. CYBERSECURITY ASSESSMENT

Structure this assessment into domains.

## Identity and Access Management

## Endpoint Security

## Network Security

## Cloud Security

## Email Security

## Vulnerability Management

## Backup and Recovery

## Logging and Monitoring

## Incident Response

## Data Protection

## Security Governance

## Third-Party Risk

## Security Awareness

Technical domains should rely on collected evidence where available.

Governance domains may use a guided questionnaire and uploaded documentation.

---

# 21. CLOUD READINESS ENGINE

The Cloud Readiness module must support organisations evaluating migration or modernisation.

Collect:

* server inventory
* CPU
* RAM
* storage
* operating systems
* databases
* dependencies
* network connectivity
* utilisation
* criticality
* recovery requirements
* availability requirements

Classify workloads.

Example classifications:

* Rehost
* Replatform
* Refactor
* Repurchase
* Retain
* Retire

Produce:

* migration candidate list
* migration blockers
* security risks
* recommended target services
* migration sequence
* migration waves
* modernisation opportunities

---

# 22. CLOUD COST ESTIMATION

Design an extensible pricing engine.

Where provider pricing APIs or approved pricing datasets are available, estimate migration costs.

All estimates must clearly state that pricing is indicative.

Calculate potential:

* compute
* storage
* network
* database
* backup
* monitoring

Support future comparison:

Azure vs AWS vs Google Cloud.

---

# 23. EVIDENCE ENGINE

Create a standard evidence object.

Each evidence item should contain:

* evidence_id
* tenant_id
* assessment_id
* source
* connector
* resource_type
* resource_id
* property
* observed_value
* raw_reference
* collected_at
* collector_version
* confidence
* sensitivity_classification

Store raw evidence separately where appropriate.

Findings should reference evidence IDs.

---

# 24. RULES ENGINE

Build an independent rules engine.

Each rule should contain:

* rule_id
* name
* description
* category
* data_source
* condition
* severity
* score_weight
* recommendation_template
* framework_mapping
* version
* enabled
* prerequisites
* remediation_reference

Rules should be editable by authorised Cyvrix administrators.

Never modify historical assessment results when a future rule version changes.

Store the rule version used.

---

# 25. SECURITY FINDING MODEL

Every finding should contain:

* finding ID
* title
* description
* severity
* affected resource
* evidence
* detection source
* assessment
* security domain
* risk score
* likelihood
* impact
* business impact
* technical impact
* recommendation
* remediation steps
* framework mapping
* detected date
* status
* assigned owner
* due date
* analyst notes
* customer notes

Statuses:

* open
* acknowledged
* remediation_planned
* in_progress
* resolved
* accepted_risk
* false_positive

---

# 26. SEVERITY MODEL

Support:

Critical
High
Medium
Low
Informational
Passed

Risk score can use:

Risk = Likelihood × Impact

Use a configurable numerical model.

---

# 27. ASSESSMENT SCORE

Create weighted scoring.

Example:

Identity: 25%

Endpoints: 15%

Network: 20%

Cloud: 15%

Email: 10%

Backup: 10%

Governance: 5%

Score:

0–39 Critical

40–59 Poor

60–74 Needs Improvement

75–89 Good

90–100 Excellent

Make thresholds configurable.

---

# 28. COVERAGE SCORE

Separate security score from evidence coverage.

Example:

Security Score:

82 / 100

Assessment Coverage:

91%

This avoids misleading customers when only part of their environment was connected.

---

# 29. AI ANALYSIS ENGINE

AI must receive structured findings, not uncontrolled access to customer systems.

AI responsibilities:

* translate findings into understandable language
* explain business impact
* explain technical impact
* recommend remediation
* prioritise remediation
* summarise assessment
* generate executive overview
* generate technical remediation guidance
* identify recurring themes
* create proposed project scopes

AI must not:

* fabricate findings
* modify severity without defined policy
* invent compliance failures
* claim a system was inspected when it was not
* independently execute infrastructure changes

---

# 30. AI GUARDRAILS

Every AI-generated statement must be traceable to:

* evidence
* finding
* assessment
* approved questionnaire answer

Add validation before generated content enters reports.

Label AI-produced explanatory content internally.

Allow security consultants to edit generated recommendations.

---

# 31. AI PROVIDER ABSTRACTION

Create an abstraction layer capable of supporting:

* OpenAI
* Anthropic
* Google Gemini

Do not tightly couple the product to one provider.

Configuration should allow selection of model by function.

Example:

Executive report model

Technical analysis model

Customer assistant model

---

# 32. AI CUSTOMER ASSISTANT

Provide an assessment assistant.

The customer can ask:

What does this finding mean?

Why is this critical?

How do we fix it?

What should we address first?

What would Cyvrix recommend?

The assistant must answer only from the customer's:

* findings
* evidence
* reports
* approved knowledge base

Tenant isolation is mandatory.

---

# 33. REMEDIATION ROADMAP

Automatically create:

## Immediate

Critical risks.

## Within 7 days

Major identity/security weaknesses.

## Within 30 days

High-risk configuration issues.

## Within 90 days

Strategic improvements.

Display:

* priority
* estimated effort
* required skill
* potential downtime
* likely cost category
* dependencies

---

# 34. REQUEST CYVRIX REMEDIATION

Every finding should provide:

Request Cyvrix Remediation

The customer can select findings and generate a remediation request.

Create:

* remediation request
* selected findings
* proposed scope
* estimated work
* project record

Notify Cyvrix staff.

---

# 35. AUTOMATED REMEDIATION — FUTURE PHASE

Design architecture now, but do not enable uncontrolled automatic changes.

Where future remediation is implemented:

1. Detect issue.
2. Generate proposed change.
3. Show exact action.
4. Explain potential impact.
5. Confirm rollback method.
6. Require authorised customer approval.
7. Execute.
8. Verify.
9. Record audit trail.
10. Re-run affected control.

Never allow AI alone to authorise production changes.

---

# 36. REPORTING ENGINE

Generate at least two report types.

## Executive Assessment Report

Include:

* organisation
* assessment date
* assessment scope
* executive summary
* overall score
* risk distribution
* major business risks
* priority recommendations
* roadmap
* coverage limitations
* conclusion

Avoid excessive technical detail.

---

## Technical Assessment Report

Include:

* methodology
* scope
* integrations
* asset overview
* each finding
* affected systems
* evidence
* risk explanation
* remediation steps
* framework mapping
* technical appendices

---

# 37. PDF REPORT DESIGN

Reports must look premium and appropriate for an IT consultancy.

Include:

Cyvrix branding

Organisation name

Assessment name

Assessment date

Confidentiality classification

Report version

Prepared by Cyvrix Limited

Use professional charts and tables.

Never expose:

* passwords
* secrets
* access tokens
* unnecessarily sensitive raw evidence

---

# 38. COMPLIANCE MAPPING ENGINE

A control can map to multiple frameworks.

Example:

MFA control

maps to:

CIS

NIST

Cyber Essentials

ISO 27001

Microsoft guidance

Build framework objects separately from detection rules.

This allows adding frameworks later.

---

# 39. CONTINUOUS ASSESSMENT

Architect for recurring monitoring.

Customers should eventually be able to schedule:

Daily

Weekly

Monthly

Quarterly

For relevant lightweight checks.

Store score history.

Display:

Current score

Previous score

Change

New findings

Resolved findings

Regressions

---

# 40. ALERTING

Notify customers about important changes.

Examples:

New Critical Finding

Security Score Dropped

MFA Coverage Reduced

New Global Administrator

Public Cloud Resource Detected

New Exposed Service

Backup Failure Detected

Agent Offline

Connector Expired

Use configurable notification preferences.

---

# 41. CYVRIX ADMIN DASHBOARD

The Cyvrix administration portal should provide:

* customer organisations
* active assessments
* completed assessments
* Critical findings
* High findings
* new remediation opportunities
* assessment failures
* agent health
* integration status
* subscriptions
* reports
* leads
* consultants
* platform health

---

# 42. SALES OPPORTUNITY ENGINE

The platform should help Cyvrix convert technical findings into legitimate consulting opportunities.

Example:

19 open findings.

Potential services:

Microsoft 365 Hardening

Endpoint Security Deployment

Network Segmentation

Cloud Migration

Backup Modernisation

Managed IT Support

Managed Security Monitoring

Allow Cyvrix administrators to map findings to services.

Never make misleading claims about cost or required services.

---

# 43. LEAD GENERATION

The Free IT Health Check should support visitors who are not yet customers.

Workflow:

Website

↓

Start Free IT Health Check

↓

Create secure account

↓

Verify email

↓

Organisation details

↓

Authorise assessment

↓

Connect Microsoft 365 or enter limited technical information

↓

Assessment

↓

Preview findings

↓

Report

↓

Book Consultation / Request Remediation

The platform should convert the organisation into a Cyvrix CRM-style lead record.

---

# 44. INTEGRATION ARCHITECTURE

Build connectors as independent modules.

Suggested interface:

connect()

validatePermissions()

collect()

normalise()

disconnect()

healthCheck()

refreshCredentials()

Future integrations may include:

* Microsoft 365
* Azure
* AWS
* Google Cloud
* Fortinet
* Cisco
* Meraki
* Sophos
* WatchGuard
* Ubiquiti
* VMware
* Hyper-V
* Veeam
* Datto
* Acronis
* Microsoft Defender
* Sentinel
* CrowdStrike
* ConnectWise
* NinjaOne
* HaloPSA

---

# 45. BACKGROUND PROCESSING

Do not execute long assessments inside HTTP requests.

Use job queues.

Example:

assessment.started

connector.collection.requested

connector.collection.completed

evidence.normalised

rules.execution.started

rules.execution.completed

score.calculated

ai.analysis.requested

report.generation.requested

assessment.completed

Jobs should be:

* idempotent
* retryable
* observable
* auditable

---

# 46. SUGGESTED TECHNOLOGY STACK

Use production-grade technologies.

Recommended baseline:

## Frontend

Next.js

TypeScript

React

Tailwind CSS

Accessible component library

---

## Backend

TypeScript with NestJS or equivalent structured Node backend

OR

Python FastAPI services where Python significantly improves assessment/scanning functionality.

A hybrid architecture is acceptable.

---

## Database

PostgreSQL

---

## ORM

Prisma or equivalent.

---

## Cache / Jobs

Redis

BullMQ or equivalent

---

## Object Storage

S3-compatible secure object storage

---

## Authentication

Enterprise-capable authentication with:

* email
* MFA
* SSO-ready architecture

---

## AI

Provider abstraction for:

OpenAI

Anthropic

Gemini

---

## Deployment

Containerised services.

Support deployment to:

* Azure
* AWS
* another secure production cloud

Vercel can host suitable frontend components but should not be treated as the entire security platform architecture.

---

# 47. DATABASE ENTITIES

Create schemas for at least:

User

Organisation

OrganisationMember

Role

Invitation

AssessmentTemplate

Assessment

AssessmentScope

AssessmentAuthorisation

Connector

ConnectorCredential

Collector

CollectionJob

Evidence

Rule

RuleVersion

RuleResult

Finding

FindingEvidence

Framework

FrameworkControl

RuleFrameworkMapping

Asset

NetworkDevice

Endpoint

CloudResource

Score

ScoreHistory

Report

ReportVersion

RemediationRequest

RemediationTask

ConsultantNote

Notification

Subscription

InvoiceReference

AuditLog

Agent

AgentHeartbeat

SystemSetting

AIInteractionMetadata

Do not store secrets directly inside ordinary tables.

Use an encrypted secret storage mechanism.

---

# 48. SECURITY REQUIREMENTS

Security is a first-class requirement.

Implement:

* encryption in transit
* encryption at rest
* MFA
* least privilege
* secure OAuth
* strict tenant isolation
* RBAC
* input validation
* secure headers
* CSRF protection where relevant
* XSS protections
* SSRF protection
* SQL injection protection
* rate limiting
* API abuse protection
* audit logging
* secret management
* key rotation capability
* secure session handling
* connector token encryption
* account lockout controls
* device/session management

Never log:

* OAuth secrets
* passwords
* API tokens
* private keys

---

# 49. AUDIT LOGGING

Record security-sensitive events such as:

* sign in
* MFA changes
* user invitation
* role changes
* connector creation
* connector removal
* assessment authorisation
* assessment start
* report generation
* evidence deletion
* remediation approval
* remediation execution
* administrative setting changes

Audit entries must be tamper-resistant.

---

# 50. DATA RETENTION

Provide configurable retention.

Example:

Raw assessment evidence:

90 days

Assessment findings:

contract-dependent

Reports:

contract-dependent

Audit logs:

longer retention

Allow administrators to configure policy.

Provide customer data deletion workflows.

---

# 51. PRIVACY

Collect only information necessary for assessment.

Avoid collecting user content.

For example:

Do not download email contents simply to assess Microsoft 365 configuration.

Do not collect user documents for SharePoint security configuration reviews.

Use metadata and configuration where sufficient.

---

# 52. GDPR CONSIDERATIONS

Design for:

* UK GDPR
* Data Protection Act 2018

Include:

* data processing records
* lawful processing configuration
* retention
* data export
* deletion workflow
* subprocessor tracking
* privacy controls

Provide architecture suitable for UK/EU data residency options.

---

# 53. OBSERVABILITY

Implement:

* application metrics
* structured logging
* job monitoring
* connector metrics
* agent metrics
* error tracking
* API latency
* assessment duration
* AI usage
* report generation health

Provide system dashboards.

---

# 54. FAILURE HANDLING

Example:

Microsoft Defender data unavailable because customer lacks licence.

Do not fail the entire assessment.

Record:

Control:

Not Assessed

Reason:

Required Microsoft Defender licensing unavailable.

Coverage should be adjusted accordingly.

---

# 55. CUSTOMER QUESTIONNAIRES

Some governance controls cannot be automatically detected.

Create a configurable questionnaire engine.

Question types:

* yes/no
* multiple choice
* text
* number
* document upload
* evidence upload

Questions can:

* appear conditionally
* map to controls
* affect scores
* require analyst validation

---

# 56. DOCUMENT EVIDENCE

Customers may upload:

* policies
* DR plans
* network diagrams
* security policies
* risk assessments
* certificates

AI may assist with extracting relevant information.

Do not mark compliance controls as passed solely from AI interpretation without appropriate validation.

---

# 57. ASSESSMENT PROGRESS UI

Show real-time progress.

Example:

Connecting Microsoft 365 ✓

Collecting Entra ID ✓

Checking MFA ✓

Checking Conditional Access ✓

Checking Exchange Online ✓

Checking SharePoint ✓

Checking Intune ✓

Running security controls 73%

Calculating score

Generating recommendations

Creating report

Include:

elapsed time

estimated completion where reasonable

warnings

partial failures

---

# 58. FINDINGS DASHBOARD

Provide filters for:

* severity
* category
* resource
* status
* framework
* assessment
* assigned person

Each finding page should display:

Finding title

Severity

Status

Risk score

Affected resource

Evidence

Why this matters

Business impact

Technical impact

Recommended remediation

Framework mappings

Cyvrix remediation option

---

# 59. EXECUTIVE DASHBOARD

Keep executive presentation simple.

Display:

Technology Health Score

Security Score

Critical Findings

Risk Trend

Top 5 Priorities

Assessment Coverage

Remediation Progress

Do not overwhelm nontechnical executives with raw technical information.

---

# 60. TECHNICAL DASHBOARD

Technical users should receive:

* raw findings
* evidence
* asset details
* rule
* configuration
* remediation instructions
* framework mappings
* analyst notes

---

# 61. NETWORK MAP UI

Network assessments should contain an interactive topology page.

Provide:

* topology graph
* device icons
* connection lines
* VLAN filters
* subnet filters
* search
* problem highlighting

Clicking a device opens:

Device Details

Interfaces

Firmware

VLAN

Connectivity

Findings

Recommendations

---

# 62. ASSET INVENTORY

Provide a unified asset inventory.

Categories:

Endpoint

Server

Network

Cloud

Identity

SaaS

Storage

Database

Each asset can have associated findings.

---

# 63. CUSTOMER REPORT HISTORY

Customers can view:

Current assessment

Previous assessments

Score changes

Resolved findings

New findings

Download previous reports.

---

# 64. REMEDIATION VERIFICATION

After a customer fixes an issue:

Re-run relevant check.

If resolved:

Finding status becomes:

Resolved — Verified

Do not simply trust a manual status change where automated verification is possible.

---

# 65. PLATFORM BRANDING

Use Cyvrix Limited branding.

Visual direction:

Premium

Modern

Technical

Trustworthy

Dark professional interface

Blue/cyan accents consistent with Cyvrix branding

High readability

Avoid excessive animation.

The dashboard should feel appropriate for a serious cybersecurity/MSP platform.

---

# 66. RESPONSIVE DESIGN

Support:

Desktop

Laptop

Tablet

Mobile

Technical network topology can favour larger screens but must remain accessible on mobile.

---

# 67. ACCESSIBILITY

Target WCAG 2.2 AA where feasible.

Support:

keyboard navigation

focus states

screen readers

appropriate contrast

semantic HTML

---

# 68. API DESIGN

Create a clean versioned API.

Example:

/api/v1/organisations

/api/v1/assessments

/api/v1/findings

/api/v1/assets

/api/v1/connectors

/api/v1/reports

/api/v1/remediation

Use:

authentication

RBAC

tenant checks

rate limiting

validation

pagination

consistent errors

---

# 69. AGENT COMMUNICATION

The network discovery agent should communicate outbound to the platform.

Avoid requiring inbound firewall rules.

Agent workflow:

register

authenticate

receive authorised job

collect

encrypt results

upload

clear transient secrets

heartbeat

Use short-lived credentials.

---

# 70. AGENT UPDATE SYSTEM

Prepare for digitally signed agent updates.

Agents must verify package authenticity before installation.

---

# 71. REPORT EXPORTS

Support:

PDF

CSV findings export

JSON export where appropriate

Future:

XLSX

---

# 72. NOTIFICATIONS

Support initially:

Email

In-app

Future:

Microsoft Teams

Slack

SMS for selected Critical alerts

---

# 73. BOOK CONSULTATION

Integrate or prepare integration with Cyvrix scheduling.

Customer can book consultation directly from:

* report
* finding
* dashboard
* remediation screen

---

# 74. SUBSCRIPTION DESIGN

Prepare product tiers.

Example:

## Free Assessment

One-time lightweight assessment.

## Professional

Advanced assessments.

## Business

Multiple assessments and ongoing history.

## Continuous

Recurring monitoring.

## MSP Managed

Assessment plus Cyvrix remediation and support.

Do not hard-code pricing.

All pricing must be configurable from administration.

---

# 75. FEATURE FLAGS

Use feature flags.

Features such as:

continuous monitoring

auto-remediation

AWS

GCP

advanced compliance

can be enabled separately.

---

# 76. PHASED DEVELOPMENT

Do not attempt everything simultaneously.

Build in phases.

# PHASE 1 — FOUNDATION

Build:

* authentication
* organisation management
* RBAC
* database
* audit logging
* assessment catalogue
* assessment workflow
* connector framework
* rules engine foundation
* findings engine
* scoring
* reporting foundation
* admin portal
* customer dashboard

---

# PHASE 2 — MICROSOFT 365

Build complete Microsoft assessment.

Focus on:

* Entra
* MFA
* privileged identities
* Conditional Access
* Exchange
* SharePoint
* Microsoft security controls

This should become the first commercially usable automated assessment.

---

# PHASE 3 — FREE IT HEALTH CHECK

Use Microsoft data plus:

* DNS
* domain security
* questionnaire
* endpoint/network optional inputs

Release publicly.

---

# PHASE 4 — NETWORK DISCOVERY

Build:

* agent
* inventory
* SNMP
* network device discovery
* topology
* configuration checks

---

# PHASE 5 — CYBERSECURITY ASSESSMENT

Combine evidence from:

Microsoft

Network

Endpoints

Cloud

Questionnaires

---

# PHASE 6 — CLOUD

Implement:

Azure

AWS

Google Cloud

Cloud Readiness

---

# PHASE 7 — CONTINUOUS MONITORING

Build:

scheduled checks

score history

alerts

regression detection

---

# PHASE 8 — REMEDIATION PLATFORM

Implement:

remediation projects

customer approvals

safe automation

rollback

verification

---

# 77. TESTING

Implement:

unit tests

integration tests

API tests

RBAC tests

tenant isolation tests

connector tests

rules engine tests

report tests

end-to-end tests

security tests

Critical requirement:

Create automated tests proving Tenant A cannot retrieve Tenant B data.

---

# 78. SECURITY TESTING

Perform:

SAST

dependency scanning

secret scanning

container scanning

DAST where appropriate

permission testing

API security testing

SSRF testing

IDOR testing

tenant isolation testing

---

# 79. DEVELOPMENT DOCUMENTATION

Generate:

README

Architecture documentation

Database documentation

API documentation

Connector SDK documentation

Rules engine documentation

Deployment guide

Environment variable documentation

Security architecture

Threat model

Incident response documentation

Backup and recovery documentation

---

# 80. OPENAPI

Generate an OpenAPI specification.

Provide Swagger-compatible API documentation.

---

# 81. INFRASTRUCTURE AS CODE

Use Infrastructure as Code.

Preferred:

Terraform or equivalent.

Do not rely on undocumented manual configuration.

---

# 82. CI/CD

Configure:

lint

type checking

unit tests

integration tests

security scan

build

container scan

staging deployment

production approval

Production deployment must require explicit human approval.

---

# 83. DEVELOPMENT ENVIRONMENTS

Create:

local

development

staging

production

Never share production credentials with non-production environments.

---

# 84. DEMO ENVIRONMENT

Create synthetic assessment data so the product can be demonstrated without connecting a real customer environment.

Include:

demo organisation

demo Microsoft tenant findings

demo network

demo assets

demo reports

Never present synthetic data as real customer information.

---

# 85. INITIAL DEMO FINDINGS

Examples:

Critical:

Global Administrator without MFA

High:

External email forwarding allowed

High:

Firewall firmware outdated

Medium:

Guest account inactive for 180 days

Medium:

DMARC policy configured as none

Low:

Unused network switch ports enabled

Passed:

Disk encryption enforced on managed endpoints

---

# 86. CUSTOMER TRUST CENTRE

Prepare a page explaining:

How assessments work

What permissions are requested

What information is collected

What information is not collected

Encryption

Data retention

Privacy

How customers disconnect integrations

This is commercially important.

---

# 87. WEBSITE INTEGRATION

Integrate the assessment platform with the existing Cyvrix website.

Existing cards should route to the appropriate assessment.

Examples:

Free IT Health Check

→

/assessments/it-health

Microsoft 365 Security Assessment

→

/assessments/microsoft-365

Cybersecurity Assessment

→

/assessments/cybersecurity

Cloud Readiness Assessment

→

/assessments/cloud-readiness

Network Assessment

→

/assessments/network

Do not redirect customers into a generic contact form.

---

# 88. ADMIN CMS

Cyvrix administrators must be able to edit:

Assessment name

Description

Category

Public/private status

Assessment availability

Assessment icon

Introductory content

CTA text

FAQ

Pricing

Estimated duration

Required connections

Marketing content

Do not require code changes for normal content management.

---

# 89. CUSTOMER ONBOARDING

Provide guided onboarding.

Example:

Welcome to Cyvrix Assessment Engine.

Step 1:

Tell us about your organisation.

Step 2:

Choose your assessment.

Step 3:

Connect your environment.

Step 4:

Review scope and authorisation.

Step 5:

Run assessment.

Use clear explanations around permissions.

---

# 90. CUSTOMER CONSENT

Before connector activation show:

What Cyvrix will access

Why access is required

Whether access is read-only

How to revoke access

How long evidence may be retained

Then require explicit consent.

---

# 91. SCORING TRANSPARENCY

Customers must be able to understand why their score changed.

Example:

Previous score:

68

Current score:

79

Improvement:

+11

Drivers:

MFA enabled +5

External forwarding blocked +2

Four devices encrypted +3

Stale administrator removed +1

---

# 92. FALSE POSITIVES

Allow:

Customer dispute

Analyst review

Suppress for current assessment

Suppress using justified exception

Every suppression must:

* have reason
* have user
* have date
* remain in audit history

---

# 93. RISK ACCEPTANCE

Customer can mark:

Accepted Risk

Require:

reason

owner

review date

Do not treat accepted risk as technically resolved.

---

# 94. REPORT DISCLAIMER

Reports must accurately represent:

assessment scope

evidence coverage

technical limitations

unavailable integrations

assumptions

Do not state that an assessment guarantees security.

---

# 95. PERFORMANCE TARGETS

Normal web actions should feel immediate.

Large collection jobs must run asynchronously.

For a typical SME Microsoft 365 environment, target completion of standard security assessment within approximately several minutes to tens of minutes depending on tenant size, licensing, throttling and provider API behaviour.

Never promise an unrealistic fixed completion time.

---

# 96. AI COST MANAGEMENT

Track:

provider

model

tokens

operation

tenant

assessment

cost estimate

Do not expose another tenant's usage.

Implement caching where safe.

Do not repeatedly regenerate unchanged explanations.

---

# 97. AI PRIVACY

Do not send unnecessary raw sensitive data to AI providers.

Before calling an AI model:

minimise

redact

normalise

Use identifiers rather than unnecessary personal information.

---

# 98. SECRETS MANAGEMENT

Store secrets using dedicated secret management.

Examples:

Azure Key Vault

AWS Secrets Manager

GCP Secret Manager

HashiCorp Vault

Never store secrets in Git.

---

# 99. DATABASE MIGRATIONS

All schema changes must use migrations.

Never instruct operators to modify production tables manually.

---

# 100. BACKUPS

Create automated backup strategy for:

database

reports

important metadata

configuration

Test restoration.

Document RPO and RTO targets.

---

# 101. INCIDENT RESPONSE

Create internal process for:

credential compromise

tenant isolation issue

data exposure

agent compromise

connector compromise

Generate emergency connector revocation capability.

---

# 102. CONNECTOR REVOCATION

Customer and Cyvrix administrators must be able to disconnect an integration.

On disconnect:

revoke tokens where technically possible

delete stored credentials

stop scheduled jobs

preserve historical findings according to retention policy

audit the event

---

# 103. PRODUCT ANALYTICS

Track privacy-conscious operational metrics.

Examples:

assessment started

assessment completed

assessment abandoned

connector failure

report downloaded

remediation requested

Do not record sensitive assessment data inside analytics platforms.

---

# 104. FIRST COMMERCIAL RELEASE

The first release should concentrate on:

## Microsoft 365 Security Assessment

plus

## Free IT Health Check

This provides the quickest route to real business value.

Initial production release should include:

* customer registration
* organisation management
* Microsoft OAuth connection
* assessment authorisation
* Microsoft evidence collection
* rule execution
* findings
* scores
* AI explanation
* executive dashboard
* PDF report
* remediation request
* Cyvrix admin portal

After that is stable, expand into Network Assessment and Cloud Readiness.

---

# 105. IMPORTANT DEVELOPMENT RULE

Do not start writing hundreds of files immediately.

Before implementation:

1. Analyse the requirements.
2. Produce architecture.
3. Produce repository structure.
4. Produce database model.
5. Produce threat model.
6. Produce API design.
7. Produce connector architecture.
8. Produce rules architecture.
9. Produce development phases.
10. Produce testing strategy.

Then create:

ARCHITECTURE.md

PRODUCT_REQUIREMENTS.md

SECURITY.md

THREAT_MODEL.md

DATABASE.md

API.md

CONNECTORS.md

RULE_ENGINE.md

IMPLEMENTATION_PLAN.md

TESTING.md

These documents become the project's source of truth.

---

# 106. REQUIREMENT FREEZE

Once the specification has been agreed:

Create:

/docs/product/product-specification.md

Treat it as the canonical source of requirements.

If implementation discovers that a requirement needs changing:

Do not silently change the product.

Create a decision record:

ADR-XXXX

containing:

Problem

Existing requirement

Proposed change

Reason

Security implications

Data implications

Migration implications

Then continue only where the change does not contradict the agreed product direction.

---

# 107. NO REQUIREMENT DRIFT

Do not:

simplify major requirements because implementation is difficult

replace real integrations with fake implementations without clearly marking them

silently remove modules

change the tenancy model

change authentication architecture

remove auditability

weaken security

replace deterministic findings with AI guesses

turn the platform into merely a questionnaire

---

# 108. CODE QUALITY

Use:

strict typing

small modular services

clear naming

dependency injection where appropriate

centralised error handling

structured logging

configuration validation

security-by-default

Do not create giant monolithic files.

---

# 109. MOCKS

Mocks are acceptable during initial development.

Every mock must be labelled.

Example:

MOCK_MICROSOFT_GRAPH=true

Before production release, all critical flows must work against legitimate supported integrations.

---

# 110. DEFINITION OF DONE

A feature is not complete merely because the UI exists.

A feature is complete when:

UI works

API works

database works

permissions work

validation works

errors are handled

audit events exist

tests pass

security implications have been addressed

documentation exists

---

# 111. PRODUCT EXPERIENCE EXAMPLE

A completed Microsoft assessment should approximately feel like:

Microsoft 365 Security Assessment

Assessment complete

Security Score:

74 / 100

Coverage:

94%

Critical:

2

High:

5

Medium:

12

Low:

6

Passed Controls:

48

Top priority:

Three privileged accounts do not meet the configured strong authentication requirement.

Recommended next action:

Secure privileged identities immediately.

Buttons:

View Finding

Download Report

Request Cyvrix Remediation

Book Security Review

---

# 112. CONTINUOUS MONITORING EXPERIENCE

Future customer dashboard example:

Current Security Score:

91

Previous:

87

Improvement:

+4

New Findings:

1

Resolved:

4

Regression:

0

Last assessment:

Today 08:00

Next assessment:

Tomorrow 08:00

---

# 113. LONG-TERM PRODUCT DIRECTION

The architecture must support evolving the platform from:

Assessment Tool

into:

Technology Health Platform

then:

Continuous Security Posture Management

then:

Cyvrix MSP Automation Platform

The platform should eventually combine:

discovery

assessment

compliance

monitoring

remediation

reporting

consultancy

managed services

without compromising customer consent or security.

---

# 114. REQUIRED INITIAL OUTPUT FROM THE ENGINEERING AGENT

Do not begin the implementation immediately.

Your first response must contain:

## A. Product Architecture

Explain the complete architecture.

## B. Repository Structure

Show the proposed monorepo structure.

## C. Database Architecture

List major entities and relationships.

## D. Authentication and Tenant Isolation

Explain exactly how tenant boundaries will be enforced.

## E. Assessment Engine

Explain evidence collection → rules → scoring → AI → reporting.

## F. Microsoft 365 Integration

Explain permissions, OAuth flow and collector architecture.

## G. Network Agent Architecture

Explain secure agent operation.

## H. AI Architecture

Explain model abstraction and guardrails.

## I. Security Architecture

Include threat model summary.

## J. Development Roadmap

Break implementation into milestones.

## K. Acceptance Criteria

Provide measurable completion criteria for every major milestone.

## L. Open Questions

Only identify questions that genuinely block architecture or implementation.

Do not ask questions whose answer can reasonably be inferred from this specification.

---

# 115. AFTER ARCHITECTURE APPROVAL

Once architecture is established:

Create the repository.

Then implement sequentially.

Milestone 1:

Foundation.

Milestone 2:

Customer authentication and multi-tenancy.

Milestone 3:

Assessment workflow.

Milestone 4:

Evidence and rules engine.

Milestone 5:

Microsoft connector.

Milestone 6:

Microsoft assessment.

Milestone 7:

AI explanation engine.

Milestone 8:

Reporting.

Milestone 9:

Cyvrix admin.

Milestone 10:

Free IT Health Check.

Milestone 11:

Security testing and production hardening.

Only then begin:

Network discovery.

Cloud assessment.

Continuous assessment.

Auto-remediation.

---

# 116. FINAL ENGINEERING OBJECTIVE

Build a platform where a prospective Cyvrix customer can:

Visit Cyvrix

↓

Select an assessment

↓

Create their secure organisation

↓

Authorise access

↓

Connect their technology environment

↓

Allow Cyvrix to automatically collect evidence

↓

Receive findings within minutes where technically possible

↓

Understand their technology and security posture

↓

Receive a professional assessment report

↓

See exactly what should be fixed

↓

Ask Cyvrix to fix it

↓

Become an ongoing Cyvrix managed-services customer

The product must provide genuine technical assessment value rather than act as a marketing questionnaire.

Build for security, accuracy, extensibility and commercial usability from the beginning.
