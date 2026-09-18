#!/bin/sh
# Generate a short fictional social-worker/parent phone conversation using
# macOS's built-in `say`, so the 'record a conversation' mode has something to
# demo without needing a real recording. macOS only.
#
# Simplification: read by a single voice (speaker labels are spoken aloud as
# part of the text) rather than two distinct synthetic voices - good enough to
# exercise transcription + extraction for a tinkering demo.
#
# [SYNTHETIC TEST DATA - fictional, for prototype demo purposes only.]
#
# Usage: sh data/samples/generate_audio_sample.sh

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

TEXT="Social worker: Hi Sarah, it's Priya from the family support team, is now still an okay time to talk? It's the twentieth of March today, I know we said we'd catch up around now.
Sarah: Yeah, now's fine, the kids are having a nap, well, Millie's not really napping anymore but she's in her room.
Social worker: How's things been since the health visitor came round?
Sarah: Honestly, a bit better, I got the heating sorted, my brother helped me top up the meter. Still tight for money though, especially since James stopped sending anything in February.
Social worker: And how's Millie doing at home, the school mentioned she's seemed a bit quieter lately.
Sarah: She has been quiet, yeah. She spends a lot of time on her own in her room. I think she picks up on when I'm stressed, if I'm honest.
Social worker: That's really helpful to know, thank you for being open about it. Is there anything you feel like you need help with right now?
Sarah: Maybe just someone to talk to about money, and honestly just having someone check in helps.
Social worker: Okay, I'll get you a number for the welfare rights team, and let's set up a home visit for early April to see how things are going."

say -o "$DIR/social_worker_call.aiff" "$TEXT"
afconvert -f WAVE -d LEI16 "$DIR/social_worker_call.aiff" "$DIR/social_worker_call.wav"
rm "$DIR/social_worker_call.aiff"
echo "Wrote $DIR/social_worker_call.wav"
