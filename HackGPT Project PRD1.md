# Product Requirements Document
## Touch 'n Go eWallet — Voice AI "Quick Mode" Feature
**Version:** 1.0 (MVP / Hackathon Build)
**Author:** Solo Builder
**Date:** April 2026
**Status:** Draft

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Target Audience](#3-target-audience)
4. [Product Overview](#4-product-overview)
5. [Feature Requirements](#5-feature-requirements)
6. [Technical Architecture](#6-technical-architecture)
7. [AI Agent Pipeline](#7-ai-agent-pipeline)
8. [UI/UX Requirements](#8-uiux-requirements)
9. [Tech Stack](#9-tech-stack)
10. [Testing Requirements](#10-testing-requirements)
11. [Success Criteria](#11-success-criteria)
12. [Risk Assessment & Mitigation](#12-risk-assessment--mitigation)
13. [Hackathon Winning Tips](#13-hackathon-winning-tips)
14. [Documentation Requirements](#14-documentation-requirements)
15. [Glossary](#15-glossary)

---

## 1. Executive Summary

Touch 'n Go (TnG) eWallet is Malaysia's leading digital payment platform with over 16 million users. Despite its widespread adoption, a significant segment of the population — particularly senior citizens aged 60 and above — struggles with complex multi-tap digital interfaces, small fonts, and multi-step transaction flows.

This PRD defines the MVP for **"Quick Mode"** — a voice-first, simplified interface layer for TnG eWallet — powered by an AI agent that accepts spoken commands. The core demo path is **English-first**; BM and Mandarin support are stretch goals that layer on top without changing the architecture. Users can check balance, make payments, top up, and verify transactions entirely by voice, with a fingerprint confirmation step and a safe promotions discovery panel.

The MVP is scoped for a **5-minute solo hackathon demonstration** and is built to be fully functional, not just a prototype.

---

## 2. Problem Statement

### 2.1 Current Pain Points

- Senior citizens (60+) find standard eWallet UIs intimidating — too many small buttons, complex flows, and financial jargon
- Limited-eyesight users cannot comfortably navigate dense transaction screens

- Scam vulnerability increases when elderly users misread confirmation screens or interact with unfamiliar flows

### 2.2 Opportunity

By embedding a **voice-first AI agent** directly into a dedicated Quick Mode interface, we can:
- Reduce transaction completion time for elderly users by ~70%
- Eliminate multi-tap navigation with a single spoken command
- Increase financial confidence and independence for senior Malaysians
- Demonstrate cutting-edge agentic AI capabilities at a national hackathon level

---

## 3. Target Audience

### Primary User: Malaysian Senior Citizens (60+)
| Attribute | Detail |
|---|---|
| Age Range | 60 – 80 years old |
| Tech Literacy | Low to moderate |
| Language | Bahasa Malaysia, Mandarin, or English |
| Vision | May have reduced eyesight, prefers large text |
| Use Case | Daily: check balance, pay at shops, discover deals |
| Key Concern | Fear of making mistakes, fear of scams |

### Secondary User: Users Who Prefer Simplicity
- Any age group wanting a faster, one-tap payment experience
- Users with motor difficulties preferring voice over touch

---

## 4. Product Overview

### 4.1 What Is Quick Mode?

Quick Mode is an **optional simplified UI layer** accessible from the main TnG eWallet home screen. It presents only the most essential functions in large, friendly buttons and adds a **VOICE button** that activates an AI agent capable of understanding and executing wallet commands.

### 4.2 Quick Mode Button Layout

```
┌─────────────────────────────────┐
│         QUICK MODE              │
│                                 │
│    [ 💰 BALANCE ]               │
│                                 │
│  [ 💳 PAY ]   [ 🏷️ DEALS ]     │
│                                 │
│  [ 🎙️ VOICE ]  [ 📞 HELPER ]   │
│                                 │
│    [ 👨‍👩‍👧 CALL FAMILY ]          │
└─────────────────────────────────┘
```

### 4.3 Language Quick-Select Toggle (Stretch Goal)
At the top of Quick Mode, users can tap one button to set their preferred language:

```
[ 🇲🇾 BM ]  [ 🇨🇳 中文 ]  [ 🇬🇧 EN (default) ]
```

**MVP strategy:** English is selected by default and is the only language guaranteed to work in the core demo. BM and Mandarin toggles are wired up to the same STT/LLM pipeline — if time permits, they are enabled; if not, tapping them can show a "Coming soon" toast without breaking the demo. This sets both the STT language hint and the LLM response language for the entire session.

---

## 5. Feature Requirements

### 5.1 MVP Feature Scope (4 Core AI Actions)

| # | Feature | Voice Command (English — P0) | BM/ZH Stretch Example | Priority |
|---|---|---|---|---|
| F1 | **Check Balance** | "What is my balance?" | "Berapa baki saya?" | P0 |
| F2 | **Make Payment** | "Pay RM50 to merchant" | "Saya nak bayar RM50" | P0 |
| F3 | **Top Up Wallet** | "Top up RM100" | "Tambah RM100" | P0 |
| F4 | **Verify Identity** | Thumbprint UI confirmation after any transaction | — | P0 |

### 5.2 Supporting Features

| # | Feature | Description | Priority |
|---|---|---|---|
| F5 | **Promotions & Deals** | View-only deal cards from Jaya Grocer, AEON, 99 Speedmart | P1 |
| F6 | **Call Helper** | Dials fake TnG support number (UI only, no real call) | P1 |
| F7 | **Call Family** | Shows a placeholder contact screen | P2 |
| F8 | **LangGraph Visual** | Animated pipeline visualisation shown during AI processing | P1 |

### 5.3 Promotions & Deals Panel

**Hardcoded dummy promotions (3 merchants):**

**Jaya Grocer**
- Discount: 15% off fresh produce
- Save: RM12
- Label: "Show this at shop"

**AEON**
- Discount: Buy 2 Free 1 on household items
- Save: RM8
- Label: "Show this at shop"

**99 Speedmart**
- Discount: RM5 off min spend RM30
- Save: RM5
- Label: "Show this at shop"

**Control Rules:**
- ✅ View only — no "Buy Now" button
- ✅ Large promo cards with readable fonts
- ❌ No external links
- ❌ No auto-payment trigger
- ❌ No data collection

---

## 6. Technical Architecture

### 6.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│  Voice Button → Microphone → Audio Stream                   │
│  Language Toggle (BM / 中文 / EN)   *by Default EN, do not hardcode BM/ 中文                      │
│  LangGraph Visual Pipeline Animation                        │
│  Thumbprint UI → QR Code Display                            │
└───────────────┬─────────────────────────────────────────────┘
                │ HTTP (audio blob / text)
┌───────────────▼─────────────────────────────────────────────┐
│                  FLASK BACKEND (Python)                     │
│  /api/voice  → STT → Intent Extraction → LangChain Agent   │
│  /api/action → Execute action → Response generation        │
│  /api/tts    → Text-to-Speech → Audio response             │
└──────┬────────────────┬────────────────────────────────────-┘
       │                │
┌──────▼──────┐  ┌──────▼──────────────────────────────────┐
│   SQLite    │  │       LangChain Agent (Python)           │
│  (mock DB)  │  │  Tools: check_balance, make_payment,    │
│  balance    │  │          top_up, verify_identity        │
│  history    │  │  LLM: Qwen (via Alibaba Cloud DashScope)│
│  promos     │  │  Memory: ConversationBufferMemory        │
└─────────────┘  └──────────────────────────────────────────┘
```

### 6.2 Data Flow (Input → Output Pipeline)

```
Step 1: USER SPEAKS
        ↓
Step 2: STT (Qwen Audio / Paraformer via DashScope API)
        Audio → Text string
        Language hint passed from user's language toggle
        ↓
Step 3: INTENT EXTRACTION (LangChain)
        Text → Structured intent + parameters
        e.g. { action: "payment", amount: 50, currency: "MYR" }
        ↓
Step 4: LANGCHAIN AGENT (Tool Router)
        Intent → Tool selection → Tool execution
        Tools: check_balance | make_payment | top_up | verify
        ↓
Step 5: CONFIRMATION RESPONSE
        Agent generates confirmation text
        TTS converts to voice reply
        ↓
Step 6: USER VERIFIES
        UI shows thumbprint overlay
        User taps thumbprint → UI changes to "Approved"
        ↓
Step 7: COMPLETION
        Payment: QR code displayed / scanned
        Top-up: Balance updated in SQLite
        Balance: Spoken + displayed on screen
```

---

## 7. AI Agent Pipeline

### 7.1 Recommended STT Engine: Qwen Audio (via Alibaba Cloud DashScope API)

**Rationale for Hackathon:**
- Single API call via DashScope, no complex SDK setup
- Qwen Audio / Paraformer provides strong multilingual support for Malay, Mandarin, English, and Manglish
- Fully integrated within the Alibaba Cloud ecosystem (same vendor for hosting + AI services)
- No dependency on OpenAI Whisper or Google/Siri STT

### 7.2 LangChain Agent Architecture

**Recommendation: LangChain with fake LangGraph visual**

Use real LangChain `AgentExecutor` with 4 custom tools under the hood. On the frontend, render an animated node graph showing the pipeline stages. This gives genuine agentic behaviour (impressive to technical judges) while the visual graph impresses non-technical judges.

**Agent setup:**
```python
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.tools import tool
from langchain.memory import ConversationBufferMemory
from langchain_community.chat_models import ChatTongyi

@tool
def check_balance(user_id: str) -> str:
    """Check the current wallet balance for the user."""
    # Query SQLite mock DB
    return f"Your current balance is RM 250.00"

@tool
def make_payment(amount: float, merchant: str) -> str:
    """Make a payment from the wallet."""
    return f"Payment of RM {amount:.2f} to {merchant} confirmed. Please verify with thumbprint."

@tool
def top_up_wallet(amount: float) -> str:
    """Top up the wallet with a specified amount."""
    return f"Top up of RM {amount:.2f} initiated. Please verify with thumbprint."

@tool
def verify_identity() -> str:
    """Request thumbprint verification from the user."""
    return "Thumbprint verification required. Please place your finger on the sensor."
```

### 7.3 LangGraph Visual (Frontend Animation)

Display a 4-node animated graph during every AI processing cycle:

```
[ 🎙️ Voice Input ] → [ 🧠 Intent Detection ] → [ ⚙️ Action Execution ] → [ ✅ Confirmation ]
```



## 8. UI/UX Requirements

### 8.0 Frontend Architecture: Single-Page State Machine

The entire Quick Mode UI lives in a **single React component tree** with no client-side routing. Navigation between views is handled by a state machine, which is simpler to build, debug, and demo than a multi-page router.

**App States:**
```
  ┌──────────┐
  │   HOME   │  ← Quick Mode landing (large buttons)
  └────┬─────┘
       │ user taps a button
       ▼
  ┌──────────────┐   ┌────────────┐   ┌──────────────┐   ┌──────────┐
  │  LISTENING   │   │  BALANCE   │   │  PROMOTIONS  │   │  HELPER  │
  │  (mic open)  │   │  (display) │   │  (deal cards)│   │  (call)  │
  └──────┬───────┘   └────────────┘   └──────────────┘   └──────────┘
         │ audio captured
         ▼
  ┌──────────────┐
  │  THINKING    │  ← LangGraph pipeline animation plays
  │  (API call)  │
  └──────┬───────┘
         │ agent responds
         ▼
  ┌──────────────┐
  │   RESULT     │  ← Shows balance / payment confirmation / top-up confirmation
  └──────┬───────┘
         │ requires verification?
         ▼
  ┌──────────────┐
  │  VERIFYING   │  ← Thumbprint overlay
  └──────┬───────┘
         │ user taps thumbprint
         ▼
  ┌──────────────┐
  │   SUCCESS    │  ← Green checkmark + QR code (payment) or updated balance (top-up)
  └──────┬───────┘
         │ "Done" button
         ▼
       HOME
```

**React implementation pattern:**
```javascript
const [appState, setAppState] = useState('HOME');
const [agentResult, setAgentResult] = useState(null);

switch (appState) {
  case 'HOME':        return <QuickModeHome />;
  case 'LISTENING':   return <VoiceRecorder />;
  case 'THINKING':    return <PipelineAnimation />;
  case 'RESULT':      return <AgentResult data={agentResult} />;
  case 'VERIFYING':   return <ThumbprintOverlay />;
  case 'SUCCESS':     return <SuccessScreen data={agentResult} />;
  case 'PROMOTIONS':  return <PromotionsPanel />;
  case 'BALANCE':     return <BalanceDisplay />;
  case 'HELPER':      return <CallHelper />;
}
```

This approach means **zero dependency on react-router-dom**, fewer moving parts, and every state transition is visible and debuggable during the live demo.

### 8.1 Design Principles (Elder-Friendly)

| Principle | Specification |
|---|---|
| Font size | Minimum 18px body, 24px buttons, 32px balance display |
| Button size | Minimum 80x80px touch targets |
| Colour contrast | WCAG AA compliant (4.5:1 ratio minimum) |
| Language | Simple words — "Pay" not "Initiate Transaction" |
| Feedback | Every tap produces visual + audio response |
| Error state | Clear, calm message — "I didn't understand. Please try again." |

### 8.2 Voice Recording UX Flow (State Transitions)

```
1. HOME → User taps [ 🎙️ VOICE ] button
2. LISTENING → Button pulses red with "Listening..." label; mic is open
3. User speaks command; audio blob captured
4. THINKING → LangGraph pipeline animation plays; API call in progress
5. RESULT → AI voice response plays (TTS); action screen appears
6. VERIFYING → Thumbprint overlay (if payment/top-up)
7. SUCCESS → Green checkmark + QR/balance update
8. HOME → User taps "Done"
```

### 8.3 Thumbprint Verification UI

- A modal overlay appears with a large fingerprint icon (🔐)
- Text: "Please verify — press your thumb here"
- User taps the fingerprint icon
- UI transitions: fingerprint icon → green checkmark (✅) → "Verified!"
- No real biometric API — pure UI state change

### 8.4 QR Code Display (Post-Payment)

- After thumbprint verification for a payment, display a static mock QR code image
- Show merchant name, amount, and timestamp
- Button: "Done" returns user to Quick Mode home

---

## 9. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React + Tailwind CSS | Component-based, fast to build, responsive |
| **Backend** | Python + Flask | Simple REST API, easy Alibaba Cloud ECS deployment |
| **STT** | Qwen Audio / Paraformer (DashScope API) | Best multilingual support for MY/ZH/EN, no Whisper dependency |
| **LLM** | Qwen (via DashScope API) | Strong multilingual LLM, same Alibaba ecosystem |
| **Agent Framework** | LangChain (AgentExecutor) | Industry standard, impressive to judges |
| **Visual Graph** | CSS animation (fake LangGraph) | Maximum visual impact, zero build risk |
| **TTS** | Qwen / CosyVoice (DashScope API) | Natural voice synthesis, same Alibaba ecosystem |
| **Database** | SQLite | Zero setup, sufficient for demo |
| **Deployment** | Alibaba Cloud ECS | Accessible demo URL for judges |
| **Web Server** | Gunicorn + Nginx | Production-like setup for ECS |

### 9.1 Key Python Dependencies

```txt
flask
flask-cors
dashscope
langchain
langchain-community
sqlite3
python-dotenv
gunicorn
```

### 9.2 Key React Dependencies

```txt
react
react-dom
axios
tailwindcss
```

---

## 10. Testing Requirements

### 10.1 Testing Strategy

Given the hackathon timeline, testing focuses on **demo path reliability** — ensuring the 5-minute demo flow works flawlessly under pressure.

### 10.2 Critical Test Scenarios

| # | Scenario | Expected Result | Priority |
|---|---|---|---|
| T1 | User says "What is my balance?" in English | Voice reply: "Your balance is RM 250" | Critical |
| T2 | User says "Pay RM50" in English | Confirmation prompt + thumbprint overlay | Critical |
| T3 | User taps thumbprint icon | Green checkmark animation + QR code display | Critical |
| T4 | User says "Top up RM100" in English | Confirmation + thumbprint + balance updates | Critical |
| T5 | User views Promotions page | 3 merchant cards shown, no payment buttons | High |
| T6 | Microphone permission denied | Clear error message shown | Medium |
| T7 | Background noise input | "I didn't catch that, please try again" | Medium |
| T8 | User says "Berapa baki saya?" in BM | Voice reply in Malay with correct balance | Stretch |
| T9 | User switches language to 中文 | All responses switch to Mandarin | Stretch |
| T10 | Call Helper button tapped | Fake dialling screen with TnG number | Low |

### 10.3 Pre-Demo Checklist

- [ ] Alibaba Cloud ECS instance is running and URL is accessible
- [ ] All 4 voice commands tested and producing correct responses
- [ ] Thumbprint animation works on mobile browser
- [ ] Language toggle defaults to English; BM/Mandarin tested if enabled
- [ ] Promotions page displays all 3 merchants correctly
- [ ] Audio playback works (TTS response plays automatically)
- [ ] Fallback mock response ready if Qwen STT API is slow

---

## 11. Success Criteria

### 11.1 MVP Definition of Done

The MVP is considered complete and demo-ready when:

1. A user can speak a command in **English** and receive a correct voice response (BM/Mandarin are stretch goals)
2. All 4 agent actions (balance, pay, top-up, verify) execute end-to-end without crashes
3. The thumbprint UI confirmation works on mobile browser
4. The LangGraph visual pipeline animation displays during AI processing
5. The Promotions page displays 3 merchant cards with no transaction capability
6. The app is live on an Alibaba Cloud ECS URL accessible by judges on their phones

### 11.2 Hackathon Judging Alignment

| Judging Dimension | How This MVP Scores |
|---|---|
| **Innovation** | Voice-first eWallet agent is novel in Malaysia's fintech landscape |
| **Technical Depth** | Real LangChain agent + Qwen STT/TTS + multilingual support |
| **Impact** | Directly addresses 60+ population digital exclusion |
| **Demo Quality** | Clear 5-min flow: speak → agent processes → voice reply → verify → done |
| **Completeness** | 4 working features, not just mockups |

---

## 12. Risk Assessment & Mitigation

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Qwen STT API slow or down during demo | Medium | High | Pre-record fallback audio responses; have mock mode toggle |
| R2 | Microphone permission blocked on demo device | Medium | High | Test on demo device 30 min before; have typed-input fallback |
| R3 | Alibaba Cloud ECS instance crashes under demo load | Low | High | Keep instance running; have localhost fallback on laptop |
| R4 | LangChain agent gives wrong response | Medium | Medium | Hardcode responses for the 4 demo commands as safety net |
| R5 | DashScope API rate limit / cost overrun | Low | Medium | Set max_tokens=150; use Qwen-turbo for speed; monitor usage |
| R6 | Malay/Mandarin STT accuracy low | Medium | Medium | Test all phrases beforehand; use language hint parameter |
| R7 | Solo build — time runs out | High | High | Build in priority order: F1→F2→F3→F4→F5; cut F6/F7 if needed |
| R8 | TTS audio not playing in browser | Low | Medium | Use HTML5 Audio element; test autoplay policy on Chrome |

### 12.1 Recommended Build Order (Solo, Time-Boxed)

```
Day 1: Flask backend + SQLite + 4 LangChain tools + Qwen STT integration (DashScope) — English only
Day 2: React frontend Quick Mode (single-page state machine) + Voice recording + API connection
Day 3: Thumbprint UI + QR display + TTS playback + LangGraph animation
Day 4: Promotions page + Alibaba Cloud ECS deployment + fallback hardcoding
Day 5: Full demo rehearsal + bug fixes + (stretch) BM/Mandarin language toggle
```

---

## 13. Hackathon Winning Tips

### 13.1 Demo Script (5 Minutes)

**Minute 1 — Hook:** Open with the problem. Show a dense standard eWallet UI. Say: *"16 million Malaysians use TnG. But for our seniors, this is what they face."*

**Minute 2 — Solution intro:** Switch to Quick Mode. Show the large buttons, language toggle. Say: *"What if your eWallet could just... listen?"*

**Minute 3 — Live demo:** Tap Voice. Say "What is my balance?" Show the LangGraph pipeline light up. AI replies by voice. Judges are hooked.

**Minute 4 — Full flow:** Say "Pay RM50". Show thumbprint. Show QR code. Say "It's that simple — no menus, no mistakes."

**Minute 5 — Impact + close:** Show promotions page. Say: *"We also built a safe zone for seniors to discover savings — with zero risk of accidental spending. Voice AI for every Malaysian."*

### 13.2 Judge Psychology Tips

- **Name-drop LangChain/LangGraph visibly** on screen — technical judges recognise and respect it
- **Have a senior citizen persona ready** — "My grandmother can now use TnG without calling me"
- **Show it working on your phone**, not just a laptop — mobile-first feels real
- **Mention multilingual** — "Three languages, one voice command" is uniquely Malaysian and memorable
- **Keep fallbacks invisible** — if something breaks, smoothly switch to fallback without panic

---

## 14. Documentation Requirements

### 14.1 User Manual (Elder-Friendly, 1 Page)
- How to enter Quick Mode
- How to use the Voice button (with picture)
- What commands to say (in BM, EN, ZH)
- How to verify with thumbprint
- How to view promotions safely

### 14.2 Technical Specifications (For Judges)
- Architecture diagram
- LangChain agent tool list
- API endpoints table
- Database schema

### 14.3 Developer Documentation
- README.md with setup instructions (clone → pip install → npm install → run)
- `.env.example` file with required keys (DASHSCOPE_API_KEY)
- Alibaba Cloud ECS deployment steps (concise, under 20 commands)

### 14.4 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/voice` | Accepts audio blob, returns transcription + intent |
| POST | `/api/agent` | Accepts intent JSON, returns agent action result |
| GET | `/api/balance` | Returns mock wallet balance |
| POST | `/api/payment` | Processes mock payment, returns confirmation |
| POST | `/api/topup` | Processes mock top-up, updates SQLite balance |
| GET | `/api/promotions` | Returns hardcoded promo cards JSON |
| POST | `/api/tts` | Accepts text + language, returns audio blob |

---

## 15. Glossary

| Term | Definition |
|---|---|
| **STT** | Speech-to-Text — converts spoken audio to a text string |
| **TTS** | Text-to-Speech — converts a text string to spoken audio |
| **LLM** | Large Language Model — AI model (e.g. Qwen) that understands and generates text |
| **LangChain** | Python framework for building AI agents that can use tools and maintain conversation memory |
| **LangGraph** | Extension of LangChain for building multi-step, graph-based agent workflows (visualised in this app) |
| **Agent** | An AI system that can decide which tool to use based on a user's request |
| **Tool** | A function the AI agent can call to perform a specific action (e.g. check_balance) |
| **Qwen** | Alibaba Cloud's family of AI models — includes LLM, Speech-to-Text (Paraformer), and Text-to-Speech (CosyVoice) capabilities |
| **DashScope** | Alibaba Cloud's API platform for accessing Qwen models (LLM, STT, TTS) |
| **Quick Mode** | The simplified, large-button UI layer introduced in this feature |
| **Thumbprint UI** | A simulated biometric confirmation screen (UI-only, no real biometric API) |
| **Manglish** | Malaysian English — a colloquial mix of Malay, English, and Chinese used in everyday speech |
| **MVP** | Minimum Viable Product — the smallest version of a product that can be demonstrated |
| **ECS** | Alibaba Cloud Elastic Compute Service — a cloud server used to host and serve the application |
| **SQLite** | A lightweight, file-based database requiring no server setup — used for mock wallet data |
| **Flask** | A lightweight Python web framework used to build the backend REST API |
| **React** | A JavaScript frontend library for building interactive user interfaces |
| **Tailwind CSS** | A utility-first CSS framework for rapidly building styled UI components |

---

*Document prepared for hackathon MVP demonstration purposes. All wallet data, transactions, and biometric verification in this build are simulated and do not connect to any real financial systems.*

