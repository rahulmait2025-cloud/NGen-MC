# NextGen-CTO Landing Page

Welcome to the NextGen-CTO Landing Page repository. This is a modern, high-performance web application built to showcase the NextGen-CTO platform, its features, and its value proposition for colleges, students, and corporate professionals.

The project uses a premium dark glassmorphic theme and features interactive components, dynamic charts, and smooth scroll animations to create an engaging user experience.

---

## ✨ Key Features
- **Premium UI & Animations**: Built with Tailwind CSS v4 and Framer Motion for smooth, hardware-accelerated scroll animations, entrance effects, and an overall polished feel.
- **Interactive Dashboards**: "Transparency Dashboard" with interactive Recharts visualizations (Line & Bar charts).
- **Dynamic Leaderboard**: Beautifully styled Shadcn/UI tables displaying top-performing students and metrics.
- **ROI Calculator**: An interactive tool for colleges to calculate their potential return on investment.
- **Responsive Design**: Fully responsive across mobile, tablet, and desktop viewports, heavily utilizing native `text-wrap` optimizations and a global responsive hook.
- **Dark Glassmorphism Theme**: A sleek, modern aesthetic using CSS backdrop filters, gradients, and a curated color palette (Plus Jakarta Sans & Space Grotesk).
- **Accessibility & Reduced Motion**: Full support for users who prefer reduced motion, ensuring animations degrade gracefully.

---

## 🛠️ Technology Stack
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router ready)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

---

## 📁 Project Structure

This project follows a modular, feature-based organization strategy designed for readability and maintainability.

```text
Homepage/
├── .agent/ & .agents/     # Intelligent AI agent & skill configurations
├── app/                   # Next.js 15 App Router directory (Routes & Layouts)
│   ├── api/               # Server-side API Routes (e.g. leads, youtube-stats)
│   ├── corporate/         # Corporate professionals landing page route
│   ├── (student & campus routes)
│   ├── globals.css        # Global CSS, theme variables, and Tailwind imports
│   └── layout.tsx         # Root application layout
├── components/            # Reusable UI components
│   ├── corporate/         # Components specific to the /corporate route (Hero, Features, etc.)
│   ├── landing/           # Components for the main/student/campus landing pages
│   │   ├── layout/        # Shared landing layouts (Navbar, Footer)
│   │   └── sections/      # Independent landing sections (TrustMarquee, FAQ, CTA)
│   ├── motion/            # Reusable Framer Motion animation wrappers (Reveal, etc.)
│   └── ui/                # Base Shadcn UI primitives (Button, Card, Input, etc.)
├── hooks/                 # Custom React hooks (e.g., use-mobile for responsiveness)
├── lib/                   # Utility functions (e.g., cn for Tailwind class merging)
├── public/                # Static assets (images, fonts, icons)
├── .env.example           # Example environment variables reference
├── eslint.config.mjs      # ESLint configuration
├── next.config.ts         # Next.js bundler and build configuration
├── tailwind.config.ts     # Tailwind CSS theme extension
└── tsconfig.json          # TypeScript compiler configuration
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (v20+ recommended) and npm installed.

### Installation

1. Clone the repository (if not already cloned):
```bash
git clone <repository-url>
cd Homepage
```

2. Copy the example environment variables:
```bash
cp .env.example .env.local
```
*(Update `.env.local` with your necessary API keys if applicable)*

3. Install dependencies:
```bash
npm install
# or for a clean install
npm ci
```

### Running the Development Server

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🏗️ Building for Production

To create an optimized production build:

```bash
npm run build
```

To start the production server:

```bash
npm run start
```

---

## 🧹 Code Quality

The project enforces strict code quality and formatting rules via AI agent configurations and traditional tools.

To run the linter:
```bash
npm run lint
```

Additionally, Python validation scripts are available under `.agent/scripts` (e.g., `checklist.py`, `lint_runner.py`) to enforce project-specific requirements.

---

## 🤝 Contributing

When contributing to this project, please consider the following guidelines:
1. **Agent Protocol**: Please read and adhere to `GEMINI.md` and the appropriate agent constraints (`.agents/`).
2. **Code Quality**: Ensure your code passes all lint checks (`npm run lint` and the checklist scripts).
3. **Styling**: Maintain the existing premium design language (dark mode, glassmorphism, specified typography). Do not introduce basic standard templates.
4. **Accessibility**: Ensure any new interactive elements support fallback static variants for users with reduced motion preferences.
5. **Pre-commit**: Verify the build step (`npm run build`) before submitting any pull requests.

---

## 📄 License
*Private repository.* All rights reserved by NextGen-CTO.
