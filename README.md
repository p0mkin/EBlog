# EBlog Modern Photo Gallery v0.3.1

A premium, high-performance photo gallery application built with **Next.js 16 (React 19)**, **Prisma**, and **Hybrid Cloud Storage** (Cloudflare R2 + Oracle Cloud). This platform is designed for photographers who want a stunning, low-cost, and private-first workspace to showcase their work.

---

## 🚀 What's New in v0.3.1

### 🔐 Multi-Provider Unified Identity
We've solved the "duplicate user" crisis. Google and GitHub accounts now resolve to the same base identity:
- **Identifier Normalization**: Google users no longer have an appended `-google` suffix. Both providers use the plain username (though GitHub retains its `-git` identifier for administration).
- **Auto-Legacy Cleanup**: Old session tokens are automatically normalized on the fly. Users don't need to sign out to get the "clean" experience.
- **Custom Sign-in**: A high-end custom sign-in page with distinct flows for Admins and Visitors.

### �️ Granular Role-Based Album Access
The role system is now the heartbeat of the gallery's privacy model:
- **Hierarchical Access**: Permissions now correctly propagate through the album tree. Granting access to a folder now actually lets viewers see the sub-folders and galleries within it.
- **Implicit Viewer Role**: All authenticated users are automatic viewers. Granting global visitor access is now as simple as assigning albums to the built-in `viewer` role.
- **Interactive Album Picker**: A completely redesigned, tree-based multi-select modal for admins. Select a parent to toggle all children, or unselect specific sub-folders with a single click.

### 🎨 Premium UI Refinement
- **Dynamic User Badges**: The navigation badge now displays your actual assigned role (e.g., "Homie", "Client", "Family") in its custom color.
- **Clean Interface**: Removed technical clutter like the `@` symbol in usernames for a more modern, polished look.
- **Lightning Thumbnails**: Thumbnails are served via a persistent cloud cache, reducing gallery load times by up to 10x.

---

## ✨ Features

- **☁️ Hybrid Cloud Storage**: Use Cloudflare R2 and Oracle Cloud simultaneously for a massive free tier (up to 20GB+ total).
- **🚀 On-Demand Processing**: High-performance image processing using `sharp` as a background task.
- **🛡️ Advanced RBAC**: Create custom roles with specific colors and batch-assign album permissions.
- **🖼️ Pro Lightbox**: 7.5x zoom, EXIF metadata extraction, and smooth pan animations.
- **🎨 Tailwind CSS 4**: Dark-mode first, glassmorphism UI with buttery-smooth transitions.
- **� Real-time Diagnostics**: Integrated Vercel Speed Insights and Analytics.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16] / [React 19]
- **Database**: [PostgreSQL] via [Prisma ORM] + [Neon]
- **Storage**: [Cloudflare R2] & [Oracle Cloud Object Storage]
- **Auth**: [NextAuth.js] 
- **Image Processing**: [sharp]
- **Styling**: [Tailwind CSS 4]

---

## 🚀 Installation & Setup

### 1. External Services
- **Database**: [Neon.tech](https://neon.tech).
- **Storage**: Cloudflare R2 (S3 API) + Oracle Cloud (Public Bucket).
- **Auth**: Register GitHub and Google OAuth Apps.

### 2. Environment Config
Create a `.env` file based on `.env.example`:
- `OWNER_EMAIL`: Your identifier (e.g., `myusername-git`) for admin rights.
- `OWNER_USERNAME`: Your identifier base (e.g., `myusername`).
- `NEXTAUTH_SECRET`: A random 32-char string.

### 3. Deployment
```bash
npm install
npx prisma db push
npm run dev
```

---

## 🔒 Administration
Only the user matching `OWNER_EMAIL` can access the **Roles Manager** and **Storage Dashboard**.

- **Managing Roles**: Create roles (e.g., "Friend") and grant them access to folders.
- **Member Assignment**: Add users to roles by their username/email.
- **Batch Grant**: Use the new tree-picker to grant access to entire collections at once.

## 📄 License
Personal Use Only. Commercial rights reserved.
