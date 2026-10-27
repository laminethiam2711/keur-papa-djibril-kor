// Application Windows de l'École franco-arabe Keur Papa Djibril Kor.
// Elle ouvre le site en ligne dans sa propre fenêtre : elle est donc toujours à jour,
// sans rien réinstaller quand le site change.
const { app, BrowserWindow, shell, Menu, session } = require('electron');
const path = require('path');

const SITE = 'https://laminethiam2711.github.io/keur-papa-djibril-kor/';
// Version « Administration » : s'ouvre directement sur l'espace de gestion (voir package.json → kpdkMode)
const ADMIN = require('./package.json').kpdkMode === 'admin';
const DEPART = ADMIN ? SITE + 'admin' : SITE;
const TITRE = ADMIN ? 'Keur Papa Djibril Kor — Administration' : 'Keur Papa Djibril Kor';
const ORIGINE = new URL(SITE).origin;
const estDuSite = (url) => url.startsWith(SITE) || url === ORIGINE + '/keur-papa-djibril-kor';
const estSupabase = (url) => /^https:\/\/[a-z0-9]+\.supabase\.co\//.test(url);

function reglerFenetre(win) {
  // Liens externes (WhatsApp, téléphone, cartes…) : navigateur ou application du système
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (estDuSite(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 1100, height: 900, icon: path.join(__dirname, 'build/icon.png'), autoHideMenuBar: true } };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!estDuSite(url) && !estSupabase(url)) { e.preventDefault(); shell.openExternal(url); }
  });
  win.webContents.on('did-create-window', (enfant) => reglerFenetre(enfant));
}

function creerFenetre() {
  const win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 360, minHeight: 500,
    title: TITRE,
    icon: path.join(__dirname, 'build/icon.png'),
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, spellcheck: true },
  });
  reglerFenetre(win);
  // Garder la connexion : la session (stockée dans le navigateur interne) est écrite
  // sur le disque avant la fermeture, sinon il faudrait retaper l'e-mail et le mot de passe.
  win.on('close', () => session.defaultSession.flushStorageData());
  if (ADMIN) win.on('page-title-updated', (e) => { e.preventDefault(); win.setTitle(TITRE); });
  // Pas de connexion Internet : page d'aide avec un bouton « Réessayer »
  win.webContents.on('did-fail-load', (_e, code, _desc, url, principal) => {
    if (principal && code !== -3) win.loadFile(path.join(__dirname, 'hors-ligne.html'), { query: { url } });
  });
  win.loadURL(DEPART);
}

// Une seule fenêtre principale à la fois
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Affichage', submenu: [
        { label: ADMIN ? 'Accueil administration' : 'Accueil', click: (_m, w) => w && w.loadURL(DEPART) },
        { label: 'Actualiser', role: 'reload' }, { label: 'Zoom +', role: 'zoomIn' }, { label: 'Zoom −', role: 'zoomOut' },
        { label: 'Taille normale', role: 'resetZoom' }, { type: 'separator' }, { label: 'Plein écran', role: 'togglefullscreen' },
      ] },
    ]));
    creerFenetre();
    // Sécurité : écrire aussi la session régulièrement (coupure de courant, arrêt du PC…)
    setInterval(() => session.defaultSession.flushStorageData(), 30000);
  });
  app.on('before-quit', () => session.defaultSession.flushStorageData());
  app.on('window-all-closed', () => app.quit());
}
