> Status: Active
> Applies to: Java 21 / Spring Boot 3.5.x / React 19 / TypeScript 6
> Category: Lined Pattern Registry
# Lined Pattern Registry

This registry maps real audited code to reusable practices. It is a discovery aid, not a mandate.

| Pattern / Practice | Implementation | Owner | Location | Current consumers | Reuse rule | Extension rule | Promotion note | Notes |
|---|---|---|---|---|---|---|---|---|
| Entity lookup helper | EntityFinder.findOrThrow | Backend shared common | src/main/java/io/backend/lined/common/EntityFinder.java | Domain services | Reuse for Optional-to-domain-exception lookup | Extend only domain-neutral behavior | Already shared | Never use Optional.get |
| Repository | Spring Data JPA repositories | Owning domain | src/main/java/io/backend/lined/*/domain/*Repository.java | Domain services | Reuse the domain repository | Add persistence access only | Do not centralize domains | Business policy stays in services |
| Specification/filtering | Task query specification logic | Task feature | src/main/java/io/backend/lined/task/service/TaskServiceImpl.java | Task list operations | Reuse task owner for task filters | Extend task filters at that seam | Feature-local | Keep authorization visible |
| Policy | AccessPolicy classes | Owning domain | src/main/java/io/backend/lined/{lobby,task,event,user}/service/*AccessPolicy.java | Domain services/controllers | Reuse same-domain decisions | Extend related actions only | Feature-local by default | Do not invent generic ACL |
| Current-user seam | CurrentUserProvider and Spring adapter | Backend security | src/main/java/io/backend/lined/security/ | Caller-scoped controllers | Reuse validated JWT subject seam | Extend identity adaptation only | Shared framework seam | X-User-Id is not identity |
| Mapper | MapStruct feature mappers | Feature API boundary | src/main/java/io/backend/lined/*/api/*Mapper.java | Feature services/controllers | Reuse owning mapper | Add explicit mappings there | Do not make global mapper | ReportingPolicy.ERROR |
| Application service | AccountApplicationServiceImpl | Backend application layer | src/main/java/io/backend/lined/app/ | Account provisioning | Reuse account orchestration | Extend account use cases | Keep domain rules local | Transactional orchestration |
| Idempotency | IdempotencyService and repository | Shared application boundary | src/main/java/io/backend/lined/common/idempotency/ | Event/task writes | Reuse for retry-sensitive commands | Extend request semantics deliberately | Shared cross-cutting seam | Test replay/conflict |
| Billing provider port | PaidSubscriptionLookupPort | Billing application | src/main/java/io/backend/lined/billing/application/ | Billing account/plan resolution | Reuse for paid subscription lookup | Add adapters behind port | Billing-owned | Provider DTOs must not leak |
| Subscription state machine | SubscriptionStateMachine | Billing domain | src/main/java/io/backend/lined/billing/domain/subscription/ | Subscription transitions | Reuse legal transition owner | Add explicit transitions | Billing-local | Do not generalize statuses |
| Frontend feature architecture | src/features/{feature} | Web application | lined-web/src/features/ | All web features | Put domain models/API/hooks there | Extend owning feature | Shared only domain-agnostic | Cross-feature imports are real dependencies |
| Query keys | Per-feature QUERY_KEYS | Owning feature | lined-web/src/features/*/lib/constants.ts | Feature hooks/tests | Reuse owning key factory | Extend feature keys | Do not make global registry | Cache identity is semantic |
| API adapter switch | prod.ts/dev.ts/index.ts | Owning feature | lined-web/src/features/*/api/ | Feature hooks/tests | Reuse function contract | Update both implementations | Feature-local | Components do not choose mode |
| Optimistic mutation | useOptimisticPatchMutation plus task flow | Web shared hook/task feature | lined-web/src/hooks/useOptimisticPatchMutation.ts and lined-web/src/features/tasks/hooks/useTasks.ts | Task update flows | Reuse where snapshot/patch fits | Keep task-specific 404 behavior local | Shared hook is domain-neutral | Test rollback and missing resource |
| Public UI components | Design system and patterns | Web shared UI | lined-web/src/components/design-system/ and patterns/ | Feature UI | Reuse before new JSX | Add semantic props/wrappers | Shared only domain-agnostic | Stories/tests are ownership |
| HTTP status constants | HTTP_STATUS shared protocol owner | Web shared infrastructure | lined-web/src/lib/httpStatus.ts | API client, MSW handlers, and tests | Reuse one typed owner for protocol semantics | Add only missing status names when a real use appears | Shared owner is re-exported by test helpers | Raw numeric status scan is now clean in production source |

## Audit and baseline

The audit covered backend source/tests/docs/agents, web source/architecture/context, existing Gradle/ESLint/Sonar/CI, and the PR workflow. Existing quality debt is baseline. The bounded HTTP-status cleanup promoted the existing test owner into shared infrastructure and updated production protocol sites without broad feature refactoring.

## Follow-up candidates

- Run a full semantic duplication audit after the system lands.
- Triage legacy raw exceptions and PMD/CPD findings incrementally.
