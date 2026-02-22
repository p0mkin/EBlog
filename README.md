# EBlog Modern Photo Gallery v0.3.1

A premium, high-performance photo gallery application built with **Next.js 16 (React 19)**, **Prisma**, and **Hybrid Cloud Storage** (Cloudflare R2 + Oracle Cloud). This platform is designed for photographers who want a stunning, low-cost, and private-first workspace to showcase their work.

---

## 🚀 What's New in v0.3.1

### 🔐 The "Auth Shenanigans" Solved
We've completely overhauled the authentication system to be provider-agnostic and resilient to account configuration issues:
- **Identification & Names**: No longer dependent on email addresses (which were causing 404s for users with private GitHub emails).
- **Admin Access**: Sign in with **GitHub**. Your account is identified by `yourusername-git`.
- **Visitor Access**: Sign in with **Google**. Identified as `yourusername-google`.
- **Stable RBAC**: Role assignments now use these stable identifiers, ensuring you never lose access even if you change your public email settings.
- **Custom Sign-in**: A premium custom sign-in page (`/signin`) with clear labeling for Admin (GitHub) flows.

### 🖼️ Persistent Thumbnail Caching
No more slow loads or heavy CPU usage on every page refresh:
- **Cache-First Serving**: Thumbnails are generated once via `sharp`, then persistently stored in your cloud provider (R2/Oracle).
- **Automatic Sync**: The `Photo.r2Thumbnail` field tracks cached assets. If a thumbnail exists, it's served directly (as a redirect for Oracle or a proxy for R2).
- **Lightning Performance**: Gallery loads are up to 10x faster after the initial generation.

### 📊 Built-in Diagnostics
- **Vercel Speed Insights**: Integrated to monitor real-world performance.
- **Vercel Analytics**: Track usage patterns while maintaining privacy.

---

## ✨ Features

- **☁️ Hybrid Cloud Storage**: Use Cloudflare R2 and Oracle Cloud simultaneously for a massive free tier (up to 20GB+ total).
- **🚀 On-Demand Processing**: High-performance image processing using `sharp` as a background task.
- **🛡️ Granular RBAC**: Create roles and assign per-album permissions for private client galleries.
- **🖼️ Pro Lightbox**: 7.5x zoom, EXIF metadata extraction, and smooth pan animations.
- **🎨 Premium Aesthetic**: Dark-mode first, glassmorphism UI built with **Tailwind CSS 4**.
- **🔄 Smart Management**: Move albums, reorder photos, and recursively delete empty directories.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16] / [React 19]
- **Database**: [PostgreSQL] via [Prisma ORM] + [Neon]
- **Storage**: [Cloudflare R2] & [Oracle Cloud Object Storage]
- **Auth**: [NextAuth.js] with GitHub & Google Providers
- **Image Processing**: [sharp]
- **Observability**: [Vercel Speed Insights] & [Vercel Analytics]

---

## 🚀 Installation & Setup

### 1. External Services
- **Database**: Create a project on [Neon.tech](https://neon.tech).
- **Storage**:
    - **Cloudflare R2**: Create a bucket and get S3 credentials.
    - **Oracle Cloud**: Setup a public Object Storage bucket.
- **Auth**: 
    - Register a GitHub OAuth App. Set callback to `https://your-domain.com/api/auth/callback/github`.
    - Register Google OAuth credentials. Set callback to `https://your-domain.com/api/auth/callback/google`.

### 2. Deployment
```bash
npm install
npm install @vercel/speed-insights
npx prisma db push
```

### 3. Environment Config
Create a `.env` file based on `.env.example`:
- `OWNER_EMAIL`: Your identifier (e.g., `myusername-git`) to gain admin rights.
- `OWNER_USERNAME`: Your identifier base (e.g., `myusername`).
- `NEXTAUTH_SECRET`: A random 32-char string.
- Fill in R2, Oracle, GitHub, and Google credentials.

---

## 🔒 Administration
Only the user matching `OWNER_EMAIL` has access to **Role Management**, **Storage Dashboard**, and **Sync tools**. 

Users signing in with GitHub are automatically assigned the `-git` suffix, while Google users get `-google`. Use these exact strings in the **Manage Roles** panel to grant access to specific albums.

## 📄 License
Personal Use Only. Commercial rights reserved.
