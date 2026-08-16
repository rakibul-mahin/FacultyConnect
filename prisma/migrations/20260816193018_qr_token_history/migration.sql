-- DropIndex
DROP INDEX "qr_tokens_facultyId_key";

-- CreateIndex
CREATE INDEX "qr_tokens_facultyId_idx" ON "qr_tokens"("facultyId");
