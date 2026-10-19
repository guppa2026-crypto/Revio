"""add tone_instructions to tenants

Revision ID: a1b2c3d4e5f6
Revises: 230635e7b1ed
Create Date: 2026-07-04 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '230635e7b1ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Production already has this column (created by create_all before this migration
    # was ever recorded), so only add it where it's missing
    columns = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("tenants")}
    if "tone_instructions" not in columns:
        op.add_column('tenants', sa.Column('tone_instructions', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('tenants', 'tone_instructions')
