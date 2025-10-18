import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { prisma } from '@/config/database';

export const verifyEmailPage = async (req: Request, res: Response): Promise<void> => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';

  // Sunucu tarafı doğrulama
  let isValid = false;
  let expiresAt: string | null = null;
  let displayName = '';

  if (token) {
    try {
      const entry = `EMAIL_VERIFY:${token}`;
      const user = await prisma.user.findFirst({
        where: {
          backupCodes: {
            has: entry,
          },
        },
        select: {
          username: true,
          displayName: true,
          loginHistory: true,
          isVerified: true,
        },
      });

      if (user && Array.isArray(user.loginHistory)) {
        const histories = user.loginHistory as Array<{ type: string; token: string; expiresAt: string }>;
        const rec = histories.find(h => h.type === 'EMAIL_VERIFY' && h.token === token);
        if (rec && rec.expiresAt && new Date(rec.expiresAt).getTime() > Date.now()) {
          isValid = true;
          expiresAt = rec.expiresAt;
          displayName = user.displayName || user.username || 'Kullanıcı';
        }
      }
    } catch (_err) {
      // Sunucu doğrulama hatası olursa, istemci script yine kontrol edecektir.
    }
  }

  const initialMsg = !token
    ? 'Geçersiz istek: doğrulama token\'ı bulunamadı.'
    : (isValid ? `Merhaba ${displayName}! E-posta adresinizi doğrulamak için butona tıklayın.` : 'Token geçersiz veya süresi dolmuş.');

  const initialMsgClass = isValid ? 'success' : 'error';
  const buttonText = isValid ? 'E-postayı Doğrula' : 'Yeni Doğrulama Linki İste';
  const tokenInfoText = token
    ? ('Token: ' + token + (expiresAt ? ' (Son kullanım: ' + new Date(expiresAt).toLocaleString() + ')' : ''))
    : 'Token: yok';

  // CSP için nonce üret
  const nonce = randomBytes(16).toString('base64');
  
  // Sadece temel güvenlik başlıklarını ayarla (Cross-Origin-Opener-Policy kaldırıldı)
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
  <title>E-posta Doğrulama</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <style>
    :root {
      --bg1: #667eea;
      --bg2: #764ba2;
      --bg3: #f093fb;
      --card-bg: rgba(255, 255, 255, 0.95);
      --border: rgba(255, 255, 255, 0.2);
      --text: #2d3748;
      --muted: #718096;
      --danger: #e53e3e;
      --success: #38a169;
      --primary1: #667eea;
      --primary2: #764ba2;
      --shadow: rgba(0, 0, 0, 0.15);
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes bounce {
      0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
      40%, 43% { transform: translate3d(0, -30px, 0); }
      70% { transform: translate3d(0, -15px, 0); }
      90% { transform: translate3d(0, -4px, 0); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--bg1), var(--bg2), var(--bg3));
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      animation: fadeIn 0.8s ease both;
      padding: 16px;
      overflow-x: hidden;
    }

    .card {
      width: 100%;
      max-width: 480px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      backdrop-filter: blur(20px);
      box-shadow: 0 25px 50px var(--shadow);
      padding: 32px 24px;
      text-align: center;
      animation: slideUp 0.6s ease 0.2s both;
      position: relative;
    }

    .icon-container {
      margin-bottom: 20px;
      animation: bounce 2s infinite;
    }

    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto;
      background: linear-gradient(135deg, var(--primary1), var(--primary2));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    }

    .icon svg {
      width: 32px;
      height: 32px;
      color: white;
    }

    .title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
      background: linear-gradient(135deg, var(--primary1), var(--primary2));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.2;
    }

    .subtitle {
      font-size: 14px;
      color: var(--muted);
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .token-info {
      font-size: 11px;
      color: var(--muted);
      margin-bottom: 16px;
      word-break: break-all;
      background: rgba(0,0,0,0.05);
      padding: 10px;
      border-radius: 8px;
      overflow-wrap: break-word;
    }

    .alert {
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 20px;
      border: 1px solid transparent;
      word-wrap: break-word;
    }
    .alert.success { 
      border-color: rgba(56, 161, 105, 0.3); 
      color: var(--success); 
      background: rgba(56, 161, 105, 0.1); 
    }
    .alert.error { 
      border-color: rgba(229, 62, 62, 0.3); 
      color: var(--danger); 
      background: rgba(229, 62, 62, 0.1); 
    }

    .btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 20px;
      border: 0;
      border-radius: 12px;
      color: white;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
      background: linear-gradient(135deg, var(--primary1), var(--primary2));
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
      text-decoration: none;
      margin-bottom: 12px;
      min-height: 48px;
    }
    
    .btn:hover { 
      transform: translateY(-2px); 
      box-shadow: 0 12px 35px rgba(102, 126, 234, 0.5); 
    }
    
    .btn:active { 
      transform: translateY(0); 
    }
    
    .btn:disabled { 
      opacity: 0.6; 
      cursor: not-allowed; 
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
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      animation: spin 0.8s linear infinite;
    }

    .btn.secondary {
      background: transparent;
      color: var(--primary1);
      border: 2px solid var(--primary1);
      box-shadow: none;
    }

    .btn.secondary:hover {
      background: var(--primary1);
      color: white;
    }

    .success-animation {
      display: none;
      margin: 16px 0;
    }

    .success-animation.show {
      display: block;
      animation: bounce 1s ease;
    }

    .checkmark {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--success);
      margin: 0 auto 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .checkmark svg {
      width: 24px;
      height: 24px;
      color: white;
    }

    .hidden { display: none; }

    /* Mobile optimizations */
    @media (max-width: 480px) {
      body {
        padding: 12px;
      }
      
      .card {
        padding: 24px 20px;
        border-radius: 16px;
        max-width: 100%;
      }
      
      .title {
        font-size: 20px;
      }
      
      .subtitle {
        font-size: 13px;
      }
      
      .icon {
        width: 56px;
        height: 56px;
      }
      
      .icon svg {
        width: 28px;
        height: 28px;
      }
      
      .btn {
        font-size: 14px;
        padding: 12px 16px;
      }
      
      .token-info {
        font-size: 10px;
        padding: 8px;
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
    }

    /* Landscape mobile */
    @media (max-height: 500px) and (orientation: landscape) {
      body {
        padding: 8px;
      }
      
      .card {
        padding: 16px;
      }
      
      .icon-container {
        margin-bottom: 12px;
      }
      
      .title {
        font-size: 18px;
        margin-bottom: 4px;
      }
      
      .subtitle {
        margin-bottom: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container">
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
      </div>
    </div>

    <h1 class="title">E-posta Doğrulama</h1>
    <p class="subtitle">Hesabınızı aktifleştirmek için e-posta adresinizi doğrulayın</p>

    <div class="token-info" id="tokenInfo">${tokenInfoText}</div>
    <div id="validationMessage" class="alert ${initialMsgClass}">${initialMsg}</div>

    <div class="success-animation" id="successAnimation">
      <div class="checkmark">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      </div>
      <h2 style="color: var(--success); margin: 0; font-size: 18px;">E-posta Doğrulandı!</h2>
      <p style="color: var(--muted); margin: 8px 0 0; font-size: 13px;">Hesabınız başarıyla aktifleştirildi.</p>
    </div>

    <button id="verifyBtn" class="btn">${buttonText}</button>
    <a href="/" class="btn secondary">Ana Sayfaya Dön</a>

    <div id="message" class="alert hidden"></div>
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
        var verifyBtn = document.getElementById('verifyBtn');
        var messageEl = document.getElementById('message');
        var validationMessage = document.getElementById('validationMessage');
        var successAnimation = document.getElementById('successAnimation');
        var iconContainer = document.querySelector('.icon-container');

        function showMessage(text, type) {
          type = type || 'error';
          messageEl.textContent = text || '';
          messageEl.className = 'alert ' + (type === 'success' ? 'success' : 'error');
          messageEl.classList.remove('hidden');
        }

        function showSuccess() {
          successAnimation.classList.add('show');
          iconContainer.style.display = 'none';
          validationMessage.style.display = 'none';
          verifyBtn.style.display = 'none';
          
          // Confetti effect
          createConfetti();
        }

        // Confetti fonksiyonu - Syntax hatası düzeltildi
        function createConfetti() {
          var duration = 2000;
          var end = Date.now() + duration;
          var colors = ['#667eea','#764ba2','#f093fb','#38a169','#4299e1'];
          
          function createPiece() {
            var piece = document.createElement('div');
            piece.style.position = 'fixed';
            piece.style.width = '10px';
            piece.style.height = '10px';
            piece.style.top = '-10px';
            piece.style.left = (Math.random() * window.innerWidth) + 'px';
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.opacity = '0.9';
            piece.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
            piece.style.borderRadius = '50%';
            piece.style.zIndex = '9999';
            piece.style.pointerEvents = 'none';
            document.body.appendChild(piece);
            
            var startTransform = piece.style.transform;
            var endTransform = 'rotate(' + (Math.random() * 360) + 'deg)';
            var endTop = (window.innerHeight + 10) + 'px';
            
            var animation = piece.animate([
              { transform: startTransform, top: '-10px', opacity: 1 },
              { transform: endTransform, top: endTop, opacity: 0 }
            ], { 
              duration: 1500 + Math.random() * 1000, 
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
          
          for (var i = 0; i < 30; i++) {
            setTimeout(createPiece, Math.random() * 500);
          }
        }

        verifyBtn.addEventListener('click', function() {
          messageEl.textContent = '';
          messageEl.className = 'alert hidden';

          if (!token) {
            showMessage('Doğrulama tokenı bulunamadı.', 'error');
            return;
          }

          verifyBtn.classList.add('loading');
          verifyBtn.disabled = true;
          verifyBtn.textContent = 'Doğrulanıyor...';

          fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token })
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
              showSuccess();
              showMessage((result.data && result.data.message) || 'E-posta adresiniz başarıyla doğrulandı!', 'success');
              
              setTimeout(function() {
                window.location.href = '/';
              }, 3000);
            } else {
              var serverMessage = (result.data && (result.data.message || (result.data.error && result.data.error.message) || result.data.error)) || 'E-posta doğrulama başarısız. Lütfen tekrar deneyin.';
              showMessage(serverMessage, 'error');
              verifyBtn.disabled = false;
              verifyBtn.textContent = 'Tekrar Dene';
            }
          })
          .catch(function() {
            showMessage('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Tekrar Dene';
          })
          .finally(function() {
            verifyBtn.classList.remove('loading');
          });
        });
      });
    })();
  </script>
</body>
</html>`;

  res.send(html);
};