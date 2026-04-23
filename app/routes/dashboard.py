from flask import Blueprint, request, jsonify, session, render_template, redirect, url_for
from app.utils.db import supabase

dashboard_bp = Blueprint('dashboard', __name__)

def login_required(f):
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

@dashboard_bp.route('/')
@login_required
def index():
    return render_template('index.html', name=session.get('user_name'))

@dashboard_bp.route('/api/records', methods=['GET'])
@login_required
def get_records():
    user_id = session.get('user_id')
    response = supabase.table('records').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
    return jsonify(response.data)

@dashboard_bp.route('/api/records', methods=['POST'])
@login_required
def create_record():
    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    user_id = session.get('user_id')

    if not title:
        return jsonify({"error": "Title is required"}), 400

    response = supabase.table('records').insert({
        "user_id": user_id,
        "title": title,
        "description": description
    }).execute()
    
    return jsonify(response.data[0]), 201

@dashboard_bp.route('/api/records/<int:id>', methods=['PUT'])
@login_required
def update_record(id):
    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    user_id = session.get('user_id')

    # Verify ownership
    check = supabase.table('records').select('*').eq('id', id).eq('user_id', user_id).execute()
    if not check.data:
        return jsonify({"error": "Record not found or unauthorized"}), 404

    response = supabase.table('records').update({
        "title": title,
        "description": description
    }).eq('id', id).execute()
    
    return jsonify(response.data[0])

@dashboard_bp.route('/api/records/<int:id>', methods=['DELETE'])
@login_required
def delete_record(id):
    user_id = session.get('user_id')
    
    # Verify ownership
    check = supabase.table('records').select('*').eq('id', id).eq('user_id', user_id).execute()
    if not check.data:
        return jsonify({"error": "Record not found or unauthorized"}), 404

    supabase.table('records').delete().eq('id', id).execute()
    return jsonify({"message": "Record deleted successfully"})
