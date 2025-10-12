import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';

// Routes
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import liveRoutes from '@/routes/live';
import socialRoutes from '@/routes/social';
import paymentRoutes from '@/routes/payment';
import moderationRoutes from '@/routes/moderation';
import analyticsRoutes from '@/routes/analytics';
import systemSettingsRoutes from '@/routes/systemSettings';
import adminRoutes from '@/routes/admin';
import chatRoutes from '@/routes/chat';
import conversationsRoutes from '@/routes/conversations';
import roomsRoutes from '@/routes/rooms';

// Socket handlers
import { setupSocketHandlers } from '@/sockets';

// Swagger
import { setupSwagger } from '@/config/swagger';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*', // Tüm origin'lere izin ver (geliştirme için)
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = Number(process.env.PORT) || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || '*', // Tüm origin'lere izin ver (geliştirme için)
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Basit şifre sıfırlama sayfası (aynı portta çalışır)
app.get('/reset-password', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';

  // Sunucu tarafı doğrulama
  let isValid = false;
  let expiresAt: string | null = null;

  if (token) {
    try {
      const matchEntries = [`PWD_RESET:${token}`, `PASSWORD_RESET:${token}`];
      const user = await prisma.user.findFirst({
        where: {
          backupCodes: {
            hasSome: matchEntries
          }
        },
        select: { username: true, displayName: true, loginHistory: true }
      });

      if (user && Array.isArray(user.loginHistory)) {
        const histories = user.loginHistory as Array<{ type: string; token: string; expiresAt: string }>;
        const rec = histories.find(h => (h.type === 'PWD_RESET' || h.type === 'PASSWORD_RESET') && h.token === token);
        if (rec && rec.expiresAt && new Date(rec.expiresAt).getTime() > Date.now()) {
          isValid = true;
          expiresAt = rec.expiresAt;
        }
      }
    } catch (_err) {
      // Sunucu doğrulama hatası olursa, istemci script yine kontrol edecektir.
    }
  }

  const initialMsg = !token
    ? 'Geçersiz istek: token bulunamadı.'
    : (isValid ? 'Token geçerli. Şifrenizi sıfırlayabilirsiniz.' : 'Token geçersiz veya süresi dolmuş.');

  const initialMsgClass = isValid ? 'msg success' : 'msg error';
  const formHiddenClass = isValid ? '' : 'hidden';
  const submitDisabled = isValid ? '' : 'disabled';
  const tokenInfoText = token
    ? ('Token: ' + token + (expiresAt ? ' (Son kullanım: ' + new Date(expiresAt).toLocaleString() + ')' : ''))
    : 'Token: yok';

  // CSP için nonce üret
  const nonce = randomBytes(16).toString('base64');
  res.setHeader(
    'Content-Security-Policy',
    [
      'default-src \'self\'',
      `script-src 'self' 'nonce-${nonce}'`,
      'style-src \'self\' \'unsafe-inline\'',
      'img-src \'self\' data:',
      'connect-src \'self\'',
      'base-uri \'self\'',
      'object-src \'none\'',
      'frame-ancestors \'self\''
    ].join('; ')
  );

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>Şifre Sıfırlama</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --bg1: #0f2027;
      --bg2: #203a43;
      --bg3: #2c5364;
      --card-bg: rgba(255, 255, 255, 0.08);
      --border: rgba(255, 255, 255, 0.15);
      --text: #e8edf1;
      --muted: #b7c2cc;
      --danger: #ff5c5c;
      --success: #2ecc71;
      --primary1: #ff416c;
      --primary2: #ff4b2b;
      --shadow: rgba(0, 0, 0, 0.35);
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes shake {
      10%, 90% { transform: translateX(-1px); }
      20%, 80% { transform: translateX(2px); }
      30%, 50%, 70% { transform: translateX(-4px); }
      40%, 60% { transform: translateX(4px); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--bg1), var(--bg2), var(--bg3));
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
      animation: fadeIn .6s ease both;
    }

    .card {
      width: 100%;
      max-width: 560px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      backdrop-filter: blur(12px);
      box-shadow: 0 20px 40px var(--shadow);
      padding: 28px;
      animation: slideUp .5s ease .1s both;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }
    .brand svg {
      width: 28px; height: 28px;
      filter: drop-shadow(0 2px 8px rgba(255, 65, 108, .4));
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: .3px;
    }
    .subtitle {
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 20px;
    }

    .token-info {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 12px;
      word-break: break-all;
    }

    .alert {
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 14px;
      line-height: 1.4;
      margin-bottom: 16px;
      border: 1px solid var(--border);
      background: rgba(0,0,0,0.2);
    }
    .alert.success { border-color: rgba(46, 204, 113, .45); color: var(--success); background: rgba(46, 204, 113, .08); }
    .alert.error   { border-color: rgba(255, 92, 92, .45); color: var(--danger);  background: rgba(255, 92, 92, .08); }

    .field { margin-bottom: 16px; }
    label { display: block; font-weight: 600; margin-bottom: 8px; color: var(--text); }
    input[type="password"] {
      width: 100%;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.06);
      color: var(--text);
      outline: none;
      transition: border .2s ease, box-shadow .2s ease, transform .08s ease;
    }
    input[type="password"]::placeholder { color: #a0a9b2; }
    input[type="password"]:focus {
      border-color: rgba(255, 75, 43, .6);
      box-shadow: 0 0 0 3px rgba(255,75,43,.18);
      transform: translateY(-1px);
    }

    .actions { display: grid; gap: 10px; }
    .btn {
      position: relative;
      display: inline-grid;
      place-items: center;
      width: 100%;
      padding: 12px;
      border: 0;
      border-radius: 12px;
      color: #fff;
      font-weight: 700;
      letter-spacing: .2px;
      cursor: pointer;
      background: linear-gradient(135deg, var(--primary1), var(--primary2));
      box-shadow: 0 10px 20px rgba(255, 75, 43, .35);
      transition: transform .12s ease, box-shadow .2s ease, filter .2s ease, opacity .2s ease;
    }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(255, 75, 43, .45); }
    .btn:active { transform: translateY(0); }
    .btn:disabled { opacity: .55; cursor: not-allowed; filter: grayscale(.2); }
    .btn.loading { pointer-events: none; }
    .btn.loading::after {
      content: "";
      position: absolute;
      width: 18px; height: 18px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,.6);
      border-top-color: transparent;
      animation: spin .8s linear infinite;
    }

    .hidden { display: none; }
    .shake { animation: shake .45s ease both; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ff416c"/>
            <stop offset="100%" stop-color="#ff4b2b"/>
          </linearGradient>
        </defs>
        <path d="M6 10V8a6 6 0 0112 0v2h1a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1h1zm2 0h8V8a4 4 0 00-8 0v2z" fill="url(#g1)"/>
      </svg>
      <div class="title">Şifre Sıfırlama</div>
    </div>
    <div class="subtitle">Güvenli şekilde yeni şifrenizi belirleyin.</div>

    <p class="token-info" id="tokenInfo">${tokenInfoText}</p>
    <div id="validationMessage" class="alert ${initialMsgClass === 'msg success' ? 'success' : 'error'}">${initialMsg}</div>

    <form id="resetForm" class="${formHiddenClass}">
      <div class="field">
        <label for="password">Yeni Şifre</label>
        <div style="position:relative;">
          <input type="password" id="password" name="password" minlength="6" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,128}" placeholder="En az 6 karakter" required />
          <span id="pwdIcon" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:14px;color:#ccc;"></span>
        </div>
        <div id="pwdStrength" style="margin-top:8px;height:8px;background:rgba(255,255,255,.1);border-radius:6px;overflow:hidden;">
          <div id="pwdStrengthBar" style="height:100%;width:0%;background:#ff6b6b;transition:width .3s ease, background .3s ease;"></div>
        </div>
        <div id="pwdStrengthText" style="margin-top:6px;font-size:12px;color:#cdf;"></div>
        <div class="hint" style="margin-top:8px;color:#9fb;opacity:.9;">En az 1 küçük harf, 1 büyük harf ve 1 sayı içermelidir.</div>
      </div>
      <div class="field">
        <label for="confirmPassword">Yeni Şifre (Tekrar)</label>
        <div style="position:relative;">
          <input type="password" id="confirmPassword" name="confirmPassword" minlength="6" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,128}" placeholder="Şifreyi tekrar yazın" required />
          <span id="confirmIcon" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:14px;color:#ccc;"></span>
        </div>
      </div>
      <div class="actions">
        <button id="submitBtn" type="button" class="btn" ${submitDisabled}>Şifreyi Sıfırla</button>
      </div>
      <div id="message" class="alert hidden"></div>
    </form>
  </div>

  <script nonce="${nonce}">
    document.addEventListener('DOMContentLoaded', function() {
      function getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
      }

      const token = getQueryParam('token');
      const tokenInfo = document.getElementById('tokenInfo');
      const form = document.getElementById('resetForm');
      const submitBtn = document.getElementById('submitBtn');
      const messageEl = document.getElementById('message');
      const validationMessage = document.getElementById('validationMessage');

      const passwordInput = document.getElementById('password');
      const confirmInput = document.getElementById('confirmPassword');
      const pwdIcon = document.getElementById('pwdIcon');
      const confirmIcon = document.getElementById('confirmIcon');
      const pwdStrengthBar = document.getElementById('pwdStrengthBar');
      const pwdStrengthText = document.getElementById('pwdStrengthText');

      // Formun varsayılan submit’ini engelle
      form.addEventListener('submit', function(e) { e.preventDefault(); });

      const showMessage = function(text, type) {
        type = type || 'error';
        messageEl.textContent = text || '';
        messageEl.className = 'alert ' + (type === 'success' ? 'success' : 'error');
        messageEl.classList.remove('hidden');
        if (type === 'error') {
          form.classList.add('shake');
          setTimeout(function(){ form.classList.remove('shake'); }, 500);
        }
      };

      // Şifre karmaşıklığı (sunucudaki Joi ile uyumlu)
      const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,128}$/;
      function computeStrength(pwd) {
        var score = 0;
        if (/[a-z]/.test(pwd)) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/\d/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        if (pwd.length >= 10) score++;
        // 0-5 arası skor -> yüzde ve renk belirleme
        var percent = Math.min(100, score * 20);
        var label = 'Zayıf';
        var color = '#ff6b6b';
        if (score >= 2) { label = 'Orta'; color = '#feca57'; }
        if (score >= 3) { label = 'İyi'; color = '#48dbfb'; }
        if (score >= 4) { label = 'Çok İyi'; color = '#1dd1a1'; }
        return { percent: percent, label: label, color: color };
      }
      function updateStrengthUI(pwd) {
        var s = computeStrength(pwd || '');
        if (pwdStrengthBar) {
          pwdStrengthBar.style.width = s.percent + '%';
          pwdStrengthBar.style.background = s.color;
        }
        if (pwdStrengthText) {
          pwdStrengthText.textContent = s.label;
          pwdStrengthText.style.color = s.color;
        }
      }
      function updatePwdIcon(valid) {
        if (!pwdIcon) return;
        pwdIcon.textContent = valid ? '✓' : '!';
        pwdIcon.style.color = valid ? '#1dd1a1' : '#ff6b6b';
      }
      function updateConfirmIcon(match) {
        if (!confirmIcon) return;
        confirmIcon.textContent = match ? '✓' : '×';
        confirmIcon.style.color = match ? '#1dd1a1' : '#ff6b6b';
      }

      // Canlı doğrulama
      passwordInput.addEventListener('input', function() {
        var pwd = passwordInput.value;
        updateStrengthUI(pwd);
        updatePwdIcon(passwordPattern.test(pwd));
        updateConfirmIcon(pwd.length > 0 && pwd === confirmInput.value);
      });
      confirmInput.addEventListener('input', function() {
        var match = confirmInput.value === passwordInput.value && passwordInput.value.length > 0;
        updateConfirmIcon(match);
      });

      // İstemci tarafı doğrulama ve token kontrolü
      if (!token) {
        tokenInfo.textContent = 'Geçersiz istek: token bulunamadı.';
        tokenInfo.style.color = '#ffb3b3';
        form.classList.add('hidden');
        validationMessage.textContent = 'Token geçersiz veya süresi dolmuş.';
        validationMessage.className = 'alert error';
      } else {
        validationMessage.textContent = 'Token doğrulanıyor...';
        validationMessage.className = 'alert';
        (async function() {
          try {
            var res = await fetch('/api/auth/reset-password/validate?token=' + encodeURIComponent(token));
            var data = await res.json().catch(function(){ return {}; });
            if (res.ok && data && data.valid) {
              form.classList.remove('hidden');
              submitBtn.disabled = false;
              validationMessage.textContent = 'Token geçerli. Şifrenizi sıfırlayabilirsiniz.';
              validationMessage.className = 'alert success';
              if (data.data && data.data.expiresAt) {
                var exp = new Date(data.data.expiresAt);
                tokenInfo.textContent = 'Token: ' + token + ' (Son kullanım: ' + exp.toLocaleString() + ')';
              }
            } else {
              form.classList.add('hidden');
              submitBtn.disabled = true;
              validationMessage.textContent = (data && data.message) || 'Token geçersiz veya süresi dolmuş.';
              validationMessage.className = 'alert error';
            }
          } catch (err) {
            form.classList.add('hidden');
            submitBtn.disabled = true;
            validationMessage.textContent = 'Token doğrulama sırasında hata oluştu. Lütfen daha sonra tekrar deneyin.';
            validationMessage.className = 'alert error';
          }
        })();
      }

      // Basit confetti
      function confetti() {
        var duration = 1200;
        var end = Date.now() + duration;
        var colors = ['#ff6b6b','#feca57','#48dbfb','#1dd1a1','#5f27cd'];
        function drop() {
          var piece = document.createElement('div');
          piece.style.position = 'fixed';
          piece.style.width = '8px';
          piece.style.height = '14px';
          piece.style.top = '-10px';
          piece.style.left = (Math.random() * window.innerWidth) + 'px';
          piece.style.background = colors[Math.floor(Math.random() * colors.length)];
          piece.style.opacity = '0.9';
          piece.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
          piece.style.borderRadius = '2px';
          piece.style.zIndex = '9999';
          document.body.appendChild(piece);
          var anim = piece.animate([
            { transform: piece.style.transform, top: '-10px', opacity: 1 },
            { transform: 'rotate(' + (Math.random() * 360) + 'deg)', top: (window.innerHeight + 10) + 'px', opacity: 0.7 }
          ], { duration: 1200 + Math.random() * 800, easing: 'ease-out' });
          anim.onfinish = function() { piece.remove(); };
          if (Date.now() < end) requestAnimationFrame(drop);
        }
        for (var i = 0; i < 20; i++) drop();
      }

      // Submit yerine butonun click’ine bağlan
      submitBtn.addEventListener('click', async function() {
        messageEl.textContent = '';
        messageEl.className = 'alert hidden';

        if (!token) {
          showMessage('Token bulunamadı.', 'error');
          return;
        }

        var password = passwordInput.value.trim();
        var confirmPassword = confirmInput.value.trim();

        if (!passwordPattern.test(password)) {
          showMessage('Şifre en az 1 küçük harf, 1 büyük harf ve 1 sayı içermelidir. (6-128 karakter)', 'error');
          updatePwdIcon(false);
          return;
        }
        if (password !== confirmPassword) {
          showMessage('Şifreler eşleşmiyor.', 'error');
          updateConfirmIcon(false);
          return;
        }

        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
          var res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, password: password, confirmPassword: confirmPassword }),
          });

          var data = await res.json().catch(function(){ return {}; });

          if (res.ok) {
            showMessage((data && data.message) || 'Şifreniz başarıyla sıfırlandı.', 'success');
            confetti();
            setTimeout(function(){
              // Başarılı sonrası yönlendirme (giriş sayfası yoksa ana sayfaya)
              window.location.href = '/login';
            }, 2000);
          } else {
            var serverMessage =
              (data && (data.message || (data.error && data.error.message) || data.error)) ||
              'Şifre sıfırlama başarısız. Lütfen girdilerinizi kontrol edin.';
            showMessage(serverMessage, 'error');
            submitBtn.disabled = false;
          }
        } catch (err) {
          showMessage('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
          submitBtn.disabled = false;
        } finally {
          submitBtn.classList.remove('loading');
        }
      });
    });
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/rooms', roomsRoutes);

// Swagger setup
setupSwagger(app);

// Socket handlers
setupSocketHandlers(io);

// Not Found and Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});