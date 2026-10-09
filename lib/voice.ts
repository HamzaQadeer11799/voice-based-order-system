// The voice line wants 16000 pieces of sound each second.
// The spoken reply comes back as 24000 pieces each second.
const voiceRate = 16000;
const replyRate = 24000;

let speaker: AudioContext | null = null;
let micContext: AudioContext | null = null;
let nextTime = 0;
const playing: AudioBufferSourceNode[] = [];

export function prepareSound() {
  if (!speaker || speaker.state === "closed") {
    speaker = new AudioContext();
  }

  if (!micContext || micContext.state === "closed") {
    micContext = new AudioContext();
  }

  void speaker.resume();
  void micContext.resume();
}

export async function openMic() {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
    },
  });
}

export function startListening(
  stream: MediaStream,
  sendSound: (soundText: string) => void,
) {
  if (!micContext || micContext.state === "closed") {
    micContext = new AudioContext();
  }

  const context = micContext;
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const quiet = context.createGain();
  quiet.gain.value = 0;

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    const sound = makeVoiceSound(input, context.sampleRate);
    sendSound(soundToText(sound));
  };

  source.connect(processor);
  processor.connect(quiet);
  quiet.connect(context.destination);
  void context.resume();

  return () => {
    processor.disconnect();
    source.disconnect();
    quiet.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    void context.close();
    micContext = null;
  };
}

export function playReply(soundText: string) {
  if (!speaker || speaker.state === "closed") {
    speaker = new AudioContext();
  }

  const context = speaker;
  const bytes = textToBytes(soundText);
  const view = new Int16Array(
    bytes.buffer,
    bytes.byteOffset,
    Math.floor(bytes.byteLength / 2),
  );
  const floats = new Float32Array(view.length);

  for (let i = 0; i < view.length; i++) {
    floats[i] = view[i] / 32768;
  }

  const buffer = context.createBuffer(1, floats.length, replyRate);
  buffer.copyToChannel(floats, 0);

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);

  const startAt = Math.max(context.currentTime + 0.05, nextTime);
  source.start(startAt);
  nextTime = startAt + buffer.duration;
  playing.push(source);

  source.onended = () => {
    const index = playing.indexOf(source);
    if (index >= 0) {
      playing.splice(index, 1);
    }
  };
}

export function stopReply() {
  for (const source of playing) {
    try {
      source.stop();
    } catch {
      // This piece of sound may already have finished.
    }
  }

  playing.length = 0;
  nextTime = 0;
}

function makeVoiceSound(input: Float32Array, fromRate: number) {
  const step = fromRate / voiceRate;
  const count = Math.max(1, Math.floor(input.length / step));
  const sound = new Int16Array(count);

  for (let i = 0; i < count; i++) {
    const index = Math.min(input.length - 1, Math.floor(i * step));
    const value = Math.max(-1, Math.min(1, input[index]));
    sound[i] = value < 0 ? value * 32768 : value * 32767;
  }

  return sound;
}

function soundToText(sound: Int16Array) {
  const bytes = new Uint8Array(sound.buffer, sound.byteOffset, sound.byteLength);
  let text = "";

  for (let i = 0; i < bytes.length; i++) {
    text += String.fromCharCode(bytes[i]);
  }

  return btoa(text);
}

function textToBytes(text: string) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
