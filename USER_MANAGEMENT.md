# 👥 User Management Guide

## 📋 **Overview**

The WhatsApp Business Manager now includes a comprehensive user management system with role-based access control.

## 🔐 **User Roles**

### **ADMIN**
- Full access to all features
- Can manage users (create, edit, delete)
- Can access admin panel
- Can view all messages and data

### **MANAGER**
- Can view and manage messages
- Can access analytics and reports
- Cannot manage users
- Limited administrative access

### **USER**
- Basic access to WhatsApp interface
- Can send and receive messages
- Cannot access admin features
- Standard user permissions

## 🚀 **Getting Started**

### **1. Initial Setup**
When you first deploy the application, you need to create the first admin user:

1. Visit `https://your-domain.com/setup`
2. Fill in the form with:
   - **Name**: Your full name
   - **Email**: Your email address
   - **Password**: A strong password
3. Click "Create Admin User"
4. You'll be redirected to the sign-in page
5. Sign in with your credentials

### **2. Creating Additional Users (Admin Only)**

Once you have an admin account, you can create additional users:

1. Sign in as an admin user
2. Click on your profile in the top-right corner
3. Select "User Management" from the dropdown
4. Click "Add User" button
5. Fill in the user details:
   - **Name**: User's full name
   - **Email**: User's email address
   - **Password**: User's password
   - **Role**: Select appropriate role (USER, MANAGER, or ADMIN)
   - **Active**: Toggle to enable/disable the account
6. Click "Create" to save the user

## 🔧 **Managing Users**

### **Viewing Users**
- Navigate to `/admin/users` (admin only)
- View all users in a table format
- See user details including role, status, and creation date

### **Editing Users**
1. Click the edit icon (pencil) next to any user
2. Modify the user's information
3. Leave password blank to keep the current password
4. Click "Update" to save changes

### **Deleting Users**
1. Click the delete icon (trash) next to any user
2. Confirm the deletion
3. User will be permanently removed from the system

### **Activating/Deactivating Users**
1. Edit a user
2. Toggle the "Active" switch
3. Save changes
4. Inactive users cannot sign in

## 🔒 **Security Features**

### **Password Security**
- All passwords are hashed using bcrypt
- Minimum password strength requirements
- Secure password storage

### **Session Management**
- JWT-based sessions
- 30-day session duration
- Secure session handling

### **Access Control**
- Role-based permissions
- Admin-only user management
- Protected API endpoints

## 📊 **User Statistics**

### **User Count by Role**
- Track how many users you have in each role
- Monitor user activity
- Manage user distribution

### **User Activity**
- View when users were created
- Track user modifications
- Monitor login activity

## 🛠️ **API Endpoints**

### **List Users** (Admin Only)
```
GET /api/auth/users
```

### **Create User** (Admin Only)
```
POST /api/auth/users
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "role": "USER",
  "isActive": true
}
```

### **Update User** (Admin Only)
```
PUT /api/auth/users/{id}
{
  "email": "user@example.com",
  "name": "John Doe",
  "role": "MANAGER",
  "isActive": true
}
```

### **Delete User** (Admin Only)
```
DELETE /api/auth/users/{id}
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Cannot Access User Management**
- Ensure you're signed in as an admin user
- Check that your role is set to "ADMIN"
- Try signing out and signing back in

#### **2. User Cannot Sign In**
- Check if the user account is active
- Verify the email and password are correct
- Ensure the user exists in the database

#### **3. Permission Denied Errors**
- Verify the user has the correct role
- Check if the user account is active
- Ensure proper authentication

### **Useful Commands**

#### **Check User in Database**
```bash
# Connect to database
docker-compose exec postgres psql -U wabm_user -d wabm_db

# List all users
SELECT id, email, name, role, "isActive" FROM "User";
```

#### **Reset User Password**
```bash
# Update user password in database
UPDATE "User" SET password = 'new_hashed_password' WHERE email = 'user@example.com';
```

## 📈 **Best Practices**

### **User Creation**
- Use strong, unique passwords
- Assign appropriate roles based on responsibilities
- Keep user accounts active only when needed
- Regularly review user access

### **Security**
- Regularly rotate admin passwords
- Monitor user activity
- Deactivate unused accounts
- Use unique email addresses for each user

### **Management**
- Document user roles and permissions
- Train users on proper usage
- Monitor system access logs
- Regular security audits

## 🎯 **Next Steps**

1. **Create your first admin user** using the setup page
2. **Add team members** through the user management interface
3. **Assign appropriate roles** based on responsibilities
4. **Monitor user activity** and manage access as needed
5. **Regularly review** and update user permissions

**Your user management system is now ready for production use!** 👥🔐 