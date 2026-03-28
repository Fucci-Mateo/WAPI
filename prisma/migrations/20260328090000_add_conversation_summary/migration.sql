-- Create a derived read model for the active chat list.

CREATE TABLE "ConversationSummary" (
    "id" TEXT NOT NULL,
    "businessNumberId" TEXT NOT NULL,
    "chatKey" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "businessScopedUserId" TEXT,
    "contactId" TEXT,
    "contactName" TEXT,
    "lastMessage" TEXT,
    "lastMessageTimestamp" TIMESTAMP(3),
    "lastMessageType" "MessageType",
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "templateParameters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationSummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationSummary_businessNumberId_chatKey_key" ON "ConversationSummary"("businessNumberId", "chatKey");
CREATE INDEX "ConversationSummary_businessNumberId_idx" ON "ConversationSummary"("businessNumberId");
CREATE INDEX "ConversationSummary_businessNumberId_lastMessageTimestamp_idx" ON "ConversationSummary"("businessNumberId", "lastMessageTimestamp");
CREATE INDEX "ConversationSummary_businessNumberId_unreadCount_idx" ON "ConversationSummary"("businessNumberId", "unreadCount");
