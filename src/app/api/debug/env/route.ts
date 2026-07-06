import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET ? '***CONFIGURED***' : null,
    LINE_CHANNEL_TOKEN: process.env.LINE_CHANNEL_TOKEN ? '***CONFIGURED***' : null,
    LINE_USER_ID: process.env.LINE_USER_ID ? '***CONFIGURED***' : null,
    NODE_ENV: process.env.NODE_ENV,
  });
}
