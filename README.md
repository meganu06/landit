# LandIt - AI-Powered Placement Matching Platform

**GROUP 17**: AMIR SARWAR-SKUSE, HAMIT GUNDUZ, JISHNU SINGHA, KIRAN MANOJ, MEGAN ULLAHS, MELISSA PROKHOROVA, MOHAMMAD OMER, TAHMID AHMED, TONI AIYEOLA

## Project Overview

LandIt is an AI-powered platform that helps University of Bath Computer Science students discover and apply for placement opportunities. By analysing uploaded CVs and using intelligent matching algorithms, LandIt provides personalised placement recommendations, competitiveness assessments, and skill gap analysis.

## Key Features

- **CV-Driven Matching**: Upload your CV and get personalised placement recommendations ranked by fit score
- **Intelligent Gap Analysis**: Identify missing skills and get specific development recommendations
- **Competitiveness Assessment**: Transparent scoring showing alignment with role requirements
- **Integrated Discovery**: Unified platform replacing fragmented job board searching

## Technical Stack

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** for components
- **Vite** for build tooling

### Backend
- **Node.js** with Express
- **Supabase** (PostgreSQL database + auth + storage)
- **OpenAI API** for CV skill extraction and gap analysis

### Infrastructure
- **Vercel** (frontend deployment)
- **Railway** (backend deployment)
- **GitHub Actions** (CI/CD)

## Project Structure

```
landit/
├── docs/                    # Project documentation
├── frontend/               # React application
├── backend/                # Node.js API server
├── database/               # Database schemas and migrations
├── shared/                 # Shared types and utilities
├── tests/                  # Test suites
├── deployment/             # Deployment configurations
└── project-management/     # Agile artifacts
```

## Getting Started

### Prerequisites
- Node.js 18+
- OpenAI API key
- Supabase project (URL + anon key)

### Installation

```bash
# Clone the repository
git clone git@github.com-bath:meganu06/landit.git
cd landit

# Install dependencies
npm run install:all

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development servers
npm run dev:frontend   # frontend
npm run dev:backend    # backend
```

## Development Process

- **Methodology**: Agile Scrum with 2-week sprints
- **Testing**: Unit (Jest), Integration, UAT with 70%+ coverage
- **Code Quality**: ESLint, Prettier, mandatory PR reviews
- **Documentation**: Comprehensive inline and external docs

## Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for development guidelines and team processes.

