# 🌟 EBlog Modern Photo Gallery v0.3.4

Welcome to **EBlog**, a beautifully crafted, high-performance photo gallery application built with **Next.js 16** and **Prisma**. Designed with joy for photographers and creatives, it provides a stunning, private workspace to showcase your work without breaking the bank!

By combining **Cloudflare R2** and **Oracle Cloud**, EBlog unlocks **20GB+ of free cloud storage**, making it the perfect home for your high-resolution memories.

---

## ✨ Features & Benefits

- **⚡ Lightning Fast:** Enjoy up to **10x faster** gallery load times with our persistent cloud cache, and a background sync engine that processes images in seconds.
- **🎥 Premium Viewing:** Native support for stunning **8K vertical video** playback, plus a Pro Lightbox offering **7.5x zoom** and deep EXIF metadata extraction.
- **💎 Pristine Quality:** Zero-loss **1.0 quality** HEIC-to-JPEG conversion ensures your photos always look exactly as you intended.
- **☁️ Hybrid Cloud Storage:** Seamlessly scales across multiple cloud providers for maximum free-tier benefits.
- **🛡️ Custom Privacy & Roles:** Effortlessly manage access with a granular Role-Based Access Control (RBAC) system. Create custom roles like "Family" or "Client" and share specific albums with ease.
- **🎨 Gorgeous UI:** A dark-mode first, glassmorphism design powered by **Tailwind CSS 4** for a buttery-smooth, immersive browsing experience.

---

## 🛠️ Built With Love & Modern Tech

- **Framework**: Next.js 16 (React 19)
- **Database**: PostgreSQL via Prisma ORM + Neon
- **Storage**: Cloudflare R2 & Oracle Cloud Object Storage
- **Auth**: NextAuth.js (Google & GitHub)
- **Image Processing**: sharp
- **Styling**: Tailwind CSS 4

---

## 🚀 Quick Setup

### 1. External Services
- **Database**: [Neon.tech](https://neon.tech)
- **Storage**: Cloudflare R2 (S3 API) + Oracle Cloud (Public Bucket)
- **Auth**: GitHub and Google OAuth Apps

### 2. Environment Config
Copy `.env.example` to `.env` and fill in:
- `OWNER_EMAIL`: Your identifier (e.g., `myusername-git`) for admin rights.
- `OWNER_USERNAME`: Your identifier base (e.g., `myusername`).
- `NEXTAUTH_SECRET`: A secure, random 32-character string.

### 3. Blast Off 🚀
```bash
npm install
npx prisma db push
npm run dev
```

---

## 🔒 Simple Administration

As the owner, you get full control:
- **Manage Roles**: Create custom access levels and color-coded badges.
- **Share Securely**: Batch-grant access to entire collections instantly.
- **Stay Private**: Everything is invite-only by default.

## 📄 License
Personal Use Only. Commercial rights reserved.
