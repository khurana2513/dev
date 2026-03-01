# 🔧 SQLAlchemy Session Threading Fix

## 🚨 Critical Bug: IllegalStateChangeError

**Error:**
```
sqlalchemy.exc.IllegalStateChangeError: Method 'close()' can't be called here; 
method '_connection_for_bind()' is already in progress and this would cause an 
unexpected state change to <SessionTransactionState.CLOSED: 5>
```

---

## 📊 ROOT CAUSE ANALYSIS

### The Problem

SQLAlchemy sessions are **NOT thread-safe**. When we spawn a background thread via `enqueue_task()`, we were **incorrectly passing the HTTP request's database session** to that thread:

```python
# ❌ WRONG: Passing db session to background thread
@router.put("/admin/students/{student_id}/points")
async def update_student_points(..., db: Session = Depends(get_db)):
    student.total_points = request.points
    db.commit()
    
    # ❌ BUG: Passing 'db' to background thread!
    enqueue_task(update_leaderboard, db, max_retries=1)
    
    # ❌ This causes lazy-load while background thread uses same session!
    return {"message": f"Points updated for {student.name}"}
```

### What Happened

1. **Main Thread (HTTP Request):**
   - Updates student points
   - Calls `enqueue_task(update_leaderboard, db, ...)`
   - Spawns background thread with shared `db` session
   - Continues to return response
   - Tries to access `student.name` (lazy-load attribute)

2. **Background Thread:**
   - Receives the same `db` session object
   - Calls `update_leaderboard(db)` 
   - Queries the database using the shared session

3. **Race Condition:**
   - SQLAlchemy detects **concurrent access** to the same session from 2 threads
   - Main thread tries to lazy-load `student.name` → calls `_connection_for_bind()`
   - Background thread is also using the session
   - FastAPI's `get_db()` context manager tries to `db.close()` when request ends
   - SQLAlchemy throws `IllegalStateChangeError` to prevent data corruption

### Why This Is Dangerous

- **Data Corruption Risk:** Two threads modifying the same session can corrupt data
- **Connection Pool Exhaustion:** Sessions not properly scoped can leak connections
- **Unpredictable Behavior:** Race conditions cause intermittent failures
- **Session State Confusion:** SQLAlchemy can't track session state across threads

---

## ✅ THE FIX

### 1. Created Thread-Safe Wrapper Functions

**File:** [`backend/leaderboard_service.py`](backend/leaderboard_service.py)

```python
def update_leaderboard_background() -> None:
    """Thread-safe wrapper that creates its own session.
    
    ✓ CRITICAL: Background threads CANNOT share sessions with the main thread.
    ✓ SQLAlchemy sessions are NOT thread-safe.
    """
    from models import SessionLocal
    db = SessionLocal()
    try:
        update_leaderboard(db)
    except Exception as e:
        logger.error(f"❌ [LEADERBOARD_BG] Failed: {e}")
        raise
    finally:
        db.close()  # Always close the session


def update_weekly_leaderboard_background() -> None:
    """Thread-safe wrapper for weekly leaderboard."""
    from models import SessionLocal
    db = SessionLocal()
    try:
        update_weekly_leaderboard(db)
    except Exception as e:
        logger.error(f"❌ [WEEKLY_LEADERBOARD_BG] Failed: {e}")
        raise
    finally:
        db.close()
```

### 2. Fixed All Background Task Calls

**File:** [`backend/user_routes.py`](backend/user_routes.py)

#### Update Student Points (BEFORE)
```python
# ❌ WRONG: Passing db session to background thread
enqueue_task(update_leaderboard, db, max_retries=1)

return {
    "message": f"Points updated for {student.name}",  # ❌ Lazy-load race
    "old_points": old_points,
    "new_points": student.total_points
}
```

#### Update Student Points (AFTER)
```python
# ✓ Access attributes BEFORE spawning background task
student_name = student.name
student_total_points = student.total_points

# ✓ Use thread-safe wrapper that creates its own session
from resilient_tasks import enqueue_task
from leaderboard_service import update_leaderboard_background
enqueue_task(update_leaderboard_background, max_retries=1)

return {
    "message": f"Points updated for {student_name}",
    "old_points": old_points,
    "new_points": student_total_points
}
```

