/* ===== Router hooks and boot ===== */
function onRoute() {
  const u = me(), r = currentRoute();
  if (u && u.role === 'alumni' && r.name === 'a' && r.a === 'inbox') {
    if (SERVER) {
      if (S.intros.some((i) => i.alumnusId === u.entityId && i.status === 'sent')) rpcCall('mark_intros_seen').then(() => refresh(true)).catch(() => {});
    } else {
      let changed = false;
      S.intros.forEach((i) => { if (i.alumnusId === u.entityId && i.status === 'sent') { i.status = 'seen'; changed = true; } });
      if (changed) save();
    }
  }
  render();
  window.scrollTo(0, 0);
}
(function boot() {
  const root = document.getElementById('app');
  if (!root) return;
  if (SERVER) { initServer(); return; }
  if (DEMO_OK) save();
  onRoute();
})();
