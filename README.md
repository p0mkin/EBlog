# Modern Photo Gallery & Blog

A premium, high-performance photo gallery application built with Next.js 15, Prisma, and Cloudflare R2. This platform is designed for photographers who want a sleek, private-first workspace to showcase their collections with granular access control.

## ✨ Features

- **🚀 High-Performance Thumbnails**: On-the-fly image resizing using `sharp` with support for massive images (up to 200MP+).
- **🛡️ Granular Role-Based Access (RBAC)**: Create custom roles, assign users, and grant per-album permissions.
- **📸 Smart Album Management**: 
  - Hierarchical (nested) albums.
  - Automatic and manual album cover selection.
  - Recursive syncing with Cloudflare R2.
- **🖼️ Pro Lightbox Experience**: 
  - Smooth pan and zoom (up to 7.5x).
  - EXIF-aware auto-rotation.
  - High-resolution resolution and file size display.
- **🎨 Premium UI/UX**:
  - Dark-mode first aesthetic with glassmorphism effects.
  - Responsive layout for mobile and desktop.
  - Zero-jarring page transitions.
- **📤 Robust Uploads**: Proxied server-side uploads to bypass CORS and handle large files reliably.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15]
- **Database**: [PostgreSQL] via [Prisma ORM]
- **Storage**: [Cloudflare R2] (S3-compatible)
- **Auth**: [NextAuth.js] with GitHub Provider
- **Image Processing**: [sharp]
- **Styling**: [Tailwind CSS 4]

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js 20+]
- A PostgreSQL database (e.g., [Neon.tech])
- A Cloudflare R2 bucket
- A GitHub OAuth Application

### 2. Configuration

Clone the repository and create a `.env` file from the example:

```bash
cp .env.example .env
```

Fill in the following variables in `.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Your PostgreSQL connection string. |
| `GITHUB_ID` | GitHub OAuth Client ID. |
| `GITHUB_SECRET` | GitHub OAuth Client Secret. |
| `NEXTAUTH_URL` | Base URL of your app (e.g., `http://localhost:3000`). |
| `NEXTAUTH_SECRET` | A random string for session encryption. |
| `OWNER_EMAIL` | The email of the primary site owner (GitHub email). |
| `OWNER_USERNAME` | The GitHub username of the primary site owner. |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 Access Key. |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 Secret Key. |
| `R2_BUCKET_NAME` | Your R2 bucket name. |
| `R2_ENDPOINT` | Your R2 S3 API endpoint. |

### 3. Installation

```bash
npm install
npx prisma generate
npx prisma db push
```

### 4. Running the App

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## 🔒 Security Note

- The `.env` file is ignored by git to protect your credentials. Never commit your secret keys.
- Only the user matching `OWNER_EMAIL` or `OWNER_USERNAME` has administrative access (Syncing, Role Management, Uploads).

## 📄 License

This project is for personal use. License TBD.
