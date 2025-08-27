/* eslint-disable no-console,@typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// 允许开放注册的开关（默认 true，设置为 'false' 关闭）
const OPEN_REG =
  (process.env.NEXT_PUBLIC_OPEN_REGISTRATION || process.env.OPEN_REGISTRATION || 'true')
    .toLowerCase() !== 'false';

// 仅允许在 Redis/Upstash/KVRocks 等数据库模式下注册
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | undefined) || 'localstorage';

export async function POST(req: NextRequest) {
  if (!OPEN_REG) {
    return NextResponse.json({ error: '注册已关闭' }, { status: 403 });
  }

  if (STORAGE_TYPE === 'localstorage') {
    return NextResponse.json(
      { error: '当前存储模式不支持注册，请配置 Redis/Upstash/KVRocks 后再试' },
      { status: 400 }
    );
  }

  try {
    const { username, password } = await req.json();

    if (
      !username ||
      !password ||
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      username.length < 3 ||
      password.length < 4
    ) {
      return NextResponse.json({ error: '用户名或密码不合法' }, { status: 400 });
    }

    // 检查用户是否存在
    const exists = await (db as any).storage.checkUserExist(username);
    if (exists) {
      return NextResponse.json({ error: '用户已存在' }, { status: 409 });
    }

    // 注册用户（明文存储，生产建议改为哈希）
    await (db as any).storage.registerUser(username, password);

    // 返回成功（不直接登录，避免和登录流程耦合）
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('注册失败', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
