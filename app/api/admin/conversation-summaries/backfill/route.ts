import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { BusinessNumberDatabaseService, MessageDatabaseService, conversationSummaryDB } from '@/app/lib/database';

const businessNumberService = new BusinessNumberDatabaseService();
const messageService = new MessageDatabaseService();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const requestedNumberId = searchParams.get('businessNumberId');
    const businessNumbersRaw = requestedNumberId
      ? [await businessNumberService.getByNumberId(requestedNumberId)]
      : await businessNumberService.getActive();
    const businessNumbers = businessNumbersRaw.filter(
      (businessNumber): businessNumber is NonNullable<typeof businessNumber> => Boolean(businessNumber)
    );

    if (businessNumbers.length === 0) {
      return NextResponse.json({
        status: 'ok',
        processedBusinessNumbers: 0,
        backfilledChats: 0,
        details: [],
      });
    }

    const details: Array<{
      businessNumberId: string;
      label: string | null;
      chats: number;
    }> = [];

    let totalChats = 0;

    for (const businessNumber of businessNumbers) {
      if (!businessNumber) continue;

      const activeChats = await messageService.getActiveContactsLegacy(businessNumber.numberId);
      await conversationSummaryDB.replaceBusinessNumberSummaries(businessNumber.numberId, activeChats);

      totalChats += activeChats.length;
      details.push({
        businessNumberId: businessNumber.numberId,
        label: businessNumber.label ?? null,
        chats: activeChats.length,
      });
    }

    return NextResponse.json({
      status: 'ok',
      processedBusinessNumbers: businessNumbers.length,
      backfilledChats: totalChats,
      details,
    });
  } catch (error) {
    console.error('❌ Error backfilling conversation summaries:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
