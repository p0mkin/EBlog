# EBlog Modern Photo Gallery v0.3

A premium, high-performance photo galleries application built with **Next.js 16 (React 19)**, **Prisma**, and **Hybrid Cloud Storage** (Cloudflare R2 + Oracle Cloud). This platform is designed for photographers who want a stunning, low-cost, and private-first workspace to showcase their work.

---

## 🚀 What's New in v0.3: The Efficiency Update

This update is focused on **sustainability and performance**, introducing a complex caching layer to minimize infrastructure costs while keeping the interactive feel.

### 💰 Cost-Aware Caching Strategy
A deep integration with Next.js 16's `unstable_cache` and `revalidateTag` to protect your wallet:
- **Neon CU Optimization**: Database queries are cached for 60s (albums/photos) and 300s (thumbnail lookups). This allows the Neon database to auto-suspend even during traffic spikes, dramatically reducing compute hours.
- **Immediate Invalidation**: All mutations (upload, rename, move, delete) use targeted `revalidateTag` calls to ensure caches are purged instantly—no "stale UI" while maintaining high hit rates.
- **Vercel Usage**: Optimized serverless function execution by batching data fetches and reducing DB wait times.

### 🛡️ Enhanced Organization & Control
- **Manual Renaming**: Full UI for renaming albums with smart sync logic that respects your manual changes (R2 sync no longer overwrites your titles).
- **Redundant UI Cleanup**: Streamlined interface by removing clutter and focusing on the new centralized "Album Actions" menu.
- **Recursive R2 Sync**: A one-click solution to import entire folder structures from R2 into your database.

---

## ✨ Features

- **☁️ Hybrid Cloud Storage**: Use Cloudflare R2 and Oracle Cloud simultaneously for a massive free tier (up to 20GB+ total).
- **🚀 High-Performance Thumbnails**: On-the-fly resizing using `sharp` supporting images up to 200MP+.
- **🛡️ Granular RBAC**: Create roles and assign per-album permissions for private client galleries.
- **🖼️ Pro Lightbox**: 7.5x zoom, EXIF metadata extraction, and smooth pan animations.
- **🎨 Premium Aesthetic**: Dark-mode first, glassmorphism UI built with **Tailwind CSS 4**.
- **🔄 Smart Management**: Move albums, reorder photos, and recursively delete empty directories.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16] / [React 19]
- **Database**: [PostgreSQL] via [Prisma ORM] + [Neon]
- **Storage**: [Cloudflare R2] & [Oracle Cloud Object Storage]
- **Auth**: [NextAuth.js] with GitHub Provider
- **Image Processing**: [sharp]
- **Styling**: [Tailwind CSS 4]

---

## 🚀 Setting Up From Zero

EBlog is designed to be hosted on **Vercel** for the best performance.

### 1. External Services Setup
- **Database**: Create a project on [Neon.tech](https://neon.tech). Note: **Heavy usage may exceed the free tier compute units (CU)**. Our caching strategy helps, but monitor your account during initial syncs.
- **Storage**:
    - **Cloudflare R2**: Create a bucket and get your S3 credentials.
    - **Oracle Cloud**: Setup a public Object Storage bucket.
- **Auth**: Register a "GitHub OAuth App" in your Developer Settings. Set the callback to `https://your-domain.com/api/auth/callback/github`.

### 2. Local Installation
```bash
git clone https://github.com/p0mkin/EBlog.git
cd EBlog
npm install
```

### 3. Environment Configuration
Create a `.env` file based on `.env.example`:
- `DATABASE_URL`: Your Neon connection string.
- `OWNER_EMAIL`: Your GitHub email (gives you admin rights).
- `NEXTAUTH_SECRET`: Generate a random 32-char string.
- Fill in R2 and Oracle credentials.

### 4. Deploy to Vercel
1. Push your code to GitHub.
2. Import the project into Vercel.
3. Add all your environment variables in the Vercel project settings.
4. Run `npx prisma db push` (or use a Vercel build command script) to initialize the schema.

---

## ⚠️ Important Disclaimers

- **Neon CU Limits**: While the v0.3 caching significantly reduces database load, the initial "Sync R2" command can be heavy on compute units. If you have thousands of photos, sync in batches or monitor your Neon dashboard.
- **Serverless Limits**: Vercel's free tier has execution time limits. The thumbnail generator is highly optimized, but very large original files (>50MB) may time out on the free tier.

---

## 🔒 Administration
Only the user matching `OWNER_EMAIL` or `OWNER_USERNAME` has access to the **Storage Dashboard**, **Sync**, and **Rename/Move** tools. Role-permissions are enforced strictly at the database layer.

## 📄 License
Personal Use Only. Commercial rights reserved.

