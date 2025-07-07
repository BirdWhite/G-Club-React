-- CreateTable
CREATE TABLE "RolePermissionConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "json" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermissionConfig_pkey" PRIMARY KEY ("id")
);
