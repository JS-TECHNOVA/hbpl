import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { TickerItem } from '@/lib/api';

const DATA_FILE = path.join(process.cwd(), 'data', 'ticker.json');

function readItems(): TickerItem[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as TickerItem[];
  } catch {
    return [];
  }
}

export function GET() {
  const items = readItems()
    .filter((i) => i.is_active)
    .sort((a, b) => a.order - b.order);
  return NextResponse.json(items);
}
