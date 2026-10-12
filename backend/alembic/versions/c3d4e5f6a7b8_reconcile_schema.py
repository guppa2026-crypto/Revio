"""reconcile schema with models; per-tenant review uniqueness; indexes; password_changed_at

Several model columns were historically created by Base.metadata.create_all rather than
by a migration, so `alembic upgrade head` could not build a working database from scratch.
This migration adds anything that is missing and is a no-op for columns that already exist,
so it is safe on both the existing production database and a fresh one.

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-10-12 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_MISSING_COLUMNS = {
    "tenants": [
        sa.Column("is_subscribed", sa.Boolean(), nullable=True, server_default=sa.false()),
        sa.Column("subscription_status", sa.String(), nullable=True),
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(), nullable=True),
    ],
    "reviews": [
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("risk_level", sa.String(), nullable=True),
        sa.Column("risk_reason", sa.Text(), nullable=True),
        sa.Column("generated_reply", sa.Text(), nullable=True),
        sa.Column("reply_at", sa.DateTime(), nullable=True),
        sa.Column("posted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    ],
    "users": [
        sa.Column("password_changed_at", sa.DateTime(), nullable=True),
    ],
}

_INDEXES = [
    ("ix_reviews_tenant_id", "reviews", ["tenant_id"]),
    ("ix_reviews_status_reply_at", "reviews", ["status", "reply_at"]),
    ("ix_users_tenant_id", "users", ["tenant_id"]),
]

_NEW_UNIQUE = "uq_reviews_tenant_google_review"


_UNNAMED_UQ = "uq_reviews_google_review_id"  # name given to an unnamed constraint (SQLite)


def _global_google_review_unique(inspector) -> tuple[str | None, str | None]:
    """Find the old single-column unique on reviews.google_review_id.

    Returns (constraint_name, index_name). Postgres reports it as a constraint (default
    name reviews_google_review_id_key). SQLite reports an unnamed constraint, which is
    addressed via the batch naming convention below.
    """
    for uc in inspector.get_unique_constraints("reviews"):
        if uc["column_names"] == ["google_review_id"]:
            return uc["name"] or _UNNAMED_UQ, None
    for ix in inspector.get_indexes("reviews"):
        if ix.get("unique") and ix["column_names"] == ["google_review_id"]:
            return None, ix["name"]
    return None, None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    for table, columns in _MISSING_COLUMNS.items():
        existing = {c["name"] for c in inspector.get_columns(table)}
        for column in columns:
            if column.name not in existing:
                op.add_column(table, column)

    inspector = sa.inspect(bind)
    for name, table, cols in _INDEXES:
        if name not in {ix["name"] for ix in inspector.get_indexes(table)}:
            op.create_index(name, table, cols)

    constraint_name, index_name = _global_google_review_unique(inspector)
    existing_uniques = {uc["name"] for uc in inspector.get_unique_constraints("reviews")}
    with op.batch_alter_table(
        "reviews", naming_convention={"uq": "uq_%(table_name)s_%(column_0_name)s"},
    ) as batch:
        if constraint_name:
            batch.drop_constraint(constraint_name, type_="unique")
        if index_name:
            batch.drop_index(index_name)
        if _NEW_UNIQUE not in existing_uniques:
            batch.create_unique_constraint(_NEW_UNIQUE, ["tenant_id", "google_review_id"])


def downgrade() -> None:
    # Only reverse the parts this migration introduced; the reconciled columns
    # pre-date it in production, so they are left in place.
    with op.batch_alter_table("reviews") as batch:
        batch.drop_constraint(_NEW_UNIQUE, type_="unique")
        batch.create_unique_constraint("reviews_google_review_id_key", ["google_review_id"])
    for name, table, _ in _INDEXES:
        op.drop_index(name, table_name=table)
    op.drop_column("users", "password_changed_at")
