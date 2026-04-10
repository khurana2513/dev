"""phase1_multitenant_foundation

Revision ID: b1c2d3e4f5a6
Revises: 08327a1a226a
Create Date: 2025-01-01 00:00:00.000000

Phase 1 — Multi-tenant foundation.

SAFETY RULES:
  • All new columns are NULLABLE (or have server_default) — zero data loss.
  • No existing columns are dropped or renamed.
  • No existing data is modified (except the seed script run separately).
  • CREATE TABLE operations add new tables only.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b1c2d3e4f5a6'
down_revision = '08327a1a226a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ──────────────────────────────────────────────────────────────────────────
    # 1.  organizations table
    # ──────────────────────────────────────────────────────────────────────────
    op.create_table(
        'organizations',
        sa.Column('id', sa.String(36), primary_key=True, nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('id_prefix', sa.String(3), nullable=False),
        sa.Column('owner_user_id', sa.Integer(), nullable=False),
        sa.Column('contact_email', sa.String(), nullable=True),
        sa.Column('contact_phone', sa.String(), nullable=True),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('logo_url', sa.String(), nullable=True),
        sa.Column('website_url', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('subscription_tier', sa.String(), nullable=False, server_default='free'),
        sa.Column('max_students', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('verified_by_user_id', sa.Integer(), nullable=True),
        sa.Column('onboarding_complete', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['owner_user_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['verified_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('slug', name='uq_org_slug'),
        sa.UniqueConstraint('id_prefix', name='uq_org_id_prefix'),
    )
    op.create_index('ix_org_slug', 'organizations', ['slug'], unique=True)
    op.create_index('ix_org_id_prefix', 'organizations', ['id_prefix'], unique=True)
    op.create_index('ix_org_owner', 'organizations', ['owner_user_id'])

    # ──────────────────────────────────────────────────────────────────────────
    # 2.  org_invite_links table
    # ──────────────────────────────────────────────────────────────────────────
    op.create_table(
        'org_invite_links',
        sa.Column('id', sa.String(36), primary_key=True, nullable=False),
        sa.Column('org_id', sa.String(36), nullable=False),
        sa.Column('code', sa.String(12), nullable=False),
        sa.Column('role', sa.String(), nullable=False, server_default='student'),
        sa.Column('max_uses', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('uses_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_by_user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('code', name='uq_invite_code'),
    )
    op.create_index('ix_invite_org', 'org_invite_links', ['org_id'])
    op.create_index('ix_invite_code', 'org_invite_links', ['code'], unique=True)

    # ──────────────────────────────────────────────────────────────────────────
    # 3.  Add system_role to users
    # ──────────────────────────────────────────────────────────────────────────
    op.add_column(
        'users',
        sa.Column('system_role', sa.String(), nullable=True, server_default='user'),
    )

    # ──────────────────────────────────────────────────────────────────────────
    # 4.  Add org_id to student_profiles
    # ──────────────────────────────────────────────────────────────────────────
    op.add_column(
        'student_profiles',
        sa.Column('org_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
    )
    op.create_index('ix_sp_org_id', 'student_profiles', ['org_id'])

    # ──────────────────────────────────────────────────────────────────────────
    # 5.  Add org_id to class_schedules
    # ──────────────────────────────────────────────────────────────────────────
    op.add_column(
        'class_schedules',
        sa.Column('org_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
    )
    op.create_index('ix_cs_org_id', 'class_schedules', ['org_id'])

    # ──────────────────────────────────────────────────────────────────────────
    # 6.  Add org_id to class_sessions
    # ──────────────────────────────────────────────────────────────────────────
    op.add_column(
        'class_sessions',
        sa.Column('org_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
    )
    op.create_index('ix_csess_org_id', 'class_sessions', ['org_id'])

    # ──────────────────────────────────────────────────────────────────────────
    # 7.  Add org_id to fee_plans
    # ──────────────────────────────────────────────────────────────────────────
    op.add_column(
        'fee_plans',
        sa.Column('org_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
    )
    op.create_index('ix_fp_org_id', 'fee_plans', ['org_id'])

    # ──────────────────────────────────────────────────────────────────────────
    # 8.  Add org_id to certificates
    # ──────────────────────────────────────────────────────────────────────────
    op.add_column(
        'certificates',
        sa.Column('org_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
    )
    op.create_index('ix_cert_org_id', 'certificates', ['org_id'])

    # ──────────────────────────────────────────────────────────────────────────
    # 9.  Add multi-tenant + sharing columns to papers
    # ──────────────────────────────────────────────────────────────────────────
    op.add_column(
        'papers',
        sa.Column('org_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
    )
    op.add_column(
        'papers',
        sa.Column('created_by_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    )
    op.add_column(
        'papers',
        sa.Column('is_public', sa.Boolean(), nullable=True, server_default=sa.text('false')),
    )
    op.add_column(
        'papers',
        sa.Column('share_code', sa.String(12), nullable=True),
    )
    op.create_index('ix_papers_org_id', 'papers', ['org_id'])
    op.create_index('ix_papers_share_code', 'papers', ['share_code'], unique=True)

    # ──────────────────────────────────────────────────────────────────────────
    # 10. Add org_id to reward_rules
    # ──────────────────────────────────────────────────────────────────────────
    op.add_column(
        'reward_rules',
        sa.Column('org_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
    )
    op.create_index('ix_rr_org_id', 'reward_rules', ['org_id'])

    # ──────────────────────────────────────────────────────────────────────────
    # 11. Add org_id to badge_definitions
    # ──────────────────────────────────────────────────────────────────────────
    op.add_column(
        'badge_definitions',
        sa.Column('org_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
    )
    op.create_index('ix_bd_org_id', 'badge_definitions', ['org_id'])

    # ──────────────────────────────────────────────────────────────────────────
    # 12. Add org_id to point_rules
    # ──────────────────────────────────────────────────────────────────────────
    op.add_column(
        'point_rules',
        sa.Column('org_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
    )
    op.create_index('ix_pr_org_id', 'point_rules', ['org_id'])


def downgrade() -> None:
    # Remove in reverse order

    # point_rules
    op.drop_index('ix_pr_org_id', table_name='point_rules')
    op.drop_column('point_rules', 'org_id')

    # badge_definitions
    op.drop_index('ix_bd_org_id', table_name='badge_definitions')
    op.drop_column('badge_definitions', 'org_id')

    # reward_rules
    op.drop_index('ix_rr_org_id', table_name='reward_rules')
    op.drop_column('reward_rules', 'org_id')

    # papers
    op.drop_index('ix_papers_share_code', table_name='papers')
    op.drop_index('ix_papers_org_id', table_name='papers')
    op.drop_column('papers', 'share_code')
    op.drop_column('papers', 'is_public')
    op.drop_column('papers', 'created_by_user_id')
    op.drop_column('papers', 'org_id')

    # certificates
    op.drop_index('ix_cert_org_id', table_name='certificates')
    op.drop_column('certificates', 'org_id')

    # fee_plans
    op.drop_index('ix_fp_org_id', table_name='fee_plans')
    op.drop_column('fee_plans', 'org_id')

    # class_sessions
    op.drop_index('ix_csess_org_id', table_name='class_sessions')
    op.drop_column('class_sessions', 'org_id')

    # class_schedules
    op.drop_index('ix_cs_org_id', table_name='class_schedules')
    op.drop_column('class_schedules', 'org_id')

    # student_profiles
    op.drop_index('ix_sp_org_id', table_name='student_profiles')
    op.drop_column('student_profiles', 'org_id')

    # users
    op.drop_column('users', 'system_role')

    # org_invite_links
    op.drop_index('ix_invite_code', table_name='org_invite_links')
    op.drop_index('ix_invite_org', table_name='org_invite_links')
    op.drop_table('org_invite_links')

    # organizations
    op.drop_index('ix_org_owner', table_name='organizations')
    op.drop_index('ix_org_id_prefix', table_name='organizations')
    op.drop_index('ix_org_slug', table_name='organizations')
    op.drop_table('organizations')
