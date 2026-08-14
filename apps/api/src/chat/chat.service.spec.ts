// Mock Mistral and Appointments modules to avoid loading ESM runtime deps
jest.mock('../ai/mistral.service', () => ({
  MistralService: jest
    .fn()
    .mockImplementation(() => ({ extractAppointmentIntent: jest.fn() })),
}));

jest.mock('../appointments/appointments.service', () => ({
  AppointmentsService: jest.fn().mockImplementation(() => ({})),
}));

import { ChatService } from './chat.service';

type MockSession = {
  id: string;
  userId: string;
  tenantId: string;
  title?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockMessage = {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt?: Date;
};

type ChatServiceCtorArgs = ConstructorParameters<typeof ChatService>;

const makePrismaMock = (
  session: MockSession | null,
  messages: MockMessage[],
) => ({
  chatSession: {
    findFirst: jest
      .fn()
      .mockImplementation(({ where }: { where?: { id?: string } }) => {
        if (!session) return null;
        if (where?.id && where.id !== session.id) return null;
        return session;
      }),
  },
  chatMessage: {
    findMany: jest.fn().mockResolvedValue(messages),
  },
  aiInteractionLog: {
    create: jest.fn().mockResolvedValue({}),
  },
});

const makeMistralMock = () => ({ extractAppointmentIntent: jest.fn() });
const makeAppointmentsMock = () => ({}) as const;

describe('ChatService.getSessionMessages', () => {
  test('returns null when no session exists', async () => {
    const prisma = makePrismaMock(null, []);
    const svc = new ChatService(
      prisma as unknown as ChatServiceCtorArgs[0],
      makeMistralMock() as unknown as ChatServiceCtorArgs[1],
      makeAppointmentsMock() as unknown as ChatServiceCtorArgs[2],
    );

    const res = await svc.getSessionMessages('user-1', 'tenant-1');
    expect(res).toBeNull();
  });

  test('returns messages when session exists', async () => {
    const session = {
      id: 'sess-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      createdAt: new Date('2024-03-01'),
      updatedAt: new Date('2024-03-01'),
    } satisfies MockSession;
    const messages: MockMessage[] = [
      { id: 'm1', sessionId: 'sess-1', role: 'USER', content: 'Hello' },
      { id: 'm2', sessionId: 'sess-1', role: 'ASSISTANT', content: 'Hi there' },
    ];

    const prisma = makePrismaMock(session, messages);
    const svc = new ChatService(
      prisma as unknown as ChatServiceCtorArgs[0],
      makeMistralMock() as unknown as ChatServiceCtorArgs[1],
      makeAppointmentsMock() as unknown as ChatServiceCtorArgs[2],
    );

    const res = await svc.getSessionMessages('user-1', 'tenant-1');
    expect(res).not.toBeNull();
    expect(res?.sessionId).toBe('sess-1');
    expect(res?.messages).toEqual([
      { id: 'm1', text: 'Hello', from: 'user' },
      { id: 'm2', text: 'Hi there', from: 'ai' },
    ]);
  });

  test('lists all user chat sessions in newest-first order', async () => {
    const prisma = {
      chatSession: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sess-2',
            userId: 'user-1',
            tenantId: 'tenant-1',
            createdAt: new Date('2024-03-02'),
            updatedAt: new Date('2024-03-02'),
            title: 'Second chat',
          },
          {
            id: 'sess-1',
            userId: 'user-1',
            tenantId: 'tenant-1',
            createdAt: new Date('2024-03-01'),
            updatedAt: new Date('2024-03-01'),
            title: 'First chat',
          },
        ]),
      },
      chatMessage: {
        findMany: jest
          .fn()
          .mockImplementation(
            ({ where }: { where?: { sessionId?: { in?: string[] } } }) => {
              if (where?.sessionId && where.sessionId.in) {
                return [
                  {
                    id: 'msg-2',
                    sessionId: 'sess-2',
                    role: 'USER' as const,
                    content: 'Second message',
                    createdAt: new Date('2024-03-02'),
                  },
                  {
                    id: 'msg-1',
                    sessionId: 'sess-1',
                    role: 'USER' as const,
                    content: 'First message',
                    createdAt: new Date('2024-03-01'),
                  },
                ];
              }
              return [];
            },
          ),
      },
      aiInteractionLog: { create: jest.fn().mockResolvedValue({}) },
    };

    const svc = new ChatService(
      prisma as unknown as ChatServiceCtorArgs[0],
      makeMistralMock() as unknown as ChatServiceCtorArgs[1],
      makeAppointmentsMock() as unknown as ChatServiceCtorArgs[2],
    );

    const res = await svc.getUserSessions('user-1', 'tenant-1');
    const expected = [
      {
        id: 'sess-2',
        title: 'Second chat',
        lastMessage: 'Second message',
        createdAt: new Date('2024-03-02'),
        updatedAt: new Date('2024-03-02'),
      },
      {
        id: 'sess-1',
        title: 'First chat',
        lastMessage: 'First message',
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-01'),
      },
    ];

    expect(res).toEqual(expected);
  });
});

export {};
