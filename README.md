# Modern Photo Gallery v0.2

A premium, high-performance photo gallery application built with Next.js 15, Prisma, and Dual-Cloud Storage (Cloudflare R2 + Oracle Cloud). This platform is designed for photographers who want a sleek, private-first workspace to showcase their collections with 20GB of free cloud storage.

## 🚀 NEW in v0.2: The Organization Update

- **☁️ Dual Cloud Storage**: Support for both **Cloudflare R2** and **Oracle Cloud Object Storage**. 
  - Leverage the free tiers of both providers for a combined **20GB of permanent photo storage** at zero cost.
  - Mix and match providers per photo; the backend handles signed URLs and public proxies seamlessly.
- **🔄 Visual Reordering**: Drag-and-drop photos within albums to change their display order.
- **📦 Cross-Album Moving**: Easily move photos between different collections via a new move modal with hierarchical album selection.
- **💬 Photo Captions**: Add detailed descriptions to individual photos, editable directly from the lightbox by the owner.
- **❤️ Social Interactions**: Per-user "Like" feature (heart icon) for photos, with live counter and beautiful animations.
- **📂 Advanced Album Management**:
  - Create root-level or sub-albums directly from the UI.
  - "Clean Empty" feature: Recursively find and delete empty albums/subdirectories that have no photos.
- **⚡ Performance Caching**: Storage usage data is now cached locally to prevent redundant sync calls on every dashboard load.

## ✨ Core Features

- **🚀 High-Performance Thumbnails**: On-the-fly image resizing using `sharp` with support for massive images (up to 200MP+).
- **🛡️ Granular Role-Based Access (RBAC)**: Create custom roles, assign users, and grant per-album permissions.
- **🖼️ Pro Lightbox Experience**: 
  - Smooth pan and zoom (up to 7.5x).
  - EXIF-aware auto-rotation.
  - Editable captions and social interactions.
- **🎨 Premium UI/UX**: Dark-mode first aesthetic with glassmorphism effects and responsive layout.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 / React 19]
- **Storage**: [Cloudflare R2] & [Oracle Cloud Object Storage] (S3-compatible)
- **Database**: [PostgreSQL] via [Prisma ORM]
- **Auth**: [NextAuth.js] with GitHub Provider
- **Image Processing**: [sharp]
- **Styling**: [Tailwind CSS 4]

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js 20+]
- A PostgreSQL database (e.g., [Neon.tech])
- A Cloudflare R2 bucket (10GB Free)
- An Oracle Cloud Object Storage bucket (10GB Free)
- A GitHub OAuth Application

### 2. Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

| New Variable | Description |
|--------------|-------------|
| `ORACLE_ACCESS_KEY_ID` | Oracle Cloud S3-compatible Access Key. |
| `ORACLE_SECRET_ACCESS_KEY` | Oracle Cloud S3-compatible Secret Key. |
| `ORACLE_BUCKET_NAME` | Your Oracle bucket name. |
| `ORACLE_ENDPOINT` | The regional endpoint for Oracle Object Storage. |

### 3. Installation

```bash
npm install
npx prisma generate
npx prisma db push
```

### 4. Running the App

```bash
npm run dev
```

## 🔒 Security Note

- Only the user matching `OWNER_EMAIL` or `OWNER_USERNAME` has administrative access (Syncing, Moving, Reordering, Creating Albums, Captions).
- Role-based permissions are enforced at the API level for all album and photo access.

## 📄 License

This project is for personal use. License TBD.
