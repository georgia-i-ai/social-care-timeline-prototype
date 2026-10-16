#!/bin/bash
# Turn a short fictional conversation transcript into a .wav recording, using
# macOS's built-in `say` for text-to-speech, so we can exercise the "record a
# conversation" input mode without a real recording.
#
# The transcript is a plain text file, one utterance per line, in the form:
#
#     Speaker: what they say
#
# - Each distinct speaker is given a different synthetic voice.
# - The "Speaker:" label only picks the voice - it is NOT read aloud, so the
#   names are not spoken as part of the audio.
# - A line with no "Speaker:" prefix continues the previous speaker.
# - Blank lines, and lines starting with `[` or `#`, are ignored (so the
#   SYNTHETIC TEST DATA header in our sample transcripts is skipped).
#
# Taking the transcript as an argument means the same script generates audio
# for any case - just point it at that case's transcript file.
#
# [SYNTHETIC TEST DATA - fictional, for prototype demo purposes only.]
#
# Usage: sh data/samples/generate_audio_sample.sh <transcript.txt> [output.wav]
#        (output defaults to the transcript path with a .wav extension)
#
# macOS only (needs `say`); also needs `ffmpeg` to stitch the utterances into
# one file. Run `say -v '?'` to see which voices are installed on this machine.
set -e

INPUT="$1"
if [ -z "$INPUT" ] || [ ! -f "$INPUT" ]; then
  echo "Usage: $0 <transcript.txt> [output.wav]" >&2
  exit 1
fi

OUTPUT="$2"
if [ -z "$OUTPUT" ]; then
  OUTPUT="${INPUT%.txt}.wav"
fi

command -v say >/dev/null 2>&1 || { echo "This script needs macOS's 'say' command." >&2; exit 1; }
command -v ffmpeg >/dev/null 2>&1 || { echo "This script needs 'ffmpeg' to join the audio." >&2; exit 1; }

# Preferred voices to hand out to speakers, in order of first appearance (en-GB
# where available). Cycles if there are more speakers than voices.
PREFERRED=("Daniel" "Serena" "Karen" "Rishi")

# Keep only the preferred voices that are actually installed, so we never
# silently fall back to a single default voice for everyone.
INSTALLED="$(say -v '?' 2>/dev/null | sed 's/  .*//')"
VOICES=()
for v in "${PREFERRED[@]}"; do
  if printf '%s\n' "$INSTALLED" | grep -qxF "$v"; then
    VOICES+=("$v")
  fi
done
# If fewer than two of the preferred voices exist, top up from whatever else is
# installed so distinct speakers still sound distinct.
if [ "${#VOICES[@]}" -lt 2 ]; then
  while IFS= read -r v; do
    [ -z "$v" ] && continue
    already=0
    for f in "${VOICES[@]}"; do
      if [ "$f" = "$v" ]; then already=1; break; fi
    done
    if [ "$already" -eq 0 ]; then VOICES+=("$v"); fi
    if [ "${#VOICES[@]}" -ge 2 ]; then break; fi
  done <<EOF
$INSTALLED
EOF
fi
if [ "${#VOICES[@]}" -eq 0 ]; then
  echo "No usable 'say' voices found." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

SPEAKERS=()          # distinct speaker labels seen so far, in order
CURRENT_VOICE=""     # voice for the current (most recent) speaker
IDX=0                # utterance counter
LIST="$TMP/list.txt"
: > "$LIST"

# Set CURRENT_VOICE for a speaker, assigning a fresh voice on first sight.
# Mutates the SPEAKERS/CURRENT_VOICE globals, so must be called directly (not
# in a $(...) subshell, or the assignments would be lost).
assign_voice() {
  name="$1"
  i=0
  for s in "${SPEAKERS[@]}"; do
    if [ "$s" = "$name" ]; then
      CURRENT_VOICE="${VOICES[$((i % ${#VOICES[@]}))]}"
      return
    fi
    i=$((i + 1))
  done
  SPEAKERS+=("$name")
  CURRENT_VOICE="${VOICES[$(((${#SPEAKERS[@]} - 1) % ${#VOICES[@]}))]}"
}

while IFS= read -r line || [ -n "$line" ]; do
  # Trim surrounding whitespace.
  trimmed="$(printf '%s' "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  [ -z "$trimmed" ] && continue
  case "$trimmed" in
    \[* | \#*) continue ;;
  esac

  text="$trimmed"
  case "$trimmed" in
    *:*)
      speaker="${trimmed%%:*}"
      rest="${trimmed#*:}"
      # Only treat the bit before the colon as a speaker label if it is short
      # (a name or role) - otherwise it is dialogue that happens to contain a
      # colon, so leave the whole line as spoken text.
      words="$(printf '%s' "$speaker" | wc -w | tr -d ' ')"
      if [ "$words" -ge 1 ] && [ "$words" -le 3 ]; then
        assign_voice "$speaker"
        text="$(printf '%s' "$rest" | sed -e 's/^[[:space:]]*//')"
      fi
      ;;
  esac

  [ -z "$CURRENT_VOICE" ] && CURRENT_VOICE="${VOICES[0]}"
  [ -z "$text" ] && continue

  clip="$TMP/$(printf '%03d' "$IDX").aiff"
  say -v "$CURRENT_VOICE" -o "$clip" "$text"
  echo "file '$clip'" >> "$LIST"
  IDX=$((IDX + 1))
done < "$INPUT"

if [ "$IDX" -eq 0 ]; then
  echo "No spoken lines found in $INPUT" >&2
  exit 1
fi

# Concatenate the per-utterance clips into one mono 16 kHz WAV (a format Whisper
# is happy with).
ffmpeg -y -loglevel error -f concat -safe 0 -i "$LIST" -ac 1 -ar 16000 -acodec pcm_s16le "$OUTPUT"
echo "Wrote $OUTPUT ($IDX utterances)"
