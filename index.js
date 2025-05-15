const venom = require('venom-bot');
const { google } = require('googleapis');
const { GOOGLE_API_KEY, GOOGLE_SHEET_ID, WHATSAPP_NUMBER } = require('./env');

async function getSheetData() {
  const sheets = google.sheets({ version: 'v4', auth: GOOGLE_API_KEY });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: 'Sheet1!A2:D', // Ajuste o range conforme sua planilha
  });
  return res.data.values || [];
}

async function main() {
  const client = await venom.create({
    session: 'session-name',
    multidevice: true
  });

  const contacts = await getSheetData();

  let sentCount = 0;

  for (let i = 0; i < contacts.length; i++) {
    const [nome, telefone, frase, status] = contacts[i];

    if (status && status.toLowerCase() === 'enviado') {
      continue; // pula contatos já enviados
    }

    const number = telefone.replace(/\D/g, '') + '@c.us';
    const message = `Olá ${nome}, ${frase}`;

    try {
      await client.sendText(number, message);
      console.log(`Mensagem enviada para ${nome} (${telefone})`);
      sentCount++;

      // Atualizar a planilha com status "enviado"
      await updateStatus(i + 2, 'Enviado'); // linha da planilha (começa em 2)
    } catch (error) {
      console.error(`Erro ao enviar para ${nome}:`, error);
    }

    if (sentCount % 30 === 0) {
      console.log('Pausa de 20 minutos para evitar spam...');
      await sleep(20 * 60 * 1000);
    } else {
      await sleep(60 * 1000);
    }
  }

  console.log('Envio concluído.');
}

async function updateStatus(row, status) {
  const sheets = google.sheets({ version: 'v4', auth: GOOGLE_API_KEY });
  await sheets.spreadsheets.values.update({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `Sheet1!D${row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[status]]
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
