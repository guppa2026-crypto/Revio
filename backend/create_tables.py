from app.database import engine, Base
from app.models.tenant import Tenant
from app.models.user import User
from app.models.review import Review

Base.metadata.create_all(bind=engine)
print("Tables created successfully")
