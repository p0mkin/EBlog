-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "coverPhotoId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "r2Thumbnail" TEXT,
    "storageProvider" TEXT NOT NULL DEFAULT 'r2',
    "fileSize" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "visibility" TEXT NOT NULL DEFAULT 'visible',
    "takenAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumPermission" (
    "userId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'view',

    CONSTRAINT "AlbumPermission_pkey" PRIMARY KEY ("userId","albumId")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAlbumAccess" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,

    CONSTRAINT "RoleAlbumAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoExclusion" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,

    CONSTRAINT "PhotoExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Album_parentId_slug_key" ON "Album"("parentId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RoleAssignment_roleId_userId_key" ON "RoleAssignment"("roleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleAlbumAccess_roleId_albumId_key" ON "RoleAlbumAccess"("roleId", "albumId");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoExclusion_roleId_photoId_key" ON "PhotoExclusion"("roleId", "photoId");

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumPermission" ADD CONSTRAINT "AlbumPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumPermission" ADD CONSTRAINT "AlbumPermission_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAlbumAccess" ADD CONSTRAINT "RoleAlbumAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAlbumAccess" ADD CONSTRAINT "RoleAlbumAccess_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoExclusion" ADD CONSTRAINT "PhotoExclusion_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoExclusion" ADD CONSTRAINT "PhotoExclusion_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
