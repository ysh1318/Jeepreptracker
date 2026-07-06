import { Howl } from 'howler';

const soundCache: Record<string, Howl> = {};

export const playSound = (soundName: 'rankup' | 'star', rankTitle?: string) => {
  try {
    let path = '';

    if (soundName === 'star') {
      path = '/sounds/mixkit-bit-war-suprise-item-3162.wav';
    } else if (soundName === 'rankup') {
      const tier = (rankTitle || 'Bronze').toLowerCase();
      
      if (tier.includes('grandmaster') || tier.includes('heroic')) {
        path = '/sounds/mixkit-glitchy-cinematic-suspense-hit-679.wav'; // Grandmaster & Heroic
      } else if (tier.includes('diamond') || tier.includes('platinum')) {
        path = '/sounds/mixkit-cinematic-tribal-flute-2306.wav'; // Diamond & Platinum
      } else if (tier.includes('gold') || tier.includes('silver')) {
        path = '/sounds/mixkit-deep-cinematic-subtle-drum-impact-549.wav'; // Gold & Silver
      } else {
        path = '/sounds/mixkit-quick-bass-switch-2301.wav'; // Bronze
      }
    }

    if (!path) return;

    const cacheKey = `${soundName}_${path}`;

    if (!soundCache[cacheKey]) {
      soundCache[cacheKey] = new Howl({
        src: [path],
        volume: soundName === 'star' ? 0.45 : 0.7,
        html5: true, // Prevents CORS loading blocks on local preview servers
        onloaderror: () => {
          console.warn(`[Audio Engine] Sound file not found or loaded: ${path}`);
        },
        onplayerror: () => {
          console.debug(`[Audio Engine] Audio playback blocked by browser security: ${cacheKey}`);
        }
      });
    }

    // Play the loaded sound file
    soundCache[cacheKey].play();
  } catch (e) {
    console.warn(`[Audio Engine] Failed to play sound: ${soundName} (${rankTitle})`, e);
  }
};
