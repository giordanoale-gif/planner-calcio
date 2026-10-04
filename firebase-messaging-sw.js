/* Service Worker per le notifiche push (Firebase Cloud Messaging).
   Deve stare come file FISICO nella root del sito (stessa cartella di index.html),
   non puo' essere incluso dentro l'HTML: i Service Worker vanno sempre serviti
   come file a parte, con questo nome esatto, perche' Firebase lo cerca per nome
   di default quando il sito registra la messaggistica in background. */

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Stessa configurazione del progetto usata in index.html.
firebase.initializeApp({
  apiKey: "AIzaSyDOJ0jsZvgSDrwrd4Mz4lFQLSqgxDP05nU",
  authDomain: "football-planner-a76cd.firebaseapp.com",
  projectId: "football-planner-a76cd",
  storageBucket: "football-planner-a76cd.firebasestorage.app",
  messagingSenderId: "784019927126",
  appId: "1:784019927126:web:466143a4948a6d30c40bf7"
});

const messaging = firebase.messaging();

// Notifica mostrata quando l'app NON e' in primo piano (schermo spento, altra app aperta, ecc.)
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Football Planner PRO";
  const body = (payload.notification && payload.notification.body) || "";
  self.registration.showNotification(title, {
    body,
    icon: "https://cdn-icons-png.flaticon.com/512/53/53283.png",
    badge: "https://cdn-icons-png.flaticon.com/512/53/53283.png",
    data: { url: self.location.origin + self.registration.scope }
  });
});

// Al tap sulla notifica, apri (o porta in primo piano) il sito.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.indexOf(targetUrl) === 0 && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
