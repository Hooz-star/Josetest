'use client';

import { useState, useRef } from 'react';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Error accessing microphone. Please ensure you have granted permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleSendRecording = async () => {
    if (!audioURL) return;

    try {
      setIsLoading(true);
      
      // Get the recorded audio blob
      const audioBlob = await fetch(audioURL).then(r => r.blob());
      
      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      // Send to webhook
      const response = await fetch('https://hooz.app.n8n.cloud/webhook-test/voicetoimage', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to send recording');
      }

      const data = await response.json();
      setResultUrl(data.url);
    } catch (error) {
      console.error('Error sending recording:', error);
      alert('Failed to send recording. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-md mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center">Voice Recorder</h1>
        
        <div className="space-y-4">
          <div className="flex justify-center gap-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                disabled={isLoading}
              >
                Record
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                disabled={isLoading}
              >
                Stop Recording
              </button>
            )}
            
            {audioURL && (
              <button
                onClick={handleSendRecording}
                className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Recording'}
              </button>
            )}
          </div>

          {audioURL && (
            <div className="mt-4">
              <audio src={audioURL} controls className="w-full" />
            </div>
          )}

          {resultUrl && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm font-medium">Result URL:</p>
              <a 
                href={resultUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {resultUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
