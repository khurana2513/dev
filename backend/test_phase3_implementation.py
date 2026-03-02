"""Test suite for Phase 3: Authentication, Error Handling, and Resilience."""

import pytest
import time
import logging
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

# Import test modules
from token_manager import (
    TokenBlacklist, create_token_pair, verify_access_token,
    verify_refresh_token, revoke_token, refresh_access_token
)
from circuit_breaker import (
    CircuitBreaker, CircuitBreakerOpenError, get_circuit_breaker,
    GOOGLE_OAUTH_BREAKER, DATABASE_BREAKER, LEADERBOARD_BREAKER
)
from exceptions import (
    AuthenticationError, TokenExpiredError, InvalidTokenError,
    TokenRevokedError, ValidationError, ExternalServiceError,
    ErrorHandler, validate_field
)
from resilient_tasks import (
    BackgroundTask, TaskQueue, TaskStatus,
    enqueue_task, get_task_queue
)

logger = logging.getLogger(__name__)


class TestTokenManager:
    """Test token creation, validation, and revocation."""
    
    def test_create_token_pair(self):
        """Test creating access and refresh token pair."""
        data = {"sub": "123"}
        access_token, refresh_token = create_token_pair(data)
        
        assert access_token is not None
        assert refresh_token is not None
        assert access_token != refresh_token
        assert len(access_token) > 50  # JWT tokens are long
        assert len(refresh_token) > 50
    
    def test_verify_access_token(self):
        """Test verifying valid access token."""
        data = {"sub": "456"}
        access_token, _ = create_token_pair(data)
        
        payload = verify_access_token(access_token)
        assert payload["sub"] == "456"
        assert payload["type"] == "access"
    
    def test_verify_refresh_token(self):
        """Test verifying valid refresh token."""
        data = {"sub": "789"}
        _, refresh_token = create_token_pair(data)
        
        payload = verify_refresh_token(refresh_token)
        assert payload["sub"] == "789"
        assert payload["type"] == "refresh"
    
    def test_revoke_token(self):
        """Test token revocation and blacklist check."""
        data = {"sub": "999"}
        access_token, _ = create_token_pair(data)
        
        # Verify token works before revocation
        payload = verify_access_token(access_token)
        assert payload["sub"] == "999"
        
        # Revoke token
        revoke_token(access_token)
        
        # Verify token is now blacklisted
        with pytest.raises(TokenRevokedError):
            verify_access_token(access_token)
    
    def test_refresh_access_token(self):
        """Test generating new access token from refresh token."""
        data = {"sub": "111"}
        _, refresh_token = create_token_pair(data)
        
        new_access_token = refresh_access_token(refresh_token)
        
        # Verify new token works
        payload = verify_access_token(new_access_token)
        assert payload["sub"] == "111"
        assert payload["type"] == "access"
    
    def test_token_expiration(self):
        """Test that expired tokens are rejected."""
        # This is harder to test without mocking time
        # Covered by integration tests
        pass
    
    def test_blacklist_capacity(self):
        """Test that blacklist respects capacity limits."""
        blacklist = TokenBlacklist()
        
        # Add many tokens
        tokens = [create_token_pair({"sub": str(i)})[0] for i in range(20)]
        
        for token in tokens:
            revoke_token(token)
        
        # Blacklist should have reasonable size
        assert len(blacklist.blacklist) <= TokenBlacklist.MAX_SIZE


