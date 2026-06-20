# Experiment Design and Fitness Model

- Runtime telemetry includes p95/p99 latency, error rate, throughput, availability, and SLO compliance.
- Lined should preserve the stable backend under test while experiment work adds runtime evidence and comparison workflows around it.
- Local kind improves reproducibility, but it is not production-equivalent evidence.
- Runtime summaries are collector-ready inputs and should stay traceable to scenario, workload, and source context.
