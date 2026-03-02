# Alembic Migration Guide - Quick Reference

## What is Alembic?

Alembic is a database migration tool for SQLAlchemy. It provides versioned schema changes, rollback capability, and team collaboration for database modifications.

---

## Common Commands

### 1. Generate New Migration

```bash
cd backend
alembic revision -m "descriptive_message"
```

This creates a new migration file in `alembic/versions/` with empty `upgrade()` and `downgrade()` functions.

**Auto-generate from model changes:**
```bash
alembic revision --autogenerate -m "add_new_column"
```
Alembic compares your models to the database and generates migration code automatically.

---

### 2. Apply Migrations

**Upgrade to latest:**
```bash
alembic upgrade head
```

**Upgrade to specific revision:**
```bash
alembic upgrade ae1027a6acf
```

**Upgrade one version:**
```bash
alembic upgrade +1
```

---

### 3. Rollback Migration

**Downgrade one version:**
```bash
alembic downgrade -1
```

**Downgrade to specific revision:**
```bash
alembic downgrade ae1027a6acf
```

**Downgrade to base (empty database):**
```bash
alembic downgrade base
```

---

### 4. View Migration Status

**Show current version:**
```bash
alembic current
```

**Show migration history:**
```bash
alembic history --verbose
```

**Show pending migrations:**
```bash
alembic current
alembic heads  # Compare to see if upgrades needed
```

---

## Example Migration Patterns

### Add Column
```python
def upgrade() -> None:
    op.add_column('users', sa.Column('new_field', sa.String(100), nullable=True))

def downgrade() -> None:
    op.drop_column('users', 'new_field')
```

### Add Index
```python
def upgrade() -> None:
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

def downgrade() -> None:
    op.drop_index('ix_users_email', table_name='users')
```

### Modify Column
```python
def upgrade() -> None:
    op.alter_column('users', 'email',
                    existing_type=sa.String(100),
                    type_=sa.String(255),
                    existing_nullable=False)

def downgrade() -> None:
    op.alter_column('users', 'email',
                    existing_type=sa.String(255),
                    type_=sa.String(100),
                    existing_nullable=False)
```

### Add Foreign Key
```python
def upgrade() -> None:
    op.create_foreign_key('fk_sessions_user_id', 'sessions', 'users',
                          ['user_id'], ['id'], ondelete='CASCADE')

def downgrade() -> None:
    op.drop_constraint('fk_sessions_user_id', 'sessions', type_='foreignkey')
```

### Data Migration
```python
from alembic import op
from sqlalchemy import text

def upgrade() -> None:
    # Update existing data
    op.execute(text("""
        UPDATE users 
        SET status = 'active' 
        WHERE status IS NULL
    """))

def downgrade() -> None:
    pass  # Cannot reliably undo data changes
```

---

## Best Practices

### 1. Always Review Auto-Generated Migrations
```bash
alembic revision --autogenerate -m "changes"
# THEN: Open the generated file and review before applying!
```

### 2. Test Migrations Before Production
```bash
# On staging/dev database
alembic upgrade head
alembic downgrade -1  # Test rollback
alembic upgrade head  # Re-apply
```

### 3. Backup Before Migration
```bash
# PostgreSQL
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Then apply migration
alembic upgrade head
```

### 4. Keep Migrations Small
- One logical change per migration
- Easier to debug and rollback
- Better collaboration with team

### 5. Write Downgrade Functions
Always implement `downgrade()` even if you don't plan to use it. Future you will thank you!

---

## Troubleshooting

### Migration Fails Midway
```bash
# Check current state
alembic current

# Mark manually if needed (dangerous!)
alembic stamp <revision>
```

### Database Out of Sync
```bash
# Generate migration from current models
alembic revision --autogenerate -m "sync_database"

# Review generated file carefully
# Apply if correct
alembic upgrade head
```

### Multiple Heads (Merge Required)
```bash
# Create merge migration
alembic merge <rev1> <rev2> -m "merge_branches"

# Apply merge
alembic upgrade head
```

### Reset Everything (Development Only!)
```bash
# Drop all tables
alembic downgrade base

# Re-apply all migrations
alembic upgrade head
```

---

## Quick Migration Workflow

1. **Modify Model:**
   ```python
   # In models.py
   class User(Base):
       new_field = Column(String(100))  # Add this
   ```

2. **Generate Migration:**
   ```bash
   alembic revision --autogenerate -m "add_user_new_field"
   ```

3. **Review Migration:**
   ```bash
   # Open alembic/versions/xxx_add_user_new_field.py
   # Check upgrade() and downgrade() are correct
   ```

4. **Test Locally:**
   ```bash
   alembic upgrade head
   # Test application
   alembic downgrade -1  # Test rollback
   alembic upgrade head  # Re-apply
   ```

5. **Commit to Git:**
   ```bash
   git add alembic/versions/xxx_add_user_new_field.py
   git commit -m "Add new_field to User model"
   ```

6. **Deploy to Production:**
   ```bash
   # SSH to production server
   cd backend
   alembic upgrade head
   ```

---

## Configuration Files

### alembic.ini
Main configuration file. Key settings:
- `script_location = alembic` - Where migrations are stored
- Database URL loaded from environment in `env.py`

### alembic/env.py
Environment configuration. Handles:
- Loading DATABASE_URL from `.env`
- Importing your models
- Online/offline migration modes

### alembic/versions/
Directory containing all migration files. Never edit these after applying to production!

---

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Database Migrations
  run: |
    cd backend
    alembic upgrade head
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Pre-Deployment Check
```bash
# In deployment script
echo "Checking pending migrations..."
CURRENT=$(alembic current | grep -oP '(?<=\()[a-f0-9]+(?=\))')
HEAD=$(alembic heads | grep -oP '(?<=\()[a-f0-9]+(?=\))')

if [ "$CURRENT" != "$HEAD" ]; then
    echo "⚠️  Pending migrations detected!"
    alembic upgrade head
fi
```

---

## Emergency Rollback Plan

If a migration causes production issues:

1. **Immediate Rollback:**
   ```bash
   alembic downgrade -1
   ```

2. **Verify Application:**
   ```bash
   # Check application logs
   # Test critical functionality
   ```

3. **Report Issue:**
   - Document what went wrong
   - Create hotfix migration if needed
   - Update migration before next deployment

4. **Long-term Fix:**
   ```bash
   # Fix the problematic migration
   alembic revision -m "fix_previous_migration"
   # Implement correct changes
   alembic upgrade head
   ```

---

## Resources

- **Official Docs:** https://alembic.sqlalchemy.org/
- **Tutorial:** https://alembic.sqlalchemy.org/en/latest/tutorial.html
- **Cookbook:** https://alembic.sqlalchemy.org/en/latest/cookbook.html
- **Auto-generate:** https://alembic.sqlalchemy.org/en/latest/autogenerate.html

---

**Remember:** Migrations are code. Treat them with the same care as your application code - review, test, and version control!
