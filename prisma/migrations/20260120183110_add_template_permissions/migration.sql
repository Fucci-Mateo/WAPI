-- AlterTable
ALTER TABLE "Template" ADD COLUMN "allowedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "allowedClientIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Template_name_language_key" ON "Template"("name", "language");
