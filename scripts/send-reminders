/**
 * Manda un promemoria push 24 ore prima di ogni partita della Trevigliese
 * (campionato + amichevoli/tornei aggiunti a mano), usando Firebase Cloud
 * Messaging. Pensato per girare da un workflow GitHub Actions schedulato
 * (nessuna Cloud Function, nessun piano a pagamento necessario).
 *
 * Variabili d'ambiente richieste:
 *   FIREBASE_SERVICE_ACCOUNT  -> contenuto JSON della chiave dell'account di
 *                                servizio Firebase (vedi istruzioni in fondo
 *                                al file index.html / README)
 */

const admin = require('firebase-admin');

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountRaw) {
  console.error('Manca la variabile FIREBASE_SERVICE_ACCOUNT: impossibile continuare.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(serviceAccountRaw))
});

const db = admin.firestore();
const FINESTRA_ORE = 24; // avvisa se la partita è entro questa finestra

// Calendario campionato: duplicato qui apposta, perché questo script gira in
// GitHub Actions e non ha accesso al JS dentro index.html. Se il calendario
// ufficiale cambia, va aggiornato in entrambi i posti.
const MATCHES_CAMPIONATO = [
  { giornata:1, date:"2026-10-03T14:30", title:"Or. Calvenzano – Trevigliese" },
  { giornata:2, date:"2026-10-10T14:30", title:"Trevigliese – Colognese" },
  { giornata:3, date:"2026-10-17T14:30", title:"Accademia PBC – Trevigliese" },
  { giornata:4, date:"2026-10-24T14:30", title:"Trevigliese – Virtusciseranobg B" },
  { giornata:5, date:"2026-10-31T14:30", title:"A.C.O.S. Treviglio – Trevigliese" },
  { giornata:6, date:"2026-11-07T14:30", title:"Trevigliese – Oratorio Cologno" },
  { giornata:7, date:"2026-11-14T14:00", title:"Caravaggio – Trevigliese" },
  { giornata:8, date:"2026-11-21T14:30", title:"Trevigliese – Brignanese" },
  { giornata:9, date:"2026-11-29T16:00", title:"Atalanta B – Trevigliese" }
];

async function getEventiExtra() {
  const snap = await db.collection('trevigliese').doc('risultati').get();
  if (!snap.exists) return [];
  const data = snap.data().data || {};
  return data.extra || [];
}

async function getTokens() {
  const snap = await db.collection('push_tokens').get();
  return snap.docs.map(d => d.data().token).filter(Boolean);
}

async function giaNotificata(key) {
  const snap = await db.collection('notifiche_inviate').doc(key).get();
  return snap.exists;
}

async function segnaNotificata(key) {
  await db.collection('notifiche_inviate').doc(key).set({
    inviata: true,
    quando: admin.firestore.FieldValue.serverTimestamp()
  });
}

function costruisciVoci(eventiExtra) {
  const voci = MATCHES_CAMPIONATO.map(m => ({
    key: 'g' + m.giornata,
    titolo: m.title,
    dataOra: new Date(m.date),
    dettaglio: `Giornata ${m.giornata}`
  }));

  eventiExtra.forEach(ev => {
    if (!ev.data) return; // senza data non possiamo calcolare le 24h prima, saltiamo
    const dataOra = new Date(ev.data + 'T' + (ev.ora || '12:00') + ':00');
    voci.push({
      key: ev.id,
      titolo: ev.titolo,
      dataOra,
      dettaglio: ev.tipo === 'amichevole' ? 'Amichevole' : 'Torneo'
    });
  });

  return voci;
}

async function main() {
  const now = new Date();
  const limite = new Date(now.getTime() + FINESTRA_ORE * 3600 * 1000);

  const eventiExtra = await getEventiExtra();
  const voci = costruisciVoci(eventiExtra);

  const daNotificare = [];
  for (const voce of voci) {
    if (voce.dataOra <= now) continue;           // partita già passata/in corso
    if (voce.dataOra > limite) continue;         // troppo lontana nel tempo
    if (await giaNotificata(voce.key)) continue; // promemoria già inviato
    daNotificare.push(voce);
  }

  if (daNotificare.length === 0) {
    console.log('Nessun promemoria da inviare in questo giro.');
    return;
  }

  const tokens = await getTokens();
  if (tokens.length === 0) {
    console.log('Nessun dispositivo registrato per le notifiche — salto l\'invio ma segno comunque come notificato.');
  }

  for (const voce of daNotificare) {
    const ora = voce.dataOra.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
    const giorno = voce.dataOra.toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' });

    if (tokens.length > 0) {
      const message = {
        notification: {
          title: 'Domani si gioca! ⚽',
          body: `${voce.dettaglio}: ${voce.titolo} — ${giorno} ore ${ora}`
        },
        tokens
      };
      try {
        const resp = await admin.messaging().sendEachForMulticast(message);
        console.log(`Promemoria "${voce.titolo}" inviato: ${resp.successCount} ok, ${resp.failureCount} falliti.`);
      } catch (e) {
        console.error(`Errore inviando il promemoria per "${voce.titolo}":`, e);
      }
    }
    await segnaNotificata(voce.key);
  }
}

main().then(() => process.exit(0)).catch(e => {
  console.error('Errore generale nello script dei promemoria:', e);
  process.exit(1);
});
