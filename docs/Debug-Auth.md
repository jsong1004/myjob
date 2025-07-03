# Authentication Debugging Guide

## 🚨 Common Issues & Solutions

### 1. **Firebase Console Setup**

**Check these settings in [Firebase Console](https://console.firebase.google.com/project/myresume-457817):**

#### **Enable Authentication Methods:**
1. Go to **Authentication > Sign-in method**
2. **Email/Password:**
   - Click on "Email/Password"
   - Enable "Email/Password" (first toggle)
   - Enable "Email link (passwordless sign-in)" if desired
   - Click "Save"

3. **Google OAuth:**
   - Click on "Google"
   - Enable the toggle
   - **IMPORTANT:** Set the "Project support email" (usually your email)
   - **IMPORTANT:** Add your domain to authorized domains:
     - Add `localhost` for development
     - Add your production domain later
   - Click "Save"

#### **Authorized Domains:**
1. Go to **Authentication > Settings > Authorized domains**
2. Make sure these domains are listed:
   - `localhost` (for development)
   - `myresume-457817.firebaseapp.com` (your Firebase hosting domain)

### 2. **Environment Variables Check**

**Verify your `.env.local` file has the correct values:**

```bash
# Check if your .env.local file exists and has the right values
cat .env.local | grep FIREBASE
```

**Expected output:**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAB9462ndefnzzJg44HPa40P3m9vwPUFw0
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=myresume-457817.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=myresume-457817
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=myresume-457817.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=711582759542
NEXT_PUBLIC_FIREBASE_APP_ID=1:711582759542:web:99ab045aa44f0b1fe57d57
```

### 3. **Browser Console Errors**

**Open browser dev tools (F12) and check for errors:**

1. **Open the app in browser:** http://localhost:3000
2. **Open Developer Tools:** F12 or Right-click → Inspect
3. **Go to Console tab**
4. **Try to sign up/sign in and look for errors**

**Common errors and solutions:**

#### **"Firebase: Error (auth/invalid-api-key)"**
- **Solution:** Check your API key in `.env.local`
- Verify it matches the one in Firebase Console → Project Settings → General

#### **"Firebase: Error (auth/unauthorized-domain)"**
- **Solution:** Add `localhost` to authorized domains in Firebase Console
- Go to Authentication → Settings → Authorized domains

#### **"Firebase: Error (auth/popup-closed-by-user)"**
- **Normal:** User closed the Google OAuth popup
- **If persistent:** Check if popup blockers are enabled

#### **"Firebase: Error (auth/configuration-not-found)"**
- **Solution:** Enable Google OAuth in Firebase Console
- Make sure you set the "Project support email"

### 4. **Test Authentication Step by Step**

**Test Email/Password Sign Up:**
1. Go to http://localhost:3000
2. Click "Sign Up"
3. Fill in:
   - Name: Test User
   - Email: test@example.com
   - Password: test123
4. Check browser console for errors
5. Check Firebase Console → Authentication → Users to see if user was created

**Test Google OAuth:**
1. Click "Continue with Google"
2. Should open Google OAuth popup
3. Select your Google account
4. Check console for errors
5. Check Firebase Console → Users

### 5. **Firebase Console User Creation Check**

**Verify users are being created:**
1. Go to [Firebase Console](https://console.firebase.google.com/project/myresume-457817/authentication/users)
2. Click on "Users" tab
3. You should see any successfully created users here

### 6. **Network Tab Debugging**

**Check if API calls are working:**
1. Open Developer Tools → Network tab
2. Try to sign up/sign in
3. Look for failed requests (red status codes)
4. Check if Firebase auth requests are going through

---

## 🔧 **Quick Fix Commands**

**Restart the development server:**
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

**Clear browser cache:**
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Or open in incognito/private window

**Check if Firebase is connected:**
```bash
# This should show your Firebase project info
firebase projects:list
```

---

## 🆘 **If Still Not Working**

**1. Check Firebase Project Status:**
- Verify the project exists and is active
- Check if billing is enabled (required for some features)

**2. Create Test User Manually:**
- Go to Firebase Console → Authentication → Users
- Click "Add user" manually
- Try signing in with this test user

**3. Enable Debug Logging:**
Add this to your browser console to see detailed Firebase logs:
```javascript
localStorage.debug = 'firebase:*'
```
Then refresh the page and try authentication again.

**4. Check Browser Support:**
- Try in different browsers (Chrome, Firefox, Safari)
- Disable browser extensions that might block authentication

---

## 📞 **Need Help?**

If you're still having issues:
1. Share the exact error message from browser console
2. Confirm which steps from this guide you've completed
3. Let me know if any Firebase Console settings look different than expected

The authentication should work once Firebase is properly configured! 🚀 