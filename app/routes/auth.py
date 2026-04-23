from flask import Blueprint, request, jsonify, session, render_template, redirect, url_for
from app.utils.db import supabase
from app.utils.email_utils import send_otp_email, generate_otp
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta
import validators

auth_bp = Blueprint('auth', __name__)
bcrypt = Bcrypt()

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return render_template('register.html')
    
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not name or not email or not password:
        return jsonify({"error": "All fields are required"}), 400
    
    if not validators.email(email):
        return jsonify({"error": "Invalid email format"}), 400
    
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Check if user exists
    existing_user = supabase.table('users').select('*').eq('email', email).execute()
    if existing_user.data:
        return jsonify({"error": "Email already registered"}), 400

    # Generate OTP
    otp = generate_otp()
    expiry = (datetime.utcnow() + timedelta(minutes=5)).isoformat()

    # Send OTP
    if send_otp_email(email, otp):
        # Store OTP in DB
        supabase.table('otp_verifications').insert({
            "email": email,
            "otp": otp,
            "expiry_time": expiry
        }).execute()

        # Temporary store user info in session (hashed password)
        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
        session['temp_user'] = {
            "name": name,
            "email": email,
            "password": hashed_pw
        }
        return jsonify({"message": "OTP sent to your email"}), 200
    else:
        return jsonify({"error": "Failed to send OTP. Check SMTP settings."}), 500

@auth_bp.route('/verify-otp', methods=['GET', 'POST'])
def verify_otp():
    if request.method == 'GET':
        return render_template('verify.html')

    data = request.get_json()
    email = data.get('email')
    otp = data.get('otp')
    purpose = data.get('purpose', 'register') # 'register' or 'reset'

    if not email or not otp:
        return jsonify({"error": "OTP is required"}), 400

    # Check OTP in DB
    query = supabase.table('otp_verifications')\
        .select('*')\
        .eq('email', email)\
        .eq('otp', otp)\
        .order('created_at', desc=True)\
        .limit(1)\
        .execute()

    if not query.data:
        return jsonify({"error": "Invalid OTP"}), 400

    record = query.data[0]
    expiry = datetime.fromisoformat(record['expiry_time'].replace('Z', '+00:00'))
    
    if datetime.utcnow().replace(tzinfo=expiry.tzinfo) > expiry:
        return jsonify({"error": "OTP expired"}), 400

    if purpose == 'register':
        temp_user = session.get('temp_user')
        if not temp_user or temp_user['email'] != email:
            return jsonify({"error": "Session expired. Please register again."}), 400
        
        # Create user
        new_user = supabase.table('users').insert({
            "name": temp_user['name'],
            "email": temp_user['email'],
            "password": temp_user['password'],
            "verified": True
        }).execute()
        
        session.pop('temp_user', None)
        return jsonify({"message": "Account verified successfully!"}), 200
    
    elif purpose == 'reset':
        session['reset_email'] = email
        return jsonify({"message": "OTP verified. You can now reset your password."}), 200

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user_query = supabase.table('users').select('*').eq('email', email).execute()
    if not user_query.data:
        return jsonify({"error": "Invalid email or password"}), 401
    
    user = user_query.data[0]
    if not bcrypt.check_password_hash(user['password'], password):
        return jsonify({"error": "Invalid email or password"}), 401
    
    if not user['verified']:
        return jsonify({"error": "Account not verified"}), 403

    session['user_id'] = user['id']
    session['user_name'] = user['name']
    return jsonify({"message": "Login successful"}), 200

@auth_bp.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'GET':
        return render_template('forgot_password.html')
    
    data = request.get_json()
    email = data.get('email')
    
    user_query = supabase.table('users').select('*').eq('email', email).execute()
    if not user_query.data:
        return jsonify({"error": "User not found"}), 404
    
    otp = generate_otp()
    expiry = (datetime.utcnow() + timedelta(minutes=5)).isoformat()
    
    if send_otp_email(email, otp):
        supabase.table('otp_verifications').insert({
            "email": email,
            "otp": otp,
            "expiry_time": expiry
        }).execute()
        return jsonify({"message": "OTP sent to your email"}), 200
    else:
        return jsonify({"error": "Failed to send OTP"}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    email = session.get('reset_email')
    if not email:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    new_password = data.get('password')
    
    if len(new_password) < 6:
        return jsonify({"error": "Password too short"}), 400
    
    hashed_pw = bcrypt.generate_password_hash(new_password).decode('utf-8')
    supabase.table('users').update({"password": hashed_pw}).eq('email', email).execute()
    
    session.pop('reset_email', None)
    return jsonify({"message": "Password reset successful"}), 200

@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth.login'))
