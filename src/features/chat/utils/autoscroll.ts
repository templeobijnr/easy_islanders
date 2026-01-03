export function isNearBottom(
  el: { scrollHeight: number; scrollTop: number; clientHeight: number },
  thresholdPx = 80
) {
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
  return distance < thresholdPx;
}




