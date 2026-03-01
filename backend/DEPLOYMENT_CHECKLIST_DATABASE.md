# Database Integrity Fixes - Deployment Checklist

## Pre-Deployment Steps

### 1. Backup Production Database
```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file created
ls -lh backup_*.sql
```

### 2. Test Locally First
```bash
cd backend

# Run test suite
python test_database_integrity.py

# Expected output:
# ✅ ALL TESTS PASSED
# 🚀 Database integrity fixes are production-ready!
```

### 3. Review Migration File
```bash
# Review the migration
cat alembic/versions/08327a1a226a_database_integrity_fixes.py

# Verify upgrade() and downgrade() functions are correct
```

---

## Deployment Steps

### Step 1: Update Dependencies
```bash
pip install -r requirements.txt

# Verify alembic installed
pip show alembic
```

### Step 2: Apply Database Migration
```bash
cd backend

# Check current migration status
alembic current

# Preview what will be upgraded
alembic upgrade --sql head > migration_preview.sql
cat migration_preview.sql

# Apply migration
alembic upgrade head

# Verify migration applied
alembic current
```

### Step 3: Verify Database Changes

#### Check Indexes
```sql
-- Connect to database
psql $DATABASE_URL

-- Check new indexes exist
\di ix_rewards_month_earned
\di ix_practice_sessions_operation_type
\di ix_paper_attempts_paper_level
```

#### Check Foreign Keys
```sql
-- View foreign key constraints
\d+ practice_sessions
\d+ paper_attempts
\d+ rewards

-- Look for 'ON DELETE CASCADE' or 'ON DELETE SET NULL'
```

#### Check DateTime Columns
```sql
-- Verify timezone-aware columns
\d+ practice_sessions
\d+ paper_attempts

-- Look for 'timestamp with time zone'
```

### Step 4: Test Application
```bash
# Start backend server
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000

# In another terminal, test endpoints
curl http://localhost:8000/api/health
curl http://localhost:8000/api/auth/google
```

### Step 5: Monitor Database Connections
```sql
-- Monitor active connections
SELECT 
    count(*), 
    state,
    usename
FROM pg_stat_activity 
WHERE datname = current_database()
GROUP BY state, usename;

-- Should see connections from pool (up to 20 idle + active)
```

---

## Rollback Plan (If Issues Occur)

### Immediate Rollback
```bash
cd backend

# Rollback one migration
alembic downgrade -1

# Verify rollback
alembic current
```

### Restore from Backup (Last Resort)
```bash
# Stop application first
pkill -f "uvicorn main:app"

# Restore database
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# Restart application
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Post-Deployment Validation

### 1. Run Test Suite in Production
```bash
# SSH to production server
cd backend

# Run tests against production database
python test_database_integrity.py
```

### 2. Monitor Performance

#### Query Performance
```sql
-- Check query execution times
SELECT 
    query,
    mean_exec_time,
    calls
FROM pg_stat_statements
WHERE query LIKE '%rewards%' OR query LIKE '%practice_sessions%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Queries should be faster with new indexes
```

#### Connection Pool Usage
```bash
# Monitor application logs for:
# - "Connection pool exhausted" warnings
# - Slow query warnings
# - Database timeout errors

tail -f application.log | grep -i "pool\|timeout\|slow"
```

### 3. Test Atomic Updates Under Load

Use a load testing tool (like `locust` or `ab`):
```bash
# Install Apache Bench
apt-get install apache2-utils

# Test concurrent login (atomic point updates)
ab -n 1000 -c 50 -T 'application/json' -p login_payload.json \
   http://localhost:8000/api/auth/google
```

Monitor points are accurate:
```sql
-- Check points integrity
SELECT 
    user_id,
    total_points,
    (SELECT SUM(points) FROM points_logs WHERE points_logs.user_id = users.id) as calculated_points
FROM users
WHERE total_points != (SELECT COALESCE(SUM(points), 0) FROM points_logs WHERE points_logs.user_id = users.id)
LIMIT 10;

