import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botToken, chatId, text } = body;

    if (!botToken || !chatId || !text) {
      return NextResponse.json(
        { ok: false, error: 'botToken, chatId y text son requeridos' },
        { status: 400 }
      );
    }

    // Llamada a la API de Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({ ok: true, message: 'Mensaje enviado correctamente' });
    } else {
      return NextResponse.json(
        { ok: false, error: data.description || 'Error al enviar mensaje' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return NextResponse.json(
      { ok: false, error: `Error en el servidor: ${error instanceof Error ? error.message : 'Error desconocido'}` },
      { status: 500 }
    );
  }
}

