# Firebase Hosting Commands Guide

This guide covers how to deploy (turn on) and disable (turn off) your Firebase Hosting for the web application.

## 1. Prerequisites
Before deploying, make sure you have built the latest version of your Vite application. Run this command in your project root:
```bash
npm run build
```
*(This creates a `dist` folder containing your production-ready files)*

## 2. Deploying to Firebase Hosting (Turn ON)
Once the build is complete, you can deploy your application to Firebase. 

Run this command:
```bash
firebase deploy --only hosting
```
*(This will upload your files to Firebase and give you a live URL where your site is hosted)*

## 3. Disabling Firebase Hosting (Turn OFF)
If you want to take your site offline, you can disable your Firebase Hosting site. 

Run this command:
```bash
firebase hosting:disable
```
*(Firebase will ask you to confirm. Type `y` and press enter. Your site will immediately show a "Site Not Found" error to visitors)*

---
### Quick Cheat Sheet
- **Build App:** `npm run build`
- **Deploy App:** `firebase deploy --only hosting`
- **Take Offline:** `firebase hosting:disable`
