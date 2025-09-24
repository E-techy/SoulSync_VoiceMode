// src/utils/convert_text_to_speech.ts

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Buffer } from "buffer";

/**
 * Converts text to speech using the Gemini API and returns audio data.
 *
 * ⚠️ Note: This function only supports the `gemini-2.5-flash-preview-tts` model.
 * If another model is passed, it will return an error response.
 *
 * This function does NOT save the audio file on the server. Instead,
 * it returns the audio as:
 * - `audioBase64` → string for client-side use (e.g., send in API response)
 * - `audioBuffer` → Node.js Buffer (server-side processing if needed)
 *
 * The client can reconstruct a WAV Blob from `audioBase64` and play it in a browser.
 *
 * @param GEMINI_API_KEY - API key for Gemini service (required).
 * @param textMessage - The text message to be converted into speech (required).
 * @param modelName - Gemini TTS model name (must be "gemini-2.5-flash-preview-tts").
 * @param outputAudioVoiceName - Name of the prebuilt voice to use (default: "Zephyr").
 * @param outputAudioChannels - Number of audio channels (default: 1).
 * @param outputAudioRate - Audio sample rate in Hz (default: 24000).
 * @param outputAudioSampleWidth - Width of each audio sample in bytes (default: 2 → 16-bit).
 * @param outputAudioBitDepth - Bit depth of the audio file (default: 16).
 *
 * @returns
 * - `{ success: true, audioBase64, audioBuffer, audioConfig }` if successful
 * - `{ success: false, error }` if any error occurs
 */
export async function convertTextToSpeech(
  GEMINI_API_KEY: string,
  textMessage: string,
  modelName: string = "gemini-2.5-flash-preview-tts",
  outputAudioVoiceName: string = "Zephyr",
  outputAudioChannels: number = 1,
  outputAudioRate: number = 24000,
  outputAudioSampleWidth: number = 2,
  outputAudioBitDepth: number = 16
): Promise<
  | {
      success: true;
      audioBase64: string;
      audioBuffer: Buffer;
      audioConfig: {
        channels: number;
        sampleRate: number;
        sampleWidth: number;
        bitDepth: number;
        voice: string;
      };
    }
  | { success: false; error: string }
> {
  try {
    // ✅ Input validation
    if (!GEMINI_API_KEY) {
      return { success: false, error: "Missing keys" };
    }
    if (!textMessage) {
      return { success: false, error: "Missing textMessage." };
    }

    // ✅ Only allow specific TTS model
    if (modelName !== "gemini-2.5-flash-preview-tts") {
      return {
        success: false,
        error: "Internal Server Error, Try again after some time",
      };
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: textMessage }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: outputAudioVoiceName },
          },
        },
      },
    });

    // ✅ Extract audio data
    const data: string | undefined =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!data) {
      return { success: false, error: "No audio data received from the API." };
    }

    const audioBuffer: Buffer = Buffer.from(data, "base64");

    return {
      success: true,
      audioBase64: data,
      audioBuffer,
      audioConfig: {
        channels: outputAudioChannels,
        sampleRate: outputAudioRate,
        sampleWidth: outputAudioSampleWidth,
        bitDepth: outputAudioBitDepth,
        voice: outputAudioVoiceName,
      },
    };
  } catch {
    return {
      success: false,
      error: "Failed to generate audio.",
    };
  }
}


import wav from "wav";

/**
 * Saves PCM audio data to a proper WAV file.
 * @param filename - Path to save the WAV file
 * @param pcmData - PCM audio data buffer
 * @param channels - Number of audio channels (default: 1)
 * @param rate - Sample rate in Hz (default: 24000)
 * @param sampleWidth - Sample width in bytes (default: 2 → 16-bit)
 */
async function saveWaveFile(
  filename: string,
  pcmData: Buffer,
  channels: number = 1,
  rate: number = 24000,
  sampleWidth: number = 2
): Promise<void> {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, {
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    writer.on("finish", resolve);
    writer.on("error", reject);

    writer.write(pcmData);
    writer.end();
  });
}

/**
 * Example test function.
 * Calls the TTS function, saves the audio as a proper WAV file using `wav` library.
 */
async function testTTS() {
  const result = await convertTextToSpeech(
    process.env.GEMINI_API_KEY || "",
    "kya kar rhi ho meenakshi"
  );

  if (result.success) {
    console.log("✅ Audio generated successfully.");
    console.log("Audio config:", result.audioConfig);

    const fileName = "test_output.wav";
    await saveWaveFile(
      fileName,
      result.audioBuffer,
      result.audioConfig.channels,
      result.audioConfig.sampleRate,
      result.audioConfig.sampleWidth
    );

    console.log(`🎵 Audio file saved as "${fileName}". You can now play it.`);
  } else {
    console.error("❌ Error:", result.error);
  }
}

// Run demo if executed directly
if (require.main === module) {
  testTTS();
}