-- Should return 0 rows (all points match logs)
```

---

## Success Criteria

Deployment is successful when:

- ✅ Migration applied: `alembic current` shows latest revision
- ✅ New indexes exist: Verified with `\di` in psql
- ✅ Foreign keys updated: Verified with `\d+ table_name`
- ✅ DateTime columns timezone-aware: Verified with `\d+ table_name`
- ✅ Application starts: No errors in logs
- ✅ API endpoints respond: Health check returns 200
- ✅ Test suite passes: `python test_database_integrity.py` all green
- ✅ Connection pool healthy: Max 50 connections, no exhaustion errors
- ✅ Query performance improved: Indexed queries 20-30x faster
- ✅ Atomic updates working: Concurrent point updates accurate
- ✅ No data loss: User counts, points totals unchanged

---

## Monitoring Dashboard (Recommended)

Set up alerts for:

1. **Database Connections**
   ```sql
   SELECT count(*) FROM pg_stat_activity 
   WHERE datname = current_database();
   ```
   Alert if > 45 (approaching 50 limit)

2. **Slow Queries**
   ```sql
   SELECT query, mean_exec_time 
   FROM pg_stat_statements 
   WHERE mean_exec_time > 1000
   ORDER BY mean_exec_time DESC;
   ```
   Alert if any query > 1 second

3. **Point Integrity**
   ```sql
   SELECT COUNT(*) FROM users 
   WHERE total_points != (
       SELECT COALESCE(SUM(points), 0) 
       FROM points_logs 
       WHERE points_logs.user_id = users.id
   );
   ```
   Alert if > 0 (points mismatch)

4. **Failed Transactions**
   ```sql
   SELECT count(*) FROM pg_stat_database 
   WHERE datname = current_database() 
   AND xact_rollback > 100;
   ```
   Alert if rollbacks spike

---

## Troubleshooting

### Issue: Migration Fails

**Symptom:** `alembic upgrade head` returns error

**Solution:**
```bash
# Check current state
alembic current

# View migration history
alembic history

# Try manual migration SQL
alembic upgrade --sql head > manual_migration.sql
# Review and apply manually if needed
```

### Issue: Connection Pool Exhausted

**Symptom:** "QueuePool limit exceeded" errors

**Solution:**
```python
# Increase pool size in models.py (already set to 20+30)
# Or check for unclosed connections:

# Find unclosed connections
SELECT pid, usename, application_name, state, query
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < NOW() - INTERVAL '5 minutes';

# Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < NOW() - INTERVAL '10 minutes';
```

### Issue: Point Mismatch After Update

**Symptom:** User points don't match points_logs sum

**Solution:**
```python
# Run integrity check script
from models import SessionLocal, User, PointsLog

db = SessionLocal()
mismatches = db.query(User).filter(
    User.total_points != db.query(func.sum(PointsLog.points))
    .filter(PointsLog.user_id == User.id)
    .scalar_subquery()
).all()

# Fix mismatches
for user in mismatches:
    correct_total = db.query(func.sum(PointsLog.points)).filter(
        PointsLog.user_id == user.id
    ).scalar() or 0
    print(f"User {user.id}: {user.total_points} -> {correct_total}")
    user.total_points = correct_total

db.commit()
```

---

## Emergency Contacts

- **Database Admin:** [Your DBA contact]
- **DevOps Team:** [Your DevOps contact]
- **On-Call Engineer:** [Your on-call contact]

---

## Deployment Completion Checklist

Sign off on each item:

- [ ] Pre-deployment database backup completed
- [ ] Test suite passed locally
- [ ] Migration reviewed and approved
- [ ] Dependencies updated (`pip install -r requirements.txt`)
- [ ] Migration applied (`alembic upgrade head`)
- [ ] New indexes verified in database
- [ ] Foreign key constraints verified
- [ ] DateTime columns verified as timezone-aware
- [ ] Application started successfully
- [ ] API health check passes
- [ ] Test suite passed in production
- [ ] Connection pool monitored (healthy)
- [ ] Query performance improved (measured)
- [ ] Atomic updates tested under load
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team notified of deployment

**Deployed By:** _________________  
**Date/Time:** _________________  
**Migration Revision:** `08327a1a226a`  
**Status:** ✅ SUCCESS / ⚠️ ISSUES / ❌ ROLLBACK

---

**Next Steps:**
- Monitor for 24 hours
- Review performance metrics
- Collect feedback from users
- Plan next optimization phase
