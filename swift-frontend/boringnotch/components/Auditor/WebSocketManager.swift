import Foundation
import Combine

class WebSocketManager: ObservableObject {
    @Published var connectionStatus: ConnectionStatus = .disconnected
    @Published var currentPhase: String = ""
    @Published var progress: Double = 0.0
    @Published var lastMessage: String = ""
    @Published var isComplete: Bool = false
    
    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    
    enum ConnectionStatus {
        case disconnected
        case connecting
        case connected
        case error
    }
    
    func connect(to runId: String) {
        guard let url = URL(string: "wss://auditor-edge.evanhaque1.workers.dev/ws/run/\(runId)") else {
            print("❌ Invalid WebSocket URL")
            return
        }
        
        connectionStatus = .connecting
        print("🔄 Connecting to WebSocket: \(url)")
        
        urlSession = URLSession(configuration: .default)
        webSocketTask = urlSession?.webSocketTask(with: url)
        webSocketTask?.resume()
        
        connectionStatus = .connected
        print("✅ WebSocket connected")
        
        // Start listening for messages
        receiveMessage()
    }
    
    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        urlSession = nil
        connectionStatus = .disconnected
        print("🔌 WebSocket disconnected")
    }
    
    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self?.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self?.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                
                // Continue listening
                self?.receiveMessage()
                
            case .failure(let error):
                print("❌ WebSocket error: \(error)")
                DispatchQueue.main.async {
                    self?.connectionStatus = .error
                }
            }
        }
    }
    
    private func handleMessage(_ text: String) {
        print("📨 WebSocket message: \(text)")
        
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            if let phase = json["phase"] as? String {
                self?.currentPhase = phase
            }
            
            if let percent = json["percent"] as? Double {
                self?.progress = percent / 100.0
            }
            
            if let message = json["message"] as? String {
                self?.lastMessage = message
            }
            
            if let type = json["type"] as? String, type == "done" {
                self?.isComplete = true
                self?.progress = 1.0
            }
        }
    }
}
