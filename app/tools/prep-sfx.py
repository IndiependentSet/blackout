#!/usr/bin/env python3
"""
Normalise the recorded sound effects the game plays.

A game sound has to land on the frame the player tapped, so the recording
can't start with half a second of room tone: this trims the silence off both
ends, evens the takes out to a common peak so one deployment isn't twice as
loud as the next, and writes the result next to index.js. Only the standard
library is used — the audio is PCM in, PCM out, so nothing is re-encoded.

    python3 app/tools/prep-sfx.py

Reads  app/src/assets/sfx/raw/<name>.wav    (a leading _ is skipped)
Writes app/src/assets/sfx/<name>.wav
"""
import array
import pathlib
import sys
import wave

HERE = pathlib.Path(__file__).resolve().parent
SFX = HERE.parent / 'src' / 'assets' / 'sfx'
RAW = SFX / 'raw'

WINDOW = 0.010    # seconds the level is measured over
FLOOR = 0.004     # quieter than this is room tone, not the effect
CORE = 0.20       # the effect proper is where the level reaches this much of its loudest
ATTACK = 0.02     # ...and its attack is whatever runs into that without dropping below this
LEAD = 0.004      # seconds kept before the attack, so the first crack isn't clipped
TAIL = 0.060      # ...and after the last, so the decay isn't cut off
PEAK = 0.9        # what every take is normalised to


def levels(frames, channels, step):
    """RMS of each window, as a fraction of full scale."""
    out = []
    for i in range(0, len(frames) // channels, step):
        seg = frames[i * channels:(i + step) * channels]
        if not len(seg):
            break
        out.append((sum(s * s for s in seg) / len(seg)) ** 0.5 / 32768)
    return out


def bounds(frames, channels, rate):
    """The window of frames the effect itself occupies.

    Taken relative to the loudest part rather than off an absolute floor: these
    recordings open with the fading tail of the take before them, and a plain
    noise-floor scan starts the sound on that tail instead of on the crack —
    half a second of nothing, right where the sound is meant to hit.
    """
    step = max(1, int(WINDOW * rate))
    lv = levels(frames, channels, step)
    n = len(frames) // channels
    if not lv or max(lv) <= FLOOR:
        return 0, n

    loudest = max(lv)
    core = next(i for i, v in enumerate(lv) if v >= CORE * loudest)
    while core > 0 and lv[core - 1] >= max(FLOOR, ATTACK * loudest):
        core -= 1
    last = max(i for i, v in enumerate(lv) if v >= FLOOR)

    start = max(0, core * step - int(LEAD * rate))
    end = min(n, (last + 1) * step + int(TAIL * rate))
    return start, end


def prep(src, dst):
    with wave.open(str(src)) as w:
        if w.getsampwidth() != 2:
            sys.exit('%s: expected 16-bit PCM' % src.name)
        channels, rate = w.getnchannels(), w.getframerate()
        frames = array.array('h')
        frames.frombytes(w.readframes(w.getnframes()))

    start, end = bounds(frames, channels, rate)
    cut = frames[start * channels:end * channels]

    peak = max((abs(s) for s in cut), default=0)
    if peak:
        gain = PEAK * 32767 / peak
        for i, s in enumerate(cut):
            cut[i] = max(-32768, min(32767, int(round(s * gain))))

    with wave.open(str(dst), 'w') as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(cut.tobytes())

    print('%-16s %.2fs -> %.2fs  peak x%.2f' % (
        src.name, len(frames) / channels / rate, len(cut) / channels / rate,
        (PEAK * 32767 / peak) if peak else 1))


def main():
    if not RAW.is_dir():
        sys.exit('no raw/ next to %s' % SFX)
    for src in sorted(RAW.glob('*.wav')):
        if src.name.startswith('_'):
            continue
        prep(src, SFX / src.name)


if __name__ == '__main__':
    main()
