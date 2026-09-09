# My School BE — Comprehensive Codebase Documentation

## Overview

**my-school-BE** is a School Management System backend built with **NestJS 11**, **Prisma 7**, and **PostgreSQL 16**. It provides REST APIs for managing academic years, sections, subjects, teachers, students, attendance, exams, grades, homework, announcements, and fees.

- **Language**: TypeScript 5.7
- **Framework**: NestJS 11 (Express)
- **ORM**: Prisma 7 with PostgreSQL adapter
- **Auth**: JWT (access + refresh tokens, first-login flow)
- **Source LOC**: ~9,900 lines of TypeScript
- **API Prefix**: `/api/v1`

---

## Documentation Index

### Root-Level

| Document | Description |
|----------|-------------|
| [Project Overview](./project-overview.md) | Technology stack, project structure, and high-level summary |
| [Technical Debt Report](./technical-debt-report.md) | **START HERE** — Executive summary of tech debt, AWS recommendations |

### Architecture

| Document | Description |
|----------|-------------|
| [System Overview](./architecture/system-overview.md) | High-level architecture, deployment model, tech stack |
| [Components](./architecture/components.md) | Module responsibilities, interfaces, interactions |
| [Dependencies](./architecture/dependencies.md) | Internal and external dependency analysis |
| [Patterns](./architecture/patterns.md) | Architectural and design patterns |

### Behavior

| Document | Description |
|----------|-------------|
| [Business Logic](./behavior/business-logic.md) | Business rules per module |
| [Workflows](./behavior/workflows.md) | Application-level workflows and user journeys |
| [Decision Logic](./behavior/decision-logic.md) | Decision trees and branching patterns |
| [Error Handling](./behavior/error-handling.md) | Exception patterns and recovery |

### Reference

| Document | Description |
|----------|-------------|
| [Program Structure](./reference/program-structure.md) | Complete file/module hierarchy |
| [Interfaces](./reference/interfaces.md) | Types, interfaces, and contracts |
| [Data Models](./reference/data-models.md) | Prisma models, enums, relationships |
| [API Reference](./reference/api-reference.md) | All endpoints with auth/validation details |
| [Modules](./reference/modules.md) | Module organization and dependencies |

### Analysis

| Document | Description |
|----------|-------------|
| [Code Metrics](./analysis/code-metrics.md) | Lines of code, file counts, complexity indicators |
| [Complexity Analysis](./analysis/complexity-analysis.md) | Complex hotspots and maintainability |
| [Dependency Analysis](./analysis/dependency-analysis.md) | Dependency graphs and criticality |
| [Security Patterns](./analysis/security-patterns.md) | Auth, authorization, input validation |
| [Tech Debt](./analysis/tech-debt.md) | Detailed technical debt assessment |

### Technical Debt

| Document | Description |
|----------|-------------|
| [Summary](./technical-debt/summary.md) | Overview of all debt findings |
| [Outdated Components](./technical-debt/outdated-components.md) | EOL/deprecated component analysis |
| [Maintenance Burden](./technical-debt/maintenance-burden.md) | High-maintenance areas |
| [Remediation Plan](./technical-debt/remediation-plan.md) | Prioritized action items |

### Diagrams

| Document | Description |
|----------|-------------|
| [Structural](./diagrams/structural/) | Component, class, and package diagrams |
| [Behavioral](./diagrams/behavioral/) | Sequence and activity diagrams |
| [Architecture](./diagrams/architecture/) | System context and integration diagrams |

### Migration

| Document | Description |
|----------|-------------|
| [Component Order](./migration/component-order.md) | Migration dependency order |
| [Test Specifications](./migration/test-specifications.md) | Test cases for validation |
| [Validation Criteria](./migration/validation-criteria.md) | Success criteria |

### Specialized

| Document | Description |
|----------|-------------|
| [Database Schemas](./specialized/database-schemas.md) | PostgreSQL schema details and query patterns |
| [API Documentation](./specialized/api-documentation.md) | Request/response examples |

---

## Quick Navigation

- **Frontend developers**: Start with [API Reference](./reference/api-reference.md) → [Workflows](./behavior/workflows.md) → [Data Models](./reference/data-models.md)
- **New backend developers**: Start with [System Overview](./architecture/system-overview.md) → [Components](./architecture/components.md) → [Patterns](./architecture/patterns.md)
- **Tech leads / architects**: Start with [Technical Debt Report](./technical-debt-report.md) → [Dependency Analysis](./analysis/dependency-analysis.md) → [Security Patterns](./analysis/security-patterns.md)
- **DevOps / deployment**: Start with [System Overview](./architecture/system-overview.md) → [Dependencies](./architecture/dependencies.md)
