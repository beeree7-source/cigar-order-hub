'use client';

import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, Check } from 'lucide-react';

interface DocumentScannerProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
}

export default function DocumentScanner({ onCapture, onClose }: DocumentScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
      setIsCapturing(false);
    }
  }, [webcamRef]);

  const retake = () => {
    setImgSrc(null);
    setIsCapturing(true);
  };

  const accept = () => {
    if (imgSrc) {
      onCapture(imgSrc);
      onClose();
    }
  };

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: 'environment' // Use rear camera on mobile
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Document Scanner</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative bg-gray-900 rounded-lg overflow-hidden">
          {!imgSrc ? (
            <>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="w-full"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <button
                  onClick={capture}
                  className="bg-white rounded-full p-4 hover:bg-gray-100 shadow-lg"
                >
                  <Camera className="w-8 h-8 text-gray-900" />
                </button>
              </div>
            </>
          ) : (
            <>
              <img src={imgSrc} alt="Captured document" className="w-full" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <button
                  onClick={retake}
                  className="bg-red-600 text-white rounded-full px-6 py-3 hover:bg-red-700 shadow-lg"
                >
                  <X className="w-6 h-6 inline mr-2" />
                  Retake
                </button>
                <button
                  onClick={accept}
                  className="bg-green-600 text-white rounded-full px-6 py-3 hover:bg-green-700 shadow-lg"
                >
                  <Check className="w-6 h-6 inline mr-2" />
                  Accept
                </button>
              </div>
            </>
          )}
        </div>

        {!imgSrc && (
          <div className="mt-4 text-center text-gray-600">
            <p>Position the document within the frame and click the camera button</p>
            <p className="text-sm mt-2">The image will be automatically enhanced after capture</p>
          </div>
        )}
      </div>
    </div>
  );
}
