# Fisgón Engine: Artifact & Replication Package

[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![WCAG 2.1](https://img.shields.io/badge/Accessibility-WCAG%202.1%20%2F%20WAI--ARIA-orange.svg)](https://www.w3.org/WAI/standards-guidelines/wcag/)

This repository is the official **Artifact and Replication Package** for the paper:

> **"Simulating User Interaction Events to Discover Dynamic Accessibility Smells"**  

---

## 📌 Overview

**Fisgón Engine** is an automated runtime auditing framework that uncovers **dynamic accessibility issues (Accessibility Smells / ASmells)** by simulating realistic keyboard-only user interactions on web applications.

Unlike static accessibility checkers (e.g., WAVE, Axe-core) that only inspect static HTML or initial DOM states, Fisgón Engine evaluates interfaces in real time as mutations occur during user interaction:

1. **Accessibility Tree Extraction**: Leverages the Chrome DevTools Protocol (CDP) to track the live accessibility tree and focus states directly from Chromium.
2. **AI-Driven Action Derivation**: Employs Google Gemini to autonomously infer realistic user input and navigate complex UI controls based on the active accessibility profile.
3. **Screen Reader Speech Emulation**: Injects an NVDA-compatible speech synthesis emulator to record spoken announcements and detect cognitive discrepancies.
4. **Autonomous Probe Ingestion**: Dynamically monitors DOM mutations, visual bounding boxes, focus order, and dialog openings against an extended catalog of **Accessibility Events (AEvents)**.

```
                  ┌──────────────────────┐
                  │ Target Web Page/Form │
                  └──────────┬───────────┘
                             │
                  ┌──────────▼───────────┐
                  │ Puppeteer (CDP/A11y) │
                  └──────────┬───────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     │                       │                       │
┌────▼─────────────┐ ┌───────▼───────────┐ ┌────────▼────────────┐
│ NVDA Speech Probe│ │ AEvent Detectors  │ │ Gemini AI Generator │
│ (Spoken Feedback)│ │ (13 Dynamic Skills│ │ (Action Derivation) │
└──────────────────┘ └───────────────────┘ └─────────────────────┘
```

---

## 📂 Repository Structure

```text
fisgon-replication-package/
├── bin/
│   └── audit.js                       # CLI Runner entry point (npm run audit)
│
├── src/
│   ├── engine/
│   │   ├── browser.js                 # Chromium lifecycle + CDP accessibility session
│   │   ├── simulationLoop.js          # Core execution loop (Algorithm 1)
│   │   ├── skillLoader.js             # Dynamic probe loader and injector
│   │   ├── widgetDriver.js            # Complex widget handlers (Combobox, Slider, etc.)
│   │   └── personaGenerator.js        # Synthetic profile generator for form inputs
│   │
│   ├── emulator/
│   │   └── nvdaSpeechEmulator.js      # Injected screen reader speech emulator
│   │
│   ├── ai/
│   │   ├── askBrain.js                # Gemini-powered keyboard action derivation
│   │   └── postAnalyzer.js            # Post-audit evaluative pass (false positive filter)
│   │
│   └── skills/                        # Extended AEvent detection catalog (13 types)
│       ├── cognitive-barrier/
│       ├── content-removed-without-notice/
│       ├── deleted-input-content/
│       ├── dropdown-selector-with-Limited-Interaction/
│       ├── frequent-tab/
│       ├── misleading-speech-synthesis/
│       ├── missing-sr-text/
│       ├── modal-window-display/
│       ├── page-exit-attempt/
│       ├── re-enter-focus-form/
│       ├── re-enter-focus-page/
│       ├── short-list-select/
│       ├── skipped-focus-element/
│       ├── unhelpful-label/
│       └── winding-tab-sequence/
│
├── data/                              # Evaluation Datasets (Paper Tables 1–4)
│   ├── benchmark_targets.json         # Metadata of the 5 real-world case study platforms
│   ├── table1_aevents_detected.json   # 97 AEvents detected by Fisgón
│   ├── table2_wave_vs_fisgon.json     # Comparative results: WAVE vs Fisgón
│   ├── table3_manual_expert_report.json # Ground truth findings by UX expert
│   └── table4_precision_recall_metrics.json # Precision, Recall, and F1-Scores
│
└── examples/
    └── sample-form/                   # Local reproducible benchmark form
        ├── index.html
        └── style.css
```

---

## ⚡ Quickstart & Installation

### 1. Prerequisites
* **Node.js** $\ge 18.0.0$ ([Download Node.js](https://nodejs.org/))
* **Google Gemini API Key** (Free tier available at [Google AI Studio](https://aistudio.google.com/)) *(Optional for offline demo; required for dynamic AI derivation)*.

### 2. Clone and Install
```bash
git clone https://github.com/<your-username>/fisgon-replication-package.git
cd fisgon-replication-package
npm install
```

### 3. Configure API Key
Create a `.env` file from the provided template:
```bash
cp .env.example .env
```
Open `.env` and set your key:
```env
GEMINI_API_KEY=AIzaSy...
```

---

## 🧪 Reproducing Experiments

### A. Run Instant Offline Demo (Zero-setup test in 30 seconds)
Runs Fisgón Engine against the bundled local test form (`examples/sample-form/index.html`), which reproduces key dynamic accessibility barriers (*Winding Tab Sequence, Skipped Focus, Modal Window Display, Short List Select, and Content Removed Without Notice*):

```bash
npm run demo
```

To run in headless mode:
```bash
npm test
```

### B. Audit Any Live Web Application
Audit an arbitrary target URL by specifying the `--url` parameter:

```bash
npm run audit -- --url="https://example.com/registration" --steps=30
```

#### CLI Options:
* `--url=<URL|path>`: Target URL or local HTML file path.
* `--steps=<number>`: Maximum number of keyboard navigation steps (default: `25`).
* `--headless=<true|false>`: Whether to run Chromium in headless mode (default: `false`).

All audit runs automatically save a full JSON report to the `reports/` folder.

---

## 📊 Evaluation Data (Paper Results)

The raw and aggregated datasets that support the experimental results in **Section 5** of the paper are located in the `data/` directory:

| Dataset File | Corresponding Paper Table | Description |
| :--- | :--- | :--- |
| [`data/table1_aevents_detected.json`](data/table1_aevents_detected.json) | **Table 1** | 97 AEvents detected by Fisgón across SIUT, SIUG, DWEB, CAND, and MIDT. |
| [`data/table2_wave_vs_fisgon.json`](data/table2_wave_vs_fisgon.json) | **Table 2** | Comparison between WAVE and Fisgón detections. |
| [`data/table3_manual_expert_report.json`](data/table3_manual_expert_report.json) | **Table 3** | Ground truth manual inspection by a UX & Accessibility specialist. |
| [`data/table4_precision_recall_metrics.json`](data/table4_precision_recall_metrics.json) | **Table 4** | Precision (91.67%), Recall (95.65%), and F1-Score (93.62%). |

---

## ⚙️ Simulation Parameters (Algorithm 1)

As established in Section 4.1 of the paper:
* **Key Delay (`0.01 s` / 10 ms)**: Minimum interval preventing the browser from skipping DOM input and mutation handlers during simulated keystrokes.
* **Navigation Delay (`0.5 s` / 500 ms)**: Minimum settling time allowing asynchronous DOM updates, re-renders, and accessibility-tree nodes to stabilize before deriving the next user action.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