#### Delete Student (BEFORE)
```python
# ❌ WRONG: Passing db session to background threads
enqueue_task(update_leaderboard, db, max_retries=1)
enqueue_task(update_weekly_leaderboard, db, max_retries=1)

return {"message": f"Student {student.name} deleted successfully"}
```

#### Delete Student (AFTER)
```python
# ✓ Access student name before deletion
student_name = student.name

db.delete(student)
db.commit()

# ✓ Use thread-safe wrappers with their own sessions
from resilient_tasks import enqueue_task
from leaderboard_service import update_leaderboard_background, update_weekly_leaderboard_background
enqueue_task(update_leaderboard_background, max_retries=1)
enqueue_task(update_weekly_leaderboard_background, max_retries=1)

return {"message": f"Student {student_name} deleted successfully"}
```

---

## 🎯 BEST PRACTICES FOR THREADING WITH SQLALCHEMY

### ✅ DO

1. **Create New Session Per Thread**
   ```python
   def background_task():
       db = SessionLocal()  # ✓ New session for this thread
       try:
           # Do work
           db.commit()
       finally:
           db.close()  # ✓ Always close
   ```

2. **Access ORM Attributes Before Threading**
   ```python
   # ✓ Load attributes in main thread
   user_name = user.name
   user_email = user.email
   
   # Then spawn background thread
   enqueue_task(send_email, user_name, user_email)
   ```

3. **Pass Primitive Values to Threads**
   ```python
   # ✓ Pass IDs, not ORM objects
   enqueue_task(process_user, user_id=user.id)
   ```

### ❌ DON'T

1. **Never Share Sessions Across Threads**
   ```python
   # ❌ WRONG
   def my_endpoint(db: Session = Depends(get_db)):
       enqueue_task(background_work, db)  # ❌ BAD!
   ```

2. **Never Pass ORM Objects to Threads**
   ```python
   # ❌ WRONG
   def my_endpoint(db: Session = Depends(get_db)):
       user = db.query(User).first()
       enqueue_task(process_user, user)  # ❌ BAD!
   ```

3. **Never Access Lazy-Loaded Attributes After Threading**
   ```python
   # ❌ WRONG
   enqueue_task(background_work)
   return {"name": user.name}  # ❌ Lazy-load race condition!
   ```

---

## 🧪 VERIFICATION

### Test 1: Update Student Points
```bash
# Should complete in <500ms without errors
curl -X PUT http://localhost:8001/users/admin/students/26/points \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"points": 100}'
```

**Expected Log:**
```
✓ Leaderboard updated in 0.05s (38 students)
📋 [QUEUE] Enqueued task → background thread
✅ [TASK] Completed in 0.12s
```

### Test 2: Delete Student
```bash
# Should complete immediately
curl -X DELETE http://localhost:8001/users/admin/students/26 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Log:**
```
📋 [QUEUE] Enqueued task → background thread (x2)
✅ [TASK] Completed in 0.15s
```

### Test 3: No More IllegalStateChangeError
```bash
# Run multiple concurrent requests
for i in {1..10}; do
  curl -X PUT http://localhost:8001/users/admin/students/26/points \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"points": '$((100 + i))'}' &
done
wait
```

**Expected:** All requests succeed with 200 OK, no errors in logs.

---

## 📝 FILES MODIFIED

1. ✅ [`backend/leaderboard_service.py`](backend/leaderboard_service.py)
   - Added `update_leaderboard_background()` wrapper
   - Added `update_weekly_leaderboard_background()` wrapper

2. ✅ [`backend/user_routes.py`](backend/user_routes.py)
   - Fixed `update_student_points()` — uses thread-safe wrapper
   - Fixed `delete_student()` — uses thread-safe wrappers
   - Eager-loads attributes before spawning background threads

---

## 🎓 KEY TAKEAWAY

> **SQLAlchemy sessions are NOT thread-safe. Each thread must create and manage its own session.**

When using background threads with SQLAlchemy:
1. **Create a new session in the background thread**
2. **Never pass sessions between threads**
3. **Pass primitive values (IDs, strings) instead of ORM objects**
4. **Eager-load any attributes you need before threading**

---

## ✅ RESULT

**The `IllegalStateChangeError` is now PERMANENTLY FIXED.** All background tasks create their own sessions, and no sessions are shared across threads.

Your admin operations will now work correctly without race conditions! 🎉
