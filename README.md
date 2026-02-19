# Modern Photo Gallery v0.2

A premium, high-performance photo gallery application built with Next.js 15, Prisma, and **Dual-Cloud Storage** (Cloudflare R2 + Oracle Cloud). This platform is designed for photographers who want a sleek, private-first workspace to showcase their collections with access to **20GB of free cloud storage**.

## 🚀 The v0.2 Organization Update

This major update transforms the gallery from a simple viewer into a powerful photo management command center.

### ☁️ Dual-Cloud Hybrid Storage
Leverage the best of both worlds. By combining the free tiers of **Cloudflare R2** and **Oracle Cloud Object Storage**, you can host up to **20GB of high-resolution photography** at zero cost.
- **Provider Agnostic**: Mix and match storage providers per photo.
- **Optimized Delivery**: Oracle photos use direct signed URLs; R2 photos are proxied through a high-performance `sharp` resizing engine.

### 🔄 Professional Organization
Take full control of your collection's layout:
- **Visual Reordering**: Drag-and-drop photos within any album to set your preferred sequence.
- **Cross-Album Movement**: A dedicated move modal with a hierarchical tree view makes reorganizing your library effortless.
- **Smart Cleanup**: The "Clean Empty" feature recursively purges empty albums and subdirectories in a single click.
- **Inline Creation**: Create new root-level or nested sub-albums directly from the interface without leaving your current view.

### ❤️ Metadata & Social Features
- **Photo Captions**: Add context or titles to your work. Owners can edit captions directly within the lightbox.
- **Engagement**: Per-user "Like" persistence with heart animations and live counters.
- **Performance Caching**: Storage usage data is cached in `localStorage` for instant, lag-free dashboard interactions.

---

## ✨ Features

- **🚀 High-Performance Thumbnails**: On-the-fly image resizing using `sharp` supporting massive images (up to 200MP+).
- **🛡️ Granular Role-Based Access (RBAC)**: Create custom roles, assign users, and grant per-album permissions.
- **📸 Smart Album Management**: Hierarchical nested albums with automatic and manual cover selection.
- **🖼️ Pro Lightbox Experience**: Smooth pan/zoom (up to 7.5x), EXIF-aware auto-rotation, and detailed metadata display.
- **🎨 Premium UI/UX**: Dark-mode first aesthetic with glassmorphism effects and responsive layout.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 / React 19]
- **Storage**: [Cloudflare R2] & [Oracle Cloud Object Storage]
- **Database**: [PostgreSQL] via [Prisma ORM]
- **Auth**: [NextAuth.js] with GitHub Provider
- **Image Processing**: [sharp]
- **Styling**: [Tailwind CSS 4]

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js 20+]
- [PostgreSQL] Database
- [Cloudflare R2] (10GB Free) & [Oracle Cloud] (10GB Free)
- GitHub OAuth App

### 2. Configuration
Create a `.env` file from the example and fill in your credentials.

```bash
cp .env.example .env
```

### 3. Setup
```bash
npm install
npx prisma db push
npm run dev
```

---

## 🔒 Security & Admin
Only the user matching `OWNER_EMAIL` or `OWNER_USERNAME` has administrative access (Syncing, Moving, Reordering, Creating Albums, Captions). Role-based permissions are enforced at the API level for all album and photo access.

## 📄 License
This project is for personal use. License TBD.
