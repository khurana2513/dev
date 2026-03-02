# Abacus Paper Generator

A simple, functional, and reliable web application for generating math exam papers for abacus training.

## Features

- Generate customizable math questions (Addition, Subtraction, Multiplication, Division, Mixed)
- Support for multiple difficulty levels (AB-1 through AB-6) and custom configurations
- Preview questions before generating PDF
- Professional PDF generation with answer keys
- Save and manage paper configurations

## Tech Stack

- **Backend**: Python 3.10+ with FastAPI
- **Database**: PostgreSQL
- **PDF Generation**: ReportLab
- **Frontend**: React (to be migrated)

## Setup

### Prerequisites

- Python 3.10 or higher
- PostgreSQL database
- Node.js 18+ (for frontend)
- pip (Python package manager)

### Installation

#### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and set your DATABASE_URL
# Example: DATABASE_URL=postgresql://username:password@localhost:5432/abacus_replitt
```

3. Initialize the database:
```bash
python -c "from backend.models import init_db; init_db()"
```

4. Run the backend server:
```bash
python run.py
# Or: uvicorn backend.main:app --reload --host localhost --port 5000
```

The API will be available at `http://localhost:5000`
API documentation: `http://localhost:5000/docs`

#### Frontend Setup

1. Install Node dependencies:
```bash
cd frontend
npm install
```

2. Run the frontend dev server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port Vite assigns)

## Project Structure

```
abacus_replitt/
├── backend/
│   ├── __init__.py
│   ├── main.py           # FastAPI application
│   ├── models.py         # Database models
│   ├── schemas.py        # Pydantic schemas
│   ├── math_generator.py # Question generation logic
│   ├── pdf_generator.py  # PDF generation
│   └── presets.py        # Preset configurations
├── frontend/             # React frontend (to be added)
├── requirements.txt      # Python dependencies
└── README.md
```

## API Endpoints

- `GET /papers` - List all papers
- `GET /papers/{id}` - Get a paper
- `POST /papers` - Create a paper
- `POST /papers/preview` - Preview questions
- `POST /papers/generate-pdf` - Generate PDF
- `POST /papers/{id}/download` - Download PDF for saved paper

