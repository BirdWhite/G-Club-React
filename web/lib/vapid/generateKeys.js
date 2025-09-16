// VAPID 키 생성 스크립트
// 터미널에서 `node web/lib/vapid/generateKeys.js` 실행

const webpush = require('web-push');

// VAPID 키 쌍 생성
const vapidKeys = webpush.generateVAPIDKeys();

console.log('🔑 VAPID 키가 생성되었습니다!');
console.log('');
console.log('📋 .env.local 파일에 다음 내용을 추가하세요:');
console.log('');
console.log('# VAPID 키 설정');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:your-email@example.com');
console.log('');
console.log('⚠️  주의: VAPID_PRIVATE_KEY는 절대 클라이언트에 노출하면 안됩니다!');
console.log('✅  NEXT_PUBLIC_VAPID_PUBLIC_KEY만 클라이언트에서 사용됩니다.');

module.exports = vapidKeys;
