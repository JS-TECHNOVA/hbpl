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

export async function GET(req: NextRequest) {
  if (!(await verifyToken(req))) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(readItems().sort((a, b) => a.order - b.order));
}

export async function POST(req: NextRequest) {
  if (!(await verifyToken(req))) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as Partial<TickerItem>;
  const items = readItems();
  const newItem: TickerItem = {
    id: items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1,
    text: String(body.text ?? '').trim(),
    link: String(body.link ?? '').trim(),
    is_active: body.is_active !== false,
    order: Number(body.order ?? 0),
  };

  if (!newItem.text) {
    return NextResponse.json({ detail: 'text is required' }, { status: 400 });
  }

  writeItems([...items, newItem]);
  return NextResponse.json(newItem, { status: 201 });
}
