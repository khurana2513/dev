#!/bin/bash
# Database Integrity Fixes - Quick Migration Script
# Run this to apply all database integrity fixes

set -e  # Exit on error

echo "========================================================================"
echo "DATABASE INTEGRITY FIXES - MIGRATION SCRIPT"
echo "========================================================================"
echo ""

# Check if we're in the backend directory
if [ ! -f "alembic.ini" ]; then
    echo "❌ Error: alembic.ini not found. Please run from backend/ directory."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create it from .env.example."
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set in .env file."
    exit 1
fi

echo "✅ Environment configured"
echo "   Database: ${DATABASE_URL%%@*}@***"
echo ""

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo "❌ Error: Python not found. Please install Python 3.10+."
    exit 1
fi

echo "✅ Python found: $(python --version)"
echo ""

# Check if dependencies are installed
echo "📦 Checking dependencies..."
if ! python -c "import alembic" 2>/dev/null; then
    echo "⚠️  Alembic not found. Installing dependencies..."
    pip install -r requirements.txt
else
    echo "✅ Dependencies installed"
fi
echo ""

# Backup database (optional but recommended)
read -p "🔒 Create database backup before migration? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "📦 Creating backup: $BACKUP_FILE"
    
    # Try pg_dump, but handle version mismatch gracefully
    if pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>&1; then
        echo "✅ Backup created: $BACKUP_FILE"
        echo ""
    else
        echo "⚠️  pg_dump failed (likely version mismatch)"
        echo ""
        echo "Alternative backup options:"
        echo "1. Skip backup and continue (if development environment)"
        echo "2. Use Railway/cloud provider's backup feature"
        echo "3. Upgrade local PostgreSQL: brew upgrade postgresql"
        echo "4. Use Docker pg_dump: docker run --rm postgres:17 pg_dump ..."
        echo ""
        read -p "Continue without local backup? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Migration cancelled. Please create backup manually."
            echo ""
            echo "Manual backup via Railway dashboard:"
            echo "1. Go to Railway project"
            echo "2. Click on PostgreSQL service"
            echo "3. Go to 'Backups' tab"
            echo "4. Create backup snapshot"
            echo ""
            exit 1
        fi
        echo "⚠️  Proceeding without local backup..."
        echo ""
    fi
fi

# Show current migration status
echo "📊 Current migration status:"
alembic current
echo ""

# Show pending migrations
echo "📋 Pending migrations:"
alembic history --verbose | head -20
echo ""

# Confirm migration
read -p "🚀 Apply database integrity fixes migration? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled."
    exit 1
fi

# Apply migration
echo "🔧 Applying migration..."
alembic upgrade head

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    
    # Show new status
    echo "📊 New migration status:"
    alembic current
    echo ""
    
    # Run tests
    read -p "🧪 Run test suite to verify fixes? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🧪 Running test suite..."
        python test_database_integrity.py
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "========================================================================"
            echo "✅ MIGRATION COMPLETE - ALL TESTS PASSED"
            echo "========================================================================"
            echo ""
            echo "Next steps:"
            echo "1. Restart your application"
            echo "2. Monitor database connections"
            echo "3. Verify query performance improvements"
            echo "4. Check application logs for errors"
            echo ""
            echo "Documentation:"
            echo "- Implementation: DATABASE_INTEGRITY_FIXES.md"
            echo "- Alembic Guide: ALEMBIC_GUIDE.md"
            echo "- Deployment: DEPLOYMENT_CHECKLIST_DATABASE.md"
            echo ""
        else
            echo ""
            echo "⚠️  Some tests failed. Please review the output above."
            echo "Migration was applied, but verification failed."
            echo ""
        fi
    fi
else
    echo ""
    echo "❌ Migration failed!"
    echo ""
    echo "Rollback options:"
    echo "1. Rollback migration: alembic downgrade -1"
    echo "2. Restore backup: psql \$DATABASE_URL < $BACKUP_FILE"
    echo ""
    exit 1
fi
