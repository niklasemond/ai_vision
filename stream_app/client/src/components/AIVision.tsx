import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface AIVisionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
}

interface Detection {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

const AIVision: React.FC<AIVisionProps> = ({ videoRef, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);

  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('Starting to load TensorFlow.js model...');
        setIsLoading(true);
        setError(null);
        await tf.ready();
        console.log('TensorFlow.js is ready');
        const loadedModel = await cocoSsd.load();
        console.log('COCO-SSD model loaded successfully');
        setModel(loadedModel);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading model:', err);
        setError('Failed to load AI model');
        setIsLoading(false);
      }
    };

    loadModel();
  }, []);

  useEffect(() => {
    console.log('AI Vision effect triggered:', { model: !!model, isActive, hasVideo: !!videoRef.current, hasCanvas: !!canvasRef.current });
    if (!model || !isActive || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return;
    }

    // Set canvas dimensions to match video
    const updateCanvasSize = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log('Canvas size updated:', { width: canvas.width, height: canvas.height });
    };

    // Initial size setup
    updateCanvasSize();

    // Update size when video dimensions change
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(video);

    let animationFrameId: number;
    let isProcessing = false;

    const processFrame = async () => {
      if (!isProcessing && video.readyState === 4) {
        isProcessing = true;
        try {
          console.log('Processing frame...');
          // Run detection
          const predictions = await model.detect(video);
          console.log('Detections:', predictions);
          setDetections(predictions.map(pred => ({
            bbox: pred.bbox as [number, number, number, number],
            class: pred.class,
            score: pred.score
          })));

          // Draw video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Draw detections
          predictions.forEach(prediction => {
            const [x, y, width, height] = prediction.bbox;
            
            // Draw bounding box
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            // Draw label background
            ctx.fillStyle = '#00FF00';
            const text = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;
            const textWidth = ctx.measureText(text).width;
            ctx.fillRect(x, y - 20, textWidth + 10, 20);

            // Draw label text
            ctx.fillStyle = '#000000';
            ctx.font = '14px Arial';
            ctx.fillText(text, x + 5, y - 5);
          });
        } catch (err) {
          console.error('Error processing frame:', err);
        }
        isProcessing = false;
      }
      animationFrameId = requestAnimationFrame(processFrame);
    };

    processFrame();

    return () => {
      console.log('Cleaning up AI Vision effect');
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [model, isActive, videoRef]);

  if (isLoading) {
    return <div className="ai-status">Loading AI model...</div>;
  }

  if (error) {
    return <div className="ai-error">{error}</div>;
  }

  return (
    <div className="ai-vision">
      <canvas
        ref={canvasRef}
        className="ai-canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
      {detections.length > 0 && (
        <div className="detection-list">
          {detections.map((detection, index) => (
            <div key={index} className="detection-item">
              {detection.class} ({Math.round(detection.score * 100)}%)
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIVision; 