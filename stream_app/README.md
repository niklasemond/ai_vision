# AI Vision - Real-time Video Streaming with AI Processing

A web application that enables real-time video streaming from a mobile device to a computer with AI-powered object detection capabilities. Built with React, TypeScript, WebRTC, and TensorFlow.js.

![Project Demo](https://github.com/niklasemond/ai_vision/blob/main/stream_app/client/public/demo.gif)

## Features

- 📱 **Mobile-to-Desktop Streaming**: Stream video from your phone's camera to your computer in real-time
- 🤖 **AI Object Detection**: Enable AI processing to identify objects in the video stream
- 🔒 **Secure Connection**: HTTPS with WebRTC for secure peer-to-peer communication
- 🎥 **High-Quality Video**: Optimized for 1280x720 resolution
- 🌐 **Room-Based Sessions**: Support for multiple streaming sessions
- 📱 **Mobile-First Design**: Optimized for mobile camera streaming

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express
- **Real-time Communication**: WebRTC, Socket.IO
- **AI Processing**: TensorFlow.js
- **Security**: HTTPS, SSL/TLS

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A modern web browser (Chrome, Firefox, Safari)
- SSL certificates (for HTTPS)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/niklasemond/ai_vision.git
cd ai_vision/stream_app
```

2. Install dependencies for both client and server:
```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Generate SSL certificates (if not already present):
```bash
cd server
openssl req -x509 -newkey rsa:4096 -keyout cert.key -out cert.crt -days 365 -nodes
```

## Usage

1. Start the development server:
```bash
# Start the client development server
cd client
npm run dev

# Start the server
cd ../server
node index.js
```

2. Access the application:
   - On your computer (receiver): `https://localhost:3000`
   - On your phone (sender): `https://<your-ip>:3000`

3. Using the application:
   - On your phone, click "Start Streaming" to begin the video stream
   - On your computer, use the "Enable AI" button to toggle AI processing
   - The video will automatically flip horizontally on the sender side for a more natural view

## Project Structure

```
stream_app/
├── client/                 # React client application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── AIVision.tsx    # AI processing component
│   │   │   └── VideoStream.tsx # Video streaming component
│   │   └── App.tsx        # Main application component
│   └── package.json       # Client dependencies
├── server/                 # Express server
│   ├── index.js           # Server entry point
│   └── package.json       # Server dependencies
└── README.md              # Project documentation
```

## Development

### Building the Client
```bash
cd client
npm run build
```

### Running Tests
```bash
cd client
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

1. **SSL Certificate Warning**
   - This is normal in development. Accept the certificate warning in your browser.

2. **Camera Access**
   - Make sure to allow camera access when prompted by your browser.

3. **Connection Issues**
   - Ensure both devices are on the same network
   - Check that the server is running and accessible
   - Verify that port 3000 is not blocked by your firewall

### Debugging

- Check the browser console on both devices for detailed logs
- Monitor the server console for connection status
- Use the browser's network tab to verify WebRTC connections

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- WebRTC for real-time communication
- TensorFlow.js for AI processing
- Socket.IO for signaling
- React and TypeScript communities 