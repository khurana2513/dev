"""Circuit breaker pattern for external service calls."""

from datetime import datetime, timedelta
from enum import Enum
import logging
import threading
from typing import Callable, Any, TypeVar, Optional
import functools

from exceptions import CircuitBreakerOpenError

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"          # Normal operation
    OPEN = "open"              # Failing, rejecting requests
    HALF_OPEN = "half_open"    # Testing if service recovered


class CircuitBreaker:
    """Circuit breaker for external service calls."""
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        success_threshold: int = 2,
        timeout_seconds: int = 60,
        expected_exception: type = Exception
    ):
        """Initialize circuit breaker.
        
        Args:
            name: Name of the circuit (for logging)
            failure_threshold: Failures before opening circuit (default: 5)
            success_threshold: Successes in HALF_OPEN before closing (default: 2)
            timeout_seconds: Seconds before half-opening after failure (default: 60)
            expected_exception: Exception type to catch (default: Exception)
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.timeout_seconds = timeout_seconds
        self.expected_exception = expected_exception
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.last_state_change = datetime.utcnow()
        self._lock = threading.Lock()  # Protects all mutable state from concurrent threads
    
    def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        """Execute function through circuit breaker.
        
        Args:
            func: Function to call
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Function result
            
        Raises:
            Exception: If circuit is OPEN or function fails
        """
        # Check if we should transition from OPEN to HALF_OPEN
        with self._lock:
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitState.HALF_OPEN
                    self.success_count = 0
                    logger.info(f"⚡ [CIRCUIT] {self.name}: Transitioning to HALF_OPEN (testing recovery)")
                else:
                    raise CircuitBreakerOpenError(
                        f"Circuit breaker '{self.name}' is OPEN. "
                        f"Service temporarily unavailable. Retry in a few seconds."
                    )
        
        try:
            # Call the function (outside the lock — function may take time)
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise
    
    def _on_success(self) -> None:
        """Handle successful call."""
        with self._lock:
            self.failure_count = 0
            
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                logger.info(
                    f"⚡ [CIRCUIT] {self.name}: Success in HALF_OPEN "
                    f"({self.success_count}/{self.success_threshold})"
                )
                
                # Close circuit after threshold
                if self.success_count >= self.success_threshold:
                    self.state = CircuitState.CLOSED
                    self.last_state_change = datetime.utcnow()
                    logger.info(f"✅ [CIRCUIT] {self.name}: Circuit CLOSED (recovered)")
    
    def _on_failure(self) -> None:
        """Handle failed call."""
        with self._lock:
            self.last_failure_time = datetime.utcnow()
            
            if self.state == CircuitState.CLOSED:
                self.failure_count += 1
                logger.warning(
                    f"⚡ [CIRCUIT] {self.name}: Failure "
                    f"({self.failure_count}/{self.failure_threshold})"
                )
                
                # Open circuit after threshold
                if self.failure_count >= self.failure_threshold:
                    self.state = CircuitState.OPEN
                    self.last_state_change = datetime.utcnow()
                    logger.error(
                        f"🔴 [CIRCUIT] {self.name}: Circuit OPEN (failures exceeded threshold)"
                    )
            elif self.state == CircuitState.HALF_OPEN:
                # Failure in HALF_OPEN, reopen circuit
                self.state = CircuitState.OPEN
                self.last_state_change = datetime.utcnow()
                logger.error(
                    f"🔴 [CIRCUIT] {self.name}: Circuit OPEN (failure during recovery)"
                )
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset."""
        if not self.last_failure_time:
            return True
        
        elapsed = (datetime.utcnow() - self.last_failure_time).total_seconds()
        return elapsed >= self.timeout_seconds
    
    def get_state(self) -> dict:
        """Get circuit breaker state information."""
        return {
            "name": self.name,
            "state": self.state.value,
            "failures": self.failure_count,
            "successes": self.success_count,
            "last_failure": self.last_failure_time,
            "last_state_change": self.last_state_change
        }


# Global circuit breakers for common external services
_breakers = {}


def get_circuit_breaker(
    name: str,
    failure_threshold: Optional[int] = None,
    success_threshold: Optional[int] = None,
    timeout_seconds: Optional[int] = None,
    expected_exception: Optional[type] = None,
    **kwargs
) -> CircuitBreaker:
    """Get or create named circuit breaker."""
    if name not in _breakers:
        init_kwargs = dict(kwargs)
        if failure_threshold is not None:
            init_kwargs["failure_threshold"] = failure_threshold
        if success_threshold is not None:
            init_kwargs["success_threshold"] = success_threshold
        if timeout_seconds is not None:
            init_kwargs["timeout_seconds"] = timeout_seconds
        if expected_exception is not None:
            init_kwargs["expected_exception"] = expected_exception
        _breakers[name] = CircuitBreaker(name, **init_kwargs)
    return _breakers[name]

__all__ = [
    "CircuitBreaker",
    "CircuitBreakerOpenError",
    "CircuitState",
    "get_circuit_breaker",
    "with_circuit_breaker",
    "GOOGLE_OAUTH_BREAKER",
    "DATABASE_BREAKER",
    "LEADERBOARD_BREAKER",
]


def with_circuit_breaker(
    name: str = "default",
    failure_threshold: int = 5,
    success_threshold: int = 2,
    timeout_seconds: int = 60,
    expected_exception: type = Exception
):
    """Decorator to apply circuit breaker to function.
    
    Args:
        name: Circuit breaker name
        failure_threshold: Failures before opening
        success_threshold: Successes before closing
        timeout_seconds: Time before attempting recovery
        expected_exception: Exception to catch
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        breaker = get_circuit_breaker(
            name,
            failure_threshold=failure_threshold,
            success_threshold=success_threshold,
            timeout_seconds=timeout_seconds,
            expected_exception=expected_exception
        )
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            return breaker.call(func, *args, **kwargs)
        
        return wrapper
    
    return decorator


# Pre-configured circuit breakers
GOOGLE_OAUTH_BREAKER = get_circuit_breaker(
    "google_oauth",
    failure_threshold=3,
    timeout_seconds=120,
    expected_exception=Exception
)

DATABASE_BREAKER = get_circuit_breaker(
    "database",
    failure_threshold=5,
    timeout_seconds=60,
    expected_exception=Exception
)

LEADERBOARD_BREAKER = get_circuit_breaker(
    "leaderboard",
    failure_threshold=3,
    timeout_seconds=30,
    expected_exception=Exception
)
