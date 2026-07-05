from app.database import SessionLocal
from app.models.tenant import Tenant
db = SessionLocal()
t = db.query(Tenant).filter(Tenant.email == "guppa2026@gmail.com").first()
if t:
    print("name:", t.name)
    print("is_subscribed:", t.is_subscribed)
    print("subscription_status:", t.subscription_status)
    print("stripe_customer_id:", t.stripe_customer_id)
else:
    print("not found")
db.close()
