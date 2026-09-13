from database import SessionLocal, engine, Base
from auth import hash_password
import models


Base.metadata.create_all(bind=engine)

db = SessionLocal()

username = "admin"
password = "admin123"

user = db.query(models.User).filter(
    models.User.username == username
).first()

if user:
    user.password_hash = hash_password(password)
    user.role = "Admin"
    user.is_active = 1
    db.commit()

    print("Admin password updated successfully.")
else:
    user = models.User(
        username=username,
        password_hash=hash_password(password),
        role="Admin",
        is_active=1
    )

    db.add(user)
    db.commit()

    print("Admin user created successfully.")

print("Username:", username)
print("Password:", password)

db.close()