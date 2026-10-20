/**
 * `?source=sample`: a stand-in camera that films the prototype's base avatar (a full-body photo)
 * with a gentle sway, so the whole path, Decart included, runs on a computer without a webcam,
 * in headless test browsers, and the same way every time for latency comparisons.
 */
import type { MediaDevicesLike } from '../core/session.js';

const WIDTH = 720;
const HEIGHT = 1280;

export function sampleCamera(imageUrl: string): MediaDevicesLike {
  return {
    async getUserMedia() {
      const img = new Image();
      img.src = imageUrl;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw Object.assign(new Error('No 2D canvas'), { name: 'NotReadableError' });
      const h = HEIGHT - 40;
      const w = (h * img.naturalWidth) / img.naturalHeight;
      const t0 = performance.now();
      let frame = 0;
      const draw = (t: number) => {
        const sway = Math.sin((t - t0) / 900) * 10;
        ctx.fillStyle = '#DAD3CB';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.drawImage(img, (WIDTH - w) / 2 + sway, 40, w, h);
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
      const stream = canvas.captureStream(30);
      const track = stream.getVideoTracks()[0];
      if (track) {
        const stop = track.stop.bind(track);
        track.stop = () => {
          cancelAnimationFrame(frame);
          stop();
        };
      }
      return stream;
    },
    async enumerateDevices() {
      return [
        {
          kind: 'videoinput',
          deviceId: 'sample',
          groupId: '',
          label: 'sample',
          toJSON: () => ({}),
        },
      ];
    },
  };
}
