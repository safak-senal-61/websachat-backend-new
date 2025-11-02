/**
 * @swagger
 * tags:
 *   - name: Admin Invitations
 *     description: Admin davet kodu oluşturma ve kabul etme uçları
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminInviteCreateRequest:
 *       type: object
 *       required: [email]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Davet gönderilecek e-posta adresi
 *           example: admin.candidate@example.com
 *     AdminInviteCreateResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Admin invite created successfully
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             email:
 *               type: string
 *               format: email
 *             status:
 *               type: string
 *               enum: [PENDING, ACCEPTED, REVOKED, EXPIRED]
 *             expiresAt:
 *               type: string
 *               format: date-time
 *     AdminInviteAcceptRequest:
 *       type: object
 *       required: [token]
 *       properties:
 *         token:
 *           type: string
 *           description: Davet token değeri
 *           example: 0f14a1f2c9f44f0ebc2a2f65e8d910f2
 */

/**
 * @swagger
 * /api/admin/invitations:
 *   post:
 *     summary: Admin daveti oluştur (sadece admin)
 *     description: Belirtilen e-posta adresine admin daveti oluşturur ve davet e-postası gönderir.
 *     tags: [Admin Invitations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminInviteCreateRequest'
 *     responses:
 *       201:
 *         description: Davet başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminInviteCreateResponse'
 *       400:
 *         description: Doğrulama hatası
 *       401:
 *         description: Yetkilendirme gerekli
 *       403:
 *         description: Yetki yok (admin değil)
 *       409:
 *         description: Bu e-posta için aktif davet zaten mevcut
 */

/**
 * @swagger
 * /api/auth/admin/invite/accept:
 *   post:
 *     summary: Admin davetini kabul et
 *     description: Kullanıcı, kendisine gönderilen davet token’ı ile admin rolünü kabul eder. Kullanıcının e-postası davetteki e-posta ile eşleşmelidir.
 *     tags: [Admin Invitations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminInviteAcceptRequest'
 *     responses:
 *       200:
 *         description: Davet kabul edildi, kullanıcı ADMIN olarak yükseltildi
 *       400:
 *         description: Davet beklemede değil veya geçersiz
 *       401:
 *         description: Yetkilendirme gerekli
 *       403:
 *         description: Davet e-postası kullanıcı e-postası ile eşleşmiyor
 *       404:
 *         description: Davet bulunamadı
 *       410:
 *         description: Davet süresi dolmuş
 */