const item = $input.first();
const body = item.json.body || {};
const docKey = String(body.doc_key || '').trim();
const simulateFail = String(body.simulate_fail || '').trim();
const titles = { 'pricelist': 'מחירון', 'order-terms': 'תנאי הזמנה' };
let fileName = '';
let text = '';
const bin = item.binary || {};
const key = Object.keys(bin)[0];
if (key) {
  fileName = bin[key].fileName || '';
  const buf = await this.helpers.getBinaryDataBuffer(0, key);
  text = buf.toString('utf8');
} else if (typeof body.content === 'string') {
  fileName = String(body.file_name || '');
  text = body.content;
}
let error = '';
if (!titles[docKey]) error = 'סוג מסמך לא מוכר. אפשר להעלות מחירון או תנאי הזמנה.';
else if (!fileName && !text) error = 'לא התקבל קובץ.';
else if (!/\.(md|txt)$/i.test(fileName)) error = 'אפשר להעלות רק קובצי md או txt.';
else if (!text.trim()) error = 'הקובץ ריק.';
else if (/[\uFFFD\u0000]/.test(text)) error = 'הקובץ לא בקידוד UTF-8. שמרו אותו מחדש כ-UTF-8 ונסו שוב.';
else if (!['', 'processing', 'verifying'].includes(simulateFail)) error = 'ערך בדיקה לא מוכר.';
return [{ json: { valid: !error, error, doc_key: docKey, doc_title: titles[docKey] || '', file_name: fileName, text, simulate_fail: simulateFail } }];
