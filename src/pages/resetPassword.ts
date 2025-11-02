import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { prisma } from '@/config/database';

export const resetPasswordPage = async (req: Request, res: Response): Promise<void> => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';

  // Sunucu tarafı doğrulama
  let isValid = false;
  let expiresAt: string | null = null;

  if (token) {
    try {
      const matchEntries = [`PWD_RESET:${token}`, `PASSWORD_RESET:${token}`];
      // backupCodes is Json in dev SQLite; fetch and filter client-side
      const candidates = await prisma.user.findMany({
        select: { username: true, displayName: true, loginHistory: true, backupCodes: true }
      });
      const user = candidates.find((u) => Array.isArray(u.backupCodes)
        ? (u.backupCodes as unknown as unknown[]).some((v) => typeof v === 'string' && matchEntries.includes(v))
        : false);

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
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

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      min-height: 100dvh; /* Dynamic viewport height for mobile */
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--bg1), var(--bg2), var(--bg3));
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
      animation: fadeIn .6s ease both;
      padding: 16px;
      overflow-x: hidden;
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
      position: relative;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }
    .brand svg {
      width: 28px; 
      height: 28px;
      filter: drop-shadow(0 2px 8px rgba(255, 65, 108, .4));
      flex-shrink: 0;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: .3px;
      line-height: 1.2;
    }
    .subtitle {
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 20px;
      line-height: 1.4;
    }

    .token-info {
      font-size: 11px;
      color: var(--muted);
      margin-bottom: 12px;
      word-break: break-all;
      overflow-wrap: break-word;
      background: rgba(0,0,0,0.2);
      padding: 8px;
      border-radius: 8px;
    }

    .alert {
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 14px;
      line-height: 1.4;
      margin-bottom: 16px;
      border: 1px solid var(--border);
      background: rgba(0,0,0,0.2);
      word-wrap: break-word;
    }
    .alert.success { 
      border-color: rgba(46, 204, 113, .45); 
      color: var(--success); 
      background: rgba(46, 204, 113, .08); 
    }
    .alert.error { 
      border-color: rgba(255, 92, 92, .45); 
      color: var(--danger);  
      background: rgba(255, 92, 92, .08); 
    }

    .field { 
      margin-bottom: 16px; 
    }
    
    label { 
      display: block; 
      font-weight: 600; 
      margin-bottom: 8px; 
      color: var(--text);
      font-size: 14px;
    }
    
    input[type="password"] {
      width: 100%;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.06);
      color: var(--text);
      outline: none;
      transition: border .2s ease, box-shadow .2s ease, transform .08s ease;
      font-size: 16px; /* Prevents zoom on iOS */
      min-height: 44px; /* Touch-friendly minimum height */
    }
    
    input[type="password"]::placeholder { 
      color: #a0a9b2; 
    }
    
    input[type="password"]:focus {
      border-color: rgba(255, 75, 43, .6);
      box-shadow: 0 0 0 3px rgba(255,75,43,.18);
      transform: translateY(-1px);
    }

    .input-container {
      position: relative;
    }

    .input-icon {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
      color: #ccc;
      pointer-events: none;
    }

    .strength-meter {
      margin-top: 8px;
      height: 6px;
      background: rgba(255,255,255,.1);
      border-radius: 6px;
      overflow: hidden;
    }

    .strength-bar {
      height: 100%;
      width: 0%;
      background: #ff6b6b;
      transition: width .3s ease, background .3s ease;
    }

    .strength-text {
      margin-top: 6px;
      font-size: 12px;
      color: #cdf;
    }

    .hint {
      margin-top: 8px;
      color: #9fb;
      opacity: .9;
      font-size: 12px;
      line-height: 1.3;
    }

    .actions { 
      display: grid; 
      gap: 10px; 
    }
    
    .btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 14px 16px;
      border: 0;
      border-radius: 12px;
      color: #fff;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: .2px;
      cursor: pointer;
      background: linear-gradient(135deg, var(--primary1), var(--primary2));
      box-shadow: 0 10px 20px rgba(255, 75, 43, .35);
      transition: transform .12s ease, box-shadow .2s ease, filter .2s ease, opacity .2s ease;
      min-height: 48px; /* Touch-friendly minimum height */
    }
    
    .btn:hover { 
      transform: translateY(-1px); 
      box-shadow: 0 14px 28px rgba(255, 75, 43, .45); 
    }
    
    .btn:active { 
      transform: translateY(0); 
    }
    
    .btn:disabled { 
      opacity: .55; 
      cursor: not-allowed; 
      filter: grayscale(.2); 
      transform: none !important;
    }
    
    .btn.loading { 
      pointer-events: none; 
    }
    
    .btn.loading::after {
      content: "";
      position: absolute;
      width: 18px; 
      height: 18px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,.6);
      border-top-color: transparent;
      animation: spin .8s linear infinite;
    }

    .hidden { display: none; }
    .shake { animation: shake .45s ease both; }

    /* Mobile optimizations */
    @media (max-width: 480px) {
      body {
        padding: 12px;
      }
      
      .card {
        padding: 24px 20px;
        border-radius: 12px;
        max-width: 100%;
      }
      
      .title {
        font-size: 20px;
      }
      
      .subtitle {
        font-size: 12px;
      }
      
      .brand svg {
        width: 24px;
        height: 24px;
      }
      
      .brand {
        gap: 8px;
      }
      
      input[type="password"] {
        padding: 10px 12px;
        font-size: 16px; /* Prevents zoom on iOS */
      }
      
      .btn {
        font-size: 14px;
        padding: 12px 16px;
      }
      
      .token-info {
        font-size: 10px;
        padding: 6px;
      }
      
      .alert {
        padding: 10px 12px;
        font-size: 13px;
      }
      
      .hint {
        font-size: 11px;
      }
      
      .strength-text {
        font-size: 11px;
      }
    }

    /* Very small screens */
    @media (max-width: 320px) {
      .card {
        padding: 20px 16px;
      }
      
      .title {
        font-size: 18px;
      }
      
      .subtitle {
        font-size: 11px;
      }
      
      input[type="password"] {
        padding: 8px 10px;
      }
    }

    /* Landscape mobile */
    @media (max-height: 500px) and (orientation: landscape) {
      body {
        padding: 8px;
      }
      
      .card {
        padding: 16px;
        max-height: 90vh;
        overflow-y: auto;
      }
      
      .title {
        font-size: 18px;
        margin-bottom: 2px;
      }
      
      .subtitle {
        margin-bottom: 12px;
      }
      
      .field {
        margin-bottom: 12px;
      }
      
      .brand {
        margin-bottom: 2px;
      }
    }

    /* High DPI displays */
    @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
      .btn {
        box-shadow: 0 8px 16px rgba(255, 75, 43, .3);
      }
      
      .btn:hover {
        box-shadow: 0 12px 24px rgba(255, 75, 43, .4);
      }
    }
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
        <div class="input-container">
          <input type="password" id="password" name="password" minlength="6" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,128}" placeholder="En az 6 karakter" required />
          <span id="pwdIcon" class="input-icon"></span>
        </div>
        <div class="strength-meter">
          <div id="pwdStrengthBar" class="strength-bar"></div>
        </div>
        <div id="pwdStrengthText" class="strength-text"></div>
        <div class="hint">En az 1 küçük harf, 1 büyük harf ve 1 sayı içermelidir.</div>
      </div>
      <div class="field">
        <label for="confirmPassword">Yeni Şifre (Tekrar)</label>
        <div class="input-container">
          <input type="password" id="confirmPassword" name="confirmPassword" minlength="6" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,128}" placeholder="Şifreyi tekrar yazın" required />
          <span id="confirmIcon" class="input-icon"></span>
        </div>
      </div>
      <div class="actions">
        <button id="submitBtn" type="button" class="btn" ${submitDisabled}>Şifreyi Sıfırla</button>
      </div>
      <div id="message" class="alert hidden"></div>
    </form>
  </div>

  <script nonce="${nonce}">
    (function() {
      'use strict';
      
      document.addEventListener('DOMContentLoaded', function() {
        function getQueryParam(name) {
          var params = new URLSearchParams(window.location.search);
          return params.get(name);
        }

        var token = getQueryParam('token');
        var tokenInfo = document.getElementById('tokenInfo');
        var form = document.getElementById('resetForm');
        var submitBtn = document.getElementById('submitBtn');
        var messageEl = document.getElementById('message');
        var validationMessage = document.getElementById('validationMessage');

        var passwordInput = document.getElementById('password');
        var confirmInput = document.getElementById('confirmPassword');
        var pwdIcon = document.getElementById('pwdIcon');
        var confirmIcon = document.getElementById('confirmIcon');
        var pwdStrengthBar = document.getElementById('pwdStrengthBar');
        var pwdStrengthText = document.getElementById('pwdStrengthText');

        // Formun varsayılan submit'ini engelle
        form.addEventListener('submit', function(e) { e.preventDefault(); });

        function showMessage(text, type) {
          type = type || 'error';
          messageEl.textContent = text || '';
          messageEl.className = 'alert ' + (type === 'success' ? 'success' : 'error');
          messageEl.classList.remove('hidden');
          if (type === 'error') {
            form.classList.add('shake');
            setTimeout(function(){ form.classList.remove('shake'); }, 500);
          }
        }

        // Şifre karmaşıklığı (sunucudaki Joi ile uyumlu)
        var passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,128}$/;
        
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
          
          fetch('/api/auth/reset-password/validate?token=' + encodeURIComponent(token))
            .then(function(res) {
              return res.json().then(function(data) {
                return { ok: res.ok, data: data };
              }).catch(function() {
                return { ok: res.ok, data: {} };
              });
            })
            .then(function(result) {
              if (result.ok && result.data && result.data.valid) {
                form.classList.remove('hidden');
                submitBtn.disabled = false;
                validationMessage.textContent = 'Token geçerli. Şifrenizi sıfırlayabilirsiniz.';
                validationMessage.className = 'alert success';
                if (result.data.data && result.data.data.expiresAt) {
                  var exp = new Date(result.data.data.expiresAt);
                  tokenInfo.textContent = 'Token: ' + token + ' (Son kullanım: ' + exp.toLocaleString() + ')';
                }
              } else {
                form.classList.add('hidden');
                submitBtn.disabled = true;
                validationMessage.textContent = (result.data && result.data.message) || 'Token geçersiz veya süresi dolmuş.';
                validationMessage.className = 'alert error';
              }
            })
            .catch(function() {
              form.classList.add('hidden');
              submitBtn.disabled = true;
              validationMessage.textContent = 'Token doğrulama sırasında hata oluştu. Lütfen daha sonra tekrar deneyin.';
              validationMessage.className = 'alert error';
            });
        }

        // Basit confetti - Syntax hatası düzeltildi
        function createConfetti() {
          var duration = 1200;
          var end = Date.now() + duration;
          var colors = ['#ff6b6b','#feca57','#48dbfb','#1dd1a1','#5f27cd'];
          
          function createPiece() {
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
            piece.style.pointerEvents = 'none';
            document.body.appendChild(piece);
            
            var startTransform = piece.style.transform;
            var endTransform = 'rotate(' + (Math.random() * 360) + 'deg)';
            var endTop = (window.innerHeight + 10) + 'px';
            
            var animation = piece.animate([
              { transform: startTransform, top: '-10px', opacity: 1 },
              { transform: endTransform, top: endTop, opacity: 0.7 }
            ], { 
              duration: 1200 + Math.random() * 800, 
              easing: 'ease-out' 
            });
            
            animation.onfinish = function() { 
              if (piece.parentNode) {
                piece.remove(); 
              }
            };
            
            if (Date.now() < end) {
              requestAnimationFrame(createPiece);
            }
          }
          
          for (var i = 0; i < 20; i++) {
            createPiece();
          }
        }

        // Submit yerine butonun click'ine bağlan
        submitBtn.addEventListener('click', function() {
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

          fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, password: password, confirmPassword: confirmPassword })
          })
          .then(function(res) {
            return res.json().then(function(data) {
              return { ok: res.ok, data: data };
            }).catch(function() {
              return { ok: res.ok, data: {} };
            });
          })
          .then(function(result) {
            if (result.ok) {
              showMessage((result.data && result.data.message) || 'Şifreniz başarıyla sıfırlandı.', 'success');
              createConfetti();
              setTimeout(function(){
                // Başarılı sonrası yönlendirme (giriş sayfası yoksa ana sayfaya)
                window.location.href = '/login';
              }, 2000);
            } else {
              var serverMessage = (result.data && (result.data.message || (result.data.error && result.data.error.message) || result.data.error)) || 'Şifre sıfırlama başarısız. Lütfen girdilerinizi kontrol edin.';
              showMessage(serverMessage, 'error');
              submitBtn.disabled = false;
            }
          })
          .catch(function() {
            showMessage('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
            submitBtn.disabled = false;
          })
          .finally(function() {
            submitBtn.classList.remove('loading');
          });
        });
      });
    })();
  </script>
</body>
</html>`;

  res.send(html);
};