import { useState, useEffect, useRef } from 'react';
import { Manager } from 'socket.io-client';
import AIVision from './AIVision';
import './VideoStream.css';

interface VideoStreamProps {
  mode: 'sender' | 'receiver';
  roomId: string;
}

interface OfferData {
  offer: RTCSessionDescriptionInit;
  from: string;
}

interface AnswerData {
  answer: RTCSessionDescriptionInit;
  from: string;
}

interface IceCandidateData {
  candidate: RTCIceCandidate;
  from: string;
}

const VideoStream: React.FC<VideoStreamProps> = ({ mode, roomId }) => {
  console.log('VideoStream component rendered with mode:', mode);
  
  const [socket, setSocket] = useState<ReturnType<typeof Manager.prototype.socket> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAIActive, setIsAIActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const toggleAI = () => {
    console.log('Toggling AI:', !isAIActive);
    setIsAIActive(!isAIActive);
  };

  const getServerUrl = () => {
    // In development, use the current hostname
    if (process.env.NODE_ENV === 'development') {
      return `https://${window.location.hostname}:3000`;
    }
    // In production, use the current hostname
    return `https://${window.location.hostname}:3000`;
  };

  useEffect(() => {
    console.log('Component state updated:', {
      mode,
      isConnected,
      isStreaming,
      isAIActive,
      hasVideo: !!videoRef.current,
      hasStream: !!videoRef.current?.srcObject
    });
  }, [mode, isConnected, isStreaming, isAIActive]);

  useEffect(() => {
    // Initialize WebSocket connection
    const serverUrl = getServerUrl();
    console.log('Connecting to server:', serverUrl);

    const manager = new Manager(serverUrl, {
      secure: true,
      rejectUnauthorized: false,
      transports: ['websocket', 'polling'],
      timeout: 10000,
      autoConnect: true,
      forceNew: true
    });

    const newSocket = manager.socket('/');

    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      setSocket(newSocket);
      setIsConnected(true);
      newSocket.emit('join', { roomId });
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to server');
      setIsConnected(false);
    });

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      newSocket.close();
    };
  }, [roomId]);

  const initializePeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    console.log('Initializing peer connection with config:', configuration);
    const pc = new RTCPeerConnection(configuration);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate.candidate);
        if (socket) {
          console.log('Sending ICE candidate to peer');
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            roomId
          });
        }
      } else {
        console.log('All ICE candidates gathered');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        console.log('ICE connected, setting isStreaming to true');
        setIsStreaming(true);
      } else if (pc.iceConnectionState === 'failed') {
        console.log('ICE connection failed, attempting to restart');
        pc.restartIce();
      }
    };

    pc.onsignalingstatechange = () => {
      console.log('Signaling state changed:', pc.signalingState);
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state changed:', pc.connectionState);
    };

    if (mode === 'receiver') {
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (videoRef.current) {
          console.log('Setting video source to remote stream');
          videoRef.current.srcObject = event.streams[0];
          console.log('Setting isStreaming to true');
          setIsStreaming(true);
        }
      };
    }

    peerConnectionRef.current = pc;
    return pc;
  };

  const setVideoStream = (stream: MediaStream | null) => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      console.error('Video element not found');
      setError('Video element not initialized');
      return;
    }

    videoElement.srcObject = stream;
    videoElement.onloadedmetadata = () => {
      console.log('Video metadata loaded');
      videoElement.play().catch(err => {
        console.error('Error playing video:', err);
        setError('Failed to play video stream');
      });
    };
  };

  useEffect(() => {
    if (mode === 'receiver' && videoRef.current) {
      videoRef.current.playsInline = true;
      videoRef.current.autoplay = true;
    }
  }, [mode]);

  const startStreaming = async () => {
    try {
      if (mode === 'sender') {
        console.log('Starting stream in sender mode');
        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        console.log('Requesting media with constraints:', constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Got media stream:', stream.getVideoTracks()[0].getSettings());
        
        localStreamRef.current = stream;
        setVideoStream(stream);

        const pc = initializePeerConnection();
        stream.getTracks().forEach(track => {
          if (localStreamRef.current) {
            console.log('Adding track to peer connection:', track.kind);
            pc.addTrack(track, localStreamRef.current);
          }
        });

        console.log('Creating offer');
        const offer = await pc.createOffer();
        console.log('Setting local description');
        await pc.setLocalDescription(offer);
        
        if (socket) {
          console.log('Sending offer to peer');
          socket.emit('offer', { offer, roomId });
        }
      }
      setIsStreaming(true);
    } catch (err) {
      console.error('Error starting stream:', err);
      setError(err instanceof Error ? err.message : 'Failed to access camera');
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('offer', async (data: OfferData) => {
      if (mode === 'receiver') {
        console.log('Received offer in receiver mode');
        const pc = initializePeerConnection();
        await pc.setRemoteDescription(data.offer);
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit('answer', { answer, roomId });
      }
    });

    socket.on('answer', async (data: AnswerData) => {
      if (mode === 'sender' && peerConnectionRef.current) {
        console.log('Received answer');
        await peerConnectionRef.current.setRemoteDescription(data.answer);
      }
    });

    socket.on('ice-candidate', async (data: IceCandidateData) => {
      if (peerConnectionRef.current) {
        console.log('Received ICE candidate');
        try {
          await peerConnectionRef.current.addIceCandidate(data.candidate);
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    // Add logging for component mount/unmount
    console.log('Socket event listeners set up for mode:', mode);

    return () => {
      console.log('Cleaning up socket event listeners for mode:', mode);
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [socket, mode, roomId]);

  // Add effect to log state changes
  useEffect(() => {
    console.log('VideoStream state changed:', {
      mode,
      isConnected,
      isStreaming,
      isAIActive,
      hasVideo: !!videoRef.current,
      hasStream: !!videoRef.current?.srcObject
    });
  }, [mode, isConnected, isStreaming, isAIActive]);

  // Add effect to handle video stream
  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      console.log('Video element has stream, setting isStreaming to true');
      setIsStreaming(true);
    }
  }, [videoRef.current?.srcObject]);

  return (
    <div className="video-stream">
      {/* Simple status display */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        backgroundColor: 'black',
        color: 'white',
        padding: '10px',
        zIndex: 9999
      }}>
        {mode === 'receiver' ? 'Receiver' : 'Sender'} Mode {isAIActive ? '(AI Active)' : '(AI Inactive)'}
        {error && (
          <div style={{ color: 'red', marginTop: '5px' }}>
            Error: {error}
          </div>
        )}
      </div>

      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={mode === 'sender'}
          style={{ transform: mode === 'sender' ? 'scaleX(-1)' : 'none' }}
        />
        {/* Always render AIVision in receiver mode */}
        {mode === 'receiver' && videoRef.current && (
          <AIVision videoRef={{ current: videoRef.current }} isActive={isAIActive} />
        )}
      </div>
      
      {mode === 'sender' && !isStreaming && (
        <button
          className="start-stream-button"
          onClick={startStreaming}
          disabled={!isConnected}
        >
          Start Streaming
        </button>
      )}

      {/* Simple AI toggle button */}
      <button
        onClick={toggleAI}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: isAIActive ? 'red' : 'green',
          color: 'white',
          padding: '20px 40px',
          fontSize: '20px',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          zIndex: 9999
        }}
      >
        {isAIActive ? 'Disable AI' : 'Enable AI'}
      </button>
    </div>
  );
};

export default VideoStream; 