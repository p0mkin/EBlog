-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "caption" TEXT,
ADD COLUMN     "sortOrder" INTEGER;

-- CreateTable
CREATE TABLE "PhotoLike" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PhotoLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhotoLike_photoId_userId_key" ON "PhotoLike"("photoId", "userId");

-- AddForeignKey
ALTER TABLE "PhotoLike" ADD CONSTRAINT "PhotoLike_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoLike" ADD CONSTRAINT "PhotoLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
