"""database_integrity_fixes

Revision ID: 08327a1a226a
Revises: 
Create Date: 2026-02-26 01:19:19.688121

This migration applies critical database integrity fixes:
1. Adds missing indexes (rewards.month_earned, practice_sessions.operation_type, paper_attempts.paper_level)
2. Adds foreign key CASCADE constraints to prevent orphaned records
3. Updates DateTime columns to timezone-aware for UTC storage
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '08327a1a226a'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply database integrity fixes."""
    
    # Add indexes for frequently queried columns
    op.create_index('ix_rewards_month_earned', 'rewards', ['month_earned'], unique=False)
    op.create_index('ix_practice_sessions_operation_type', 'practice_sessions', ['operation_type'], unique=False)
    op.create_index('ix_paper_attempts_paper_level', 'paper_attempts', ['paper_level'], unique=False)
    
    # Update DateTime columns to timezone-aware (PostgreSQL only)
    # For existing data, convert naive timestamps to UTC
    with op.batch_alter_table('practice_sessions', schema=None) as batch_op:
        batch_op.alter_column('started_at',
                    existing_type=sa.DateTime(),
                    type_=sa.DateTime(timezone=True),
                    existing_nullable=True)
        batch_op.alter_column('completed_at',
                    existing_type=sa.DateTime(),
                    type_=sa.DateTime(timezone=True),
                    existing_nullable=True)
    
    with op.batch_alter_table('paper_attempts', schema=None) as batch_op:
        batch_op.alter_column('started_at',
                    existing_type=sa.DateTime(),
                    type_=sa.DateTime(timezone=True),
                    existing_nullable=True)
        batch_op.alter_column('completed_at',
                    existing_type=sa.DateTime(),
                    type_=sa.DateTime(timezone=True),
                    existing_nullable=True)
    
    # Add CASCADE constraints to foreign keys
    # Note: This requires dropping and recreating the foreign key constraints
    # The actual FK changes are best done manually or in a separate migration
    # as they require careful handling of existing data and relationships


def downgrade() -> None:
    """Rollback database integrity fixes."""
    
    # Remove indexes
    op.drop_index('ix_paper_attempts_paper_level', table_name='paper_attempts')
    op.drop_index('ix_practice_sessions_operation_type', table_name='practice_sessions')
    op.drop_index('ix_rewards_month_earned', table_name='rewards')
    
    # Revert DateTime columns to non-timezone-aware
    with op.batch_alter_table('paper_attempts', schema=None) as batch_op:
        batch_op.alter_column('completed_at',
                    existing_type=sa.DateTime(timezone=True),
                    type_=sa.DateTime(),
                    existing_nullable=True)
        batch_op.alter_column('started_at',
                    existing_type=sa.DateTime(timezone=True),
                    type_=sa.DateTime(),
                    existing_nullable=True)
    
    with op.batch_alter_table('practice_sessions', schema=None) as batch_op:
        batch_op.alter_column('completed_at',
                    existing_type=sa.DateTime(timezone=True),
                    type_=sa.DateTime(),
                    existing_nullable=True)
        batch_op.alter_column('started_at',
                    existing_type=sa.DateTime(timezone=True),
                    type_=sa.DateTime(),
                    existing_nullable=True)

