import { NextRequest, NextResponse } from 'next/server';

// Mock settings data
export async function GET(request: NextRequest) {
  const settings = {
    config: {
      // Telegram
      telegram_bot_token: '****1234:ABCdefGHIjklMNOp',
      telegram_enabled: true,
      alert_chat_id: '123456789',
      
      // Sync settings
      sync_interval_minutes: 30,
      sync_enabled: true,
      failure_threshold: 3,
      
      // Notifications
      notify_new_reviews: true,
      notify_modified_reviews: true,
      notify_deleted_reviews: false,
      notify_all_ratings: false,
      notify_rating_threshold: 3,
      
      // Database
      db_path: './data/reviews.db',
      db_auto_backup: true,
      db_backup_interval_days: 7,
      
      // Security
      admin_secret_set: true,
      api_rate_limit: 100,
      cors_enabled: false
    },
    stats: {
      database_size_bytes: 524288,
      last_backup: new Date(Date.now() - 86400000).toISOString(),
      total_queries_today: 142,
      api_calls_today: 89
    }
  };

  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock save
    return NextResponse.json({
      success: true,
      message: 'Configuración guardada correctamente',
      updated: Object.keys(body)
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al guardar configuración' },
      { status: 500 }
    );
  }
}