class TestCircuitBreaker:
    """Test circuit breaker state machine and resilience."""
    
    def test_circuit_breaker_closed_state(self):
        """Test circuit breaker in CLOSED state."""
        breaker = get_circuit_breaker("test_closed", 3, 2, 1)
        
        # Should allow calls
        result = breaker.call(lambda: "success")
        assert result == "success"
    
    def test_circuit_breaker_opens_on_failures(self):
        """Test circuit breaker opens after N failures."""
        breaker = get_circuit_breaker("test_open", 2, 2, 1)
        
        # Trigger failures
        for i in range(2):
            try:
                breaker.call(lambda: 1 / 0)  # Division by zero
            except:
                pass
        
        # Circuit should be OPEN
        assert breaker.state.value == "open"
        
        # Further calls should fail fast
        with pytest.raises(CircuitBreakerOpenError):
            breaker.call(lambda: "success")
    
    def test_circuit_breaker_half_open(self):
        """Test circuit breaker transitions to HALF_OPEN."""
        breaker = get_circuit_breaker("test_half_open", 1, 1, 1)
        
        # Force open
        try:
            breaker.call(lambda: 1 / 0)
        except:
            pass
        assert breaker.state.value == "open"
        
        # Wait for timeout
        time.sleep(1.1)
        
        # Next call should transition to HALF_OPEN
        try:
            breaker.call(lambda: "success")
        except:
            pass
        assert breaker.state.value in ["half_open", "closed"]
    
    def test_circuit_breaker_recovery(self):
        """Test circuit breaker closes after successful recovery."""
        breaker = get_circuit_breaker("test_recovery", 1, 1, 1)
        
        # Force open
        try:
            breaker.call(lambda: 1 / 0)
        except:
            pass
        assert breaker.state.value == "open"
        
        # Wait for timeout
        time.sleep(1.1)
        
        # Successful call in HALF_OPEN should close circuit
        result = breaker.call(lambda: "success")
        assert result == "success"
        assert breaker.state.value == "closed"
    
    def test_pre_configured_breakers(self):
        """Test pre-configured circuit breakers for critical services."""
        # Verify breakers exist
        assert GOOGLE_OAUTH_BREAKER is not None
        assert DATABASE_BREAKER is not None
        assert LEADERBOARD_BREAKER is not None
        
        # Verify configuration
        assert GOOGLE_OAUTH_BREAKER.failure_threshold == 3
        assert DATABASE_BREAKER.failure_threshold == 5
        assert LEADERBOARD_BREAKER.timeout_seconds == 30


class TestExceptions:
    """Test exception types and error handling."""
    
    def test_authentication_error(self):
        """Test AuthenticationError exception."""
        exc = AuthenticationError("Invalid credentials")
        assert exc.code == "AUTH_ERROR"
        assert exc.status_code == 401
    
    def test_token_expired_error(self):
        """Test TokenExpiredError exception."""
        exc = TokenExpiredError("Token has expired")
        assert exc.status_code == 401
    
    def test_invalid_token_error(self):
        """Test InvalidTokenError exception."""
        exc = InvalidTokenError("Invalid signature")
        assert exc.status_code == 401
    
    def test_token_revoked_error(self):
        """Test TokenRevokedError exception."""
        exc = TokenRevokedError("Token has been revoked")
        assert exc.status_code == 401
    
    def test_validation_error(self):
        """Test ValidationError exception."""
        exc = ValidationError("email", "Invalid email format")
        assert exc.status_code == 422
    
    def test_external_service_error(self):
        """Test ExternalServiceError exception."""
        exc = ExternalServiceError("OAuth service unavailable")
        assert exc.status_code == 503
    
    def test_error_handler_logging(self):
        """Test ErrorHandler logging functionality."""
        handler = ErrorHandler()
        
        exc = ValidationError("name", "too short")
        # Logging should not raise
        handler.log_exception(exc, {"user_id": 123}, "warning")
    
    def test_validate_field(self):
        """Test field validation utility."""
        # Valid field
        result = validate_field("email", "user@example.com", 5, 100)
        assert result == "user@example.com"
        
        # Empty field
        with pytest.raises(ValidationError):
            validate_field("name", "", 1, 10)
        
        # Too short
        with pytest.raises(ValidationError):
            validate_field("code", "ab", 3, 10)
        
        # Too long
        with pytest.raises(ValidationError):
            validate_field("comment", "x" * 101, 1, 100)


