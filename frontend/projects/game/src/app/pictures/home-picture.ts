/** Home's still picture of the classroom, shown until the 3D classroom is drawn over it. */
export const CLASSROOM_PICTURE = 'img/scene-classroom.jpg';

/**
 * Home's largest content is its still picture (L2-047 criterion 4). When the game opens at
 * Home's address, the picture is asked for as the game starts, beside Home's code, rather than
 * once Home's code has arrived; Home's own request then finds it in the browser's memory
 * (docs/adr/0038). The hint goes once the picture has come or failed.
 */
export function askForHomePicture(document: Document): void {
  const home = new URL(document.baseURI).pathname;
  if (document.location.pathname !== home) return;
  const hint = document.createElement('link');
  hint.rel = 'preload';
  hint.as = 'image';
  hint.href = CLASSROOM_PICTURE;
  hint.fetchPriority = 'high';
  const done = () => hint.remove();
  hint.addEventListener('load', done, { once: true });
  hint.addEventListener('error', done, { once: true });
  document.head.append(hint);
}
