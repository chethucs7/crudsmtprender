# Antigravity Dashboard Setup Guide

This guide will help you set up and deploy your production-ready Flask application.

## 1. Local Setup (Terminal Commands)

Run these commands in your project root to get started:

```powershell
# 1. Create Virtual Environment
python -m venv venv

# 2. Activate Virtual Environment
.\venv\Scripts\activate

# 3. Install Dependencies
pip install -r requirements.txt

# 4. Run the Application
python app.py
```

## 2. Database Configuration (Supabase)

1.  Go to your **Supabase Dashboard**.
2.  Open the **SQL Editor**.
3.  Copy and paste the contents of `supabase_schema.sql` (found in your project root) and run it.
4.  Go to **Project Settings > API** to get your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## 3. Email Configuration (Gmail SMTP)

1.  Go to your Google Account settings.
2.  Enable **2-Step Verification**.
3.  Search for **App Passwords**.
4.  Create a new app password (select 'Other' and name it 'Flask App').
5.  Use this 16-character password in your `.env` file as `EMAIL_PASS`.

## 4. Deployment on Render

1.  Push your code to **GitHub/GitLab**.
2.  Create a new **Web Service** on Render.
3.  Connect your repository.
4.  Configure the following settings:
    - **Runtime**: `Python 3`
    - **Build Command**: `pip install -r requirements.txt`
    - **Start Command**: `gunicorn main:app`
5.  Add **Environment Variables** in the Render Dashboard:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
    - `EMAIL_USER`
    - `EMAIL_PASS`
    - `SECRET_KEY` (Generate a random string)
    - `PYTHON_VERSION`: `3.11.0`

## 5. Folder Structure

```text
/
├── main.py             # Entry point (renamed from app.py to avoid conflict)
├── .env                # Secrets (do not commit to git)
├── requirements.txt    # Dependencies
├── runtime.txt         # Python version for Render
├── supabase_schema.sql # Database queries
├── app/
│   ├── routes/         # Auth & Dashboard logic
│   ├── utils/          # DB & Email utilities
│   ├── static/         # CSS & JS
│   └── templates/      # HTML files (index.html, login.html, etc.)
```
