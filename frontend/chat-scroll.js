/* Purpose: keep a conversation at its latest message after layout settles.
   Called by the Home and agent chat UI in index.html. Uses browser animation
   frames and ResizeObserver; exported for isolated Node regression tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChatScroll = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  function create(log, content = log) {
    const view = log.ownerDocument.defaultView;
    const visible = () => log.getClientRects().length > 0 && log.clientHeight > 0;
    const nearBottom = () => log.scrollHeight - log.clientHeight - log.scrollTop <= 48;
    let following = !visible() || nearBottom();
    let forced = false;
    let frame = null;
    let destroyed = false;
    let writing = false;

    function schedule(force = false) {
      if (destroyed) return;
      forced ||= force;
      if (frame !== null || (!forced && !following)) return;
      frame = view.requestAnimationFrame(() => {
        frame = null;
        // Hidden Home and agent logs have no usable layout. Keep an explicit
        // request until the caller or ResizeObserver schedules their return.
        if (destroyed || !visible() || (!forced && !following)) return;
        writing = true;
        log.scrollTop = Math.max(0, log.scrollHeight - log.clientHeight);
        following = true;
        forced = false;
        writing = false;
      });
    }

    function onScroll() {
      // A new message can change dimensions before the queued frame runs.
      // That intermediate scroll position must not cancel its explicit jump.
      if (destroyed || writing || forced || !visible()) return;
      following = nearBottom();
    }

    log.addEventListener('scroll', onScroll, { passive: true });
    const observer = typeof view.ResizeObserver === 'function'
      ? new view.ResizeObserver(() => schedule()) : null;
    observer?.observe(log);
    if (content !== log) observer?.observe(content);

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frame !== null) view.cancelAnimationFrame(frame);
      frame = null;
      observer?.disconnect();
      log.removeEventListener('scroll', onScroll);
    }

    return { schedule, destroy };
  }

  return { create };
});
