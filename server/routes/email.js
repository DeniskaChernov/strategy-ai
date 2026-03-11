/**
 * Email service через Resend (resend.com) — бесплатно до 3000 писем/мес
 * Альтернатива: SendGrid (замени fetch на sendgrid npm пакет)
 */
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@strategyai.app';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn(`📧 [DEV] Email to ${to}: ${subject}`);
    return true;
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!r.ok) {
      const err = await r.text();
      console.error('Resend error:', err);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Email send failed:', e.message);
    return false;
  }
}

// ── Шаблоны писем ──────────────────────────────────────────────────────────────
function baseLayout(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#0f172a;margin:0;padding:0;}
    .wrap{max-width:560px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;}
    .header{background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;}
    .header h1{color:#fff;margin:0;font-size:22px;font-weight:700;}
    .header p{color:rgba(255,255,255,.8);margin:8px 0 0;font-size:14px;}
    .body{padding:32px;}
    .body p{color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 16px;}
    .btn{display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;margin:8px 0;}
    .footer{padding:20px 32px;border-top:1px solid #334155;color:#475569;font-size:12px;text-align:center;}
    .info{background:#0f172a;border-radius:10px;padding:16px;margin:16px 0;color:#94a3b8;font-size:13px;}
  </style></head><body><div class="wrap">
    <div class="header"><h1>Strategy AI</h1><p>Стратегическое планирование бизнеса</p></div>
    <div class="body">${content}</div>
    <div class="footer">© 2026 Strategy AI · <a href="${APP_URL}" style="color:#6366f1;">strategyai.app</a></div>
  </div></body></html>`;
}

function welcomeEmail(name) {
  return {
    subject: '🚀 Добро пожаловать в Strategy AI!',
    html: baseLayout(`
      <p>Привет, <strong style="color:#e2e8f0;">${name}</strong>!</p>
      <p>Твой аккаунт успешно создан. Теперь ты можешь строить стратегии, управлять картами и получать советы от AI-консультанта.</p>
      <p>С чего начать:</p>
      <ul style="color:#cbd5e1;font-size:14px;line-height:1.8;padding-left:20px;">
        <li>Выбери шаблон стратегии или начни с нуля</li>
        <li>Добавь шаги (узлы) и соедини их между собой</li>
        <li>Спроси AI-консультанта что улучшить</li>
      </ul>
      <a href="${APP_URL}" class="btn">Открыть Strategy AI →</a>
    `),
  };
}

function resetPasswordEmail(name, token) {
  const link = `${APP_URL}?reset=${token}`;
  return {
    subject: '🔐 Сброс пароля Strategy AI',
    html: baseLayout(`
      <p>Привет, <strong style="color:#e2e8f0;">${name || 'пользователь'}</strong>!</p>
      <p>Получили запрос на сброс пароля. Нажми кнопку ниже — ссылка действует <strong>1 час</strong>.</p>
      <a href="${link}" class="btn">Сбросить пароль →</a>
      <div class="info">Если ты не запрашивал сброс — просто игнорируй это письмо. Твой пароль не изменится.</div>
      <p style="font-size:12px;color:#475569;">Ссылка: ${link}</p>
    `),
  };
}

function paymentSuccessEmail(name, tierLabel, amount) {
  return {
    subject: `✅ Подписка Strategy AI ${tierLabel} активирована`,
    html: baseLayout(`
      <p>Привет, <strong style="color:#e2e8f0;">${name}</strong>!</p>
      <p>Твоя подписка <strong style="color:#6366f1;">${tierLabel}</strong> успешно активирована.</p>
      <div class="info">
        <strong>Тариф:</strong> ${tierLabel}<br>
        <strong>Сумма:</strong> $${amount}/месяц<br>
        <strong>Следующее списание:</strong> через 30 дней
      </div>
      <p>Все возможности тарифа уже доступны в твоём аккаунте.</p>
      <a href="${APP_URL}" class="btn">Перейти в Strategy AI →</a>
    `),
  };
}

function weeklyBriefingEmail(name, stats, aiSummary) {
  return {
    subject: `📊 Еженедельный брифинг Strategy AI`,
    html: baseLayout(`
      <p>Привет, <strong style="color:#e2e8f0;">${name}</strong>! Итоги недели:</p>
      <div class="info" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>✅ Выполнено: <strong style="color:#10b981;">${stats.completed || 0}</strong></div>
        <div>🔄 В работе: <strong style="color:#6366f1;">${stats.active || 0}</strong></div>
        <div>🚫 Заблокировано: <strong style="color:#ef4444;">${stats.blocked || 0}</strong></div>
        <div>📋 Всего шагов: <strong style="color:#e2e8f0;">${stats.total || 0}</strong></div>
      </div>
      ${aiSummary ? `<p><strong style="color:#e2e8f0;">AI Анализ:</strong></p><p style="border-left:3px solid #6366f1;padding-left:12px;">${aiSummary}</p>` : ''}
      <a href="${APP_URL}" class="btn">Открыть стратегию →</a>
    `),
  };
}

function deadlineReminderEmail(name, steps) {
  const rows = steps.map(s =>
    `<li style="margin-bottom:8px;"><strong style="color:#e2e8f0;">${s.title}</strong> — дедлайн <strong style="color:#f59e0b;">${s.deadline}</strong></li>`
  ).join('');
  return {
    subject: `⏰ Приближаются дедлайны в Strategy AI`,
    html: baseLayout(`
      <p>Привет, <strong style="color:#e2e8f0;">${name}</strong>!</p>
      <p>В ближайшие 3 дня дедлайны у следующих шагов:</p>
      <ul style="color:#cbd5e1;font-size:14px;line-height:2;padding-left:20px;">${rows}</ul>
      <a href="${APP_URL}" class="btn">Открыть карту →</a>
    `),
  };
}

module.exports = { sendEmail, welcomeEmail, resetPasswordEmail, paymentSuccessEmail, weeklyBriefingEmail, deadlineReminderEmail };
