# Billing and Entitlements

## Purpose and scope

Billing provides each user with a personal billing account, an effective plan, and the product limits derived from that plan. It exposes read-only current state at present; catalog, subscription lifecycle, and entitlement enforcement live behind the API rather than as checkout endpoints.

## Architecture and participating classes

- [`BillingController`](../../../src/main/java/io/backend/lined/billing/api/web/BillingController.java) returns the caller's account, effective plan, subscription projection, and limits at `/api/billing/me`.
- [`BillingAccountService`](../../../src/main/java/io/backend/lined/billing/application/BillingAccountService.java) creates/loads personal accounts; [`EffectivePlanResolver`](../../../src/main/java/io/backend/lined/billing/application/EffectivePlanResolver.java) chooses the active plan.
- Catalog and lifecycle state are modeled by `PlanCatalogEntity`, `PriceCatalogEntity`, [`SubscriptionEntity`](../../../src/main/java/io/backend/lined/billing/domain/subscription/SubscriptionEntity.java), and [`SubscriptionStateMachine`](../../../src/main/java/io/backend/lined/billing/domain/subscription/SubscriptionStateMachine.java).
- [`EntitlementService`](../../../src/main/java/io/backend/lined/entitlement/application/EntitlementService.java) and [`LimitEvaluator`](../../../src/main/java/io/backend/lined/entitlement/application/LimitEvaluator.java) translate a plan into enforceable limits.

## Interactions and data flow

Registration provisions a personal billing account. `GET /me` derives the effective plan for the `X-User-Id` account and transforms its entitlements into API limits. Lobby creation, restore, member acceptance, and writable lifecycle call `LimitEvaluator`, so billing affects real coordination capacity without making controllers duplicate pricing rules.

## API behavior and references

The [billing API section](../../foundation/api.md#billing) documents the public response. The domain uses [JPA entity lifecycle](https://docs.spring.io/spring-data/jpa/reference/jpa/entity-persistence.html) for persisted account/catalog/subscription state; see [`BILLING_TASKS.md`](../billing/BILLING_TASKS.md) for repository-specific design and task history.
