// tests/auth/google-login.test.ts
import { POST } from '@/app/api/auth/[...nextauth]/route'
import { createMockRequest } from '../helpers'
import { signIn } from 'next-auth/react'
import { auth } from '@/auth'
import { authConfig } from '@/auth.config'
import { db } from '@/lib/db'

// 1. 신규 Google 로그인 (Happy Path)
test('신규 유저 Google 로그인 시 account 레코드 생성', async () => {
  const req = createMockRequest('POST', {
    provider: 'google',
    providerAccountId: 'google-uid-123',
    email: 'newuser@gmail.com',
  })

  const res = await POST(req)
  expect(res.status).toBe(200)

  const user = await db.user.findUnique({ where: { email: 'newuser@gmail.com' } })
  expect(user).not.toBeNull()

  const account = await db.account.findFirst({ where: { userId: user!.id } })
  expect(account?.provider).toBe('google')
})

// 2. 핵심: 이메일 중복 계정 연결 (OAuthAccountNotLinked 재현)
test('기존 이메일 계정에 Google 로그인 시 에러 없이 연결', async () => {
  // 기존에 email/password로 가입된 유저 세팅
  await db.user.create({
    data: { email: 'existing@gmail.com', password: 'hashed_pw' }
  })

  // 같은 이메일로 Google OAuth 시도
  const result = await signIn('google', {
    email: 'existing@gmail.com',
    providerAccountId: 'google-uid-456',
  })

  // v4: 자동 연결 / v5 수정 전: OAuthAccountNotLinked throw
  expect(result).not.toBe('OAuthAccountNotLinked')
})

// 3. signIn 콜백 단위 테스트 (next-auth v5 콜백 시그니처 확인용)
test('signIn 콜백이 v5 시그니처를 올바르게 처리', async () => {
  const mockAccount = { provider: 'google', type: 'oauth', providerAccountId: 'uid-789' }
  const mockUser = { id: '1', email: 'test@gmail.com' }

  // authConfig의 signIn 콜백 직접 호출
  const { signIn } = authConfig.callbacks!
  const allowed = await signIn!({ user: mockUser, account: mockAccount } as any)

  expect(allowed).toBe(true)
})

// 4. 세션 반환값 검증 (v4 → v5 API 변경)
// v4: getServerSession() → v5: auth()
test('auth()가 올바른 세션 구조 반환', async () => {
  const session = await auth()

  expect(session).toHaveProperty('user')
  expect(session?.user).toHaveProperty('email')
  // v5에서 user.id가 session에 포함되는지 확인 (callbacks.session에서 명시 필요)
  expect(session?.user).toHaveProperty('id')
})
