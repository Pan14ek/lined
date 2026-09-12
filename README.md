# Lined  
**Where life and quality time meet.**

## Local full-stack quick start

### Prerequisites

- Docker with Docker Compose v2
- [mkcert](https://github.com/FiloSottile/mkcert#installation) for trusted local HTTPS

The launcher never installs system packages automatically. If `mkcert` is
missing, install it once and rerun `./lined up`.

### Quick Start

```bash
git clone https://github.com/Pan14ek/lined.git
cd lined
./lined up
```

Open [https://localhost](https://localhost). The first startup builds the
backend and frontend images, creates the local certificate under `.lined/`,
waits for PostgreSQL/Flyway, the backend, Mailpit, and Nginx, then prints the
available URLs. `.lined/` is ignored and must not be committed.

### URLs

| Service | URL |
|---|---|
| Lined application | [https://localhost](https://localhost) |
| Mailpit inbox | [http://localhost:8025](http://localhost:8025) |
| Backend (developer diagnostics) | http://localhost:8080 |

### Common commands

```bash
./lined up                 # build/start and wait for readiness
./lined down               # stop services; preserve database data
./lined restart            # restart services; preserve database data
./lined logs               # follow all logs
./lined logs backend       # follow one service
./lined status             # show container state and readiness
./lined reset              # confirm, delete database, and recreate stack
./lined reset --yes        # non-interactive reset
./lined help
```

Ports can be overridden through environment variables such as
`LINED_HTTPS_PORT`, `LINED_HTTP_PORT`, `LINED_BACKEND_PORT`, and
`LINED_MAILPIT_PORT`. When the HTTPS port is not 443, the launcher prints the
corresponding `https://localhost:<port>` URL.

### Troubleshooting

- If Docker is stopped, start Docker Desktop or the Docker service and rerun
  `./lined up`.
- If `mkcert` is missing, install it using the prerequisite link above; the
  launcher does not use elevated package-manager commands.
- If a service fails readiness, inspect `./lined logs` or
  `./lined logs backend`. Flyway migration errors and invalid local secrets
  are reported by the backend logs.
- Ports 80, 443, 8025, or 8080 must be free, unless you override them as
  described above.

The Compose stack uses PostgreSQL 16 with a persistent named volume and runs
Flyway automatically during backend startup. Use `./lined reset` only when
you intentionally want to delete local database data.

### First-Time HTTPS Note

On the first run, `./lined up` uses `mkcert` to create and trust a local
certificate for `localhost`. The generated certificate and private key stay
under the ignored `.lined/tls/` directory. If `mkcert` is unavailable, the
launcher exits with installation instructions and does not install packages.

### Reset Local Data

`./lined down` preserves the named PostgreSQL volume. To rebuild the schema
from the Flyway migrations and delete all local data, run `./lined reset` and
confirm the warning, or use `./lined reset --yes` in automation.

## 🌟 Description
**Lined** is an app for couples, families, and friends that helps synchronize schedules, coordinate tasks, and find shared quality time.  

The goal of Lined is to turn schedule chaos into harmony: you instantly see when plans overlap, plan meals or activities together, and delegate household tasks — all in one place.  

---

## 🚀 Core Features (MVP)
- 👥 **Lobby** — create a shared group (couple, family, or friends).  
- 📅 **Calendar** — add personal and shared events, view overlaps in schedules.  
- ⏰ **Free Slots** — automatic highlighting of time when all members are available.  
- 📝 **Tasks** — shared to-do list with assignees and statuses.  
- 🔔 **Notifications (basic)** — reminders for events and tasks.  

---

## 🔮 Future Development
### Phase 1: Convenience
- Integration with Google Calendar / Outlook.  
- Personal dashboards (today / week view).  

### Phase 2: Social & Fun
- In-lobby mini chat.  
- Gamification (badges for shared activities).  
- Statistics (shared meals, completed tasks, time together).  

### Phase 3: Scaling
- Cross-platform (Web + iOS + Android).  
- Multiple lobbies per user (family, friends, colleagues).  
- Integrations with other services (Slack, Notion).  

### Phase 4: AI (long-term)
- Recommendations for shared leisure time (“you both have 2 free hours on Saturday — here are options”).  
- Automatic household task distribution.  
- Predicting shared free time.  

---

## 🎯 Target Audience
- **Couples/Families**: plan meals, chores, and free time together.  
- **Friends**: organize hangouts, trips, and events.  
- **Remote workers/freelancers**: coordinate schedules and tasks in small groups.  

---

## 💡 Why Lined?
- 🕒 **Time sync** — no more manually comparing calendars.  
- 🤝 **Togetherness** — plan tasks and moments as a group.  
- 🎨 **Simplicity** — minimalistic, intuitive design.  
- 🔮 **Future-ready** — AI for smarter recommendations.  

---

## 🎨 Branding
- **Name:** *Lined*  
- **Slogan:** *Where life and quality time meet*  
- **Colors:** warm green (balance), white (simplicity), beige/pastel (coziness).  
- **Logo Idea:** several lines converging into one point → symbolizing overlapping schedules.  

---

## 🛠 Recommended Tech Stack
- **Frontend:** React + TypeScript (PWA or React Native for mobile).  
- **Backend:** Java (Spring Boot, Spring Security).  
- **Database:** PostgreSQL.  
- **Messaging:** Apache Kafka (for real-time sync of events/tasks).  
- **CI/CD:** GitHub Actions / GitLab CI.  
- **Deployment:** Docker + Kubernetes (or Docker Compose for MVP).  

---

## 📌 Roadmap (2025–2026)
- **Q1 2025:** MVP (lobby, calendar, tasks, basic notifications).  
- **Q2 2025:** Calendar integrations, dashboard.  
- **Q3 2025:** Social features (chat, statistics, badges).  
- **Q4 2025 – Q1 2026:** Scaling (mobile app, integrations).  
- **2026+:** AI module (recommendations, prediction, task distribution).  

---

## 📢 Promo Slogans
- *“From chaos to Lined.”*  
- *“Get your time lined up.”*  
- *“Harmony in every schedule.”*  
- *“Lined — because time together matters.”*  

---

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Pan14ek_lined&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Pan14ek_lined)