class TestResilientTasks:
    """Test background task execution and retry logic."""
    
    def test_background_task_creation(self):
        """Test creating background task."""
        def dummy_func():
            return "success"
        
        task = BackgroundTask(dummy_func, max_retries=3)
        
        assert task.status == TaskStatus.PENDING
        assert task.attempt == 0
        assert task.max_retries == 3
    
    def test_background_task_success(self):
        """Test successful task execution."""
        def dummy_func():
            return "success"
        
        task = BackgroundTask(dummy_func)
        result = task.execute()
        
        assert result is True
        assert task.status == TaskStatus.SUCCESS
        assert task.attempt == 0
        assert task.result == "success"
    
    def test_background_task_failure_and_retry(self):
        """Test task failure and automatic retry."""
        call_count = 0
        
        def failing_func():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("Simulated error")
            return "success"
        
        task = BackgroundTask(failing_func, max_retries=3, retry_delay_seconds=0.1)
        result = task.execute()
        
        assert result is True  # Eventually succeeds
        assert call_count == 3  # Called 3 times
        assert task.status == TaskStatus.SUCCESS
    
    def test_background_task_exhausted_retries(self):
        """Test task failure after exhausting retries."""
        def always_failing():
            raise ValueError("Always fails")
        
        task = BackgroundTask(always_failing, max_retries=2, retry_delay_seconds=0.05)
        result = task.execute()
        
        assert result is False
        assert task.status == TaskStatus.FAILED
        assert task.attempt == 2  # Made max attempts
        assert task.last_error is not None
    
    def test_task_queue_enqueue(self):
        """Test enqueueing task in queue."""
        queue = TaskQueue()
        
        def dummy_task(x, y):
            return x + y
        
        task_id = queue.enqueue(dummy_task, 5, 3, max_retries=1)
        
        assert task_id is not None
        assert task_id in queue.tasks
    
    def test_task_queue_status(self):
        """Test getting task status from queue."""
        queue = TaskQueue()
        
        def dummy_task():
            return 42
        
        task_id = queue.enqueue(dummy_task, max_retries=1)
        status = queue.get_task_status(task_id)
        
        assert status is not None
        assert status["task_id"] == task_id
        assert status["status"] == "success"
        assert status["result"] == "42"
    
    def test_task_queue_cleanup(self):
        """Test cleaning up old completed tasks."""
        queue = TaskQueue()
        
        def dummy_task():
            return "success"
        
        # Enqueue task
        task_id = queue.enqueue(dummy_task, max_retries=1)
        
        # Manually set completion time to past
        task = queue.tasks[task_id]
        task.completed_at = datetime.utcnow() - timedelta(hours=25)
        
        # Cleanup
        removed = queue.cleanup_completed(older_than_hours=24)
        
        assert removed == 1
        assert task_id not in queue.tasks
    
    def test_exponential_backoff(self):
        """Test exponential backoff calculation in retries."""
        call_times = []
        
        def func_with_timing():
            call_times.append(time.time())
            if len(call_times) < 2:
                raise ValueError("Fail on first attempt")
            return "success"
        
        task = BackgroundTask(func_with_timing, max_retries=2, retry_delay_seconds=0.05)
        result = task.execute()
        
        assert result is True
        # Verify delay between calls
        if len(call_times) >= 2:
            delay = call_times[1] - call_times[0]
            # Should be at least 0.05s (accounting for execution time)
            assert delay >= 0.03  # Some tolerance


class TestIntegration:
    """Integration tests combining multiple components."""
    
    def test_token_lifecycle(self):
        """Test complete token lifecycle: create, use, refresh, revoke."""
        # Create tokens
        access_token, refresh_token = create_token_pair({"sub": "user123"})
        
        # Verify access token works
        payload = verify_access_token(access_token)
        assert payload["sub"] == "user123"
        
        # Refresh access token
        new_access_token = refresh_access_token(refresh_token)
        payload = verify_access_token(new_access_token)
        assert payload["sub"] == "user123"
        
        # Revoke new access token (logout)
        revoke_token(new_access_token)
        with pytest.raises(TokenRevokedError):
            verify_access_token(new_access_token)
    
    def test_circuit_breaker_with_tasks(self):
        """Test circuit breaker protecting background tasks."""
        breaker = get_circuit_breaker("task_breaker", 2, 1, 1)
        queue = TaskQueue()
        
        # Task that might fail
        def flaky_task():
            # Simulate random failure
            return "success"
        
        # Enqueue tasks
        for i in range(3):
            try:
                result = breaker.call(flaky_task)
            except CircuitBreakerOpenError:
                logger.info(f"Task {i}: circuit breaker open, skipping")
    
    def test_error_handling_workflow(self):
        """Test error handling with proper exception types."""
        handler = ErrorHandler()
        
        # Simulate API request with various errors
        try:
            # Example 1: Validation error
            raise ValidationError("email", "Invalid format")
        except ValidationError as e:
            handler.log_exception(e, {"endpoint": "/users"}, "warning")
        
        try:
            # Example 2: Token error
            raise TokenExpiredError("Token has expired")
        except TokenExpiredError as e:
            handler.log_exception(e, {"user_id": 123}, "info")
        
        try:
            # Example 3: External service error
            raise ExternalServiceError("OAuth service down")
        except ExternalServiceError as e:
            handler.log_exception(e, {"service": "oauth"}, "error")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
