# Intelligent Retail Store Automation and Insight Generation System
### Powered by Agentic AI

A retail store automation platform run by a team of AI agents. Store staff chat with the system in English or Roman Urdu to check stock, record sales, raise purchase orders, answer customer questions, run promotions and read financial reports. The agents act on the real PostgreSQL database through tools, behind input and output guardrails.
 
- **Backend:** FastAPI + PostgreSQL, agents built on the OpenAI Agents SDK (`openai-agents`)
- **AI models:** free-tier, OpenAI-compatible providers (Groq, Gemini, OpenRouter) with automatic failover inside the backend
- **Frontend:** Next.js + Tailwind CSS ("Aubergine & Ash" design)
- **Hosting:** Railway (backend) + Neon (PostgreSQL + pgvector) + Vercel (frontend)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.1, psycopg 3 |
| Database | PostgreSQL (Neon in production), pgvector for FAQ embeddings |
| AI / Agents | OpenAI Agents SDK (`openai-agents`) over the Chat Completions API |
| AI providers | Groq (`openai/gpt-oss-120b`) → Gemini (`gemini-flash-latest`) → OpenRouter (`nvidia/nemotron-3-super-120b-a12b:free`), with failover |
| Embeddings | FastEmbed running `BAAI/bge-small-en-v1.5` locally on the CPU (no API key) |
| Frontend | Next.js 16 (App Router), React 18, TypeScript, Tailwind CSS 3, Recharts, lucide-react |
| Auth | JWT (HS256), bcrypt |
| Email | Brevo HTTPS API (vendor emails carry a PO PDF generated with fpdf2) |
| SMS | Twilio |
| Python packaging | [uv](https://docs.astral.sh/uv/) (`pyproject.toml` + `uv.lock`) |
| Deployment | Railway (backend, Docker) + Neon (PostgreSQL) + Vercel (frontend) |
| Local containers | Docker Compose (PostgreSQL, optional OmniRoute gateway, backend, frontend) |

---

## System Architecture

```
                 ┌──────────────────────────┐
  Browser ─────▶ │  Next.js frontend        │  Vercel
                 └────────────┬─────────────┘
                              │ REST + WebSocket (/ws/alerts)
                 ┌────────────▼─────────────┐
                 │  FastAPI backend         │  Railway (Docker)
                 │                          │
                 │  REST routers ───────────┼──────────────▶ PostgreSQL + pgvector (Neon)
                 │  /agent/task             │                 store data, chat history,
                 │    ├─ input checks       │                 FAQ embeddings
                 │    ├─ query router ──┐   │
                 │    │                 ▼   │
                 │    │   agents + tools ───┼──────────────▶ Brevo (email + PO PDF), Twilio (SMS)
                 │    │         │           │
                 │    │   FailoverTransport ┼──────────────▶ Groq → Gemini → OpenRouter
                 │    └─ output checks      │
                 └──────────────────────────┘
```

---

## How a Chat Message Is Handled

Every message to `/agent/task` goes through the same pipeline:

```
User message
     │
     ▼
check_input()  ── off-topic, harmful or abusive? ──▶ blocked, no LLM call
     │
     ▼
Query router (plain Python, no LLM call)
     │
     ├── one department clear ──────▶ that specialist agent directly
     ├── two or more departments ───▶ Manager agent (calls specialists as tools)
     ├── short reply ("yes", "ok",
     │   "haan theek hai") ─────────▶ the agent that answered last
     └── unclear ───────────────────▶ Triage agent (LLM decides, hands off)
     │
     ▼
Agent runs its tools against the database
     │
     ▼
check_output()  ── mask PII, block negative quantities,
                   add a manager-approval notice above Rs.100,000
     │
     ▼
Response
```

**Why a Python router?** On free-tier models every LLM call counts against a per-minute limit. The old design always started with a triage LLM call just to pick an agent. The router picks the agent from keyword rules for free, so a typical instruction now needs 2–3 LLM calls instead of 4–5. Anything the rules can't place with confidence still goes to the triage LLM, so unclear messages are handled exactly as before.

How the router decides (`backend/agents/query_router.py`):
- **Ordered phrase rules** claim their words first, so a specific phrase wins over a generic word: "sales report" (Accounting) before "sale", "top selling" before "sell", "approve PO" (Accounting) before "PO" (Inventory).
- **A sale needs a quantity** ("sell 2 TVs", "5 units of rice sold"), so "the perfume he bought" in a complaint or "products sell fast" isn't treated as a sale.
- **Typos** are matched only for words of 5+ letters ("reveneu" → revenue). At 4 letters, names matched keywords ("Bilal" ~ "bill").
- **Roman Urdu** keywords are included (e.g. "bache", "hisaab", "shikayat", "wapsi").
- Checked against 55 real prompts from the app's chat history; they are kept as regression tests.

---

## Agents and Their Tools

| Agent | Role |
|-------|------|
| **Inventory Agent** | Stock, products, sales transactions, purchase orders, receiving goods, base prices |
| **Accounting Agent** | Invoices, revenue, P&L, top sellers, vendor expenses, approving/rejecting POs |
| **Customer Service Agent** | Customer profiles, complaints, loyalty points, store policies (FAQ search) |
| **Marketing Agent** | Promotions, discounts, sales trends, email/SMS campaigns |
| **Manager Agent** | Only for multi-department requests: calls the four specialists **as tools**, so one reply combines several departments and a later step can use an earlier result ("check stock of X and discount **it**") |
| **Triage Agent** | Fallback for unclear messages: picks a specialist and hands off |

### Inventory Agent
| Tool | Description |
|------|-------------|
| `search_product_by_name` | Search by name or SKU; matches each word independently and normalizes curly quotes/dashes |
| `check_stock` | Check stock level of a product |
| `update_stock` | Add or deduct stock units |
| `get_low_stock_alerts` | List products at or below reorder level |
| `add_product` | Add a new product (optionally creating its supplier in the same step) |
| `update_price` | Update a product's base selling price (supplier cost change, market adjustment) |
| `sell_product` | Process a customer sale: deducts stock, creates paid invoice + sale record atomically |
| `create_purchase_order` | Create a PO at **cost price**; auto-approves and emails the vendor if under Rs.100,000 |
| `receive_purchase_order` | Mark a PO as received and update stock. Detects over-delivery (asks approve/reject) and short delivery (asks to notify supplier) |
| `notify_supplier_short_delivery` | Send a formal short delivery alert email to the supplier via Brevo |
| `list_products_by_category` | List all products in a category |

### Accounting Agent
| Tool | Description |
|------|-------------|
| `get_invoice` | Retrieve a specific sales invoice |
| `get_financial_summary` | Revenue summary: `days=7` for relative periods or `start_date`/`end_date` for specific ranges |
| `calculate_profit_loss` | P&L report for past N days |
| `get_revenue_by_category` | Revenue and profit by product category |
| `get_top_selling_products` | Top sellers by revenue |
| `get_purchase_expenses` | Vendor purchase history and total spent |
| `approve_purchase_order` | Approve a pending PO (emails vendor automatically) |
| `reject_purchase_order` | Reject a PO with a reason |

### Customer Service Agent
| Tool | Description |
|------|-------------|
| `search_customer_by_name` | Search customers by partial name |
| `get_customer_info` | Customer profile (phone and address masked) with loyalty points and total spent |
| `get_order_history` | Recent invoice history for a customer |
| `update_loyalty_points` | Add or deduct loyalty points |
| `handle_complaint` | Log a complaint, assign a reference number, create a notification |
| `search_faq` | Semantic search over the store FAQ (see [FAQ Search](#faq-search-rag)) |

Resolving a complaint on the `/complaints` page automatically emails the customer.

### Marketing Agent
| Tool | Description |
|------|-------------|
| `get_sales_trends` | Daily sales trends for past N days, optionally filtered by category |
| `get_top_products` | Top performing products by revenue for marketing focus |
| `create_promotion` | Create a time-bound discount for a single product |
| `create_category_promotion` | Discount every product in a category at once (e.g. "30% off all Clothing") |
| `generate_marketing_report` | Full report: revenue trends, top category, low-margin products |
| `send_promotional_email` | Promotional email via Brevo, filtered by `customer_name`, `min_loyalty_points`, or sent to all |
| `send_promotional_sms` | Promotional SMS via Twilio (all customers or filtered by loyalty points) |

**Discount rules:** 1–30% proceeds immediately. 31–70% requires one-time manager confirmation. Above 70% is blocked, and no discount may price a product below cost. Base price changes (`update_price`) belong to the Inventory Agent; Marketing only handles temporary promotional discounts.

---

## AI Providers and Failover

All agents talk to OpenAI-compatible Chat Completions endpoints through one custom HTTP transport, `FailoverTransport` (`backend/ai_failover.py`). Providers are listed in priority order in environment variables; each request goes to the first provider that isn't cooling down.

| Provider response | What happens |
|---|---|
| 200 | Answer returned |
| 429 rate limit, 413 (Groq: request over the per-minute token limit), 408, 5xx, timeout, connection error | **Same request goes to the next provider**; the failing one is skipped until its `Retry-After` (default 30 s, max 10 min) |
| Out of credit: 402, or 429 `insufficient_quota` | Next provider; paused for 10 min |
| 400 / 401 / 404 | Returned as an error: another provider wouldn't fix a bad request or a bad key |
| Every provider cooling down | Immediate "busy" reply, without calling anyone |

Switching providers mid-conversation is safe because each Chat Completions request carries the whole conversation. The transport also:
- forces each provider's own model name and API key
- strips parameters most providers reject (`reasoning_effort`, `verbosity`)
- drops the empty `"required": []` from handoff tool schemas (Groq rejects it)
- adds Google's placeholder `thought_signature` to tool calls sent to Gemini. Gemini's thinking models reject tool-call history without one, and the Agents SDK doesn't keep the real signature (verified: 400 without, 200 with).

If no `AI_PROVIDER_n_*` variables are set, `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` is used as a single provider, e.g. a self-hosted [OmniRoute](https://github.com/diegosouzapw/OmniRoute) gateway (available in `docker-compose.yml`).

---

## FAQ Search (RAG)

The Customer Service Agent answers store-policy questions (returns, delivery, warranty, payment, and more) from 28 FAQ documents in `backend/rag/faq_documents.py`.

```
FAQ documents ──▶ FastEmbed (bge-small-en-v1.5, 384 dims, CPU) ──▶ vectors
                                                                     │
                     database has pgvector? (Neon: yes) ──▶ faq_embeddings table
                     otherwise (local dev, SQLite tests) ──▶ in memory
                                                                     │
search_faq("return policy") ──▶ embed query ──▶ cosine similarity ──▶ top 3 FAQs
```

- **Free and local:** embeddings run on the CPU. No API key, no rate limit.
- **Persistent on Neon:** each row stores a hash of its text + model name, so a redeploy re-embeds nothing and only edited FAQs are re-embedded. The backend runs `CREATE EXTENSION IF NOT EXISTS vector` itself.
- **Model baked into the Docker image** (`FASTEMBED_CACHE_PATH`), because Railway's disk resets on every deploy.
- **Model choice:** measured on 19 questions worded differently from the FAQs. bge-small found the right FAQ in the top 3 for 18/19 (multilingual MiniLM: 16/19).
- **Roman Urdu:** retrieval on raw Roman Urdu is weak for both models, so the agent writes its FAQ queries in English ("wapsi ki policy kya hai?" → "return policy") and still answers in the customer's language.
- **No invented policies:** the agent must state only what the FAQ text says. If the search fails, `search_faq` says so plainly, instead of the agent answering "I don't have information on that".

---

## Purchase Order Workflow

```
Agent creates PO (priced at cost price)
       │
       ├── total ≤ Rs.100,000 ──▶ Auto-approved ──▶ Vendor email + PO PDF ──▶ Status: sent_to_vendor
       │
       └── total > Rs.100,000 ──▶ Status: pending ──▶ Manager approves via Purchase Orders page
                                                              │
                                                              ▼
                                                    Vendor email + PO PDF ──▶ Status: sent_to_vendor
                                                              │
                                                              ▼
                                               Manager reports goods received
                                                              │
                                                 ┌────────────┼────────────┐
                                                 ▼            ▼            ▼
                                           Exact qty     Over-delivery  Short delivery
                                           received      detected       detected
                                                │              │              │
                                                │         Manager:       Stock updated
                                                │         approve/       + Agent asks:
                                                │         reject         notify supplier?
                                                │              │              │
                                                └──────────────┴──────────────┘
                                                              │
                                                              ▼
                                                     Status: received
                                                       (stock updated)
```

- **Strict receive validation:** `receive_purchase_order` only accepts POs with status `sent_to_vendor`, and the agent is instructed never to create and receive a PO in the same turn.
- **Duplicate prevention:** `create_purchase_order` won't create a second open PO for the same product on the same day.
- **Over-delivery:** the agent pauses and asks the manager to approve (accept all units) or reject (accept the PO quantity, return the excess).
- **Short delivery:** stock is updated with the actual quantity, then the agent asks whether to email the supplier.
- **PO PDF:** vendor emails attach a PDF purchase order (`backend/tools/po_pdf.py`).

---

## Guardrails

### Input (before any LLM call)
- `check_input()` in `/agent/task` blocks off-topic, harmful (hacking, fraud, data dumps…) and abusive messages.
- The same checks are attached as SDK input guardrails to every agent that can start a run (the four specialists, Manager, Triage).

### Output (on every reply, whichever agent answered)
- **PII masking:** Pakistani phone numbers, street addresses and emails are masked.
- **Negative quantity:** replies containing negative stock values are blocked.
- **Budget limit:** replies with an order amount above Rs.100,000 get a "manager approval required" notice. Amounts need a `Rs.`/`PKR` prefix, so timestamps in PO numbers aren't mistaken for money.

The SDK version of the budget guardrail is deliberately **not** attached to the specialists: it would raise on any "order … Rs.>100,000" text and block normal "PO pending approval" replies. `check_output()` in the endpoint covers every path instead.

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Get a JWT token |
| POST | `/auth/register` | Register a new user |
| GET | `/auth/me` | Current user info |

### Agent and Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | `/agent/task` | Run a message through the agent system |
| GET | `/chat/history` | All chat messages for the current user |
| POST | `/chat/messages` | Save a chat message (role + content) |

### Inventory
| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory/products` | List products |
| GET | `/inventory/products/{product_id}` | Get a product |
| POST | `/inventory/products` | Add a product |
| PATCH | `/inventory/products/{product_id}` | Update a product |
| GET | `/inventory/critical` | Products below reorder level |

### Purchase Orders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/purchase-orders` | List POs (filterable by status) |
| GET | `/purchase-orders/summary` | Total spent, order counts, this month |
| GET | `/purchase-orders/{po_id}` | Get a PO |
| PATCH | `/purchase-orders/{po_id}/status` | Approve / reject / mark received |

### Accounting
| Method | Path | Description |
|--------|------|-------------|
| GET | `/accounting/invoices` | List invoices |
| GET | `/accounting/summary` | Revenue, invoice counts, tax |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/kpis` | KPI metrics (products, revenue, customers, invoices) |
| GET | `/dashboard/sales-today` | Today's invoice count and revenue |
| GET | `/dashboard/daily-revenue?days=7` | Revenue per day for the last 7, 14 or 30 days |
| GET | `/dashboard/recent-transactions?payment_method=Cash` | Last 10 paid invoices, filterable by payment method |
| GET | `/dashboard/category-revenue` | Revenue and profit by product category |
| GET | `/dashboard/top-products?period=week` | Top sellers by revenue (today / week / month) |
| GET | `/dashboard/profit-summary` | Today's profit, average order value, payment method breakdown |
| WS | `/ws/alerts` | Live low-stock alerts every 30 s |

### Customers and Complaints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/customers` | Customer list |
| GET | `/customers/{customer_id}` | Get a customer |
| PATCH | `/customers/{customer_id}/loyalty` | Add (or, with a negative number, deduct) loyalty points |
| GET | `/complaints` | Complaint list |
| PATCH | `/complaints/{complaint_id}/status` | Update status (resolving emails the customer) |

### Marketing
| Method | Path | Description |
|--------|------|-------------|
| GET | `/marketing/promotions` | Promotion list |
| PATCH | `/marketing/promotions/{promo_id}/status` | Set a promotion's status (`active`, `expired`, `cancelled`) |
| GET | `/marketing/trends` | Sales trends |
| GET | `/marketing/top-products` | Top products |

### Suppliers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/suppliers` | Supplier list |
| GET | `/suppliers/{supplier_id}` | Get a supplier |
| POST | `/suppliers` | Add a supplier |
| PATCH | `/suppliers/{supplier_id}` | Update a supplier |
| DELETE | `/suppliers/{supplier_id}` | Delete a supplier |

### Notifications and Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | Notification list |
| GET | `/notifications/unread-count` | Unread count |
| PATCH | `/notifications/{notification_id}/read` | Mark one as read |
| PATCH | `/notifications/mark-all-read` | Mark all as read |
| GET | `/health` | Health check |

Interactive docs: `http://localhost:8000/docs`.

---

## Frontend Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/dashboard` | KPI cards, revenue chart, live low-stock alerts |
| Sales | `/sales` | 6 KPI cards, daily revenue chart (7/14/30 days), payment method pie, category revenue, top products by period, transactions table with payment filter; silent background refresh every 30 s |
| AI Agent | `/agent` | Chat with the agents; history persists across navigation, refresh and devices |
| Inventory | `/inventory` | Product list, stock levels, category tabs, low-stock filter |
| Accounting | `/accounting` | **Sales** tab (invoices, revenue summary) + **Purchases** tab (vendor purchase records, total spent) |
| Purchase Orders | `/purchase-orders` | PO list with status filters and approve/reject/mark-received actions |
| Customers | `/customers` | Customer list and loyalty points |
| Complaints | `/complaints` | Complaint tracker with status updates |
| Suppliers | `/suppliers` | Supplier management (add, edit, delete) |

**Design:** the "Aubergine & Ash" palette lives in `frontend/tailwind.config.ts` as the `brand` and `ash` color ramps; status colors stay emerald / amber / red.

---

## Database Tables

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | Authentication and role-based access |
| 2 | `products` | Inventory |
| 3 | `customers` | Customer profiles and loyalty points |
| 4 | `invoices` | Sales billing and payments |
| 5 | `invoice_items` | Per-product invoice lines |
| 6 | `sales` | Revenue and profit tracking |
| 7 | `complaints` | Customer complaint history |
| 8 | `purchase_orders` | Vendor restock orders |
| 9 | `suppliers` | Supplier contacts and emails |
| 10 | `promotions` | Discount promotions |
| 11 | `notifications` | System event log |
| 12 | `chat_messages` | Persisted AI chat history per user |
| 13 | `faq_embeddings` | FAQ vectors (pgvector); created automatically, only where pgvector is available |

Tables 1–12 are created by SQLAlchemy on startup.

---

## Project Structure

```
retail-agent-system/
├── backend/
│   ├── agents/
│   │   ├── query_router.py       # Rule-based routing (no LLM call)
│   │   ├── manager_agent.py      # Multi-department requests (specialists as tools)
│   │   ├── triage_agent.py       # Fallback for unclear messages (handoffs)
│   │   ├── inventory_agent.py
│   │   ├── accounting_agent.py
│   │   ├── customer_service_agent.py
│   │   └── marketing_agent.py
│   ├── api/                      # FastAPI routers (agent, chat, inventory, accounting,
│   │                             #   purchase orders, customers, complaints, suppliers,
│   │                             #   marketing, notifications, dashboard)
│   ├── tools/                    # Agent function tools
│   │   ├── inventory_tools.py
│   │   ├── accounting_tools.py
│   │   ├── customer_tools.py
│   │   ├── marketing_tools.py
│   │   ├── email_tools.py        # Brevo API
│   │   └── po_pdf.py             # Purchase order PDF
│   ├── guardrails/               # input_guardrails.py, output_guardrails.py
│   ├── rag/                      # FAQ search: pipeline.py, faq_documents.py
│   ├── auth/                     # JWT auth
│   ├── models/                   # SQLAlchemy models
│   ├── schemas/                  # Pydantic schemas
│   ├── ai_failover.py            # Provider failover transport
│   ├── search_utils.py           # Product search helpers
│   ├── database.py
│   └── main.py                   # App entry point, AI client setup
├── frontend/
│   ├── app/                      # dashboard, sales, agent, inventory, accounting,
│   │                             #   purchase-orders, customers, complaints, suppliers, login
│   ├── components/               # AppShell, Navbar, AgentChat, AlertBanner, KpiCard, ProductTable
│   ├── lib/api.ts                # Axios API client
│   └── tailwind.config.ts        # "Aubergine & Ash" palette
├── scripts/
│   ├── seed_data.py              # Seed products, customers, suppliers, sales
│   └── ingest_faq.py             # Optional: embed FAQs and test searches
├── tests/
│   ├── conftest.py, helpers.py   # Fixtures; call_tool() runs @function_tool tools
│   ├── test_query_router.py      # Routing rules + 55 real prompts
│   ├── test_agent_routing.py     # /agent/task starts the right agent
│   ├── test_ai_failover.py       # Failover, cooldowns, provider quirks
│   ├── test_rag.py               # FAQ search (fake + real model, optional pgvector)
│   ├── test_tools.py, test_guardrails.py, test_api.py
├── evaluation/                   # evaluator.py, test_cases.py, run_eval.py
├── Dockerfile                    # Backend image (uv, embedding model baked in)
├── docker-compose.yml            # Local stack: postgres, omniroute (optional), backend, frontend
├── pyproject.toml                # Python dependencies (managed with uv)
├── uv.lock                       # Exact locked versions
└── .env                          # Local secrets (gitignored)
```

---

## Environment Variables

Create `retail-agent-system/.env`:

```env
# Database (Neon: postgresql://...neon.tech/neondb?sslmode=require)
DATABASE_URL=postgresql://postgres:PASSWORD@localhost/retail_db

# JWT
JWT_SECRET=your_secret_key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30

# Admin user, created on first startup (a random password is printed if unset)
ADMIN_PASSWORD=choose_a_password

# AI providers, in priority order. Each needs URL + KEY + MODEL (NAME is optional).
# A provider with a URL but no KEY or MODEL stops the backend from starting.
AI_PROVIDER_1_NAME=groq-120b
AI_PROVIDER_1_URL=https://api.groq.com/openai/v1
AI_PROVIDER_1_KEY=gsk_...
AI_PROVIDER_1_MODEL=openai/gpt-oss-120b

AI_PROVIDER_2_NAME=gemini
AI_PROVIDER_2_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_PROVIDER_2_KEY=...
AI_PROVIDER_2_MODEL=gemini-flash-latest

AI_PROVIDER_3_NAME=openrouter
AI_PROVIDER_3_URL=https://openrouter.ai/api/v1
AI_PROVIDER_3_KEY=sk-or-...
AI_PROVIDER_3_MODEL=nvidia/nemotron-3-super-120b-a12b:free

# Alternative to AI_PROVIDER_n_*: a single gateway such as OmniRoute
# AI_BASE_URL=http://localhost:20128/v1
# AI_API_KEY=...
# AI_MODEL=retail-agents

# Email (Brevo HTTPS API)
SMTP_EMAIL=your@gmail.com          # "from" address for all emails
BREVO_API_KEY=xkeysib-...

# SMS (Twilio, for Marketing Agent SMS campaigns)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Optional: where FastEmbed keeps the model (set in the Dockerfile for production)
# FASTEMBED_CACHE_PATH=/app/.fastembed_cache
```

Frontend (`retail-agent-system/frontend/.env.local`, or Vercel project settings):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

**Getting free AI keys:** [Groq console](https://console.groq.com/keys), [Google AI Studio](https://aistudio.google.com/apikey), [OpenRouter](https://openrouter.ai/keys) (models ending in `:free` cost nothing but have low limits). Free models change over time; any model you add must handle **tool calls** reliably.

**Email (Brevo):** sign up at [brevo.com](https://brevo.com) → Settings → Senders & IPs (verify your sender) → SMTP & API → API Keys. If Brevo restricts API keys to authorised IPs, add the server's IP (for Railway, the backend's outbound IP), not only your home IP.

---

## Setup and Running

### Prerequisites
- Python 3.11
- [uv](https://docs.astral.sh/uv/)
- Node.js 18+
- PostgreSQL (pgvector optional: without it FAQ search runs in memory)

### Backend

```bash
cd retail-agent-system

uv sync                                   # install exact versions from uv.lock (+ dev tools)
createdb retail_db                        # create the database
uv run python scripts/seed_data.py        # optional: sample data
uv run uvicorn backend.main:app --reload  # start the backend
```

Backend: `http://localhost:8000` · Swagger docs: `http://localhost:8000/docs`

Use `uv run` for every Python command so it runs inside the project's `.venv`. Add or remove a dependency with `uv add <package>` / `uv remove <package>`; both update `pyproject.toml` and `uv.lock`. Commit both.

### Frontend

```bash
cd retail-agent-system/frontend
npm install
npm run dev
```

Frontend: `http://localhost:3000`

---

## Docker (Local Stack)

```bash
cd retail-agent-system
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:3000` |
| Backend | `http://localhost:8000` |
| PostgreSQL | `localhost:5432` (`postgres:15-alpine`, no pgvector, so FAQ search runs in memory) |
| OmniRoute gateway (optional) | `http://127.0.0.1:20128` (dashboard; secrets in the gitignored `.env.omniroute`) |

`docker-compose.yml` overrides `DATABASE_URL` and `AI_BASE_URL` to use the internal Docker hostnames. When `AI_PROVIDER_n_*` is set in `.env`, those providers are used and OmniRoute is ignored.

---

## Deployment

| Service | Purpose |
|---------|---------|
| [Neon](https://neon.tech) | PostgreSQL + pgvector |
| [Railway](https://railway.com) | FastAPI backend (Docker) |
| [Vercel](https://vercel.com) | Next.js frontend |

**1. Neon:** create a project and copy the connection string (`postgresql://...neon.tech/neondb?sslmode=require`). pgvector is available on Neon; the backend enables it on the first FAQ search.

**2. Railway:** new service from the GitHub repo → root directory `retail-agent-system`. Railway builds the `Dockerfile`, which:
- installs exactly the versions in `uv.lock` (`uv sync --frozen --no-dev`)
- downloads the embedding model into the image, so nothing is downloaded at runtime

Set the variables from `.env`, with Neon's URL as `DATABASE_URL`, the `AI_PROVIDER_n_*` values, and `ADMIN_PASSWORD`. The app listens on port **8000**, so make sure Railway's public networking port is 8000.

**3. Vercel:** new project → root directory `retail-agent-system/frontend` → set:
```env
NEXT_PUBLIC_API_URL=https://<your-backend>.up.railway.app
NEXT_PUBLIC_WS_URL=wss://<your-backend>.up.railway.app
```

---

## Testing

```bash
cd retail-agent-system

uv run pytest                    # full suite (282 tests)
uv run pytest tests/test_query_router.py -v
uv run python -m evaluation.run_eval
```

- Tests use SQLite and fake AI providers: no API keys are needed, and nothing is sent to an LLM.
- `test_rag.py` includes a retrieval-quality test with the real embedding model (downloads ~67 MB once).
- The pgvector end-to-end test runs only when the optional `pgserver` package is installed (it bundles PostgreSQL with pgvector): `uv run --with pgserver python -m pytest tests/test_rag.py` (use `python -m pytest` here: the plain `pytest` command doesn't see packages added with `--with`).
- The test process loads `.env`, so an incomplete `AI_PROVIDER_n_*` block there makes the suite fail to start (the same check that protects the backend).

---

## Build Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | PostgreSQL schema + seed data | Done |
| 2 | FastAPI backend + JWT auth | Done |
| 3 | Four specialist agents with tools | Done |
| 4 | Guardrails (input + output + PII masking) | Done |
| 5 | RAG pipeline (Customer Service FAQ) | Done |
| 6 | Evaluation framework + tests | Done |
| 7 | Next.js dashboard + WebSocket alerts | Done |
| 8 | Purchase Orders + Supplier management | Done |
| 9 | Accounting Purchases tab + vendor expense tracking | Done |
| 10 | AI Agent chat history persistence | Done |
| 11 | Sales Dashboard (KPIs, charts, filters, silent refresh) | Done |
| 12 | Email + SMS marketing tools | Done |
| 13 | Docker Compose + deployment | Done |
| 14 | "Aubergine & Ash" UI redesign + PO PDF attachments | Done |
| 15 | Free-tier AI providers (GitHub Models retired 2026-07-30) | Done |
| 16 | Python query router + Manager agent for multi-department requests | Done |
| 17 | In-backend provider failover | Done |
| 18 | FAQ search on FastEmbed + pgvector (replaces ChromaDB + OpenAI embeddings) | Done |
| 19 | Dependency management with uv | Done |

---

## Key Design Decisions

- **Route in code, fall back to the LLM:** a wrong route costs more than an extra LLM call, so the rule-based router only acts when it's confident; everything else goes to the triage LLM. Short replies ("yes", "approve") go back to the agent that asked, which is remembered per user in memory. After a restart, a reply goes to triage, which reads the chat history.
- **Specialists as tools for multi-part requests:** a handoff passes control to one agent and never returns, so "check stock and create a discount" used to lose its second half. The Manager agent calls specialists as tools, gets their answers back and combines them.
- **Failover inside the backend:** no extra gateway service to host or secure on Railway, and provider keys live only in environment variables. Only errors another provider could fix trigger failover.
- **Exact error codes only:** Groq's and Gemini's ordinary per-minute 429 messages mention "billing" as an upgrade hint, so out-of-credit detection matches only `insufficient_quota` (and 402). Otherwise normal rate limits would pause a provider for 10 minutes.
- **Local embeddings over an embeddings API:** the FAQ is small and fixed, so a 67 MB CPU model avoids API keys, cost and rate limits. The old OpenAI-embedding setup silently broke when the key was removed.
- **pgvector with an in-memory fallback:** production keeps vectors in Neon (one database, persistent across deploys). Local Windows PostgreSQL has no pgvector, so the same search runs in memory there and in tests.
- **Locked dependencies:** `uv.lock` pins every package. An unpinned install would have pulled SQLAlchemy 2.1, which switches `postgresql://` to psycopg 3 and broke the database connection while psycopg2 was installed; the project now uses psycopg 3.
- **Auto-approval threshold:** POs under Rs.100,000 are auto-approved and emailed; larger ones wait for manager approval in the UI.
- **POs at cost price:** a purchase order is what the store pays the supplier, so it uses `cost_price`, not the selling price.
- **Atomic `sell_product`:** stock deduction, invoice, invoice items and sale record are written in one transaction, so sales always appear in Accounting.
- **Agent date awareness:** models don't know today's date, so every message is sent with `(Today's date: <weekday, DD Month YYYY>)` appended. Relative queries ("last 7 days", "this month") then resolve correctly.
- **Persistent chat history:** every message is saved to `chat_messages`; the AI Agent page reloads the full conversation. The last 10 messages are sent to the agent as context.
- **Brevo over SMTP:** raw SMTP (port 587) is blocked on many cloud hosts; Brevo's HTTPS API works everywhere.
- **Price ownership:** base price changes (`update_price`) belong to Inventory; Marketing only runs temporary promotions.
- **PII masking precision:** the address pattern uses word boundaries and excludes words like "Flat" and "Phase", which falsely matched retail phrases ("Flat Discount", "Phase 2 promotion").
- **Timezone-aware datetimes:** all comparisons use `datetime.now(timezone.utc)` to match PostgreSQL `timestamptz` columns.
- **Consistent dates:** the frontend shows dd/mm/yyyy (`toLocaleDateString('en-GB')`) regardless of browser locale.

---

## Known Limitations

- **Free-tier limits:** Groq's free tier allows about 8,000 tokens per minute on `gpt-oss-120b`, roughly 2–3 agent steps. Failover covers bursts, but heavy use still hits "busy" replies. Free OpenRouter models are shared and are sometimes rate-limited upstream.
- **Chat context:** the last 10 saved messages are sent with every request, including older conversations. That uses tokens and can pull in unrelated earlier topics.
- **Keyword routing:** English and common Roman Urdu keywords are covered; unusual wording goes to the triage LLM (correct, but one extra call).
- **FAQ language:** the embedding model is English-only; Roman Urdu questions rely on the agent translating the search query.
