# LandIt - AI-Powered Placement Matching Platform

**GROUP 17**: AMIR SARWAR-SKUSE, HAMIT GUNDUZ, JISHNU SINGHA, KIRAN MANOJ, MEGAN ULLAHS, MELISSA PROKHOROVA, MOHAMMAD OMER, TAHMID AHMED, TONI AIYEOLA

## 🎯 Project Overview

LandIt is an innovative AI-powered platform that revolutionizes how University of Bath Computer Science students discover and apply for placement opportunities. By analyzing uploaded CVs and using intelligent matching algorithms, LandIt provides personalized placement recommendations, competitiveness assessments, and skill gap analysis.

## 🚀 Key Features

- **CV-Driven Matching**: Upload your CV and get personalized placement recommendations ranked by fit score
- **Intelligent Gap Analysis**: Identify missing skills and get specific development recommendations
- **Competitiveness Assessment**: Transparent scoring showing alignment with role requirements
- **Integrated Discovery**: Unified platform replacing fragmented job board searching

## 🛠️ Technical Stack

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** for components
- **Vite** for build tooling

### Backend
- **Node.js** with Express
- **PostgreSQL** database
- **Prisma** ORM
- **OpenAI API** for CV analysis
- **JWT** authentication

### Infrastructure
- **Vercel** (frontend deployment)
- **Railway** (backend deployment)
- **GitHub Actions** (CI/CD)

## 📁 Project Structure

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

## 🎯 Success Metrics

- **Match Relevance**: >80% of users rate top 5 recommendations as "relevant"
- **Application Success**: Measurable increase in placement offer rates
- **Platform Engagement**: ≥60% user return rate, >10min average session
- **Decision Quality**: ≥3.0/5.0 rating for "informed placement decisions"

## 🔒 Security & Compliance

- **GDPR Compliant**: Full data protection and user rights
- **Secure Authentication**: JWT with bcrypt password hashing
- **Data Encryption**: AES-256 at rest, HTTPS/TLS 1.3 in transit
- **Bias Prevention**: Algorithmic fairness and transparency

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- OpenAI API key

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

# Set up database
npm run db:setup

# Start development servers
npm run dev
```

## 📋 Development Process

- **Methodology**: Agile Scrum with 2-week sprints
- **Testing**: Unit (Jest), Integration, UAT with 70%+ coverage
- **Code Quality**: ESLint, Prettier, mandatory PR reviews
- **Documentation**: Comprehensive inline and external docs

## 🤝 Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for development guidelines and team processes.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

- **Project Manager**: Megan Ullahs
- **University**: University of Bath
- **Course**: Computer Science Placement Project
- **Academic Year**: 2024/25
