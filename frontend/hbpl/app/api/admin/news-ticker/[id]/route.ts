import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { TickerItem } from '@/lib/api';

const DATA_FILE = path.join(process.cwd(), 'data', 'ticker.json');
const DJANGO_API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://myhbpl.org';

function readItems(): TickerItem[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as TickerItem[];
  } catch {
    return [];
  }
}

function writeItems(items: TickerItem[]) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

async function verifyToken(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get('authorization');
  if (!auth) return false;
  try {
    const res = await fetch(`${DJANGO_API}/api/admin/me/`, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifyToken(req))) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);
  const items = readItems();
  const idx = items.findIndex((i) => i.id === numId);

  if (idx === -1) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  const body = (await req.json()) as Partial<TickerItem>;
  const updated: TickerItem = {
    ...items[idx],
    ...(body.text !== undefined && { text: String(body.text).trim() }),
    ...(body.link !== undefined && { link: String(body.link).trim() }),
    ...(body.is_active !== undefined && { is_active: Boolean(body.is_active) }),
    ...(body.order !== undefined && { order: Number(body.order) }),
  };

  items[idx] = updated;
  writeItems(items);
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifyToken(req))) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);
  const items = readItems();

  if (!items.some((i) => i.id === numId)) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  writeItems(items.filter((i) => i.id !== numId));
  return new NextResponse(null, { status: 204 });
}
